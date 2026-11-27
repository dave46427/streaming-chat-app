import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { detectDeviceLanguage, getSavedLanguage, saveLanguage, supportedLanguages, translate } from "./languages";
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

function LiveChatScreen({ t, messages, onBack, messageText, setMessageText, onSend, canSend, twitchStatus, youtubeStatus, tiktokStatus, facebookStatus, kickStatus, mixcloudStatus, twitchConnected, youtubeConnected, facebookConnected, kickConnected, mixcloudConnected, twitchViewers, youtubeViewers, facebookViewers, kickViewers, mixcloudViewers, tiktokViewers, tiktokLikes, sendTarget, tiktokConnected, setSendTarget, accentColor, theme, largeText, highContrast, announceMessages, chatBackground, onChatBackgroundChange, onClearChatBackground, twitchMessageColor, youtubeMessageColor, tiktokMessageColor, messageBackgroundColor, messageTextColor, giftAlert }) {
  const chatEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const lastAnnouncedMessageRef = useRef(null);

  const liveChatFallbacks = {
    skipToChat: "Skip to chat messages",
    backToSettings: "Back to Settings",
    liveChat: "LIVE CHAT",
    addChatBackground: "Add chat background",
    combinedChatTitle: "Combined Chat",
    waitingForMessages: "Waiting for live messages...",
    sendToKick: "SEND TO KICK",
    sendToMixcloud: "SEND TO MIXCLOUD"
  };

  const lt = (key) => {
    const translated = typeof t === "function" ? t(key) : "";

    return translated && translated !== key
      ? translated
      : liveChatFallbacks[key] || key;
  };
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
    <main style={{ minHeight: "100vh", background: highContrast ? "#000" : (theme === "light" ? "#eef2ff" : "#0b1020"), color: highContrast ? "#fff" : (theme === "light" ? "#111827" : "white"), padding: "clamp(8px, 1.5vw, 14px)", fontSize: largeText ? "125%" : "100%", fontFamily: "Arial, sans-serif", boxSizing: "border-box" }}>
      <a href="#chat-messages" style={{ position: "absolute", left: 8, top: 8, padding: 8, background: "#fff", color: "#000", transform: "translateY(-150%)" }} onFocus={(e) => { e.currentTarget.style.transform = "translateY(0)"; }} onBlur={(e) => { e.currentTarget.style.transform = "translateY(-150%)"; }}>{lt("skipToChat")}</a>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={liveButtonStyle}>{lt("backToSettings")}</button>
        <div style={{ fontWeight: 800, fontSize: "1.15rem" }}>DAVABRIDGE LIVE</div>
        <div style={{ color: "#70f0a0", fontWeight: 700 }}>{lt("liveChat")}</div>
<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
  <label style={{ ...liveButtonStyle, background: accentColor, display: "inline-block" }}>
    {lt("addChatBackground")}
    <input
      aria-label="Add a background image to Live Chat"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      onChange={onChatBackgroundChange}
      style={{ display: "none" }}
    />
  </label>

  {chatBackground && (
    <button
      type="button"
      onClick={onClearChatBackground}
      style={{
        ...liveButtonStyle,
        background: "linear-gradient(180deg, #dc2626 0%, #991b1b 100%)"
      }}
    >
      CLEAR BACKGROUND
    </button>
  )}
</div>
      </header>
      <style>{`
        @keyframes davabridgeGiftEnter {
          0% { opacity: 0; transform: scale(.15) rotate(-14deg); }
          45% { opacity: 1; transform: scale(1.16) rotate(4deg); }
          65% { transform: scale(.94) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @keyframes davabridgeGiftGlow {
          0%, 100% { filter: drop-shadow(0 0 16px #a855f7) drop-shadow(0 0 34px #2563eb); }
          50% { filter: drop-shadow(0 0 30px #ffffff) drop-shadow(0 0 65px #a855f7); }
        }

        @keyframes davabridgeGiftLeave {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          35% { opacity: .9; transform: scale(1.12); }
          100% { opacity: 0; transform: scale(1.7); filter: blur(18px); }
        }

        @keyframes davabridgeSmoke {
          0% { opacity: 0; transform: translate(0, 20px) scale(.25); }
          30% { opacity: .85; }
          100% { opacity: 0; transform: translate(var(--smoke-x), -145px) scale(2.7); }
        }

        .davabridge-gift-alert {
          animation:
            davabridgeGiftEnter .7s cubic-bezier(.15,.9,.25,1.3) both,
            davabridgeGiftLeave 1s ease-in 4s both;
        }

        .davabridge-gift-visual {
          animation: davabridgeGiftGlow 1.15s ease-in-out infinite;
        }

        .davabridge-smoke {
          animation: davabridgeSmoke 1.15s ease-out 3.85s both;
        }

        @media (prefers-reduced-motion: reduce) {
          .davabridge-gift-alert,
          .davabridge-gift-visual,
          .davabridge-smoke {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>

      <section style={{ position: "relative", background: "linear-gradient(145deg, #182244 0%, #111831 48%, #090e1d 100%)", border: "3px solid #344264", borderTopColor: "#7182ad", borderLeftColor: "#56698f", borderRightColor: "#11172a", borderBottomColor: "#080c16", borderRadius: 20, height: "calc(100dvh - 82px)", minHeight: 520, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "inset 0 2px 0 rgba(255,255,255,.14), inset 0 -8px 18px rgba(0,0,0,.35), 0 12px 0 #050811, 0 22px 38px rgba(0,0,0,.62)" }}>
        {giftAlert && (
          <div
            className="davabridge-gift-alert"
            role="alert"
            aria-live="assertive"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
              background: "radial-gradient(circle, rgba(124,58,237,.25), transparent 58%)"
            }}
          >
            <div style={{ position: "relative", width: "min(520px, 88%)", textAlign: "center" }}>
              <div
                className="davabridge-gift-visual"
                style={{
                  width: "clamp(150px, 32vw, 290px)",
                  height: "clamp(150px, 32vw, 290px)",
                  margin: "0 auto 12px",
                  display: "grid",
                  placeItems: "center"
                }}
              >
                {giftAlert.image ? (
                  <img
                    src={giftAlert.image}
                    alt=""
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain"
                    }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      fontSize: "clamp(7rem, 24vw, 14rem)",
                      lineHeight: 1
                    }}
                  >
                    🎁
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "14px 20px",
                  borderRadius: 20,
                  color: "white",
                  background: "rgba(5,8,20,.78)",
                  border: "2px solid rgba(216,180,254,.8)",
                  boxShadow: "0 0 35px rgba(168,85,247,.7)",
                  backdropFilter: "blur(8px)"
                }}
              >
                <div style={{ fontSize: "clamp(1.5rem, 6vw, 3rem)", fontWeight: 1000 }}>
                  {giftAlert.giftName}
                  {giftAlert.count > 1 ? ` ×${giftAlert.count}` : ""}
                </div>

                <div style={{ marginTop: 6, color: "#e9d5ff", fontSize: "clamp(1rem, 3vw, 1.35rem)", fontWeight: 900 }}>
                  Sent by {giftAlert.username}
                </div>
              </div>

              {[-120, -75, -30, 20, 65, 110].map((smokeX, index) => (
                <span
                  key={index}
                  className="davabridge-smoke"
                  style={{
                    "--smoke-x": `${smokeX}px`,
                    position: "absolute",
                    left: `calc(50% + ${smokeX / 3}px)`,
                    bottom: 20,
                    width: 52 + index * 4,
                    height: 52 + index * 4,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(255,255,255,.92), rgba(148,163,184,.58) 48%, transparent 72%)",
                    filter: "blur(5px)"
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div role="status" aria-live="polite" aria-atomic="true" style={{ padding: "9px 12px", borderBottom: "3px solid #080c18", background: "linear-gradient(180deg, #263354 0%, #151e39 100%)", boxShadow: "inset 0 2px 0 rgba(255,255,255,.14), 0 5px 12px rgba(0,0,0,.46)", position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: "1rem", fontWeight: 800 }}>{lt("combinedChatTitle")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "6px 14px", marginTop: 7 }}>
            <div style={{ color: twitchConnected ? "#70f0a0" : "#ff5c5c", fontSize: ".76rem" }}><strong>Twitch:</strong> {twitchStatus} | Viewers: {Number(twitchViewers || 0).toLocaleString()}</div>
            <div style={{ color: youtubeConnected ? "#70f0a0" : "#ff5c5c", fontSize: ".76rem" }}><strong>YouTube:</strong> {youtubeStatus} | Viewers: {Number(youtubeViewers || 0).toLocaleString()}</div>
            <div style={{ color: tiktokConnected ? "#70f0a0" : "#ff5c5c", fontSize: ".76rem" }}><strong>TikTok:</strong> {tiktokConnected ? tiktokStatus : "Not connected"} | Viewers: {Number(tiktokViewers || 0).toLocaleString()} | Likes: {Number(tiktokLikes || 0).toLocaleString()}</div>
            <div style={{ color: facebookConnected ? "#70f0a0" : "#ff5c5c", fontSize: ".76rem" }}><strong>Facebook:</strong> {facebookStatus} | Viewers: {Number(facebookViewers || 0).toLocaleString()}</div>
            <div style={{ color: kickConnected ? "#70f0a0" : "#ff5c5c", fontSize: ".76rem" }}><strong>Kick:</strong> {kickStatus} | Viewers: {Number(kickViewers || 0).toLocaleString()}</div>
            <div style={{ color: mixcloudConnected ? "#70f0a0" : "#ff5c5c", fontSize: ".76rem" }}><strong>Mixcloud:</strong> {mixcloudStatus} | Viewers: {Number(mixcloudViewers || 0).toLocaleString()}</div>
          </div>

        </div>
        <div id="chat-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Combined live chat messages" tabIndex="0" style={{ flex: 1, overflowY: "auto", padding: "clamp(8px, 1.5vw, 12px)", minHeight: 0, position: "relative", zIndex: 2, background: giftAlert ? "transparent" : (chatBackground ? `linear-gradient(rgba(11,16,32,.55), rgba(11,16,32,.55)), url(${chatBackground}) center / cover no-repeat` : "#111831") }}>
          {messages.length === 0 ? <div style={{ color: "#aeb8d4", textAlign: "center", marginTop: 40 }}>{lt("waitingForMessages")}</div> : messages.map((msg, index) => (
            <div key={msg.id ?? index} style={{ padding: "8px 11px", marginBottom: 7, background: chatBackground ? `${messageBackgroundColor}D9` : messageBackgroundColor, color: messageTextColor, borderRadius: 10, backdropFilter: chatBackground ? "blur(2px)" : "none", borderLeft: `4px solid ${msg.platform === "YouTube" ? youtubeMessageColor : msg.platform === "TikTok" ? tiktokMessageColor : twitchMessageColor}` }}>
              <div style={{ fontSize: ".76rem", color: "#aeb8d4", marginBottom: 4 }}>{msg.platform ?? "Chat"} {"\u2022"} <strong style={{ color: messageTextColor }}>{msg.username ?? "Viewer"}</strong></div>
              <div style={{ fontSize: ".98rem", overflowWrap: "anywhere" }}>{msg.text ?? ""}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={(event) => { event.preventDefault(); onSend(); }} style={{ display: "flex", gap: 8, padding: "10px", borderTop: "3px solid #394968", background: "linear-gradient(180deg, #202b49 0%, #0d1428 72%, #080c18 100%)", flexWrap: "wrap", boxShadow: "inset 0 3px 0 rgba(255,255,255,.12), inset 0 -5px 12px rgba(0,0,0,.48), 0 -8px 18px rgba(0,0,0,.38)", position: "relative", zIndex: 2 }}>
          <label htmlFor="send-target" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Send message to</label><select id="send-target" aria-label="Send message to platform" value={sendTarget} onChange={(event) => setSendTarget(event.target.value)} style={{ padding: "11px 13px", borderRadius: 11, border: "2px solid #080c18", borderTopColor: "#080b15", borderLeftColor: "#080b15", borderRightColor: "#536181", borderBottomColor: "#536181", background: "linear-gradient(180deg, #10172b 0%, #1d2947 100%)", color: "white", fontWeight: 700, boxShadow: "inset 0 4px 8px rgba(0,0,0,.72), 0 2px 0 rgba(255,255,255,.12)" }}>
            <option value="twitch">Twitch</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="facebook">Facebook</option>
            <option value="kick">Kick</option>
            <option value="mixcloud">Mixcloud</option>
            <option value="all">Send to Everyone</option>
          </select>
          <label htmlFor="live-chat-message" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Live chat message</label><input ref={messageInputRef} id="live-chat-message" aria-label="Live chat message. Press Alt plus L to focus this box" maxLength={500} value={messageText} onChange={(event) => setMessageText(expandEmojiWords(cleanChatText(event.target.value)))} placeholder="Start typing... (try: fire)" style={{ flex: "1 1 220px", padding: "12px 14px", borderRadius: 11, border: "2px solid #080c18", borderTopColor: "#070a13", borderLeftColor: "#070a13", borderRightColor: "#526181", borderBottomColor: "#526181", background: "linear-gradient(180deg, #0b1122 0%, #182440 100%)", color: "white", fontSize: "1rem", boxShadow: "inset 0 5px 10px rgba(0,0,0,.78), inset 0 -1px 0 rgba(255,255,255,.1), 0 2px 0 rgba(255,255,255,.1)", outline: "none" }} />
          <button
            type="submit"
            disabled={!canSend}
            style={{
              ...liveButtonStyle,
              background: canSend ? accentColor : "#4b5063",
              cursor: canSend ? "pointer" : "not-allowed",
            }}
          >
            {sendTarget === "youtube"
              ? "SEND TO YOUTUBE"
              : sendTarget === "twitch"
                ? "SEND TO TWITCH"
                : sendTarget === "tiktok"
                  ? "SEND TO TIKTOK"
                  : sendTarget === "facebook"
                    ? "SEND TO FACEBOOK"
                    : sendTarget === "kick"
                      ? lt("sendToKick")
                      : sendTarget === "mixcloud"
                        ? lt("sendToMixcloud")
                        : "SEND"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [startupFinished, setStartupFinished] = useState(() =>
    localStorage.getItem("streambridge_setup_complete") === "true" ||
    sessionStorage.getItem("streambridge_setup_complete") === "true" ||
    sessionStorage.getItem("streambridge_setup_in_progress") === "true" ||
    window.location.hash.includes("access_token=")
  );

  const [ageVerified, setAgeVerified] = useState(() => localStorage.getItem("streambridge_age_verified") === "true");
  const [ageAgreementChecked, setAgeAgreementChecked] = useState(false);
  const [safetyPage, setSafetyPage] = useState("");
  const [entryStarted, setEntryStarted] = useState(true);
  const [appBackground, setAppBackground] = useState(() => localStorage.getItem("streambridge_app_background") || "");
  const [setupComplete, setSetupComplete] = useState(() => sessionStorage.getItem("streambridge_setup_complete") === "true" || localStorage.getItem("streambridge_setup_complete") === "true");
  const [languageMode, setLanguageMode] = useState(() => localStorage.getItem("davabridge_language") || "auto");
  const [language, setLanguage] = useState(() => getSavedLanguage());

  const changeLanguage = (value) => {
    const nextMode = value || "auto";
    setLanguageMode(nextMode);
    setLanguage(saveLanguage(nextMode));
  };

  const t = (key) => translate(language, key);

  useEffect(() => {
    const refreshLanguage = () => {
      if ((localStorage.getItem("davabridge_language") || "auto") === "auto") {
        setLanguage(detectDeviceLanguage());
      }
    };

    window.addEventListener("languagechange", refreshLanguage);
    window.addEventListener("focus", refreshLanguage);
    document.addEventListener("visibilitychange", refreshLanguage);

    return () => {
      window.removeEventListener("languagechange", refreshLanguage);
      window.removeEventListener("focus", refreshLanguage);
      document.removeEventListener("visibilitychange", refreshLanguage);
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
  const clearChatBackground = () => {
    setChatBackground("");
    localStorage.removeItem("streambridge_chat_background");
  };

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

  const [twitchConnected, setTwitchConnected] = useState(false); const [twitchStatus, setTwitchStatus] = useState("Not connected"); const [twitchUser, setTwitchUser] = useState(null); const [twitchViewers, setTwitchViewers] = useState(0);
  const [twitchChannel, setTwitchChannel] = useState(() => getSavedTwitchChannel()); const [activeChannel, setActiveChannel] = useState(() => getSavedTwitchChannel());
  const [youtubeConnected, setYoutubeConnected] = useState(() => Boolean(sessionStorage.getItem("youtube_access_token")));
const [youtubeStatus, setYoutubeStatus] = useState("Not connected");
const [youtubeLiveChatId, setYoutubeLiveChatId] = useState("");
const [youtubeViewers, setYoutubeViewers] = useState(0); const [facebookConnected, setFacebookConnected] = useState(false); const [facebookStatus, setFacebookStatus] = useState("Not connected"); const [facebookViewers, setFacebookViewers] = useState(0); const [facebookPages, setFacebookPages] = useState([]);
    const [tiktokUsername, setTiktokUsername] = useState(() => localStorage.getItem("tiktok_username") || ""); const [tiktokConnected, setTiktokConnected] = useState(false); const [tiktokStatus, setTiktokStatus] = useState("Not connected"); const [tiktokViewers, setTiktokViewers] = useState(0); const [tiktokLikes, setTiktokLikes] = useState(0);
  const [mixcloudConnected, setMixcloudConnected] = useState(false);
  const [mixcloudStatus, setMixcloudStatus] = useState("Not connected");
  const [mixcloudUser, setMixcloudUser] = useState("");
  const [mixcloudViewers, setMixcloudViewers] = useState(0);

  const [kickConnected, setKickConnected] = useState(false);
  const [kickStatus, setKickStatus] = useState("Not connected");
  const [kickUser, setKickUser] = useState("");
  const [kickViewers, setKickViewers] = useState(0);

  const [messages, setMessages] = useState([]); const [chatInput, setChatInput] = useState(""); const [sendTarget, setSendTarget] = useState("twitch"); const [platforms, setPlatforms] = useState(defaults); const [live, setLive] = useState(false); const [showLiveChat, setShowLiveChat] = useState(false);
  const [giftAlert, setGiftAlert] = useState(null);
  const [giftSoundPreset, setGiftSoundPreset] = useState(() =>
    localStorage.getItem("streambridge_gift_sound_preset") || "neon"
  );

  const [customGiftSound, setCustomGiftSound] = useState(() =>
    localStorage.getItem("streambridge_custom_gift_sound") || ""
  );

  const [customGiftSoundName, setCustomGiftSoundName] = useState(() =>
    localStorage.getItem("streambridge_custom_gift_sound_name") || ""
  );

  const [giftSoundMuted, setGiftSoundMuted] = useState(() =>
    localStorage.getItem("streambridge_gift_sound_muted") === "true"
  );

  const [giftSoundStart, setGiftSoundStart] = useState(() => {
    const saved = Number(localStorage.getItem("streambridge_gift_sound_start"));
    return Number.isFinite(saved) ? Math.min(20, Math.max(0, saved)) : 0;
  });

  const [giftSoundDuration, setGiftSoundDuration] = useState(() => {
    const saved = Number(localStorage.getItem("streambridge_gift_sound_duration"));
    return Number.isFinite(saved) ? Math.min(10, Math.max(0.5, saved)) : 5;
  });

  const [giftSoundFadeIn, setGiftSoundFadeIn] = useState(() => {
    const saved = Number(localStorage.getItem("streambridge_gift_sound_fade_in"));
    return Number.isFinite(saved) ? Math.min(3, Math.max(0, saved)) : 0.1;
  });

  const [giftSoundFadeOut, setGiftSoundFadeOut] = useState(() => {
    const saved = Number(localStorage.getItem("streambridge_gift_sound_fade_out"));
    return Number.isFinite(saved) ? Math.min(3, Math.max(0, saved)) : 0.8;
  });

  const [giftAlertVolume, setGiftAlertVolume] = useState(() => {
    const saved = Number(localStorage.getItem("streambridge_gift_alert_volume"));
    return Number.isFinite(saved) ? Math.min(100, Math.max(0, saved)) : 70;
  });
  const giftAlertTimerRef = useRef(null);
  const giftAudioContextRef = useRef(null);

  const customGiftAudioRef = useRef(null);
  const customGiftFadeTimerRef = useRef(null);
  const customGiftStopTimerRef = useRef(null);

  const stopGiftAlertSound = () => {
    clearInterval(customGiftFadeTimerRef.current);
    clearTimeout(customGiftStopTimerRef.current);

    if (customGiftAudioRef.current) {
      customGiftAudioRef.current.pause();
      customGiftAudioRef.current.currentTime = 0;
      customGiftAudioRef.current = null;
    }
  };

  const playBuiltInGiftSound = (preset, volume) => {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      const context =
        giftAudioContextRef.current || new AudioContextClass();

      giftAudioContextRef.current = context;

      if (context.state === "suspended") {
        context.resume().catch(() => {});
      }

      const soundPatterns = {
        neon: {
          type: "triangle",
          frequencies: [523.25, 659.25, 783.99, 1046.5],
          spacing: 0.11,
          noteLength: 0.45
        },
        arcade: {
          type: "square",
          frequencies: [329.63, 493.88, 659.25, 987.77],
          spacing: 0.08,
          noteLength: 0.24
        },
        magic: {
          type: "sine",
          frequencies: [659.25, 783.99, 987.77, 1318.51],
          spacing: 0.14,
          noteLength: 0.7
        },
        bass: {
          type: "sawtooth",
          frequencies: [164.81, 130.81, 98, 65.41],
          spacing: 0.12,
          noteLength: 0.65
        },
        celebration: {
          type: "triangle",
          frequencies: [392, 523.25, 659.25, 783.99, 1046.5],
          spacing: 0.09,
          noteLength: 0.48
        }
      };

      const pattern =
        soundPatterns[preset] || soundPatterns.neon;

      const now = context.currentTime;
      const duration = Math.max(
        0.5,
        Number(giftSoundDuration || 5)
      );

      const fadeIn = Math.min(
        duration,
        Math.max(0.01, Number(giftSoundFadeIn || 0.1))
      );

      const fadeOut = Math.min(
        duration,
        Math.max(0.05, Number(giftSoundFadeOut || 0.8))
      );

      const masterGain = context.createGain();

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, volume * 0.42),
        now + fadeIn
      );

      masterGain.gain.setValueAtTime(
        Math.max(0.0001, volume * 0.42),
        now + Math.max(fadeIn, duration - fadeOut)
      );

      masterGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + duration
      );

      masterGain.connect(context.destination);

      pattern.frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const noteGain = context.createGain();
        const start = now + index * pattern.spacing;

        oscillator.type = pattern.type;
        oscillator.frequency.setValueAtTime(frequency, start);

        if (preset === "bass") {
          oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(30, frequency / 2),
            start + pattern.noteLength
          );
        }

        noteGain.gain.setValueAtTime(0.0001, start);
        noteGain.gain.exponentialRampToValueAtTime(
          0.75,
          start + 0.025
        );
        noteGain.gain.exponentialRampToValueAtTime(
          0.0001,
          start + pattern.noteLength
        );

        oscillator.connect(noteGain);
        noteGain.connect(masterGain);
        oscillator.start(start);
        oscillator.stop(start + pattern.noteLength);
      });
    } catch (error) {
      console.warn("Built-in gift sound could not play:", error);
    }
  };

  const playCustomGiftSound = (volume) => {
    if (!customGiftSound) {
      playBuiltInGiftSound("neon", volume);
      return;
    }

    stopGiftAlertSound();

    try {
      const audio = new Audio(customGiftSound);
      customGiftAudioRef.current = audio;

      const targetVolume = Math.min(1, Math.max(0, volume));
      const duration = Math.max(
        0.5,
        Number(giftSoundDuration || 5)
      );

      const fadeIn = Math.min(
        duration,
        Math.max(0, Number(giftSoundFadeIn || 0))
      );

      const fadeOut = Math.min(
        duration,
        Math.max(0, Number(giftSoundFadeOut || 0))
      );

      audio.preload = "auto";
      audio.volume = fadeIn > 0 ? 0 : targetVolume;

      const beginPlayback = () => {
        const maximumStart = Number.isFinite(audio.duration)
          ? Math.max(0, audio.duration - 0.1)
          : Number(giftSoundStart || 0);

        audio.currentTime = Math.min(
          Math.max(0, Number(giftSoundStart || 0)),
          maximumStart
        );

        audio.play().catch((error) => {
          console.warn("Custom gift sound could not play:", error);
        });

        if (fadeIn > 0) {
          const fadeStarted = Date.now();

          customGiftFadeTimerRef.current = window.setInterval(() => {
            const progress = Math.min(
              1,
              (Date.now() - fadeStarted) / (fadeIn * 1000)
            );

            audio.volume = Math.min(
              1,
              targetVolume * progress
            );

            if (progress >= 1) {
              clearInterval(customGiftFadeTimerRef.current);
            }
          }, 40);
        }

        const fadeOutStart = Math.max(
          0,
          duration - fadeOut
        );

        if (fadeOut > 0) {
          window.setTimeout(() => {
            clearInterval(customGiftFadeTimerRef.current);

            const startingVolume = audio.volume;
            const fadeStarted = Date.now();

            customGiftFadeTimerRef.current = window.setInterval(() => {
              const progress = Math.min(
                1,
                (Date.now() - fadeStarted) / (fadeOut * 1000)
              );

              audio.volume = Math.max(
                0,
                startingVolume * (1 - progress)
              );

              if (progress >= 1) {
                clearInterval(customGiftFadeTimerRef.current);
              }
            }, 40);
          }, fadeOutStart * 1000);
        }

        customGiftStopTimerRef.current = window.setTimeout(() => {
          stopGiftAlertSound();
        }, duration * 1000);
      };

      if (audio.readyState >= 1) {
        beginPlayback();
      } else {
        audio.addEventListener(
          "loadedmetadata",
          beginPlayback,
          { once: true }
        );
      }
    } catch (error) {
      console.warn("Custom gift sound failed:", error);
      playBuiltInGiftSound("neon", volume);
    }
  };

  const playGiftAlertSound = (volumeOverride) => {
    if (giftSoundMuted) return;

    const volume = Math.min(
      1,
      Math.max(
        0,
        Number(volumeOverride ?? giftAlertVolume) / 100
      )
    );

    if (volume <= 0) return;

    if (giftSoundPreset === "custom") {
      playCustomGiftSound(volume);
      return;
    }

    playBuiltInGiftSound(giftSoundPreset, volume);
  };

  const onCustomGiftSoundChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav"
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !/\.(mp3|wav)$/i.test(file.name)
    ) {
      alert("Choose an MP3 or WAV sound file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Choose a sound file under 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const value = String(reader.result || "");

      try {
        localStorage.setItem(
          "streambridge_custom_gift_sound",
          value
        );

        localStorage.setItem(
          "streambridge_custom_gift_sound_name",
          file.name
        );

        localStorage.setItem(
          "streambridge_gift_sound_preset",
          "custom"
        );

        setCustomGiftSound(value);
        setCustomGiftSoundName(file.name);
        setGiftSoundPreset("custom");
      } catch {
        alert(
          "This sound is too large to save. Try a shorter MP3 file."
        );
      }
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const resetGiftSoundMixer = () => {
    stopGiftAlertSound();

    setGiftSoundPreset("neon");
    setGiftAlertVolume(70);
    setGiftSoundMuted(false);
    setGiftSoundStart(0);
    setGiftSoundDuration(5);
    setGiftSoundFadeIn(0.1);
    setGiftSoundFadeOut(0.8);
    setCustomGiftSound("");
    setCustomGiftSoundName("");

    [
      "streambridge_gift_sound_preset",
      "streambridge_gift_alert_volume",
      "streambridge_gift_sound_muted",
      "streambridge_gift_sound_start",
      "streambridge_gift_sound_duration",
      "streambridge_gift_sound_fade_in",
      "streambridge_gift_sound_fade_out",
      "streambridge_custom_gift_sound",
      "streambridge_custom_gift_sound_name"
    ].forEach((key) => localStorage.removeItem(key));
  };
  const showGiftAlert = ({
    username = "TikTok viewer",
    giftName = "TikTok Gift",
    count = 1,
    image = ""
  }) => {
    clearTimeout(giftAlertTimerRef.current);

    setGiftAlert({
      id: `${Date.now()}-${Math.random()}`,
      username: cleanChatText(username).slice(0, 80),
      giftName: cleanChatText(giftName).slice(0, 100),
      count: Math.max(1, Number(count || 1)),
      image: String(image || "")
    });

    playGiftAlertSound();

    giftAlertTimerRef.current = window.setTimeout(() => {
      setGiftAlert(null);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      clearTimeout(giftAlertTimerRef.current);

      if (giftAudioContextRef.current) {
        giftAudioContextRef.current.close().catch(() => {});
      }
    };
  }, []);
  const tiktokSocketRef = useRef(null); const socketRef = useRef(null); const reconnectTimerRef = useRef(null); const reconnectUrlRef = useRef(null); const reconnectingSocketRef = useRef(null); const youtubePollTimerRef = useRef(null); const youtubeNextPageTokenRef = useRef("");
  const recentTikTokMessagesRef = useRef(new Map());
  const tiktokReconnectTimerRef = useRef(null);
  const tiktokManualDisconnectRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mixcloudResult = params.get("mixcloud");
    const mixcloudMessage = params.get("message");

    if (mixcloudResult === "connected") {
      setMixcloudStatus("Mixcloud connected. Checking account...");
      refreshMixcloudStatus();
    } else if (mixcloudResult === "error") {
      setMixcloudConnected(false);
      setMixcloudStatus(
        mixcloudMessage || "Mixcloud could not be connected."
      );
    } else {
      refreshMixcloudStatus();
    }

    if (mixcloudResult) {
      params.delete("mixcloud");
      params.delete("message");

      const query = params.toString();

      const cleanUrl =
        window.location.pathname +
        (query ? `?${query}` : "") +
        window.location.hash;

      window.history.replaceState(
        {},
        document.title,
        cleanUrl
      );
    }
  }, []);

  const refreshMixcloudStatus = async () => {
    try {
      const response = await fetch("/api/mixcloud/status", {
        cache: "no-store"
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMixcloudConnected(false);
        setMixcloudUser("");
        setMixcloudStatus(data.error || "Mixcloud needs reconnecting");
        return;
      }

      const connected = Boolean(data.connected);
      const userName = String(data.displayName || data.userName || "");

      setMixcloudConnected(connected);
      setMixcloudUser(userName);

      setMixcloudStatus(
        connected
          ? `Connected${userName ? ` as ${userName}` : ""}`
          : data.error || "Not connected"
      );

      if (connected) {
        localStorage.setItem(
          "streambridge_mixcloud_configured",
          "true"
        );
      }
    } catch (error) {
      setMixcloudConnected(false);
      setMixcloudUser("");
      setMixcloudStatus(
        `Mixcloud status failed: ${error.message}`
      );
    }
  };

  const refreshKickStatus = async () => {
    try {
      const response = await fetch("/api/kick/status", {
        cache: "no-store"
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setKickConnected(false);
        setKickUser("");
        setKickStatus(data.error || "Kick needs reconnecting");
        return;
      }

      const connected = Boolean(data.connected);

      setKickConnected(connected);
      setKickUser(String(data.userName || ""));
      setKickStatus(
        connected
          ? `Connected${data.userName ? ` as ${data.userName}` : ""}`
          : data.error || "Not connected"
      );

      if (connected) {
        localStorage.setItem("streambridge_kick_configured", "true");
      }
    } catch (error) {
      setKickConnected(false);
      setKickStatus(`Kick status failed: ${error.message}`);
    }
  };

  const connectKick = () => {
    setKickStatus("Opening Kick sign-in...");
    window.location.href = "/auth/kick";
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kickResult = params.get("kick");
    const kickMessage = params.get("message");

    if (kickResult === "connected") {
      setKickStatus("Kick connected. Checking account...");
      refreshKickStatus();
    } else if (kickResult === "error") {
      setKickConnected(false);
      setKickStatus(kickMessage || "Kick could not be connected.");
    } else {
      refreshKickStatus();
    }

    if (kickResult) {
      params.delete("kick");
      params.delete("message");

      const query = params.toString();
      const cleanUrl =
        window.location.pathname +
        (query ? `?${query}` : "") +
        window.location.hash;

      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

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
          if (data.type === "tiktok_viewers") {
            setTiktokViewers(Number(data.viewers || 0));
          }

          if (data.type === "tiktok_status") {
            setTiktokConnected(Boolean(data.connected));
            setTiktokStatus(data.status || "TikTok status updated");
          }
          if (data.type === "tiktok_send_status") setTiktokStatus(data.sent ? "TikTok message sent." : (String(data.status || "").includes("Premium") ? "Incoming TikTok chat is working. Sending replies requires Premium." : data.status || "TikTok message was not sent."));
if (data.type === "tiktok_follow") {
  setMessages((current) => [
    ...current,
    {
      id: `tiktok-follow-${Date.now()}-${Math.random()}`,
      platform: "TikTok",
      username: cleanChatText(data.username || "TikTok viewer").slice(0, 80),
      text: "Followed the LIVE",
    },
  ].slice(-100));
}
if (data.type === "tiktok_join") {
  setMessages((current) => [
    ...current,
    {
      id: `tiktok-join-${Date.now()}-${Math.random()}`,
      platform: "TikTok",
      username: cleanChatText(data.username || "TikTok viewer").slice(0, 80),
      text: "Joined the LIVE",
    },
  ].slice(-100));
}
if (data.type === "tiktok_like") {
  const likeCount = Math.max(0, Number(data.count || 0));
  const likeTotal = Math.max(0, Number(data.total || 0));
  setTiktokLikes((current) => Math.max(current, likeTotal));
  if (likeCount > 0) {
    setMessages((current) => [
      ...current,
      {
        id: `tiktok-like-${Date.now()}-${Math.random()}`,
        platform: "TikTok",
        username: cleanChatText(data.username || "TikTok viewer").slice(0, 80),
        text: `Sent ${likeCount.toLocaleString()} like${likeCount === 1 ? "" : "s"}. Total: ${likeTotal.toLocaleString()}`,
      },
    ].slice(-100));
  }
}
if (data.type === "tiktok_gift") {
  const giftUsername = cleanChatText(data.username || "TikTok viewer").slice(0, 80);
  const giftName = cleanChatText(data.giftName || "TikTok gift").slice(0, 100);
  const giftCount = Math.max(1, Number(data.count || 1));
  setMessages((current) => [
    ...current,
    {
      id: `tiktok-gift-${Date.now()}-${Math.random()}`,
      platform: "TikTok",
      username: giftUsername,
      text: `Sent ${giftName} x${giftCount.toLocaleString()}`,
    },
  ].slice(-100));
}
          if (data.type === "facebook_viewers") {
            setFacebookViewers(Number(data.viewers || 0));
          }

          if (data.type === "facebook_status") {
            setFacebookConnected(Boolean(data.connected));

            if (!data.live) {
              setFacebookViewers(0);
            }
            setFacebookStatus(data.status || (data.connected ? "Facebook connected" : "Facebook not connected"));
          }
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

    const connectMixcloud = () => {
    sessionStorage.setItem("streambridge_setup_in_progress", "true");
    sessionStorage.removeItem("streambridge_setup_complete");
    window.location.href = "/auth/mixcloud";
  };

  const connectFacebook = () => {
    setFacebookStatus("Opening Facebook login...");
    sessionStorage.setItem("streambridge_setup_in_progress", "true");
    sessionStorage.removeItem("streambridge_setup_complete");

      window.location.href =
      window.location.hostname === "localhost"
        ? "http://localhost:3000/auth/facebook"
        : "/auth/facebook";  
  };

  useEffect(() => {
    let cancelled = false;

    const loadFacebookStatus = async () => {
      const query = new URLSearchParams(window.location.search);
      const facebookResult = query.get("facebook");
      const facebookMessage = query.get("message");

      if (facebookResult === "error") {
        setFacebookConnected(false);
        setFacebookPages([]);
        setFacebookStatus(
          facebookMessage
            ? `Facebook connection failed: ${facebookMessage}`
            : "Facebook connection failed."
        );

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        return;
      }

      try {
        if (facebookResult === "connected") {
          setFacebookStatus("Checking Facebook connection...");
        }

        const response = await fetch("/api/facebook/status", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || data.ok === false) {
          throw new Error(
            data.error || "Could not check the Facebook connection."
          );
        }

        if (cancelled) return;

        const connected = Boolean(data.connected);
        const pages = Array.isArray(data.pages) ? data.pages : [];

        setFacebookConnected(connected);
        setFacebookPages(pages);

        if (connected) {
          localStorage.setItem(
            "streambridge_facebook_configured",
            "true"
          );

          const accountName = data.userName
            ? ` as ${data.userName}`
            : "";

          const pageText =
            pages.length === 1
              ? "1 Facebook Page found"
              : `${pages.length} Facebook Pages found`;

          setFacebookStatus(
            `Facebook connected${accountName}. ${pageText}.`
          );
        } else {
          setFacebookStatus(data.error || "Not connected");
        }
      } catch (error) {
        if (cancelled) return;

        setFacebookConnected(false);
        setFacebookPages([]);
        setFacebookStatus(
          error.message || "Could not check the Facebook connection."
        );
      } finally {
        if (facebookResult) {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      }
    };

    loadFacebookStatus();

    return () => {
      cancelled = true;
    };
  }, []);
  const connectTikTok = () => { tiktokManualDisconnectRef.current = false; const username = tiktokUsername.trim().replace(/^@/, ""); if (!username) return setTiktokStatus("Enter a TikTok username first."); if (!tiktokSocketRef.current || tiktokSocketRef.current.readyState !== WebSocket.OPEN) return setTiktokStatus("TikTok server is not ready. Try again in a moment."); localStorage.setItem("tiktok_username", username); setTiktokUsername(username); setTiktokStatus(`Connecting to @${username}...`); tiktokSocketRef.current.send(JSON.stringify({ type: "connect_tiktok", username })); };
  const disconnectTikTok = () => { tiktokManualDisconnectRef.current = true; clearTimeout(tiktokReconnectTimerRef.current); if (tiktokSocketRef.current?.readyState === WebSocket.OPEN) tiktokSocketRef.current.send(JSON.stringify({ type: "disconnect_tiktok" })); setTiktokConnected(false); setTiktokStatus("Not connected"); };
  const connectTwitch = () => { sessionStorage.setItem("streambridge_setup_in_progress", "true"); sessionStorage.removeItem("streambridge_setup_complete"); sessionStorage.removeItem("youtube_oauth_pending"); const redirectUri = window.location.origin + "/"; window.location.href = "https://id.twitch.tv/oauth2/authorize" + "?response_type=token" + `&client_id=${TWITCH_CLIENT_ID}` + `&redirect_uri=${encodeURIComponent(redirectUri)}` + "&scope=user%3Aread%3Achat+user%3Awrite%3Achat&force_verify=true"; };
  const connectYouTube = () => { sessionStorage.setItem("streambridge_setup_in_progress", "true"); sessionStorage.removeItem("streambridge_setup_complete"); const state = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; sessionStorage.setItem("youtube_oauth_pending", "true"); sessionStorage.setItem("youtube_oauth_state", state); const params = new URLSearchParams({ client_id: YOUTUBE_CLIENT_ID, redirect_uri: getYouTubeRedirectUri(), response_type: "token", scope: YOUTUBE_SCOPE, include_granted_scopes: "true", state, prompt: "consent" }); window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`; };
  const disconnectYouTube = () => { sessionStorage.removeItem("youtube_access_token"); sessionStorage.removeItem("youtube_oauth_pending"); sessionStorage.removeItem("youtube_oauth_state"); setYoutubeConnected(false); setYoutubeLiveChatId(""); setYoutubeStatus("Not connected"); clearTimeout(youtubePollTimerRef.current); };
  const chooseChannel = () => { try { const saved = saveTwitchChannel(twitchChannel); setTwitchChannel(saved); setActiveChannel(saved); setMessages([]); setTwitchStatus(`Channel saved: ${saved}. Connecting...`); } catch (error) { setTwitchStatus(error.message); } };

  useEffect(() => { const hash = new URLSearchParams(window.location.hash.substring(1)); const token = hash.get("access_token"); const error = hash.get("error"); if (!token && !error) return; const youtubePending = sessionStorage.getItem("youtube_oauth_pending") === "true"; if (youtubePending) { const expectedState = sessionStorage.getItem("youtube_oauth_state"); const returnedState = hash.get("state"); sessionStorage.removeItem("youtube_oauth_pending"); sessionStorage.removeItem("youtube_oauth_state"); if (error) setYoutubeStatus(`YouTube connection failed: ${error}`); else if (!expectedState || returnedState !== expectedState) setYoutubeStatus("YouTube connection stopped because the security check failed."); else { sessionStorage.setItem("youtube_access_token", token); localStorage.setItem("streambridge_youtube_configured", "true"); sessionStorage.setItem("streambridge_setup_in_progress", "true"); setStartupFinished(true); setShowLiveChat(false); setYoutubeConnected(true); setYoutubeStatus("YouTube connected. Looking for an active live broadcast..."); } } else if (token) {
  sessionStorage.setItem("twitch_access_token", token);
  localStorage.setItem("streambridge_twitch_configured", "true");

  localStorage.setItem("streambridge_setup_complete", "true");
  sessionStorage.setItem("streambridge_setup_complete", "true");
  sessionStorage.removeItem("streambridge_setup_in_progress");

  setStartupFinished(true);
  setSetupComplete(true);
  setShowLiveChat(false);
} window.history.replaceState({}, document.title, window.location.pathname); }, []);

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

  useEffect(() => {
    if (!youtubeConnected) {
      setYoutubeViewers(0);
      return;
    }

    const token = sessionStorage.getItem("youtube_access_token");

    if (!token) {
      setYoutubeViewers(0);
      return;
    }

    let cancelled = false;
    let timer = null;

    const loadYouTubeViewers = async () => {
      try {
        const broadcastResponse = await fetch(
          `${YOUTUBE_API}/liveBroadcasts?part=snippet&broadcastStatus=active&broadcastType=all&maxResults=5`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!broadcastResponse.ok) {
          throw new Error(
            `YouTube broadcast request failed: ${broadcastResponse.status}`
          );
        }

        const broadcastData = await broadcastResponse.json();

        const broadcast = (broadcastData.items || []).find(
          (item) => item.snippet?.liveChatId
        );

        if (!broadcast?.id) {
          if (!cancelled) {
            setYoutubeViewers(0);
          }
        } else {
          const videoResponse = await fetch(
            `${YOUTUBE_API}/videos?part=liveStreamingDetails&id=${encodeURIComponent(broadcast.id)}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!videoResponse.ok) {
            throw new Error(
              `YouTube viewer request failed: ${videoResponse.status}`
            );
          }

          const videoData = await videoResponse.json();

          if (!cancelled) {
            const viewers =
              videoData.items?.[0]?.liveStreamingDetails?.concurrentViewers;

            setYoutubeViewers(
              viewers !== undefined ? Number(viewers) : 0
            );
          }
        }
      } catch (error) {
        console.warn("YouTube viewer count error:", error);

        if (!cancelled) {
          setYoutubeViewers(0);
        }
      }

      if (!cancelled) {
        timer = window.setTimeout(loadYouTubeViewers, 30000);
      }
    };

    loadYouTubeViewers();

    return () => {
      cancelled = true;

      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [youtubeConnected]);

    useEffect(() => {
    if (!twitchConnected || !twitchUser?.broadcaster_user_id) {
      setTwitchViewers(0);
      return;
    }

    const token = sessionStorage.getItem("twitch_access_token");
    if (!token) {
      setTwitchViewers(0);
      return;
    }

    let cancelled = false;
    let timer = null;

    const loadTwitchViewers = async () => {
      try {
        const response = await fetch(
          `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(twitchUser.broadcaster_user_id)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Client-Id": TWITCH_CLIENT_ID,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Twitch viewer request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
          const stream = data.data?.[0];
          setTwitchViewers(
            stream ? Number(stream.viewer_count || 0) : 0
          );
        }
      } catch (error) {
        console.warn("Twitch viewer count error:", error);

        if (!cancelled) {
          setTwitchViewers(0);
        }
      }

      if (!cancelled) {
        timer = window.setTimeout(loadTwitchViewers, 30000);
      }
    };

    loadTwitchViewers();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [twitchConnected, twitchUser?.broadcaster_user_id]);
  useEffect(() => {
    if (!kickConnected) {
      setKickViewers(0);
      return;
    }

    let cancelled = false;
    let timer = null;

    const loadKickViewers = async () => {
      try {
        const response = await fetch("/api/kick/status", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || data.ok === false) {
          throw new Error(
            data.error ||
            data.details ||
            `Kick viewer request failed: ${response.status}`
          );
        }

        if (!cancelled) {
          const viewers = Number(data.viewers || 0);

          setKickViewers(
            Number.isFinite(viewers) && viewers >= 0
              ? viewers
              : 0
          );
        }
      } catch (error) {
        console.warn("Kick viewer count error:", error);

        if (!cancelled) {
          setKickViewers(0);
        }
      }

      if (!cancelled) {
        timer = window.setTimeout(loadKickViewers, 30000);
      }
    };

    loadKickViewers();

    return () => {
      cancelled = true;

      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [kickConnected]);

const sendTwitchMessage = async (textOverride) => { const text = (textOverride ?? chatInput).trim(); const token = sessionStorage.getItem("twitch_access_token"); if (!text || !token || !twitchUser?.broadcaster_user_id) throw new Error("Twitch is not ready to send."); const response = await fetch("https://api.twitch.tv/helix/chat/messages", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Client-Id": TWITCH_CLIENT_ID, "Content-Type": "application/json" }, body: JSON.stringify({ broadcaster_id: twitchUser.broadcaster_user_id, sender_id: twitchUser.user_id, message: text }) }); const result = await response.json(); if (!response.ok || !result.data?.[0]?.is_sent) throw new Error(result.data?.[0]?.drop_reason?.message || "Twitch message was not sent"); };
  const sendYouTubeMessage = async (textOverride) => { const text = (textOverride ?? chatInput).trim(); const token = sessionStorage.getItem("youtube_access_token"); if (!text || !token || !youtubeLiveChatId) throw new Error("YouTube is not ready to send."); const response = await fetch(`${YOUTUBE_API}/liveChat/messages?part=snippet`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ snippet: { liveChatId: youtubeLiveChatId, type: "textMessageEvent", textMessageDetails: { messageText: text } } }) }); if (!response.ok) { const details = await response.text(); throw new Error(details || "YouTube message was not sent"); } };
  const sendFacebookMessage = async (textOverride) => {
    const text = cleanChatText(textOverride ?? chatInput).trim();
    if (!text) throw new Error("Enter a Facebook message first.");
    if (!facebookConnected) throw new Error("Facebook is not connected.");

    setFacebookStatus("Sending Facebook Live comment...");
    const response = await fetch("/api/facebook/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }

    if (!response.ok || data.ok === false || !data.sent) {
      const detail = data.error || raw || `Facebook returned HTTP ${response.status}.`;
      throw new Error(detail);
    }

    setFacebookStatus(data.status || "Facebook message sent.");
    return data;
  };
  const sendTikTokMessage = async (textOverride) => { const text = (textOverride ?? chatInput).trim(); const socket = tiktokSocketRef.current; if (!text) throw new Error("Enter a TikTok message first."); if (!tiktokConnected || !socket || socket.readyState !== WebSocket.OPEN) throw new Error("TikTok is not ready to send."); socket.send(JSON.stringify({ type: "send_tiktok_message", text })); };
  const sendKickMessage = async (textOverride) => {
    const text = cleanChatText(textOverride ?? chatInput).trim();

    if (!text) {
      throw new Error("Enter a Kick message first.");
    }

    if (!kickConnected) {
      throw new Error("Kick is not connected.");
    }

    const response = await fetch("/api/kick/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok || !data.sent) {
      throw new Error(data.error || "The Kick message could not be sent.");
    }

    setKickStatus("Message sent to Kick.");
  };

  const sendSelectedMessage = async () => {
    const text = cleanChatText(expandEmojiWords(chatInput)).trim();
    if (!text) return;

    try {
      if (sendTarget === "twitch") await sendTwitchMessage(text);
      if (sendTarget === "youtube") await sendYouTubeMessage(text);
      if (sendTarget === "tiktok") await sendTikTokMessage(text);
      if (sendTarget === "facebook") await sendFacebookMessage(text);
      if (sendTarget === "kick") await sendKickMessage(text);
      if (sendTarget === "all") {
        const sends = [];
        if (twitchConnected && activeChannel) sends.push(sendTwitchMessage(text));
        if (youtubeConnected && youtubeLiveChatId) sends.push(sendYouTubeMessage(text));
        if (facebookConnected) sends.push(sendFacebookMessage(text));
        if (kickConnected) sends.push(sendKickMessage(text));
        if (!sends.length) throw new Error("No chat platforms are ready to send.");
        await Promise.all(sends);
      }
      setChatInput("");
    } catch (error) {
      if (sendTarget === "kick") setKickStatus(`Send failed: ${error.message}`);
      else if (sendTarget === "facebook") setFacebookStatus(`Send failed: ${error.message}`);
      else if (sendTarget === "youtube") setYoutubeStatus(`Send failed: ${error.message}`);
      else if (sendTarget === "tiktok") setTiktokStatus(`Send failed: ${error.message}`);
      else if (sendTarget === "all") setFacebookStatus(`Send failed: ${error.message}`);
      else setTwitchStatus(`Send failed: ${error.message}`);
    }
  };

  const enabled = useMemo(() => platforms.filter((p) => p.enabled), [platforms]); const ready = enabled.length > 0 && enabled.every((p) => p.key.trim().length > 5); const update = (id, patch) => setPlatforms((items) => items.map((p) => p.id === id ? { ...p, ...patch } : p)); const finishSetup = () => { localStorage.setItem("streambridge_setup_complete", "true"); sessionStorage.setItem("streambridge_setup_complete", "true"); sessionStorage.removeItem("streambridge_setup_in_progress"); setSetupComplete(true); };
  const canSend = Boolean(chatInput.trim()) && (
    (sendTarget === "twitch" && twitchConnected && activeChannel) ||
    (sendTarget === "youtube" && youtubeConnected && youtubeLiveChatId) ||
    (sendTarget === "tiktok" && tiktokConnected) ||
    (sendTarget === "facebook" && facebookConnected) ||
    (sendTarget === "kick" && kickConnected) ||
    (sendTarget === "all" && ((twitchConnected && activeChannel) || (youtubeConnected && youtubeLiveChatId) || facebookConnected || kickConnected))
  );
  if (safetyPage) {
    const safetyContent = {
      privacy: {
        title: "Privacy Notice",
        paragraphs: [
          "DavaBridge is an adults-only streaming control and combined-chat application.",
          "The age screen stores an 18+ confirmation in this browser on this device so the screen does not appear again after confirmation. DavaBridge does not request a date of birth, identity document or biometric information for this confirmation.",
          "Platform access tokens and preferences used by this version are stored in browser session or local storage. Do not use DavaBridge on a shared or public device.",
          "Connected platforms process account and chat information under their own privacy terms. DavaBridge should publish complete business contact, retention, deletion and user-rights information before public release.",
          "This draft notice is product text, not a substitute for a reviewed legal privacy policy."
        ]
      },
      terms: {
        title: "Terms of Use",
        paragraphs: [
          "You must be at least 18 years old to access or use DavaBridge.",
          "You must use only accounts and channels that you own or are authorised to manage, and you must follow the rules of every connected streaming platform.",
          "Do not use DavaBridge for unlawful activity, harassment, exploitation, evasion of platform safeguards or distribution of harmful content.",
          "Access may be refused or withdrawn when these conditions are breached. Features may depend on third-party platforms and are not guaranteed to remain available.",
          "These are draft product terms and should be reviewed for the countries where DavaBridge will be offered before public release."
        ]
      },
      safety: {
        title: "Safety and Child Protection",
        paragraphs: [
          "DavaBridge is intended only for adults aged 18 or over. Anyone under 18 must not continue past the age screen.",
          "The current control is self-confirmation, not identity or document verification. A person could provide a false answer, so this control alone cannot guarantee that every user is an adult.",
          "DavaBridge does not ask children to provide personal information and does not include a child account or child mode.",
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
    return <StartupScreen onContinue={() => setStartupFinished(true)} onSkipSetup={() => { localStorage.setItem("streambridge_setup_complete", "true"); sessionStorage.setItem("streambridge_setup_complete", "true"); sessionStorage.removeItem("streambridge_setup_in_progress"); setStartupFinished(true); setSetupComplete(true); }} />;
  }

  if (!ageVerified) return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box", background: "radial-gradient(circle at 50% 10%, rgba(124,58,237,.28), transparent 34%), linear-gradient(145deg, #070912 0%, #0b1020 48%, #080b16 100%)", color: "white", fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "min(540px, 100%)", textAlign: "center", background: "rgba(12,17,34,.94)", border: "1px solid rgba(167,139,250,.55)", borderRadius: 28, padding: "36px 30px", boxShadow: "0 0 35px rgba(124,58,237,.18), 0 28px 80px rgba(0,0,0,.55)", backdropFilter: "blur(16px)" }}>
        <div style={{ width: 88, height: 88, margin: "0 auto 22px", display: "grid", placeItems: "center", borderRadius: "50%", background: "linear-gradient(135deg, rgba(124,58,237,.28), rgba(37,99,235,.22))", border: "2px solid #8b5cf6", boxShadow: "0 0 30px rgba(139,92,246,.4)", fontSize: "2rem", fontWeight: 900 }}>18+</div>
        <p style={{ margin: "0 0 8px", color: "#a78bfa", fontWeight: 900, letterSpacing: 3, fontSize: ".78rem" }}>DAVABRIDGE</p>
        <h1 style={{ margin: "0 0 14px", fontSize: "clamp(1.8rem, 6vw, 2.5rem)", lineHeight: 1.12 }}>Age & Safety</h1>
        <p style={{ color: "#cbd5e1", lineHeight: 1.65, margin: "0 auto 10px", maxWidth: 440 }}>DavaBridge is intended for adults aged 18 or over.</p>
        <p style={{ color: "#94a3b8", lineHeight: 1.55, margin: "0 auto 26px", maxWidth: 440, fontSize: ".92rem" }}>Please confirm that you are 18 or older before continuing.</p>
               <label style={{ display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left", padding: "14px 16px", margin: "0 0 14px", borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(167,139,250,.28)", color: "#dbe4f3", lineHeight: 1.5, cursor: "pointer" }}>
          <input type="checkbox" checked={ageAgreementChecked} onChange={(event) => setAgeAgreementChecked(event.target.checked)} style={{ marginTop: 4, width: 18, height: 18, accentColor: "#7c3aed", flex: "0 0 auto" }} />
          <span>I confirm that I am 18 or over. I understand that DavaBridge is an 18+ service only, and I agree to the Terms of Use and Privacy Notice.</span>
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
  if (!setupComplete) {
    const twitchAuthorised = Boolean(sessionStorage.getItem("twitch_access_token"));
    const youtubeAuthorised = Boolean(sessionStorage.getItem("youtube_access_token"));

    const completeSetup = (openChat = true) => {
      localStorage.setItem("streambridge_setup_complete", "true");
      sessionStorage.setItem("streambridge_setup_complete", "true");
      sessionStorage.removeItem("streambridge_setup_in_progress");
      setSetupComplete(true);
      setShowLiveChat(openChat);
    };

    const platformCard = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      padding: "18px 20px",
      borderRadius: 18,
      border: "1px solid rgba(103,232,249,.24)",
      background: "linear-gradient(145deg, rgba(20,30,55,.96), rgba(8,13,28,.96))",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 12px 28px rgba(0,0,0,.28)",
      flexWrap: "wrap"
    };
    const connectionButton = {
      ...themedButtonStyle,
      minWidth: 130,
      padding: "12px 18px",
      textShadow: "0 2px 2px rgba(0,0,0,.65)"
    };
    const badge = (connected) => ({
      minWidth: 130,
      padding: "10px 14px",
      borderRadius: 999,
      textAlign: "center",
      fontWeight: 900,
      color: connected ? "#86efac" : "#94a3b8",
      border: connected ? "1px solid rgba(74,222,128,.65)" : "1px solid rgba(148,163,184,.3)",
      background: connected ? "rgba(34,197,94,.14)" : "rgba(148,163,184,.08)"
    });

    return (
      <main style={{ minHeight: "100vh", width: "100%", maxWidth: "none", margin: 0, padding: "24px 16px", boxSizing: "border-box", display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 0%, rgba(14,165,233,.20), transparent 34%), linear-gradient(145deg, #050914 0%, #081225 50%, #040712 100%)", color: "white", fontFamily: "Arial, sans-serif" }}>
        <section style={{ width: "min(780px, 100%)", padding: "clamp(20px, 4vw, 36px)", borderRadius: 28, border: "1px solid rgba(34,211,238,.45)", background: "rgba(5,10,24,.95)", boxShadow: "0 0 45px rgba(34,211,238,.12), 0 30px 90px rgba(0,0,0,.58)", boxSizing: "border-box" }}>
          <header style={{ display: "block", textAlign: "center", marginBottom: 26 }}>
            <p style={{ margin: "0 0 8px", color: "#67e8f9", fontWeight: 900, letterSpacing: 3, fontSize: ".78rem" }}>DAVABRIDGE</p>
            <h1 style={{ margin: "0 0 10px", fontSize: "clamp(2rem, 7vw, 3.2rem)", lineHeight: 1.05 }}>Connect Platforms</h1>
            <p style={{ margin: "0 auto", maxWidth: 590, color: "#b8c5db", lineHeight: 1.6 }}>Connect the platforms you want DavaBridge to bring together. You can change connections later in Settings.</p>
          </header>

          <div style={{ display: "grid", gap: 14 }}>
            <article style={platformCard}>
              <div style={{ flex: "1 1 260px" }}>
                <strong style={{ fontSize: "1.08rem" }}>Twitch</strong>
                <div style={{ color: "#94a3b8", fontSize: ".86rem", marginTop: 5 }}>Send and receive Twitch chat</div>
                {twitchAuthorised && !activeChannel && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <input type="text" aria-label="Twitch channel name" placeholder="Twitch channel name" value={twitchChannel} onChange={(event) => setTwitchChannel(event.target.value)} onKeyDown={(event) => event.key === "Enter" && chooseChannel()} style={{ flex: "1 1 200px", padding: "11px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,.35)", background: "#070d1b", color: "white" }} />
                    <button type="button" onClick={chooseChannel} style={connectionButton}>SAVE CHANNEL</button>
                  </div>
                )}
                {twitchAuthorised && <div style={{ color: "#94a3b8", fontSize: ".78rem", marginTop: 7 }}>{twitchStatus}</div>}
              </div>
              {twitchAuthorised ? <div style={badge(true)}>CONNECTED</div> : <button type="button" onClick={connectTwitch} style={connectionButton}>CONNECT</button>}
            </article>

            <article style={platformCard}>
              <div><strong style={{ fontSize: "1.08rem" }}>YouTube</strong><div style={{ color: "#94a3b8", fontSize: ".86rem", marginTop: 5 }}>Send and receive YouTube live chat</div></div>
              {youtubeAuthorised ? <div style={badge(true)}>CONNECTED</div> : <button type="button" onClick={connectYouTube} style={connectionButton}>CONNECT</button>}
            </article>

            <article style={platformCard}>
              <div style={{ flex: "1 1 260px" }}>
                <strong style={{ fontSize: "1.08rem" }}>TikTok</strong>
                <div style={{ color: "#94a3b8", fontSize: ".86rem", marginTop: 5 }}>Receive TikTok live messages</div>
                {!tiktokConnected && <input type="text" aria-label="TikTok username" placeholder="TikTok username" value={tiktokUsername} onChange={(event) => setTiktokUsername(cleanChatText(event.target.value).replace(/^@/, ""))} style={{ width: "100%", maxWidth: 300, marginTop: 10, padding: "11px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,.35)", background: "#070d1b", color: "white", boxSizing: "border-box" }} />}
                <div style={{ color: "#94a3b8", fontSize: ".78rem", marginTop: 7 }}>{tiktokStatus}</div>
              </div>
              {tiktokConnected ? <div style={badge(true)}>CONNECTED</div> : <button type="button" onClick={connectTikTok} style={connectionButton}>CONNECT</button>}
            </article>

            <article style={platformCard}>
  <div>
    <strong style={{ fontSize: "1.08rem" }}>Facebook Live / Meta</strong>
    <div style={{ color: "#94a3b8", fontSize: ".86rem", marginTop: 5 }}>Connect Facebook Live</div>
    <div style={{ color: "#94a3b8", fontSize: ".78rem", marginTop: 7 }}>{facebookStatus}</div>
  </div>
  {facebookConnected ? <div style={badge(true)}>CONNECTED</div> : <button type="button" onClick={connectFacebook} style={connectionButton}>CONNECT</button>}
</article>

<article style={platformCard}>
  <div>
    <strong style={{ fontSize: "1.08rem" }}>Kick</strong>
    <div style={{ color: "#94a3b8", fontSize: ".86rem", marginTop: 5 }}>
      Send and receive Kick chat
    </div>
    <div style={{ color: "#94a3b8", fontSize: ".78rem", marginTop: 7 }}>
      {kickStatus}
    </div>
  </div>
  {kickConnected
    ? <div style={badge(true)}>CONNECTED</div>
    : <button type="button" onClick={connectKick} style={connectionButton}>CONNECT</button>}
</article>

<article style={platformCard}>
  <div>
    <strong style={{ fontSize: "1.08rem" }}>Mixcloud</strong>

    <div style={{ color: "#94a3b8", fontSize: ".86rem", marginTop: 5 }}>
      Connect your Mixcloud account
    </div>

    <div style={{ color: "#94a3b8", fontSize: ".78rem", marginTop: 7 }}>
      {mixcloudStatus}
    </div>
  </div>

  {mixcloudConnected
    ? <div style={badge(true)}>CONNECTED</div>
    : (
      <button
        type="button"
        onClick={connectMixcloud}
        style={connectionButton}
      >
        CONNECT
      </button>
    )}
</article>
          </div>

          <div style={{ display: "grid", gap: 11, marginTop: 24 }}>
            <button type="button" onClick={() => completeSetup(true)} style={{ ...themedButtonStyle, width: "100%", padding: "16px 20px", fontSize: "1rem", background: "linear-gradient(180deg, #3b82f6 0%, #0865e8 100%)", border: "1px solid #60a5fa" }}>CONTINUE TO COMBINED CHAT</button>
            <button type="button" onClick={() => completeSetup(false)} style={{ width: "100%", border: "1px solid rgba(148,163,184,.28)", borderRadius: 14, padding: "13px 18px", color: "#cbd5e1", background: "rgba(15,23,42,.7)", fontWeight: 800, cursor: "pointer" }}>SKIP SETUP FOR NOW</button>
          </div>
          <p style={{ margin: "18px 0 0", color: "#64748b", textAlign: "center", fontSize: ".78rem" }}>Connected platforms and ordinary preferences are remembered on this device.</p>
        </section>
      </main>
    );
  }

  if (showLiveChat) return <LiveChatScreen t={t} messages={messages} onBack={() => setShowLiveChat(false)} messageText={chatInput} setMessageText={setChatInput} onSend={sendSelectedMessage} canSend={canSend} twitchStatus={twitchStatus} youtubeStatus={youtubeStatus} tiktokStatus={tiktokStatus} facebookStatus={facebookStatus} kickStatus={kickStatus} mixcloudStatus={mixcloudStatus} twitchConnected={twitchConnected} youtubeConnected={youtubeConnected} facebookConnected={facebookConnected} kickConnected={kickConnected} mixcloudConnected={mixcloudConnected} twitchViewers={twitchViewers} youtubeViewers={youtubeViewers} facebookViewers={facebookViewers} kickViewers={kickViewers} mixcloudViewers={mixcloudViewers} tiktokViewers={tiktokViewers} tiktokLikes={tiktokLikes} sendTarget={sendTarget} setSendTarget={setSendTarget} tiktokConnected={tiktokConnected} accentColor={accentColor} theme={theme} largeText={largeText} highContrast={highContrast} announceMessages={announceMessages} chatBackground={chatBackground} onChatBackgroundChange={onChatBackgroundChange} onClearChatBackground={clearChatBackground} twitchMessageColor={twitchMessageColor} youtubeMessageColor={youtubeMessageColor} tiktokMessageColor={tiktokMessageColor} messageBackgroundColor={messageBackgroundColor} messageTextColor={messageTextColor} giftAlert={giftAlert} />;

  const startProCheckout = async () => {
  try {
    const response = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.ok || !data.url) {
      throw new Error(
        data.error || "Could not start DavaBridge Pro checkout."
      );
    }

    window.location.href = data.url;
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Could not start DavaBridge Pro checkout."
    );
  }
};
const connectAll = () => {
    const twitchToken = sessionStorage.getItem("twitch_access_token");
    const youtubeToken = sessionStorage.getItem("youtube_access_token");
    const savedTikTokUsername = localStorage.getItem("tiktok_username") || "";
const facebookConfigured =
  localStorage.getItem("streambridge_facebook_configured") === "true" ||
  facebookConnected;
    const twitchConfigured =
      localStorage.getItem("streambridge_twitch_configured") === "true" ||
      Boolean(twitchToken) ||
      Boolean(activeChannel);
    const youtubeConfigured =
      localStorage.getItem("streambridge_youtube_configured") === "true" ||
      Boolean(youtubeToken);

    if (twitchToken && activeChannel) {
      setTwitchStatus(`Reconnecting to ${activeChannel}'s Twitch chat...`);
      setActiveChannel("");
      window.setTimeout(() => setActiveChannel(activeChannel), 50);
    } else if (twitchConfigured) {
      setTwitchStatus("Twitch is remembered. Sign in again to renew the connection.");
    }

    if (youtubeToken) {
      clearTimeout(youtubePollTimerRef.current);
      youtubeNextPageTokenRef.current = "";
      setYoutubeStatus("Reconnecting to YouTube and checking for a live chat...");
      setYoutubeConnected(false);
      window.setTimeout(() => setYoutubeConnected(true), 50);
    } else if (youtubeConfigured) {
      setYoutubeStatus("YouTube is remembered. Sign in again to renew the connection.");
    }
if (facebookConfigured) {
  setFacebookStatus("Checking Facebook connection...");

  fetch("/api/facebook/status", { cache: "no-store" })
    .then((response) => response.json())
    .then((data) => {
      const connected = Boolean(data.connected);
      const pages = Array.isArray(data.pages) ? data.pages : [];

      setFacebookConnected(connected);
      setFacebookPages(pages);

      if (connected) {
        localStorage.setItem("streambridge_facebook_configured", "true");
        setFacebookStatus("Facebook connected");
      } else {
        setFacebookStatus(data.error || "Facebook needs reconnecting");
      }
    })
    .catch((error) => {
      setFacebookConnected(false);
      setFacebookStatus(
        error.message || "Could not check Facebook connection"
      );
    });
}
    if (savedTikTokUsername) {
      tiktokManualDisconnectRef.current = false;
      setTiktokUsername(savedTikTokUsername);

      if (tiktokSocketRef.current?.readyState === WebSocket.OPEN) {
        setTiktokStatus(`Connecting to @${savedTikTokUsername}...`);
        tiktokSocketRef.current.send(JSON.stringify({
          type: "connect_tiktok",
          username: savedTikTokUsername,
        }));
      } else {
        setTiktokStatus(`TikTok @${savedTikTokUsername} is remembered. Waiting for the server...`);
      }
    }

    const needsTwitchLogin = twitchConfigured && !twitchToken;
    const needsYouTubeLogin = youtubeConfigured && !youtubeToken;
    const nothingConfigured =
  !twitchConfigured &&
  !youtubeConfigured &&
  !facebookConfigured &&
  !savedTikTokUsername;

    if (nothingConfigured) {
  openConnections();
  return;
}

    // Stay on Home while platform reconnections settle.
    // Use the live indicators below to see when each platform is ready.
  };
  const openConnections = () => {
    localStorage.removeItem("streambridge_setup_complete");
    sessionStorage.removeItem("streambridge_setup_complete");
    sessionStorage.setItem("streambridge_setup_in_progress", "true");
    setSetupComplete(false);
    setShowLiveChat(false);
  };
const homeCard = {
    width: "min(920px, 100%)",
    border: `1px solid ${lighterAccent}88`,
    borderRadius: 28,
    padding: "clamp(22px, 5vw, 46px)",
    background: "linear-gradient(145deg, rgba(10,16,36,.96), rgba(4,8,20,.97))",
    boxShadow: `0 0 45px ${accentColor}22, 0 30px 90px rgba(0,0,0,.58)`,
    boxSizing: "border-box",
  };

  const secondaryButtonStyle = {
    width: "100%",
    border: "1px solid rgba(148,163,184,.32)",
    borderRadius: 14,
    padding: "15px 20px",
    color: "#e2e8f0",
    background: "linear-gradient(180deg, rgba(30,41,59,.92), rgba(10,15,29,.96))",
    fontWeight: 900,
    fontSize: "1rem",
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.10), 0 7px 16px rgba(0,0,0,.30)",
  };

  return (
    <main style={{
      minHeight: "100vh",
      width: "100%",
      padding: "24px 16px",
      boxSizing: "border-box",
      display: "grid",
      placeItems: "center",
      background: appBackground
        ? `linear-gradient(rgba(4,8,20,.76), rgba(4,8,20,.82)), url(${appBackground}) center / cover fixed`
        : themedPageBackground,
      color: highContrast ? "#fff" : (theme === "light" ? "#111827" : "white"),
      fontFamily: "Arial, sans-serif",
      fontSize: largeText ? "125%" : "100%",
    }}>
      <section style={homeCard}>
        <header style={{ textAlign: "center", marginBottom: 30 }}>
          <img
            src="/davabridge-icon.png"
            alt="DavaBridge"
            style={{ width: 96, height: 96, objectFit: "contain", borderRadius: 22, marginBottom: 16 }}
          />
          <p style={{ margin: "0 0 10px", color: lighterAccent, fontWeight: 900, letterSpacing: 4, fontSize: ".78rem" }}>
            DAVABRIDGE
          </p>
          <h1 style={{ margin: "0 0 12px", fontSize: "clamp(2.25rem, 8vw, 4.5rem)", lineHeight: 1.02 }}>
            All your chats. One place.
          </h1>
          <p style={{ margin: "0 auto", maxWidth: 620, color: theme === "light" ? "#475569" : "#b8c5db", lineHeight: 1.65, fontSize: "1.05rem" }}>
            {t("homeSubtitle")}
          </p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 18 }}>
          <button type="button" onClick={connectAll} style={{ ...themedButtonStyle, width: "100%", padding: "17px 20px", fontSize: "1rem" }}>
            {t("connectAll")}
          </button>
          <button type="button" onClick={() => setShowLiveChat(true)} style={secondaryButtonStyle}>
            {t("combinedChat")}
          </button>
        </div>
<section style={{ marginBottom: 22, padding: "22px", borderRadius: 20, textAlign: "center", border: `1px solid ${lighterAccent}88`, background: "rgba(124,58,237,.12)" }}>
          <div style={{ color: lighterAccent, fontWeight: 900 }}>DAVABRIDGE PRO</div>
          <h2>Unlock DavaBridge Pro</h2>
          <p style={{ fontSize: "1.25rem", fontWeight: 900 }}>£4.99 / month</p>
          <p>Upgrade to DavaBridge Pro and unlock premium DavaBridge features.</p>
          <button type="button" onClick={startProCheckout} style={{ ...themedButtonStyle, width: "100%", maxWidth: 360 }}>
            UPGRADE TO PRO - £4.99/MONTH
          </button>
        </section>
        <details style={{ border: "1px solid rgba(148,163,184,.22)", borderRadius: 18, background: "rgba(15,23,42,.66)", overflow: "hidden" }}>
          <summary style={{ padding: "17px 20px", cursor: "pointer", fontWeight: 900, listStylePosition: "inside" }}>
            {t("settingsAppearance")}
          </summary>
          <div style={{ padding: "0 20px 22px", display: "grid", gap: 18 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <label>
                <b>{t("language")} </b>
                <select
                  value={languageMode}
                  onChange={(event) => changeLanguage(event.target.value)}
                >
                  <option value="auto">{t("automatic")}</option>
                  {Object.entries(supportedLanguages).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label><b>Theme </b>
                <select value={theme} onChange={(event) => changeTheme(event.target.value)}>
                  <option value="dark">Dark</option>
                  <option value="purple">Neon Purple</option>
                  <option value="blue">Electric Blue</option>
                  <option value="fire">Red / Orange</option>
                  <option value="green">Cyber Green</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <label><b>Pick your colour </b>
                <input type="color" value={accentColor} onChange={(event) => { setAccentColor(event.target.value); localStorage.setItem("streambridge_accent", event.target.value); }} />
              </label>
              <label style={{ ...themedButtonStyle, display: "inline-block" }}>
                Add app background
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onAppBackgroundChange} style={{ display: "none" }} />
              </label>
              {appBackground && <button type="button" onClick={clearAppBackground} style={secondaryButtonStyle}>Remove app background</button>}
            </div>

            <fieldset style={{ borderRadius: 14, border: `1px solid ${accentColor}66`, padding: 16 }}>
              <legend><b>Accessibility</b></legend>
              <label><input type="checkbox" checked={largeText} onChange={(event) => { setLargeText(event.target.checked); localStorage.setItem("streambridge_large_text", String(event.target.checked)); }} /> Large text</label><br />
              <label><input type="checkbox" checked={highContrast} onChange={(event) => { setHighContrast(event.target.checked); localStorage.setItem("streambridge_high_contrast", String(event.target.checked)); }} /> High contrast</label><br />
              <label><input type="checkbox" checked={announceMessages} onChange={(event) => { setAnnounceMessages(event.target.checked); localStorage.setItem("streambridge_announce_messages", String(event.target.checked)); }} /> Read new chat messages aloud</label>
            </fieldset>

            <fieldset style={{ borderRadius: 14, border: `1px solid ${accentColor}66`, padding: 16 }}>
              <legend><b>Chat colours</b></legend>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <label>Twitch <input type="color" value={twitchMessageColor} onChange={(event) => { setTwitchMessageColor(event.target.value); localStorage.setItem("streambridge_twitch_message_color", event.target.value); }} /></label>
                <label>YouTube <input type="color" value={youtubeMessageColor} onChange={(event) => { setYoutubeMessageColor(event.target.value); localStorage.setItem("streambridge_youtube_message_color", event.target.value); }} /></label>
                <label>TikTok <input type="color" value={tiktokMessageColor} onChange={(event) => { setTiktokMessageColor(event.target.value); localStorage.setItem("streambridge_tiktok_message_color", event.target.value); }} /></label>
                <label>Message box <input type="color" value={messageBackgroundColor} onChange={(event) => { setMessageBackgroundColor(event.target.value); localStorage.setItem("streambridge_message_background_color", event.target.value); }} /></label>
                <label>Message text <input type="color" value={messageTextColor} onChange={(event) => { setMessageTextColor(event.target.value); localStorage.setItem("streambridge_message_text_color", event.target.value); }} /></label>
              </div>
            </fieldset>

            <fieldset style={{
              borderRadius: 18,
              border: `1px solid ${accentColor}88`,
              padding: 18,
              background: "linear-gradient(145deg, rgba(20,30,55,.82), rgba(7,12,26,.92))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)"
            }}>
              <legend>
                <b>Gift Sound Mixer</b>
                <span style={{
                  marginLeft: 8,
                  color: "#facc15",
                  fontSize: ".76rem"
                }}>
                  PRO
                </span>
              </legend>

              <div style={{ display: "grid", gap: 16 }}>
                <label style={{ display: "grid", gap: 7 }}>
                  <b>Alert sound</b>

                  <select
                    value={giftSoundPreset}
                    onChange={(event) => {
                      const value = event.target.value;
                      setGiftSoundPreset(value);
                      localStorage.setItem(
                        "streambridge_gift_sound_preset",
                        value
                      );
                    }}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 11,
                      border: "1px solid rgba(148,163,184,.35)",
                      background: "#070d1b",
                      color: "white",
                      fontWeight: 800
                    }}
                  >
                    <option value="neon">DavaBridge Neon</option>
                    <option value="arcade">Arcade</option>
                    <option value="magic">Magic</option>
                    <option value="bass">Bass Drop</option>
                    <option value="celebration">Celebration</option>
                    <option
                      value="custom"
                      disabled={!customGiftSound}
                    >
                      Custom uploaded sound
                    </option>
                  </select>
                </label>

                <label style={{
                  ...themedButtonStyle,
                  display: "block",
                  textAlign: "center"
                }}>
                  UPLOAD YOUR OWN MP3 / WAV

                  <input
                    type="file"
                    accept=".mp3,.wav,audio/mpeg,audio/wav"
                    onChange={onCustomGiftSoundChange}
                    style={{ display: "none" }}
                  />
                </label>

                <div style={{
                  color: customGiftSoundName
                    ? "#86efac"
                    : "#94a3b8",
                  fontSize: ".84rem",
                  overflowWrap: "anywhere"
                }}>
                  {customGiftSoundName
                    ? `Loaded: ${customGiftSoundName}`
                    : "No custom sound uploaded. Maximum file size: 2 MB."}
                </div>

                <label style={{ display: "grid", gap: 7 }}>
                  <b>Master volume: {giftAlertVolume}%</b>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={giftAlertVolume}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setGiftAlertVolume(value);
                      localStorage.setItem(
                        "streambridge_gift_alert_volume",
                        String(value)
                      );
                    }}
                    style={{ width: "100%", accentColor }}
                  />
                </label>

                <label style={{ display: "grid", gap: 7 }}>
                  <b>Start position: {giftSoundStart.toFixed(1)} sec</b>

                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.1"
                    value={giftSoundStart}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setGiftSoundStart(value);
                      localStorage.setItem(
                        "streambridge_gift_sound_start",
                        String(value)
                      );
                    }}
                    style={{ width: "100%", accentColor }}
                  />
                </label>

                <label style={{ display: "grid", gap: 7 }}>
                  <b>Duration: {giftSoundDuration.toFixed(1)} sec</b>

                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.1"
                    value={giftSoundDuration}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setGiftSoundDuration(value);
                      localStorage.setItem(
                        "streambridge_gift_sound_duration",
                        String(value)
                      );
                    }}
                    style={{ width: "100%", accentColor }}
                  />
                </label>

                <label style={{ display: "grid", gap: 7 }}>
                  <b>Fade in: {giftSoundFadeIn.toFixed(1)} sec</b>

                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={giftSoundFadeIn}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setGiftSoundFadeIn(value);
                      localStorage.setItem(
                        "streambridge_gift_sound_fade_in",
                        String(value)
                      );
                    }}
                    style={{ width: "100%", accentColor }}
                  />
                </label>

                <label style={{ display: "grid", gap: 7 }}>
                  <b>Fade out: {giftSoundFadeOut.toFixed(1)} sec</b>

                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={giftSoundFadeOut}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setGiftSoundFadeOut(value);
                      localStorage.setItem(
                        "streambridge_gift_sound_fade_out",
                        String(value)
                      );
                    }}
                    style={{ width: "100%", accentColor }}
                  />
                </label>

                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: 900
                }}>
                  <input
                    type="checkbox"
                    checked={giftSoundMuted}
                    onChange={(event) => {
                      setGiftSoundMuted(event.target.checked);
                      localStorage.setItem(
                        "streambridge_gift_sound_muted",
                        String(event.target.checked)
                      );
                    }}
                  />

                  Mute gift alert sounds
                </label>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10
                }}>
                  <button
                    type="button"
                    onClick={() => playGiftAlertSound()}
                    style={secondaryButtonStyle}
                  >
                    PREVIEW SOUND
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowLiveChat(true);

                      window.setTimeout(() => {
                        showGiftAlert({
                          username: "DavaBridge Test",
                          giftName: "Universe",
                          count: 1,
                          image: ""
                        });
                      }, 150);
                    }}
                    style={{
                      ...themedButtonStyle,
                      width: "100%"
                    }}
                  >
                    TEST FULL GIFT ALERT
                  </button>
                </div>

                <button
                  type="button"
                  onClick={resetGiftSoundMixer}
                  style={{
                    ...secondaryButtonStyle,
                    borderColor: "rgba(248,113,113,.42)"
                  }}
                >
                  RESET GIFT SOUND MIXER
                </button>

                <div style={{
                  color: "#94a3b8",
                  fontSize: ".82rem",
                  lineHeight: 1.5
                }}>
                  Preview Sound plays only the selected sound. Test Full
                  Gift Alert opens Combined Chat and runs the complete
                  five-second gift animation behind the chat messages.
                </div>
              </div>
            </fieldset>
            <button type="button" onClick={openConnections} style={secondaryButtonStyle}>MANAGE PLATFORM CONNECTIONS</button>
          </div>
        </details>
      </section>
    </main>
  );
}




































