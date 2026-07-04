"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HideToggle({ profileId, hidden }: { profileId: string; hidden: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: hidden ? "show" : "hide" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="w-full rounded-2xl border border-line bg-white py-3.5 text-sm font-bold text-sub disabled:opacity-40"
    >
      {hidden ? "🔓 탐색에 다시 노출하기" : "🔒 탐색에서 잠시 숨기기"}
    </button>
  );
}
