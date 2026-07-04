"use client";

import { useState } from "react";

export function CopyPhone({ name, phone }: { name: string; phone: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(phone).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="mt-4 w-full rounded-2xl bg-blue-tint py-3.5 text-[19px] font-extrabold tracking-wide text-blue"
    >
      <span className="block text-[11px] font-semibold tracking-normal text-[#7FA8E8]">
        {name}님 연락처 · 탭하여 복사
      </span>
      {copied ? "복사했어요 📋" : phone}
    </button>
  );
}
