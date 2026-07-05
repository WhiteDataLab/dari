"use client";

import { useState } from "react";

const REASONS = [
  ["OBSCENE", "음란성"],
  ["AD_SPAM", "광고·스팸"],
  ["ILLEGAL", "불법 (도박·성매매 등)"],
  ["FAKE_INFO", "허위 정보"],
  ["NO_CONSENT", "당사자 미동의 등록"],
  ["CONTACT_LEAK", "연락처·SNS 노출"],
  ["ETC", "기타"],
] as const;

// 프로필 신고 (스펙 §12.1) — 사유 선택 후 접수, 3건 누적 시 자동 임시 숨김
export function ReportButton({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason) return;
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, reason }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setMsg(data.error ?? "신고 접수에 실패했어요");
    setDone(true);
  }

  if (done) {
    return (
      <p className="mx-6 mt-8 pb-4 text-center text-[13px] font-semibold text-sub">
        🚨 신고가 접수됐어요. 빠르게 검토할게요.
      </p>
    );
  }

  return (
    <div className="mx-6 mt-8 pb-4 text-center">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-[13px] font-semibold text-[#B4AB9B]">
          🚨 이 프로필 신고하기
        </button>
      ) : (
        <div className="rounded-2xl bg-white p-4 text-left shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
          <p className="mb-2.5 text-sm font-extrabold">신고 사유를 골라 주세요</p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map(([v, l]) => (
              <button
                key={v}
                onClick={() => setReason(v)}
                className={`rounded-full border px-3 py-2 text-[13px] font-semibold ${
                  reason === v ? "border-thread bg-thread-soft text-thread" : "border-line bg-white text-sub"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {msg && <p className="mt-2.5 text-sm font-semibold text-thread">{msg}</p>}
          <div className="mt-3.5 flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border border-line py-3 text-sm font-bold text-sub"
            >
              취소
            </button>
            <button
              onClick={submit}
              disabled={loading || !reason}
              className="flex-1 rounded-xl bg-thread py-3 text-sm font-extrabold text-white disabled:opacity-40"
            >
              {loading ? "접수 중..." : "신고 접수"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
