import React, { useEffect, useState } from "react";

export default function StartupScreen({ onContinue }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="sb-startup">
      <style>{`
        .sb-startup {
          min-height: 100vh;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: #020713;
          color: white;
          font-family: Arial, sans-serif;
        }

        .sb-scene {
          position: relative;
          width: min(100vw, 1536px);
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background:
            url('/streambridge-