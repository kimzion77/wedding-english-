import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * R2 직접 업로드 완료 후 메타데이터를 Supabase `guestsnap` 테이블에 기록.
 */
export async function POST(req: Request) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "서버에 Supabase가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  let body: {
    key?: string;
    media_type?: string;
    size?: number;
    uploader_name?: string;
    album_id?: string;
  } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const key = body?.key?.trim();
  if (!key) {
    return NextResponse.json({ error: "key가 없습니다." }, { status: 400 });
  }

  const { error } = await supabase.from("guestsnap").insert({
    file_path: key,
    media_type: body?.media_type === "video" ? "video" : "image",
    size: typeof body?.size === "number" ? body.size : null,
    uploader_name: (body?.uploader_name || "").trim() || null,
    album_id: body?.album_id || null,
  });

  if (error) {
    return NextResponse.json({ error: "기록에 실패했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
