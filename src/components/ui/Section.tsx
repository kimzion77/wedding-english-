"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type Props = {
  id?: string;
  label?: string;
  title?: string;
  children: ReactNode;
  className?: string;
};

export default function Section({ id, label, title, children, className }: Props) {
  return (
    <section
      id={id}
      className={`px-7 py-16 ${className ?? ""}`}
    >
      {(label || title) && (
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {label && (
            <p className="font-title text-xs tracking-[0.35em] text-accent uppercase">
              {label}
            </p>
          )}
          {title && (
            <h2 className="mt-3 font-title text-2xl text-foreground">{title}</h2>
          )}
          <div className="ornament mt-5">
            <i />
          </div>
        </motion.div>
      )}
      {children}
    </section>
  );
}
