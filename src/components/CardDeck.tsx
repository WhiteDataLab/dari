"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodiacOf } from "@/lib/zodiac";

export type DeckCardData = {
  id: string;
  name: string; // 닉네임 (성사 전 실명 비공개)
  age: number;
  birthYear: number;
  area: string;
  job: string;
  comment: string | null;
  degree: number | null;
  gender: "MALE" | "FEMALE";
  hasPhotos: boolean;
  isNew: boolean; // 아직 열람하지 않은 카드
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

function Card({ c, index }: { c: DeckCardData; index: number }) {
  const router = useRouter();
  const [isFlipped, setIsFlipped] = useState(false);
  const back = BACK_STYLE[c.gender];
  const zodiac = zodiacOf(c.birthYear);

  function onTap() {
    if (isFlipped) {
      router.push(`/p/${c.id}`);
      return;
    }
    setIsFlipped(true);
    // 열람 기록 (NEW 마크 해제용) — 실패해도 UX에는 영향 없음
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: c.id }),
    }).catch(() => {});
  }

  return (
    <button
      onClick={onTap}
      className="text-left [perspective:1200px]"
      aria-label={isFlipped ? `${c.name} 프로필 보기` : "카드 뽑기"}
    >
      <div
        className={`relative aspect-[4/5.4] w-full transition-transform duration-[650ms] [transform-style:preserve-3d] ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* 뒷면 — 12간지 띠 + 성별 색상 (남 파랑 / 여 분홍) */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[20px] border-[3px] ${back.border} ${back.bg} shadow-[0_4px_16px_rgba(28,27,24,0.25)] [backface-visibility:hidden]`}
        >
          <div className="absolute inset-2.5 rounded-[14px] border-[1.5px] border-dashed border-white/20" />
          {c.isNew && (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-thread px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white shadow">
              NEW
            </span>
          )}
          <span
            className="text-[52px] drop-shadow-[0_3px_6px_rgba(0,0,0,0.3)]"
            style={{ transform: `rotate(${(index % 3) * 8 - 8}deg)` }}
          >
            {zodiac.emoji}
          </span>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11.5px] font-extrabold text-white">
            {zodiac.label}
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
            {c.area} · {c.job} · {zodiac.label}
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
}

// 탐색 피드 카드덱 (§9.0 v1.5) — 새 카드(NEW)와 이미 뽑아본 카드를 나눠 배치
export function CardDeck({ cards }: { cards: DeckCardData[] }) {
  const newCards = cards.filter((c) => c.isNew);
  const seenCards = cards.filter((c) => !c.isNew);
  const showSections = newCards.length > 0 && seenCards.length > 0;

  return (
    <div>
      {showSections && (
        <h2 className="mb-2 text-sm font-extrabold text-sub">
          🆕 새로 올라온 카드 <span className="text-thread">{newCards.length}</span>
        </h2>
      )}
      {newCards.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {newCards.map((c, i) => (
            <Card key={c.id} c={c} index={i} />
          ))}
        </div>
      )}
      {showSections && (
        <h2 className="mb-2 mt-6 text-sm font-extrabold text-sub">이미 뽑아본 카드</h2>
      )}
      {seenCards.length > 0 && (
        <div className={`grid grid-cols-2 gap-3 ${!showSections ? "" : ""}`}>
          {seenCards.map((c, i) => (
            <Card key={c.id} c={c} index={i + newCards.length} />
          ))}
        </div>
      )}
    </div>
  );
}
