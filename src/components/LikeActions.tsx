"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASONS = [
  ["NOT_READY", "지금은 연애 생각이 없어요"],
  ["NOT_MY_TYPE", "이상형과 조금 달랐어요"],
  ["KNOW_EACH_OTHER", "아는 사이라서요"],
  ["TOO_FAR", "거리가 멀어서요"],
  ["NO_REASON", "사유 없이 거절할게요"],
] as const;

// 호감함 리스트 안의 수락/거절 버튼 (받은 호감·최종 결정 공용)
export function LikeActions({ likeId, acceptLabel }: { likeId: string; acceptLabel: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function respond(action: "accept" | "reject", reason?: string) {
    setLoading(true);
    const res = await fetch(`/api/likes/${likeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json();
    setLoading(false);
    setSheetOpen(false);
    if (!res.ok) return setMessage(data.error ?? "실패했어요");
    if (data.status === "ACCEPTED") {
      setMessage("매칭 성사! 🎉");
      setTimeout(() => router.push("/matches"), 1000);
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <div className="mt-3.5 flex gap-2">
        <button
          onClick={() => setSheetOpen(true)}
          disabled={loading}
          className="flex-1 rounded-xl border border-line bg-ivory py-3 text-sm font-extrabold text-sub disabled:opacity-40"
        >
          거절하기
        </button>
        <button
          onClick={() => respond("accept")}
          disabled={loading}
          className="flex-1 rounded-xl bg-blue py-3 text-sm font-extrabold text-white disabled:opacity-40"
        >
          {acceptLabel}
        </button>
      </div>
      {message && <p className="mt-2 text-center text-[13px] font-bold text-thread">{message}</p>}

      {sheetOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-[rgba(28,27,24,0.4)]" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-1/2 z-[51] w-full max-w-[480px] -translate-x-1/2 rounded-t-3xl bg-white px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <h3 className="text-lg font-extrabold">정중하게 거절할게요</h3>
            <p className="mb-4 mt-1 text-[13.5px] text-sub">
              선택한 사유만 전달되고, 서로의 프로필은 더 이상 보이지 않아요.
            </p>
            {REASONS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => respond("reject", value)}
                disabled={loading}
                className="mb-2 block w-full rounded-2xl border-[1.5px] border-line px-4 py-[15px] text-left text-[15px] font-semibold active:border-blue active:bg-blue-tint active:text-blue"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
