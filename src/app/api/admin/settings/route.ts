import { NextResponse } from "next/server";
import { isAdminKey } from "@/lib/admin";
import {
  getResolvedSettings,
  saveStoredSettings,
  type StoredSettings,
} from "@/lib/content";

export const dynamic = "force-dynamic";

/** 현재 병합된 콘텐츠/테마/레이아웃을 관리자에게 반환 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!isAdminKey(key)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resolved = await getResolvedSettings();
  return NextResponse.json(resolved);
}

/** 부분 설정 저장 (content 는 깊은 병합, themeId/sections 는 교체) */
export async function POST(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!isAdminKey(key)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: StoredSettings;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await saveStoredSettings(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "저장에 실패했습니다." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
