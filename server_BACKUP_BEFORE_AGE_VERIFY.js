import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import {
  TikTokLiveConnection,
  WebcastEvent,
  SignConfig,
} from "tiktok-live-connector";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

const PORT = Number(process.env.PORT || 3000);
const DIST_FOLDER = path.join(__dirname, "dist");

const EULER_API_KEY =
  process.env.EULER_API_KEY || process.env.TIKTOK_SIGN_API_KEY || "";
const TIKTOK_SESSION_ID = process.env.TIKTOK_SESSION_ID || "";
const TIKTOK_TARGET_IDC = process.env.TIKTOK_TARGET_IDC || "";

const YOTI_API_KEY = process.env.YOTI_API_KEY || "";
const YOTI_SDK_ID = process.env.YOTI_SDK_ID || "";
const AGE_COOKIE_SECRET = process.env.AGE_COOKIE_SECRET || "";
const PUBLIC_APP_URL = String(process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");

const AGE_COOKIE_NAME = "streambridge_age_access";
const AGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const YOTI_API_BASE = "https://age.yoti.com";

if (EULER_API_KEY) {
  SignConfig.apiKey = EULER_API_KEY;
  console.log("Euler Stream API key loaded.");
} else {
  console.warn(
    "Euler Stream API key was not found. Add EULER_API_KEY to .env or Railway Variables."
  );
}

if (!YOTI_API_KEY || !YOTI_SDK_ID) {
  console.warn(
    "Age verification is locked. Add YOTI_API_KEY and YOTI_SDK_ID to Railway Variables."
  );
}

if (!AGE_COOKIE_SECRET || AGE_COOKIE_SECRET.length < 32) {
  console.warn(
    "Age verification is locked. Add an AGE_COOKIE_SECRET of at least 32 characters to Railway Variables."
  );
}

if (!PUBLIC_APP_URL) {
  console.warn(
    "PUBLIC_APP_URL is missing. Add the deployed StreamBridge URL to Railway Variables."
  );
}

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

function isProductionRequest(request) {
  return (
    process.env.NODE_ENV === "production" ||
    request.headers["x-forwarded-proto"] === "https"
  );
}

function getBaseUrl(request) {
  if (PUBLIC_APP_URL) return PUBLIC_APP_URL;
  const protocol = request.headers["x-forwarded-proto"] || request.protocol;
  return `${protocol}://${request.get("host")}`;
}

function parseCookies(cookieHeader = "") {
  const cookies = {};
  for (const part of String(cookieHeader).split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value) {
  return crypto
    .createHmac("sha256", AGE_COOKIE_SECRET)
    .update(value)
    .digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function createAgeAccessToken() {
  const payload = {
    verified: true,
    threshold: 18,
    issuedAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + AGE_COOKIE_MAX_AGE_SECONDS,
    tokenId: crypto.randomUUID(),
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signValue(encodedPayload)}`;
}

function verifyAgeAccessToken(token) {
  if (!AGE_COOKIE_SECRET || AGE_COOKIE_SECRET.length < 32 || !token) return false;
  const [encodedPayload, suppliedSignature, extra] = String(token).split(".");
  if (!encodedPayload || !suppliedSignature || extra) return false;
  const expectedSignature = signValue(encodedPayload);
  if (!safeEqual(suppliedSignature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));
    return (
      payload.verified === true &&
      payload.threshold === 18 &&
      Number.isFinite(payload.expiresAt) &&
      payload.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

function requestHasVerifiedAge(request) {
  const cookies = parseCookies(request.headers.cookie || "");
  return verifyAgeAccessToken(cookies[AGE_COOKIE_NAME]);
}

function setAgeCookie(request, response) {
  const token = createAgeAccessToken();
  const securePart = isProductionRequest(request) ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${AGE_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${AGE_COOKIE_MAX_AGE_SECONDS}${securePart}`
  );
}

function clearAgeCookie(request, response) {
  const securePart = isProductionRequest(request) ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${AGE_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${securePart}`
  );
}

function ageVerificationConfigured() {
  return Boolean(
    YOTI_API_KEY &&
      YOTI_SDK_ID &&
      AGE_COOKIE_SECRET.length >= 32 &&
      PUBLIC_APP_URL
  );
}

function yotiHeaders() {
  return {
    Authorization: `Bearer ${YOTI_API_KEY}`,
    "Content-Type": "application/json",
    "Yoti-SDK-Id": YOTI_SDK_ID,
  };
}

async function readJsonResponse(response) {
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    const message = body?.message || body?.error || `HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return body;
}

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    service: "StreamBridge",
    eulerApiKeyLoaded: Boolean(EULER_API_KEY),
    ageVerificationConfigured: ageVerificationConfigured(),
  });
});

app.get("/api/age/status", (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json({
    configured: ageVerificationConfigured(),
    verified: requestHasVerifiedAge(request),
  });
});

app.post("/api/age/start", async (request, response) => {
  response.setHeader("Cache-Control", "no-store");

  if (!ageVerificationConfigured()) {
    return response.status(503).json({
      ok: false,
      error: "Age verification has not been configured on the server.",
    });
  }

  try {
    const baseUrl = getBaseUrl(request);
    const referenceId = `streambridge-${crypto.randomUUID()}`;
    const callbackUrl = `${baseUrl}/api/age/callback`;
    const cancelUrl = `${baseUrl}/?age_verification=cancelled`;

    const yotiResponse = await fetch(`${YOTI_API_BASE}/api/v1/sessions`, {
      method: "POST",
      headers: yotiHeaders(),
      body: JSON.stringify({
        type: "OVER",
        ttl: 900,
        synchronous_checks: true,
        age_estimation: {
          allowed: true,
          threshold: 18,
          retry_enabled: true,
          retry_limit: 3,
          level: "PASSIVE",
          authenticity: "AUTO",
        },
        digital_id: {
          allowed: true,
          threshold: 18,
          age_estimation_allowed: true,
          age_estimation_threshold: 18,
          retry_enabled: true,
          retry_limit: 3,
        },
        doc_scan: {
          allowed: true,
          threshold: 18,
          retry_enabled: true,
          retry_limit: 3,
          level: "PASSIVE",
          authenticity: "AUTO",
          preset_issuing_country: "GBR",
        },
        credit_card: { allowed: false, retry_limit: 1 },
        mobile: { allowed: false, retry_limit: 1 },
        reference_id: referenceId,
        callback: { auto: true, url: callbackUrl },
        cancel_url: cancelUrl,
      }),
    });

    const session = await readJsonResponse(yotiResponse);
    const sessionId = session.id || session.session_id;
    if (!sessionId) throw new Error("Yoti did not return a session ID.");

    return response.json({
      ok: true,
      verificationUrl: `${YOTI_API_BASE}?sessionId=${encodeURIComponent(
        sessionId
      )}&sdkId=${encodeURIComponent(YOTI_SDK_ID)}`,
    });
  } catch (error) {
    console.error("Could not create age-verification session:", error);
    return response.status(502).json({
      ok: false,
      error: "Could not start age verification. Please try again.",
    });
  }
});

app.get("/api/age/callback", async (request, response) => {
  response.setHeader("Cache-Control", "no-store");

  if (!ageVerificationConfigured()) {
    return response.redirect("/?age_verification=unavailable");
  }

  const sessionId = String(
    request.query.sessionId || request.query.session_id || request.query.id || ""
  ).trim();

  if (!sessionId || !/^[a-zA-Z0-9_-]{8,100}$/.test(sessionId)) {
    clearAgeCookie(request, response);
    return response.redirect("/?age_verification=failed");
  }

  try {
    const resultResponse = await fetch(
      `${YOTI_API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}/result`,
      { headers: yotiHeaders() }
    );
    const result = await readJsonResponse(resultResponse);

    if (result.type === "OVER" && result.status === "COMPLETE") {
      setAgeCookie(request, response);
      return response.redirect("/?age_verification=passed");
    }

    clearAgeCookie(request, response);
    const reason =
      result.status === "FAIL" ? "under_age" : "verification_failed";
    return response.redirect(`/?age_verification=${reason}`);
  } catch (error) {
    console.error("Could not retrieve age-verification result:", error);
    clearAgeCookie(request, response);
    return response.redirect("/?age_verification=error");
  }
});

app.post("/api/age/logout", (request, response) => {
  clearAgeCookie(request, response);
  response.json({ ok: true });
});

/*
 * Vite creates the dist folder when Railway runs npm run build.
 * Express serves the completed React website from that folder.
 */
app.use(express.static(DIST_FOLDER));

const websocketServer = new WebSocketServer({
  server,
  path: "/ws",
});

function sendJson(socket, data) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(data));
}

function socketHasVerifiedAge(socket) {
  const cookies = parseCookies(socket.requestCookie || "");
  return verifyAgeAccessToken(cookies[AGE_COOKIE_NAME]);
}

function requireVerifiedAge(socket) {
  if (socketHasVerifiedAge(socket)) return true;
  sendJson(socket, {
    type: "age_verification_required",
    verified: false,
    message: "Verified 18+ access is required before connecting a platform.",
  });
  return false;
}

function cleanTikTokUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/(?:www\.)?tiktok\.com\/@/i, "")
    .replace(/\/live\/?$/i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim();
}

async function disconnectTikTok(socket) {
  const connection = socket.tiktokConnection;
  socket.tiktokConnection = null;
  socket.tiktokUsername = "";
  if (!connection) return;

  try {
    await connection.disconnect();
  } catch (error) {
    console.warn(
      "TikTok disconnect warning:",
      error instanceof Error ? error.message : error
    );
  }
}

async function connectTikTok(socket, usernameValue) {
  if (!requireVerifiedAge(socket)) return;

  console.log("TikTok connect request received:", usernameValue);
  const username = cleanTikTokUsername(usernameValue);

  if (!username) {
    sendJson(socket, {
      type: "tiktok_status",
      connected: false,
      status: "Enter a TikTok username first.",
    });
    return;
  }

  if (!EULER_API_KEY) {
    sendJson(socket, {
      type: "tiktok_status",
      connected: false,
      status: "Euler Stream API key is not configured on the server.",
    });
    return;
  }

  await disconnectTikTok(socket);

  sendJson(socket, {
    type: "tiktok_status",
    connected: false,
    status: `Connecting to @${username}'s TikTok LIVE...`,
  });

  const options = {
    processInitialData: true,
    enableExtendedGiftInfo: false,
    session: {
      cookie: {
        type: "cookie",
        value: {
          sessionId: TIKTOK_SESSION_ID,
          ttTargetIdc: TIKTOK_TARGET_IDC,
        },
      },
    },
  };

  const connection = new TikTokLiveConnection(username, options);
  socket.tiktokConnection = connection;
  socket.tiktokUsername = username;

  connection.on(WebcastEvent.MEMBER, (data) => {
    console.log("TikTok MEMBER event received:", data?.user?.uniqueId);
  });

  connection.on(WebcastEvent.CHAT, (data) => {
    const messageText = String(data?.comment || data?.content || "").trim();
    if (!messageText) return;

    const sender =
      data?.user?.uniqueId ||
      data?.user?.nickname ||
      data?.user?.userId ||
      "TikTok viewer";

    console.log(`TikTok chat received: ${sender}: ${messageText}`);

    sendJson(socket, {
      type: "chat_message",
      message: {
        id: `tiktok-${data?.msgId || `${sender}-${messageText}`}`,
        platform: "TikTok",
        username: sender,
        text: messageText,
      },
    });
  });

  connection.on(WebcastEvent.DISCONNECTED, () => {
    if (socket.tiktokConnection !== connection) return;
    sendJson(socket, {
      type: "tiktok_status",
      connected: false,
      status: `Disconnected from @${username}'s TikTok LIVE.`,
    });
  });

  connection.on(WebcastEvent.STREAM_END, () => {
    if (socket.tiktokConnection !== connection) return;
    sendJson(socket, {
      type: "tiktok_status",
      connected: false,
      status: `@${username}'s TikTok LIVE has ended.`,
    });
  });

  connection.on(WebcastEvent.ERROR, (error) => {
    if (socket.tiktokConnection !== connection) return;
    console.error("TikTok connection error:", error);
    sendJson(socket, {
      type: "tiktok_status",
      connected: false,
      status:
        error instanceof Error
          ? `TikTok error: ${error.message}`
          : "TikTok connection error.",
    });
  });

  try {
    const state = await connection.connect();
    console.log(
      `TikTok connected successfully to @${username}. Room ID:`,
      state?.roomId || connection.roomId || "unknown"
    );

    if (socket.tiktokConnection !== connection) {
      await connection.disconnect().catch(() => {});
      return;
    }

    sendJson(socket, {
      type: "tiktok_status",
      connected: true,
      username,
      roomId: state?.roomId || connection.roomId || "",
      status: `Listening to @${username}'s TikTok LIVE`,
    });
  } catch (error) {
    if (socket.tiktokConnection === connection) {
      socket.tiktokConnection = null;
      socket.tiktokUsername = "";
    }

    const errorMessage =
      error instanceof Error ? error.message : "Could not connect to TikTok.";
    console.error(`TikTok connection failed for @${username}:`, errorMessage);

    sendJson(socket, {
      type: "tiktok_status",
      connected: false,
      status: `Could not connect to @${username}. Make sure the account is currently LIVE.`,
      details: errorMessage,
    });

    try {
      await connection.disconnect();
    } catch {
      // The connection may already be closed.
    }
  }
}

websocketServer.on("connection", (socket, request) => {
  socket.tiktokConnection = null;
  socket.tiktokUsername = "";
  socket.requestCookie = request.headers.cookie || "";

  sendJson(socket, {
    type: "server_status",
    connected: true,
    ageVerified: socketHasVerifiedAge(socket),
    status: "Connected to the StreamBridge server.",
  });

  socket.on("message", async (rawMessage) => {
    try {
      const command = JSON.parse(rawMessage.toString());

      if (command.type === "connect_tiktok") {
        await connectTikTok(socket, command.username);
        return;
      }

      if (command.type === "send_tiktok_message") {
        if (!requireVerifiedAge(socket)) return;
        const text = String(command.text || "").trim();

        if (!text) {
          sendJson(socket, {
            type: "tiktok_send_status",
            sent: false,
            status: "Enter a TikTok message first.",
          });
          return;
        }

        if (!socket.tiktokConnection) {
          sendJson(socket, {
            type: "tiktok_send_status",
            sent: false,
            status: "TikTok is not connected.",
          });
          return;
        }

        try {
          await socket.tiktokConnection.sendMessage(text);
          sendJson(socket, {
            type: "tiktok_send_status",
            sent: true,
            status: "TikTok message sent.",
          });
        } catch (error) {
          console.error("TikTok send error:", error);
          sendJson(socket, {
            type: "tiktok_send_status",
            sent: false,
            status: `TikTok send failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
        return;
      }

      if (command.type === "disconnect_tiktok") {
        await disconnectTikTok(socket);
        sendJson(socket, {
          type: "tiktok_status",
          connected: false,
          status: "TikTok disconnected.",
        });
        return;
      }

      if (command.type === "ping") {
        sendJson(socket, { type: "pong", timestamp: Date.now() });
        return;
      }

      sendJson(socket, {
        type: "server_error",
        message: "Unknown StreamBridge command.",
      });
    } catch (error) {
      console.error("WebSocket message error:", error);
      sendJson(socket, {
        type: "server_error",
        message: "The StreamBridge server could not read that command.",
      });
    }
  });

  socket.on("close", () => {
    disconnectTikTok(socket).catch((error) => {
      console.error("TikTok cleanup error:", error);
    });
  });

  socket.on("error", (error) => {
    console.error("StreamBridge WebSocket error:", error);
  });
});

app.use((request, response, next) => {
  if (request.path.startsWith("/api/")) return next();
  response.sendFile(path.join(DIST_FOLDER, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use((error, request, response, next) => {
  console.error("StreamBridge server error:", error);
  if (response.headersSent) return next(error);
  response.status(500).json({ ok: false, error: "StreamBridge server error." });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`StreamBridge server is running on port ${PORT}`);
});
