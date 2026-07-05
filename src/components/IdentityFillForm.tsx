"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 지인의 지인 프로필 — 다리 역할 지인이 당사자 이름·연락처를 최초 입력 (§7.9)
export function IdentityFillForm({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (!name.trim() || !phone) return setError("이름과 연락처를 채워 주세요");
    if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone)) return setError("연락처 형식을 확인해 주세요");
    if (!consent) return setError("당사자 동의 확인이 필요해요");
    setLoading(true);
    setError("");
    const res = await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fillIdentity", name, phone, consentConfirmed: consent }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "저장에 실패했어요");
    setDone(true);
  }

  const input =
    "w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-base outline-none focus:border-blue";

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        <p className="text-3xl">🎉</p>
        <p className="mt-2 font-extrabold">입력 완료!</p>
        <p className="mt-1 text-sm text-sub">이제 이 프로필이 탐색에 공개될 수 있어요.</p>
        <button
          onClick={() => router.push("/home")}
          className="mt-4 w-full rounded-2xl bg-blue py-3.5 text-sm font-extrabold text-white"
        >
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="pb-2 pt-4 text-sm font-extrabold">당사자 이름</p>
      <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
      <p className="pb-2 pt-4 text-sm font-extrabold">
        당사자 연락처 <span className="font-medium text-sub">(성사 전까지 비공개)</span>
      </p>
      <input
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="010-0000-0000"
        className={input}
      />
      <label className="mt-5 flex items-start gap-3 rounded-2xl bg-yellow-tint p-4 text-sm font-semibold text-[#6B5B1E]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-[#3182F6]"
        />
        ⚠️ 당사자에게 등록 동의를 받았습니다 (필수)
      </label>
      {error && <p className="mt-3 text-sm font-semibold text-thread">{error}</p>}
      <button
        onClick={submit}
        disabled={loading}
        className="mt-5 w-full rounded-2xl bg-blue py-4 text-base font-extrabold text-white disabled:opacity-40"
      >
        {loading ? "저장 중..." : "입력 완료"}
      </button>
      <p className="mt-2 text-center text-xs text-sub">
        이름·연락처는 도용 방지를 위해 입력 후 바꿀 수 없어요
      </p>
    </div>
  );
}
