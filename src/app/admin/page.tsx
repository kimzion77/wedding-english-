"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Sortable from "sortablejs";

/* ── 타입 ─────────────────────────────────────────── */
type Rsvp = {
  id: string;
  created_at: string;
  side: string;
  name: string;
  attendance: string;
  guest_count: number;
  meal: string;
  phone: string | null;
  message: string | null;
};
type GuestEntry = { id: string; name: string; message: string; created_at: string };
type Media = { id: string; media_type: string; url: string };
type Album = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  media: Media[];
};
type Tab = "overview" | "rsvp" | "guestbook" | "snap" | "edit";
type Breakdown = {
  device: Record<string, number>;
  os: Record<string, number>;
  browser: Record<string, number>;
  referer: Record<string, number>;
  country?: Record<string, number>;
};
type RecentVisit = {
  id: string;
  created_at: string;
  variant: string;
  session_id: string | null;
  device?: string;
  os?: string;
  browser?: string;
  ip?: string | null;
  country?: string | null;
  city?: string | null;
  referer?: string;
};
type VisitStats = {
  today: number;
  todayUnique: number;
  yesterday: number;
  week: number;
  total: number;
  byDay: { date: string; count: number; unique: number }[];
  byHour: { hour: number; count: number }[];
  byVariant: { main: number; honju: number };
  todayBreakdown?: Breakdown;
  weekBreakdown?: Breakdown;
  recent: RecentVisit[];
};
type Variant = "main" | "honju";

const SECTION_LIST: { id: string; label: string; required?: boolean }[] = [
  { id: "cover", label: "표지 (커버)", required: true },
  { id: "greeting", label: "인사말" },
  { id: "film", label: "메인 영상" },
  { id: "calendar", label: "캘린더 + 카운트다운" },
  { id: "couple", label: "신랑·신부 소개" },
  { id: "timeline", label: "우리의 시간 (타임라인)" },
  { id: "gallery", label: "갤러리" },
  { id: "location", label: "오시는 길" },
  { id: "rsvp", label: "참석 여부 (RSVP)" },
  { id: "accounts", label: "마음 전하실 곳 (계좌)" },
  { id: "guestbook", label: "방명록" },
  { id: "guestsnap", label: "게스트스냅" },
  { id: "photobooth", label: "포토부스 이벤트" },
  { id: "ending", label: "엔딩" },
];
type Account = {
  id: string;
  side: "groom" | "bride";
  role: string;
  bank: string | null;
  number: string | null;
  holder: string | null;
  phone: string | null;
  kakaopay: string | null;
};

const TEXT_SLOTS: { id: string; label: string; def: string }[] = [
  { id: "greeting_poem", label: "인사말 — 시 구절", def: "서로의 이름을 부르는 것만으로도\n사랑의 깊이를 확인할 수 있는 두 사람이\n꽃과 나무처럼 걸어와서\n서로의 모든 것이 되기 위해\n오랜 기다림 끝에 혼례식을 치르는 날\n세상은 더욱 아름다워라" },
  { id: "greeting_credit", label: "인사말 — 시 출처", def: "<사랑의 사람들이여>, 이해인" },
  { id: "greeting_title", label: "인사말 — 제목", def: "소중한 분들을\n초대합니다" },
  { id: "greeting_body", label: "인사말 — 본문", def: "12년이 넘는 시간을 나란히 걷는 동안,\n발 맞춰 걷는 법을 배웠습니다.\n\n이제 다가오는 모든 계절을 함께하며,\n언제나 서로의 곁을 지키는 사람이 되겠습니다.\n\n12월의 어느 날,\n늘 곁에서 아껴주신 소중한 분들을 모십니다." },
  { id: "film_caption", label: "필름 영상 — 설명", def: "필름 한 컷에\n우리의 계절을 담았습니다." },
  { id: "rsvp_note", label: "참석여부 — 안내문", def: "소중한 시간을 내어 결혼식에\n참석해주시는 모든 분들께 감사드립니다.\n원활한 예식 준비를 위해\n참석 여부를 미리 알려주시면\n더욱 감사하겠습니다." },
  { id: "accounts_note", label: "마음 전하실 곳 — 안내문", def: "멀리서도 축하의 마음을\n전하고 싶으신 분들을 위해\n계좌번호를 안내드립니다.\n따뜻한 마음에 깊이 감사드립니다." },
  { id: "photobooth_title", label: "포토부스 — 제목", def: "포토부스 이벤트" },
  { id: "photobooth_intro", label: "포토부스 — 안내문", def: "결혼식 당일, 신랑·신부가 준비한\n무료 포토부스를 운영합니다.\n소중한 분들과의 특별한 순간을 사진으로 남기고,\n즉석에서 인화된 사진을 받아가세요." },
];

type Slot = {
  id: string;
  group: string;
  label: string;
  ratio: string;
  def: string;
  type: "image" | "video";
};
const PHOTO_GROUPS = ["메인 필름"];
const PHOTO_SLOTS: Slot[] = [
  { id: "film_video", group: "메인 필름", label: "메인 영상", ratio: "세로 3:4 · 영상", def: "/assets/film.mp4", type: "video" },
  { id: "film_poster", group: "메인 필름", label: "영상 표지(첫 화면)", ratio: "세로 3:4", def: "/assets/film_poster.jpg", type: "image" },
];

type DynSection = "gallery" | "timeline" | "ending";
type DynItem = { id: string; section: DynSection; step: string; year_title: string; caption: string; url: string };
const DYN_SECTIONS: { id: DynSection; label: string; ratio: string; hint: string; hasMeta: boolean }[] = [
  { id: "gallery", label: "갤러리 (캐러셀)", ratio: "세로 3:4", hint: "스와이프 슬라이드로 보여집니다. 추가한 순서대로 표시.", hasMeta: false },
  { id: "timeline", label: "타임라인 (우리의 시간)", ratio: "정사각 1:1", hint: "각 사진마다 라벨(예: First / 첫 만남 / 설명)을 적을 수 있어요.", hasMeta: true },
  { id: "ending", label: "엔딩", ratio: "정사각 1:1", hint: "마지막 사진. 아래에 짧은 마크(예: The End · 12.20)를 적을 수 있어요.", hasMeta: true },
];


/* ── CSV(엑셀) 내보내기 ───────────────────────────── */
function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
const fmt = (s: string) => {
  const d = new Date(s);
  const D = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} (${D}) ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
};

/* ── 국가 코드(ISO-2) → 국기 이모지 + 한글명 ─────────── */
const COUNTRY_NAMES: Record<string, string> = {
  KR: "대한민국", US: "미국", JP: "일본", CN: "중국", TW: "대만", HK: "홍콩",
  GB: "영국", DE: "독일", FR: "프랑스", CA: "캐나다", AU: "호주", SG: "싱가포르",
  VN: "베트남", TH: "태국", PH: "필리핀", ID: "인도네시아", IN: "인도", NZ: "뉴질랜드",
  AE: "아랍에미리트", NL: "네덜란드", IT: "이탈리아", ES: "스페인", RU: "러시아", BR: "브라질",
};
function flagEmoji(cc: string): string {
  if (!cc || cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}
function countryLabel(cc: string | null | undefined): string {
  if (!cc || cc === "UNKNOWN") return "🏳️ 알 수 없음";
  const up = cc.toUpperCase();
  return `${flagEmoji(up)} ${COUNTRY_NAMES[up] || up}`;
}

/* ── 팔레트 (invite 와 동일 톤) ───────────────────── */
const C = {
  paper: "#f3ecdf",
  card: "#faf5ec",
  lo: "#efe7d6",
  ink: "#41452f",
  body: "#54513f",
  soft: "#8a8466",
  groom: "#5d6b4c",
  bride: "#9b5a52",
  wax: "#7e2d27",
  line: "rgba(63,60,40,.18)",
};
const serif = { fontFamily: "'Nanum Myeongjo', serif" } as const;
const enFont = { fontFamily: "'Cormorant Garamond', serif" } as const;
const inp = { background: "#fff", border: `1px solid ${C.line}`, color: C.body } as const;

/* ── 편집 탭 컨텍스트 ──────────────────────────────────
 * Card/TextField/SlotField/DynList 는 반드시 모듈 스코프에 둔다.
 * (AdminPage 렌더 함수 안에서 정의하면 입력할 때마다 컴포넌트 정체성이
 *  바뀌어 리마운트 → 포커스·스크롤이 초기화되는 버그가 생김)
 * 필요한 상태·핸들러는 이 컨텍스트로 주입한다. */
type EditorCtxValue = {
  siteTexts: Record<string, string>;
  siteImages: Record<string, string>;
  dynItems: DynItem[];
  openEditSection: string | null;
  setOpenEditSection: (v: string | null) => void;
  tval: (id: string) => string;
  setDraft: (id: string, v: string) => void;
  toggleSection: (sid: string, next: boolean) => void;
  dirtyOfCard: (cid: string) => boolean;
  saveCard: (card: "greeting" | "film" | "rsvp" | "accounts" | "timeline" | "ending") => void;
  uploadSlot: (slot: string, f: File) => void;
  resetSlot: (slot: string) => void;
  addDynPhoto: (section: DynSection, f: File) => void | Promise<void>;
  replaceDynPhoto: (id: string, f: File) => void | Promise<void>;
  reorderByIndex: (section: DynSection, oldIdx: number, newIdx: number) => void;
  moveDynItem: (id: string, dir: -1 | 1) => void;
  deleteDynItem: (id: string) => void;
  setDynLocal: (id: string, patch: Partial<Pick<DynItem, "step" | "year_title" | "caption">>) => void;
};
const EditorCtx = createContext<EditorCtxValue | null>(null);
const useEditor = () => {
  const c = useContext(EditorCtx);
  if (!c) throw new Error("EditorCtx missing");
  return c;
};

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button onClick={onChange} disabled={disabled} aria-label="toggle"
      className="relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: on ? C.groom : "#cfc8b7" }}
    >
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? "22px" : "2px" }} />
    </button>
  );
}

function Card({ id: cid, label, required, children, saveable }: { id: string; label: string; required?: boolean; children?: React.ReactNode; saveable?: boolean }) {
  const { siteTexts, openEditSection, setOpenEditSection, toggleSection, dirtyOfCard, saveCard } = useEditor();
  const k = `section.${cid}`;
  const enabled = required ? true : siteTexts[k] !== "off";
  const isOpen = openEditSection === cid;
  const hasBody = !!children;
  const dirty = saveable ? dirtyOfCard(cid) : false;
  return (
    <div className="overflow-hidden rounded-xl" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Toggle on={enabled} disabled={!!required} onChange={() => toggleSection(cid, !enabled)} />
        <button onClick={() => hasBody && setOpenEditSection(isOpen ? null : cid)} className="flex-1 text-left text-sm" style={{ ...serif, color: enabled ? C.ink : C.soft, cursor: hasBody ? "pointer" : "default" }}>
          {label}
          {required && <span className="ml-1 text-[10px]" style={{ color: C.soft }}>· 필수</span>}
          {!required && !enabled && <span className="ml-1 text-[10px]" style={{ color: C.soft }}>· 숨김</span>}
          {dirty && <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px]" style={{ background: C.wax, color: "#fff" }}>● 변경됨</span>}
        </button>
        {hasBody && <span style={{ color: C.soft }}>{isOpen ? "▴" : "▾"}</span>}
      </div>
      {isOpen && hasBody && (
        <>
          <div className="space-y-3 px-4 pb-3 pt-1" style={{ borderTop: `1px solid ${C.line}` }}>{children}</div>
          {saveable && (
            <div className="flex items-center justify-end gap-2 px-4 pb-3">
              <button
                onClick={() => saveCard(cid as "greeting" | "film" | "rsvp" | "accounts" | "timeline" | "ending")}
                disabled={!dirty}
                className="rounded-md px-4 py-1.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: dirty ? C.groom : "#cfc8b7" }}
              >
                {dirty ? "변경 사항 저장" : "저장됨"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TextField({ id: tid, label, rows }: { id: string; label: string; rows?: number }) {
  const { tval, setDraft } = useEditor();
  return (
    <label className="block">
      <span className="text-[11px]" style={{ color: C.soft }}>{label}</span>
      {rows && rows > 1 ? (
        <textarea rows={rows} value={tval(tid)} onChange={(e) => setDraft(tid, e.target.value)}
          className="mt-1 w-full rounded px-2 py-1.5 text-sm outline-none" style={inp} />
      ) : (
        <input value={tval(tid)} onChange={(e) => setDraft(tid, e.target.value)}
          className="mt-1 w-full rounded px-2 py-1.5 text-sm outline-none" style={inp} />
      )}
    </label>
  );
}

function SlotField({ slot, label, ratio, video }: { slot: string; label: string; ratio: string; video?: boolean }) {
  const { siteImages, uploadSlot, resetSlot } = useEditor();
  const ov = siteImages[slot];
  const def = PHOTO_SLOTS.find((s) => s.id === slot)?.def || "";
  const cur = ov || def;
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2" style={{ background: C.lo }}>
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded" style={{ background: "#fff" }}>
        {video ? (
          <video src={cur} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={cur} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: C.ink }}>{label}</p>
        <p className="text-[10px]" style={{ color: C.soft }}>{ratio} · {ov ? "교체됨" : "기본"}</p>
      </div>
      <label className="cursor-pointer rounded px-2 py-1 text-xs text-white" style={{ background: C.groom }}>
        변경
        <input type="file" accept={video ? "video/*" : "image/*"} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSlot(slot, f); e.currentTarget.value = ""; }} />
      </label>
      {ov && <button onClick={() => resetSlot(slot)} className="text-[11px] underline" style={{ color: C.soft }}>기본</button>}
    </div>
  );
}

function DynList({ section, ratio, meta }: { section: DynSection; ratio: string; meta?: boolean }) {
  const { dynItems, addDynPhoto, reorderByIndex, moveDynItem, replaceDynPhoto, deleteDynItem, setDynLocal } = useEditor();
  const list = dynItems.filter((x) => x.section === section);
  const ar = ratio.includes("3:4") ? "3/4" : "1/1";
  const sortRef = useRef<HTMLDivElement | null>(null);
  // onEnd 가 항상 최신 reorderByIndex 를 부르도록 ref 로 유지
  // (effect 는 순서 변경으로는 재실행되지 않아, 함수 클로저가 낡으면 예전 목록 기준으로 재배열되는 버그가 있었음)
  const reorderRef = useRef(reorderByIndex);
  useEffect(() => { reorderRef.current = reorderByIndex; });
  // SortableJS — 데스크탑(마우스 드래그) + 모바일(터치 드래그) 모두 지원
  useEffect(() => {
    const el = sortRef.current;
    if (!el || list.length === 0) return;
    const sortable = Sortable.create(el, {
      handle: ".dyn-handle",
      animation: 160,
      delayOnTouchOnly: true,
      delay: 80, // 모바일: 약간 길게 눌러야 드래그 (스크롤과 구분)
      touchStartThreshold: 5,
      swapThreshold: 0.65, // 그리드에서 살짝 스쳐도 자리가 바뀌는 과민함 완화
      ghostClass: "dyn-ghost",
      chosenClass: "dyn-chosen",
      filter: "input, textarea, button, label",
      preventOnFilter: false,
      onEnd: (evt) => {
        if (evt.oldIndex == null || evt.newIndex == null) return;
        // SortableJS 가 직접 옮긴 DOM 을 원위치로 되돌린다.
        // 순서의 진실은 React 상태 — DOM 이 먼저 바뀐 채로 리렌더되면 목록이 꼬인다.
        const { item, from } = evt;
        from.removeChild(item);
        if (evt.oldIndex >= from.children.length) from.appendChild(item);
        else from.insertBefore(item, from.children[evt.oldIndex]);
        reorderRef.current(section, evt.oldIndex, evt.newIndex);
      },
    });
    return () => sortable.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length, section]);
  return (
    <>
      <label className="inline-block cursor-pointer rounded px-2.5 py-1 text-xs text-white" style={{ background: C.groom }}>
        + 사진 추가
        <input type="file" accept="image/*" multiple hidden onChange={(e) => { const fs = Array.from(e.target.files || []); e.currentTarget.value = ""; (async () => { for (const f of fs) await addDynPhoto(section, f); })(); }} />
      </label>
      <p className="text-[10px]" style={{ color: C.soft }}>
        PC: 마우스로 드래그 / 모바일: <b>길게 눌러서</b> 드래그
      </p>
      {list.length === 0 ? (
        <p className="text-xs" style={{ color: C.soft }}>아직 추가한 사진이 없어요. (없으면 기본 예시가 표시됩니다)</p>
      ) : meta ? (
        <div ref={sortRef} className="grid gap-2">
          {list.map((it, idx) => (
            <div
              key={it.id}
              data-id={it.id}
              className="flex gap-3 rounded p-2 transition"
              style={{ background: C.lo }}
            >
              <div className="flex shrink-0 flex-col items-stretch justify-center gap-1">
                <span
                  className="dyn-handle select-none rounded px-1.5 text-center text-xs"
                  style={{ cursor: "grab", background: "#fff", border: `1px solid ${C.line}`, color: C.soft, touchAction: "none" }}
                  title="드래그해서 순서 변경"
                >⋮⋮</span>
                <button onClick={() => moveDynItem(it.id, -1)} disabled={idx === 0} className="rounded px-1 text-xs disabled:opacity-30" style={{ background: "#fff", border: `1px solid ${C.line}` }} title="위로">↑</button>
                <span className="text-center text-[9px]" style={{ color: C.soft }}>{idx + 1}</span>
                <button onClick={() => moveDynItem(it.id, 1)} disabled={idx === list.length - 1} className="rounded px-1 text-xs disabled:opacity-30" style={{ background: "#fff", border: `1px solid ${C.line}` }} title="아래로">↓</button>
              </div>
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt="" className="h-full w-full object-cover" style={{ aspectRatio: ar }} draggable={false} />
                <label className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/55 py-0.5 text-center text-[9px] text-white">
                  사진 교체
                  <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceDynPhoto(it.id, f); e.currentTarget.value = ""; }} />
                </label>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {section === "timeline" && (
                  <>
                    <input value={it.step} placeholder="라틴 라벨" onChange={(e) => setDynLocal(it.id, { step: e.target.value })} className="w-full rounded px-2 py-1 text-[11px]" style={inp} />
                    <input value={it.year_title} placeholder="제목" onChange={(e) => setDynLocal(it.id, { year_title: e.target.value })} className="w-full rounded px-2 py-1 text-xs" style={{ ...inp, ...serif }} />
                    <textarea value={it.caption} placeholder="설명 — [[강조할 부분]] 으로 감싸면 노란 하이라이트" rows={2} onChange={(e) => setDynLocal(it.id, { caption: e.target.value })} className="w-full rounded px-2 py-1 text-[11px]" style={inp} />
                  </>
                )}
                {section === "ending" && (
                  <input value={it.caption} placeholder="마크 (예: The End · 12.20)" onChange={(e) => setDynLocal(it.id, { caption: e.target.value })} className="w-full rounded px-2 py-1 text-xs" style={{ ...inp, ...serif }} />
                )}
                <button onClick={() => deleteDynItem(it.id)} className="rounded px-2 py-0.5 text-[10px]" style={{ border: `1px solid ${C.bride}`, color: C.bride }}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div ref={sortRef} className="grid grid-cols-3 gap-1.5">
          {list.map((it, idx) => (
            <div
              key={it.id}
              data-id={it.id}
              className="dyn-handle relative overflow-hidden rounded transition"
              style={{ background: C.lo, cursor: "grab", touchAction: "none" }}
              title="드래그해서 순서 변경"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt="" className="w-full object-cover" style={{ aspectRatio: ar }} draggable={false} />
              <div className="absolute left-1 top-1 flex gap-0.5">
                <button onClick={() => moveDynItem(it.id, -1)} disabled={idx === 0} className="rounded px-1 py-0.5 text-[10px] text-white disabled:opacity-30" style={{ background: "rgba(0,0,0,.55)" }}>↑</button>
                <button onClick={() => moveDynItem(it.id, 1)} disabled={idx === list.length - 1} className="rounded px-1 py-0.5 text-[10px] text-white disabled:opacity-30" style={{ background: "rgba(0,0,0,.55)" }}>↓</button>
              </div>
              <label className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/55 py-0.5 text-center text-[9px] text-white">
                교체
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceDynPhoto(it.id, f); e.currentTarget.value = ""; }} />
              </label>
              <button onClick={() => deleteDynItem(it.id)} className="absolute right-1 top-1 rounded px-1 py-0.5 text-[9px] text-white" style={{ background: "rgba(123,45,39,.85)" }}>×</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("edit");
  // 순서 변경 요청 세대 — 연속 드래그 시 예전 응답이 새 순서를 덮어쓰는 것 방지
  const reorderEpochRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [rsvp, setRsvp] = useState<Rsvp[]>([]);
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [openAlbum, setOpenAlbum] = useState<string | null>(null);
  const [siteImages, setSiteImages] = useState<Record<string, string>>({});
  const [siteTexts, setSiteTexts] = useState<Record<string, string>>({});
  const [textDraft, setTextDraft] = useState<Record<string, string>>({});
  const [variant, setVariant] = useState<Variant>("main");
  const [previewKey, setPreviewKey] = useState(0);
  const [openEditSection, setOpenEditSection] = useState<string | null>("greeting");
  const variantLabel = (v: Variant) => (v === "honju" ? "혼주용" : "메인 (신랑·신부)");
  const ok = (msg: string) => setNotice(`✓ [${variantLabel(variant)}] ${msg}`);
  // 성공 알림(✓로 시작)은 3초 후 자동 사라짐 (에러는 유지)
  useEffect(() => {
    if (!notice || !notice.startsWith("✓") && !notice.startsWith("✎")) return;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);
  const [dynItems, setDynItems] = useState<DynItem[]>([]);
  const [savedDynItems, setSavedDynItems] = useState<DynItem[]>([]);
  const [accounts, setAccounts] = useState<{ groom: Account[]; bride: Account[] }>({ groom: [], bride: [] });
  const [savedAccounts, setSavedAccounts] = useState<{ groom: Account[]; bride: Account[] }>({ groom: [], bride: [] });
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsLoadedAt, setVisitsLoadedAt] = useState<number | null>(null);

  const loadVisits = useCallback(async (k: string) => {
    setVisitsLoading(true);
    try {
      const r = await fetch(`/api/admin/visits?key=${encodeURIComponent(k)}`, { cache: "no-store" });
      const j = await r.json();
      if (r.ok) {
        setVisitStats(j);
        setVisitsLoadedAt(Date.now());
      }
    } catch {}
    setVisitsLoading(false);
  }, []);

  // 개요 탭 진입 시 1회 로드 + 30초마다 자동 갱신
  useEffect(() => {
    if (!authed || tab !== "overview" || !key) return;
    loadVisits(key);
    const t = setInterval(() => loadVisits(key), 30_000);
    return () => clearInterval(t);
  }, [authed, tab, key, loadVisits]);

  const loadAll = useCallback(async (k: string) => {
    setLoading(true);
    setError("");
    try {
      // 최초 진입 시 변형별 기본 콘텐츠 시드 (이미 데이터 있으면 무동작)
      await Promise.all([
        fetch(`/api/gallery/init?key=${encodeURIComponent(k)}&v=main`, { method: "POST" }).catch(() => {}),
        fetch(`/api/gallery/init?key=${encodeURIComponent(k)}&v=honju`, { method: "POST" }).catch(() => {}),
        fetch(`/api/accounts/init?key=${encodeURIComponent(k)}&v=main`, { method: "POST" }).catch(() => {}),
        fetch(`/api/accounts/init?key=${encodeURIComponent(k)}&v=honju`, { method: "POST" }).catch(() => {}),
        // 옛 시드 평문 → [[하이라이트]] 마크업 일회성 마이그레이션
        fetch(`/api/gallery/migrate-highlights?key=${encodeURIComponent(k)}`, { method: "POST" }).catch(() => {}),
      ]);
      const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
        fetch(`/api/admin/rsvp?key=${encodeURIComponent(k)}`),
        fetch(`/api/guestbook`, { cache: "no-store" }),
        fetch(`/api/admin/albums?key=${encodeURIComponent(k)}`),
        fetch(`/api/site-images`, { cache: "no-store" }),
        fetch(`/api/site-texts`, { cache: "no-store" }),
        fetch(`/api/gallery`, { cache: "no-store" }),
        fetch(`/api/accounts`, { cache: "no-store" }),
      ]);
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1.error || "조회 실패 (비밀번호 확인)");
      const j2 = await r2.json();
      const j3 = await r3.json();
      const j4 = await r4.json();
      const j5 = await r5.json();
      const j6 = await r6.json();
      const j7 = await r7.json();
      setRsvp(j1.rows ?? []);
      setGuests(j2.entries ?? []);
      setAlbums(j3.albums ?? []);
      setSiteImages(j4.overrides ?? {});
      setDynItems(j6.items ?? []);
      setSavedDynItems(j6.items ?? []);
      const accInit = { groom: j7.groom ?? [], bride: j7.bride ?? [] };
      setAccounts(accInit);
      setSavedAccounts(accInit);
      const tov: Record<string, string> = j5.overrides ?? {};
      setSiteTexts(tov);
      const draft: Record<string, string> = {};
      TEXT_SLOTS.forEach((s) => (draft[s.id] = tov[s.id] ?? s.def));
      setTextDraft(draft);
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, []);

  async function deleteGuest(id: string) {
    if (!confirm("이 방명록 글을 삭제할까요?")) return;
    const res = await fetch(`/api/guestbook?key=${encodeURIComponent(key)}&id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) setGuests((g) => g.filter((e) => e.id !== id));
    else setError("삭제 실패");
  }
  async function deleteAlbum(id: string) {
    if (!confirm("이 앨범과 사진·영상을 모두 삭제할까요?")) return;
    const res = await fetch(`/api/admin/albums?key=${encodeURIComponent(key)}&id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setAlbums((a) => a.filter((x) => x.id !== id));
      setNotice("앨범을 삭제했습니다.");
    } else setError("삭제 실패");
  }

  // 사진은 업로드 전 클라이언트에서 압축 (긴 변 1200px, JPEG q80)
  async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) return file;
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file);
      });
      const img: HTMLImageElement = await new Promise((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
      });
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d"); if (!ctx) return file;
      ctx.drawImage(img, 0, 0, w, h);
      const blob: Blob | null = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.8));
      if (!blob || blob.size >= file.size) return file;
      const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      return new File([blob], name, { type: "image/jpeg" });
    } catch { return file; }
  }
  async function uploadFileToServer(file: File): Promise<string> {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append("file", compressed);
    const up = await fetch(`/api/upload?key=${encodeURIComponent(key)}`, { method: "POST", body: fd });
    const uj = await up.json();
    if (!up.ok || !uj.fileKey) throw new Error(uj.error || "업로드 실패");
    return uj.fileKey;
  }
  async function uploadSlot(slot: string, file: File) {
    setNotice("");
    setError("");
    try {
      const fileKey = await uploadFileToServer(file);
      const sv = await fetch(`/api/site-images?key=${encodeURIComponent(key)}&v=${variant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, fileKey }),
      });
      if (!sv.ok) {
        const j = await sv.json().catch(() => ({}));
        throw new Error(j.error || "저장 실패");
      }
      setSiteImages((m) => ({
        ...m,
        [slot]: `/api/site-images/file?slot=${encodeURIComponent(slot)}&v=${variant}&t=${Date.now()}`,
      }));
      setPreviewKey((k) => k + 1);
      ok("사진을 교체했습니다");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  }
  async function resetSlot(slot: string) {
    if (!confirm("이 자리를 기본 사진으로 되돌릴까요?")) return;
    const r = await fetch(
      `/api/site-images?key=${encodeURIComponent(key)}&v=${variant}&slot=${encodeURIComponent(slot)}`,
      { method: "DELETE" }
    );
    if (r.ok) {
      setSiteImages((m) => {
        const n = { ...m };
        delete n[slot];
        return n;
      });
      setPreviewKey((k) => k + 1);
      ok("기본 사진으로 되돌렸습니다");
    } else setError("되돌리기 실패");
  }

  async function addDynPhoto(section: DynSection, file: File) {
    setNotice("");
    setError("");
    try {
      const fileKey = await uploadFileToServer(file);
      const sv = await fetch(`/api/gallery?key=${encodeURIComponent(key)}&v=${variant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, fileKey }),
      });
      const sj = await sv.json();
      if (!sv.ok || !sj.id) throw new Error(sj.error || "추가 실패");
      setDynItems((g) => [
        ...g,
        { id: sj.id, section, step: "", year_title: "", caption: "", url: `/api/gallery/file?id=${sj.id}&t=${Date.now()}` },
      ]);
      setPreviewKey((k) => k + 1);
      ok(`${section === "gallery" ? "갤러리" : section === "timeline" ? "타임라인" : "엔딩"}에 사진 추가됨`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  }
  async function deleteDynItem(id: string) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    const r = await fetch(
      `/api/gallery?key=${encodeURIComponent(key)}&v=${variant}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (r.ok) {
      setDynItems((g) => g.filter((x) => x.id !== id));
      setPreviewKey((k) => k + 1);
      ok("사진 삭제됨");
    } else setError("삭제 실패");
  }
  // 로컬 변경만 (저장 X)
  function setDynLocal(id: string, patch: Partial<Pick<DynItem, "step" | "year_title" | "caption">>) {
    setDynItems((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  // SortableJS 결과를 받는 인덱스 기반 재배치 (drag-and-drop 양쪽 모바일/데스크탑)
  async function reorderByIndex(section: DynSection, oldIdx: number, newIdx: number) {
    if (oldIdx === newIdx) return;
    const list = dynItems.filter((x) => x.section === section);
    if (oldIdx < 0 || newIdx < 0 || oldIdx >= list.length || newIdx >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, moved);
    setDynItems((g) => {
      const others = g.filter((x) => x.section !== section);
      return [...others, ...next];
    });
    // 연속 드래그 대비: 이 저장이 끝나기 전에 새 드래그가 시작되면
    // 이쪽(예전) 응답으로 화면을 덮어쓰지 않는다.
    const epoch = ++reorderEpochRef.current;
    try {
      await Promise.all(
        next.map((it, i) =>
          fetch(`/api/gallery?key=${encodeURIComponent(key)}&id=${encodeURIComponent(it.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort: i }),
          })
        )
      );
      if (epoch !== reorderEpochRef.current) return; // 더 최신 드래그가 있음 — 그쪽이 마무리
      const rg = await fetch(`/api/gallery?v=${variant}`, { cache: "no-store" });
      const jg = await rg.json();
      if (epoch !== reorderEpochRef.current) return;
      setDynItems(jg.items ?? []);
      setSavedDynItems(jg.items ?? []);
      ok("순서 변경됨");
      setPreviewKey((k) => k + 1);
    } catch {
      if (epoch === reorderEpochRef.current) setError("순서 변경 실패");
    }
  }

  // 드래그&드롭으로 한 섹션 내 순서 재배치 (즉시 저장)
  async function reorderDynList(section: DynSection, fromId: string, toId: string) {
    if (fromId === toId) return;
    const list = dynItems.filter((x) => x.section === section);
    const fromIdx = list.findIndex((x) => x.id === fromId);
    const toIdx = list.findIndex((x) => x.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...list];
    const [removed] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, removed);
    // 로컬 즉시 반영
    setDynItems((g) => {
      const others = g.filter((x) => x.section !== section);
      return [...others, ...next];
    });
    try {
      await Promise.all(
        next.map((it, i) =>
          fetch(`/api/gallery?key=${encodeURIComponent(key)}&id=${encodeURIComponent(it.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort: i }),
          })
        )
      );
      const rg = await fetch(`/api/gallery?v=${variant}`, { cache: "no-store" });
      const jg = await rg.json();
      setDynItems(jg.items ?? []);
      setSavedDynItems(jg.items ?? []);
      ok("순서 변경됨");
      setPreviewKey((k) => k + 1);
    } catch {
      setError("순서 변경 실패");
    }
  }

  // 같은 섹션 안에서 순서 변경 (즉시 저장 — 위/아래 항목과 sort 값 swap)
  async function moveDynItem(id: string, dir: -1 | 1) {
    const all = [...dynItems];
    const it = all.find((x) => x.id === id);
    if (!it) return;
    const peers = all.filter((x) => x.section === it.section);
    const idx = peers.findIndex((x) => x.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= peers.length) return;
    const other = peers[swapIdx];

    // 새 sort 값 — 단순히 인덱스 기반으로 모든 항목 재배치
    const reordered = [...peers];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    // 로컬 즉시 반영
    setDynItems((g) => {
      const map = new Map(g.map((x) => [x.id, x]));
      reordered.forEach((x, i) => map.set(x.id, { ...x }));
      return g.map((x) => x);
    });
    // 두 항목만 sort swap (간단)
    const epoch = ++reorderEpochRef.current;
    try {
      await Promise.all([
        fetch(`/api/gallery?key=${encodeURIComponent(key)}&id=${encodeURIComponent(it.id)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort: swapIdx }),
        }),
        fetch(`/api/gallery?key=${encodeURIComponent(key)}&id=${encodeURIComponent(other.id)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort: idx }),
        }),
      ]);
      if (epoch !== reorderEpochRef.current) return; // 더 최신 순서 변경이 있음
      // 목록 다시 받아 정렬 동기화
      const rg = await fetch(`/api/gallery?v=${variant}`, { cache: "no-store" });
      const jg = await rg.json();
      if (epoch !== reorderEpochRef.current) return;
      setDynItems(jg.items ?? []);
      setSavedDynItems(jg.items ?? []);
      ok("순서 변경됨");
      setPreviewKey((k) => k + 1);
    } catch {
      if (epoch === reorderEpochRef.current) setError("순서 변경 실패");
    }
  }
  function setAccountLocal(side: "groom" | "bride", id: string, patch: Partial<Account>) {
    setAccounts((a) => ({ ...a, [side]: a[side].map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }

  // 카드 단위 저장 — dirty 항목만 API 호출
  async function saveCard(card: "greeting" | "film" | "rsvp" | "accounts" | "timeline" | "ending") {
    const calls: Promise<unknown>[] = [];
    const textIdsByCard: Record<string, string[]> = {
      greeting: ["greeting_poem", "greeting_credit", "greeting_title", "greeting_body"],
      film: ["film_caption"],
      rsvp: ["rsvp_note"],
      accounts: ["accounts_note"],
      timeline: [],
      ending: [],
    };
    // 텍스트 dirty 저장
    for (const tid of textIdsByCard[card]) {
      const cur = textDraft[tid] ?? "";
      const saved = siteTexts[tid] ?? TEXT_SLOTS.find((s) => s.id === tid)?.def ?? "";
      if (cur !== saved) {
        calls.push(
          fetch(`/api/site-texts?key=${encodeURIComponent(key)}&v=${variant}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: tid, value: cur }),
          }).then(() => setSiteTexts((m) => ({ ...m, [tid]: cur })))
        );
      }
    }
    // 동적 항목(타임라인/엔딩) 메타 dirty 저장
    if (card === "timeline" || card === "ending") {
      const savedMap = new Map(savedDynItems.map((x) => [x.id, x]));
      for (const it of dynItems.filter((x) => x.section === card)) {
        const s = savedMap.get(it.id);
        if (!s) continue;
        const patch: Record<string, string> = {};
        if (it.step !== s.step) patch.step = it.step;
        if (it.year_title !== s.year_title) patch.year_title = it.year_title;
        if (it.caption !== s.caption) patch.caption = it.caption;
        if (Object.keys(patch).length) {
          const idl = it.id;
          calls.push(
            fetch(`/api/gallery?key=${encodeURIComponent(key)}&id=${encodeURIComponent(idl)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patch),
            })
          );
        }
      }
    }
    // 계좌 dirty 저장
    if (card === "accounts") {
      for (const side of ["groom", "bride"] as const) {
        const savedById = new Map(savedAccounts[side].map((x) => [x.id, x]));
        for (const a of accounts[side]) {
          const s = savedById.get(a.id);
          if (!s) continue;
          const patch: Record<string, string | null> = {};
          (["role", "bank", "number", "holder", "phone", "kakaopay"] as const).forEach((k) => {
            if ((a[k] ?? "") !== (s[k] ?? "")) patch[k] = a[k] ?? null;
          });
          if (Object.keys(patch).length) {
            const idl = a.id;
            calls.push(
              fetch(`/api/accounts?key=${encodeURIComponent(key)}&id=${encodeURIComponent(idl)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
              })
            );
          }
        }
      }
    }
    if (calls.length === 0) { setNotice("✓ 변경 사항이 없어요."); return; }
    try {
      await Promise.all(calls);
      // saved 스냅샷 갱신
      setSavedDynItems([...dynItems]);
      setSavedAccounts({ groom: [...accounts.groom], bride: [...accounts.bride] });
      ok(`${calls.length}건 저장됨`);
      setPreviewKey((k) => k + 1);
    } catch {
      setError("저장 중 오류가 발생했어요");
    }
  }
  async function replaceDynPhoto(id: string, file: File) {
    setNotice("");
    setError("");
    try {
      const fileKey = await uploadFileToServer(file);
      const rsp = await fetch(`/api/gallery?key=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });
      if (!rsp.ok) throw new Error("교체 저장 실패");
      // 캐시 무력화를 위해 URL에 timestamp 추가
      setDynItems((g) => g.map((x) => (x.id === id ? { ...x, url: `/api/gallery/file?id=${id}&t=${Date.now()}` } : x)));
      setPreviewKey((k) => k + 1);
      ok("사진 교체됨");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  }

  async function saveText(id: string) {
    setNotice("");
    setError("");
    try {
      const r = await fetch(`/api/site-texts?key=${encodeURIComponent(key)}&v=${variant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, value: textDraft[id] ?? "" }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "저장 실패");
      }
      setSiteTexts((m) => ({ ...m, [id]: textDraft[id] ?? "" }));
      setPreviewKey((k) => k + 1);
      ok("문구 저장됨");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  }
  async function resetText(id: string) {
    const def = TEXT_SLOTS.find((s) => s.id === id)?.def ?? "";
    const r = await fetch(
      `/api/site-texts?key=${encodeURIComponent(key)}&v=${variant}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (r.ok) {
      setSiteTexts((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
      setTextDraft((m) => ({ ...m, [id]: def }));
      setPreviewKey((k) => k + 1);
      ok("기본 문구로 되돌렸습니다");
    } else setError("되돌리기 실패");
  }

  // 편집 대상(변형) 전환 — 해당 변형의 문구·사진·디자인 오버라이드 로드
  async function switchVariant(v: Variant) {
    setVariant(v);
    setOpenAlbum(null);
    setNotice("");
    setError("");
    try {
      const [ri, rt, rg, ra] = await Promise.all([
        fetch(`/api/site-images?v=${v}`, { cache: "no-store" }),
        fetch(`/api/site-texts?v=${v}`, { cache: "no-store" }),
        fetch(`/api/gallery?v=${v}`, { cache: "no-store" }),
        fetch(`/api/accounts?v=${v}`, { cache: "no-store" }),
      ]);
      const ji = await ri.json();
      const jt = await rt.json();
      const jg = await rg.json();
      const ja = await ra.json();
      setSiteImages(ji.overrides ?? {});
      setDynItems(jg.items ?? []);
      setSavedDynItems(jg.items ?? []);
      const accInit2 = { groom: ja.groom ?? [], bride: ja.bride ?? [] };
      setAccounts(accInit2);
      setSavedAccounts(accInit2);
      const tov: Record<string, string> = jt.overrides ?? {};
      setSiteTexts(tov);
      const draft: Record<string, string> = {};
      TEXT_SLOTS.forEach((s) => (draft[s.id] = tov[s.id] ?? s.def));
      setTextDraft(draft);
      setPreviewKey((k) => k + 1);
      setNotice(`✎ 편집 대상이 [${v === "honju" ? "혼주용" : "메인 (신랑·신부)"}]으로 전환됐어요.`);
    } catch {
      setError("불러오기 실패");
    }
  }
  async function addAccount(side: "groom" | "bride") {
    const role = window.prompt(`역할을 입력하세요 (예: 신랑, 신부, 신랑 아버지, 신부 어머니)`);
    if (!role || !role.trim()) return;
    const r = await fetch(`/api/accounts?key=${encodeURIComponent(key)}&v=${variant}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side, role: role.trim() }),
    });
    const j = await r.json();
    if (!r.ok || !j.id) { setError(j.error || "추가 실패"); return; }
    const next: Account = { id: j.id, side, role: role.trim(), bank: null, number: null, holder: null, phone: null, kakaopay: null };
    setAccounts((a) => ({ ...a, [side]: [...a[side], next] }));
    setPreviewKey((k) => k + 1);
    ok("계좌 추가됨");
  }
  async function updateAccount(side: "groom" | "bride", id: string, patch: Partial<Account>) {
    setAccounts((a) => ({ ...a, [side]: a[side].map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    await fetch(`/api/accounts?key=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    ok("계좌 수정됨");
    setPreviewKey((k) => k + 1);
  }
  async function deleteAccount(side: "groom" | "bride", id: string) {
    if (!confirm("이 계좌를 삭제할까요?")) return;
    const r = await fetch(`/api/accounts?key=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) {
      setAccounts((a) => ({ ...a, [side]: a[side].filter((x) => x.id !== id) }));
      setPreviewKey((k) => k + 1);
      ok("계좌 삭제됨");
    } else setError("삭제 실패");
  }

  /* ── 로그인 ── */
  if (!authed) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6"
        style={{ background: C.paper, color: C.body, ...serif }}
      >
        <div
          className="w-full max-w-sm rounded-2xl px-7 py-9 text-center shadow-sm"
          style={{ background: C.card, border: `1px solid ${C.line}` }}
        >
          <p style={{ ...enFont, color: C.bride, letterSpacing: ".3em" }} className="text-xs">
            ADMIN
          </p>
          <h1 className="mt-2 text-2xl" style={{ ...serif, color: C.ink }}>
            우성규 <span style={{ color: C.bride }}>♥</span> 김지은
          </h1>
          <p className="mt-1 text-sm" style={{ color: C.soft }}>
            청첩장 관리자 대시보드
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && key && loadAll(key)}
            placeholder="관리자 비밀번호"
            className="mt-6 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ background: "#fff", border: `1px solid ${C.line}`, color: C.body }}
          />
          <button
            onClick={() => loadAll(key)}
            disabled={loading || !key}
            className="mt-3 w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: C.ink }}
          >
            {loading ? "확인 중…" : "입장"}
          </button>
          {error && (
            <p className="mt-3 text-sm" style={{ color: C.wax }}>
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  /* ── 통계 ── */
  const attend = rsvp.filter((r) => r.attendance === "참석");
  const headcount = attend.reduce((s, r) => s + (r.guest_count || 0), 0);
  const cnt = (a: string) => rsvp.filter((r) => r.attendance === a).length;
  const mealYes = rsvp.filter((r) => r.meal === "예정").reduce((s, r) => s + (r.guest_count || 0), 0);
  const totalMedia = albums.reduce((s, a) => s + a.media.length, 0);
  const totalVideos = albums.reduce(
    (s, a) => s + a.media.filter((m) => m.media_type === "video").length,
    0
  );
  const sideBride = rsvp.filter((r) => r.side === "신부측").length;
  const sideGroom = rsvp.length - sideBride;
  const mealYesCnt = rsvp.filter((r) => r.meal === "예정").length;
  const mealNoCnt = rsvp.filter((r) => r.meal === "안함").length;

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "개요" },
    { id: "rsvp", label: `참석 (${rsvp.length})` },
    { id: "guestbook", label: `방명록 (${guests.length})` },
    { id: "snap", label: `게스트스냅 (${albums.length})` },
    { id: "edit", label: "✏ 청첩장 편집" },
  ];

  const Stat = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div
      className="rounded-xl px-4 py-4"
      style={{ background: C.card, border: `1px solid ${C.line}` }}
    >
      <p className="text-[11px] tracking-wide" style={{ color: C.soft }}>
        {label}
      </p>
      <p className="mt-1 text-2xl" style={{ ...serif, color: color || C.ink }}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px]" style={{ color: C.soft }}>
          {sub}
        </p>
      )}
    </div>
  );

  const ChartCard = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div className="mb-3 text-sm" style={{ ...serif, color: C.ink }}>{title}</div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
  const Bar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
    const pct = total ? Math.round((value / total) * 100) : 0;
    return (
      <div>
        <div className="flex items-center justify-between text-[12px]">
          <span style={{ color: C.body }}>{label}</span>
          <span style={{ color: C.soft }}>{value} · {pct}%</span>
        </div>
        <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full" style={{ background: C.lo }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width .35s" }} />
        </div>
      </div>
    );
  };

  /* ── 시각화 컴포넌트 ─────────────────────────────── */

  // 시간대 히트맵 — 12열 × 2행(오전/오후)으로 큼직하게, 셀 안에 건수 표시
  const HourHeat = ({ data, color }: { data: { hour: number; count: number }[]; color: string }) => {
    const max = Math.max(1, ...data.map((d) => d.count));
    const rows = [
      { label: "0–11시", hours: data.slice(0, 12) },
      { label: "12–23시", hours: data.slice(12, 24) },
    ];
    const Cell = ({ d }: { d: { hour: number; count: number } }) => {
      const ratio = d.count / max;
      const strong = ratio > 0.55; // 진한 칸은 흰 글씨
      return (
        <div className="flex flex-col items-center gap-0.5" title={`${d.hour}시 · ${d.count}회`}>
          <div
            className="flex w-full items-center justify-center rounded"
            style={{
              aspectRatio: "1 / 1",
              background: d.count > 0 ? color : C.lo,
              opacity: d.count > 0 ? 0.2 + ratio * 0.8 : 1,
            }}
          >
            {d.count > 0 && (
              <span className="text-[10px] font-semibold" style={{ color: strong ? "#fff" : C.ink }}>
                {d.count}
              </span>
            )}
          </div>
          <span className="text-[8px]" style={{ color: C.soft }}>{d.hour}</span>
        </div>
      );
    };
    return (
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 text-[10px]" style={{ color: C.soft }}>{row.label}</div>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(12, minmax(0,1fr))" }}>
              {row.hours.map((d) => (
                <Cell key={d.hour} d={d} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 가로 막대 리스트 (국가·순위형 데이터) — 값과 % 를 함께 표시
  const RankBars = ({ entries, color, labelFn }: {
    entries: [string, number][];
    color: string;
    labelFn?: (k: string) => React.ReactNode;
  }) => {
    const tot = entries.reduce((s, [, v]) => s + v, 0);
    if (entries.length === 0) return <p className="text-xs" style={{ color: C.soft }}>—</p>;
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return (
      <div className="space-y-2">
        {entries.map(([k, val]) => (
          <div key={k}>
            <div className="flex items-center justify-between text-[12px]">
              <span style={{ color: C.body }}>{labelFn ? labelFn(k) : k}</span>
              <span style={{ color: C.soft }}>{val}건 · {tot ? Math.round((val / tot) * 100) : 0}%</span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full" style={{ background: C.lo }}>
              <div className="h-full rounded-full" style={{ width: `${(val / max) * 100}%`, background: color, transition: "width .35s" }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 도넛 차트 (변형별 비율)
  const Donut = ({ segments, center }: { segments: { label: string; value: number; color: string }[]; center?: React.ReactNode }) => {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const R = 42, C0 = 50, CIRC = 2 * Math.PI * R;
    let offset = 0;
    return (
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx={C0} cy={C0} r={R} fill="none" stroke={C.line} strokeWidth={12} />
          {total > 0 &&
            segments.map((s, i) => {
              const dash = (s.value / total) * CIRC;
              const el = (
                <circle
                  key={i}
                  cx={C0}
                  cy={C0}
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={12}
                  strokeDasharray={`${dash} ${CIRC - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div>
      </div>
    );
  };

  // D-day 진행도 링
  const Progress = ({ pct, color, label, sub }: { pct: number; color: string; label: string; sub?: string }) => {
    const R = 42, C0 = 50, CIRC = 2 * Math.PI * R;
    const dash = (pct / 100) * CIRC;
    return (
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx={C0} cy={C0} r={R} fill="none" stroke={C.line} strokeWidth={10} />
          <circle
            cx={C0}
            cy={C0}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span style={{ ...serif, color: C.ink, fontSize: 26, lineHeight: 1 }}>{label}</span>
          {sub && <span className="mt-1 text-[10px]" style={{ color: C.soft }}>{sub}</span>}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8" style={{ background: C.paper, color: C.body, ...serif }}>
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <p style={{ ...enFont, color: C.bride, letterSpacing: ".3em" }} className="text-[11px]">
              ADMIN DASHBOARD
            </p>
            <h1 className="text-xl sm:text-2xl" style={{ ...serif, color: C.ink }}>
              우성규 <span style={{ color: C.bride }}>♥</span> 김지은
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => loadAll(key)}
              className="rounded-lg px-3 py-1.5"
              style={{ border: `1px solid ${C.line}`, color: C.body }}
            >
              새로고침
            </button>
            <button
              onClick={() => { setAuthed(false); setKey(""); }}
              className="rounded-lg px-3 py-1.5"
              style={{ border: `1px solid ${C.line}`, color: C.soft }}
            >
              로그아웃
            </button>
          </div>
        </div>

        {(notice || error) && (
          <div
            className="mt-3 rounded-md px-3 py-2 text-sm"
            style={
              error
                ? { background: "rgba(126,45,39,.1)", color: C.wax, border: `1px solid ${C.wax}` }
                : { background: "rgba(93,107,76,.10)", color: C.groom, border: `1px solid ${C.groom}` }
            }
          >
            {error || notice}
          </div>
        )}

        {/* 탭 */}
        <div className="mt-5 flex gap-1 overflow-x-auto" style={{ borderBottom: `1px solid ${C.line}` }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="shrink-0 px-4 py-2.5 text-sm"
              style={
                tab === t.id
                  ? { color: C.ink, fontWeight: 700, borderBottom: `2px solid ${C.bride}` }
                  : { color: C.soft }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={`mt-6 ${(false) ? "lg:grid lg:grid-cols-[1fr_minmax(360px,440px)] lg:gap-5" : ""}`}>
        <div>
          {(tab === "edit" || false) && (
            <div
              className="mb-4 rounded-xl p-3"
              style={{
                background: variant === "honju" ? "#f8ebe7" : "#eef0e8",
                border: `2px solid ${variant === "honju" ? C.bride : C.groom}`,
              }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[11px] tracking-widest" style={{ color: variant === "honju" ? C.bride : C.groom }}>
                  지금 편집 중
                </span>
                <span className="text-base font-bold" style={{ ...serif, color: variant === "honju" ? C.bride : C.groom }}>
                  {variant === "honju" ? "혼주용 청첩장" : "메인 (신랑·신부) 청첩장"}
                </span>
                <a
                  href={variant === "honju" ? "/honju" : "/"}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-xs underline"
                  style={{ color: variant === "honju" ? C.bride : C.groom }}
                >
                  새 탭에서 보기 ↗
                </a>
              </div>
              <div className="mt-2 flex gap-2">
                {(["main", "honju"] as Variant[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => switchVariant(v)}
                    className="flex-1 rounded-lg py-2 text-sm font-medium transition"
                    style={
                      variant === v
                        ? { background: v === "honju" ? C.bride : C.groom, color: "#fff" }
                        : { background: "#fff", border: `1px solid ${C.line}`, color: C.body }
                    }
                  >
                    {variant === v ? "● " : ""}{v === "main" ? "메인 편집 중" : "혼주용 편집 중"}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px]" style={{ color: C.soft }}>
                두 청첩장은 각각 따로 저장됩니다. 위 두 버튼으로 전환하면서 편집하세요.
                변경 사항은 자동 저장되며 저장 시 위쪽에 ✓ 표시가 나타나요.
              </p>
            </div>
          )}
          {/* ── 청첩장 편집 (좌측 미리보기 + 우측 아코디언) ── */}
          {tab === "edit" && (() => {
            const tval = (id: string) => textDraft[id] ?? "";
            const setDraft = (id: string, v: string) => setTextDraft((m) => ({ ...m, [id]: v }));
            const toggleSection = async (sid: string, next: boolean) => {
              const k = `section.${sid}`;
              if (next) {
                setSiteTexts((m) => { const n = { ...m }; delete n[k]; return n; });
                await fetch(`/api/site-texts?key=${encodeURIComponent(key)}&v=${variant}&id=${encodeURIComponent(k)}`, { method: "DELETE" });
              } else {
                setSiteTexts((m) => ({ ...m, [k]: "off" }));
                await fetch(`/api/site-texts?key=${encodeURIComponent(key)}&v=${variant}`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: k, value: "off" }),
                });
              }
              setPreviewKey((p) => p + 1);
            };
            // 카드별 dirty 검사 — 저장 버튼 활성화에 사용
            const dirtyOfCard = (cid: string): boolean => {
              const textIds: Record<string, string[]> = {
                greeting: ["greeting_poem", "greeting_credit", "greeting_title", "greeting_body"],
                film: ["film_caption"],
                rsvp: ["rsvp_note"],
                accounts: ["accounts_note"],
              };
              for (const tid of textIds[cid] || []) {
                const cur = textDraft[tid] ?? "";
                const sv = siteTexts[tid] ?? TEXT_SLOTS.find((s) => s.id === tid)?.def ?? "";
                if (cur !== sv) return true;
              }
              if (cid === "timeline" || cid === "ending") {
                const savedMap = new Map(savedDynItems.map((x) => [x.id, x]));
                for (const it of dynItems.filter((x) => x.section === cid)) {
                  const s = savedMap.get(it.id);
                  if (s && (it.step !== s.step || it.year_title !== s.year_title || it.caption !== s.caption)) return true;
                }
              }
              if (cid === "accounts") {
                for (const side of ["groom", "bride"] as const) {
                  const savedById = new Map(savedAccounts[side].map((x) => [x.id, x]));
                  for (const a of accounts[side]) {
                    const s = savedById.get(a.id);
                    if (!s) continue;
                    if ((["role", "bank", "number", "holder", "phone", "kakaopay"] as const).some((k) => (a[k] ?? "") !== (s[k] ?? ""))) return true;
                  }
                }
              }
              return false;
            };
            const editorCtx: EditorCtxValue = {
              siteTexts, siteImages, dynItems, openEditSection, setOpenEditSection,
              tval, setDraft, toggleSection, dirtyOfCard, saveCard,
              uploadSlot, resetSlot, addDynPhoto, replaceDynPhoto, reorderByIndex,
              moveDynItem, deleteDynItem, setDynLocal,
            };
            return (
              <EditorCtx.Provider value={editorCtx}>
              <div className="lg:grid lg:grid-cols-2 lg:gap-5">
                {/* 좌측 미리보기 (sticky) */}
                <div>
                  <div className="overflow-hidden rounded-xl lg:sticky lg:top-4" style={{ border: `1px solid ${C.line}`, background: "#fff" }}>
                    <div className="flex items-center justify-between px-3 py-2 text-xs" style={{ color: C.soft, borderBottom: `1px solid ${C.line}`, background: C.card }}>
                      <span>미리보기 · {variant === "honju" ? "혼주용" : "메인"}</span>
                      <button onClick={() => setPreviewKey((p) => p + 1)} className="underline" style={{ color: C.groom }}>새로고침</button>
                    </div>
                    <iframe key={previewKey} src={(variant === "honju" ? "/honju" : "/") + "?pk=" + previewKey} title="preview" style={{ width: "100%", height: "720px", border: 0, background: "#fff" }} />
                  </div>
                </div>

                {/* 우측 섹션 아코디언 */}
                <div className="mt-5 space-y-2.5 lg:mt-0">
                  <Card id="cover" label="표지 (커버)" required />
                  <Card id="greeting" label="인사말" saveable>
                    <TextField id="greeting_poem" label="시 구절" rows={5} />
                    <TextField id="greeting_credit" label="시 출처" />
                    <TextField id="greeting_title" label="인사말 제목" rows={2} />
                    <TextField id="greeting_body" label="인사말 본문" rows={6} />
                  </Card>
                  <Card id="film" label="메인 영상" saveable>
                    <SlotField slot="film_video" label="메인 영상" ratio="세로 3:4 · 영상" video />
                    <SlotField slot="film_poster" label="영상 표지(첫 화면)" ratio="세로 3:4" />
                    <TextField id="film_caption" label="영상 설명" rows={2} />
                  </Card>
                  <Card id="calendar" label="캘린더 + 카운트다운" />
                  <Card id="couple" label="신랑·신부 소개" />
                  <Card id="timeline" label="우리의 시간 (타임라인)" saveable>
                    <DynList section="timeline" ratio="정사각 1:1" meta />
                  </Card>
                  <Card id="gallery" label="갤러리">
                    <DynList section="gallery" ratio="세로 3:4" />
                  </Card>
                  <Card id="location" label="오시는 길" />
                  <Card id="rsvp" label="참석 여부 (RSVP)" saveable>
                    <TextField id="rsvp_note" label="안내문" rows={5} />
                  </Card>
                  <Card id="accounts" label="마음 전하실 곳 (계좌)" saveable>
                    <TextField id="accounts_note" label="안내문" rows={4} />
                    <div className="space-y-3 pt-2">
                      {(["groom", "bride"] as const).map((side) => (
                        <div key={side} className="rounded-md p-3" style={{ background: C.lo }}>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs" style={{ ...serif, color: side === "bride" ? C.bride : C.groom }}>
                              {side === "groom" ? "신랑측" : "신부측"} ({accounts[side].length})
                            </span>
                            <button onClick={() => addAccount(side)} className="rounded px-2 py-0.5 text-[11px] text-white" style={{ background: C.groom }}>+ 추가</button>
                          </div>
                          {accounts[side].length === 0 ? (
                            <p className="text-[11px]" style={{ color: C.soft }}>등록된 계좌가 없어요.</p>
                          ) : (
                            <div className="space-y-2">
                              {accounts[side].map((a) => (
                                <div key={a.id} className="rounded p-2" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input value={a.role} placeholder="역할" onChange={(e) => setAccountLocal(side, a.id, { role: e.target.value })} className="rounded px-1.5 py-1 text-[11px]" style={inp} />
                                    <input value={a.bank ?? ""} placeholder="은행" onChange={(e) => setAccountLocal(side, a.id, { bank: e.target.value })} className="rounded px-1.5 py-1 text-[11px]" style={inp} />
                                    <input value={a.number ?? ""} placeholder="계좌번호" onChange={(e) => setAccountLocal(side, a.id, { number: e.target.value })} className="col-span-2 rounded px-1.5 py-1 text-[11px]" style={inp} />
                                    <input value={a.holder ?? ""} placeholder="예금주" onChange={(e) => setAccountLocal(side, a.id, { holder: e.target.value })} className="rounded px-1.5 py-1 text-[11px]" style={inp} />
                                    <input value={a.phone ?? ""} placeholder="연락처(선택)" onChange={(e) => setAccountLocal(side, a.id, { phone: e.target.value })} className="rounded px-1.5 py-1 text-[11px]" style={inp} />
                                  </div>
                                  <input value={a.kakaopay ?? ""} placeholder="카카오페이 송금 링크(선택) — 입력 시 청첩장에 💬 송금 버튼 표시" onChange={(e) => setAccountLocal(side, a.id, { kakaopay: e.target.value })} className="mt-1.5 w-full rounded px-1.5 py-1 text-[11px]" style={inp} />
                                  <button onClick={() => deleteAccount(side, a.id)} className="mt-1.5 rounded px-2 py-0.5 text-[10px]" style={{ border: `1px solid ${C.bride}`, color: C.bride }}>삭제</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card id="guestbook" label="방명록" />
                  <Card id="guestsnap" label="게스트스냅" />
                  <Card id="ending" label="엔딩" saveable>
                    <DynList section="ending" ratio="정사각 1:1" meta />
                  </Card>
                </div>
              </div>
              </EditorCtx.Provider>
            );
          })()}

          {/* ── 개요 (요약 + 실시간 방문) ── */}
          {tab === "overview" && (() => {
            // D-day 계산 (KST)
            const WEDDING_MS = Date.UTC(2026, 11, 20, 2, 0); // KST 11:00 = UTC 02:00
            const ANNOUNCED_MS = Date.UTC(2026, 4, 1); // 시작 기준점 (5/1)
            const nowMs = Date.now();
            const dDay = Math.ceil((WEDDING_MS - nowMs) / (24 * 3600 * 1000));
            const totalSpan = WEDDING_MS - ANNOUNCED_MS;
            const elapsed = Math.max(0, Math.min(totalSpan, nowMs - ANNOUNCED_MS));
            const progressPct = (elapsed / totalSpan) * 100;

            const v = visitStats; // 짧은 별칭
            const variantTotal = v ? v.byVariant.main + v.byVariant.honju : 0;

            return (
              <>
                {/* ── 1행: D-day + 오늘 방문 하이라이트 ── */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                    <Progress
                      pct={progressPct}
                      color={C.bride}
                      label={dDay > 0 ? `D-${dDay}` : dDay === 0 ? "D-DAY" : `D+${-dDay}`}
                      sub="2026.12.20"
                    />
                    <div className="text-sm">
                      <p style={{ color: C.soft }} className="text-[11px] tracking-wide">결혼식까지</p>
                      <p style={{ ...serif, color: C.ink }} className="mt-1 text-base">
                        {dDay > 0 ? `${dDay}일 남음` : dDay === 0 ? "오늘이에요 🤍" : "지난 결혼식"}
                      </p>
                      <p style={{ color: C.soft }} className="mt-1 text-[11px]">상록아트홀 · 11:00</p>
                    </div>
                  </div>

                  <Stat
                    label="오늘 방문 (실시간)"
                    value={v ? v.today : "—"}
                    sub={v ? `고유 방문자 ${v.todayUnique}명` : visitsLoading ? "불러오는 중…" : ""}
                    color={C.bride}
                  />
                  <Stat
                    label="누적 방문"
                    value={v ? v.total.toLocaleString() : "—"}
                    sub={v ? `최근 7일 ${v.week}회` : ""}
                    color={C.groom}
                  />
                </div>

                {/* ── 2행: RSVP 핵심 수치 ── */}
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="참석 인원" value={`${headcount}명`} sub={`응답 ${rsvp.length}건`} color={C.groom} />
                  <Stat label="참석 / 미정 / 불참" value={`${cnt("참석")} / ${cnt("미정")} / ${cnt("불참")}`} sub="응답 건수" />
                  <Stat label="식사 예정" value={`${mealYes}명`} />
                  <Stat label="방명록" value={`${guests.length}건`} sub={`스냅 ${albums.length}권 · 미디어 ${totalMedia}`} color={C.bride} />
                </div>

                {/* ── 3행: 방문 추세 (14일 라인) + 시간대 히트맵 ── */}
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <ChartCard
                    title={
                      <span className="flex items-center justify-between">
                        <span>최근 14일 방문 추세</span>
                        <span className="text-[10px]" style={{ color: C.soft }}>
                          {visitsLoadedAt ? `${new Date(visitsLoadedAt).toLocaleTimeString()} 갱신` : ""}
                        </span>
                      </span>
                    }
                  >
                    {v && v.byDay.length > 0 ? (() => {
                      const reversed = [...v.byDay].reverse(); // 옛 → 최신
                      const max = Math.max(1, ...reversed.map((d) => d.count));
                      return (
                        <>
                          <div className="flex items-end gap-1" style={{ height: 140 }}>
                            {reversed.map((d, i) => {
                              const isToday = i === reversed.length - 1;
                              return (
                                <div
                                  key={d.date}
                                  className="flex flex-1 flex-col items-center justify-end"
                                  title={`${d.date}: 총 ${d.count}회 · 고유 ${d.unique}명`}
                                >
                                  <span className="mb-1 text-[11px]" style={{ color: isToday ? C.bride : C.ink, fontWeight: isToday ? 700 : 500 }}>
                                    {d.count || ""}
                                  </span>
                                  <div className="relative w-full" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}>
                                    {/* 총 방문 막대 */}
                                    <div
                                      className="absolute inset-0"
                                      style={{
                                        background: isToday ? C.bride : C.groom,
                                        opacity: d.count > 0 ? 0.9 : 0.12,
                                        borderRadius: "3px 3px 0 0",
                                      }}
                                    />
                                    {/* 고유 방문자 (막대 안쪽 진한 영역) */}
                                    {d.count > 0 && (
                                      <div
                                        className="absolute bottom-0 left-0 right-0"
                                        style={{
                                          height: `${(d.unique / d.count) * 100}%`,
                                          background: isToday ? "#8a4a42" : "#3f4a33",
                                          borderRadius: "0 0 3px 3px",
                                        }}
                                        title={`고유 ${d.unique}명`}
                                      />
                                    )}
                                  </div>
                                  <span className="mt-1 text-[9px]" style={{ color: isToday ? C.bride : C.soft, fontWeight: isToday ? 700 : 400 }}>
                                    {d.date}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-[11px]" style={{ color: C.body }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 11, height: 9, background: C.groom, opacity: 0.9, display: "inline-block", borderRadius: 2 }} /> 총 방문
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 11, height: 9, background: "#3f4a33", display: "inline-block", borderRadius: 2 }} /> 고유 방문자
                            </span>
                            <span className="ml-auto" style={{ color: C.soft }}>막대 위 숫자 = 총 방문 건수</span>
                          </div>
                        </>
                      );
                    })() : (
                      <p className="text-sm" style={{ color: C.soft }}>
                        {visitsLoading ? "불러오는 중…" : "데이터 없음 (visits 테이블 확인)"}
                      </p>
                    )}
                  </ChartCard>

                  <ChartCard title="오늘 시간대별 방문 (KST)">
                    {v ? (
                      <>
                        <HourHeat data={v.byHour} color={C.bride} />
                        <p className="mt-2 text-[10px]" style={{ color: C.soft }}>
                          칸 안 숫자 = 그 시간대 방문 건수. 색이 진할수록 많음.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm" style={{ color: C.soft }}>—</p>
                    )}
                  </ChartCard>
                </div>

                {/* ── 4행: 변형 분포(도넛) + 방문 국가 ── */}
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <ChartCard title="오늘 청첩장 변형별">
                    {v && variantTotal > 0 ? (
                      <div className="flex items-center gap-4">
                        <Donut
                          segments={[
                            { label: "메인", value: v.byVariant.main, color: C.groom },
                            { label: "혼주", value: v.byVariant.honju, color: C.bride },
                          ]}
                          center={
                            <>
                              <span style={{ ...serif, color: C.ink, fontSize: 22 }}>{variantTotal}</span>
                              <span className="text-[10px]" style={{ color: C.soft }}>오늘 총</span>
                            </>
                          }
                        />
                        <div className="flex-1 space-y-2">
                          <Bar label="메인 (신랑·신부)" value={v.byVariant.main} total={variantTotal} color={C.groom} />
                          <Bar label="혼주용" value={v.byVariant.honju} total={variantTotal} color={C.bride} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: C.soft }}>오늘 방문이 아직 없어요.</p>
                    )}
                  </ChartCard>

                  <ChartCard title="방문 국가 (7일 · IP 기준)">
                    {v && v.weekBreakdown?.country ? (
                      <RankBars
                        entries={Object.entries(v.weekBreakdown.country).sort((a, b) => b[1] - a[1]).slice(0, 8)}
                        color={C.bride}
                        labelFn={(cc) => countryLabel(cc)}
                      />
                    ) : (
                      <p className="text-sm" style={{ color: C.soft }}>
                        {v ? "국가 데이터 없음 (배포 후 새 방문부터 기록)" : "—"}
                      </p>
                    )}
                  </ChartCard>
                </div>

                {/* ── 4.5행: 방문자 디바이스/OS/브라우저/유입처 ── */}
                {v && v.weekBreakdown && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <ChartCard title="디바이스 (7일)">
                      {(() => {
                        const b = v.weekBreakdown!.device;
                        const tot = Object.values(b).reduce((s, x) => s + x, 0);
                        const items = Object.entries(b).sort((a, c) => c[1] - a[1]);
                        return items.length === 0 ? <p className="text-xs" style={{ color: C.soft }}>—</p> : (
                          <>
                            <Donut
                              segments={items.map(([k, val]) => ({
                                label: k,
                                value: val,
                                color: k === "Mobile" ? C.bride : k === "Tablet" ? C.soft : C.groom,
                              }))}
                              center={<><span style={{ ...serif, color: C.ink, fontSize: 20 }}>{tot}</span><span className="text-[10px]" style={{ color: C.soft }}>총</span></>}
                            />
                            <div className="space-y-1.5">
                              {items.map(([k, val]) => (
                                <Bar key={k} label={k === "Mobile" ? "📱 모바일" : k === "Tablet" ? "🟦 태블릿" : "💻 PC"} value={val} total={tot} color={k === "Mobile" ? C.bride : k === "Tablet" ? C.soft : C.groom} />
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </ChartCard>

                    <ChartCard title="OS (7일)">
                      {(() => {
                        const b = v.weekBreakdown!.os;
                        const tot = Object.values(b).reduce((s, x) => s + x, 0);
                        const items = Object.entries(b).sort((a, c) => c[1] - a[1]);
                        const palette: Record<string, string> = { iOS: C.ink, Android: C.groom, Windows: C.bride, macOS: C.soft, Linux: C.wax, Other: C.line };
                        return items.length === 0 ? <p className="text-xs" style={{ color: C.soft }}>—</p> : (
                          <div className="space-y-1.5">
                            {items.map(([k, val]) => (
                              <Bar key={k} label={k} value={val} total={tot} color={palette[k] || C.soft} />
                            ))}
                          </div>
                        );
                      })()}
                    </ChartCard>

                    <ChartCard title="브라우저 (7일)">
                      {(() => {
                        const b = v.weekBreakdown!.browser;
                        const tot = Object.values(b).reduce((s, x) => s + x, 0);
                        const items = Object.entries(b).sort((a, c) => c[1] - a[1]).slice(0, 6);
                        const palette: Record<string, string> = {
                          KakaoTalk: "#fae100", Naver: "#03c75a", Instagram: "#e1306c",
                          Facebook: "#1877f2", Line: "#06c755", Samsung: "#1428a0",
                          Edge: "#0078d4", Chrome: "#4285f4", Safari: C.ink, Firefox: "#ff7139", Other: C.soft,
                        };
                        return items.length === 0 ? <p className="text-xs" style={{ color: C.soft }}>—</p> : (
                          <div className="space-y-1.5">
                            {items.map(([k, val]) => (
                              <Bar key={k} label={k === "KakaoTalk" ? "💬 KakaoTalk" : k} value={val} total={tot} color={palette[k] || C.soft} />
                            ))}
                          </div>
                        );
                      })()}
                    </ChartCard>

                    <ChartCard title="유입처 (7일)">
                      {(() => {
                        const b = v.weekBreakdown!.referer;
                        const tot = Object.values(b).reduce((s, x) => s + x, 0);
                        const items = Object.entries(b).sort((a, c) => c[1] - a[1]).slice(0, 6);
                        return items.length === 0 ? <p className="text-xs" style={{ color: C.soft }}>—</p> : (
                          <div className="space-y-1.5">
                            {items.map(([k, val]) => (
                              <Bar key={k} label={k} value={val} total={tot} color={C.groom} />
                            ))}
                          </div>
                        );
                      })()}
                    </ChartCard>
                  </div>
                )}

                {/* ── 5행: RSVP 분포 ── */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ChartCard title="참석 여부">
                    <Bar label="참석" value={cnt("참석")} total={rsvp.length} color={C.groom} />
                    <Bar label="미정" value={cnt("미정")} total={rsvp.length} color={C.soft} />
                    <Bar label="불참" value={cnt("불참")} total={rsvp.length} color={C.wax} />
                  </ChartCard>
                  <ChartCard title="하객 측">
                    <Bar label="신랑측" value={sideGroom} total={rsvp.length} color={C.groom} />
                    <Bar label="신부측" value={sideBride} total={rsvp.length} color={C.bride} />
                  </ChartCard>
                  <ChartCard title="식사">
                    <Bar label="식사 예정" value={mealYesCnt} total={rsvp.length} color={C.groom} />
                    <Bar label="식사 안함" value={mealNoCnt} total={rsvp.length} color={C.soft} />
                  </ChartCard>
                  <ChartCard title="게스트스냅 구성">
                    <Bar label="사진" value={totalMedia - totalVideos} total={totalMedia} color={C.bride} />
                    <Bar label="영상" value={totalVideos} total={totalMedia} color={C.groom} />
                  </ChartCard>
                </div>

                {/* ── 6행: 최근 방문 로그 ── */}
                <ChartCard title="최근 방문 (최대 50건)">
                  {v && v.recent.length > 0 ? (
                    <div className="max-h-[360px] overflow-auto -mx-1 px-1">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10" style={{ background: C.card }}>
                          <tr style={{ color: C.soft, textAlign: "left" }}>
                            <th className="py-1.5 pr-3 font-normal whitespace-nowrap">시각</th>
                            <th className="py-1.5 pr-3 font-normal">변형</th>
                            <th className="py-1.5 pr-3 font-normal">기기</th>
                            <th className="py-1.5 pr-3 font-normal">OS</th>
                            <th className="py-1.5 pr-3 font-normal">브라우저</th>
                            <th className="py-1.5 pr-3 font-normal">국가·지역</th>
                            <th className="py-1.5 pr-3 font-normal">IP</th>
                            <th className="py-1.5 pr-3 font-normal">유입처</th>
                            <th className="py-1.5 font-normal">세션</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.recent.map((r) => (
                            <tr key={r.id} style={{ borderTop: `1px solid ${C.line}` }}>
                              <td className="py-1.5 pr-3 whitespace-nowrap" style={{ color: C.ink }}>{fmt(r.created_at)}</td>
                              <td className="py-1.5 pr-3" style={{ color: r.variant === "honju" ? C.bride : C.groom }}>
                                {r.variant === "honju" ? "혼주" : "메인"}
                              </td>
                              <td className="py-1.5 pr-3" style={{ color: C.body }}>
                                {r.device === "Mobile" ? "📱" : r.device === "Tablet" ? "🟦" : "💻"} {r.device || "—"}
                              </td>
                              <td className="py-1.5 pr-3" style={{ color: C.body }}>{r.os || "—"}</td>
                              <td className="py-1.5 pr-3" style={{ color: C.body }}>
                                {r.browser === "KakaoTalk" ? "💬 KakaoTalk" : r.browser || "—"}
                              </td>
                              <td className="py-1.5 pr-3 whitespace-nowrap" style={{ color: C.body }}>
                                {r.country ? countryLabel(r.country) : "—"}{r.city ? ` · ${r.city}` : ""}
                              </td>
                              <td className="py-1.5 pr-3" style={{ color: C.soft, fontFamily: "monospace" }}>{r.ip || "—"}</td>
                              <td className="py-1.5 pr-3" style={{ color: C.soft }}>{r.referer || "—"}</td>
                              <td className="py-1.5" style={{ color: C.soft, fontFamily: "monospace" }}>{r.session_id || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: C.soft }}>아직 방문 기록이 없어요.</p>
                  )}
                </ChartCard>
              </>
            );
          })()}

          {/* ── RSVP ── */}
          {tab === "rsvp" && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                <span style={{ color: C.body }}>총 {rsvp.length}건 · 참석 인원 {headcount}명</span>
                <button
                  onClick={() =>
                    downloadCSV(
                      "rsvp.csv",
                      ["측", "이름", "참석", "인원", "식사", "연락처", "메시지", "응답시각"],
                      rsvp.map((r) => [r.side, r.name, r.attendance, r.guest_count, r.meal, r.phone ?? "", r.message ?? "", fmt(r.created_at)])
                    )
                  }
                  className="rounded-lg px-3 py-1.5 text-white"
                  style={{ background: C.groom }}
                >
                  엑셀(CSV) 다운로드
                </button>
                <button
                  onClick={async () => {
                    if (rsvp.length === 0) { setNotice("이미 비어 있어요."); return; }
                    if (!confirm(`정말 RSVP ${rsvp.length}건을 모두 삭제할까요? (테스트용 · 되돌릴 수 없음)`)) return;
                    const r = await fetch(`/api/admin/rsvp?key=${encodeURIComponent(key)}`, { method: "DELETE" });
                    if (r.ok) { setRsvp([]); setNotice("RSVP 전체 초기화 완료"); }
                    else setError("초기화 실패");
                  }}
                  className="rounded-lg px-3 py-1.5 text-white"
                  style={{ background: C.wax }}
                  title="모든 응답 삭제 (되돌릴 수 없음)"
                >
                  전체 초기화
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: C.soft, borderBottom: `1px solid ${C.line}` }}>
                      {["측", "이름", "참석", "인원", "식사", "연락처", "메시지", "시각", ""].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rsvp.length === 0 && (
                      <tr><td colSpan={9} className="px-3 py-8 text-center" style={{ color: C.soft }}>아직 응답이 없어요.</td></tr>
                    )}
                    {rsvp.map((r) => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.line}` }} className="align-top">
                        <td className="px-3 py-2.5" style={{ color: r.side === "신부측" ? C.bride : C.groom }}>{r.side}</td>
                        <td className="px-3 py-2.5" style={{ color: C.ink }}>{r.name}</td>
                        <td className="px-3 py-2.5">{r.attendance}</td>
                        <td className="px-3 py-2.5">{r.guest_count}</td>
                        <td className="px-3 py-2.5">{r.meal}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{r.phone ?? "-"}</td>
                        <td className="px-3 py-2.5" style={{ maxWidth: 220 }}>{r.message ?? "-"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[12px]" style={{ color: C.soft }}>{fmt(r.created_at)}</td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={async () => {
                              if (!confirm(`${r.name} 님의 응답을 삭제할까요?`)) return;
                              const res = await fetch(`/api/admin/rsvp?key=${encodeURIComponent(key)}&id=${r.id}`, { method: "DELETE" });
                              if (res.ok) setRsvp((rows) => rows.filter((x) => x.id !== r.id));
                              else setError("삭제 실패");
                            }}
                            className="rounded px-2 py-0.5 text-[11px]"
                            style={{ border: `1px solid ${C.bride}`, color: C.bride }}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── 방명록 ── */}
          {tab === "guestbook" && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                <span>총 {guests.length}건</span>
                <button
                  onClick={() =>
                    downloadCSV(
                      "guestbook.csv",
                      ["이름", "메시지", "작성시각"],
                      guests.map((g) => [g.name, g.message, fmt(g.created_at)])
                    )
                  }
                  className="rounded-lg px-3 py-1.5 text-white"
                  style={{ background: C.groom }}
                >
                  엑셀(CSV) 다운로드
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {guests.length === 0 && (
                  <p className="text-sm" style={{ color: C.soft }}>아직 방명록이 없어요.</p>
                )}
                {guests.map((g) => (
                  <div key={g.id} className="rounded-xl px-4 py-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                    <div className="flex items-center justify-between">
                      <span style={{ ...serif, color: C.ink }}>{g.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px]" style={{ color: C.soft }}>{fmt(g.created_at)}</span>
                        <button onClick={() => deleteGuest(g.id)} className="rounded px-2 py-0.5 text-xs" style={{ border: `1px solid ${C.bride}`, color: C.bride }}>삭제</button>
                      </div>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm" style={{ color: C.body }}>{g.message}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── 게스트스냅 ── */}
          {tab === "snap" && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                <span>앨범 {albums.length}권 · 사진·영상 {totalMedia}개</span>
                <a
                  href={`/api/admin/download?key=${encodeURIComponent(key)}`}
                  className="rounded-lg px-3 py-1.5 text-white"
                  style={{ background: C.ink }}
                >
                  전체 ZIP 다운로드
                </a>
                <button
                  onClick={() => {
                    const rows: (string | number)[][] = [];
                    albums.forEach((a) => {
                      if (a.media.length === 0) {
                        rows.push([a.name, a.phone || "", "(미제출)", "", "", fmt(a.created_at)]);
                      } else {
                        a.media.forEach((m, idx) => {
                          const fileName = `${a.name}_${String(idx + 1).padStart(2, "0")}.${m.media_type === "video" ? "mp4" : "jpg"}`;
                          rows.push([a.name, a.phone || "", m.media_type, fileName, m.id, fmt(a.created_at)]);
                        });
                      }
                    });
                    downloadCSV(
                      "guestsnap_files.csv",
                      ["업로더", "연락처", "종류", "추천 파일명", "내부ID(미디어)", "앨범 등록시각"],
                      rows
                    );
                  }}
                  className="rounded-lg px-3 py-1.5 text-white"
                  style={{ background: C.groom }}
                >
                  사진·영상별 데이터 CSV (연락처 포함)
                </button>
              </div>
              {albums.length === 0 && (
                <p className="text-sm" style={{ color: C.soft }}>아직 등록된 앨범이 없어요.</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {albums.map((a) => {
                  const cover = a.media.find((m) => m.media_type !== "video");
                  const isOpen = openAlbum === a.id;
                  return (
                    <div key={a.id} className="rounded-xl p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                      <button
                        onClick={() => setOpenAlbum(isOpen ? null : a.id)}
                        className="flex w-full items-center gap-3 text-left"
                      >
                        <span
                          className="block h-14 w-14 shrink-0 overflow-hidden rounded-lg"
                          style={{ background: C.lo }}
                        >
                          {cover && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover.url} alt="" className="h-full w-full object-cover" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate" style={{ ...serif, color: C.ink }}>{a.name}</span>
                          <span className="block text-[12px]" style={{ color: C.soft }}>
                            {a.media.length}개 · {a.phone || "연락처 없음"}
                          </span>
                          <span className="block text-[11px]" style={{ color: C.soft }}>{fmt(a.created_at)}</span>
                        </span>
                        <span style={{ color: C.soft }}>{isOpen ? "▲" : "▼"}</span>
                      </button>
                      {isOpen && (
                        <>
                          <div className="mt-3 grid grid-cols-3 gap-1.5">
                            {a.media.map((m) =>
                              m.media_type === "video" ? (
                                <video key={m.id} src={m.url} controls playsInline muted className="aspect-square w-full rounded bg-black object-cover" />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                                  <img src={m.url} alt="" loading="lazy" className="aspect-square w-full rounded object-cover" style={{ background: C.lo }} />
                                </a>
                              )
                            )}
                          </div>
                          <button
                            onClick={() => deleteAlbum(a.id)}
                            className="mt-3 w-full rounded-lg py-1.5 text-xs"
                            style={{ border: `1px solid ${C.bride}`, color: C.bride }}
                          >
                            이 앨범 삭제
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
        </div>
      </div>
    </main>
  );
}
