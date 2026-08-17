"use client";

import { useEffect, useState } from "react";
import { daysUntil } from "@/lib/datetime";

type Remain = { d: number; h: number; m: number; s: number; passed: boolean };

function calc(targetIso: string): Remain {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, passed: true };
  const s = Math.floor(diff / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    passed: false,
  };
}

export default function Countdown({
  targetIso,
  groomName,
  brideName,
}: {
  targetIso: string;
  groomName: string;
  brideName: string;
}) {
  const [remain, setRemain] = useState<Remain | null>(null);

  useEffect(() => {
    setRemain(calc(targetIso));
    const id = setInterval(() => setRemain(calc(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const dday = daysUntil(targetIso);

  return (
    <div className="mx-auto max-w-xs text-center">
      <div className="grid grid-cols-4 gap-2">
        {[
          { v: remain?.d, u: "DAYS" },
          { v: remain?.h, u: "HOUR" },
          { v: remain?.m, u: "MIN" },
          { v: remain?.s, u: "SEC" },
        ].map((b) => (
          <div
            key={b.u}
            className="rounded-md border border-line bg-card py-3"
          >
            <div className="font-title text-xl text-foreground tabular-nums">
              {remain ? String(b.v).padStart(2, "0") : "--"}
            </div>
            <div className="mt-1 text-[10px] tracking-[0.2em] text-muted">
              {b.u}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm text-muted">
        {dday > 0 ? (
          <>
            <span className="text-accent">{groomName}</span>,{" "}
            <span className="text-accent">{brideName}</span>의 결혼식이{" "}
            <span className="font-title text-foreground">{dday}일</span> 남았습니다.
          </>
        ) : dday === 0 ? (
          <>오늘은 저희의 결혼식 날입니다.</>
        ) : (
          <>함께해 주셔서 감사합니다.</>
        )}
      </p>
    </div>
  );
}
