import React, { useEffect, useState } from "react";

const WALK_FRAMES = Array.from(
  { length: 12 },
  (_, index) =>
    `/walker-frames/walk-${String(index + 1).padStart(2, "0")}.png`
);

export default function StartupScreen({ onContinue }) {
  const [finished, setFinished] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);

  useEffect(() => {
    // Cycle through the 12 cleaned walking images.
    const walkingTimer = setInterval(() => {
      setWalkFrame((current) => (current + 1) % WALK_FRAMES.length);
    }, 110);

    // Show Continue after the walking sequence.
    const finishTimer = setTimeout(() => {
      setFinished(true);
      clearInterval(walkingTimer);
    }, 7000);

    return () => {
      clearInterval(walkingTimer);
      clearTimeout(finishTimer);
    };
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
          font-family: Arial, sans-serif;
          color: white;
        }

        .sb-scene {
          position: relative;
          width: min(100vw, 1536px);
          aspect-ratio: 16 / 9;
          overflow: hidden;

          background:
            url('/streambridge-startup-bg.png')
            center / cover no-repeat;

          box-shadow: 0 0 70px #000;
        }

        /*
          CLEAN WALKER

          Uses the 12 individual PNG files in:
          public/walker-frames/

          The container moves across the bridge.
          The image inside changes walking frame.
        */

        .sb-walker {
          position: absolute;
          z-index: 4;

          width: 8.5%;

          left: -10%;
          bottom: 20%;

          opacity: 0;

          pointer-events: none;

          animation:
            crossBridge 6.4s linear 0.25s forwards;
        }

        .sb-walker-image {
          display: block;

          width: 100%;
          height: auto;

          object-fit: contain;

          filter:
            drop-shadow(
              0 0 7px rgba(31, 211, 255, 0.55)
            );
        }

        /*
          BRIDGE ROUTE

          Feet begin near the left-hand bridge surface,
          climb toward the middle,
          descend toward the right,
          then leave the screen.
        */

        @keyframes crossBridge {
          0% {
            left: -10%;
            bottom: 20%;
            opacity: 0;
            transform: rotate(-3deg);
          }

          4% {
            opacity: 1;
          }

          10% {
            left: 0%;
            bottom: 21%;
            opacity: 1;
            transform: rotate(-3deg);
          }

          20% {
            left: 11%;
            bottom: 24%;
            transform: rotate(-2.5deg);
          }

          30% {
            left: 22%;
            bottom: 27.5%;
            transform: rotate(-2deg);
          }

          40% {
            left: 33%;
            bottom: 30.5%;
            transform: rotate(-1deg);
          }

          50% {
            left: 44%;
            bottom: 32%;
            transform: rotate(0deg);
          }

          60% {
            left: 55%;
            bottom: 31.5%;
            transform: rotate(1deg);
          }

          70% {
            left: 66%;
            bottom: 29%;
            transform: rotate(2deg);
          }

          80% {
            left: 77%;
            bottom: 26%;
            transform: rotate(2.5deg);
          }

          90% {
            left: 88%;
            bottom: 22.5%;
            opacity: 1;
            transform: rotate(3deg);
          }

          96% {
            left: 97%;
            bottom: 20.5%;
            opacity: 1;
          }

          100% {
            left: 105%;
            bottom: 20%;
            opacity: 0;
            transform: rotate(3deg);
          }
        }

        /*
          STREAMBRIDGE TEXT
        */

        .sb-copy {
          position: absolute;
          z-index: 5;

          left: 50%;
          top: 63%;

          transform: translateX(-50%);

          width: 90%;
          text-align: center;

          text-shadow: 0 4px 18px #000;

          pointer-events: none;
        }

        .sb-title {
          margin: 0;

          font-size:
            clamp(2.7rem, 7vw, 6.5rem);

          font-weight: 900;

          letter-spacing: -0.045em;

          opacity: 0;

          animation:
            reveal 0.9s ease 2.7s forwards;
        }

        .sb-title span {
          color: #18cfff;
        }

        .sb-tagline {
          margin: 0.3em 0 0;

          font-size:
            clamp(1rem, 2.1vw, 1.7rem);

          font-weight: 700;

          letter-spacing: 0.15em;

          opacity: 0;

          animation:
            reveal 0.9s ease 3.45s forwards;
        }

        /*
          RIGHT-SIDE LOGO/ICON GLOW
        */

        .sb-icon-glow {
          position: absolute;
          z-index: 3;

          right: 1.5%;
          top: 23%;

          width: 24%;
          height: 43%;

          border-radius: 40%;

          opacity: 0;

          pointer-events: none;

          background:
            radial-gradient(
              circle,
              rgba(32, 218, 255, 0.58) 0%,
              rgba(255, 32, 212, 0.25) 34%,
              rgba(255, 36, 66, 0.16) 53%,
              transparent 73%
            );

          filter: blur(16px);

          animation:
            iconsGlow 1.25s ease 4.55s forwards;
        }

        /*
          CONTINUE BUTTON
        */

        .sb-continue {
          position: absolute;
          z-index: 6;

          left: 50%;
          bottom: 5%;

          transform: translateX(-50%);

          padding: 14px 34px;

          border:
            1px solid #66e6ff;

          border-radius: 14px;

          background:
            rgba(1, 16, 32, 0.82);

          color: white;

          font-weight: 900;
          font-size: 1rem;

          box-shadow:
            0 0 24px
            rgba(24, 207, 255, 0.55);

          cursor: pointer;

          animation:
            showContinue 0.6s ease forwards;
        }

        /*
          TEXT REVEAL
        */

        @keyframes reveal {
          from {
            opacity: 0;
            transform: translateY(16px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /*
          ICON GLOW
        */

        @keyframes iconsGlow {
          0% {
            opacity: 0;
            transform: scale(0.82);
          }

          55% {
            opacity: 1;
            transform: scale(1.08);
          }

          100% {
            opacity: 0.72;
            transform: scale(1);
          }
        }

        /*
          CONTINUE BUTTON REVEAL
        */

        @keyframes showContinue {
          from {
            opacity: 0;

            transform:
              translateX(-50%)
              translateY(15px);
          }

          to {
            opacity: 1;

            transform:
              translateX(-50%)
              translateY(0);
          }
        }

        /*
          MOBILE
        */

        @media (max-width: 700px) {
          .sb-scene {
            width: 100vw;
            height: 100vh;
            aspect-ratio: auto;

            background-position: center;
          }

          .sb-walker {
            width: 13%;
          }

          .sb-copy {
            top: 66%;
          }

          .sb-icon-glow {
            right: -4%;
            width: 38%;
          }
        }

        /*
          Accessibility:
          avoid forced movement when the device/user
          requests reduced motion.
        */

        @media (prefers-reduced-motion: reduce) {
          .sb-walker {
            display: none;
          }

          .sb-title,
          .sb-tagline,
          .sb-icon-glow,
          .sb-continue {
            animation-duration: 0.01ms !important;
            animation-delay: 0s !important;
          }
        }
      `}</style>

      <section className="sb-scene">

        <div
          className="sb-icon-glow"
          aria-hidden="true"
        />

        <div
          className="sb-walker"
          aria-hidden="true"
        >
          <img
            className="sb-walker-image"
            src={WALK_FRAMES[walkFrame]}
            alt=""
            draggable="false"
          />
        </div>

        <div className="sb-copy">

          <h1 className="sb-title">
            Stream<span>Bridge</span>
          </h1>

          <p className="sb-tagline">
            One chat. Every audience.
          </p>

        </div>

        {finished && (
          <button
            className="sb-continue"
            type="button"
            onClick={onContinue}
          >
            CONTINUE
          </button>
        )}

      </section>
    </main>
  );
}