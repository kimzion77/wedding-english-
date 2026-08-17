import type { Metadata } from "next";
import "./globals.css";

// 청첩장 본문은 정적 public/invite.html 이 담당(자체 폰트·메타 포함).
// 이 레이아웃은 /admin 등 Next 페이지에만 적용된다.
export const metadata: Metadata = {
  title: "Woo Seonggyu ♥ Kim Jieun — Admin",
  description: "Mobile wedding invitation admin",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Nanum+Myeongjo:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
