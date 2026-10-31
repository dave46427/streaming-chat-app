import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import {
  getSavedTwitchChannel,
  saveTwitchChannel,
} from "./twitchChannel";

const TWITCH_CLIENT_ID = "9u6sy8469pnk78b9x5od4qwzlpns50";

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

function LiveChatScreen({ messages, onBack, messageText, setMessageText, onSend, canSend, twitchStatus }) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main style={{ minHeight: "100vh", background: "#0b1020", color: "white", padding: 18, fontFamily: "Arial, sans-serif", boxSizing: "border-box" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={liveButtonStyle}>← Settings</button>
        <div style={{ fontWeight: 800, fontSize: "1.15rem" }}>STREAMBRIDGE LIVE</div>
        <div style={{ color: "#70f0a0", fontWeight: 700 }}>● LIVE CHAT</div>
      </header>

      <section style={{ background: "#111831", border: "1px solid #27304f", borderRadius: 18, height: "calc(100vh - 110px)", minHeight: 430, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #27304f" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>💬 Combined Chat</div>
          <div style={{ color: "#aeb8d4", fontSize: ".85rem", marginTop: 4 }}>{twitchStatus}</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {messages.length === 0 ? (
            <div style={{ color: "#aeb8d4", textAlign: "center", marginTop: 40 }}>Waiting for live messages…</div>
          ) : (
            messages.map((msg, index) => (
              <div key={msg.id ?? index} style={{ padding: "12px 14px", marginBottom: 10, background: "#171f3c", borderRadius: 12, borderLeft: "4px solid #9146ff" }}>
                <div style={{ fontSize: ".8rem", color: "#aeb8d4", marginBottom: 4 }}>
                  {msg.platform ?? "Twitch"} · <strong style={{ color: "#fff" }}>{msg.username ?? "Viewer"}</strong>
                </div>
                <div style={{ fontSize: "1.05rem", overflowWrap: "anywhere" }}>{msg.text ?? ""}</div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={(event) => { event.preventDefault(); onSend(); }} style={{ display: "flex", gap: 10, padding: 14, borderTop: "1px solid #27304f", background: "#0e152b", flexWrap: "wrap" }}>
          <div style={{ alignSelf: "center", fontWeight: 700, minWidth: 70, color: "#bf94ff" }}>Twitch</div>
          <input
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="Type your Twitch message…"
            style={{ flex: "1 1 220px", padding: "12px 14px", borderRadius: 10, border: "1px solid #384261", background: "#151d36", color: "white", fontSize: "1rem" }}
          />
          <button type="submit" disabled={!canSend} style={{ ...liveButtonStyle, background: canSend ? "#7357ff" : "#4b5063", cursor: canSend ? "pointer" : "not-allowed" }}>SEND</button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [setupComplete, setSetupComplete] = useState(
    () => sessionStorage.getItem("streambridge_setup_complete") === "true"
  );
  const [language, setLanguage] = useState("English");
  const [ageMode, setAgeMode] = useState("18+");
  const [twitchConnected, setTwitchConnected] = useState(false);
  const [twitchStatus, setTwitchStatus] = useState("Not connected");
  const [twitchUser, setTwitchUser] = useState(null);
  const [twitchChannel, setTwitchChannel] = useState(() => getSavedTwitchChannel());
  const [activeChannel, setActiveChannel] = useState(() => getSavedTwitchChannel());
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [platforms, setPlatforms] = useState(defaults);
  const [live, setLive] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectUrlRef = useRef(null);
  const reconnectingSocketRef = useRef(null);

  const connectTwitch = () => {
    sessionStorage.setItem("streambridge_setup_complete", "true");
    const redirectUri = window.location.origin + "/";
    const twitchAuth = "https://id.twitch.tv/oauth2/authorize";

    window.location.href =
      twitchAuth +
      "?response_type=token" +
      `&client_id=${TWITCH_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      "&scope=user%3Aread%3Achat+user%3Awrite%3Achat&force_verify=true";
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
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get("access_token");

    if (token) {
      sessionStorage.setItem("twitch_access_token", token);
      sessionStorage.setItem("streambridge_setup_complete", "true");
      setSetupComplete(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const savedToken = token || sessionStorage.getItem("twitch_access_token");
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

          if (isTwitchReconnect) {
            reconnectingSocketRef.current = socket;
          } else {
            socketRef.current = socket;
          }

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

                if (!subscriptionResponse.ok) {
                  const details = await subscriptionResponse.text();
                  throw new Error(`Twitch chat subscription failed: ${details}`);
                }

                setTwitchConnected(true);
                setTwitchStatus(`Listening to ${broadcaster.login}'s Twitch chat`);
              }

              if (messageType === "notification") {
                const event = packet.payload.event;
                const text = event.message?.text || "";
                const incomingId = packet.metadata.message_id;

                setMessages((current) => {
                  if (current.some((item) => item.id === incomingId)) return current;
                  return [
                    ...current,
                    {
                      id: incomingId,
                      platform: "Twitch",
                      username: event.chatter_user_name || event.chatter_user_login,
                      text,
                    },
                  ].slice(-100);
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

          socket.onerror = () => {
            setTwitchStatus("Twitch chat connection error. Reconnecting...");
          };

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

          return socket;
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

  const sendTwitchMessage = async () => {
    const text = chatInput.trim();
    const token = sessionStorage.getItem("twitch_access_token");
    if (!text || !token || !twitchUser?.broadcaster_user_id) return;

    try {
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
        throw new Error(result.data?.[0]?.drop_reason?.message || "Message was not sent");
      }
      setChatInput("");
    } catch (error) {
      setTwitchStatus(`Send failed: ${error.message}`);
    }
  };

  const enabled = useMemo(() => platforms.filter((p) => p.enabled), [platforms]);
  const ready = enabled.length > 0 && enabled.every((p) => p.key.trim().length > 5);
  const update = (id, patch) => setPlatforms((items) => items.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const finishSetup = () => {
    sessionStorage.setItem("streambridge_setup_complete", "true");
    setSetupComplete(true);
  };

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
        onSend={sendTwitchMessage}
        canSend={twitchConnected && activeChannel && chatInput.trim()}
        twitchStatus={twitchStatus}
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

        <p>{twitchStatus}</p>
        <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 12 }}>
          {messages.length === 0 ? <p>No Twitch messages yet. Save a channel, then send a message in that Twitch chat.</p> : messages.map((message) => (
            <p key={message.id}><b>[{message.platform}] {message.username}:</b> {message.text}</p>
          ))}
        </div>

        <div>
          <input type="text" placeholder="Type your Twitch message..." value={chatInput}
            onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendTwitchMessage()} />
          <button type="button" onClick={sendTwitchMessage} disabled={!twitchConnected || !activeChannel || !chatInput.trim()}>Send</button>
          <button type="button" onClick={connectTwitch}>{twitchConnected ? "Reconnect Twitch" : "Connect Twitch"}</button>
        </div>
      </section>
    </main>
  );
}
