import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { isAdminKey } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function keyOf(v: string, slot: string) {
  return v === "main" ? slot : `${v}__${slot}`;
}
function parse(stored: string): { v: string; slot: string } {
  const i = stored.indexOf("__");
  return i < 0 ? { v: "main", slot: stored } : { v: stored.slice(0, i), slot: stored.slice(i + 2) };
}

/** 청첩장 사진 슬롯 오버라이드 (?v=main|honju) */
export async function GET(req: Request) {
  const v = new URL(req.url).searchParams.get("v") || "main";
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ overrides: {} });
  try {
    const { data } = await supabase.from("site_images").select("slot, file_key");
    const overrides: Record<string, string> = {};
    (data ?? []).forEach((r) => {
      const p = parse(r.slot);
      if (p.v === v && r.file_key) {
        // file_key 조각을 버전(fv)으로 — 교체 시 URL 이 바뀌어 장기 캐시 안전
        const fv = r.file_key.split("/").pop()?.slice(0, 8) || "0";
        overrides[p.slot] = `/api/site-images/file?slot=${encodeURIComponent(p.slot)}&v=${encodeURIComponent(v)}&fv=${fv}`;
      }
    });
    return NextResponse.json({ overrides });
  } catch {
    return NextResponse.json({ overrides: {} });
  }
}

/** 슬롯 사진 지정 (관리자) — ?v= & { slot, fileKey } */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const v = url.searchParams.get("v") || "main";

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  let body: { slot?: string; fileKey?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const slot = (body?.slot || "").trim();
  const fileKey = (body?.fileKey || "").trim();
  if (!slot || !fileKey)
    return NextResponse.json({ error: "slot/fileKey 필요" }, { status: 400 });

  const { error } = await supabase
    .from("site_images")
    .upsert({ slot: keyOf(v, slot), file_key: fileKey, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** 슬롯을 기본 이미지로 되돌리기 (관리자) — ?key=&v=&slot= */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const v = url.searchParams.get("v") || "main";
  const slot = url.searchParams.get("slot");
  if (!slot) return NextResponse.json({ error: "slot 필요" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });
  await supabase.from("site_images").delete().eq("slot", keyOf(v, slot));
  return NextResponse.json({ ok: true });
}
