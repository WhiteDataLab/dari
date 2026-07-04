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

export type CtaMode =
  | "send" // 호감 보내기 (여성 대상이면 "내 프로필 보내기")
  | "waiting" // 내가 보냄, 상대 응답 대기
  | "respond" // 받은 호감 수락/거절
  | "final" // 사진 공개 후 최종 결정 (남성)
  | "matched"
  | "none";

export function LikeCta({
  mode,
  toProfileId,
  likeId,
  targetLocked,
}: {
  mode: CtaMode;
  toProfileId: string;
  likeId?: string;
  targetLocked?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function send() {
    setLoading(true);
    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toProfileId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "실패했어요");
      if (data.needProfile) setTimeout(() => router.push("/me/profile"), 1200);
      return;
    }
    setMessage("프로필을 보냈어요! 🧵");
    router.refresh();
  }

  async function respond(action: "accept" | "reject", reason?: string) {
    if (!likeId) return;
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
      setMessage("매칭 성사! 성사 탭에서 번호를 확인하세요 🎉");
      setTimeout(() => router.push("/matches"), 1200);
    } else if (data.status === "PHOTO_GRANTED") {
      setMessage("수락했어요. 사진이 공개됐어요 📸");
      router.refresh();
    } else {
      setMessage("사유와 함께 정중히 전달했어요");
      setTimeout(() => router.push("/home"), 1200);
    }
  }

  const primary =
    "w-full rounded-2xl bg-blue py-[17px] text-base font-extrabold text-white shadow-[0_6px_16px_rgba(49,130,246,0.3)] active:scale-[0.98] disabled:opacity-40";
  const ghost =
    "rounded-2xl border-[1.5px] border-line bg-white py-[17px] text-base font-extrabold text-sub active:scale-[0.98]";

  return (
    <>
      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 bg-gradient-to-t from-ivory from-65% to-transparent px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-6">
        {message && (
          <p className="mb-2 rounded-full bg-[#2A2925] px-5 py-2.5 text-center text-[13px] font-bold text-white">
            {message}
          </p>
        )}
        {mode === "send" && (
          <>
            <button onClick={send} disabled={loading} className={primary}>
              {targetLocked ? "📮 내 프로필 보내기" : "💚 호감 보내기"}
            </button>
            {targetLocked && (
              <p className="mt-2 text-center text-[11.5px] font-semibold text-sub">
                상대가 수락하면 사진이 공개되고, 최종 결정은 내가 해요
              </p>
            )}
          </>
        )}
        {mode === "waiting" && (
          <button disabled className="w-full rounded-2xl bg-grn py-[17px] text-base font-extrabold text-white opacity-90">
            전달했어요 · 상대 응답 대기 중
          </button>
        )}
        {(mode === "respond" || mode === "final") && (
          <>
            <div className="flex gap-2">
              <button onClick={() => setSheetOpen(true)} disabled={loading} className={`${ghost} basis-[36%]`}>
                거절
              </button>
              <button onClick={() => respond("accept")} disabled={loading} className={primary}>
                {mode === "final" ? "최종 수락 💚" : "수락하기 💚"}
              </button>
            </div>
            {mode === "final" && (
              <p className="mt-2 text-center text-[11.5px] font-semibold text-sub">
                ⏳ 결정은 당당하게, 대신 빠르게 (48시간)
              </p>
            )}
          </>
        )}
        {mode === "matched" && (
          <button disabled className="w-full rounded-2xl bg-grn py-[17px] text-base font-extrabold text-white">
            성사된 인연이에요 🎉
          </button>
        )}
      </div>

      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-[rgba(28,27,24,0.4)]"
            onClick={() => setSheetOpen(false)}
          />
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
