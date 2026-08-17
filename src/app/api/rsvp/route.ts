import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

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
  if (!name) {
    return NextResponse.json({ error: "성함을 입력해주세요." }, { status: 400 });
  }
  // 디자인은 go(참석/미정/불참)·count 로 보내고, 기존 호출은 attendance·guest_count
  const goRaw = body.go ?? body.attendance ?? "참석";
  const attendance = ["참석", "미정", "불참"].includes(goRaw) ? goRaw : "참석";
  const countRaw = body.count ?? body.guest_count;

  const { error } = await supabase.from("rsvp").insert({
    side: body.side === "신부측" ? "신부측" : "신랑측",
    name,
    attendance,
    guest_count: Math.max(1, parseInt(String(countRaw ?? ""), 10) || 1),
    meal: body.meal || "미정",
    phone: (body.phone ?? "").trim() || null,
    message: (body.message ?? "").trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
