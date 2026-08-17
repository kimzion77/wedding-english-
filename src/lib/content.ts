// ============================================================
//  런타임 콘텐츠 로더
//  - 기본값: src/config/site.config.ts
//  - 덮어쓰기: Supabase `site_settings` 테이블(단일 행, jsonb)
//  관리자 페이지에서 저장한 값이 있으면 기본값 위에 깊은 병합된다.
// ============================================================
import { site as defaultSite, type Site } from "@/config/site.config";
import {
  DEFAULT_THEME_ID,
  normalizeSections,
  type SectionConfig,
} from "@/config/theme";
import { getServerSupabase } from "@/lib/supabase";

export const SETTINGS_TABLE = "site_settings";
export const SETTINGS_ROW_ID = 1;

/** 깊은 부분 타입 (배열은 통째로 교체) */
type DeepPartial<T> = T extends (infer U)[]
  ? U[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type StoredSettings = {
  content?: DeepPartial<Site>;
  themeId?: string;
  sections?: SectionConfig[];
};

export type ResolvedSettings = {
  content: Site;
  themeId: string;
  sections: SectionConfig[];
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.prototype.toString.call(v) === "[object Object]"
  );
}

/** base 위에 override 를 깊은 병합. 배열·원시값은 override 가 통째로 이긴다. */
export function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base;
  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
      out[key] = deepMerge(
        (base as Record<string, unknown>)[key],
        override[key]
      );
    }
    return out as T;
  }
  return override as T;
}

/** Supabase 에서 저장된 설정을 읽어와 기본값과 병합한 결과를 돌려준다. */
export async function getResolvedSettings(): Promise<ResolvedSettings> {
  const fallback: ResolvedSettings = {
    content: defaultSite,
    themeId: DEFAULT_THEME_ID,
    sections: normalizeSections(undefined),
  };

  const supabase = getServerSupabase();
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("data")
      .eq("id", SETTINGS_ROW_ID)
      .maybeSingle();

    if (error || !data?.data) return fallback;

    const stored = data.data as StoredSettings;
    return {
      content: deepMerge(defaultSite, stored.content ?? {}),
      themeId: stored.themeId ?? DEFAULT_THEME_ID,
      sections: normalizeSections(stored.sections),
    };
  } catch {
    return fallback;
  }
}

/** 저장: 부분 설정을 기존 저장본과 병합하여 1행 upsert */
export async function saveStoredSettings(
  patch: StoredSettings
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServerSupabase();
  if (!supabase)
    return { ok: false, error: "서버에 Supabase가 설정되지 않았습니다." };

  // 기존 저장본을 읽어 병합 (content 는 깊은 병합, theme/sections 는 교체)
  const { data: existing } = await supabase
    .from(SETTINGS_TABLE)
    .select("data")
    .eq("id", SETTINGS_ROW_ID)
    .maybeSingle();

  const prev = (existing?.data as StoredSettings) ?? {};
  const next: StoredSettings = {
    content: deepMerge(prev.content ?? {}, patch.content ?? {}),
    themeId: patch.themeId ?? prev.themeId ?? DEFAULT_THEME_ID,
    sections: patch.sections ?? prev.sections,
  };

  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ id: SETTINGS_ROW_ID, data: next, updated_at: new Date().toISOString() });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
