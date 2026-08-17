import { NextResponse } from "next/server";
import { isAdminKey } from "@/lib/admin";
import { isR2Configured, r2Put } from "@/lib/r2";
import { getServerSupabase, GUEST_SNAP_BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * 관리자 전용 서버 경유 파일 업로드 — 브라우저가 R2 직접 PUT 못 하는 환경에서도 동작.
 * 서버가 R2(또는 Supabase Storage)로 업로드하고 file_key 만 반환.
 * 호출자(admin)가 받은 key 를 gallery/site-images 등에 저장.
 */
export async function POST(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!isAdminKey(key))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const ct = file.type || "application/octet-stream";

  try {
    if (isR2Configured()) {
      await r2Put(path, buffer, ct);
    } else {
      const supabase = getServerSupabase();
      if (!supabase)
        return NextResponse.json({ error: "no storage" }, { status: 503 });
      const { error } = await supabase.storage
        .from(GUEST_SNAP_BUCKET)
        .upload(path, buffer, { contentType: ct, upsert: false });
      if (error) throw error;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "업로드 실패" },
      { status: 500 }
    );
  }
  return NextResponse.json({ fileKey: path });
}
