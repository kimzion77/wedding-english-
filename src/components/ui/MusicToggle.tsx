"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContent } from "@/components/ContentProvider";

export default function MusicToggle() {
  const site = useSiteContent();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(true);

  // 재생 음량 적용 (자동재생 여부와 무관)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = site.music.volume ?? 1;
  }, [site.music.volume]);

  // 자동재생 시도 → 모바일에서 막히면 첫 사용자 상호작용 때 재생
  useEffect(() => {
    if (!site.music.autoplay) return;
    const audio = audioRef.current;
    if (!audio) return;

    const tryPlay = () => {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    };
    tryPlay();

    const onFirstInteract = () => {
      if (audio.paused) tryPlay();
      window.removeEventListener("pointerdown", onFirstInteract);
      window.removeEventListener("scroll", onFirstInteract);
    };
    window.addEventListener("pointerdown", onFirstInteract, { once: true });
    window.addEventListener("scroll", onFirstInteract, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstInteract);
      window.removeEventListener("scroll", onFirstInteract);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  if (!ready) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={site.music.src}
        loop
        preload="auto"
        onError={() => setReady(false)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "배경음악 끄기" : "배경음악 켜기"}
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card/90 text-foreground shadow-sm backdrop-blur transition hover:bg-card"
      >
        {playing ? (
          <span className="flex items-end gap-[2px]" aria-hidden>
            <i className="h-3 w-[2px] animate-pulse bg-accent" />
            <i className="h-4 w-[2px] animate-pulse bg-accent [animation-delay:120ms]" />
            <i className="h-2 w-[2px] animate-pulse bg-accent [animation-delay:240ms]" />
          </span>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" />
          </svg>
        )}
      </button>
    </>
  );
}
