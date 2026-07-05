"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 관리자 신고 처리 — 기각 / 삭제 확정 (§12.1)
export function AdminReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "dismiss" | "remove") {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reportId, action }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "처리에 실패했어요");
    router.refresh();
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={() => act("dismiss")}
        disabled={loading}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-sub disabled:opacity-40"
      >
        기각 (오신고)
      </button>
      <button
        onClick={() => act("remove")}
        disabled={loading}
        className="rounded-lg bg-thread px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-40"
      >
        숨김 확정
      </button>
      {error && <span className="text-xs font-semibold text-thread">{error}</span>}
    </div>
  );
}
