const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-02-08T12:00:00+09:00" → {year, month, day, ...} 한국어 표기 */
export function formatWeddingDate(iso: string) {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAYS_KO[d.getDay()];
  let hour = d.getHours();
  const minute = d.getMinutes();
  const ampm = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return {
    full: `${year}년 ${month}월 ${day}일 ${weekday}요일`,
    date: `${year}. ${pad(month)}. ${pad(day)}`,
    dot: `${year}.${pad(month)}.${pad(day)}`,
    weekday: `${weekday}요일`,
    time:
      minute === 0
        ? `${ampm} ${hour12}시`
        : `${ampm} ${hour12}시 ${minute}분`,
    year,
    month,
    day,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** 날짜만 비교해 D-day 까지 남은 일수 (자정 기준). 지난 날이면 음수 */
export function daysUntil(targetIso: string, now: Date = new Date()): number {
  const target = startOfDay(new Date(targetIso));
  const today = startOfDay(now);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** 첫 만남일부터 오늘까지 경과 일수 (D+) */
export function daysSince(startIso: string, now: Date = new Date()): number {
  const start = startOfDay(new Date(startIso));
  const today = startOfDay(now);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 캘린더 추가용 — 예식 시작 ISO에서 1시간짜리 일정 (UTC, ICS 형식 YYYYMMDDTHHMMSSZ) */
export function toCalendarTimes(iso: string) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start: toIcsUtc(start), end: toIcsUtc(end) };
}

function toIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
