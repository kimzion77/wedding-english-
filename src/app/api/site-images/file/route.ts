import { getServerSupabase } from "@/lib/supabase";
import { isR2Configured, r2GetStream } from "@/lib/r2";

export const runtime = "nodejs";

function keyOf(v: string, slot: string) {
  return v === "main" ? slot : `${v}__${slot}`;
}

/** 슬롯에 지정된 사진을 R2 에서 스트리밍 (?slot=&v=) */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slot = url.searchParams.get("slot");
  const v = url.searchParams.get("v") || "main";
  if (!slot) return new Response("Bad Request", { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return new Response("no db", { status: 503 });

  const { data } = await supabase
    .from("site_images")
    .select("file_key")
    .eq("slot", keyOf(v, slot))
    .maybeSingle();
  if (!data?.file_key) return new Response("Not found", { status: 404 });

  if (!isR2Configured()) return new Response("no storage", { status: 503 });
  const obj = await r2GetStream(data.file_key);
  if (!obj) return new Response("Not found", { status: 404 });

  // fv(파일 버전) 붙은 URL 은 교체 시 URL 이 바뀌므로 1년 캐시 안전
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
