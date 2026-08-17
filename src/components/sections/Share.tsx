"use client";

import { useEffect, useState } from "react";
import { useSiteContent } from "@/components/ContentProvider";
import { formatWeddingDate, toCalendarTimes } from "@/lib/datetime";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: { sendDefault: (o: unknown) => void };
    };
  }
}

export default function Share() {
  const site = useSiteContent();
  const [kakaoReady, setKakaoReady] = useState(false);
  const d = formatWeddingDate(site.weddingAt);
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  useEffect(() => {
    if (!kakaoKey) return;
    const id = "kakao-sdk";
    if (document.getElementById(id)) {
      initKakao();
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    s.async = true;
    s.onload = initKakao;
    document.head.appendChild(s);

    function initKakao() {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey!);
      }
      setKakaoReady(Boolean(window.Kakao));
    }
  }, [kakaoKey]);

  const pageUrl =
    site.siteUrl || (typeof window !== "undefined" ? window.location.href : "");

  function shareKakao() {
    if (!window.Kakao) return;
    const img = site.share.imageUrl.startsWith("http")
      ? site.share.imageUrl
      : `${site.siteUrl}${site.share.imageUrl}`;
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: site.share.title,
        description: `${d.dot} ${d.weekday} ${site.venue.name}`,
        imageUrl: img,
        link: { mobileWebUrl: pageUrl, webUrl: pageUrl },
      },
      buttons: [
        {
          title: "청첩장 보기",
          link: { mobileWebUrl: pageUrl, webUrl: pageUrl },
        },
      ],
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      alert("링크가 복사되었습니다.");
    } catch {
      /* 무시 */
    }
  }

  function addCalendar() {
    const { start, end } = toCalendarTimes(site.weddingAt);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${site.groomName} ♥ ${site.brideName} 결혼식`,
      `LOCATION:${site.venue.name} ${site.venue.hall}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wedding.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="px-7 pb-24 pt-10 text-center">
      <div className="mx-auto max-w-xs space-y-2.5">
        <button
          onClick={shareKakao}
          disabled={!kakaoReady}
          className="w-full rounded-md bg-[#FEE500] py-3 font-title text-[#3c1e1e] transition disabled:opacity-50"
        >
          {kakaoReady ? "카카오톡으로 공유하기" : "카카오톡 공유 (키 미설정)"}
        </button>
        <button
          onClick={addCalendar}
          className="w-full rounded-md border border-line bg-card py-3 font-title text-foreground transition hover:bg-line/40"
        >
          캘린더에 일정 추가
        </button>
        <button
          onClick={copyLink}
          className="w-full rounded-md border border-line bg-card py-3 font-title text-foreground transition hover:bg-line/40"
        >
          청첩장 링크 복사
        </button>
      </div>

      <div className="mt-16">
        <p className="font-title text-lg text-accent">
          {site.groomName} · {site.brideName}
        </p>
        <p className="mt-2 text-xs tracking-widest text-muted">
          {d.dot} · {site.venue.name}
        </p>
      </div>
    </section>
  );
}
