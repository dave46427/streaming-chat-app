import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import StartupScreen from "./StartupScreen";
import { getSavedTwitchChannel, saveTwitchChannel } from "./twitchChannel";
import { YOUTUBE_CLIENT_ID, YOUTUBE_SCOPE, getYouTubeRedirectUri } from "./youtubeConfig";

const TWITCH_CLIENT_ID = "9u6sy8469pnk78b9x5od4qwzlpns50";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

const expandEmojiWords = (value) => String(value || "")
  .replace(/\bfire\b/gi, "\u{1F525}")
  .replace(/\bheart\b/gi, "\u2764\uFE0F")
  .replace(/\blove\b/gi, "\u2764\uFE0F")
  .replace(/\b(?:lol|laugh)\b/gi, "\u{1F602}")
  .replace(/\bclap\b/gi, "\u{1F44F}")
  .replace(/\bthumbs up\b/gi, "\u{1F44D}")
  .replace(/\bstar\b/gi, "\u2B50")
  .replace(/\bparty\b/gi, "\u{1F389}")
  .replace(/\bmusic\b/gi, "\u{1F3B5}")
  .replace(/\bcool\b/gi, "\u{1F60E}");
const cleanChatText = (value) => String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, 500);

const defaults = [
  { id: "youtube", name: "YouTube", server: "rtmps://a.rtmps.youtube.com/live2", key: "", enabled: true },
  { id: "twitch", name: "Twitch", server: "rtmp://live.twitch.tv/app", key: "", enabled: true },
  { id: "facebook", name: "Facebook", server: "rtmps://live-api-s.facebook.com:443/rtmp/", key: "", enabled: false },
  { id: "tiktok", name: "TikTok", server: "Paste the server URL from TikTok LIVE", key: "", enabled: false },
];

const liveButtonStyle = {
  border: "1px solid rgba(255,255,255,.28)",
  borderBottom: "4px solid rgba(0,0,0,.62)",
  borderRadius: "12px",
  padding: "11px 16px",
  background: "linear-gradient(180deg, #48577f 0%, #27304f 58%, #1a2138 100%)",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "inset 0 2px 0 rgba(255,255,255,.28), inset 0 -2px 0 rgba(0,0,0,.28), 0 6px 0 #080c18, 0 10px 18px rgba(0,0,0,.48)",
  textShadow: "0 1px 2px rgba(0,0,0,.85)",
  transform: "translateY(0)",
  transition: "transform .12s ease, box-shadow .12s ease, filter .12s ease",
};

function LiveChatScreen({ messages, onBack, messageText, setMessageText, onSend, canSend, twitchStatus, youtubeStatus, tiktokStatus, sendTarget, tiktokConnected, setSendTarget, accentColor, theme, largeText, highContrast, announceMessages, chatBackground, onChatBackgroundChange, twitchMessageColor, youtubeMessageColor, tiktokMessageColor, messageBackgroundColor, messageTextColor }) {
  const chatEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const lastAnnouncedMessageRef = useRef(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const latest = messages[messages.length - 1];
    if (!announceMessages || !latest || latest.id === lastAnnouncedMessageRef.current || !("speechSynthesis" in window)) return;
    lastAnnouncedMessageRef.current = latest.id;
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${latest.platform || "Chat"}. ${latest.username || "Viewer"} says: ${latest.text || ""}`));
  }, [messages, announceMessages]);
  useEffect(() => {
    const handleShortcut = (event) => {
      if (event.altKey && event.key.toLowerCase() === "l") { event.preventDefault(); messageInputRef.current?.focus(); }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  return (
    <main style={{ minHeight: "100vh", background: highContrast ? "#000" : (theme === "light" ? "#eef2ff" : "#0b1020"), color: highContrast ? "#fff" : (theme === "light" ? "#111827" : "white"), padding: 18, fontSize: largeText ? "125%" : "100%", fontFamily: "Arial, sans-serif", boxSizing: "border-box" }}>
      <a href="#chat-messages" style={{ position: "absolute", left: 8, top: 8, padding: 8, background: "#fff", color: "#000", transform: "translateY(-150%)" }} onFocus={(e) => { e.currentTarget.style.transform = "translateY(0)"; }} onBlur={(e) => { e.currentTarget.style.transform = "translateY(-150%)"; }}>Skip to chat messages</a>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={liveButtonStyle}>Back to Settings</button>
        <div style={{ fontWeight: 800, fontSize: "1.15rem" }}>STREAMBRIDGE LIVE</div>
        <div style={{ color: "#70f0a0", fontWeight: 700 }}>LIVE CHAT</div><label style={{ ...liveButtonStyle, background: accentColor, display: "inline-block" }}>Add chat background<input aria-label="Add a background image to Live Chat" type="file" accept="image/png,image/jpeg,image/webp" onChange={onChatBackgroundChange} style={{ display: "none" }} /></label>
      </header>
      <section style={{ background: "linear-gradient(145deg, #182244 0%, #111831 48%, #090e1d 100%)", border: "3px solid #344264", borderTopColor: "#7182ad", borderLeftColor: "#56698f", borderRightColor: "#11172a", borderBottomColor: "#080c16", borderRadius: 20, height: "calc(100vh - 118px)", minHeight: 430, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "inset 0 2px 0 rgba(255,255,255,.14), inset 0 -8px 18px rgba(0,0,0,.35), 0 12px 0 #050811, 0 22px 38px rgba(0,0,0,.62)" }}>
        <div role="status" aria-live="polite" aria-atomic="true" style={{ padding: "16px 18px", borderBottom: "3px solid #080c18", background: "linear-gradient(180deg, #263354 0%, #151e39 100%)", boxShadow: "inset 0 2px 0 rgba(255,255,255,.14), 0 5px 12px rgba(0,0,0,.46)", position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>Combined Chat</div>
          <div style={{ color: "#70f0a0", fontSize: ".85rem", marginTop: 4 }}>{"\u{1F7E2}"} Twitch: {twitchStatus}</div>
          <div style={{ color: "#70f0a0", fontSize: ".85rem", marginTop: 2 }}>{"\u{1F7E2}"} YouTube: {youtubeStatus}</div>
          <div style={{ color: "#70f0a0", fontSize: ".85rem", marginTop: 2 }}>{"\u{1F7E2}"} TikTok: {tiktokStatus}</div>
         
        </div>
        <div id="chat-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Combined live chat messages" tabIndex="0" style={{ flex: 1, overflowY: "auto", padding: 16, background: chatBackground ? `linear-gradient(rgba(11,16,32,.55), rgba(11,16,32,.55)), url(${chatBackground}) center / cover no-repeat` : "#111831" }}>
          {messages.length === 0 ? <div style={{ color: "#aeb8d4", textAlign: "center", marginTop: 40 }}>Waiting for live messages...</div> : messages.map((msg, index) => (
            <div key={msg.id ?? index} style={{ padding: "12px 14px", marginBottom: 10, background: messageBackgroundColor, color: messageTextColor, borderRadius: 12, borderLeft: `4px solid ${msg.platform === "YouTube" ? youtubeMessageColor : msg.platform === "TikTok" ? tiktokMessageColor : twitchMessageColor}` }}>
              <div style={{ fontSize: ".8rem", color: "#aeb8d4", marginBottom: 4 }}>{msg.platform ?? "Chat"} {"\u2022"} <strong style={{ color: messageTextColor }}>{msg.username ?? "Viewer"}</strong></div>
              <div style={{ fontSize: "1.05rem", overflowWrap: "anywhere" }}>{msg.text ?? ""}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={(event) => { event.preventDefault(); onSend(); }} style={{ display: "flex", gap: 12, padding: 16, borderTop: "3px solid #394968", background: "linear-gradient(180deg, #202b49 0%, #0d1428 72%, #080c18 100%)", flexWrap: "wrap", boxShadow: "inset 0 3px 0 rgba(255,255,255,.12), inset 0 -5px 12px rgba(0,0,0,.48), 0 -8px 18px rgba(0,0,0,.38)", position: "relative", zIndex: 2 }}>
          <label htmlFor="send-target" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Send message to</label><select id="send-target" aria-label="Send message to platform" value={sendTarget} onChange={(event) => setSendTarget(event.target.value)} style={{ padding: "11px 13px", borderRadius: 11, border: "2px solid #080c18", borderTopColor: "#080b15", borderLeftColor: "#080b15", borderRightColor: "#536181", borderBottomColor: "#536181", background: "linear-gradient(180deg, #10172b 0%, #1d2947 100%)", color: "white", fontWeight: 700, boxShadow: "inset 0 4px 8px rgba(0,0,0,.72), 0 2px 0 rgba(255,255,255,.12)" }}>
            <option value="twitch">Twitch</option><option value="youtube">YouTube</option><option value="tiktok">TikTok</option><option value="both">Twitch + YouTube</option><option value="all">All Sendable Platforms</option>
          </select>
          <label htmlFor="live-chat-message" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Live chat message</label><input ref={messageInputRef} id="live-chat-message" aria-label="Live chat message. Press Alt plus L to focus this box" maxLength={500} value={messageText} onChange={(event) => setMessageText(expandEmojiWords(cleanChatText(event.target.value)))} placeholder="Start typing... (try: fire)" style={{ flex: "1 1 220px", padding: "12px 14px", borderRadius: 11, border: "2px solid #080c18", borderTopColor: "#070a13", borderLeftColor: "#070a13", borderRightColor: "#526181", borderBottomColor: "#526181", background: "linear-gradient(180deg, #0b1122 0%, #182440 100%)", color: "white", fontSize: "1rem", boxShadow: "inset 0 5px 10px rgba(0,0,0,.78), inset 0 -1px 0 rgba(255,255,255,.1), 0 2px 0 rgba(255,255,255,.1)", outline: "none" }} />
          <button type="submit" disabled={!canSend} style={{ ...liveButtonStyle, background: canSend ? accentColor : "#4b5063", cursor: canSend ? "pointer" : "not-allowed" }}>{sendTarget === "youtube" ? "SEND TO YOUTUBE" : sendTarget === "twitch" ? "SEND TO TWITCH" : sendTarget === "tiktok" ? "SEND TO TIKTOK" : "SEND"}</button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [startupFinished, setStartupFinished] = useState(() => sessionStorage.getItem("streambridge_setup_complete") === "true" || window.location.hash.includes("access_token="));

  const [ageVerified, setAgeVerified] = useState(() => localStorage.getItem("streambridge_age_verified") === "true");
  const [ageAgreementChecked, setAgeAgreementChecked] = useState(false);
  const [safetyPage, setSafetyPage] = useState("");
  const [entryStarted, setEntryStarted] = useState(() => sessionStorage.getItem("streambridge_setup_complete") === "true" || window.location.hash.includes("access_token="));
  const [appBackground, setAppBackground] = useState(() => localStorage.getItem("streambridge_app_background") || "");
  const [setupComplete, setSetupComplete] = useState(() => sessionStorage.getItem("streambridge_setup_complete") === "true");
  const detectLanguage = () => navigator.languages?.[0] || navigator.language || document.documentElement.lang || "en-GB";
  const [language, setLanguage] = useState(detectLanguage);
  useEffect(() => {
    const refreshLanguage = () => setLanguage(detectLanguage());
    window.addEventListener("languagechange", refreshLanguage);
    window.addEventListener("focus", refreshLanguage);
    document.addEventListener("visibilitychange", refreshLanguage);
    const timer = window.setInterval(refreshLanguage, 2000);
    return () => {
      window.removeEventListener("languagechange", refreshLanguage);
      window.removeEventListener("focus", refreshLanguage);
      document.removeEventListener("visibilitychange", refreshLanguage);
      window.clearInterval(timer);
    };
  }, []);
  const [theme, setTheme] = useState(() => localStorage.getItem("streambridge_theme") || "dark"); const themeBackgrounds = { dark: "#0b1020", purple: "#210b35", blue: "#071d3d", fire: "#351009", green: "#06261a", light: "#eef2ff" }; const themeBackground = themeBackgrounds[theme] || themeBackgrounds.dark;
  const themeAccents = { dark: "#7357ff", purple: "#a855f7", blue: "#2563eb", fire: "#f97316", green: "#22c55e", light: "#6366f1" }; const [accentColor, setAccentColor] = useState(() => localStorage.getItem("streambridge_accent") || themeAccents[localStorage.getItem("streambridge_theme") || "dark"]); const changeTheme = (value) => { setTheme(value); const colour = themeAccents[value] || "#7357ff"; setAccentColor(colour); localStorage.setItem("streambridge_theme", value); localStorage.setItem("streambridge_accent", colour); };
  const lightenHex = (hex, amount = 34) => { const value = String(hex || "#7357ff").replace("#", ""); if (!/^[0-9a-f]{6}$/i.test(value)) return "#8b73ff"; const n = parseInt(value, 16); const mix = (v) => Math.min(255, v + amount); return `#${[mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("")}`; };
  const lighterAccent = lightenHex(accentColor, 38);
  const themedButtonStyle = {
    background: `linear-gradient(180deg, ${lighterAccent} 0%, ${lighterAccent} 12%, ${accentColor} 52%, ${accentColor} 78%, ${lighterAccent} 145%)`,
    color: "white",
    border: `1px solid ${lighterAccent}`,
    borderRadius: "12px",
    padding: "11px 18px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: `0 6px 0 ${accentColor}, 0 10px 20px rgba(0,0,0,.32), 0 0 18px ${accentColor}55, inset 0 2px 2px rgba(255,255,255,.35), inset 0 -3px 5px rgba(0,0,0,.20)`,
    textShadow: "0 1px 2px rgba(0,0,0,.35)",
    transition: "transform .15s ease, box-shadow .15s ease, filter .15s ease",
    WebkitTapHighlightColor: "transparent",
  };
  const [largeText, setLargeText] = useState(() => localStorage.getItem("streambridge_large_text") === "true");
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("streambridge_high_contrast") === "true");
  const themedPageBackground = highContrast ? "#000" : `radial-gradient(circle at 50% 5%, ${lighterAccent}55 0%, ${accentColor}33 30%, ${themeBackground} 72%)`;
  const [announceMessages, setAnnounceMessages] = useState(() => localStorage.getItem("streambridge_announce_messages") === "true");
  const [chatBackground, setChatBackground] = useState(() => localStorage.getItem("streambridge_chat_background") || "");
  const [twitchMessageColor, setTwitchMessageColor] = useState(() => localStorage.getItem("streambridge_twitch_message_color") || "#9146ff");
  const [youtubeMessageColor, setYoutubeMessageColor] = useState(() => localStorage.getItem("streambridge_youtube_message_color") || "#ff0033");
  const [tiktokMessageColor, setTiktokMessageColor] = useState(() => localStorage.getItem("streambridge_tiktok_message_color") || "#25f4ee");
  const [messageBackgroundColor, setMessageBackgroundColor] = useState(() => localStorage.getItem("streambridge_message_background_color") || "#171f3c");
  const [messageTextColor, setMessageTextColor] = useState(() => localStorage.getItem("streambridge_message_text_color") || "#ffffff");
  const onChatBackgroundChange = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) { alert("Choose a PNG, JPG or WebP background under 4 MB."); event.target.value = ""; return; } const reader = new FileReader(); reader.onload = () => { const value = String(reader.result || ""); setChatBackground(value); try { localStorage.setItem("streambridge_chat_background", value); } catch { alert("Background is too large to save. Try a smaller image."); } }; reader.readAsDataURL(file); event.target.value = ""; };
  const onAppBackgroundChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) {
      alert("Choose a PNG, JPG or WebP app background under 4 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setAppBackground(value);
      try {
        localStorage.setItem("streambridge_app_background", value);
      } catch {
        alert("The app background is too large to save. Try a smaller image.");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  const clearAppBackground = () => {
    setAppBackground("");
    localStorage.removeItem("streambridge_app_background");
  };

  const [twitchConnected, setTwitchConnected] = useState(false); const [twitchStatus, setTwitchStatus] = useState("Not connected"); const [twitchUser, setTwitchUser] = useState(null);
  const [twitchChannel, setTwitchChannel] = useState(() => getSavedTwitchChannel()); const [activeChannel, setActiveChannel] = useState(() => getSavedTwitchChannel());
  const [youtubeConnected, setYoutubeConnected] = useState(() => Boolean(sessionStorage.getItem("youtube_access_token"))); const [youtubeStatus, setYoutubeStatus] = useState("Not connected"); const [youtubeLiveChatId, setYoutubeLiveChatId] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState(() => localStorage.getItem("tiktok_username") || ""); const [tiktokConnected, setTiktokConnected] = useState(false); const [tiktokStatus, setTiktokStatus] = useState("Not connected");
  const [messages, setMessages] = useState([]); const [chatInput, setChatInput] = useState(""); const [sendTarget, setSendTarget] = useState("twitch"); const [platforms, setPlatforms] = useState(defaults); const [live, setLive] = useState(false); const [showLiveChat, setShowLiveChat] = useState(() => window.location.hash.includes("access_token="));
  const tiktokSocketRef = useRef(null); const socketRef = useRef(null); const reconnectTimerRef = useRef(null); const reconnectUrlRef = useRef(null); const reconnectingSocketRef = useRef(null); const youtubePollTimerRef = useRef(null); const youtubeNextPageTokenRef = useRef("");
  const recentTikTokMessagesRef = useRef(new Map());
  const tiktokReconnectTimerRef = useRef(null);
  const tiktokManualDisconnectRef = useRef(false);

  useEffect(() => {
    let stopped = false;
    const openTikTokSocket = () => {
      if (stopped) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(window.location.hostname === "localhost" ? "ws://localhost:3000/ws" : `${protocol}//${window.location.host}/ws`);
      tiktokSocketRef.current = socket;
      socket.onopen = () => {
        setTiktokStatus("Ready to connect");
        const username = localStorage.getItem("tiktok_username");
        if (username && !tiktokManualDisconnectRef.current) {
          setTiktokStatus(`Auto-reconnecting to @${username}...`);
          socket.send(JSON.stringify({ type: "connect_tiktok", username }));
        }
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "tiktok_status") { setTiktokConnected(Boolean(data.connected)); setTiktokStatus(data.status || "TikTok status updated"); }
          if (data.type === "tiktok_send_status") setTiktokStatus(data.sent ? "TikTok message sent." : (String(data.status || "").includes("Premium") ? "Incoming TikTok chat is working. Sending replies requires Premium." : data.status || "TikTok message was not sent."));
          if (data.type === "chat_message" && data.message) {
            const msg = { ...data.message, username: cleanChatText(data.message.username).slice(0, 80), text: cleanChatText(data.message.text) };
            const fingerprint = `${msg.platform}|${msg.username}`.toLowerCase() + `|${msg.text}`.toLowerCase();
            const now = Date.now();
            const seen = recentTikTokMessagesRef.current.get(fingerprint);
            for (const [key, time] of recentTikTokMessagesRef.current) if (now - time > 15000) recentTikTokMessagesRef.current.delete(key);
            if (msg.platform === "TikTok" && seen && now - seen < 5000) return;
            recentTikTokMessagesRef.current.set(fingerprint, now);
            setMessages((current) => msg.id && current.some((item) => item.id === msg.id) ? current : [...current, msg].slice(-100));
          }
        } catch { setTiktokStatus("Could not read the TikTok server message."); }
      };
      socket.onerror = () => { setTiktokConnected(false); setTiktokStatus("TikTok server connection error"); };
      socket.onclose = () => {
        setTiktokConnected(false);
        if (!stopped && !tiktokManualDisconnectRef.current) {
          setTiktokStatus("TikTok disconnected. Auto-reconnecting...");
          clearTimeout(tiktokReconnectTimerRef.current);
          tiktokReconnectTimerRef.current = setTimeout(openTikTokSocket, 3000);
        }
      };
    };
    openTikTokSocket();
    return () => { stopped = true; clearTimeout(tiktokReconnectTimerRef.current); if (tiktokSocketRef.current) { tiktokSocketRef.current.onclose = null; tiktokSocketRef.current.close(); } };
  }, []);

  const connectTikTok = () => { tiktokManualDisconnectRef.current = false; const username = tiktokUsername.trim().replace(/^@/, ""); if (!username) return setTiktokStatus("Enter a TikTok username first."); if (!tiktokSocketRef.current || tiktokSocketRef.current.readyState !== WebSocket.OPEN) return setTiktokStatus("TikTok server is not ready. Try again in a moment."); localStorage.setItem("tiktok_username", username); setTiktokUsername(username); setTiktokStatus(`Connecting to @${username}...`); tiktokSocketRef.current.send(JSON.stringify({ type: "connect_tiktok", username })); };
  const disconnectTikTok = () => { tiktokManualDisconnectRef.current = true; clearTimeout(tiktokReconnectTimerRef.current); if (tiktokSocketRef.current?.readyState === WebSocket.OPEN) tiktokSocketRef.current.send(JSON.stringify({ type: "disconnect_tiktok" })); setTiktokConnected(false); setTiktokStatus("Not connected"); };
  const connectTwitch = () => { sessionStorage.setItem("streambridge_setup_complete", "true"); sessionStorage.removeItem("youtube_oauth_pending"); const redirectUri = window.location.origin + "/"; window.location.href = "https://id.twitch.tv/oauth2/authorize" + "?response_type=token" + `&client_id=${TWITCH_CLIENT_ID}` + `&redirect_uri=${encodeURIComponent(redirectUri)}` + "&scope=user%3Aread%3Achat+user%3Awrite%3Achat&force_verify=true"; };
  const connectYouTube = () => { sessionStorage.setItem("streambridge_setup_complete", "true"); const state = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; sessionStorage.setItem("youtube_oauth_pending", "true"); sessionStorage.setItem("youtube_oauth_state", state); const params = new URLSearchParams({ client_id: YOUTUBE_CLIENT_ID, redirect_uri: getYouTubeRedirectUri(), response_type: "token", scope: YOUTUBE_SCOPE, include_granted_scopes: "true", state, prompt: "consent" }); window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`; };
  const disconnectYouTube = () => { sessionStorage.removeItem("youtube_access_token"); sessionStorage.removeItem("youtube_oauth_pending"); sessionStorage.removeItem("youtube_oauth_state"); setYoutubeConnected(false); setYoutubeLiveChatId(""); setYoutubeStatus("Not connected"); clearTimeout(youtubePollTimerRef.current); };
  const chooseChannel = () => { try { const saved = saveTwitchChannel(twitchChannel); setTwitchChannel(saved); setActiveChannel(saved); setMessages([]); setTwitchStatus(`Channel saved: ${saved}. Connecting...`); } catch (error) { setTwitchStatus(error.message); } };

  useEffect(() => { const hash = new URLSearchParams(window.location.hash.substring(1)); const token = hash.get("access_token"); const error = hash.get("error"); if (!token && !error) return; const youtubePending = sessionStorage.getItem("youtube_oauth_pending") === "true"; if (youtubePending) { const expectedState = sessionStorage.getItem("youtube_oauth_state"); const returnedState = hash.get("state"); sessionStorage.removeItem("youtube_oauth_pending"); sessionStorage.removeItem("youtube_oauth_state"); if (error) setYoutubeStatus(`YouTube connection failed: ${error}`); else if (!expectedState || returnedState !== expectedState) setYoutubeStatus("YouTube connection stopped because the security check failed."); else { sessionStorage.setItem("youtube_access_token", token); sessionStorage.setItem("streambridge_setup_complete", "true"); setSetupComplete(true); setYoutubeConnected(true); setYoutubeStatus("YouTube connected. Looking for an active live broadcast..."); } } else if (token) { sessionStorage.setItem("twitch_access_token", token); sessionStorage.setItem("streambridge_setup_complete", "true"); setSetupComplete(true); } window.history.replaceState({}, document.title, window.location.pathname); }, []);

  useEffect(() => {
    const savedToken = sessionStorage.getItem("twitch_access_token");
    if (!savedToken) return;
    if (!activeChannel) {
      setTwitchConnected(false);
      setTwitchStatus("Twitch connected. Enter a channel name below.");
      return;
    }

    let cancelled = false;
    let reconnectAttempts = 0;
    let activeSocket = null;

    const closeSocket = () => {
      if (!activeSocket) return;
      activeSocket.onclose = null;
      activeSocket.close();
      activeSocket = null;
      socketRef.current = null;
    };

    const scheduleReconnect = (openSocket) => {
      if (cancelled) return;
      reconnectAttempts += 1;
      const delay = Math.min(10000, 1500 * reconnectAttempts);
      setTwitchConnected(false);
      setTwitchStatus("Twitch chat disconnected. Reconnecting automatically...");
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        if (!cancelled) openSocket("wss://eventsub.wss.twitch.tv/ws", true);
      }, delay);
    };

    const startTwitchChat = async () => {
      try {
        setTwitchConnected(false);
        setTwitchStatus("Checking Twitch login...");

        const validationResponse = await fetch("https://id.twitch.tv/oauth2/validate", {
          headers: { Authorization: `OAuth ${savedToken}` },
        });
        if (!validationResponse.ok) {
          throw new Error("Twitch login expired. Click Reconnect Twitch.");
        }

        const user = await validationResponse.json();
        const scopes = Array.isArray(user.scopes) ? user.scopes : [];
        if (!scopes.includes("user:read:chat")) {
          throw new Error("Twitch receive permission is missing. Click Reconnect Twitch and approve chat access.");
        }
        if (cancelled) return;

        const channelResponse = await fetch(
          `https://api.twitch.tv/helix/users?login=${encodeURIComponent(activeChannel)}`,
          {
            headers: {
              Authorization: `Bearer ${savedToken}`,
              "Client-Id": TWITCH_CLIENT_ID,
            },
          }
        );
        if (!channelResponse.ok) throw new Error("Could not look up that Twitch channel.");

        const channelResult = await channelResponse.json();
        const broadcaster = channelResult.data?.[0];
        if (!broadcaster) throw new Error(`Twitch channel '${activeChannel}' was not found.`);
        if (cancelled) return;

        setTwitchUser({ ...user, broadcaster_user_id: broadcaster.id });

        const openSocket = (url, shouldSubscribe) => {
          if (cancelled) return;
          setTwitchConnected(false);
          setTwitchStatus(shouldSubscribe
            ? `Opening ${broadcaster.login}'s Twitch chat...`
            : "Twitch requested a secure reconnect...");

          const socket = new WebSocket(url);
          activeSocket = socket;
          socketRef.current = socket;

          socket.onopen = () => {
            reconnectAttempts = 0;
            setTwitchStatus(shouldSubscribe
              ? "Twitch socket open. Waiting for session..."
              : "Twitch reconnect socket open. Waiting for confirmation...");
          };

          socket.onmessage = async (messageEvent) => {
            try {
              const packet = JSON.parse(messageEvent.data);
              const messageType = packet.metadata?.message_type;

              if (messageType === "session_welcome") {
                if (!shouldSubscribe) {
                  setTwitchConnected(true);
                  setTwitchStatus(`Listening to ${broadcaster.login}'s Twitch chat`);
                  return;
                }

                const sessionId = packet.payload?.session?.id;
                if (!sessionId) throw new Error("Twitch did not provide a session ID.");

                setTwitchStatus(`Subscribing to ${broadcaster.login}'s incoming chat...`);
                const subscriptionResponse = await fetch(
                  "https://api.twitch.tv/helix/eventsub/subscriptions",
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${savedToken}`,
                      "Client-Id": TWITCH_CLIENT_ID,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      type: "channel.chat.message",
                      version: "1",
                      condition: {
                        broadcaster_user_id: broadcaster.id,
                        user_id: user.user_id,
                      },
                      transport: {
                        method: "websocket",
                        session_id: sessionId,
                      },
                    }),
                  }
                );

                const responseText = await subscriptionResponse.text();
                let responseData = null;
                try {
                  responseData = responseText ? JSON.parse(responseText) : null;
                } catch {
                  responseData = null;
                }

                if (!subscriptionResponse.ok) {
                  const detail = responseData?.message || responseText || `HTTP ${subscriptionResponse.status}`;
                  throw new Error(`Twitch receive subscription failed: ${detail}`);
                }

                const subscriptionStatus = responseData?.data?.[0]?.status;
                if (subscriptionStatus && subscriptionStatus !== "enabled") {
                  throw new Error(`Twitch subscription status: ${subscriptionStatus}`);
                }

                setTwitchConnected(true);
                setTwitchStatus(`Listening to ${broadcaster.login}'s Twitch chat`);
                return;
              }

              if (messageType === "notification") {
                const event = packet.payload?.event;
                if (!event) return;
                const text = cleanChatText(event.message?.text || "");
                if (!text) return;
                const incomingId = packet.metadata?.message_id || `twitch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                setMessages((current) => current.some((item) => item.id === incomingId)
                  ? current
                  : [...current, {
                      id: incomingId,
                      platform: "Twitch",
                      username: cleanChatText(event.chatter_user_name || event.chatter_user_login || "Twitch viewer").slice(0, 80),
                      text,
                    }].slice(-100));
                return;
              }

              if (messageType === "session_reconnect") {
                const reconnectUrl = packet.payload?.session?.reconnect_url;
                if (!reconnectUrl) throw new Error("Twitch reconnect URL was missing.");
                const oldSocket = activeSocket;
                openSocket(reconnectUrl, false);
                if (oldSocket && oldSocket !== activeSocket) {
                  oldSocket.onclose = null;
                  oldSocket.close();
                }
                return;
              }

              if (messageType === "revocation") {
                const reason = packet.payload?.subscription?.status || "unknown reason";
                setTwitchConnected(false);
                setTwitchStatus(`Twitch receive permission was revoked: ${reason}`);
              }
            } catch (error) {
              setTwitchConnected(false);
              setTwitchStatus(error.message || "Twitch chat connection error");
            }
          };

          socket.onerror = () => {
            setTwitchConnected(false);
            setTwitchStatus("Twitch chat socket error.");
          };

          socket.onclose = () => {
            if (cancelled || socket !== activeSocket) return;
            scheduleReconnect(openSocket);
          };
        };

        openSocket("wss://eventsub.wss.twitch.tv/ws", true);
      } catch (error) {
        setTwitchConnected(false);
        setTwitchStatus(error.message || "Could not connect to Twitch chat");
      }
    };

    startTwitchChat();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimerRef.current);
      closeSocket();
    };
  }, [activeChannel]);
  useEffect(() => { const token = sessionStorage.getItem("youtube_access_token"); if (!token) return; let cancelled = false; setYoutubeConnected(true); const apiFetch = async (path, options = {}) => { const response = await fetch(`${YOUTUBE_API}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } }); if (response.status === 401) throw new Error("YouTube login expired. Connect YouTube again."); if (!response.ok) { const details = await response.text(); throw new Error(details || "YouTube request failed."); } return response.json(); }; const pollMessages = async (liveChatId) => { if (cancelled) return; try { const params = new URLSearchParams({ part: "id,snippet,authorDetails", liveChatId, maxResults: "200" }); if (youtubeNextPageTokenRef.current) params.set("pageToken", youtubeNextPageTokenRef.current); const data = await apiFetch(`/liveChat/messages?${params.toString()}`); youtubeNextPageTokenRef.current = data.nextPageToken || youtubeNextPageTokenRef.current; const incoming = (data.items || []).filter((item) => item.snippet?.hasDisplayContent).map((item) => ({ id: `youtube-${item.id}`, platform: "YouTube", username: item.authorDetails?.displayName || "YouTube viewer", text: item.snippet?.displayMessage || "" })); if (incoming.length) setMessages((current) => { const known = new Set(current.map((item) => item.id)); return [...current, ...incoming.filter((item) => !known.has(item.id))].slice(-100); }); setYoutubeStatus("Listening to YouTube live chat"); youtubePollTimerRef.current = setTimeout(() => pollMessages(liveChatId), Math.max(data.pollingIntervalMillis || 5000, 2000)); } catch (error) { setYoutubeStatus(error.message || "YouTube chat connection error"); if (!cancelled) youtubePollTimerRef.current = setTimeout(() => pollMessages(liveChatId), 10000); } }; const startYouTubeChat = async () => { try { setYoutubeStatus("Looking for an active YouTube live broadcast..."); const data = await apiFetch("/liveBroadcasts?part=snippet&broadcastStatus=active&broadcastType=all&maxResults=5"); const broadcast = (data.items || []).find((item) => item.snippet?.liveChatId); const liveChatId = broadcast?.snippet?.liveChatId; if (!liveChatId) { setYoutubeLiveChatId(""); setYoutubeStatus("Connected, but no active YouTube live chat was found. Start a YouTube live broadcast, then reconnect."); return; } setYoutubeLiveChatId(liveChatId); youtubeNextPageTokenRef.current = ""; setYoutubeStatus(`Opening YouTube chat: ${broadcast.snippet?.title || "live broadcast"}`); pollMessages(liveChatId); } catch (error) { setYoutubeConnected(false); setYoutubeStatus(error.message || "Could not connect to YouTube chat"); } }; startYouTubeChat(); return () => { cancelled = true; clearTimeout(youtubePollTimerRef.current); }; }, [youtubeConnected]);

  const sendTwitchMessage = async (textOverride) => { const text = (textOverride ?? chatInput).trim(); const token = sessionStorage.getItem("twitch_access_token"); if (!text || !token || !twitchUser?.broadcaster_user_id) throw new Error("Twitch is not ready to send."); const response = await fetch("https://api.twitch.tv/helix/chat/messages", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Client-Id": TWITCH_CLIENT_ID, "Content-Type": "application/json" }, body: JSON.stringify({ broadcaster_id: twitchUser.broadcaster_user_id, sender_id: twitchUser.user_id, message: text }) }); const result = await response.json(); if (!response.ok || !result.data?.[0]?.is_sent) throw new Error(result.data?.[0]?.drop_reason?.message || "Twitch message was not sent"); };
  const sendYouTubeMessage = async (textOverride) => { const text = (textOverride ?? chatInput).trim(); const token = sessionStorage.getItem("youtube_access_token"); if (!text || !token || !youtubeLiveChatId) throw new Error("YouTube is not ready to send."); const response = await fetch(`${YOUTUBE_API}/liveChat/messages?part=snippet`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ snippet: { liveChatId: youtubeLiveChatId, type: "textMessageEvent", textMessageDetails: { messageText: text } } }) }); if (!response.ok) { const details = await response.text(); throw new Error(details || "YouTube message was not sent"); } };
  const sendTikTokMessage = async (textOverride) => { const text = (textOverride ?? chatInput).trim(); const socket = tiktokSocketRef.current; if (!text) throw new Error("Enter a TikTok message first."); if (!tiktokConnected || !socket || socket.readyState !== WebSocket.OPEN) throw new Error("TikTok is not ready to send."); socket.send(JSON.stringify({ type: "send_tiktok_message", text })); };
  const sendSelectedMessage = async () => { const text = cleanChatText(expandEmojiWords(chatInput)).trim(); if (!text) return; try { if (sendTarget === "twitch") await sendTwitchMessage(text); if (sendTarget === "youtube") await sendYouTubeMessage(text); if (sendTarget === "tiktok") await sendTikTokMessage(text); if (sendTarget === "both") await Promise.all([sendTwitchMessage(text), sendYouTubeMessage(text)]); if (sendTarget === "all") { const sends = []; if (twitchConnected && activeChannel) sends.push(sendTwitchMessage(text)); if (youtubeConnected && youtubeLiveChatId) sends.push(sendYouTubeMessage(text)); if (!sends.length) throw new Error("No chat platforms are ready to send."); await Promise.all(sends); } setChatInput(""); } catch (error) { if (sendTarget === "youtube") setYoutubeStatus(`Send failed: ${error.message}`); else if (sendTarget === "tiktok" || sendTarget === "all") setTiktokStatus(`Send failed: ${error.message}`); else setTwitchStatus(`Send failed: ${error.message}`); } };

  const enabled = useMemo(() => platforms.filter((p) => p.enabled), [platforms]); const ready = enabled.length > 0 && enabled.every((p) => p.key.trim().length > 5); const update = (id, patch) => setPlatforms((items) => items.map((p) => p.id === id ? { ...p, ...patch } : p)); const finishSetup = () => { sessionStorage.setItem("streambridge_setup_complete", "true"); setSetupComplete(true); };
  const canSend = Boolean(chatInput.trim()) && ((sendTarget === "twitch" && twitchConnected && activeChannel) || (sendTarget === "youtube" && youtubeConnected && youtubeLiveChatId) || (sendTarget === "tiktok" && tiktokConnected) || (sendTarget === "both" && twitchConnected && activeChannel && youtubeConnected && youtubeLiveChatId) || (sendTarget === "all" && ((twitchConnected && activeChannel) || (youtubeConnected && youtubeLiveChatId))));
  if (safetyPage) {
    const safetyContent = {
      privacy: {
        title: "Privacy Notice",
        paragraphs: [
          "StreamBridge is an adults-only streaming control and combined-chat application.",
          "The age screen stores an 18+ confirmation in this browser on this device so the screen does not appear again after confirmation. StreamBridge does not request a date of birth, identity document or biometric information for this confirmation.",
          "Platform access tokens and preferences used by this version are stored in browser session or local storage. Do not use StreamBridge on a shared or public device.",
          "Connected platforms process account and chat information under their own privacy terms. StreamBridge should publish complete business contact, retention, deletion and user-rights information before public release.",
          "This draft notice is product text, not a substitute for a reviewed legal privacy policy."
        ]
      },
      terms: {
        title: "Terms of Use",
        paragraphs: [
          "You must be at least 18 years old to access or use StreamBridge.",
          "You must use only accounts and channels that you own or are authorised to manage, and you must follow the rules of every connected streaming platform.",
          "Do not use StreamBridge for unlawful activity, harassment, exploitation, evasion of platform safeguards or distribution of harmful content.",
          "Access may be refused or withdrawn when these conditions are breached. Features may depend on third-party platforms and are not guaranteed to remain available.",
          "These are draft product terms and should be reviewed for the countries where StreamBridge will be offered before public release."
        ]
      },
      safety: {
        title: "Safety and Child Protection",
        paragraphs: [
          "StreamBridge is intended only for adults aged 18 or over. Anyone under 18 must not continue past the age screen.",
          "The current control is self-confirmation, not identity or document verification. A person could provide a false answer, so this control alone cannot guarantee that every user is an adult.",
          "StreamBridge does not ask children to provide personal information and does not include a child account or child mode.",
          "Before public release, the service owner should complete a child-access and privacy risk assessment and decide whether proportionate third-party age assurance is required.",
          "Suspected child-safety concerns should be reported through a clearly published support route and, where immediate danger or illegal activity is involved, to the appropriate platform and authorities."
        ]
      }
    };
    const page = safetyContent[safetyPage];
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box", background: "#080c18", color: "white", fontFamily: "Arial, sans-serif" }}>
        <section style={{ width: "min(760px, 100%)", background: "#111831", border: `1px solid ${accentColor}`, borderRadius: 22, padding: 28, boxShadow: "0 24px 70px rgba(0,0,0,.5)" }}>
          <h1>{page.title}</h1>
          {page.paragraphs.map((paragraph, index) => <p key={index} style={{ color: "#d7def2", lineHeight: 1.65 }}>{paragraph}</p>)}
          <button type="button" onClick={() => setSafetyPage("")} style={{ ...liveButtonStyle, background: accentColor, marginTop: 12 }}>BACK</button>
        </section>
      </main>
    );
  }
  if (!startupFinished) {
    return <StartupScreen onContinue={() => setStartupFinished(true)} />;
  }

  if (!ageVerified) return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box", background: "radial-gradient(circle at 50% 10%, rgba(124,58,237,.28), transparent 34%), linear-gradient(145deg, #070912 0%, #0b1020 48%, #080b16 100%)", color: "white", fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "min(540px, 100%)", textAlign: "center", background: "rgba(12,17,34,.94)", border: "1px solid rgba(167,139,250,.55)", borderRadius: 28, padding: "36px 30px", boxShadow: "0 0 35px rgba(124,58,237,.18), 0 28px 80px rgba(0,0,0,.55)", backdropFilter: "blur(16px)" }}>
        <div style={{ width: 88, height: 88, margin: "0 auto 22px", display: "grid", placeItems: "center", borderRadius: "50%", background: "linear-gradient(135deg, rgba(124,58,237,.28), rgba(37,99,235,.22))", border: "2px solid #8b5cf6", boxShadow: "0 0 30px rgba(139,92,246,.4)", fontSize: "2rem", fontWeight: 900 }}>18+</div>
        <p style={{ margin: "0 0 8px", color: "#a78bfa", fontWeight: 900, letterSpacing: 3, fontSize: ".78rem" }}>STREAMBRIDGE</p>
        <h1 style={{ margin: "0 0 14px", fontSize: "clamp(1.8rem, 6vw, 2.5rem)", lineHeight: 1.12 }}>Age & Safety</h1>
        <p style={{ color: "#cbd5e1", lineHeight: 1.65, margin: "0 auto 10px", maxWidth: 440 }}>StreamBridge is intended for adults aged 18 or over.</p>
        <p style={{ color: "#94a3b8", lineHeight: 1.55, margin: "0 auto 26px", maxWidth: 440, fontSize: ".92rem" }}>Please confirm that you are 18 or older before continuing.</p>
               <label style={{ display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left", padding: "14px 16px", margin: "0 0 14px", borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(167,139,250,.28)", color: "#dbe4f3", lineHeight: 1.5, cursor: "pointer" }}>
          <input type="checkbox" checked={ageAgreementChecked} onChange={(event) => setAgeAgreementChecked(event.target.checked)} style={{ marginTop: 4, width: 18, height: 18, accentColor: "#7c3aed", flex: "0 0 auto" }} />
          <span>I confirm that I am 18 or over. I understand that StreamBridge is an 18+ service only, and I agree to the Terms of Use and Privacy Notice.</span>
        </label>
        <p style={{ color: "#94a3b8", lineHeight: 1.5, margin: "0 auto 14px", maxWidth: 440, fontSize: ".82rem" }}>By continuing, you confirm that you meet the 18+ age requirement.</p>
        <button type="button" disabled={!ageAgreementChecked} onClick={() => { if (!ageAgreementChecked) return; localStorage.setItem("streambridge_age_verified", "true"); setAgeVerified(true); }} style={{ width: "100%", border: 0, borderRadius: 14, padding: "16px 18px", color: "white", fontSize: "1rem", fontWeight: 900, cursor: ageAgreementChecked ? "pointer" : "not-allowed", background: ageAgreementChecked ? "linear-gradient(135deg, #7c3aed, #2563eb)" : "#475569", opacity: ageAgreementChecked ? 1 : 0.6, boxShadow: ageAgreementChecked ? "0 10px 30px rgba(124,58,237,.35)" : "none" }}>I am 18 or over</button>
        <button type="button" onClick={() => { window.location.href = "about:blank"; }} style={{ width: "100%", marginTop: 11, borderRadius: 14, padding: "14px 18px", color: "#cbd5e1", fontSize: ".95rem", fontWeight: 700, cursor: "pointer", background: "rgba(255,255,255,.04)", border: "1px solid rgba(148,163,184,.25)" }}>I am under 18</button>
        <div style={{ height: 1, background: "rgba(148,163,184,.15)", margin: "26px 0 20px" }} />
        <p style={{ color: "#64748b", fontSize: ".78rem", lineHeight: 1.5, margin: "0 0 16px" }}>Your 18+ confirmation is remembered on this device.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setSafetyPage("privacy")} style={{ border: 0, padding: 0, background: "transparent", color: "#a78bfa", cursor: "pointer", fontSize: ".82rem" }}>Privacy</button>
          <button type="button" onClick={() => setSafetyPage("terms")} style={{ border: 0, padding: 0, background: "transparent", color: "#a78bfa", cursor: "pointer", fontSize: ".82rem" }}>Terms</button>
          <button type="button" onClick={() => setSafetyPage("safety")} style={{ border: 0, padding: 0, background: "transparent", color: "#a78bfa", cursor: "pointer", fontSize: ".82rem" }}>Safety</button>
        </div>
      </section>
    </main>
  );
  if (!entryStarted) return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box", color: "white", fontFamily: "Arial, sans-serif", background: appBackground ? `linear-gradient(rgba(11,16,32,.68), rgba(11,16,32,.68)), url(${appBackground}) center / cover fixed` : "radial-gradient(circle at top, #27304f, #080c18 65%)" }}>
      <section style={{ width: "min(680px, 100%)", textAlign: "center", background: "rgba(17,24,49,.9)", border: `1px solid ${accentColor}`, borderRadius: 28, padding: 36, boxShadow: "0 26px 80px rgba(0,0,0,.5)" }}>
        <p style={{ color: "#70f0a0", fontWeight: 900, letterSpacing: 2 }}>STREAMBRIDGE</p>
        <h1 style={{ fontSize: "clamp(2.2rem, 8vw, 4.8rem)", margin: "8px 0" }}>One chat. Every audience.</h1>
        <p style={{ color: "#cbd5e1", fontSize: "1.08rem" }}>Connect your platforms, open the combined chat and manage your live audience in one place.</p>
        <button type="button" onClick={() => setEntryStarted(true)} style={{ ...liveButtonStyle, width: "100%", marginTop: 18, padding: 18, background: accentColor, fontSize: "1.25rem" }}>GO LIVE</button>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 15 }}>
          <button type="button" onClick={() => setSafetyPage("privacy")} style={{ border: 0, background: "transparent", color: "#c4b5fd", textDecoration: "underline", cursor: "pointer" }}>Privacy</button>
          <button type="button" onClick={() => setSafetyPage("terms")} style={{ border: 0, background: "transparent", color: "#c4b5fd", textDecoration: "underline", cursor: "pointer" }}>Terms</button>
          <button type="button" onClick={() => setSafetyPage("safety")} style={{ border: 0, background: "transparent", color: "#c4b5fd", textDecoration: "underline", cursor: "pointer" }}>Safety</button>
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ ...liveButtonStyle, display: "inline-block", background: "#27304f" }}>Add app background<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onAppBackgroundChange} style={{ display: "none" }} /></label>
          {appBackground && <button type="button" onClick={clearAppBackground} style={{ ...liveButtonStyle, background: "#4b2330" }}>Remove app background</button>}
        </div>
      </section>
    </main>
  );

  if (!setupComplete) return <main style={{ background: appBackground ? `linear-gradient(rgba(11,16,32,.72), rgba(11,16,32,.72)), url(${appBackground}) center / cover fixed` : themedPageBackground, color: appBackground ? "white" : (theme === "light" ? "#111827" : undefined), minHeight: "100vh" }}><section className="hero"><h1>Welcome to Streambridge</h1><div role="note" aria-label="StreamBridge is for adults age 18 and over" style={{ background: "#b91c1c", color: "white", border: "2px solid #fecaca", padding: "12px 16px", borderRadius: 12, fontWeight: 900, fontSize: "1.25rem", margin: "12px 0" }}>{"\uD83D\uDD1E"} 18+ ONLY</div><p>Let's set up your stream.</p><p>Language: <strong>Auto detect ({language})</strong></p><p>Theme: <select value={theme} onChange={(e) => changeTheme(e.target.value)}><option value="dark">Dark</option><option value="purple">Neon Purple</option><option value="blue">Electric Blue</option><option value="fire">Red / Orange</option><option value="green">Cyber Green</option><option value="light">Light</option></select></p><p>Pick your colour: <input aria-label="Pick accent colour" type="color" value={accentColor} onChange={(e) => { setAccentColor(e.target.value); localStorage.setItem("streambridge_accent", e.target.value); }} /></p><fieldset><legend>Accessibility</legend><label><input type="checkbox" checked={largeText} onChange={(e) => { setLargeText(e.target.checked); localStorage.setItem("streambridge_large_text", String(e.target.checked)); }} /> Large text</label><br /><label><input type="checkbox" checked={highContrast} onChange={(e) => { setHighContrast(e.target.checked); localStorage.setItem("streambridge_high_contrast", String(e.target.checked)); }} /> High contrast</label><br /><label><input type="checkbox" checked={announceMessages} onChange={(e) => { setAnnounceMessages(e.target.checked); localStorage.setItem("streambridge_announce_messages", String(e.target.checked)); }} /> Read new chat messages aloud</label></fieldset><p>Platforms:</p><div className="grid">{platforms.map((p) => <label className="card" key={p.id}><input type="checkbox" checked={p.enabled} onChange={(e) => update(p.id, { enabled: e.target.checked })} /> {p.name}</label>)}</div><button className="go" disabled={enabled.length === 0} onClick={finishSetup} style={enabled.length === 0 ? undefined : themedButtonStyle}>Start setup</button></section></main>;
  if (showLiveChat) return <LiveChatScreen messages={messages} onBack={() => setShowLiveChat(false)} messageText={chatInput} setMessageText={setChatInput} onSend={sendSelectedMessage} canSend={canSend} twitchStatus={twitchStatus} youtubeStatus={youtubeStatus} tiktokStatus={tiktokStatus} sendTarget={sendTarget} setSendTarget={setSendTarget} tiktokConnected={tiktokConnected} accentColor={accentColor} theme={theme} largeText={largeText} highContrast={highContrast} announceMessages={announceMessages} chatBackground={chatBackground} onChatBackgroundChange={onChatBackgroundChange} twitchMessageColor={twitchMessageColor} youtubeMessageColor={youtubeMessageColor} tiktokMessageColor={tiktokMessageColor} messageBackgroundColor={messageBackgroundColor} messageTextColor={messageTextColor} />;
  return <main style={{ background: appBackground ? `linear-gradient(rgba(11,16,32,.72), rgba(11,16,32,.72)), url(${appBackground}) center / cover fixed` : themedPageBackground, color: appBackground ? "white" : (highContrast ? "#fff" : (theme === "light" ? "#111827" : undefined)), minHeight: "100vh", fontSize: largeText ? "125%" : "100%" }}><header><div><h1>Streambridge</h1><p>One input. Every audience.</p></div><span className="badge" role="note" aria-label="StreamBridge is for adults age 18 and over" style={{ background: "#b91c1c", color: "white", border: "2px solid #fecaca", padding: "10px 14px", borderRadius: 999, fontWeight: 900 }}>{"\uD83D\uDD1E"} 18+ ONLY {"\u2022"} READY</span></header><section className="hero"><p className="eyebrow">CLOUD MULTISTREAM CONTROL</p><h2>Stream everywhere. Manage everything in one place.</h2><p>This dashboard prepares your streaming destinations. A streaming relay backend is still required for real simultaneous broadcasting.</p><button className={live ? "stop" : "go"} onClick={() => ready && setLive(!live)} style={ready ? themedButtonStyle : { ...themedButtonStyle, opacity: 0.5, cursor: "not-allowed" }}>{live ? "Stop broadcast" : "Go live everywhere"}</button>{!ready && <small>Connect your platforms to enable streaming.</small>}</section><div className="bar"><h2>Streaming destinations</h2></div><section className="grid">{platforms.map((p) => <article className="card" key={p.id}><div className="row"><strong>{p.name}</strong><input type="checkbox" checked={p.enabled} onChange={(e) => update(p.id, { enabled: e.target.checked })} /></div></article>)}</section><section className="note" style={{ border: `1px solid ${accentColor}`, borderRadius: 20, boxShadow: `0 16px 40px ${accentColor}22`, padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><div style={{ fontSize: "1.35rem", fontWeight: 900 }}>StreamBridge Control Center</div><small>Connections, appearance and accessibility</small></div><button type="button" className="go" style={themedButtonStyle} onClick={() => setShowLiveChat(true)}>OPEN LIVE CHAT</button></div><div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "12px 0" }}><label><b>Theme </b><select value={theme} onChange={(e) => changeTheme(e.target.value)}><option value="dark">Dark</option><option value="purple">Neon Purple</option><option value="blue">Electric Blue</option><option value="fire">Red / Orange</option><option value="green">Cyber Green</option><option value="light">Light</option></select></label><label><b>Pick your colour </b><input type="color" value={accentColor} onChange={(e) => { setAccentColor(e.target.value); localStorage.setItem("streambridge_accent", e.target.value); }} /></label><strong role="note" aria-label="StreamBridge is for adults age 18 and over" style={{ background: "#b91c1c", color: "white", padding: "8px 12px", borderRadius: 999 }}>{"\uD83D\uDD1E"} 18+ ONLY</strong><label style={{ ...liveButtonStyle, ...themedButtonStyle, display: "inline-block" }}>Add app background<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onAppBackgroundChange} style={{ display: "none" }} /></label>{appBackground && <button type="button" onClick={clearAppBackground}>Remove app background</button>}</div><fieldset style={{ margin: "12px 0" }}><legend><b>Accessibility</b></legend><label><input type="checkbox" checked={largeText} onChange={(e) => { setLargeText(e.target.checked); localStorage.setItem("streambridge_large_text", String(e.target.checked)); }} /> Large text</label><br /><label><input type="checkbox" checked={highContrast} onChange={(e) => { setHighContrast(e.target.checked); localStorage.setItem("streambridge_high_contrast", String(e.target.checked)); }} /> High contrast</label><br /><label><input type="checkbox" checked={announceMessages} onChange={(e) => { setAnnounceMessages(e.target.checked); localStorage.setItem("streambridge_announce_messages", String(e.target.checked)); }} /> Read new chat messages aloud</label><p>Keyboard shortcut: Alt + L focuses the Live Chat message box.</p></fieldset><fieldset style={{ margin: "12px 0", borderRadius: 12, borderColor: accentColor }}><legend><b>Message colour setup</b></legend><div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}><label>Twitch <input type="color" value={twitchMessageColor} onChange={(e) => { setTwitchMessageColor(e.target.value); localStorage.setItem("streambridge_twitch_message_color", e.target.value); }} /></label><label>YouTube <input type="color" value={youtubeMessageColor} onChange={(e) => { setYoutubeMessageColor(e.target.value); localStorage.setItem("streambridge_youtube_message_color", e.target.value); }} /></label><label>TikTok <input type="color" value={tiktokMessageColor} onChange={(e) => { setTiktokMessageColor(e.target.value); localStorage.setItem("streambridge_tiktok_message_color", e.target.value); }} /></label><label>Message box <input type="color" value={messageBackgroundColor} onChange={(e) => { setMessageBackgroundColor(e.target.value); localStorage.setItem("streambridge_message_background_color", e.target.value); }} /></label><label>Message text <input type="color" value={messageTextColor} onChange={(e) => { setMessageTextColor(e.target.value); localStorage.setItem("streambridge_message_text_color", e.target.value); }} /></label></div><p style={{ marginBottom: 0, color: "#aeb8d4" }}>These colours are saved on this device and used for incoming messages in Combined Chat.</p></fieldset><div style={{ margin: "12px 0" }}><label htmlFor="twitch-channel"><b>Twitch channel name</b></label><div><input id="twitch-channel" type="text" placeholder="Example: yourchannelname" value={twitchChannel} onChange={(e) => setTwitchChannel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && chooseChannel()} /><button type="button" onClick={chooseChannel} style={themedButtonStyle}>Save channel</button></div></div><p><b>Twitch:</b> {twitchStatus}</p><p><b>YouTube:</b> {youtubeStatus}</p><div style={{ margin: "12px 0" }}><label htmlFor="tiktok-username"><b>TikTok username</b></label><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}><input id="tiktok-username" type="text" placeholder="Example: yourusername" value={tiktokUsername} onChange={(e) => setTiktokUsername(cleanChatText(e.target.value).replace(/^@/, ""))} onKeyDown={(e) => { if (e.key === "Enter") connectTikTok(); }} /><button type="button" onClick={connectTikTok} style={themedButtonStyle}>{tiktokConnected ? "Reconnect TikTok" : "Connect TikTok"}</button>{tiktokConnected && <button type="button" onClick={disconnectTikTok} style={themedButtonStyle}>Disconnect TikTok</button>}</div></div><p><b>TikTok:</b> {tiktokStatus}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}><button type="button" onClick={connectTwitch} style={themedButtonStyle}>{twitchConnected ? "Reconnect Twitch" : "Connect Twitch"}</button><button type="button" onClick={connectYouTube} style={themedButtonStyle}>{youtubeConnected ? "Reconnect YouTube" : "Connect YouTube"}</button>{youtubeConnected && <button type="button" onClick={disconnectYouTube} style={themedButtonStyle}>Disconnect YouTube</button>}</div><p style={{ color: "#aeb8d4" }}>Live messages appear only in the large Live Chat screen.</p></section></main>;





}















