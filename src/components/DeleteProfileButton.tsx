"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 카드 삭제 (§7.11) — 잘못 등록했거나 지인이 다른 곳에서 커플이 된 경우 정리
export function DeleteProfileButton({
  profileId,
  isSelf,
}: {
  profileId: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "삭제하지 못했어요");
      return;
    }
    router.replace(isSelf ? "/me" : "/deck");
    router.refresh();
  }

  return (
    <span className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          setError("");
        }}
        disabled={busy}
        className="flex h-10 items-center gap-1 rounded-full bg-white px-4 text-sm font-bold text-thread shadow-[0_2px_12px_rgba(28,27,24,0.06)] disabled:opacity-50"
      >
        🗑 삭제
      </button>
      {open && (
        <span className="absolute right-0 top-11 z-20 w-64 rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(28,27,24,0.18)]">
          <p className="px-1 text-[13px] font-bold leading-relaxed">
            이 카드를 완전히 삭제해요.
            <span className="mt-1 block text-[11.5px] font-medium text-sub">
              사진과 주고받은 호감 기록도 함께 사라지고, 되돌릴 수 없어요.
            </span>
          </p>
          {error && (
            <p className="mt-2 px-1 text-[12px] font-semibold text-thread">{error}</p>
          )}
          <span className="mt-2.5 flex gap-2">
            <button
              onClick={() => setOpen(false)}
              disabled={busy}
              className="flex-1 rounded-xl border border-line py-2.5 text-[13px] font-bold text-sub"
            >
              취소
            </button>
            <button
              onClick={remove}
              disabled={busy}
              className="flex-1 rounded-xl bg-thread py-2.5 text-[13px] font-extrabold text-white disabled:opacity-50"
            >
              {busy ? "삭제 중..." : "삭제하기"}
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
