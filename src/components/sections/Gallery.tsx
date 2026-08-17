"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSiteContent } from "@/components/ContentProvider";
import Section from "@/components/ui/Section";

export default function Gallery() {
  const site = useSiteContent();
  const items = site.gallery;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  // 스크롤 위치로 현재 사진 인덱스 추적
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.scrollWidth / items.length;
    setIndex(Math.round(el.scrollLeft / card));
  };

  // 라이트박스 키보드 조작
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight") setActive((i) => (i! + 1) % items.length);
      if (e.key === "ArrowLeft")
        setActive((i) => (i! - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items.length]);

  return (
    <Section id="gallery" label="GALLERY" title="우리의 순간">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar snap-x-carousel -mx-7 flex gap-4 overflow-x-auto px-[16%] pb-2"
      >
        {items.map((it, i) => (
          <motion.figure
            key={it.src}
            className="snap-item w-[68%] shrink-0 cursor-pointer bg-white p-2.5 pb-10 shadow-[0_8px_20px_rgba(80,60,30,0.16)]"
            onClick={() => setActive(i)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.src}
                alt={it.alt ?? ""}
                loading="lazy"
                className="aspect-[4/5] w-full bg-line/60 object-cover"
              />
              {it.video && (
                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white backdrop-blur-sm">
                  <span className="text-[8px]">▶</span> 움직이는 사진
                </span>
              )}
            </div>
            <figcaption className="mt-3 text-center font-title text-[13px] tracking-wide text-[#7a6f5d]">
              {it.alt}
            </figcaption>
          </motion.figure>
        ))}
      </div>

      {/* 페이지 점 + 안내 */}
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {items.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-4 bg-accent" : "w-1.5 bg-line"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] tracking-[0.3em] text-muted">
        밀어서 넘겨보세요
      </p>

      <AnimatePresence>
        {active !== null && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          >
            <button
              className="absolute right-4 top-4 text-2xl text-white/80"
              aria-label="닫기"
              onClick={() => setActive(null)}
            >
              ✕
            </button>
            {items[active].video ? (
              <motion.video
                key={items[active].video}
                src={items[active].video}
                poster={items[active].src}
                autoPlay
                loop
                muted
                playsInline
                className="max-h-[85vh] max-w-full object-contain"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <motion.img
                key={items[active].src}
                src={items[active].src}
                alt={items[active].alt ?? ""}
                className="max-h-[85vh] max-w-full object-contain"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
