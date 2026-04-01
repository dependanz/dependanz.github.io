"use client";

import { useEffect, useRef, useState } from "react";

export default function PrankPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.volume = 1;
    const playPromise = video.play();
    playPromise?.catch(() => {});
  }, []);

  useEffect(() => {
    const activateAudio = () => {
      const video = videoRef.current;
      if (!video) return;

      video.muted = false;
      video.volume = 1;
      const playPromise = video.play();
      playPromise?.catch(() => {});
      setIsActivated(true);
    };

    document.addEventListener("pointerdown", activateAudio, { once: true });

    return () => {
      document.removeEventListener("pointerdown", activateAudio);
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <video
        ref={videoRef}
        className="w-full max-w-sm rounded-2xl border shadow-[0_24px_60px_var(--shadow-active)]"
        style={{ borderColor: "var(--ring)" }}
        src="/video/misc/aprilfools.mp4"
        controls
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        suppressHydrationWarning
      >
        Your browser does not support the video tag.
      </video>
      {!isActivated ? (
        <p className="text-center text-xs opacity-70">tap anywhere for sound</p>
      ) : null}
    </div>
  );
}
