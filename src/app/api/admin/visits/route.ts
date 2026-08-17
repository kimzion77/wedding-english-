import { NextResponse } from "next/server";
import { isAdminKey } from "@/lib/admin";
import { getServerSupabase } from "@/lib/supabase";
import { parseUA, shortReferer } from "@/lib/ua";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 방문 통계 조회 (관리자)
 * 응답:
 * - today / yesterday / week / total : 카운트 (재방문 deduped)
 * - todayUnique : 오늘 unique session 수
 * - byDay : 최근 14일 일별 카운트 (날짜 desc)
 * - byHour : 오늘 24시간 시간별 카운트 (KST 기준)
 * - byVariant : main / honju 분리 (오늘 기준)
 * - recent : 최근 50건 (간단 정보)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  // KST(UTC+9) 기준으로 "오늘"을 계산. 서버는 보통 UTC.
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowKst = new Date(Date.now() + KST_OFFSET_MS);
  const y = nowKst.getUTCFullYear();
  const m = nowKst.getUTCMonth();
  const d = nowKst.getUTCDate();
  // KST 자정 → UTC
  const startOfTodayKstMs = Date.UTC(y, m, d) - KST_OFFSET_MS;
  const startOfTodayUtc = new Date(startOfTodayKstMs).toISOString();
  const startOfYesterdayUtc = new Date(startOfTodayKstMs - 24 * 3600 * 1000).toISOString();
  const startOf14daysAgoUtc = new Date(startOfTodayKstMs - 13 * 24 * 3600 * 1000).toISOString();
  const startOf7daysAgoUtc = new Date(startOfTodayKstMs - 6 * 24 * 3600 * 1000).toISOString();

  type Row = {
    id: string;
    created_at: string;
    variant: string;
    session_id: string | null;
    ua?: string | null;
    referer?: string | null;
    ip?: string | null;
    country?: string | null;
    city?: string | null;
  };

  // 14일치만 한 번에 가져와서 클라이언트 사이드 집계
  // 새 컬럼(country/city/ip)이 없는 DB 를 위해 넓은→좁은 순으로 폴백
  const FIELDS_FULL = "id, created_at, variant, session_id, ua, referer, ip, country, city";
  const FIELDS_WITH_IP = "id, created_at, variant, session_id, ua, referer, ip";
  const FIELDS_NO_IP = "id, created_at, variant, session_id, ua, referer";
  let rows: Row[] | null = null;
  let lastErr: { message: string; code?: string } | null = null;
  for (const fields of [FIELDS_FULL, FIELDS_WITH_IP, FIELDS_NO_IP]) {
    const { data, error } = await supabase
      .from("visits")
      .select(fields)
      .gte("created_at", startOf14daysAgoUtc)
      .order("created_at", { ascending: false });
    if (!error) { rows = (data ?? []) as unknown as Row[]; break; }
    lastErr = { message: error.message, code: (error as { code?: string }).code };
    if (lastErr.code !== "42703") break; // 컬럼 없음 외 에러는 폴백 시도 안함
  }
  if (!rows) return NextResponse.json({ error: lastErr?.message || "조회 실패" }, { status: 500 });
  const all = rows;

  // 총 누적 (가벼운 count 쿼리)
  const { count: totalCount } = await supabase
    .from("visits")
    .select("*", { count: "exact", head: true });

  const todayRows = all.filter((r) => r.created_at >= startOfTodayUtc);
  const yesterdayRows = all.filter(
    (r) => r.created_at >= startOfYesterdayUtc && r.created_at < startOfTodayUtc
  );
  const weekRows = all.filter((r) => r.created_at >= startOf7daysAgoUtc);

  const today = todayRows.length;
  const todayUnique = new Set(todayRows.map((r) => r.session_id).filter(Boolean)).size;
  const yesterday = yesterdayRows.length;
  const week = weekRows.length;
  const total = totalCount ?? 0;

  // 일별 (14일 — KST 기준)
  const byDay: { date: string; count: number; unique: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const dayStartMs = startOfTodayKstMs - i * 24 * 3600 * 1000;
    const dayEndMs = dayStartMs + 24 * 3600 * 1000;
    const dayStart = new Date(dayStartMs).toISOString();
    const dayEnd = new Date(dayEndMs).toISOString();
    const rowsOfDay = all.filter((r) => r.created_at >= dayStart && r.created_at < dayEnd);
    const kst = new Date(dayStartMs + KST_OFFSET_MS);
    const dateLabel = `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`;
    byDay.push({
      date: dateLabel,
      count: rowsOfDay.length,
      unique: new Set(rowsOfDay.map((r) => r.session_id).filter(Boolean)).size,
    });
  }

  // 시간별 (오늘 0~23 KST)
  const byHour: { hour: number; count: number }[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: 0,
  }));
  for (const r of todayRows) {
    const kst = new Date(new Date(r.created_at).getTime() + KST_OFFSET_MS);
    byHour[kst.getUTCHours()].count++;
  }

  // 변형별 (오늘)
  const byVariant = {
    main: todayRows.filter((r) => r.variant !== "honju").length,
    honju: todayRows.filter((r) => r.variant === "honju").length,
  };

  // 디바이스/OS/브라우저 집계 (오늘 + 7일 두 구간)
  const tally = (rs: Row[]) => {
    const device: Record<string, number> = {};
    const os: Record<string, number> = {};
    const browser: Record<string, number> = {};
    const referer: Record<string, number> = {};
    const country: Record<string, number> = {};
    for (const r of rs) {
      const info = parseUA(r.ua);
      device[info.device] = (device[info.device] || 0) + 1;
      os[info.os] = (os[info.os] || 0) + 1;
      browser[info.browser] = (browser[info.browser] || 0) + 1;
      const ref = shortReferer(r.referer, "wedding1220.com");
      referer[ref] = (referer[ref] || 0) + 1;
      const cc = (r.country || "").toUpperCase() || "UNKNOWN";
      country[cc] = (country[cc] || 0) + 1;
    }
    return { device, os, browser, referer, country };
  };
  const todayBreakdown = tally(todayRows);
  const weekBreakdown = tally(weekRows);

  // 최근 50건 — UA 파싱 + IP/Referer 포함
  const recent = all.slice(0, 50).map((r) => {
    const info = parseUA(r.ua);
    return {
      id: r.id,
      created_at: r.created_at,
      variant: r.variant,
      session_id: r.session_id ? r.session_id.slice(0, 8) : null,
      device: info.device,
      os: info.os,
      browser: info.browser,
      ip: r.ip || null,
      country: r.country || null,
      city: r.city || null,
      referer: shortReferer(r.referer, "wedding1220.com"),
    };
  });

  return NextResponse.json({
    today,
    todayUnique,
    yesterday,
    week,
    total,
    byDay,
    byHour,
    byVariant,
    todayBreakdown,
    weekBreakdown,
    recent,
  });
}
