// ============================================================
//  테마 프리셋 + 섹션(레이아웃) 기본값
//  관리자 페이지에서 색상·폰트 테마와 섹션 순서/표시를 고릅니다.
// ============================================================

/** 색상 토큰 한 세트 */
export type ColorTokens = {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  accentSoft: string;
  line: string;
  card: string;
  tint: string;
};

export type ThemePreset = {
  id: string;
  label: string;
  colors: ColorTokens;
  /** 제목용 폰트 CSS 변수 (layout.tsx 에서 로드한 next/font 변수) */
  titleFontVar: string;
  /** 본문용 폰트 CSS 변수 */
  bodyFontVar: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "classic",
    label: "클래식 베이지",
    titleFontVar: "--font-myeongjo",
    bodyFontVar: "--font-batang",
    colors: {
      background: "#faf7f2",
      foreground: "#45403a",
      muted: "#968d81",
      accent: "#b1936f",
      accentSoft: "#c9b49a",
      line: "#ece5d9",
      card: "#ffffff",
      tint: "#f3ede2",
    },
  },
  {
    id: "modern",
    label: "모던 그레이",
    titleFontVar: "--font-noto",
    bodyFontVar: "--font-dodum",
    colors: {
      background: "#f6f6f4",
      foreground: "#33373b",
      muted: "#8b8f95",
      accent: "#6b7280",
      accentSoft: "#b4bcc4",
      line: "#e6e7e9",
      card: "#ffffff",
      tint: "#eef0f1",
    },
  },
  {
    id: "romantic",
    label: "로맨틱 로즈",
    titleFontVar: "--font-myeongjo",
    bodyFontVar: "--font-noto",
    colors: {
      background: "#fdf6f4",
      foreground: "#4a3b3b",
      muted: "#a78a8a",
      accent: "#c08577",
      accentSoft: "#e0b6ad",
      line: "#f0e2de",
      card: "#ffffff",
      tint: "#f8ebe7",
    },
  },
];

export const DEFAULT_THEME_ID = "classic";

export function getTheme(id: string | undefined): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
}

/** 테마를 :root CSS 변수 문자열로 변환 (페이지에 인라인 <style> 로 주입) */
export function themeToCss(theme: ThemePreset): string {
  const c = theme.colors;
  return `:root{--background:${c.background};--foreground:${c.foreground};--muted:${c.muted};--accent:${c.accent};--accent-soft:${c.accentSoft};--line:${c.line};--card:${c.card};--tint:${c.tint};--font-title:var(${theme.titleFontVar});--font-body:var(${theme.bodyFontVar});}`;
}

// ── 섹션(레이아웃) ───────────────────────────────────────────
/** 커버 아래에 오는, 순서·표시를 바꿀 수 있는 섹션들 */
export type SectionId =
  | "greeting"
  | "couple"
  | "gallery"
  | "timeline"
  | "event"
  | "location"
  | "accounts"
  | "rsvp"
  | "guestbook"
  | "guestsnap"
  | "share";

export type SectionConfig = { id: SectionId; visible: boolean };

export const SECTION_LABELS: Record<SectionId, string> = {
  greeting: "인사말",
  couple: "신랑·신부 소개",
  gallery: "갤러리",
  timeline: "함께한 시간",
  event: "예식 안내 / 카운트다운",
  location: "오시는 길",
  accounts: "마음 전하실 곳",
  rsvp: "참석 의사 (RSVP)",
  guestbook: "방명록",
  guestsnap: "게스트스냅",
  share: "공유 / 캘린더",
};

export const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: "greeting", visible: true },
  { id: "couple", visible: true },
  { id: "gallery", visible: true },
  { id: "timeline", visible: true },
  { id: "event", visible: true },
  { id: "location", visible: true },
  { id: "accounts", visible: true },
  { id: "rsvp", visible: true },
  { id: "guestbook", visible: true },
  { id: "guestsnap", visible: true },
  { id: "share", visible: true },
];

/** 저장된 섹션 설정을 기본값과 병합 (새 섹션 추가/삭제에도 안전) */
export function normalizeSections(
  saved: SectionConfig[] | undefined
): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_SECTIONS;
  const valid = saved.filter((s) =>
    DEFAULT_SECTIONS.some((d) => d.id === s.id)
  );
  // 저장본에 빠진 섹션은 뒤에 보충
  const missing = DEFAULT_SECTIONS.filter(
    (d) => !valid.some((s) => s.id === d.id)
  );
  return [...valid, ...missing];
}
