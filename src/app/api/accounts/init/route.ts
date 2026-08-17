import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { isAdminKey } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 변형별 계좌를 한 번만 시드 — 신랑/신부 본인 계좌 기본값.
 * 이미 데이터 있으면 무동작 (멱등).
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const v = url.searchParams.get("v") || "main";

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  const { count } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("variant", v);
  if ((count ?? 0) > 0) return NextResponse.json({ ok: true, seeded: 0 });

  const { error } = await supabase.from("accounts").insert([
    { variant: v, side: "groom", role: "신랑", bank: "국민은행", number: "046802-04-218584", holder: "우성규" },
    { variant: v, side: "bride", role: "신부", bank: "신한은행", number: "110-371-160753", holder: "김지은" },
  ]);
  if (error) return NextResponse.json({ error: "시드 실패" }, { status: 500 });
  return NextResponse.json({ ok: true, seeded: 2 });
}
