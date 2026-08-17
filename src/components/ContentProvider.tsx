"use client";

import { createContext, useContext } from "react";
import { site as defaultSite, type Site } from "@/config/site.config";

const SiteContext = createContext<Site>(defaultSite);

/**
 * 서버에서 병합한 콘텐츠(site)를 클라이언트 컴포넌트로 전달한다.
 * Provider 바깥에서 useSiteContent() 를 부르면 정적 기본값을 돌려준다.
 */
export function ContentProvider({
  value,
  children,
}: {
  value: Site;
  children: React.ReactNode;
}) {
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

/** 섹션 컴포넌트에서 `const site = useSiteContent();` 로 사용 */
export function useSiteContent(): Site {
  return useContext(SiteContext);
}
