import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 정적 청첩장(public/invite.html)을 루트(/)와 혼주용(/honju)에서 서빙.
  // /api/*, /admin 은 Next 가 그대로 처리.
  async rewrites() {
    return [
      { source: "/", destination: "/invite.html" },
      { source: "/honju", destination: "/invite.html" },
    ];
  },
};

export default nextConfig;
