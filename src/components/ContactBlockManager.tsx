"use client";

import { useEffect, useState } from "react";

type Block = { id: string; label: string | null };

export function ContactBlockManager() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/contact-blocks")
      .then((r) => r.json())
      .then((d) => setBlocks(d.blocks ?? []))
      .catch(() => {});
  }, []);

  async function add() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/contact-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "등록에 실패했어요");
    setBlocks((prev) =>
      prev.some((b) => b.id === data.block.id) ? prev : [data.block, ...prev],
    );
    setPhone("");
  }

  async function remove(id: string) {
    await fetch(`/api/contact-blocks?id=${id}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          className="w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-base outline-none focus:border-blue"
        />
        <button
          onClick={add}
          disabled={loading || !phone}
          className="flex-shrink-0 rounded-2xl bg-blue px-5 text-sm font-extrabold text-white disabled:opacity-40"
        >
          추가
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-thread">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        {blocks.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-sub">
            아직 등록한 번호가 없어요
          </p>
        )}
        {blocks.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between border-b border-line px-4.5 py-3.5 text-[15px] font-bold last:border-0"
          >
            {b.label ?? "번호"}
            <button onClick={() => remove(b.id)} className="text-sm font-semibold text-sub">
              해제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AvoidCompanyToggle({
  profileId,
  initial,
}: {
  profileId: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);

  async function toggle() {
    const next = !on;
    setOn(next);
    await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "avoidCompany", value: next }),
    });
  }

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-[20px] bg-white px-4.5 py-4 text-[15px] font-semibold shadow-[0_2px_12px_rgba(28,27,24,0.06)]"
    >
      같은 회사 사람과 서로 안 보이기
      <span className={`relative h-[26px] w-11 rounded-full transition-colors ${on ? "bg-blue" : "bg-line"}`}>
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all ${on ? "right-[3px]" : "left-[3px]"}`}
        />
      </span>
    </button>
  );
}
