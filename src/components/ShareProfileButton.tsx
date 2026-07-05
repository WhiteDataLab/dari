"use client";

import { useState } from "react";

// 카드덱 프로필 공유 — 사진 포함 여부를 선택해 각각 다른 링크 발급 (§7.7)
// 모바일은 공유 시트(카카오톡 포함), 데스크톱은 링크 복사
export function ShareProfileButton({
  profileId,
  nickname,
}: {
  profileId: string;
  nickname: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function share(withPhotos: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share", photos: withPhotos }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "공유 링크를 만들지 못했어요");
        return;
      }
      const url = `${location.origin}/s/${data.token}`;
      setOpen(false);
      if (navigator.share) {
        await navigator
          .share({ title: "다리 — 소개팅 프로필", text: `${nickname}님을 소개해요 🧵`, url })
          .catch(() => {}); // 사용자가 공유 시트를 닫은 경우
      } else {
        await navigator.clipboard.writeText(url);
        setMsg(withPhotos ? "사진 포함 링크를 복사했어요 📋" : "프로필만 보이는 링크를 복사했어요 📋");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="flex h-10 items-center gap-1 rounded-full bg-white px-4 text-sm font-bold text-sub shadow-[0_2px_12px_rgba(28,27,24,0.06)] disabled:opacity-50"
      >
        📤 공유
      </button>
      {open && (
        <span className="absolute right-0 top-11 z-20 w-60 rounded-2xl bg-white p-2 shadow-[0_8px_30px_rgba(28,27,24,0.18)]">
          <button
            onClick={() => share(false)}
            disabled={busy}
            className="block w-full rounded-xl px-3 py-3 text-left text-[13.5px] font-bold active:bg-ivory"
          >
            🔒 프로필만 공유
            <span className="block text-[11px] font-medium text-sub">사진은 비공개로 소개해요</span>
          </button>
          <button
            onClick={() => share(true)}
            disabled={busy}
            className="block w-full rounded-xl px-3 py-3 text-left text-[13.5px] font-bold active:bg-ivory"
          >
            📷 사진 포함 공유
            <span className="block text-[11px] font-medium text-sub">
              링크를 받은 누구나 사진을 볼 수 있어요
            </span>
          </button>
        </span>
      )}
      {msg && (
        <span className="absolute right-0 top-11 z-10 w-56 rounded-xl bg-[#1C1B18]/90 px-3 py-2 text-xs font-semibold text-white">
          {msg}
        </span>
      )}
    </span>
  );
}
