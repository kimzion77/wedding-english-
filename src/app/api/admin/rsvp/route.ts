import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { isAdminKey } from "@/lib/admin";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!isAdminKey(key))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase)
    return NextResponse.json(
      { error: "Supabase가 설정되지 않았습니다.", rows: [] },
      { status: 503 }
    );

  const { data, error } = await supabase
    .from("rsvp")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: "조회 실패", rows: [] }, { status: 500 });
  return NextResponse.json({ rows: data });
}

/** 관리자 — RSVP 삭제. ?id= 면 한 건, 없으면 전체 초기화(테스트용). */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase)
    return NextResponse.json({ error: "no db" }, { status: 503 });

  const id = url.searchParams.get("id");
  if (id) {
    const { error } = await supabase.from("rsvp").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  // 전체 초기화 (가짜 id 비교로 항상 매치되도록)
  const { error } = await supabase
    .from("rsvp")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return NextResponse.json({ error: "초기화 실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
