import { NextResponse } from "next/server";
import { isAdminKey } from "@/lib/admin";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 관리자용 앨범 목록 — 연락처(phone) 포함 + 미디어 목록 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!isAdminKey(key)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ albums: [] }, { status: 503 });

  const { data: albums } = await supabase
    .from("albums")
    .select("id, name, phone, created_at")
    .order("created_at", { ascending: false });

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

  const result = (albums ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    phone: a.phone ?? "",
    created_at: a.created_at,
    media: (byAlbum.get(a.id) ?? []).map((m) => ({
      id: m.id,
      media_type: m.media_type,
      url: `/api/guestsnap/file?id=${m.id}`,
    })),
  }));

  return NextResponse.json({ albums: result });
}

/** 앨범 삭제 — ?key=&id= (미디어 메타는 FK cascade 로 함께 삭제) */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  const { error } = await supabase.from("albums").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
