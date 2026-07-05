"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 클레임된 프로필의 당사자가 추천인 편집 권한 공유 여부를 결정하는 카드
export function ClaimEditDecision({
  profileId,
  ownerName,
}: {
  profileId: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<boolean | null>(null);

  async function decide(share: boolean) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "shareEdit", value: share }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "저장에 실패했어요");
    setDone(share);
    router.refresh();
  }

  if (done !== null) {
    return (
      <div className="rounded-2xl border-[1.5px] border-thread-soft bg-white p-5">
        <p className="text-sm font-bold">
          {done
            ? `🤝 ${ownerName}님과 함께 프로필을 관리해요`
            : `🔒 이제 프로필은 나만 수정할 수 있어요 (${ownerName}님은 열람만 가능해요)`}
        </p>
        <p className="mt-1 text-xs text-sub">MY &gt; 내 프로필에서 언제든 바꿀 수 있어요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-[1.5px] border-thread-soft bg-white p-5">
      <p className="text-[11px] font-extrabold tracking-wide text-thread">🔗 프로필 연결됨</p>
      <p className="mt-1.5 text-[15px] font-extrabold leading-snug">
        {ownerName}님이 등록해준 내 프로필이
        <br />이 계정과 연결됐어요!
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-sub">
        이제 프로필을 직접 수정할 수 있어요. {ownerName}님도 계속 수정할 수 있게 할까요?
      </p>
      <div className="mt-4 space-y-2">
        <button
          onClick={() => decide(true)}
          disabled={loading}
          className="w-full rounded-2xl bg-blue py-3.5 text-sm font-extrabold text-white disabled:opacity-40"
        >
          네, 같이 수정해요
        </button>
        <button
          onClick={() => decide(false)}
          disabled={loading}
          className="w-full rounded-2xl border border-line bg-white py-3.5 text-sm font-extrabold text-sub disabled:opacity-40"
        >
          나만 수정할래요 ({ownerName}님은 열람만)
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-thread">{error}</p>}
    </div>
  );
}
