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

const FACEBOOK_APP_ID = String(process.env.FACEBOOK_APP_ID || "").trim();
const FACEBOOK_APP_SECRET = String(
  process.env.FACEBOOK_APP_SECRET || ""
).trim();

const FACEBOOK_REDIRECT_URI =
  process.env.FACEBOOK_REDIRECT_URI ||
  "https://streaming-chat-app-production-dc88.up.railway.app/auth/facebook/callback";

const FACEBOOK_GRAPH_VERSION =
  process.env.FACEBOOK_GRAPH_VERSION || "v25.0";

/*
 * Facebook connection information is temporarily held in server memory.
 * A later production step can move this into an encrypted database.
 */
const facebookLoginStates = new Map();

let facebookConnection = {
  connected: false,
  userAccessToken: "",
  userId: "",
  userName: "",
  pages: [],
  connectedAt: "",
  error: "",
};

if (EULER_API_KEY) {
  SignConfig.apiKey = EULER_API_KEY;
  console.log("Euler Stream API key loaded.");
} else {
  console.warn(
    "Euler Stream API key was not found. Add EULER_API_KEY to .env or Railway Variables."
  );
}

if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
  console.log("Facebook App ID and App Secret loaded.");
} else {
  console.warn(
    "Facebook credentials were not found. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET."
  );
}

app.disable("x-powered-by");
app.use(express.json());

function publicFacebookConnection() {
  return {
    connected: facebookConnection.connected,
    userId: facebookConnection.userId,
    userName: facebookConnection.userName,
    connectedAt: facebookConnection.connectedAt,
    error: facebookConnection.error,
    pages: facebookConnection.pages.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category || "",
      tasks: Array.isArray(page.tasks) ? page.tasks : [],
    })),
  };
}

function removeExpiredFacebookStates() {
  const now = Date.now();

  for (const [state, createdAt] of facebookLoginStates.entries()) {
    if (now - createdAt > 10 * 60 * 1000) {
      facebookLoginStates.delete(state);
    }
  }
}

async function readFacebookJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.error) {
    const message =
      data?.error?.message ||
      data?.error_description ||
      `Facebook returned HTTP ${response.status}.`;

    throw new Error(message);
  }

  return data;
}

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    service: "StreamBridge",
    eulerApiKeyLoaded: Boolean(EULER_API_KEY),
    facebookCredentialsLoaded: Boolean(
      FACEBOOK_APP_ID && FACEBOOK_APP_SECRET
    ),
    facebookConnected: facebookConnection.connected,
  });
});

/*
 * Starts the Facebook OAuth login.
 */
app.get("/auth/facebook", (request, response) => {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return response.status(503).json({
      ok: false,
      error:
        "Facebook is not configured. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.",
    });
  }

  removeExpiredFacebookStates();

  const state = crypto.randomBytes(32).toString("hex");
  facebookLoginStates.set(state, Date.now());

  const loginUrl = new URL(
    `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`
  );

  loginUrl.searchParams.set("client_id", FACEBOOK_APP_ID);
  loginUrl.searchParams.set("redirect_uri", FACEBOOK_REDIRECT_URI);
  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("response_type", "code");
  loginUrl.searchParams.set(
    "scope",
    [
      "public_profile",
      "pages_show_list",
      "pages_read_engagement",
      "pages_read_user_content",
    ].join(",")
  );

  return response.redirect(loginUrl.toString());
});

/*
 * Facebook redirects back here after login.
 * The authorization code is exchanged for a user access token server-side.
 */
app.get("/auth/facebook/callback", async (request, response) => {
  const code = String(request.query.code || "");
  const state = String(request.query.state || "");
  const oauthError = String(request.query.error || "");
  const oauthErrorDescription = String(
    request.query.error_description || ""
  );

  removeExpiredFacebookStates();

  if (oauthError) {
    facebookConnection.error =
      oauthErrorDescription || "Facebook login was cancelled.";

    return response.redirect(
      `/?facebook=error&message=${encodeURIComponent(
        facebookConnection.error
      )}`
    );
  }

  if (!state || !facebookLoginStates.has(state)) {
    facebookConnection.error =
      "Facebook login could not be verified. Please try connecting again.";

    return response.redirect(
      `/?facebook=error&message=${encodeURIComponent(
        facebookConnection.error
      )}`
    );
  }

  facebookLoginStates.delete(state);

  if (!code) {
    facebookConnection.error =
      "Facebook did not return an authorization code.";

    return response.redirect(
      `/?facebook=error&message=${encodeURIComponent(
        facebookConnection.error
      )}`
    );
  }

  try {
    const tokenUrl = new URL(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`
    );

    tokenUrl.searchParams.set("client_id", FACEBOOK_APP_ID);
    tokenUrl.searchParams.set("client_secret", FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", FACEBOOK_REDIRECT_URI);
    tokenUrl.searchParams.set("code", code);

    const tokenData = await readFacebookJson(tokenUrl.toString());
    const userAccessToken = String(tokenData.access_token || "");

    if (!userAccessToken) {
      throw new Error("Facebook did not return an access token.");
    }

    const profileUrl = new URL(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me`
    );

    profileUrl.searchParams.set("fields", "id,name");
    profileUrl.searchParams.set("access_token", userAccessToken);

    const profileData = await readFacebookJson(profileUrl.toString());

    const pagesUrl = new URL(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me/accounts`
    );

    pagesUrl.searchParams.set(
      "fields",
      "id,name,category,tasks,access_token"
    );
    pagesUrl.searchParams.set("access_token", userAccessToken);

    const pagesData = await readFacebookJson(pagesUrl.toString());

    facebookConnection = {
      connected: true,
      userAccessToken,
      userId: String(profileData.id || ""),
      userName: String(profileData.name || ""),
      pages: Array.isArray(pagesData.data) ? pagesData.data : [],
      connectedAt: new Date().toISOString(),
      error: "",
    };

    console.log(
      `Facebook connected for ${facebookConnection.userName || "user"}.`
    );
    console.log(
      `Facebook Pages found: ${facebookConnection.pages.length}.`
    );

    return response.redirect("/?facebook=connected");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Facebook could not be connected.";

    console.error("Facebook OAuth error:", message);

    facebookConnection = {
      connected: false,
      userAccessToken: "",
      userId: "",
      userName: "",
      pages: [],
      connectedAt: "",
      error: message,
    };

    return response.redirect(
      `/?facebook=error&message=${encodeURIComponent(message)}`
    );
  }
});

/*
 * Returns safe Facebook connection information.
 * Access tokens and the App Secret are never returned to the browser.
 */
app.get("/api/facebook/status", (request, response) => {
  response.json({
    ok: true,
    ...publicFacebookConnection(),
  });
});

app.post("/api/facebook/disconnect", (request, response) => {
  facebookConnection = {
    connected: false,
    userAccessToken: "",
    userId: "",
    userName: "",
    pages: [],
    connectedAt: "",
    error: "",
  };

  response.json({
    ok: true,
    connected: false,
    status: "Facebook disconnected from StreamBridge.",
  });
});

/*
 * Vite creates the dist folder when Railway runs npm run build.
 * Express serves the completed React website from that folder.
 */
app.use(express.static(DIST_FOLDER));

/*
 * WebSocket server used to send TikTok LIVE messages
 * from the Node.js server to the React app.
 */
const websocketServer = new WebSocketServer({
  server,
  path: "/ws",
});

function sendJson(socket, data) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(data));
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

  if (!connection) {
    return;
  }

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
    processInitialData: false,
    enableExtendedGiftInfo: false,
  };

  const connection = new TikTokLiveConnection(username, options);

  socket.tiktokConnection = connection;
  socket.tiktokUsername = username;

  connection.on(WebcastEvent.CHAT, (data) => {
    const messageText = String(
      data?.content || data?.comment || ""
    ).trim();

    if (!messageText) {
      return;
    }

    const sender =
      data?.user?.uniqueId ||
      data?.user?.nickname ||
      data?.user?.userId ||
      "TikTok viewer";

    sendJson(socket, {
      type: "chat_message",
      message: {
        id: `tiktok-${data?.msgId || Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,
        platform: "TikTok",
        username: sender,
        text: messageText,
      },
    });
  });

  connection.on(WebcastEvent.MEMBER, (data) => {
    const memberUsername =
      data?.user?.displayId ||
      data?.user?.uniqueId ||
      data?.user?.nickname ||
      data?.user?.userId ||
      "TikTok viewer";

    sendJson(socket, {
      type: "tiktok_join",
      username: memberUsername,
    });
  });

  connection.on(WebcastEvent.LIKE, (data) => {
    const likeUsername =
      data?.user?.displayId ||
      data?.user?.uniqueId ||
      data?.user?.nickname ||
      data?.user?.userId ||
      "TikTok viewer";

    sendJson(socket, {
      type: "tiktok_like",
      username: likeUsername,
      count: Number(data?.count ?? 0),
total: Number(data?.total ?? 0),

      
    });
  });

  connection.on(WebcastEvent.ROOM_USER, (data) => {
    const viewerCount = Number(
      data?.viewerCount ??
        data?.total ??
        data?.totalUser ??
        data?.memberCount ??
data?.statistics?.viewerCount ??
data?.statistics?.memberCount ??
data?.roomInfo?.viewerCount ??
data?.roomInfo?.userCount ??
0
    );

    console.log("TikTok viewer update:", {
      viewerCount,
      total: data?.total,
      totalUser: data?.totalUser,
      memberCount: data?.memberCount,
    });

    sendJson(socket, {
      type: "tiktok_viewers",
      viewers: viewerCount,
    });
  });

  connection.on(WebcastEvent.GIFT, (data) => {
    console.log("TIKTOK GIFT EVENT RECEIVED:", JSON.stringify(data, null, 2));
    const giftUsername =
      data?.user?.displayId ||
      data?.user?.uniqueId ||
      data?.user?.nickname ||
      data?.user?.userId ||
      "TikTok viewer";

    const giftName =
      data?.giftDetails?.giftName ||
      data?.giftName ||
      "TikTok gift";

    const repeatCount = Number(
      data?.repeatCount || data?.repeatEnd || 1
    );

    sendJson(socket, {
      type: "tiktok_gift",
      username: giftUsername,
      giftName,
      count: repeatCount,
    });
  });

  connection.on(WebcastEvent.DISCONNECTED, () => {
    if (socket.tiktokConnection !== connection) {
      return;
    }

    sendJson(socket, {
      type: "tiktok_status",
      connected: false,
      status: `Disconnected from @${username}'s TikTok LIVE.`,
    });
  });

  connection.on(WebcastEvent.STREAM_END, () => {
    if (socket.tiktokConnection !== connection) {
      return;
    }

    sendJson(socket, {
      type: "tiktok_status",
      connected: false,
      status: `@${username}'s TikTok LIVE has ended.`,
    });
  });

  connection.on(WebcastEvent.ERROR, (error) => {
    if (socket.tiktokConnection !== connection) {
      return;
    }

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
      error instanceof Error
        ? error.message
        : "Could not connect to TikTok.";

    console.error(
      `TikTok connection failed for @${username}:`,
      errorMessage
    );

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

websocketServer.on("connection", (socket) => {
  socket.tiktokConnection = null;
  socket.tiktokUsername = "";

  sendJson(socket, {
    type: "server_status",
    connected: true,
    status: "Connected to the StreamBridge server.",
  });

  socket.on("message", async (rawMessage) => {
    try {
      const command = JSON.parse(rawMessage.toString());

      if (command.type === "connect_tiktok") {
        await connectTikTok(socket, command.username);
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
        sendJson(socket, {
          type: "pong",
          timestamp: Date.now(),
        });
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

app.get("/terms.html", (request, response, next) => {
  response.sendFile(path.join(DIST_FOLDER, "terms.html"), (error) => {
    if (error) {
      next(error);
    }
  });
});
/*
 * React single-page application fallback.
 * API, OAuth and WebSocket requests are handled before this point.
 */
app.use((request, response, next) => {
  if (
    request.path.startsWith("/api/") ||
    request.path.startsWith("/auth/")
  ) {
    return next();
  }

  response.sendFile(
    path.join(DIST_FOLDER, "index.html"),
    (error) => {
      if (error) {
        next(error);
      }
    }
  );
});

app.use((request, response) => {
  response.status(404).json({
    ok: false,
    error: "StreamBridge route not found.",
  });
});

app.use((error, request, response, next) => {
  console.error("StreamBridge server error:", error);

  if (response.headersSent) {
    return next(error);
  }

  response.status(500).json({
    ok: false,
    error: "StreamBridge server error.",
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`StreamBridge server is running on port ${PORT}`);
});

