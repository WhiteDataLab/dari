"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 역할 적응형 하단 탭바 — 덱에 카드가 있으면 5탭 (PAGE_IA §1)
export function TabBar({ hasDeck, likeBadge }: { hasDeck: boolean; likeBadge: number }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/home", icon: "🏠", label: "홈" },
    ...(hasDeck ? [{ href: "/deck", icon: "🃏", label: "카드덱" }] : []),
    { href: "/likes", icon: "💚", label: "호감", badge: likeBadge },
    { href: "/matches", icon: "🎉", label: "성사" },
    { href: "/me", icon: "👤", label: "MY" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white/90 px-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10.5px] font-bold ${
              active ? "text-blue" : "text-[#B4AB9B]"
            }`}
          >
            <span className={`text-[21px] ${active ? "" : "opacity-55 grayscale"}`}>{t.icon}</span>
            {t.label}
            {!!t.badge && (
              <span className="absolute right-[calc(50%-20px)] top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-thread px-1 text-[10px] font-extrabold text-white">
                {t.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
