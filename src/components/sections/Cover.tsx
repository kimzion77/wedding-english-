"use client";

import { motion } from "framer-motion";
import { useSiteContent } from "@/components/ContentProvider";
import { formatWeddingDate } from "@/lib/datetime";
import MotionImage from "@/components/ui/MotionImage";

export default function Cover() {
  const site = useSiteContent();
  const d = formatWeddingDate(site.weddingAt);

  return (
    <section className="relative">
      <div className="relative h-[88vh] min-h-[560px] w-full">
        <MotionImage
          src={site.coverImage}
          alt="대표 사진"
          aspect="h-full w-full"
          kenburns
          noReveal
          className="!aspect-auto h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/35" />

        <motion.div
          className="absolute inset-x-0 top-14 text-center text-white"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <p className="font-title text-sm tracking-[0.4em]">WEDDING INVITATION</p>
        </motion.div>

        <motion.div
          className="absolute inset-x-0 bottom-12 text-center text-white"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <h1 className="font-title text-3xl tracking-wide drop-shadow">
            {site.groomName}
            <span className="mx-3 text-white/80">·</span>
            {site.brideName}
          </h1>
          <p className="mt-4 text-sm tracking-widest drop-shadow">
            {d.dot} {d.weekday}
          </p>
          <p className="text-sm tracking-widest drop-shadow">
            {site.venue.name}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
