import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
const TWITCH_CLIENT_ID = "9u6sy8469pnk78b9x5od4qwzlpns50";
const defaults = [
  {id:"youtube",name:"YouTube",server:"rtmps://a.rtmps.youtube.com/live2",key:"",enabled:true},
  {id:"twitch",name:"Twitch",server:"rtmp://live.twitch.tv/app",key:"",enabled:true},
  {id:"facebook",name:"Facebook",server:"rtmps://live-api-s.facebook.com:443/rtmp/",key:"",enabled:false},
  {id:"tiktok",name:"TikTok",server:"Paste the server URL from TikTok LIVE",key:"",enabled:false},
];
export default function App(){ 
const connectTwitch=()=>{window.location.href=`https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent("https://streaming-chat-app-tu3j.onrender.com")}&scope=user%3Aread%3Achat+user%3Awrite%3Achat`;};
 const [twitchConnected, setTwitchConnected] = useState(false);

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
  const [platforms,setPlatforms]=useState(defaults); const [show,setShow]=useState(false); const [live,setLive]=useState(false);
 const enabled=useMemo(()=>platforms.filter(p=>p.enabled),[platforms]);
 const ready=enabled.length>0&&enabled.every(p=>p.key.trim().length>5);
 const update=(id,patch)=>setPlatforms(xs=>xs.map(p=>p.id===id?{...p,...patch}:p));
 return <main><header><div><h1>MultiStream Rail</h1><p>One input. Every audience.</p></div><span className="badge">Railway ready</span></header>
 <section className="hero"><p className="eyebrow">CLOUD MULTISTREAM CONTROL</p><h2>Stream everywhere. Manage everything in one place.</h2><p>This dashboard prepares your streaming destinations. A streaming relay backend is still required for real simultaneous broadcasting.</p><button className={live?'stop':'go'} onClick={()=>ready&&setLive(!live)}>{live?'Stop broadcast':'Go live everywhere'}</button>{!ready&&<small>Add a stream key for every enabled platform first.</small>}</section>
 <div className="bar"><h2>Streaming destinations</h2><button className="ghost" onClick={()=>setShow(!show)}>{show?'Hide keys':'Show keys'}</button></div>
 <section className="grid">{platforms.map(p=><article className="card" key={p.id}><div className="row"><strong>{p.name}</strong><input type="checkbox" checked={p.enabled} onChange={e=>update(p.id,{enabled:e.target.checked})}/></div><label>RTMP / RTMPS server</label><input value={p.server} disabled={!p.enabled||live} onChange={e=>update(p.id,{server:e.target.value})}/><label>Stream key</label><input type={show?'text':'password'} value={p.key} placeholder="Paste private stream key" disabled={!p.enabled||live} onChange={e=>update(p.id,{key:e.target.value})}/></article>)}</sectio
 <section className="note"><b>Combined Chat</b><p>Your YouTube, Twitch, Facebook and TikTok messages will appear together here.</p><div><input type="text" placeholder="Type your message..." /><button>Send</button><button onClick={connectTwitch}>{twitchConnected ? "Twitch connected ✅" : "Connect Twitch"}</button></div></section>

 </main>
}
