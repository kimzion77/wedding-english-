import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { isAdminKey } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 변형별 키 네임스페이스 (main 은 접두사 없음, 그 외 v__id) */
function keyOf(v: string, id: string) {
  return v === "main" ? id : `${v}__${id}`;
}
function parse(stored: string): { v: string; id: string } {
  const i = stored.indexOf("__");
  return i < 0 ? { v: "main", id: stored } : { v: stored.slice(0, i), id: stored.slice(i + 2) };
}

/** 청첩장 문구/디자인 오버라이드 (?v=main|honju) */
export async function GET(req: Request) {
  const v = new URL(req.url).searchParams.get("v") || "main";
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ overrides: {} });
  try {
    const { data } = await supabase.from("site_texts").select("id, value");
    const overrides: Record<string, string> = {};
    (data ?? []).forEach((r) => {
      const p = parse(r.id);
      if (p.v === v && typeof r.value === "string") overrides[p.id] = r.value;
    });
    return NextResponse.json({ overrides });
  } catch {
    return NextResponse.json({ overrides: {} });
  }
}

/** 문구/디자인 저장 (관리자) — ?v= & { id, value } */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const v = url.searchParams.get("v") || "main";

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  let body: { id?: string; value?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const id = (body?.id || "").trim();
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const value = String(body?.value ?? "").slice(0, 4000);

  const { error } = await supabase
    .from("site_texts")
    .upsert({ id: keyOf(v, id), value, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** 기본값으로 되돌리기 (관리자) — ?key=&v=&id= */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const v = url.searchParams.get("v") || "main";
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });
  await supabase.from("site_texts").delete().eq("id", keyOf(v, id));
  return NextResponse.json({ ok: true });
}
