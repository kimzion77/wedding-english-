"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSiteContent } from "@/components/ContentProvider";
import Section from "@/components/ui/Section";

type Entry = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

export default function Guestbook() {
  const site = useSiteContent();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/guestbook", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        setEntries(j.entries ?? []);
      }
    } catch {
      /* 미설정/오프라인 시 무시 */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setNotice("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "등록에 실패했습니다.");
      }
      form.reset();
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section id="guestbook" label="GUESTBOOK" title={site.guestbook.title}>
      <p className="mb-6 text-center text-sm text-muted">
        {site.guestbook.description}
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          name="name"
          required
          placeholder="성함"
          className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <textarea
          name="message"
          required
          rows={3}
          placeholder="축하 메시지를 남겨주세요"
          className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {notice && <p className="text-sm text-rose-500">{notice}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md border border-accent py-2.5 font-title text-accent transition hover:bg-accent hover:text-white disabled:opacity-60"
        >
          {submitting ? "등록 중..." : "메시지 남기기"}
        </button>
      </form>

      {entries.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">
          첫 번째 축하 메시지를 남겨주세요.
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-7">
          {entries.map((e, i) => (
            <li
              key={e.id}
              className="kraft-note relative px-4 pb-4 pt-7"
              style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (1.2 + (i % 3) * 0.6)}deg)` }}
            >
              <p className="whitespace-pre-wrap break-keep font-batang text-[13px] leading-relaxed">
                {e.message}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-[rgba(120,100,70,0.18)] pt-2">
                <span className="font-title text-[12px] text-[#5a4d36]">
                  {e.name}
                </span>
                <span className="text-[10px] text-[#8a7a5c]">
                  {new Date(e.created_at).toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
