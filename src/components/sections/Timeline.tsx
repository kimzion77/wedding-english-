"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSiteContent } from "@/components/ContentProvider";
import { daysSince, formatWeddingDate } from "@/lib/datetime";

export default function Timeline() {
  const site = useSiteContent();
  const [days, setDays] = useState<number | null>(null);
  const wed = formatWeddingDate(site.weddingAt);

  useEffect(() => {
    setDays(daysSince(site.firstMetDate));
  }, []);

  const firstMet = new Date(site.firstMetDate);

  return (
    <section className="bg-tint px-7 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8 }}
      >
        <p className="font-title text-xs tracking-[0.35em] text-accent">
          OUR TIME
        </p>
        <h2 className="mt-4 font-title text-2xl text-foreground">함께한 시간</h2>
        <div className="ornament mt-5">
          <i />
        </div>
        <p className="mt-7 text-sm text-muted">처음 만난 그날부터 오늘까지</p>

        <div className="mt-8">
          <span className="font-title text-5xl text-accent tabular-nums">
            {days !== null ? days.toLocaleString() : "—"}
          </span>
          <span className="ml-2 text-lg text-foreground">일</span>
        </div>

        <div className="mx-auto mt-10 flex max-w-xs items-center justify-between text-sm text-muted">
          <div>
            <p className="text-[11px] tracking-widest text-accent">처음 만난 날</p>
            <p className="mt-1 font-title text-foreground">
              {firstMet.getFullYear()}.{String(firstMet.getMonth() + 1).padStart(2, "0")}.
              {String(firstMet.getDate()).padStart(2, "0")}
            </p>
          </div>
          <div className="h-px flex-1 mx-3 bg-line" />
          <div>
            <p className="text-[11px] tracking-widest text-accent">결혼하는 날</p>
            <p className="mt-1 font-title text-foreground">{wed.dot}</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
