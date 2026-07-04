"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

export function InviteCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = `다리 🧵 — 지인의 지인, 어쩌면 인연\n내 추천코드: ${code}\n${window.location.origin}/signup`;
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue to-[#5B9DF8] p-5 text-white">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[2.5px] border-dashed border-white/35" />
      <p className="text-[13px] font-bold opacity-85">내 추천코드</p>
      <p className="mb-4 mt-1 text-[27px] font-extrabold tracking-wider">{code}</p>
      <button
        onClick={share}
        className="rounded-xl bg-white px-4.5 py-3 text-sm font-extrabold text-blue"
      >
        {copied ? "복사했어요 💌" : "초대장 공유하기"}
      </button>
    </div>
  );
}

export function NamePathToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);

  async function toggle() {
    const next = !on;
    setOn(next);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowNameInPath: next }),
    });
  }

  return (
    <button onClick={toggle} className="flex w-full items-center justify-between border-b border-line px-4.5 py-4 text-[15px] font-semibold">
      관계 경로에 내 이름 표시
      <span className={`relative h-[26px] w-11 rounded-full transition-colors ${on ? "bg-blue" : "bg-line"}`}>
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all ${on ? "right-[3px]" : "left-[3px]"}`}
        />
      </span>
    </button>
  );
}

export function MenuLinks() {
  return (
    <>
      <Link href="/me/profile" className="flex w-full items-center justify-between border-b border-line px-4.5 py-4 text-[15px] font-semibold">
        내 소개팅 프로필 <span className="text-[#CFC6B6]">›</span>
      </Link>
      <Link href="/deck" className="flex w-full items-center justify-between border-b border-line px-4.5 py-4 text-[15px] font-semibold">
        내 카드덱 <span className="text-[#CFC6B6]">›</span>
      </Link>
      <Link href="/notifications" className="flex w-full items-center justify-between border-b border-line px-4.5 py-4 text-[15px] font-semibold">
        알림 <span className="text-[#CFC6B6]">›</span>
      </Link>
    </>
  );
}

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex w-full items-center justify-between px-4.5 py-4 text-[15px] font-semibold text-sub"
    >
      로그아웃
    </button>
  );
}
