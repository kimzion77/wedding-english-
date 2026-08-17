import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { isAdminKey } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Side = "groom" | "bride";
const isSide = (s: unknown): s is Side => s === "groom" || s === "bride";

/** 계좌 목록 (변형별) — 공개 응답에 phone 포함(연락 버튼용) */
export async function GET(req: Request) {
  const v = new URL(req.url).searchParams.get("v") || "main";
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ groom: [], bride: [] });
  try {
    let { data, error } = await supabase
      .from("accounts")
      .select("id, side, role, bank, number, holder, phone, kakaopay, sort")
      .eq("variant", v)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    // kakaopay 컬럼이 없으면 그 컬럼 빼고 다시 조회 (SQL 미실행 안전 폴백)
    if (error) {
      const r2 = await supabase
        .from("accounts")
        .select("id, side, role, bank, number, holder, phone, sort")
        .eq("variant", v)
        .order("sort", { ascending: true })
        .order("created_at", { ascending: true });
      data = r2.data?.map((x) => ({ ...x, kakaopay: null })) ?? [];
    }
    const groom = (data ?? []).filter((r) => r.side === "groom").map((r) => ({ ...r, kakaopay: (r as { kakaopay?: string | null }).kakaopay ?? null }));
    const bride = (data ?? []).filter((r) => r.side === "bride").map((r) => ({ ...r, kakaopay: (r as { kakaopay?: string | null }).kakaopay ?? null }));
    return NextResponse.json({ groom, bride });
  } catch {
    return NextResponse.json({ groom: [], bride: [] });
  }
}

/** 계좌 추가 (관리자) — ?v= & { side, role, bank, number, holder, phone? } */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const v = url.searchParams.get("v") || "main";

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  let b: { side?: string; role?: string; bank?: string; number?: string; holder?: string; phone?: string; kakaopay?: string } | null = null;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }
  if (!isSide(b?.side)) return NextResponse.json({ error: "side 필요" }, { status: 400 });
  const role = (b?.role || "").trim();
  if (!role) return NextResponse.json({ error: "역할(role) 필요" }, { status: 400 });

  const baseRow: Record<string, unknown> = {
    variant: v,
    side: b.side,
    role: role.slice(0, 40),
    bank: (b?.bank || "").slice(0, 40) || null,
    number: (b?.number || "").slice(0, 60) || null,
    holder: (b?.holder || "").slice(0, 40) || null,
    phone: (b?.phone || "").slice(0, 30) || null,
  };
  if (b?.kakaopay !== undefined) baseRow.kakaopay = (b.kakaopay || "").slice(0, 300) || null;
  let { data, error } = await supabase.from("accounts").insert(baseRow).select("id").single();
  if (error && baseRow.kakaopay !== undefined) {
    // kakaopay 컬럼 미존재 시 폴백
    delete baseRow.kakaopay;
    ({ data, error } = await supabase.from("accounts").insert(baseRow).select("id").single());
  }
  if (error || !data) return NextResponse.json({ error: "추가 실패" }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

/** 수정 (관리자) — ?key=&id= & 부분 필드 */
export async function PATCH(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  let b: Record<string, string | undefined> | null = null;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }
  const patch: Record<string, string | null> = {};
  (["role", "bank", "number", "holder", "phone", "kakaopay"] as const).forEach((k) => {
    if (b && k in b) patch[k] = (b[k] ?? "").slice(0, k === "kakaopay" ? 300 : 60) || null;
  });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });
  let { error } = await supabase.from("accounts").update(patch).eq("id", id);
  if (error && "kakaopay" in patch) {
    delete patch.kakaopay;
    ({ error } = await supabase.from("accounts").update(patch).eq("id", id));
  }
  if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** 삭제 (관리자) — ?key=&id= */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });
  await supabase.from("accounts").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
