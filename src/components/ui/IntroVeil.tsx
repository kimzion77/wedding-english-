"use client";

import { useEffect, useState } from "react";
import { useSiteContent } from "@/components/ContentProvider";
import { formatWeddingDate } from "@/lib/datetime";

/**
 * 오프닝 인트로 화면.
 * 화면을 탭하면 부드럽게 사라지며 본문이 드러난다.
 * (탭 = 첫 사용자 상호작용 → 배경음악도 이때 자연스럽게 재생된다)
 */
export default function IntroVeil() {
  const site = useSiteContent();
  const [closing, setClosing] = useState(false);
  const [gone, setGone] = useState(false);
  const d = formatWeddingDate(site.weddingAt);

  // 인트로가 떠 있는 동안 스크롤 잠금 + 항상 맨 위에서 시작
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (gone) return null;

  const open = () => {
    if (closing) return;
    window.scrollTo(0, 0);
    setClosing(true);
    document.body.style.overflow = "";
    setTimeout(() => {
      window.scrollTo(0, 0);
      setGone(true);
    }, 900);
  };

  return (
    <div
      onClick={open}
      role="button"
      aria-label="초대장 열기"
      className="fixed inset-0 z-[80] flex cursor-pointer flex-col items-center justify-center bg-background px-8 text-center transition-opacity duration-[900ms] ease-out"
      style={{ opacity: closing ? 0 : 1 }}
    >
      {/* 가는 액자 테두리 */}
      <div className="pointer-events-none absolute inset-4 border border-line" />

      <p className="fade-up font-title text-[11px] tracking-[0.5em] text-accent [animation-delay:0.1s]">
        WEDDING INVITATION
      </p>

      <div className="fade-up ornament mt-7 [animation-delay:0.3s]">
        <i />
      </div>

      <h1 className="fade-up mt-7 font-title text-[2rem] leading-tight text-foreground [animation-delay:0.5s]">
        {site.groomName}
        <span className="mx-3 text-accent-soft">·</span>
        {site.brideName}
      </h1>

      <p className="fade-up mt-6 text-sm tracking-[0.15em] text-muted [animation-delay:0.7s]">
        {d.dot} {d.weekday}
      </p>
      <p className="fade-up mt-1 text-sm tracking-[0.1em] text-muted [animation-delay:0.8s]">
        {site.venue.name} {site.venue.hall}
      </p>

      <p className="fade-up soft-pulse absolute bottom-12 text-xs tracking-[0.3em] text-accent [animation-delay:1.2s]">
        터치하여 초대장을 열어주세요
      </p>
    </div>
  );
}
