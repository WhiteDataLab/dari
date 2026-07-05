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
  gender: "MALE" | "FEMALE";
  hasPhotos: boolean;
};

// 성별 카드 뒷면 색상 — 남성 파랑 계열 / 여성 분홍 계열 (§9.0 v1.5)
const BACK_STYLE = {
  MALE: {
    bg: "bg-gradient-to-br from-[#2C4E80] via-[#3B6BAD] to-[#1D3557]",
    border: "border-[#3B6BAD]",
  },
  FEMALE: {
    bg: "bg-gradient-to-br from-[#B85C79] via-[#D67F9D] to-[#8E3B58]",
    border: "border-[#D67F9D]",
  },
} as const;

// 탐색 피드 카드덱 (§9.0 v1.5) — 전부 뒷면으로 놓이고, 탭하면 카드를 뽑듯 뒤집혀 프로필이 나타난다.
// 사진은 성별 무관 비공개 — 뒤집어도 텍스트 프로필만 보인다.
export function CardDeck({ cards }: { cards: DeckCardData[] }) {
  const router = useRouter();
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c, i) => {
        const isFlipped = !!flipped[c.id];
        const back = BACK_STYLE[c.gender];
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
              {/* 뒷면 — 성별 색상 카드 (남 파랑 / 여 분홍) */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-[20px] border-[3px] ${back.border} ${back.bg} shadow-[0_4px_16px_rgba(28,27,24,0.25)] [backface-visibility:hidden]`}
              >
                <div className="absolute inset-2.5 rounded-[14px] border-[1.5px] border-dashed border-white/20" />
                <span
                  className="text-[46px]"
                  style={{ transform: `rotate(${(i % 3) * 8 - 8}deg)` }}
                >
                  🃏
                </span>
                <span className="absolute bottom-4 rounded-full bg-white/15 px-3 py-1 text-[10.5px] font-bold text-white/80">
                  탭해서 카드 뽑기
                </span>
              </div>

              {/* 앞면 — 텍스트 프로필 (사진 없음) */}
              <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[20px] bg-white p-3.5 shadow-[0_4px_16px_rgba(28,27,24,0.12)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="mb-1.5 flex items-center gap-1">
                  {c.degree && (
                    <span className="rounded-full bg-thread-soft px-2 py-0.5 text-[11px] font-bold text-thread">
                      🧵 {c.degree}다리
                    </span>
                  )}
                  {!c.hasPhotos && (
                    <span className="rounded-full bg-[#F1EDE6] px-2 py-0.5 text-[10px] font-bold text-sub">
                      📷 사진 미등록
                    </span>
                  )}
                </div>
                <p className="text-[17px] font-extrabold leading-tight">
                  {c.gender === "MALE" ? "🙋‍♂️" : "🙋‍♀️"} {c.name}
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
