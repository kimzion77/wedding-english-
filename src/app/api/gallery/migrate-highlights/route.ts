import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { isAdminKey } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 시드된 타임라인의 평문 caption을 [[강조]] 포함 마크업으로 한 번에 교체.
 * caption이 기존 시드값과 정확히 일치할 때만 업데이트 (사용자가 수정한 행은 건드리지 않음).
 */
const MIGRATIONS: { old: string; next: string }[] = [
  {
    old: "고등학교 동창이었지만,\n친구의 친구로 어색하게 시작됐어요.",
    next: "고등학교 동창이었지만,\n친구의 친구로 [[어색하게]]\n시작됐어요.",
  },
  {
    old: "서로를 알아가던\n가장 따뜻한 계절이었어요.",
    next: "[[서로를 알아가던]]\n가장 따뜻한 계절이었어요.",
  },
  {
    old: "같은 길을 걷기로\n결심했어요.",
    next: "같은 길을 걷기로\n[[결심했어요.]]",
  },
  {
    old: "함께하기로 약속한 날,\n저희 시작의 증인이 되어주세요.",
    next: "함께하기로 [[약속한 날,]]\n저희 시작의 [[증인]]이 되어주세요.",
  },
];

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  let updated = 0;
  for (const m of MIGRATIONS) {
    const { data } = await supabase
      .from("gallery_photos")
      .update({ caption: m.next })
      .eq("section", "timeline")
      .eq("caption", m.old)
      .select("id");
    updated += data?.length ?? 0;
  }
  return NextResponse.json({ ok: true, updated });
}
