"use client";

import { useEffect, useState } from "react";

type Block = { id: string; label: string };

// 특정 회사 피하기 — 회사명 등록 → 해당 회사 소속 프로필/회원과 상호 비노출
export function CompanyBlockManager() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/company-blocks")
      .then((r) => r.json())
      .then((d) => setBlocks(d.blocks ?? []))
      .catch(() => {});
  }, []);

  async function add() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/company-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "등록에 실패했어요");
    setBlocks((prev) =>
      prev.some((b) => b.id === data.block.id) ? prev : [data.block, ...prev],
    );
    setCompany("");
  }

  async function remove(id: string) {
    await fetch(`/api/company-blocks?id=${id}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="회사명 (예: 전 직장, 거래처)"
          className="w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-base outline-none focus:border-blue"
        />
        <button
          onClick={add}
          disabled={loading || !company.trim()}
          className="flex-shrink-0 rounded-2xl bg-blue px-5 text-sm font-extrabold text-white disabled:opacity-40"
        >
          추가
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-thread">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        {blocks.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-sub">아직 등록한 회사가 없어요</p>
        )}
        {blocks.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between border-b border-line px-4.5 py-3.5 text-[15px] font-bold last:border-0"
          >
            {b.label}
            <button onClick={() => remove(b.id)} className="text-sm font-semibold text-sub">
              해제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
