import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 청첩장 페이지 진입 시 한 번 호출되는 방문 기록 ping.
 * - 같은 session 이 1시간 내 재방문하면 무시(중복 방지)
 * - 같은 session 이 1시간 후 재방문하면 새 행 추가
 * - IP는 해시만 저장(개인정보 최소화)
 */
export async function POST(req: Request) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  let body: { variant?: string; session_id?: string } | null = null;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const variant = body?.variant === "honju" ? "honju" : "main";
  const session_id = (body?.session_id || "").slice(0, 64) || null;
  const ua = (req.headers.get("user-agent") || "").slice(0, 300);
  const referer = (req.headers.get("referer") || "").slice(0, 300);
  const ipRaw = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ip_hash = ipRaw ? crypto.createHash("sha256").update(ipRaw).digest("hex").slice(0, 16) : null;
  // Vercel 이 자동 주입하는 지리정보 헤더 (외부 API 불필요). 로컬/비-Vercel 환경에선 빈 값.
  const country = (req.headers.get("x-vercel-ip-country") || "").slice(0, 2).toUpperCase() || null;
  const cityRaw = req.headers.get("x-vercel-ip-city") || "";
  // Vercel city 는 URL 인코딩되어 올 수 있음 (예: "Seoul", "Gangnam-gu")
  let city: string | null = null;
  try { city = cityRaw ? decodeURIComponent(cityRaw).slice(0, 80) : null; }
  catch { city = cityRaw ? cityRaw.slice(0, 80) : null; }

  // 1시간 내 같은 session_id 가 있으면 skip
  if (session_id) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("visits")
      .select("id")
      .eq("session_id", session_id)
      .gte("created_at", oneHourAgo)
      .limit(1);
    if (recent && recent.length > 0) {
      return NextResponse.json({ ok: true, deduped: true });
    }
  }

  // country/city 컬럼이 아직 없는 DB 를 위해 실패 시 축소 재시도
  const full = { variant, session_id, ua, referer, ip_hash, ip: ipRaw || null, country, city };
  const { error } = await supabase.from("visits").insert(full);
  if (error && (error as { code?: string }).code === "42703") {
    const { variant: _v, session_id: _s, ua: _u, referer: _r, ip_hash: _h, ip: _i } = full;
    await supabase.from("visits").insert({ variant: _v, session_id: _s, ua: _u, referer: _r, ip_hash: _h, ip: _i });
  }
  return NextResponse.json({ ok: true });
}
