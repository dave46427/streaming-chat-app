import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

const TWITCH_CLIENT_ID = "9u6sy8469pnk78b9x5od4qwzlpns50";
const REDIRECT_URI = window.location.origin;

const defaults = [
  { id: "youtube", name: "YouTube", server: "rtmps://a.rtmps.youtube.com/live2", key: "", enabled: true },
  { id: "twitch", name: "Twitch", server: "rtmp://live.twitch.tv/app", key: "", enabled: true },
  { id: "facebook", name: "Facebook", server: "rtmps://live-api-s.facebook.com:443/rtmp/", key: "", enabled: false },
  { id: "tiktok", name: "TikTok", server: "Paste the server URL from TikTok LIVE", key: "", enabled: false },
];

export default function App() {
  const [twitchConnected, setTwitchConnected] = useState(false);
  const [platforms, setPlatforms] = useState(defaults);
  const [show, setShow] = useState(false);
  const [live, setLive] = useState(false);
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokStatus, setTiktokStatus] = useState("Enter your TikTok username, then connect while the account is LIVE.");
  const [chatMessages, setChatMessages] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get("access_token");

    if (token) {
      sessionStorage.setItem("twitch_access_token", token);
      setTwitchConnected(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (sessionStorage.getItem("twitch_access_token")) {
      setTwitchConnected(true);
    }
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "tiktok_status") {
          setTiktokConnected(Boolean(data.connected));
          setTiktokStatus(data.status || "TikTok status updated.");
        }
        if (data.type === "chat_message" && data.message) {
          setChatMessages((items) => [...items.slice(-99), data.message]);
        }
      } catch (error) {
        console.error("StreamBridge message error:", error);
      }
    };

    socket.onerror = () => {
      setTiktokConnected(false);
      setTiktokStatus("Could not reach the StreamBridge TikTok server.");
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const connectTwitch = () => {
    const scope = encodeURIComponent("user:read:chat user:write:chat");
    window.location.href =
      `https://id.twitch.tv/oauth2/authorize?response_type=token` +
      `&client_id=${TWITCH_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${scope}`;
  };

  const connectTikTok = () => {
    const username = tiktokUsername.trim().replace(/^@/, "");
    if (!username) {
      setTiktokStatus("Enter your TikTok username first.");
      return;
    }
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setTiktokStatus("StreamBridge server is not connected yet. Try again in a moment.");
      return;
    }
    setTiktokStatus(`Connecting to @${username}'s TikTok LIVE...`);
    socket.send(JSON.stringify({ type: "connect_tiktok", username }));
  };

  const disconnectTikTok = () => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "disconnect_tiktok" }));
    }
  };

  const enabled = useMemo(
    () => platforms.filter((platform) => platform.enabled),
    [platforms]
  );

  const ready = enabled.length > 0 && enabled.every((platform) => platform.key.trim().length > 5);

  const update = (id, patch) => {
    setPlatforms((items) =>
      items.map((platform) => (platform.id === id ? { ...platform, ...patch } : platform))
    );
  };

  return (
    <main>
      <header>
        <div>
          <h1>MultiStream Rail</h1>
          <p>One input. Every audience.</p>
        </div>
        <span className="badge">Railway ready</span>
      </header>

      <section className="hero">
        <p className="eyebrow">CLOUD MULTISTREAM CONTROL</p>
        <h2>Stream everywhere. Manage everything in one place.</h2>
        <p>
          This dashboard prepares your streaming destinations. A streaming relay backend is still
          required for real simultaneous broadcasting.
        </p>
        <button
          className={live ? "stop" : "go"}
          disabled={!ready}
          onClick={() => ready && setLive((value) => !value)}
        >
          {live ? "Stop broadcast" : "Go live everywhere"}
        </button>
        {!ready && <small>Add a stream key for every enabled platform first.</small>}
      </section>

      <div className="bar">
        <h2>Streaming destinations</h2>
        <button className="ghost" onClick={() => setShow((value) => !value)}>
          {show ? "Hide keys" : "Show keys"}
        </button>
      </div>

      <section className="grid">
        {platforms.map((platform) => (
          <article className="card" key={platform.id}>
            <div className="row">
              <strong>{platform.name}</strong>
              <input
                type="checkbox"
                checked={platform.enabled}
                onChange={(event) => update(platform.id, { enabled: event.target.checked })}
              />
            </div>
            <label>RTMP / RTMPS server</label>
            <input
              value={platform.server}
              disabled={!platform.enabled || live}
              onChange={(event) => update(platform.id, { server: event.target.value })}
            />
            <label>Stream key</label>
            <input
              type={show ? "text" : "password"}
              value={platform.key}
              placeholder="Paste private stream key"
              disabled={!platform.enabled || live}
              onChange={(event) => update(platform.id, { key: event.target.value })}
            />
          </article>
        ))}
      </section>

      <section className="note">
        <b>TikTok LIVE Chat</b>
        <p>Connect to the TikTok LIVE account you want StreamBridge to listen to.</p>
        <div>
          <input
            type="text"
            value={tiktokUsername}
            placeholder="TikTok username (without @)"
            onChange={(event) => setTiktokUsername(event.target.value)}
            disabled={tiktokConnected}
          />
          <button type="button" onClick={tiktokConnected ? disconnectTikTok : connectTikTok}>
            {tiktokConnected ? "Disconnect TikTok" : "Connect TikTok"}
          </button>
        </div>
        <small>{tiktokStatus}</small>
      </section>

      <section className="note">
        <b>Combined Chat</b>
        <p>Your YouTube, Twitch, Facebook and TikTok messages will appear together here.</p>
        {chatMessages.length > 0 && (
          <div>
            {chatMessages.map((message) => (
              <p key={message.id}>
                <strong>[{message.platform}] {message.username}:</strong> {message.text}
              </p>
            ))}
          </div>
        )}
        <div>
          <input type="text" placeholder="Type your message..." />
          <button type="button">Send</button>
          <button type="button" onClick={connectTwitch}>
            {twitchConnected ? "Twitch connected ✅" : "Connect Twitch"}
          </button>
        </div>
      </section>
    </main>
  );
}
