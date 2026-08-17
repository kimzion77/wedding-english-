"use client";

import { motion } from "framer-motion";
import { type Person } from "@/config/site.config";
import { useSiteContent } from "@/components/ContentProvider";
import Section from "@/components/ui/Section";

function PersonCard({ person }: { person: Person }) {
  return (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.7 }}
    >
      <span className="font-title text-xs tracking-[0.3em] text-accent">
        {person.role === "신랑" ? "GROOM" : "BRIDE"}
      </span>
      <p className="mt-3 text-sm text-muted">{person.parents}</p>
      <p className="mt-1">
        <span className="text-muted">{person.role}</span>{" "}
        <span className="font-title text-xl text-foreground">{person.name}</span>
      </p>
      <div className="mt-4 flex gap-2">
        <a
          href={`tel:${person.phone}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-accent transition hover:bg-accent hover:text-white"
          aria-label={`${person.name}에게 전화`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </a>
        <a
          href={`sms:${person.phone}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-accent transition hover:bg-accent hover:text-white"
          aria-label={`${person.name}에게 문자`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </a>
      </div>
    </motion.div>
  );
}

export default function CoupleIntro() {
  const site = useSiteContent();
  return (
    <Section id="couple" label="THE COUPLE" title="신랑 · 신부">
      <div className="grid grid-cols-2 gap-6">
        <PersonCard person={site.groom} />
        <PersonCard person={site.bride} />
      </div>
    </Section>
  );
}
