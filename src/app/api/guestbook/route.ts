import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { isAdminKey } from "@/lib/admin";

export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ entries: [] });

  const { data, error } = await supabase
    .from("guestbook")
    .select("id, name, message, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ entries: [] });
  return NextResponse.json({ entries: data });
}

export async function POST(req: Request) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "서버에 Supabase가 아직 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const message = (body.message ?? "").trim();
  if (!name || !message) {
    return NextResponse.json(
      { error: "이름과 메시지를 입력해주세요." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("guestbook").insert({
    name: name.slice(0, 40),
    message: message.slice(0, 1000),
  });

  if (error) {
    return NextResponse.json({ error: "등록에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** 관리자 전용 삭제 — ?key=ADMIN_PASSWORD & ?id=글ID */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "서버에 Supabase가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const { error } = await supabase.from("guestbook").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
