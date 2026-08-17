"use client";

import { motion } from "framer-motion";
import { useSiteContent } from "@/components/ContentProvider";

export default function Greeting() {
  const site = useSiteContent();
  return (
    <section className="px-7 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8 }}
      >
        <p className="font-title text-xs tracking-[0.35em] text-accent">
          INVITATION
        </p>
        <h2 className="mt-4 font-title text-2xl text-foreground">
          {site.greeting.title}
        </h2>
        <div className="ornament mt-7">
          <i />
        </div>
        <div className="mt-8 space-y-5 text-[15px] leading-loose text-foreground/90">
          {site.greeting.body.map((para, i) => (
            <p key={i} className="whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
