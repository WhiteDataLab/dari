"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type DeckCardData = {
  id: string;
  name: string; // 닉네임 (성사 전 실명 비공개)
  age: number;
  area: string;
  job: string;
  comment: string | null;
  degree: number | null;
};

// 탐색 피드 카드덱 (§9.0 v1.5) — 전부 뒷면으로 놓이고, 탭하면 카드를 뽑듯 뒤집혀 프로필이 나타난다.
// 사진은 성별 무관 비공개 — 뒤집어도 텍스트 프로필만 보인다.
export function CardDeck({ cards }: { cards: DeckCardData[] }) {
  const router = useRouter();
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c, i) => {
        const isFlipped = !!flipped[c.id];
        return (
          <button
            key={c.id}
            onClick={() => {
              if (isFlipped) router.push(`/p/${c.id}`);
              else setFlipped((prev) => ({ ...prev, [c.id]: true }));
            }}
            className="text-left [perspective:1200px]"
            aria-label={isFlipped ? `${c.name} 프로필 보기` : "카드 뽑기"}
          >
            <div
              className={`relative aspect-[4/5.4] w-full transition-transform duration-[650ms] [transform-style:preserve-3d] ${
                isFlipped ? "[transform:rotateY(180deg)]" : ""
              }`}
            >
              {/* 뒷면 — 카드덱 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-[20px] border-[3px] border-[#3A362E] bg-gradient-to-br from-[#2A2925] via-[#3A362E] to-[#211F1B] shadow-[0_4px_16px_rgba(28,27,24,0.25)] [backface-visibility:hidden]">
                <div className="absolute inset-2.5 rounded-[14px] border-[1.5px] border-dashed border-white/15" />
                <span
                  className="text-[42px]"
                  style={{ transform: `rotate(${(i % 3) * 8 - 8}deg)` }}
                >
                  🧵
                </span>
                <span className="logo-thread text-lg font-extrabold text-white/90">다리</span>
                <span className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-[10.5px] font-bold text-white/70">
                  탭해서 카드 뽑기
                </span>
              </div>

              {/* 앞면 — 텍스트 프로필 (사진 없음) */}
              <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[20px] bg-white p-3.5 shadow-[0_4px_16px_rgba(28,27,24,0.12)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                {c.degree && (
                  <span className="mb-1.5 self-start rounded-full bg-thread-soft px-2 py-0.5 text-[11px] font-bold text-thread">
                    🧵 {c.degree}다리
                  </span>
                )}
                <p className="text-[17px] font-extrabold leading-tight">
                  {c.name}
                  <span className="ml-1 text-[13px] font-semibold text-sub">{c.age}</span>
                </p>
                <p className="mt-1 text-xs text-sub">
                  {c.area} · {c.job}
                </p>
                {c.comment && (
                  <p className="mt-2 flex-1 overflow-hidden rounded-lg bg-ivory px-2 py-1.5 text-xs leading-relaxed text-[#6E6759] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
                    &ldquo;{c.comment}&rdquo;
                  </p>
                )}
                <p className="mt-2 text-right text-[11.5px] font-extrabold text-blue">
                  프로필 전체 보기 ›
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
