[1mdiff --git a/src/App.WORKING-WELCOME.jsx b/src/App.WORKING-WELCOME.jsx[m
[1mdeleted file mode 100644[m
[1mindex b9290ba..0000000[m
[1m--- a/src/App.WORKING-WELCOME.jsx[m
[1m+++ /dev/null[m
[36m@@ -1,184 +0,0 @@[m
[31m-import React, { useEffect, useMemo, useState } from "react";[m
[31m-import "./styles.css";[m
[31m-[m
[31m-const TWITCH_CLIENT_ID = "9u6sy8469pnk78b9x5od4qwzlpns50";[m
[31m-[m
[31m-const defaults = [[m
[31m-  { id: "youtube", name: "YouTube", server: "rtmps://a.rtmps.youtube.com/live2", key: "", enabled: true },[m
[31m-  { id: "twitch", name: "Twitch", server: "rtmp://live.twitch.tv/app", key: "", enabled: true },[m
[31m-  { id: "facebook", name: "Facebook", server: "rtmps://live-api-s.facebook.com:443/rtmp/", key: "", enabled: false },[m
[31m-  { id: "tiktok", name: "TikTok", server: "Paste the server URL from TikTok LIVE", key: "", enabled: false },[m
[31m-];[m
[31m-[m
[31m-export default function App() {[m
[31m-  const [setupComplete, setSetupComplete] = useState(false);[m
[31m-  const [language, setLanguage] = useState("English");[m
[31m-  const [ageMode, setAgeMode] = useState("18+");[m
[31m-  const [twitchConnected, setTwitchConnected] = useState(false);[m
[31m-  const [platforms, setPlatforms] = useState(defaults);[m
[31m-  const [show, setShow] = useState(false);[m
[31m-  const [live, setLive] = useState(false);[m
[31m-[m
[31m-  const connectTwitch = () => {[m
[31m-    const redirectUri = window.location.origin;[m
[31m-    window.location.href =[m
[31m-      `https://id.twitch.tv/oauth2/authorize?response_type=token` +[m
[31m-      `&client_id=${TWITCH_CLIENT_ID}` +[m
[31m-      `&redirect_uri=${encodeURIComponent(redirectUri)}` +[m
[31m-      `&scope=user%3Aread%3Achat+user%3Awrite%3Achat`;[m
[31m-  };[m
[31m-[m
[31m-  useEffect(() => {[m
[31m-    const params = new URLSearchParams(window.location.hash.substring(1));[m
[31m-    const token = params.get("access_token");[m
[31m-[m
[31m-    if (token) {[m
[31m-      sessionStorage.setItem("twitch_access_token", token);[m
[31m-      setTwitchConnected(true);[m
[31m-      window.history.replaceState({}, document.title, window.location.pathname);[m
[31m-    } else if (sessionStorage.getItem("twitch_access_token")) {[m
[31m-      setTwitchConnected(true);[m
[31m-    }[m
[31m-  }, []);[m
[31m-[m
[31m-  const enabled = useMemo(() => platforms.filter((p) => p.enabled), [platforms]);[m
[31m-  const ready = enabled.length > 0 && enabled.every((p) => p.key.trim().length > 5);[m
[31m-  const update = (id, patch) =>[m
[31m-    setPlatforms((items) => items.map((p) => (p.id === id ? { ...p, ...patch } : p)));[m
[31m-[m
[31m-  if (!setupComplete) {[m
[31m-    return ([m
[31m-      <main>[m
[31m-        <section className="hero">[m
[31m-          <h1>Welcome to MultiStream Rail</h1>[m
[31m-          <p>Let's set up your stream.</p>[m
[31m-[m
[31m-          <p>[m
[31m-            Language:{" "}[m
[31m-            <select value={language} onChange={(e) => setLanguage(e.target.value)}>[m
[31m-              <option>English</option>[m
[31m-              <option>Spanish</option>[m
[31m-              <option>French</option>[m
[31m-              <option>German</option>[m
[31m-              <option>Italian</option>[m
[31m-              <option>Portuguese</option>[m
[31m-            </select>[m
[31m-          </p>[m
[31m-[m
[31m-          <p>[m
[31m-            Age mode:{" "}[m
[31m-            <select value={ageMode} onChange={(e) => setAgeMode(e.target.value)}>[m
[31m-              <option>18+</option>[m
[31m-              <option>Under 18</option>[m
[31m-            </select>[m
[31m-          </p>[m
[31m-[m
[31m-          <p>Platforms:</p>[m
[31m-          <div className="grid">[m
[31m-            {platforms.map((p) => ([m
[31m-              <label className="card" key={p.id}>[m
[31m-                <input[m
[31m-                  type="checkbox"[m
[31m-                  checked={p.enabled}[m
[31m-                  onChange={(e) => update(p.id, { enabled: e.target.checked })}[m
[31m-                />{" "}[m
[31m-                {p.name}[m
[31m-              </label>[m
[31m-            ))}[m
[31m-          </div>[m
[31m-[m
[31m-          <button[m
[31m-            className="go"[m
[31m-            disabled={enabled.length === 0}[m
[31m-            onClick={() => setSetupComplete(true)}[m
[31m-          >[m
[31m-            Start setup[m
[31m-          </button>[m
[31m-        </section>[m
[31m-      </main>[m
[31m-    );[m
[31m-  }[m
[31m-[m
[31m-  return ([m
[31m-    <main>[m
[31m-      <header>[m
[31m-        <div>[m
[31m-          <h1>MultiStream Rail</h1>[m
[31m-          <p>One input. Every audience.</p>[m
[31m-        </div>[m
[31m-        <span className="badge">Railway ready</span>[m
[31m-      </header>[m
[31m-[m
[31m-      <section className="hero">[m
[31m-        <p className="eyebrow">CLOUD MULTISTREAM CONTROL</p>[m
[31m-        <h2>Stream everywhere. Manage everything in one place.</h2>[m
[31m-        <p>[m
[31m-          This dashboard prepares your streaming destinations. A streaming relay backend is[m
[31m-          still required for real simultaneous broadcasting.[m
[31m-        </p>[m
[31m-        <button className={live ? "stop" : "go"} onClick={() => ready && setLive(!live)}>[m
[31m-          {live ? "Stop broadcast" : "Go live everywhere"}[m
[31m-        </button>[m
[31m-        {!ready && <small>Add a stream key for every enabled platform first.</small>}[m
[31m-      </section>[m
[31m-[m
[31m-      <div className="bar">[m
[31m-        <h2>Streaming destinations</h2>[m
[31m-        <div>[m
[31m-          <button className="ghost" onClick={() => setSetupComplete(false)}>[m
[31m-            Setup[m
[31m-          </button>{" "}[m
[31m-          <button className="ghost" onClick={() => setShow(!show)}>[m
[31m-            {show ? "Hide keys" : "Show keys"}[m
[31m-          </button>[m
[31m-        </div>[m
[31m-      </div>[m
[31m-[m
[31m-      <section className="grid">[m
[31m-        {platforms.map((p) => ([m
[31m-          <article className="card" key={p.id}>[m
[31m-            <div className="row">[m
[31m-              <strong>{p.name}</strong>[m
[31m-              <input[m
[31m-                type="checkbox"[m
[31m-                checked={p.enabled}[m
[31m-                onChange={(e) => update(p.id, { enabled: e.target.checked })}[m
[31m-              />[m
[31m-            </div>[m
[31m-            <label>RTMP / RTMPS server</label>[m
[31m-            <input[m
[31m-              value={p.server}[m
[31m-              disabled={!p.enabled || live}[m
[31m-              onChange={(e) => update(p.id, { server: e.target.value })}[m
[31m-            />[m
[31m-            <label>Stream key</label>[m
[31m-            <input[m
[31m-              type={show ? "text" : "password"}[m
[31m-              value={p.key}[m
[31m-              placeholder="Paste private stream key"[m
[31m-              disabled={!p.enabled || live}[m
[31m-              onChange={(e) => update(p.id, { key: e.target.value })}[m
[31m-            />[m
[31m-          </article>[m
[31m-        ))}[m
[31m-      </section>[m
[31m-[m
[31m-      <section className="note">[m
[31m-        <b>Combined Chat</b>[m
[31m-        {ageMode === "Under 18" && ([m
[31m-          <p>[m
[31m-            <b>Young User Mode ON</b>[m
[31m-          </p>[m
[31m-        )}[m
[31m-        <p>Your YouTube, Twitch, Facebook and TikTok messages will appear together here.</p>[m
[31m-        <div>[m
[31m-          <input type="text" placeholder="Type your message..." />[m
[31m-          <button>Send</button>[m
[31m-          <button onClick={connectTwitch}>[m
[31m-            {twitchConnected ? "Twitch connected" : "Connect Twitch"}[m
[31m-          </button>[m
[31m-        </div>[m
[31m-      </section>[m
[31m-    </main>[m
[31m-  );[m
[31m-}[m
