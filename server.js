import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { TikTokLiveConnection, WebcastEvent, SignConfig } from "tiktok-live-connector";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT || 3000);
const DIST_FOLDER = path.join(__dirname, "dist");

const EULER_API_KEY = process.env.EULER_API_KEY || process.env.TIKTOK_SIGN_API_KEY || "";
const FACEBOOK_APP_ID = String(process.env.FACEBOOK_APP_ID || "").trim();
const FACEBOOK_APP_SECRET = String(process.env.FACEBOOK_APP_SECRET || "").trim();
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI ||
  "https://streaming-chat-app-production-dc88.up.railway.app/auth/facebook/callback";
const FACEBOOK_GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v25.0";

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
  console.warn("Euler Stream API key was not found. Add EULER_API_KEY to .env or Railway Variables.");
}

if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
  console.log("Facebook App ID and App Secret loaded.");
} else {
  console.warn("Facebook credentials were not found. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.");
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
    if (now - createdAt > 10 * 60 * 1000) facebookLoginStates.delete(state);
  }
}

async function readFacebookJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || data?.error_description || `Facebook returned HTTP ${response.status}.`);
  }
  return data;
}

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    service: "DavaBridge",
    eulerApiKeyLoaded: Boolean(EULER_API_KEY),
    facebookCredentialsLoaded: Boolean(FACEBOOK_APP_ID && FACEBOOK_APP_SECRET),
    facebookConnected: facebookConnection.connected,
  });
});

app.get("/auth/facebook", (request, response) => {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return response.status(503).json({ ok: false, error: "Facebook is not configured. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET." });
  }

  removeExpiredFacebookStates();
  const state = crypto.randomBytes(32).toString("hex");
  facebookLoginStates.set(state, Date.now());

  const loginUrl = new URL(`https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`);
  loginUrl.searchParams.set("client_id", FACEBOOK_APP_ID);
  loginUrl.searchParams.set("redirect_uri", FACEBOOK_REDIRECT_URI);
  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("response_type", "code");
  loginUrl.searchParams.set("scope", [
    "public_profile",
    "pages_show_list",
    "pages_read_engagement",
    "pages_read_user_content",
    "pages_manage_engagement",
    "pages_manage_posts",
  ].join(","));
  return response.redirect(loginUrl.toString());
});

app.get("/auth/facebook/callback", async (request, response) => {
  const code = String(request.query.code || "");
  const state = String(request.query.state || "");
  const oauthError = String(request.query.error || "");
  const oauthErrorDescription = String(request.query.error_description || "");
  removeExpiredFacebookStates();

  if (oauthError) {
    facebookConnection.error = oauthErrorDescription || "Facebook login was cancelled.";
    return response.redirect(`/?facebook=error&message=${encodeURIComponent(facebookConnection.error)}`);
  }
  if (!state || !facebookLoginStates.has(state)) {
    facebookConnection.error = "Facebook login could not be verified. Please try connecting again.";
    return response.redirect(`/?facebook=error&message=${encodeURIComponent(facebookConnection.error)}`);
  }
  facebookLoginStates.delete(state);
  if (!code) {
    facebookConnection.error = "Facebook did not return an authorization code.";
    return response.redirect(`/?facebook=error&message=${encodeURIComponent(facebookConnection.error)}`);
  }

  try {
    const tokenUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", FACEBOOK_APP_ID);
    tokenUrl.searchParams.set("client_secret", FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", FACEBOOK_REDIRECT_URI);
    tokenUrl.searchParams.set("code", code);
    const tokenData = await readFacebookJson(tokenUrl.toString());
    const userAccessToken = String(tokenData.access_token || "");
    if (!userAccessToken) throw new Error("Facebook did not return an access token.");

    const profileUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me`);
    profileUrl.searchParams.set("fields", "id,name");
    profileUrl.searchParams.set("access_token", userAccessToken);
    const profileData = await readFacebookJson(profileUrl.toString());

    const pagesUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me/accounts`);
    pagesUrl.searchParams.set("fields", "id,name,category,tasks,access_token");
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
    console.log(`Facebook connected for ${facebookConnection.userName || "user"}.`);
    console.log(`Facebook Pages found: ${facebookConnection.pages.length}.`);
    return response.redirect("/?facebook=connected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Facebook could not be connected.";
    console.error("Facebook OAuth error:", message);
    facebookConnection = { connected: false, userAccessToken: "", userId: "", userName: "", pages: [], connectedAt: "", error: message };
    return response.redirect(`/?facebook=error&message=${encodeURIComponent(message)}`);
  }
});

app.get("/api/facebook/status", (request, response) => {
  response.json({ ok: true, ...publicFacebookConnection() });
});

async function findActiveFacebookLive() {
  for (const page of Array.isArray(facebookConnection.pages) ? facebookConnection.pages : []) {
    const pageId = String(page.id || "");
    const pageAccessToken = String(page.access_token || "");
    if (!pageId || !pageAccessToken) continue;

    const liveVideosUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${pageId}/live_videos`);
    liveVideosUrl.searchParams.set("fields", "id,title,description,status,creation_time");
    liveVideosUrl.searchParams.set("limit", "25");
    liveVideosUrl.searchParams.set("access_token", pageAccessToken);
    const data = await readFacebookJson(liveVideosUrl.toString());
    const activeLiveVideo = (Array.isArray(data.data) ? data.data : []).find(
      (video) => String(video.status || "").toUpperCase() === "LIVE_NOW"
    );
    if (activeLiveVideo) return { page, pageId, pageAccessToken, activeLiveVideo };
  }
  return null;
}

app.get("/api/facebook/live-status", async (request, response) => {
  if (!facebookConnection.connected) {
    return response.status(401).json({ ok: false, connected: false, live: false, error: "Facebook is not connected." });
  }
  if (!facebookConnection.pages.length) {
    return response.status(404).json({ ok: false, connected: true, live: false, error: "No Facebook Pages were found." });
  }
  try {
    const found = await findActiveFacebookLive();
    if (!found) return response.json({ ok: true, connected: true, live: false, status: "Facebook is connected, but no active Facebook Live video was found." });
    return response.json({
      ok: true,
      connected: true,
      live: true,
      page: { id: found.pageId, name: String(found.page.name || "Facebook Page") },
      liveVideo: {
        id: String(found.activeLiveVideo.id || ""),
        title: String(found.activeLiveVideo.title || found.activeLiveVideo.description || "Facebook Live"),
        status: String(found.activeLiveVideo.status || "LIVE_NOW"),
        creationTime: String(found.activeLiveVideo.creation_time || ""),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not check Facebook Live status.";
    console.error("Facebook Live detection error:", message);
    return response.status(500).json({ ok: false, connected: true, live: false, error: message });
  }
});

app.post("/api/facebook/disconnect", (request, response) => {
  facebookConnection = { connected: false, userAccessToken: "", userId: "", userName: "", pages: [], connectedAt: "", error: "" };
  response.json({ ok: true, connected: false, status: "Facebook disconnected from DavaBridge." });
});

app.post("/api/facebook/send-message", async (request, response) => {
  const message = String(request.body?.message || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim().slice(0, 500);
  if (!message) return response.status(400).json({ ok: false, sent: false, error: "Enter a Facebook message first." });
  if (!facebookConnection.connected) return response.status(401).json({ ok: false, sent: false, error: "Facebook is not connected." });
  if (!facebookConnection.pages.length) return response.status(404).json({ ok: false, sent: false, error: "No Facebook Pages were found." });

  try {
    const found = await findActiveFacebookLive();
    if (!found) return response.status(404).json({ ok: false, sent: false, error: "Facebook is connected, but no active Facebook Live video was found." });

    const commentsUrl = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${encodeURIComponent(String(found.activeLiveVideo.id))}/comments`;
    const commentBody = new URLSearchParams({ message, access_token: found.pageAccessToken });
    const commentData = await readFacebookJson(commentsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: commentBody.toString(),
    });
    return response.json({
      ok: true,
      sent: true,
      status: `Message sent to ${String(found.page.name || "Facebook Page")}.`,
      page: { id: found.pageId, name: String(found.page.name || "Facebook Page") },
      liveVideoId: String(found.activeLiveVideo.id),
      commentId: String(commentData.id || ""),
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "The Facebook message could not be sent.";
    console.error("Facebook Live send error:", messageText);
    return response.status(500).json({ ok: false, sent: false, error: messageText });
  }
});

app.use(express.static(DIST_FOLDER));

const websocketServer = new WebSocketServer({ server, path: "/ws" });
function sendJson(socket, data) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
}
function cleanTikTokUsername(value) {
  return String(value || "").trim()
    .replace(/^https?:\/\/(?:www\.)?tiktok\.com\/@/i, "")
    .replace(/\/live\/?$/i, "").replace(/^@/, "").split(/[/?#]/)[0].trim();
}
async function disconnectTikTok(socket) {
  const connection = socket.tiktokConnection;
  socket.tiktokConnection = null;
  socket.tiktokUsername = "";
  if (!connection) return;
  try { await connection.disconnect(); }
  catch (error) { console.warn("TikTok disconnect warning:", error instanceof Error ? error.message : error); }
}

async function connectTikTok(socket, usernameValue) {
  const username = cleanTikTokUsername(usernameValue);
  if (!username) return sendJson(socket, { type: "tiktok_status", connected: false, status: "Enter a TikTok username first." });
  if (!EULER_API_KEY) return sendJson(socket, { type: "tiktok_status", connected: false, status: "Euler Stream API key is not configured on the server." });
  await disconnectTikTok(socket);
  sendJson(socket, { type: "tiktok_status", connected: false, status: `Connecting to @${username}'s TikTok LIVE...` });

  const connection = new TikTokLiveConnection(username, { processInitialData: false, enableExtendedGiftInfo: false });
  socket.tiktokConnection = connection;
  socket.tiktokUsername = username;

  connection.on(WebcastEvent.CHAT, (data) => {
    const text = String(data?.content || data?.comment || "").trim();
    if (!text) return;
    const username = data?.user?.uniqueId || data?.user?.nickname || data?.user?.userId || "TikTok viewer";
    sendJson(socket, { type: "chat_message", message: { id: `tiktok-${data?.msgId || Date.now()}-${Math.random().toString(36).slice(2)}`, platform: "TikTok", username, text } });
  });
  connection.on(WebcastEvent.MEMBER, (data) => sendJson(socket, { type: "tiktok_join", username: data?.user?.displayId || data?.user?.uniqueId || data?.user?.nickname || data?.user?.userId || "TikTok viewer" }));
  connection.on(WebcastEvent.LIKE, (data) => sendJson(socket, { type: "tiktok_like", username: data?.user?.displayId || data?.user?.uniqueId || data?.user?.nickname || data?.user?.userId || "TikTok viewer", count: Number(data?.count ?? 0), total: Number(data?.total ?? 0) }));
  connection.on(WebcastEvent.ROOM_USER, (data) => {
    const viewers = Number(data?.viewerCount ?? data?.total ?? data?.totalUser ?? data?.memberCount ?? data?.statistics?.viewerCount ?? data?.statistics?.memberCount ?? data?.roomInfo?.viewerCount ?? data?.roomInfo?.userCount ?? 0);
    sendJson(socket, { type: "tiktok_viewers", viewers });
  });
  connection.on(WebcastEvent.GIFT, (data) => sendJson(socket, {
    type: "tiktok_gift",
    username: data?.user?.displayId || data?.user?.uniqueId || data?.user?.nickname || data?.user?.userId || "TikTok viewer",
    giftName: data?.giftDetails?.giftName || data?.giftName || "TikTok gift",
    count: Number(data?.repeatCount || data?.repeatEnd || 1),
  }));
  connection.on(WebcastEvent.DISCONNECTED, () => {
    if (socket.tiktokConnection === connection) sendJson(socket, { type: "tiktok_status", connected: false, status: `Disconnected from @${username}'s TikTok LIVE.` });
  });
  connection.on(WebcastEvent.STREAM_END, () => {
    if (socket.tiktokConnection === connection) sendJson(socket, { type: "tiktok_status", connected: false, status: `@${username}'s TikTok LIVE has ended.` });
  });
  connection.on(WebcastEvent.ERROR, (error) => {
    if (socket.tiktokConnection === connection) sendJson(socket, { type: "tiktok_status", connected: false, status: error instanceof Error ? `TikTok error: ${error.message}` : "TikTok connection error." });
  });

  try {
    const state = await connection.connect();
    if (socket.tiktokConnection !== connection) { await connection.disconnect().catch(() => {}); return; }
    sendJson(socket, { type: "tiktok_status", connected: true, username, roomId: state?.roomId || connection.roomId || "", status: `Listening to @${username}'s TikTok LIVE` });
  } catch (error) {
    if (socket.tiktokConnection === connection) { socket.tiktokConnection = null; socket.tiktokUsername = ""; }
    const details = error instanceof Error ? error.message : "Could not connect to TikTok.";
    console.error(`TikTok connection failed for @${username}:`, details);
    sendJson(socket, { type: "tiktok_status", connected: false, status: `Could not connect to @${username}. Make sure the account is currently LIVE.`, details });
    try { await connection.disconnect(); } catch {}
  }
}

websocketServer.on("connection", (socket) => {
  socket.tiktokConnection = null;
  socket.tiktokUsername = "";
  sendJson(socket, { type: "server_status", connected: true, status: "Connected to the DavaBridge server." });
  socket.on("message", async (rawMessage) => {
    try {
      const command = JSON.parse(rawMessage.toString());
      if (command.type === "connect_tiktok") return await connectTikTok(socket, command.username);
      if (command.type === "disconnect_tiktok") {
        await disconnectTikTok(socket);
        return sendJson(socket, { type: "tiktok_status", connected: false, status: "TikTok disconnected." });
      }
      if (command.type === "ping") return sendJson(socket, { type: "pong", timestamp: Date.now() });
      sendJson(socket, { type: "server_error", message: "Unknown DavaBridge command." });
    } catch (error) {
      console.error("WebSocket message error:", error);
      sendJson(socket, { type: "server_error", message: "The DavaBridge server could not read that command." });
    }
  });
  socket.on("close", () => disconnectTikTok(socket).catch((error) => console.error("TikTok cleanup error:", error)));
  socket.on("error", (error) => console.error("DavaBridge WebSocket error:", error));
});

app.get("/terms.html", (request, response, next) => {
  response.sendFile(path.join(DIST_FOLDER, "terms.html"), (error) => { if (error) next(error); });
});

app.use((request, response, next) => {
  if (request.path.startsWith("/api/") || request.path.startsWith("/auth/")) return next();
  response.sendFile(path.join(DIST_FOLDER, "index.html"), (error) => { if (error) next(error); });
});
app.use((request, response) => response.status(404).json({ ok: false, error: "DavaBridge route not found." }));
app.use((error, request, response, next) => {
  console.error("DavaBridge server error:", error);
  if (response.headersSent) return next(error);
  response.status(500).json({ ok: false, error: "DavaBridge server error." });
});
server.listen(PORT, "0.0.0.0", () => console.log(`DavaBridge server is running on port ${PORT}`));
