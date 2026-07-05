"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// 전역 페이지 이동 인디케이터 — 서버 렌더링이 느릴 때 화면 가운데 말풍선으로 피드백.
// 내부 링크 클릭·뒤로가기를 감지해 250ms 이상 걸리면 표시하고, 경로가 바뀌면 숨긴다.
export function NavigationIndicator() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (delayRef.current) clearTimeout(delayRef.current);
    if (failsafeRef.current) clearTimeout(failsafeRef.current);
    delayRef.current = null;
    failsafeRef.current = null;
  }

  // 이동 완료(경로 변경) → 숨김
  useEffect(() => {
    clearTimers();
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    function show() {
      clearTimers();
      // 빠른 이동(캐시된 페이지)은 깜빡임 방지를 위해 250ms 뒤에만 표시
      delayRef.current = setTimeout(() => setVisible(true), 250);
      // 이동 실패·오프라인 대비 failsafe
      failsafeRef.current = setTimeout(() => setVisible(false), 15000);
    }

    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // 같은 화면/해시 이동은 제외
      show();
    }

    function onPopState() {
      show();
    }

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center">
      <div className="flex items-center gap-2.5 rounded-full bg-[#1C1B18]/85 px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        화면을 불러오는 중이에요…
      </div>
    </div>
  );
}
