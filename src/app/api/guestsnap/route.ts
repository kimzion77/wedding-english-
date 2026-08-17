import { NextResponse } from "next/server";
import { getServerSupabase, GUEST_SNAP_BUCKET } from "@/lib/supabase";
import { isR2Configured, r2Put } from "@/lib/r2";

export const runtime = "nodejs";

const ALLOWED = /^(image|video)\//;

export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ items: [] });

  const { data, error } = await supabase
    .from("guestsnap")
    .select("id, media_type, uploader_name, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error || !data) return NextResponse.json({ items: [] });

  // 파일은 우리 도메인 경유(/api/guestsnap/file)로 제공 → 비공개 유지 + 모든 망에서 열람
  const items = data.map((row) => ({
    id: row.id,
    url: `/api/guestsnap/file?id=${row.id}`,
    media_type: row.media_type,
    uploader_name: row.uploader_name,
  }));

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "서버에 Supabase가 아직 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const uploaderName = (form.get("uploader_name") as string | null)?.trim() || null;
  const albumId = (form.get("album_id") as string | null)?.trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  if (!ALLOWED.test(file.type)) {
    return NextResponse.json(
      { error: "사진 또는 영상 파일만 업로드할 수 있습니다." },
      { status: 400 }
    );
  }

  const mediaType = file.type.startsWith("video") ? "video" : "image";
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (isR2Configured()) {
      await r2Put(path, buffer, file.type);
    } else {
      const { error: upErr } = await supabase.storage
        .from(GUEST_SNAP_BUCKET)
        .upload(path, buffer, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
    }
  } catch {
    return NextResponse.json({ error: "업로드에 실패했습니다." }, { status: 500 });
  }

  await supabase.from("guestsnap").insert({
    file_path: path,
    media_type: mediaType,
    size: file.size,
    uploader_name: uploaderName,
    album_id: albumId,
  });

  return NextResponse.json({ ok: true });
}
