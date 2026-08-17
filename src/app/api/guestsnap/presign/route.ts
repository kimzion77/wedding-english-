import { NextResponse } from "next/server";
import { isR2Configured, r2PresignPut } from "@/lib/r2";

export const runtime = "nodejs";

const ALLOWED = /^(image|video)\//;

/**
 * 브라우저가 R2로 파일을 직접 업로드하기 위한 presigned PUT URL 발급.
 * 우리 서버를 거치지 않으므로 용량 제한(Vercel 4.5MB)에 걸리지 않는다.
 * R2 미설정이면 { fallback: true } → 클라이언트가 기존 멀티파트 업로드로 전환.
 */
export async function POST(req: Request) {
  if (!isR2Configured()) {
    return NextResponse.json({ fallback: true });
  }

  let body: { filename?: string; contentType?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const contentType = body?.contentType || "";
  if (!ALLOWED.test(contentType)) {
    return NextResponse.json(
      { error: "사진 또는 영상 파일만 업로드할 수 있습니다." },
      { status: 400 }
    );
  }

  const mediaType = contentType.startsWith("video") ? "video" : "image";
  const ext = (body?.filename?.split(".").pop() || "bin").toLowerCase();
  const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  try {
    const url = await r2PresignPut(key, contentType);
    return NextResponse.json({ url, key, mediaType, contentType });
  } catch {
    return NextResponse.json(
      { error: "업로드 주소 발급에 실패했습니다." },
      { status: 500 }
    );
  }
}
