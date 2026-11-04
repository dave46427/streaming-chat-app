import React, { useEffect, useState } from "react";

export default function StartupScreen({ onContinue }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const continueToApp = () => {
    if (typeof onContinue === "function") {
      onContinue();
    }
  };

  return (
    <main className="sb-startup">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .sb-startup {
          width: 100%;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #020713;
          color: white;
          font-family: Arial, Helvetica, sans-serif;
        }

        .sb-scene {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;

          background-image: url("/streambridge-startup-bg.png");
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
        }

        .sb-walker {
          position: absolute;
          left: -120px;
          bottom: 18%;
          width: 85px;
          height: auto;
          z-index: 5;

          animation:
            sbWalkAcross 5s linear forwards,
            sbWalkingBob 0.32s ease-in-out infinite alternate;
        }

        @keyframes sbWalkAcross {
          0% {
            left: -120px;
            opacity: 1;
          }

          90% {
            opacity: 1;
          }

          100% {
            left: calc(100% + 120px);
            opacity: 0;
          }
        }

        @keyframes sbWalkingBob {
          from {
            transform: translateY(0);
          }

          to {
            transform: translateY(-5px);
          }
        }

        .sb-ready {
          position: absolute;
          left: 50%;
          bottom: 8%;
          transform: translateX(-50%);
          z-index: 10;

          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 14px;
          padding: 14px 28px;

          background: rgba(2, 7, 19, 0.78);
          color: #ffffff;

          font-size: 18px;
          font-weight: 700;
          cursor: pointer;

          opacity: 0;
          pointer-events: none;

          transition:
            opacity 0.5s ease,
            transform 0.2s ease,
            background 0.2s ease;
        }

        .sb-ready.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .sb-ready:hover {
          background: rgba(37, 99, 235, 0.9);
          transform: translateX(-50%) scale(1.04);
        }

        .sb-ready:focus-visible {
          outline: 3px solid #60a5fa;
          outline-offset: 4px;
        }

        @media (max-width: 768px) {
          .sb-scene {
            background-size: cover;
          }

          .sb-walker {
            width: 62px;
            bottom: 20%;
          }

          .sb-ready {
            bottom: 6%;
            font-size: 16px;
            padding: 12px 22px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sb-walker {
            animation: none;
            display: none;
          }

          .sb-ready {
            transition: none;
          }
        }
      `}</style>

      <section className="sb-scene">
        <img
          className="sb-walker"
          src="/walking.png"
          alt=""
          aria-hidden="true"
        />

        <button
          type="button"
          className={`sb-ready ${ready ? "visible" : ""}`}
          onClick={continueToApp}
        >
          Welcome to StreamBridge
        </button>
      </section>
    </main>
  );
}