import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 게스트스냅 앨범 목록 (한 명 = 한 권).
 * photos 는 디자인 app.js 가 기대하는 형태로 반환:
 *  - 이미지: "url" (문자열)
 *  - 영상:   { type:"video", src:"url" }
 * 파일은 우리 프록시(/api/guestsnap/file?id=) 경유 — 비공개 유지.
 * ⚠️ 연락처(phone)는 공개 응답에 포함하지 않는다(개인정보 보호).
 */
export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json([]);

  const { data: albums, error } = await supabase
    .from("albums")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });
  if (error || !albums) return NextResponse.json([]);

  const { data: media } = await supabase
    .from("guestsnap")
    .select("id, album_id, media_type, created_at")
    .order("created_at", { ascending: true });

  const byAlbum = new Map<string, { id: string; media_type: string }[]>();
  (media ?? []).forEach((m) => {
    if (!m.album_id) return;
    const arr = byAlbum.get(m.album_id) ?? [];
    arr.push({ id: m.id, media_type: m.media_type });
    byAlbum.set(m.album_id, arr);
  });

  const result = albums.map((a) => ({
    id: a.id,
    name: a.name,
    at: new Date(a.created_at).getTime(),
    photos: (byAlbum.get(a.id) ?? []).map((m) => {
      const url = `/api/guestsnap/file?id=${m.id}`;
      return m.media_type === "video" ? { type: "video", src: url } : url;
    }),
  }));

  return NextResponse.json(result);
}

/** 앨범 생성 — { name, phone, consent } → { id } */
export async function POST(req: Request) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "서버에 Supabase가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  let body: { name?: string; phone?: string; consent?: boolean } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const name = (body?.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "성함을 입력해주세요." }, { status: 400 });
  }
  if (!body?.consent) {
    return NextResponse.json(
      { error: "개인정보 수집·이용에 동의해주세요." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("albums")
    .insert({
      name: name.slice(0, 40),
      phone: (body?.phone || "").trim().slice(0, 30) || null,
      consent: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "앨범 생성에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
