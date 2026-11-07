import React, { useEffect, useState } from "react";

export default function StartupScreen({ onContinue }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
    }, 6500);

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
        html,
        body,
        #root {
          position: fixed !important;
          inset: 0 !important;

          width: 100vw !important;
          max-width: none !important;
          min-width: 100vw !important;

          height: 100vh !important;
          min-height: 100vh !important;

          margin: 0 !important;
          padding: 0 !important;

          overflow: hidden !important;
        }

        * {
          box-sizing: border-box;
        }

        .sb-startup {
          position: fixed !important;
          inset: 0 !important;

          width: 100vw !important;
          max-width: none !important;
          min-width: 100vw !important;

          height: 100vh !important;
          min-height: 100vh !important;

          margin: 0 !important;
          padding: 0 !important;

          overflow: hidden;

          background: #01040d;

          color: white;

          font-family:
            Arial,
            Helvetica,
            sans-serif;

          z-index: 99999;
        }

        .sb-scene {
          position: absolute;

          inset: 0;

          width: 100vw;
          height: 100vh;

          overflow: hidden;

          background-image:
            url("/streambridge-startup-bg.png");

          background-position:
            center center;

          background-repeat:
            no-repeat;

          background-size:
            cover;

          background-color:
            #01040d;

          isolation: isolate;
        }

        /* DARK START */

        .sb-darkness {
          position: absolute;
          inset: 0;

          z-index: 2;

          pointer-events: none;

          background:
            linear-gradient(
              rgba(0, 3, 14, 0.78),
              rgba(0, 5, 18, 0.67)
            );

          animation:
            sbDarknessOff
            5.6s
            ease-in-out
            forwards;
        }

        @keyframes sbDarknessOff {
          0% {
            opacity: 1;
          }

          30% {
            opacity: 0.78;
          }

          65% {
            opacity: 0.38;
          }

          100% {
            opacity: 0;
          }
        }

        /* CITY POWER-UP */

        .sb-city-light {
          position: absolute;
          inset: 0;

          z-index: 3;

          pointer-events: none;

          background:
            linear-gradient(
              90deg,
              rgba(0, 170, 255, 0.05) 0%,
              rgba(0, 225, 255, 0.13) 35%,
              rgba(64, 100, 255, 0.12) 65%,
              rgba(181, 48, 255, 0.09) 100%
            );

          mix-blend-mode: screen;

          opacity: 0;

          animation:
            sbCityOn
            5.4s
            ease-in-out
            forwards;
        }

        @keyframes sbCityOn {
          0% {
            opacity: 0;
          }

          30% {
            opacity: 0.2;
          }

          65% {
            opacity: 0.55;
          }

          100% {
            opacity: 0.8;
          }
        }

        /* BRIDGE POWER-UP */

        .sb-bridge-light {
          position: absolute;

          z-index: 4;

          left: 0;
          right: 0;

          bottom: 24%;

          height: 26%;

          pointer-events: none;

          opacity: 0;

          background:
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(0, 213, 255, 0.22) 12%,
              rgba(56, 220, 255, 0.34) 30%,
              rgba(61, 139, 255, 0.34) 55%,
              rgba(155, 74, 255, 0.25) 80%,
              transparent 100%
            );

          filter:
            blur(16px)
            drop-shadow(
              0 0 14px
              rgba(0, 225, 255, 0.55)
            );

          transform: scaleX(0);
          transform-origin: left center;

          animation:
            sbBridgeConnect
            5.2s
            ease-in-out
            0.5s
            forwards;
        }

        @keyframes sbBridgeConnect {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }

          15% {
            opacity: 0.35;
          }

          65% {
            opacity: 0.75;
          }

          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        /* FINAL BRIDGE GLOW */

        .sb-connected {
          position: absolute;

          z-index: 5;

          left: 0;
          right: 0;

          bottom: 25%;

          height: 22%;

          pointer-events: none;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(0, 229, 255, 0.14),
              rgba(81, 154, 255, 0.18),
              rgba(171, 70, 255, 0.12),
              transparent
            );

          filter: blur(12px);

          opacity: 0;

          animation:
            sbConnectedOn
            1.2s
            ease
            5.1s
            forwards;
        }

        @keyframes sbConnectedOn {
          to {
            opacity: 1;
          }
        }

        /* STREAMBRIDGE CENTRE LOGO */

        .sb-brand {
          position: absolute;

          z-index: 15;

          left: 50%;
          top: 47%;

          transform:
            translate(-50%, -50%)
            scale(0.88);

          text-align: center;

          white-space: nowrap;

          opacity: 0;

          pointer-events: none;

          animation:
            sbBrandAppears
            2.2s
            ease-out
            2.6s
            forwards;
        }

        .sb-brand-title {
          margin: 0;

          color: #ffffff;

          font-size:
            clamp(42px, 7vw, 100px);

          font-weight: 900;

          letter-spacing:
            clamp(3px, 0.6vw, 10px);

          line-height: 1;

          text-transform: uppercase;

          text-shadow:
            0 0 5px #ffffff,
            0 0 12px #22d3ee,
            0 0 25px #00c8ff,
            0 0 45px #2563eb,
            0 0 70px rgba(168, 85, 247, 0.8);
        }
.sb-tagline {
  margin: 12px 0 0;
  color: #dffaff;
  font-size: clamp(13px, 1.5vw, 22px);
  font-weight: 700;
  letter-spacing: 5px;
  line-height: 1.3;
  text-transform: uppercase;

  text-shadow:
    0 0 6px #22d3ee,
    0 0 14px rgba(34, 211, 238, 0.7),
    0 0 22px rgba(139, 92, 246, 0.55);
}
        .sb-brand-line {
          width: 75%;

          height: 3px;

          margin:
            17px auto 0;

          border-radius: 50%;

          background:
            linear-gradient(
              90deg,
              transparent,
              #22d3ee,
              #ffffff,
              #8b5cf6,
              transparent
            );

          box-shadow:
            0 0 10px #22d3ee,
            0 0 20px #6366f1,
            0 0 30px #8b5cf6;
        }

        @keyframes sbBrandAppears {
          0% {
            opacity: 0;

            transform:
              translate(-50%, -45%)
              scale(0.88);

            filter:
              blur(8px);
          }

          55% {
            opacity: 1;

            filter:
              blur(0);
          }

          100% {
            opacity: 1;

            transform:
              translate(-50%, -50%)
              scale(1);

            filter:
              blur(0);
          }
        }

        /* CONTINUE */

        .sb-continue {
          position: absolute;

          z-index: 20;

          left: 50%;
          bottom: 5%;

          transform:
            translate(-50%, 15px);

          min-width: 170px;

          padding:
            14px 30px;

          border:
            1px solid
            rgba(91, 235, 255, 0.9);

          border-radius: 14px;

          background:
            rgba(2, 9, 24, 0.84);

          color: #ffffff;

          font-size: 18px;

          font-weight: 700;

          letter-spacing: 0.8px;

          cursor: pointer;

          opacity: 0;

          pointer-events: none;

          box-shadow:
            0 0 12px
            rgba(34, 211, 238, 0.35),
            inset 0 0 10px
            rgba(34, 211, 238, 0.08);

          transition:
            opacity 0.6s ease,
            transform 0.6s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .sb-continue.visible {
          opacity: 1;

          pointer-events: auto;

          transform:
            translate(-50%, 0);
        }

        .sb-continue:hover {
          background:
            rgba(7, 55, 88, 0.95);

          box-shadow:
            0 0 15px
            rgba(34, 211, 238, 0.75),
            0 0 30px
            rgba(91, 79, 255, 0.3);
        }

        .sb-continue:focus-visible {
          outline:
            3px solid #67e8f9;

          outline-offset: 4px;
        }

        /* MOBILE / TABLET */

        @media (max-width: 700px) {
          .sb-scene {
            background-position:
              center center;
          }

          .sb-brand {
            top: 44%;
          }

          .sb-brand-title {
            font-size:
              clamp(32px, 10vw, 58px);

            letter-spacing:
              3px;
          }

          .sb-continue {
            bottom: 6%;

            min-width: 150px;

            padding:
              12px 24px;

            font-size: 16px;
          }
        }

        /* ACCESSIBILITY */

        @media (
          prefers-reduced-motion: reduce
        ) {
          .sb-darkness,
          .sb-city-light,
          .sb-bridge-light,
          .sb-connected,
          .sb-brand {
            animation-duration:
              0.01ms !important;

            animation-delay:
              0s !important;
          }
        }
      `}</style>

      <section
        className="sb-scene"
        aria-label="StreamBridge startup"
      >
        <div className="sb-darkness" />

        <div className="sb-city-light" />

        <div className="sb-bridge-light" />

        <div className="sb-connected" />

        <div
          className="sb-brand"
          aria-label="StreamBridge"
        >
         <h1 className="sb-brand-title">
  STREAMBRIDGE
</h1>

<p className="sb-tagline">
  ONE CHAT • EVERY AUDIENCE
</p>

<div className="sb-brand-line" /> 
        </div>

        <button
          type="button"
          className={`sb-continue ${
            ready ? "visible" : ""
          }`}
          onClick={continueToApp}
        >
          CONTINUE
        </button>
      </section>
    </main>
  );
}