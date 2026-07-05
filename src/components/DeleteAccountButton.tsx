"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

// 회원 탈퇴 — 확인 문구 입력 후 실행 (§7.10)
export function DeleteAccountButton() {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function withdraw() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/me", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      return setError(data.error ?? "탈퇴 처리에 실패했어요");
    }
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-sub">
        계속하려면 <b className="text-thread">탈퇴합니다</b>를 입력해 주세요.
      </p>
      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="탈퇴합니다"
        className="w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-base outline-none focus:border-thread"
      />
      {error && <p className="mt-2 text-sm font-semibold text-thread">{error}</p>}
      <button
        onClick={withdraw}
        disabled={loading || confirmText.trim() !== "탈퇴합니다"}
        className="mt-4 w-full rounded-2xl bg-thread py-4 text-base font-extrabold text-white disabled:opacity-30"
      >
        {loading ? "처리 중..." : "탈퇴하기"}
      </button>
    </div>
  );
}
