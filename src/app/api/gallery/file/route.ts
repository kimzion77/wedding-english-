import { getServerSupabase } from "@/lib/supabase";
import { isR2Configured, r2GetStream } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * 갤러리/타임라인/엔딩 사진을 우리 도메인으로 제공.
 * - file_key 가 /assets/... 형태(시드된 기본 사진)면 그대로 리다이렉트
 * - 그 외에는 R2 에서 스트리밍
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response("Bad Request", { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return new Response("no db", { status: 503 });

  const { data } = await supabase
    .from("gallery_photos")
    .select("file_key")
    .eq("id", id)
    .maybeSingle();
  if (!data?.file_key) return new Response("Not found", { status: 404 });

  const key = data.file_key;
  // 정적 자산(시드 기본 사진) — 청첩장 도메인의 /assets/... 로 리다이렉트
  if (key.startsWith("/assets/") || key.startsWith("assets/")) {
    const path = key.startsWith("/") ? key : "/" + key;
    return Response.redirect(new URL(path, url.origin), 302);
  }

  if (!isR2Configured()) return new Response("no storage", { status: 503 });
  const obj = await r2GetStream(key);
  if (!obj) return new Response("Not found", { status: 404 });
  // fv(파일 버전) 붙은 URL 은 내용이 바뀌면 URL 자체가 바뀌므로 1년 캐시 안전.
  // fv 없는 옛 URL 은 짧게 캐시(교체 반영 위해).
  const immutable = url.searchParams.has("fv");
  return new Response(obj.stream, {
    headers: {
      "Content-Type": obj.contentType ?? "image/jpeg",
      "Cache-Control": immutable
        ? "public, max-age=31536000, s-maxage=31536000, immutable"
        : "public, max-age=60",
    },
  });
}
