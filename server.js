import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
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

const TIKTOK_SESSION_ID = process.env.TIKTOK_SESSION_ID || "";
const TIKTOK_TARGET_IDC = process.env.TIKTOK_TARGET_IDC || "";

app.disable("x-powered-by");
app.use(express.json());

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    service: "StreamBridge",
    eulerApiKeyLoaded: Boolean(EULER_API_KEY),
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
  signApiKey: EULER_API_KEY,

  ...(TIKTOK_SESSION_ID && TIKTOK_TARGET_IDC
    ? {
        session: {
          cookie: {
            type: "cookie",
            value: {
              sessionId: TIKTOK_SESSION_ID,
              ttTargetIdc: TIKTOK_TARGET_IDC,
            },
          },
        },
        authenticateWs: true,
      }
    : {}),
};

const connection = new TikTokLiveConnection(username, options);

connection.on(WebcastEvent.MEMBER, (data) => {
  console.log("TikTok MEMBER event received:", data?.user?.uniqueId);
});

socket.tiktokConnection = connection;
socket.tiktokUsername = username;

connection.on(WebcastEvent.CHAT, (data) => {
  console.log("TikTok CHAT event received:", data);

  const messageText = String(data?.comment || data?.content || "").trim();

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
if (command.type === "send_tiktok") {
console.log("STREAMBRIDGE: send_tiktok command received", command.message);

  console.log("STREAMBRIDGE: send_tiktok command received", command.message);
const messageText = String(command.message || "").trim();
  const connection = socket.tiktokConnection;

  if (!messageText) {
    sendJson(socket, {
      type: "tiktok_send_status",
      sent: false,
      message: "Type a TikTok message first.",
    });
    return;
  }

  if (!connection || !connection.isConnected) {
    sendJson(socket, {
      type: "tiktok_send_status",
      sent: false,
      message: "Connect to TikTok before sending a message.",
    });
    return;
  }

  if (!TIKTOK_SESSION_ID || !TIKTOK_TARGET_IDC) {
    sendJson(socket, {
      type: "tiktok_send_status",
      sent: false,
      message: "TikTok sending credentials are not configured.",
    });
    return;
  }

  try {
    await connection.sendMessage(
      messageText,
      connection.roomId || undefined
    );

    console.log("TikTok message sent:", messageText);

    sendJson(socket, {
      type: "tiktok_send_status",
      sent: true,
      message: "TikTok message sent successfully.",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "TikTok rejected the message.";

    console.error("TikTok send error:", errorMessage);

    sendJson(socket, {
      type: "tiktok_send_status",
      sent: false,
      message: `TikTok message failed: ${errorMessage}`,
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

/*
 * React single-page application fallback.
 * API and WebSocket requests are handled before this point.
 */
app.use((request, response, next) => {
  if (request.path.startsWith("/api/")) {
    return next();
  }

  response.sendFile(path.join(DIST_FOLDER, "index.html"), (error) => {
    if (error) {
      next(error);
    }
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
