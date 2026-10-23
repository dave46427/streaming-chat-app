import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";

const TWITCH_CLIENT_ID = "9u6sy8469pnk78b9x5od4qwzlpns50";
const REDIRECT_URI = "https://streaming-chat-app-tu3j.onrender.com";

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

  const connectTwitch = () => {
    const scope = encodeURIComponent("user:read:chat user:write:chat");
    window.location.href =
      `https://id.twitch.tv/oauth2/authorize?response_type=token` +
      `&client_id=${TWITCH_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${scope}`;
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
        <span className="badge">Render ready</span>
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
        <b>Combined Chat</b>
        <p>Your YouTube, Twitch, Facebook and TikTok messages will appear together here.</p>
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
