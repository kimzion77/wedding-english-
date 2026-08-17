import { NextResponse } from "next/server";
import sharp from "sharp";
import { isAdminKey } from "@/lib/admin";
import { getServerSupabase } from "@/lib/supabase";
import { isR2Configured, r2GetBuffer, r2Put } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * R2 에 저장된 갤러리/타임라인/엔딩 사진들을 일괄 다운로드 → 압축 → 재업로드.
 * (관리자가 큰 원본을 업로드해도 청첩장 로딩이 빠르도록)
 * - 긴 변 1200px 이하 / JPEG q80
 * - file_key 가 /assets/ 로 시작하면 시드된 기본 사진 → 건너뜀
 * - 이미 작은(~200KB 이하) 사진도 건너뜀
 * - 원본보다 작아진 경우에만 덮어쓰기
 */
export async function POST(req: Request) {
  if (!isAdminKey(new URL(req.url).searchParams.get("key")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isR2Configured())
    return NextResponse.json({ error: "R2 미설정" }, { status: 503 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "no db" }, { status: 503 });

  const { data: rows, error } = await supabase
    .from("gallery_photos")
    .select("id, file_key, section");
  if (error || !rows)
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });

  const results = { processed: 0, skipped_default: 0, skipped_small: 0, failed: 0, saved_bytes: 0 };
  for (const r of rows) {
    const key = r.file_key as string;
    if (!key || key.startsWith("/assets/") || key.startsWith("assets/")) {
      results.skipped_default++;
      continue;
    }
    try {
      const buf = await r2GetBuffer(key);
      if (!buf) { results.failed++; continue; }
      // 200KB 이하면 이미 충분히 작음 → 건너뜀
      if (buf.length < 200 * 1024) { results.skipped_small++; continue; }
      const compressed = await sharp(buf)
        .rotate() // EXIF 회전 보존
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      // 원본보다 작아진 경우에만 덮어쓰기
      if (compressed.length < buf.length) {
        await r2Put(key, compressed, "image/jpeg");
        results.processed++;
        results.saved_bytes += buf.length - compressed.length;
      } else {
        results.skipped_small++;
      }
    } catch {
      results.failed++;
    }
  }
  return NextResponse.json({ ok: true, ...results, saved_mb: Math.round(results.saved_bytes / 1024 / 1024 * 10) / 10 });
}
