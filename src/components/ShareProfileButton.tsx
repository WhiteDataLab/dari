"use client";

import { useState } from "react";

// 카드덱 프로필 공유 — 공유 토큰 발급 후 모바일 공유 시트(카카오톡 포함) 또는 링크 복사
export function ShareProfileButton({
  profileId,
  nickname,
}: {
  profileId: string;
  nickname: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function share() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "공유 링크를 만들지 못했어요");
        return;
      }
      const url = `${location.origin}/s/${data.token}`;
      if (navigator.share) {
        await navigator
          .share({ title: "다리 — 소개팅 프로필", text: `${nickname}님을 소개해요 🧵`, url })
          .catch(() => {}); // 사용자가 공유 시트를 닫은 경우
      } else {
        await navigator.clipboard.writeText(url);
        setMsg("링크를 복사했어요! 카카오톡에 붙여넣어 주세요 📋");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="relative">
      <button
        onClick={share}
        disabled={busy}
        className="flex h-10 items-center gap-1 rounded-full bg-white px-4 text-sm font-bold text-sub shadow-[0_2px_12px_rgba(28,27,24,0.06)] disabled:opacity-50"
      >
        📤 공유
      </button>
      {msg && (
        <span className="absolute right-0 top-11 z-10 w-56 rounded-xl bg-[#1C1B18]/90 px-3 py-2 text-xs font-semibold text-white">
          {msg}
        </span>
      )}
    </span>
  );
}
