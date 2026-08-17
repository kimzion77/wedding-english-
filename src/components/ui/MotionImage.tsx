"use client";

import { motion } from "framer-motion";
import { useState } from "react";

type Props = {
  src: string;
  alt?: string;
  /** tailwind aspect 클래스 (예: "aspect-[3/4]") */
  aspect?: string;
  className?: string;
  /** 켄번즈(천천히 확대) 효과 — 주로 커버용 */
  kenburns?: boolean;
  /** 등장 애니메이션 비활성화 */
  noReveal?: boolean;
  onClick?: () => void;
};

/**
 * 스크롤 진입 시 부드럽게 나타나는 이미지.
 * 실제 사진 파일이 아직 없으면 자동으로 플레이스홀더를 표시한다.
 */
export default function MotionImage({
  src,
  alt = "",
  aspect = "aspect-[3/4]",
  className,
  kenburns = false,
  noReveal = false,
  onClick,
}: Props) {
  const [errored, setErrored] = useState(false);

  return (
    <motion.div
      className={`relative overflow-hidden bg-line/60 ${aspect} ${className ?? ""}`}
      initial={noReveal ? false : { opacity: 0, scale: 1.04 }}
      whileInView={noReveal ? undefined : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      onClick={onClick}
    >
      {errored ? (
        <Placeholder label={alt} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className={`h-full w-full object-cover ${
            kenburns ? "animate-kenburns" : ""
          }`}
        />
      )}
    </motion.div>
  );
}

function Placeholder({ label }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#efe9df,#e3dccd)] text-muted">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.6" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span className="px-2 text-center text-[11px] tracking-wide">
        {label || "사진 준비 중"}
      </span>
    </div>
  );
}
