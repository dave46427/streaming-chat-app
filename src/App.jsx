import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { getSavedTwitchChannel, saveTwitchChannel } from "./twitchChannel";
import { YOUTUBE_CLIENT_ID, YOUTUBE_SCOPE, getYouTubeRedirectUri } from "./youtubeConfig";

const TWITCH_CLIENT_ID = "9u6sy8469pnk78b9x5od4qwzlpns50";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

const defaults = [
  { id: "youtube", name: "YouTube", server: "rtmps://a.rtmps.youtube.com/live2", key: "", enabled: true },
  { id: "twitch", name: "Twitch", server: "rtmp://live.twitch.tv/app", key: "", enabled: true },
  { id: "facebook", name: "Facebook", server: "rtmps://live-api-s.facebook.com:443/rtmp/", key: "", enabled: false },
  { id: "tiktok", name: "TikTok", server: "Paste the server URL from TikTok LIVE", key: "", enabled: false },
];

const liveButtonStyle = {
  border: 0,
  borderRadius: "10px",
  padding: "11px 16px",
  background: "#27304f",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

function LiveChatScreen({
  messages,
  onBack,
  messageText,
  setMessageText,
  onSend,
  canSend,
  twitchStatus,
  youtubeStatus,
  tiktokStatus,
  sendTarget,
  setSendTarget,
}) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main style={{ minHeight: "100vh", background: "#0b1020", color: "white", padding: 18, fontFamily: "Arial, sans-serif", boxSizing: "border-box" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={liveButtonStyle}>Back to Settings</button>
        <div style={{ fontWeight: 800, fontSize: "1.15rem" }}>STREAMBRIDGE LIVE</div>
        <div style={{ color: "#70f0a0", fontWeight: 700 }}>LIVE CHAT</div>
      </header>

      <section style={{ background: "#111831", border: "1px solid #27304f", borderRadius: 18, height: "calc(100vh - 110px)", minHeight: 430, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #27304f" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>Combined Chat</div>
          <div style={{ color: "#70f0a0", fontSize: ".85rem", marginTop: 4 }}>🟢 Twitch: {twitchStatus}</div>
          <div style={{ color: "#70f0a0", fontSize: ".85rem", marginTop: 2 }}>🟢 YouTube: {youtubeStatus}</div>
          <div style={{ color: "#70f0a0", fontSize: ".85rem", marginTop: 2 }}>🟢 TikTok: {tiktokStatus}</div>
          <div style={{ color: tiktokConnected ? "#70f0a0" : "#ffb347", fontSize: ".85rem", marginTop: 2 }}>TikTok Send: {tiktokConnected ? "Ready" : "Not connected"}</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {messages.length === 0 ? (
            <div style={{ color: "#aeb8d4", textAlign: "center", marginTop: 40 }}>Waiting for live messages...</div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg.id ?? index}
                style={{
                  padding: "12px 14px",
                  marginBottom: 10,
                  background: "#171f3c",
                  borderRadius: 12,
                  borderLeft: `4px solid ${msg.platform === "YouTube" ? "#ff0033" : "#9146ff"}`,
                }}
              >
                <div style={{ fontSize: ".8rem", color: "#aeb8d4", marginBottom: 4 }}>
                  {msg.platform ?? "Chat"} Ã‚Â· <strong style={{ color: "#fff" }}>{msg.username ?? "Viewer"}</strong>
                </div>
                <div style={{ fontSize: "1.05rem", overflowWrap: "anywhere" }}>{msg.text ?? ""}</div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={(event) => { event.preventDefault(); onSend(); }} style={{ display: "flex", gap: 10, padding: 14, borderTop: "1px solid #27304f", background: "#0e152b", flexWrap: "wrap" }}>
          <select value={sendTarget} onChange={(event) => setSendTarget(event.target.value)} style={{ padding: "10px", borderRadius: 10, background: "#151d36", color: "white" }}>
            <option value="twitch">Twitch</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="both">Twitch + YouTube</option>
            <option value="all">All Sendable Platforms</option>
          </select>
          <input
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="Type your message..."
            style={{ flex: "1 1 220px", padding: "12px 14px", borderRadius: 10, border: "1px solid #384261", background: "#151d36", color: "white", fontSize: "1rem" }}
          />
          <button type="submit" disabled={!canSend} style={{ ...liveButtonStyle, background: canSend ? "#7357ff" : "#4b5063", cursor: canSend ? "pointer" : "not-allowed" }}>{sendTarget === "youtube" ? "SEND TO YOUTUBE" : sendTarget === "twitch" ? "SEND TO TWITCH" : sendTarget === "tiktok" ? "SEND TO TIKTOK" : "SEND"}</button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [setupComplete, setSetupComplete] = useState(() => sessionStorage.getItem("streambridge_setup_complete") === "true");
  const [language, setLanguage] = useState("English");
  const [ageMode, setAgeMode] = useState("18+");

  const [twitchConnected, setTwitchConnected] = useState(false);
  const [twitchStatus, setTwitchStatus] = useState("Not connected");
  const [twitchUser, setTwitchUser] = useState(null);
  const [twitchChannel, setTwitchChannel] = useState(() => getSavedTwitchChannel());
  const [activeChannel, setActiveChannel] = useState(() => getSavedTwitchChannel());

  const [youtubeConnected, setYoutubeConnected] = useState(() => Boolean(sessionStorage.getItem("youtube_access_token")));
  const [youtubeStatus, setYoutubeStatus] = useState("Not connected");
  const [youtubeLiveChatId, setYoutubeLiveChatId] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState(
  () => localStorage.getItem("tiktok_username") || ""
);
const [tiktokConnected, setTiktokConnected] = useState(false);
const [tiktokStatus, setTiktokStatus] = useState("Not connected");

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sendTarget, setSendTarget] = useState("twitch");
  const [platforms, setPlatforms] = useState(defaults);
  const [live, setLive] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const tiktokSocketRef = useRef(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectUrlRef = useRef(null);
  const reconnectingSocketRef = useRef(null);
  const youtubePollTimerRef = useRef(null);
  const youtubeNextPageTokenRef = useRef("");
useEffect(() => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(
  window.location.hostname === "localhost"
    ? "ws://localhost:3000/ws"
    : `${protocol}//${window.location.host}/ws`
);

  tiktokSocketRef.current = socket;

  socket.onopen = () => {
    setTiktokStatus("Ready to connect");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);


    console.log("STREAMBRIDGE RECEIVED:", data);
      if (data.type === "tiktok_status") {
        setTiktokConnected(Boolean(data.connected));
        setTiktokStatus(data.status || "TikTok status updated");
      }

      if (data.type === "tiktok_send_status") {
        setTiktokStatus(data.status || (data.sent ? "TikTok message sent." : "TikTok message was not sent."));
      }

      if (data.type === "chat_message" && data.message) {
        setMessages((current) => {
          if (current.some((item) => item.id === data.message.id)) {
            return current;
          }

          return [...current, data.message].slice(-100);
        });
      }
    } catch {
      setTiktokStatus("Could not read the TikTok server message.");
    }
  };

  socket.onerror = () => {
    setTiktokConnected(false);
    setTiktokStatus("TikTok server connection error");
  };

  socket.onclose = () => {
    setTiktokConnected(false);
    setTiktokStatus("TikTok server disconnected");
  };

  return () => {
    socket.close();
    tiktokSocketRef.current = null;
  };
}, []);

  const connectTikTok = () => {
    const username = tiktokUsername.trim().replace(/^@/, "");

    if (!username) {
      setTiktokStatus("Enter a TikTok username first.");
      return;
    }

    if (!tiktokSocketRef.current || tiktokSocketRef.current.readyState !== WebSocket.OPEN) {
      setTiktokStatus("TikTok server is not ready. Try again in a moment.");
      return;
    }

    localStorage.setItem("tiktok_username", username);
    setTiktokUsername(username);
    setTiktokStatus(`Connecting to @${username}...`);
    tiktokSocketRef.current.send(JSON.stringify({
      type: "connect_tiktok",
      username,
    }));
  };

  const disconnectTikTok = () => {
    if (tiktokSocketRef.current?.readyState === WebSocket.OPEN) {
      tiktokSocketRef.current.send(JSON.stringify({ type: "disconnect_tiktok" }));
    }

    setTiktokConnected(false);
    setTiktokStatus("Not connected");
  };
  const connectTwitch = () => {

    sessionStorage.setItem("streambridge_setup_complete", "true");
    sessionStorage.removeItem("youtube_oauth_pending");
    const redirectUri = window.location.origin + "/";
    window.location.href =
      "https://id.twitch.tv/oauth2/authorize" +
      "?response_type=token" +
      `&client_id=${TWITCH_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      "&scope=user%3Aread%3Achat+user%3Awrite%3Achat&force_verify=true";
  };
  const connectYouTube = () => {
    sessionStorage.setItem("streambridge_setup_complete", "true");
    const state = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    sessionStorage.setItem("youtube_oauth_pending", "true");
    sessionStorage.setItem("youtube_oauth_state", state);

    const params = new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      redirect_uri: getYouTubeRedirectUri(),
      response_type: "token",
      scope: YOUTUBE_SCOPE,
      include_granted_scopes: "true",
      state,
      prompt: "consent",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const disconnectYouTube = () => {
    sessionStorage.removeItem("youtube_access_token");
    sessionStorage.removeItem("youtube_oauth_pending");
    sessionStorage.removeItem("youtube_oauth_state");
    setYoutubeConnected(false);
    setYoutubeLiveChatId("");
    setYoutubeStatus("Not connected");
    clearTimeout(youtubePollTimerRef.current);
  };

  const chooseChannel = () => {
    try {
      const saved = saveTwitchChannel(twitchChannel);
      setTwitchChannel(saved);
      setActiveChannel(saved);
      setMessages([]);
      setTwitchStatus(`Channel saved: ${saved}. Connecting...`);
    } catch (error) {
      setTwitchStatus(error.message);
    }
  };

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.substring(1));
    const token = hash.get("access_token");
    const error = hash.get("error");
    if (!token && !error) return;

    const youtubePending = sessionStorage.getItem("youtube_oauth_pending") === "true";
    if (youtubePending) {
      const expectedState = sessionStorage.getItem("youtube_oauth_state");
      const returnedState = hash.get("state");
      sessionStorage.removeItem("youtube_oauth_pending");
      sessionStorage.removeItem("youtube_oauth_state");

      if (error) {
        setYoutubeStatus(`YouTube connection failed: ${error}`);
      } else if (!expectedState || returnedState !== expectedState) {
        setYoutubeStatus("YouTube connection stopped because the security check failed.");
      } else {
        sessionStorage.setItem("youtube_access_token", token);
        sessionStorage.setItem("streambridge_setup_complete", "true");
        setSetupComplete(true);
        setYoutubeConnected(true);
        setYoutubeStatus("YouTube connected. Looking for an active live broadcast...");
      }
    } else if (token) {
      sessionStorage.setItem("twitch_access_token", token);
      sessionStorage.setItem("streambridge_setup_complete", "true");
      setSetupComplete(true);
    }

    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  useEffect(() => {
    const savedToken = sessionStorage.getItem("twitch_access_token");
    if (!savedToken) return;

    if (!activeChannel) {
      setTwitchConnected(true);
      setTwitchStatus("Twitch connected. Enter a channel name below.");
      return;
    }

    let cancelled = false;

    const startTwitchChat = async () => {
      try {
        setTwitchStatus("Checking Twitch login...");
        const validationResponse = await fetch("https://id.twitch.tv/oauth2/validate", {
          headers: { Authorization: `OAuth ${savedToken}` },
        });
        if (!validationResponse.ok) throw new Error("Twitch login expired. Click Connect Twitch again.");

        const user = await validationResponse.json();
        if (cancelled) return;

        const channelResponse = await fetch(
          `https://api.twitch.tv/helix/users?login=${encodeURIComponent(activeChannel)}`,
          { headers: { Authorization: `Bearer ${savedToken}`, "Client-Id": TWITCH_CLIENT_ID } }
        );
        if (!channelResponse.ok) throw new Error("Could not look up that Twitch channel.");

        const channelResult = await channelResponse.json();
        const broadcaster = channelResult.data?.[0];
        if (!broadcaster) throw new Error(`Twitch channel '${activeChannel}' was not found.`);

        setTwitchUser({ ...user, broadcaster_user_id: broadcaster.id });
        setTwitchConnected(true);
        setTwitchStatus(`Connected as ${user.login}. Opening ${broadcaster.login}'s chat...`);

        const openSocket = (url = "wss://eventsub.wss.twitch.tv/ws", isTwitchReconnect = false) => {
          const socket = new WebSocket(url);
          if (isTwitchReconnect) reconnectingSocketRef.current = socket;
          else socketRef.current = socket;

          socket.onmessage = async (messageEvent) => {
            try {
              const packet = JSON.parse(messageEvent.data);
              const messageType = packet.metadata?.message_type;

              if (messageType === "session_welcome") {
                const sessionId = packet.payload.session.id;
                if (isTwitchReconnect) {
                  const oldSocket = socketRef.current;
                  socketRef.current = socket;
                  reconnectingSocketRef.current = null;
                  reconnectUrlRef.current = null;
                  setTwitchConnected(true);
                  setTwitchStatus(`Listening to ${broadcaster.login}'s Twitch chat`);
                  if (oldSocket && oldSocket !== socket) {
                    oldSocket.onclose = null;
                    oldSocket.close();
                  }
                  return;
                }

                setTwitchStatus(`Subscribing to ${broadcaster.login}'s Twitch chat...`);
                const subscriptionResponse = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${savedToken}`,
                    "Client-Id": TWITCH_CLIENT_ID,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    type: "channel.chat.message",
                    version: "1",
                    condition: { broadcaster_user_id: broadcaster.id, user_id: user.user_id },
                    transport: { method: "websocket", session_id: sessionId },
                  }),
                });

                if (!subscriptionResponse.ok) {
                  const details = await subscriptionResponse.text();
                  throw new Error(`Twitch chat subscription failed: ${details}`);
                }

                setTwitchConnected(true);
                setTwitchStatus(`Listening to ${broadcaster.login}'s Twitch chat`);
              }

              if (messageType === "notification") {
                const event = packet.payload.event;
                const incomingId = packet.metadata.message_id;
                setMessages((current) => {
                  if (current.some((item) => item.id === incomingId)) return current;
                  return [...current, {
                    id: incomingId,
                    platform: "Twitch",
                    username: event.chatter_user_name || event.chatter_user_login,
                    text: event.message?.text || "",
                  }].slice(-100);
                });
              }

              if (messageType === "session_reconnect") {
                const reconnectUrl = packet.payload.session?.reconnect_url;
                if (reconnectUrl && !reconnectingSocketRef.current) {
                  reconnectUrlRef.current = reconnectUrl;
                  setTwitchStatus("Twitch is reconnecting automatically...");
                  openSocket(reconnectUrl, true);
                }
              }

              if (messageType === "revocation") {
                setTwitchConnected(false);
                setTwitchStatus("Twitch chat permission was revoked. Connect Twitch again.");
              }
            } catch (error) {
              setTwitchStatus(error.message || "Twitch chat connection error");
            }
          };

          socket.onerror = () => setTwitchStatus("Twitch chat connection error. Reconnecting...");
          socket.onclose = () => {
            if (cancelled) return;
            if (isTwitchReconnect) {
              reconnectingSocketRef.current = null;
              reconnectUrlRef.current = null;
            }
            if (socket !== socketRef.current && !isTwitchReconnect) return;
            setTwitchConnected(false);
            setTwitchStatus("Twitch chat disconnected. Reconnecting automatically...");
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => {
              if (!cancelled) openSocket();
            }, 2000);
          };
        };

        openSocket();
      } catch (error) {
        setTwitchStatus(error.message || "Could not connect to Twitch chat");
      }
    };

    startTwitchChat();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimerRef.current);
      reconnectUrlRef.current = null;
      if (reconnectingSocketRef.current) {
        reconnectingSocketRef.current.onclose = null;
        reconnectingSocketRef.current.close();
        reconnectingSocketRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [activeChannel]);

  useEffect(() => {
    const token = sessionStorage.getItem("youtube_access_token");
    if (!token) return;

    let cancelled = false;
    setYoutubeConnected(true);

    const apiFetch = async (path, options = {}) => {
      const response = await fetch(`${YOUTUBE_API}${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
      });
      if (response.status === 401) throw new Error("YouTube login expired. Connect YouTube again.");
      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || "YouTube request failed.");
      }
      return response.json();
    };

    const pollMessages = async (liveChatId) => {
      if (cancelled) return;
      try {
        const params = new URLSearchParams({
          part: "id,snippet,authorDetails",
          liveChatId,
          maxResults: "200",
        });
        if (youtubeNextPageTokenRef.current) params.set("pageToken", youtubeNextPageTokenRef.current);

        const data = await apiFetch(`/liveChat/messages?${params.toString()}`);
        youtubeNextPageTokenRef.current = data.nextPageToken || youtubeNextPageTokenRef.current;

        const incoming = (data.items || [])
          .filter((item) => item.snippet?.hasDisplayContent)
          .map((item) => ({
            id: `youtube-${item.id}`,
            platform: "YouTube",
            username: item.authorDetails?.displayName || "YouTube viewer",
            text: item.snippet?.displayMessage || "",
          }));

        if (incoming.length) {
          setMessages((current) => {
            const known = new Set(current.map((item) => item.id));
            return [...current, ...incoming.filter((item) => !known.has(item.id))].slice(-100);
          });
        }

        setYoutubeStatus("Listening to YouTube live chat");
        youtubePollTimerRef.current = setTimeout(() => pollMessages(liveChatId), Math.max(data.pollingIntervalMillis || 5000, 2000));
      } catch (error) {
        setYoutubeStatus(error.message || "YouTube chat connection error");
        if (!cancelled) youtubePollTimerRef.current = setTimeout(() => pollMessages(liveChatId), 10000);
      }
    };

    const startYouTubeChat = async () => {
      try {
        setYoutubeStatus("Looking for an active YouTube live broadcast...");
        const data = await apiFetch("/liveBroadcasts?part=snippet&broadcastStatus=active&broadcastType=all&maxResults=5");
        const broadcast = (data.items || []).find((item) => item.snippet?.liveChatId);
        const liveChatId = broadcast?.snippet?.liveChatId;
        if (!liveChatId) {
          setYoutubeLiveChatId("");
          setYoutubeStatus("Connected, but no active YouTube live chat was found. Start a YouTube live broadcast, then reconnect.");
          return;
        }

        setYoutubeLiveChatId(liveChatId);
        youtubeNextPageTokenRef.current = "";
        setYoutubeStatus(`Opening YouTube chat: ${broadcast.snippet?.title || "live broadcast"}`);
        pollMessages(liveChatId);
      } catch (error) {
        setYoutubeConnected(false);
        setYoutubeStatus(error.message || "Could not connect to YouTube chat");
      }
    };

    startYouTubeChat();
    return () => {
      cancelled = true;
      clearTimeout(youtubePollTimerRef.current);
    };
  }, [youtubeConnected]);

  const sendTwitchMessage = async (textOverride) => {
    const text = (textOverride ?? chatInput).trim();
    const token = sessionStorage.getItem("twitch_access_token");
    if (!text || !token || !twitchUser?.broadcaster_user_id) throw new Error("Twitch is not ready to send.");

    const response = await fetch("https://api.twitch.tv/helix/chat/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": TWITCH_CLIENT_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        broadcaster_id: twitchUser.broadcaster_user_id,
        sender_id: twitchUser.user_id,
        message: text,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.data?.[0]?.is_sent) {
      throw new Error(result.data?.[0]?.drop_reason?.message || "Twitch message was not sent");
    }
  };

  const sendYouTubeMessage = async (textOverride) => {
    const text = (textOverride ?? chatInput).trim();
    const token = sessionStorage.getItem("youtube_access_token");
    if (!text || !token || !youtubeLiveChatId) throw new Error("YouTube is not ready to send.");

    const response = await fetch(`${YOUTUBE_API}/liveChat/messages?part=snippet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          liveChatId: youtubeLiveChatId,
          type: "textMessageEvent",
          textMessageDetails: { messageText: text },
        },
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(details || "YouTube message was not sent");
    }
  };

  const sendTikTokMessage = async (textOverride) => {
    const text = (textOverride ?? chatInput).trim();
    const socket = tiktokSocketRef.current;
    if (!text) throw new Error("Enter a TikTok message first.");
    if (!tiktokConnected || !socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("TikTok is not ready to send.");
    }
    socket.send(JSON.stringify({ type: "send_tiktok_message", text }));
  };

  const sendSelectedMessage = async () => {
    const text = chatInput.trim();
    if (!text) return;
    try {
      if (sendTarget === "twitch") await sendTwitchMessage(text);
      if (sendTarget === "youtube") await sendYouTubeMessage(text);
      if (sendTarget === "tiktok") await sendTikTokMessage(text);
      if (sendTarget === "both") await Promise.all([sendTwitchMessage(text), sendYouTubeMessage(text)]);
      if (sendTarget === "all") {
        const sends = [];
        if (twitchConnected && activeChannel) sends.push(sendTwitchMessage(text));
        if (youtubeConnected && youtubeLiveChatId) sends.push(sendYouTubeMessage(text));
        if (tiktokConnected) sends.push(sendTikTokMessage(text));
        if (!sends.length) throw new Error("No chat platforms are ready to send.");
        await Promise.all(sends);
      }
      setChatInput("");
    } catch (error) {
      if (sendTarget === "youtube") setYoutubeStatus(`Send failed: ${error.message}`);
      else if (sendTarget === "tiktok" || sendTarget === "all") setTiktokStatus(`Send failed: ${error.message}`);
      else setTwitchStatus(`Send failed: ${error.message}`);
    }
  };

  const enabled = useMemo(() => platforms.filter((p) => p.enabled), [platforms]);
  const ready = enabled.length > 0 && enabled.every((p) => p.key.trim().length > 5);
  const update = (id, patch) => setPlatforms((items) => items.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const finishSetup = () => {
    sessionStorage.setItem("streambridge_setup_complete", "true");
    setSetupComplete(true);
  };

  const canSend = Boolean(chatInput.trim()) && (
    (sendTarget === "twitch" && twitchConnected && activeChannel) ||
    (sendTarget === "youtube" && youtubeConnected && youtubeLiveChatId) ||
    
    (sendTarget === "both" && twitchConnected && activeChannel && youtubeConnected && youtubeLiveChatId) ||
    (sendTarget === "all" && ((twitchConnected && activeChannel) || (youtubeConnected && youtubeLiveChatId)))
  );

  if (!setupComplete) {
    return (
      <main>
        <section className="hero">
          <h1>Welcome to Streambridge</h1>
          <p>Let's set up your stream.</p>
          <p>Language: <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option>English</option><option>Spanish</option><option>French</option>
            <option>German</option><option>Italian</option><option>Portuguese</option>
          </select></p>
          <p>Age mode: <select value={ageMode} onChange={(e) => setAgeMode(e.target.value)}>
            <option>18+</option><option>Under 18</option>
          </select></p>
          <p>Platforms:</p>
          <div className="grid">{platforms.map((p) => (
            <label className="card" key={p.id}>
              <input type="checkbox" checked={p.enabled} onChange={(e) => update(p.id, { enabled: e.target.checked })} /> {p.name}
            </label>
          ))}</div>
          <button className="go" disabled={enabled.length === 0} onClick={finishSetup}>Start setup</button>
        </section>
      </main>
    );
  }

  if (showLiveChat) {
    return (
      <LiveChatScreen
        messages={messages}
        onBack={() => setShowLiveChat(false)}
        messageText={chatInput}
        setMessageText={setChatInput}
        onSend={sendSelectedMessage}
        canSend={canSend}
        twitchStatus={twitchStatus}
        youtubeStatus={youtubeStatus}
        tiktokStatus={tiktokStatus}
        sendTarget={sendTarget}
        setSendTarget={setSendTarget}
      />
    );
  }

  return (
    <main>
      <header>
        <div><h1>Streambridge</h1><p>One input. Every audience.</p></div>
        <span className="badge">Ready To Stream</span>
      </header>

      <section className="hero">
        <p className="eyebrow">CLOUD MULTISTREAM CONTROL</p>
        <h2>Stream everywhere. Manage everything in one place.</h2>
        <p>This dashboard prepares your streaming destinations. A streaming relay backend is still required for real simultaneous broadcasting.</p>
        <button className={live ? "stop" : "go"} onClick={() => ready && setLive(!live)}>
          {live ? "Stop broadcast" : "Go live everywhere"}
        </button>
        {!ready && <small>Connect your platforms to enable streaming.</small>}
      </section>

      <div className="bar"><h2>Streaming destinations</h2></div>
      <section className="grid">{platforms.map((p) => (
        <article className="card" key={p.id}>
          <div className="row"><strong>{p.name}</strong>
            <input type="checkbox" checked={p.enabled} onChange={(e) => update(p.id, { enabled: e.target.checked })} />
          </div>
        </article>
      ))}</section>

      <section className="note">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <b>Combined Chat</b>
          <button type="button" className="go" onClick={() => setShowLiveChat(true)}>OPEN LIVE CHAT</button>
        </div>
        {ageMode === "Under 18" && <p><b>Young User Mode ON</b></p>}

        <div style={{ margin: "12px 0" }}>
          <label htmlFor="twitch-channel"><b>Twitch channel name</b></label>
          <div>
            <input id="twitch-channel" type="text" placeholder="Example: yourchannelname" value={twitchChannel}
              onChange={(e) => setTwitchChannel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && chooseChannel()} />
            <button type="button" onClick={chooseChannel}>Save channel</button>
          </div>
        </div>

        <p><b>Twitch:</b> {twitchStatus}</p>
        <p><b>YouTube:</b> {youtubeStatus}</p>
<div style={{ margin: "12px 0" }}>
  <label htmlFor="tiktok-username"><b>TikTok username</b></label>
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
    <input
      id="tiktok-username"
      type="text"
      placeholder="Example: yourusername"
      value={tiktokUsername}
      onChange={(e) => setTiktokUsername(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") connectTikTok();
      }}
    />

    <button type="button" onClick={connectTikTok}>
      {tiktokConnected ? "Reconnect TikTok" : "Connect TikTok"}
    </button>

    {tiktokConnected && (
      <button type="button" onClick={disconnectTikTok}>
        Disconnect TikTok
      </button>
    )}
  </div>
</div>

<p><b>TikTok:</b> {tiktokStatus}</p>


        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button type="button" onClick={connectTwitch}>{twitchConnected ? "Reconnect Twitch" : "Connect Twitch"}</button>
          <button type="button" onClick={connectYouTube}>{youtubeConnected ? "Reconnect YouTube" : "Connect YouTube"}</button>
          {youtubeConnected && <button type="button" onClick={disconnectYouTube}>Disconnect YouTube</button>}
        </div>

        <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 12 }}>
          {messages.length === 0 ? <p>No live messages yet.</p> : messages.map((message) => (
            <p key={message.id}><b>[{message.platform}] {message.username}:</b> {message.text}</p>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={sendTarget} onChange={(e) => setSendTarget(e.target.value)}>
            <option value="twitch">Twitch</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="both">Twitch + YouTube</option>
            <option value="all">All Sendable Platforms</option>
          </select>
          <input type="text" placeholder="Type your message..." value={chatInput}
            onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && canSend && sendSelectedMessage()} />
          <button type="button" onClick={sendSelectedMessage} disabled={!canSend}>{sendTarget === "youtube" ? "Send to YouTube" : sendTarget === "twitch" ? "Send to Twitch" : sendTarget === "tiktok" ? "Send to TikTok" : "Send"}</button>
        </div>
      </section>
    </main>
  );
}




