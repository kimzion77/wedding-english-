import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { isAdminKey } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Seed = {
  section: "gallery" | "timeline" | "ending";
  file_key: string;        // /assets/... 정적 경로
  step?: string;
  year_title?: string;
  caption?: string;
};

const SEED: Seed[] = [
  // 갤러리 5장 (세로 3:4)
  { section: "gallery", file_key: "/assets/couple_veil.jpg" },
  { section: "gallery", file_key: "/assets/couple_ring.jpg" },
  { section: "gallery", file_key: "/assets/filmprint_ring.jpg" },
  { section: "gallery", file_key: "/assets/thumb_cake.jpg" },
  { section: "gallery", file_key: "/assets/thumb_hands.jpg" },
  // 타임라인 4컷 — [[..]] 는 청첩장에서 노란 하이라이트(<mark>) 로 표시됨
  { section: "timeline", file_key: "/assets/thumb_field.jpg", step: "First", year_title: "첫 만남", caption: "고등학교 동창이었지만,\n친구의 친구로 [[어색하게]]\n시작됐어요." },
  { section: "timeline", file_key: "/assets/thumb_hands.jpg", step: "12 Years", year_title: "함께한 12년", caption: "[[서로를 알아가던]]\n가장 따뜻한 계절이었어요." },
  { section: "timeline", file_key: "/assets/thumb_road.jpg", step: "Promise", year_title: "우리의 약속", caption: "같은 길을 걷기로\n[[결심했어요.]]" },
  { section: "timeline", file_key: "/assets/couple_ring.jpg", step: "Wedding Day", year_title: "12. 20.", caption: "함께하기로 [[약속한 날,]]\n저희 시작의 [[증인]]이 되어주세요." },
  // 엔딩 1컷
  { section: "ending", file_key: "/assets/thumb_cake.jpg", caption: "The End · 12.20" },
];

/**
 * 변형(v)별로 청첩장 사진을 한 번만 시드 (이미 데이터가 있으면 무동작).
 * 시드 후엔 관리자가 자유롭게 추가/삭제/교체 가능.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const v = url.searchParams.get("v") || "main";

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  // 이미 데이터 있으면 건너뜀 (idempotent)
  const { count } = await supabase
    .from("gallery_photos")
    .select("id", { count: "exact", head: true })
    .eq("variant", v);
  if ((count ?? 0) > 0) return NextResponse.json({ ok: true, seeded: 0 });

  const rows = SEED.map((s) => ({
    variant: v,
    section: s.section,
    file_key: s.file_key,
    step: s.step ?? null,
    year_title: s.year_title ?? null,
    caption: s.caption ?? null,
  }));
  const { error } = await supabase.from("gallery_photos").insert(rows);
  if (error) return NextResponse.json({ error: "시드 실패" }, { status: 500 });
  return NextResponse.json({ ok: true, seeded: rows.length });
}
