import type { Metadata, Viewport } from "next";
import { NavigationIndicator } from "@/components/NavigationIndicator";
import "./globals.css";

export const metadata: Metadata = {
  title: "다리 — 지인의 지인, 어쩌면 인연",
  description: "지인 관계를 드러내는 소개팅. 모두 누군가의 지인이에요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <div className="mx-auto min-h-dvh max-w-[480px] bg-ivory shadow-[0_0_40px_rgba(0,0,0,0.08)]">
          {children}
        </div>
        <NavigationIndicator />
      </body>
    </html>
  );
}
