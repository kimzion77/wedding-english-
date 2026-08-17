import { getServerSupabase, GUEST_SNAP_BUCKET } from "@/lib/supabase";
import { isR2Configured, r2GetStream } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * 게스트스냅 파일을 "우리 사이트 도메인" 경유로 제공한다.
 * 브라우저는 R2 주소를 직접 호출하지 않으므로 어떤 네트워크에서도 보이고,
 * 버킷은 비공개로 유지된다. (id = guestsnap 테이블의 행 id)
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("Bad Request", { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return new Response("Not configured", { status: 503 });

  const { data: row } = await supabase
    .from("guestsnap")
    .select("file_path, media_type")
    .eq("id", id)
    .maybeSingle();

  if (!row) return new Response("Not found", { status: 404 });

  const fallbackType =
    row.media_type === "video" ? "video/mp4" : "image/jpeg";

  if (isR2Configured()) {
    const obj = await r2GetStream(row.file_path);
    if (!obj) return new Response("Not found", { status: 404 });
    return new Response(obj.stream, {
      headers: {
        "Content-Type": obj.contentType ?? fallbackType,
        "Cache-Control": "private, max-age=3600",
        ...(obj.contentLength
          ? { "Content-Length": String(obj.contentLength) }
          : {}),
      },
    });
  }

  // R2 미설정 시 Supabase Storage 폴백
  const { data: blob } = await supabase.storage
    .from(GUEST_SNAP_BUCKET)
    .download(row.file_path);
  if (!blob) return new Response("Not found", { status: 404 });
  return new Response(blob.stream(), {
    headers: {
      "Content-Type": blob.type || fallbackType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
