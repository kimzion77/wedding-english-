// 저장된 청첩장 사진 일괄 재압축 — 긴 변 1200px, WebP q80
// - gallery_photos + site_images 가 참조하는 R2 이미지가 대상 (영상·기타 파일 제외)
// - 재인코딩 결과가 기존보다 작을 때만 같은 키에 덮어씀 (URL·DB 변경 없음)
// - 덮어쓰기 전 원본을 scripts/_backup_originals/ 에 저장
// 실행: node scripts/compress-images.mjs          (미리보기 — 쓰기 없음)
//       node scripts/compress-images.mjs --apply  (실제 적용)
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const APPLY = process.argv.includes("--apply");
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(ROOT, "_backup_originals");

const env = {};
for (const line of readFileSync(path.join(ROOT, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const BUCKET = env.R2_BUCKET || "guest-snap";

async function pg(q) {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${q}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!r.ok) throw new Error(`${q}: ${r.status}`);
  return r.json();
}

const IMG_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
const gallery = await pg("gallery_photos?select=file_key");
const siteImages = await pg("site_images?select=file_key");
const keys = [...new Set(
  [...gallery, ...siteImages]
    .map((r) => r.file_key)
    .filter((k) => k && !k.startsWith("/assets/") && !k.startsWith("assets/") && IMG_EXT.test(k))
)];

console.log(`대상 이미지 ${keys.length}개 · 모드: ${APPLY ? "적용(--apply)" : "미리보기"}`);
if (APPLY) mkdirSync(BACKUP_DIR, { recursive: true });

let beforeTotal = 0, afterTotal = 0, changed = 0, skipped = 0, failed = 0;
for (const key of keys) {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const orig = Buffer.from(await obj.Body.transformToByteArray());
    beforeTotal += orig.length;

    const out = await sharp(orig)
      .rotate() // EXIF 회전 굽기
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    if (out.length >= orig.length * 0.95) {
      afterTotal += orig.length;
      skipped++;
      continue; // 5% 도 못 줄이면 원본 유지
    }

    if (APPLY) {
      writeFileSync(path.join(BACKUP_DIR, key.replace(/[\\/]/g, "__")), orig);
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: out, ContentType: "image/webp" }));
    }
    afterTotal += out.length;
    changed++;
    console.log(`${(orig.length / 1024).toFixed(0).padStart(5)} → ${(out.length / 1024).toFixed(0).padStart(4)} KB  ${key}`);
  } catch (e) {
    failed++;
    console.error(`실패: ${key} — ${e.message}`);
  }
}
console.log(`\n합계: ${(beforeTotal / 1024 / 1024).toFixed(1)} MB → ${(afterTotal / 1024 / 1024).toFixed(1)} MB · 압축 ${changed} / 유지 ${skipped} / 실패 ${failed}`);
if (!APPLY) console.log("(미리보기 — 실제 적용은 --apply)");
