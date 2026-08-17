/** 관리자 비밀번호 검증 (ADMIN_PASSWORD 환경변수와 비교) */
export function isAdminKey(key: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected && key === expected);
}
