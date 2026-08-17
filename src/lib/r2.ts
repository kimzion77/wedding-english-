import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (S3 호환) — 게스트스냅 파일(사진·영상) 저장소.
 * 자격증명은 서버 전용 환경변수로만 사용한다(클라이언트 노출 금지).
 * 메타데이터(목록/순서/업로더)는 Supabase `guestsnap` 테이블이 계속 담당.
 */
export const R2_BUCKET = process.env.R2_BUCKET || "guest-snap";

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
  );
}

let client: S3Client | null = null;

function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;
  if (client) return client;
  const endpoint =
    process.env.R2_ENDPOINT ||
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  client = new S3Client({
    region: "auto",
    endpoint,
    // R2 는 path-style(<account>.r2.../<bucket>/<key>)이 안전 —
    // 가상호스트 스타일은 2단계 서브도메인이라 와일드카드 인증서 미스매치 위험.
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

/** 파일 업로드 */
export async function r2Put(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const c = getR2Client();
  if (!c) throw new Error("R2가 설정되지 않았습니다.");
  await c.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/** 업로드용 presigned PUT URL (브라우저가 R2로 직접 업로드, 기본 10분) */
export async function r2PresignPut(
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<string> {
  const c = getR2Client();
  if (!c) throw new Error("R2가 설정되지 않았습니다.");
  return getSignedUrl(
    c,
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

/** 비공개 객체의 임시 열람 URL (기본 1시간) */
export async function r2SignedGetUrl(
  key: string,
  expiresIn = 60 * 60
): Promise<string> {
  const c = getR2Client();
  if (!c) throw new Error("R2가 설정되지 않았습니다.");
  return getSignedUrl(
    c,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn }
  );
}

/** 객체를 스트림으로 가져오기 (우리 도메인 경유 사진·영상 제공용) */
export async function r2GetStream(key: string): Promise<{
  stream: ReadableStream;
  contentType?: string;
  contentLength?: number;
} | null> {
  const c = getR2Client();
  if (!c) return null;
  try {
    const res = await c.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
    );
    if (!res.Body) return null;
    return {
      stream: res.Body.transformToWebStream(),
      contentType: res.ContentType,
      contentLength: res.ContentLength,
    };
  } catch {
    return null;
  }
}

/** 객체 전체 바이트 (관리자 ZIP 다운로드용) */
export async function r2GetBuffer(key: string): Promise<Buffer | null> {
  const c = getR2Client();
  if (!c) return null;
  try {
    const res = await c.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
    );
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}
