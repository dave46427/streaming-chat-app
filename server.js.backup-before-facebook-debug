import "dotenv/config";
import express from "express";
import Stripe from "stripe";
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
const STRIPE_SECRET_KEY = String(process.env.STRIPE_SECRET_KEY || "").trim();

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY)
  : null;
const DIST_FOLDER = path.join(__dirname, "dist");
const WEBSITE_FILE = path.join(__dirname, "public", "website.html");

const EULER_API_KEY = process.env.EULER_API_KEY || process.env.TIKTOK_SIGN_API_KEY || "";
const MIXCLOUD_CLIENT_ID = String(process.env.MIXCLOUD_CLIENT_ID || "").trim();
const MIXCLOUD_CLIENT_SECRET = String(process.env.MIXCLOUD_CLIENT_SECRET || "").trim();
const MIXCLOUD_REDIRECT_URI = process.env.MIXCLOUD_REDIRECT_URI ||
  "https://streaming-chat-app-production-dc88.up.railway.app/auth/mixcloud/callback";
const KICK_CLIENT_ID = String(process.env.KICK_CLIENT_ID || "").trim();
const KICK_CLIENT_SECRET = String(process.env.KICK_CLIENT_SECRET || "").trim();
const KICK_REDIRECT_URI = process.env.KICK_REDIRECT_URI ||
  "https://streaming-chat-app-production-dc88.up.railway.app/auth/kick/callback";
const KICK_SCOPES = ["user:read", "chat:write", "events:subscribe"];
const FACEBOOK_APP_ID = String(process.env.FACEBOOK_APP_ID || "").trim();
const FACEBOOK_APP_SECRET = String(process.env.FACEBOOK_APP_SECRET || "").trim();
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI ||
  "https://streaming-chat-app-production-dc88.up.railway.app/auth/facebook/callback";
const FACEBOOK_GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v25.0";
const FACEBOOK_POLL_INTERVAL_MS = Math.max(15000, Number(process.env.FACEBOOK_POLL_INTERVAL_MS || 15000));
const FACEBOOK_RATE_LIMIT_COOLDOWN_MS = Math.max(15 * 60 * 1000, Number(process.env.FACEBOOK_RATE_LIMIT_COOLDOWN_MS || 60 * 60 * 1000));


const kickLoginStates = new Map();
let kickConnection = {
  connected: false,
  accessToken: "",
  refreshToken: "",
  expiresAt: 0,
  userId: "",
  userName: "",
  connectedAt: "",
  scopes: [],
  error: "",
};

const mixcloudLoginStates = new Map();
let mixcloudConnection = {
  connected: false,
  accessToken: "",
  userKey: "",
  userName: "",
  displayName: "",
  connectedAt: "",
  error: "",
};

const facebookLoginStates = new Map();
const seenFacebookCommentIds = new Set();
let facebookPollTimer = null;
let facebookPollBusy = false;
let currentFacebookLiveId = "";
let facebookInitialCommentsLoaded = false;
let facebookRateLimitedUntil = 0;
let facebookLastRateLimitNoticeAt = 0;

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


if (MIXCLOUD_CLIENT_ID && MIXCLOUD_CLIENT_SECRET) {
  console.log("Mixcloud Client ID and Client Secret loaded.");
} else {
  console.warn("Mixcloud credentials were not found. Add MIXCLOUD_CLIENT_ID and MIXCLOUD_CLIENT_SECRET.");
}

if (KICK_CLIENT_ID && KICK_CLIENT_SECRET) {
  console.log("Kick Client ID and Client Secret loaded.");
} else {
  console.warn("Kick credentials were not found. Add KICK_CLIENT_ID and KICK_CLIENT_SECRET.");
}

if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
  console.log("Facebook App ID and App Secret loaded.");
} else {
  console.warn("Facebook credentials were not found. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.");
}

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

function cleanText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function repairMojibake(value) {
  let text = cleanText(value);
  if (!text) return "";

  // Repair the common UTF-8-as-Windows-1252/Latin-1 corruption seen as Ãƒ, Ã‚, Ã¢ or Ã°.
  if (/[ÃƒÃ‚Ã¢Ã°]/.test(text)) {
    try {
      const repaired = Buffer.from(text, "latin1").toString("utf8");
      if (repaired && !repaired.includes("?")) text = repaired;
    } catch {
      // Keep the original text if conversion is not safe.
    }
  }

  return cleanText(text);
}

function safeUsername(value, fallback) {
  return repairMojibake(value) || fallback;
}

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

class FacebookApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "FacebookApiError";
    this.code = Number(details.code || 0);
    this.subcode = Number(details.error_subcode || 0);
    this.httpStatus = Number(details.httpStatus || 0);
    this.isRateLimit = this.code === 4 || this.code === 17 || this.code === 32 || this.code === 613 || this.code === 80001;
  }
}

function facebookCooldownRemainingMs() {
  return Math.max(0, facebookRateLimitedUntil - Date.now());
}

function facebookCooldownMessage() {
  const minutes = Math.max(1, Math.ceil(facebookCooldownRemainingMs() / 60000));
  return `Facebook has temporarily rate-limited DavaBridge. Automatic Facebook requests are paused for about ${minutes} more minute${minutes === 1 ? "" : "s"}.`;
}

function activateFacebookRateLimitCooldown(error) {
  facebookRateLimitedUntil = Math.max(facebookRateLimitedUntil, Date.now() + FACEBOOK_RATE_LIMIT_COOLDOWN_MS);
  const now = Date.now();
  if (now - facebookLastRateLimitNoticeAt > 60000) {
    facebookLastRateLimitNoticeAt = now;
    console.warn(`Facebook rate limit detected. Pausing Facebook Graph API requests until ${new Date(facebookRateLimitedUntil).toISOString()}.`, error.message);
    broadcastJson({
      type: "facebook_status",
      connected: facebookConnection.connected,
      live: Boolean(currentFacebookLiveId),
      rateLimited: true,
      retryAfter: new Date(facebookRateLimitedUntil).toISOString(),
      status: facebookCooldownMessage(),
    });
  }
}

async function readFacebookJson(url, options = {}) {
  if (facebookCooldownRemainingMs() > 0) {
    const cooldownError = new FacebookApiError(facebookCooldownMessage(), { code: 4, httpStatus: 429 });
    cooldownError.isLocalCooldown = true;
    throw cooldownError;
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.error) {
    const details = data?.error || {};
    const error = new FacebookApiError(
      details.message || data?.error_description || `Facebook returned HTTP ${response.status}.`,
      { ...details, httpStatus: response.status }
    );
    if (error.isRateLimit || response.status === 429) activateFacebookRateLimitCooldown(error);
    throw error;
  }

  return data;
}

app.post("/api/stripe/create-checkout-session", async (request, response) => {
  if (!stripe) {
    return response.status(503).json({
      ok: false,
      error: "Stripe is not configured on the DavaBridge server.",
    });
  }

  try {
    const origin =
      process.env.DAVABRIDGE_PUBLIC_URL ||
      `${request.protocol}://${request.get("host")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "DavaBridge Pro",
              description: "DavaBridge Pro monthly subscription",
            },
            recurring: {
              interval: "month",
            },
            unit_amount: 499,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?stripe=cancelled`,
    });

    return response.json({
      ok: true,
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Stripe Checkout error:",
      error instanceof Error ? error.message : error
    );

    return response.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not start DavaBridge Pro checkout.",
    });
  }
});
app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    service: "DavaBridge",
    eulerApiKeyLoaded: Boolean(EULER_API_KEY),
    mixcloudCredentialsLoaded: Boolean(MIXCLOUD_CLIENT_ID && MIXCLOUD_CLIENT_SECRET),
    mixcloudConnected: mixcloudConnection.connected,
    kickCredentialsLoaded: Boolean(KICK_CLIENT_ID && KICK_CLIENT_SECRET),
    kickConnected: kickConnection.connected,
    facebookCredentialsLoaded: Boolean(FACEBOOK_APP_ID && FACEBOOK_APP_SECRET),
    facebookConnected: facebookConnection.connected,
    facebookPolling: Boolean(facebookPollTimer),
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
    "pages_manage_metadata",
    "pages_manage_engagement",
    "pages_manage_posts",
    "publish_video",
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
      userName: repairMojibake(profileData.name),
      pages: Array.isArray(pagesData.data) ? pagesData.data : [],
      connectedAt: new Date().toISOString(),
      error: "",
    };

    currentFacebookLiveId = "";
    facebookInitialCommentsLoaded = false;
    seenFacebookCommentIds.clear();
    startFacebookPolling();

    console.log(`Facebook connected for ${facebookConnection.userName || "user"}.`);
    console.log(`Facebook Pages found: ${facebookConnection.pages.length}.`);
    return response.redirect("/?facebook=connected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Facebook could not be connected.";
    console.error("Facebook OAuth error:", message);
    stopFacebookPolling();
    facebookConnection = { connected: false, userAccessToken: "", userId: "", userName: "", pages: [], connectedAt: "", error: message };
    return response.redirect(`/?facebook=error&message=${encodeURIComponent(message)}`);
  }
});

app.get("/api/facebook/status", async (request, response) => {
  if (!facebookConnection.connected || !facebookConnection.userAccessToken) {
    return response.json({
      ok: true,
      connected: false,
      userId: "",
      userName: "",
      connectedAt: "",
      error: "",
      pages: [],
    });
  }

  try {
    const profileUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me`);
    profileUrl.searchParams.set("fields", "id,name");
    profileUrl.searchParams.set("access_token", facebookConnection.userAccessToken);
    const profileData = await readFacebookJson(profileUrl.toString());

    const pagesUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me/accounts`);
    pagesUrl.searchParams.set("fields", "id,name,category,tasks,access_token");
    pagesUrl.searchParams.set("access_token", facebookConnection.userAccessToken);
    const pagesData = await readFacebookJson(pagesUrl.toString());

    const pages = Array.isArray(pagesData.data) ? pagesData.data : [];

    if (!profileData.id || pages.length === 0) {
      throw new Error("The saved Facebook connection is no longer valid.");
    }

    facebookConnection = {
      ...facebookConnection,
      connected: true,
      userId: String(profileData.id),
      userName: repairMojibake(profileData.name),
      pages,
      error: "",
    };

    return response.json({
      ok: true,
      ...publicFacebookConnection(),
    });
  } catch (error) {
    if (error instanceof FacebookApiError && error.isRateLimit) {
      return response.status(429).json({
        ok: false,
        connected: facebookConnection.connected,
        rateLimited: true,
        error: facebookCooldownMessage(),
        ...publicFacebookConnection(),
      });
    }

    const message = error instanceof Error
      ? error.message
      : "The saved Facebook connection could not be validated.";

    console.warn("Facebook saved connection is invalid:", message);
    stopFacebookPolling();

    facebookConnection = {
      connected: false,
      userAccessToken: "",
      userId: "",
      userName: "",
      pages: [],
      connectedAt: "",
      error: "Facebook needs reconnecting.",
    };

    return response.json({
      ok: true,
      ...publicFacebookConnection(),
    });
  }
});

function isActiveFacebookLiveStatus(value) {
  const status = String(value || "").trim().toUpperCase();
  return status === "LIVE" || status === "LIVE_NOW";
}

async function findActiveFacebookLive() {
  for (const page of Array.isArray(facebookConnection.pages) ? facebookConnection.pages : []) {
    const pageId = String(page.id || "");
    const pageAccessToken = String(page.access_token || "");
    if (!pageId || !pageAccessToken) continue;

    const liveVideosUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${pageId}/live_videos`);
    liveVideosUrl.searchParams.set("fields", "id,title,description,status,creation_time");
    liveVideosUrl.searchParams.set("limit", "25");
    liveVideosUrl.searchParams.set("source", "owner");
    liveVideosUrl.searchParams.set("access_token", pageAccessToken);
    const data = await readFacebookJson(liveVideosUrl.toString());
    const liveVideos = Array.isArray(data.data) ? data.data : [];

    console.log(
      `Facebook Live check for ${repairMojibake(page.name) || pageId}:`,
      liveVideos.length
        ? liveVideos.map((video) => `${String(video.id || "unknown")}:${String(video.status || "unknown")}`).join(", ")
        : "no LiveVideo objects returned"
    );

    const activeLiveVideo = liveVideos.find((video) => isActiveFacebookLiveStatus(video.status));
    if (activeLiveVideo) return { page, pageId, pageAccessToken, activeLiveVideo };
  }

  return null;
}

function broadcastJson(data) {
  const payload = JSON.stringify(data);
  for (const client of websocketServer.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

function rememberFacebookComment(commentId) {
  seenFacebookCommentIds.add(commentId);
  if (seenFacebookCommentIds.size > 2000) {
    const oldest = seenFacebookCommentIds.values().next().value;
    if (oldest) seenFacebookCommentIds.delete(oldest);
  }
}

async function pollFacebookComments() {
  if (facebookPollBusy || !facebookConnection.connected || !facebookConnection.pages.length) return;
  if (facebookCooldownRemainingMs() > 0) return;
  facebookPollBusy = true;

  try {
    const found = await findActiveFacebookLive();
    if (!found) {
      if (currentFacebookLiveId) {
        broadcastJson({ type: "facebook_status", connected: true, live: false, status: "Facebook is connected, but no active Facebook Live video was found." });
      }
      currentFacebookLiveId = "";
      facebookInitialCommentsLoaded = false;
      seenFacebookCommentIds.clear();
      return;
    }

    const liveVideoId = String(found.activeLiveVideo.id || "");
    if (liveVideoId !== currentFacebookLiveId) {
      currentFacebookLiveId = liveVideoId;
      facebookInitialCommentsLoaded = false;
      seenFacebookCommentIds.clear();
      broadcastJson({
        type: "facebook_status",
        connected: true,
        live: true,
        status: `Listening to ${repairMojibake(found.page.name) || "Facebook Page"} Live comments`,
        liveVideoId,
      });
    }

    const commentsUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${encodeURIComponent(liveVideoId)}/comments`);
    commentsUrl.searchParams.set("fields", "id,from{name,id},message,created_time");
    commentsUrl.searchParams.set("filter", "stream");
    commentsUrl.searchParams.set("order", "chronological");
    commentsUrl.searchParams.set("limit", "100");
    commentsUrl.searchParams.set("access_token", found.pageAccessToken);
    const commentsData = await readFacebookJson(commentsUrl.toString());
    const comments = Array.isArray(commentsData.data) ? commentsData.data : [];

    if (!facebookInitialCommentsLoaded) {
      facebookInitialCommentsLoaded = true;
      console.log(`Facebook initial comment fetch returned ${comments.length} comment(s).`);
    }

    for (const comment of comments) {
      const id = String(comment?.id || "");
      const text = repairMojibake(comment?.message);
      if (!id || !text || seenFacebookCommentIds.has(id)) continue;
      rememberFacebookComment(id);
      broadcastJson({
        type: "chat_message",
        message: {
          id: `facebook-${id}`,
          platform: "Facebook",
          username: safeUsername(comment?.from?.name, "Facebook viewer"),
          text,
          createdTime: String(comment?.created_time || ""),
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not receive Facebook Live comments.";
    if (!(error instanceof FacebookApiError && error.isLocalCooldown)) {
      console.error("Facebook comment polling error:", message);
    }
    broadcastJson({
      type: "facebook_status",
      connected: true,
      live: Boolean(currentFacebookLiveId),
      rateLimited: error instanceof FacebookApiError ? error.isRateLimit : false,
      retryAfter: facebookRateLimitedUntil ? new Date(facebookRateLimitedUntil).toISOString() : "",
      status: error instanceof FacebookApiError && error.isRateLimit ? facebookCooldownMessage() : `Facebook comment error: ${message}`,
    });
  } finally {
    facebookPollBusy = false;
  }
}

function startFacebookPolling() {
  if (facebookPollTimer) return;
  facebookPollTimer = setInterval(() => pollFacebookComments().catch((error) => console.error("Facebook poll error:", error)), FACEBOOK_POLL_INTERVAL_MS);
  pollFacebookComments().catch((error) => console.error("Facebook initial poll error:", error));
}

function stopFacebookPolling() {
  if (facebookPollTimer) clearInterval(facebookPollTimer);
  facebookPollTimer = null;
  facebookPollBusy = false;
  currentFacebookLiveId = "";
  facebookInitialCommentsLoaded = false;
  seenFacebookCommentIds.clear();
}

app.get("/api/facebook/live-status", async (request, response) => {
  if (!facebookConnection.connected) {
    return response.status(401).json({ ok: false, connected: false, live: false, error: "Facebook is not connected." });
  }
  if (!facebookConnection.pages.length) {
    return response.status(404).json({ ok: false, connected: true, live: false, error: "No Facebook Pages were found." });
  }
  if (facebookCooldownRemainingMs() > 0) {
    return response.status(429).json({
      ok: false,
      connected: true,
      live: Boolean(currentFacebookLiveId),
      rateLimited: true,
      retryAfter: new Date(facebookRateLimitedUntil).toISOString(),
      error: facebookCooldownMessage(),
    });
  }

  try {
    const found = await findActiveFacebookLive();
    if (!found) return response.json({ ok: true, connected: true, live: false, status: "Facebook is connected, but no active Facebook Live video was found." });

    return response.json({
      ok: true,
      connected: true,
      live: true,
      page: { id: found.pageId, name: repairMojibake(found.page.name) || "Facebook Page" },
      liveVideo: {
        id: String(found.activeLiveVideo.id || ""),
        title: repairMojibake(found.activeLiveVideo.title || found.activeLiveVideo.description) || "Facebook Live",
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
  stopFacebookPolling();
  facebookConnection = { connected: false, userAccessToken: "", userId: "", userName: "", pages: [], connectedAt: "", error: "" };
  response.json({ ok: true, connected: false, status: "Facebook disconnected from DavaBridge." });
});

app.post("/api/facebook/send-message", async (request, response) => {
  const message = repairMojibake(request.body?.message).slice(0, 500);
  if (!message) return response.status(400).json({ ok: false, sent: false, error: "Enter a Facebook message first." });
  if (!facebookConnection.connected) return response.status(401).json({ ok: false, sent: false, error: "Facebook is not connected." });
  if (!facebookConnection.pages.length) return response.status(404).json({ ok: false, sent: false, error: "No Facebook Pages were found." });
  if (facebookCooldownRemainingMs() > 0) {
    return response.status(429).json({
      ok: false,
      sent: false,
      rateLimited: true,
      retryAfter: new Date(facebookRateLimitedUntil).toISOString(),
      error: facebookCooldownMessage(),
    });
  }

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
      status: `Message sent to ${repairMojibake(found.page.name) || "Facebook Page"}.`,
      page: { id: found.pageId, name: repairMojibake(found.page.name) || "Facebook Page" },
      liveVideoId: String(found.activeLiveVideo.id),
      commentId: String(commentData.id || ""),
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "The Facebook message could not be sent.";
    console.error("Facebook Live send error:", messageText);
    return response.status(500).json({ ok: false, sent: false, error: messageText });
  }
});


function publicMixcloudConnection() {
  return {
    connected: mixcloudConnection.connected,
    userKey: mixcloudConnection.userKey,
    userName: mixcloudConnection.userName,
    displayName: mixcloudConnection.displayName,
    connectedAt: mixcloudConnection.connectedAt,
    error: mixcloudConnection.error,
  };
}

function removeExpiredMixcloudStates() {
  const now = Date.now();
  for (const [state, login] of mixcloudLoginStates.entries()) {
    if (now - login.createdAt > 10 * 60 * 1000) mixcloudLoginStates.delete(state);
  }
}

function base64UrlSha256(value) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

async function readMixcloudJson(url, options = {}) {
  const apiResponse = await fetch(url, options);
  const data = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok || data?.error) {
    const message = data?.error_description || data?.error?.message || data?.error || `Mixcloud returned HTTP ${apiResponse.status}.`;
    throw new Error(String(message));
  }
  return data;
}

app.get("/auth/mixcloud", (request, response) => {
  if (!MIXCLOUD_CLIENT_ID || !MIXCLOUD_CLIENT_SECRET) {
    return response.status(503).json({ ok: false, error: "Mixcloud is not configured. Add MIXCLOUD_CLIENT_ID and MIXCLOUD_CLIENT_SECRET." });
  }

  removeExpiredMixcloudStates();
  const state = crypto.randomBytes(32).toString("base64url");
  const codeVerifier = crypto.randomBytes(64).toString("base64url");
  mixcloudLoginStates.set(state, { createdAt: Date.now(), codeVerifier });

  const loginUrl = new URL("https://www.mixcloud.com/oauth/authorize/");
  loginUrl.searchParams.set("response_type", "code");
  loginUrl.searchParams.set("client_id", MIXCLOUD_CLIENT_ID);
  loginUrl.searchParams.set("redirect_uri", MIXCLOUD_REDIRECT_URI);
  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("code_challenge", base64UrlSha256(codeVerifier));
  loginUrl.searchParams.set("code_challenge_method", "S256");
  return response.redirect(loginUrl.toString());
});

app.get("/auth/mixcloud/callback", async (request, response) => {
  const code = String(request.query.code || "");
  const state = String(request.query.state || "");
  const oauthError = String(request.query.error || "");
  const oauthErrorDescription = String(request.query.error_description || "");

  removeExpiredMixcloudStates();
  const login = mixcloudLoginStates.get(state);

  if (oauthError) {
    mixcloudConnection.error = oauthErrorDescription || "Mixcloud login was cancelled.";
    return response.redirect(`/?mixcloud=error&message=${encodeURIComponent(mixcloudConnection.error)}`);
  }
  if (!state || !login) {
    mixcloudConnection.error = "Mixcloud login could not be verified. Please try connecting again.";
    return response.redirect(`/?mixcloud=error&message=${encodeURIComponent(mixcloudConnection.error)}`);
  }

  mixcloudLoginStates.delete(state);
  if (!code) {
    mixcloudConnection.error = "Mixcloud did not return an authorization code.";
    return response.redirect(`/?mixcloud=error&message=${encodeURIComponent(mixcloudConnection.error)}`);
  }

  try {
    const basicCredentials = Buffer.from(`${MIXCLOUD_CLIENT_ID}:${MIXCLOUD_CLIENT_SECRET}`).toString("base64");
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: MIXCLOUD_REDIRECT_URI,
      code_verifier: login.codeVerifier,
    });
    const tokenData = await readMixcloudJson("https://www.mixcloud.com/oauth/access_token/", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: tokenBody.toString(),
    });
    const accessToken = String(tokenData.access_token || "");
    if (!accessToken) throw new Error("Mixcloud did not return an access token.");

    const profileData = await readMixcloudJson("https://api.mixcloud.com/me/", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    mixcloudConnection = {
      connected: true,
      accessToken,
      userKey: String(profileData.key || ""),
      userName: repairMojibake(profileData.username || ""),
      displayName: repairMojibake(profileData.name || profileData.username || "Mixcloud user"),
      connectedAt: new Date().toISOString(),
      error: "",
    };
    console.log(`Mixcloud connected for ${mixcloudConnection.displayName || mixcloudConnection.userName || "user"}.`);
    return response.redirect("/?mixcloud=connected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mixcloud could not be connected.";
    console.error("Mixcloud OAuth error:", message);
    mixcloudConnection = { connected: false, accessToken: "", userKey: "", userName: "", displayName: "", connectedAt: "", error: message };
    return response.redirect(`/?mixcloud=error&message=${encodeURIComponent(message)}`);
  }
});

app.get("/api/mixcloud/status", async (request, response) => {
  if (!mixcloudConnection.connected || !mixcloudConnection.accessToken) {
    return response.json({ ok: true, ...publicMixcloudConnection() });
  }
  try {
    const profileData = await readMixcloudJson("https://api.mixcloud.com/me/", {
      headers: { Authorization: `Bearer ${mixcloudConnection.accessToken}` },
    });
    mixcloudConnection = {
      ...mixcloudConnection,
      connected: true,
      userKey: String(profileData.key || mixcloudConnection.userKey),
      userName: repairMojibake(profileData.username || mixcloudConnection.userName),
      displayName: repairMojibake(profileData.name || profileData.username || mixcloudConnection.displayName),
      error: "",
    };
    return response.json({ ok: true, ...publicMixcloudConnection() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The saved Mixcloud connection could not be validated.";
    mixcloudConnection = { connected: false, accessToken: "", userKey: "", userName: "", displayName: "", connectedAt: "", error: "Mixcloud needs reconnecting." };
    return response.status(401).json({ ok: false, ...publicMixcloudConnection(), details: message });
  }
});

app.post("/api/mixcloud/disconnect", async (request, response) => {
  const token = mixcloudConnection.accessToken;
  if (token && MIXCLOUD_CLIENT_ID && MIXCLOUD_CLIENT_SECRET) {
    try {
      const basicCredentials = Buffer.from(`${MIXCLOUD_CLIENT_ID}:${MIXCLOUD_CLIENT_SECRET}`).toString("base64");
      await fetch("https://www.mixcloud.com/oauth/revoke/", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicCredentials}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({ token, token_type_hint: "access_token" }).toString(),
      });
    } catch (error) {
      console.warn("Mixcloud token revocation warning:", error instanceof Error ? error.message : error);
    }
  }
  mixcloudConnection = { connected: false, accessToken: "", userKey: "", userName: "", displayName: "", connectedAt: "", error: "" };
  response.json({ ok: true, connected: false, status: "Mixcloud disconnected from DavaBridge." });
});


function publicKickConnection() {
  return {
    connected: kickConnection.connected,
    userId: kickConnection.userId,
    userName: kickConnection.userName,
    connectedAt: kickConnection.connectedAt,
    scopes: kickConnection.scopes,
    error: kickConnection.error,
  };
}

function removeExpiredKickStates() {
  const now = Date.now();
  for (const [state, login] of kickLoginStates.entries()) {
    if (now - login.createdAt > 10 * 60 * 1000) kickLoginStates.delete(state);
  }
}

async function readKickJson(url, options = {}) {
  const apiResponse = await fetch(url, options);
  const data = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok || data?.error) {
    const message = data?.message || data?.error_description || data?.error || `Kick returned HTTP ${apiResponse.status}.`;
    throw new Error(String(message));
  }
  return data;
}

async function getKickProfile(accessToken) {
  const profileData = await readKickJson("https://api.kick.com/public/v1/users", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const users = Array.isArray(profileData?.data) ? profileData.data : [];
  const user = users[0] || profileData?.data || {};
  return {
    id: String(user?.user_id || user?.id || ""),
    name: repairMojibake(user?.name || user?.username || user?.slug || "Kick user"),
  };
}

app.get("/auth/kick", (request, response) => {
  if (!KICK_CLIENT_ID || !KICK_CLIENT_SECRET) {
    return response.status(503).json({ ok: false, error: "Kick is not configured. Add KICK_CLIENT_ID and KICK_CLIENT_SECRET." });
  }

  removeExpiredKickStates();
  const state = crypto.randomBytes(32).toString("base64url");
  const codeVerifier = crypto.randomBytes(64).toString("base64url");
  kickLoginStates.set(state, { createdAt: Date.now(), codeVerifier });

  const loginUrl = new URL("https://id.kick.com/oauth/authorize");
  loginUrl.searchParams.set("response_type", "code");
  loginUrl.searchParams.set("client_id", KICK_CLIENT_ID);
  loginUrl.searchParams.set("redirect_uri", KICK_REDIRECT_URI);
  loginUrl.searchParams.set("scope", KICK_SCOPES.join(" "));
  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("code_challenge", base64UrlSha256(codeVerifier));
  loginUrl.searchParams.set("code_challenge_method", "S256");
  return response.redirect(loginUrl.toString());
});

app.get("/auth/kick/callback", async (request, response) => {
  const code = String(request.query.code || "");
  const state = String(request.query.state || "");
  const oauthError = String(request.query.error || "");
  const oauthErrorDescription = String(request.query.error_description || "");

  removeExpiredKickStates();
  const login = kickLoginStates.get(state);

  if (oauthError) {
    kickConnection.error = oauthErrorDescription || "Kick login was cancelled.";
    return response.redirect(`/?kick=error&message=${encodeURIComponent(kickConnection.error)}`);
  }
  if (!state || !login) {
    kickConnection.error = "Kick login could not be verified. Please try connecting again.";
    return response.redirect(`/?kick=error&message=${encodeURIComponent(kickConnection.error)}`);
  }

  kickLoginStates.delete(state);
  if (!code) {
    kickConnection.error = "Kick did not return an authorization code.";
    return response.redirect(`/?kick=error&message=${encodeURIComponent(kickConnection.error)}`);
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KICK_CLIENT_ID,
      client_secret: KICK_CLIENT_SECRET,
      code,
      redirect_uri: KICK_REDIRECT_URI,
      code_verifier: login.codeVerifier,
    });
    const tokenData = await readKickJson("https://id.kick.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: tokenBody.toString(),
    });
    const accessToken = String(tokenData.access_token || "");
    if (!accessToken) throw new Error("Kick did not return an access token.");

    const profile = await getKickProfile(accessToken);
    kickConnection = {
      connected: true,
      accessToken,
      refreshToken: String(tokenData.refresh_token || ""),
      expiresAt: Date.now() + Math.max(0, Number(tokenData.expires_in || 0)) * 1000,
      userId: profile.id,
      userName: profile.name,
      connectedAt: new Date().toISOString(),
      scopes: String(tokenData.scope || KICK_SCOPES.join(" ")).split(/\s+/).filter(Boolean),
      error: "",
    };
    console.log(`Kick connected for ${kickConnection.userName || "user"}.`);
    return response.redirect("/?kick=connected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kick could not be connected.";
    console.error("Kick OAuth error:", message);
    kickConnection = { connected: false, accessToken: "", refreshToken: "", expiresAt: 0, userId: "", userName: "", connectedAt: "", scopes: [], error: message };
    return response.redirect(`/?kick=error&message=${encodeURIComponent(message)}`);
  }
});

app.get("/api/kick/status", async (request, response) => {
  if (!kickConnection.connected || !kickConnection.accessToken) {
    return response.json({ ok: true, ...publicKickConnection() });
  }
  try {
    const profile = await getKickProfile(kickConnection.accessToken);
    kickConnection = { ...kickConnection, connected: true, userId: profile.id, userName: profile.name, error: "" };
    return response.json({ ok: true, ...publicKickConnection() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The saved Kick connection could not be validated.";
    kickConnection = { connected: false, accessToken: "", refreshToken: "", expiresAt: 0, userId: "", userName: "", connectedAt: "", scopes: [], error: "Kick needs reconnecting." };
    return response.status(401).json({ ok: false, ...publicKickConnection(), details: message });
  }
});

app.post("/api/kick/disconnect", async (request, response) => {
  const token = kickConnection.accessToken;
  if (token) {
    try {
      await fetch("https://id.kick.com/oauth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ token, token_type_hint: "access_token" }).toString(),
      });
    } catch (error) {
      console.warn("Kick token revocation warning:", error instanceof Error ? error.message : error);
    }
  }
  kickConnection = { connected: false, accessToken: "", refreshToken: "", expiresAt: 0, userId: "", userName: "", connectedAt: "", scopes: [], error: "" };
  response.json({ ok: true, connected: false, status: "Kick disconnected from DavaBridge." });
});

app.post("/api/kick/send-message", async (request, response) => {
  const message = repairMojibake(request.body?.message).slice(0, 500);
  if (!message) return response.status(400).json({ ok: false, sent: false, error: "Enter a Kick message first." });
  if (!kickConnection.connected || !kickConnection.accessToken) {
    return response.status(401).json({ ok: false, sent: false, error: "Kick is not connected." });
  }
  if (!kickConnection.scopes.includes("chat:write")) {
    return response.status(403).json({ ok: false, sent: false, error: "Kick connected without the chat:write permission. Reconnect Kick and approve Write to Chat feed." });
  }

  try {
    const result = await readKickJson("https://api.kick.com/public/v1/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kickConnection.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ content: message, type: "user" }),
    });
    return response.json({ ok: true, sent: true, status: "Message sent to Kick.", data: result?.data || null });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "The Kick message could not be sent.";
    console.error("Kick send error:", messageText);
    return response.status(500).json({ ok: false, sent: false, error: messageText });
  }
});

app.get(["/website", "/website.html"], (request, response, next) => {
  response.sendFile(WEBSITE_FILE, (error) => { if (error) next(error); });
});

app.use(express.static(DIST_FOLDER));

const websocketServer = new WebSocketServer({ server, path: "/ws" });

function sendJson(socket, data) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
}

function cleanTikTokUsername(value) {
  return cleanText(value)
    .replace(/^https?:\/\/(?:www\.)?tiktok\.com\/@/i, "")
    .replace(/\/live\/?$/i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim();
}

let tiktokConnection = null;
let tiktokUsername = "";
let tiktokConnected = false;
let tiktokRoomId = "";
let tiktokConnectPromise = null;

async function disconnectTikTok() {
  const connection = tiktokConnection;
  tiktokConnection = null;
  tiktokUsername = "";
  tiktokConnected = false;
  tiktokRoomId = "";
  tiktokConnectPromise = null;
  if (!connection) return;
  try {
    await connection.disconnect();
  } catch (error) {
    console.warn("TikTok disconnect warning:", error instanceof Error ? error.message : error);
  }
}

async function connectTikTok(socket, usernameValue) {
  const username = cleanTikTokUsername(usernameValue);
  if (!username) {
    return sendJson(socket, { type: "tiktok_status", connected: false, status: "Enter a TikTok username first." });
  }
  if (!EULER_API_KEY) {
    return sendJson(socket, { type: "tiktok_status", connected: false, status: "Euler Stream API key is not configured on the server." });
  }

  if (tiktokConnection && tiktokUsername === username) {
    if (tiktokConnectPromise) {
      sendJson(socket, { type: "tiktok_status", connected: false, status: `Connecting to @${username}'s TikTok LIVE...` });
      await tiktokConnectPromise.catch(() => {});
    }

    if (tiktokConnected && tiktokConnection) {
      return sendJson(socket, {
        type: "tiktok_status",
        connected: true,
        username: tiktokUsername,
        roomId: tiktokRoomId,
        status: `Listening to @${tiktokUsername}'s TikTok LIVE`,
      });
    }
  }

  if (tiktokConnection) await disconnectTikTok();

  sendJson(socket, { type: "tiktok_status", connected: false, status: `Connecting to @${username}'s TikTok LIVE...` });

  const connection = new TikTokLiveConnection(username, {
    processInitialData: false,
    enableExtendedGiftInfo: true,
  });

  tiktokConnection = connection;
  tiktokUsername = username;
  tiktokConnected = false;
  tiktokRoomId = "";

  connection.on(WebcastEvent.CHAT, (data) => {
    if (tiktokConnection !== connection) return;
    const text = repairMojibake(data?.content || data?.comment);
    if (!text) return;
    const chatUsername = safeUsername(
      data?.user?.displayId || data?.user?.uniqueId || data?.user?.nickname || data?.user?.userId,
      "TikTok viewer"
    );
    broadcastJson({
      type: "chat_message",
      message: {
        id: `tiktok-${data?.msgId || Date.now()}-${Math.random().toString(36).slice(2)}`,
        platform: "TikTok",
        username: chatUsername,
        text,
      },
    });
  });

  connection.on(WebcastEvent.MEMBER, (data) => {
    if (tiktokConnection !== connection) return;
    broadcastJson({
      type: "tiktok_join",
      username: safeUsername(data?.user?.displayId || data?.user?.uniqueId || data?.user?.nickname || data?.user?.userId, "TikTok viewer"),
    });
  });

  connection.on(WebcastEvent.LIKE, (data) => {
    if (tiktokConnection !== connection) return;
    broadcastJson({
      type: "tiktok_like",
      username: safeUsername(data?.user?.displayId || data?.user?.uniqueId || data?.user?.nickname || data?.user?.userId, "TikTok viewer"),
      count: Number(data?.count ?? 0),
      total: Number(data?.total ?? 0),
    });
  });
  connection.on(WebcastEvent.FOLLOW, (data) => {
    if (tiktokConnection !== connection) return;
    broadcastJson({
      type: "tiktok_follow",
      username: safeUsername(
        data?.user?.displayId ||
        data?.user?.uniqueId ||
        data?.user?.nickname ||
        data?.user?.userId,
        "TikTok viewer"
      ),
    });
  });


  connection.on(WebcastEvent.ROOM_USER, (data) => {
    if (tiktokConnection !== connection) return;
    broadcastJson({ type: "tiktok_viewers", viewers: Number(data?.total ?? 0) });
  });

  connection.on(WebcastEvent.GIFT, (data) => {
    if (tiktokConnection !== connection) return;

    const isStreakGift = Number(data?.gift?.type ?? data?.giftDetails?.type ?? 0) === 1;
    const repeatEnded = Number(data?.repeatEnd ?? 0) === 1;
    if (isStreakGift && !repeatEnded) return;

    const giftName = repairMojibake(
      data?.gift?.name ||
      data?.giftDetails?.giftName ||
      data?.extendedGiftInfo?.name ||
      data?.giftName
    ) || "TikTok gift";

    broadcastJson({
      type: "tiktok_gift",
      username: safeUsername(
        data?.user?.displayId ||
        data?.user?.uniqueId ||
        data?.user?.nickname ||
        data?.user?.userId,
        "TikTok viewer"
      ),
      giftName,
      count: Math.max(1, Number(data?.repeatCount ?? 1)),
    });
  });

  connection.on(WebcastEvent.DISCONNECTED, () => {
    if (tiktokConnection !== connection) return;
    tiktokConnected = false;
    tiktokRoomId = "";
    broadcastJson({ type: "tiktok_status", connected: false, status: `Disconnected from @${username}'s TikTok LIVE.` });
  });

  connection.on(WebcastEvent.STREAM_END, () => {
    if (tiktokConnection !== connection) return;
    tiktokConnected = false;
    tiktokRoomId = "";
    broadcastJson({ type: "tiktok_status", connected: false, status: `@${username}'s TikTok LIVE has ended.` });
  });

  connection.on(WebcastEvent.ERROR, (error) => {
    if (tiktokConnection !== connection) return;
    broadcastJson({
      type: "tiktok_status",
      connected: false,
      status: error instanceof Error ? `TikTok error: ${repairMojibake(error.message)}` : "TikTok connection error.",
    });
  });

  tiktokConnectPromise = connection.connect();

  try {
    const state = await tiktokConnectPromise;
    if (tiktokConnection !== connection) {
      await connection.disconnect().catch(() => {});
      return;
    }

    tiktokConnected = true;
    tiktokRoomId = String(state?.roomId || connection.roomId || "");
    broadcastJson({
      type: "tiktok_status",
      connected: true,
      username,
      roomId: tiktokRoomId,
      status: `Listening to @${username}'s TikTok LIVE`,
    });
  } catch (error) {
    if (tiktokConnection === connection) {
      tiktokConnection = null;
      tiktokUsername = "";
      tiktokConnected = false;
      tiktokRoomId = "";
    }
    const details = error instanceof Error ? repairMojibake(error.message) : "Could not connect to TikTok.";
    console.error(`TikTok connection failed for @${username}:`, details);
    sendJson(socket, {
      type: "tiktok_status",
      connected: false,
      status: `Could not connect to @${username}. Make sure the account is currently LIVE.`,
      details,
    });
    try {
      await connection.disconnect();
    } catch {}
  } finally {
    if (tiktokConnectPromise) tiktokConnectPromise = null;
  }
}

websocketServer.on("connection", (socket) => {
  sendJson(socket, { type: "server_status", connected: true, status: "Connected to the DavaBridge server." });

  if (tiktokConnection && tiktokConnected) {
    sendJson(socket, {
      type: "tiktok_status",
      connected: true,
      username: tiktokUsername,
      roomId: tiktokRoomId,
      status: `Listening to @${tiktokUsername}'s TikTok LIVE`,
    });
  }

  if (facebookConnection.connected) {
    sendJson(socket, {
      type: "facebook_status",
      connected: true,
      live: Boolean(currentFacebookLiveId),
      status: currentFacebookLiveId ? "Listening for Facebook Live comments" : `Facebook connected as ${facebookConnection.userName || "Facebook user"}.`,
    });
    startFacebookPolling();
  }

  socket.on("message", async (rawMessage) => {
    try {
      const command = JSON.parse(rawMessage.toString());
      if (command.type === "connect_tiktok") return await connectTikTok(socket, command.username);
      if (command.type === "disconnect_tiktok") {
        await disconnectTikTok();
        broadcastJson({ type: "tiktok_status", connected: false, status: "TikTok disconnected." });
        return;
      }
      if (command.type === "send_tiktok_message") {
        return sendJson(socket, {
          type: "tiktok_send_status",
          sent: false,
          status: "Incoming TikTok chat is working. Sending replies requires Premium.",
        });
      }
      if (command.type === "refresh_facebook") {
        await pollFacebookComments();
        return sendJson(socket, { type: "facebook_status", connected: facebookConnection.connected, live: Boolean(currentFacebookLiveId), status: currentFacebookLiveId ? "Listening for Facebook Live comments" : "Facebook Live check completed." });
      }
      if (command.type === "ping") return sendJson(socket, { type: "pong", timestamp: Date.now() });
      sendJson(socket, { type: "server_error", message: "Unknown DavaBridge command." });
    } catch (error) {
      console.error("WebSocket message error:", error);
      sendJson(socket, { type: "server_error", message: "The DavaBridge server could not read that command." });
    }
  });

  socket.on("close", () => {
    console.log("DavaBridge browser disconnected; keeping the TikTok LIVE connection running.");
  });
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DavaBridge server is running on port ${PORT}`);
  if (facebookConnection.connected) startFacebookPolling();
});







