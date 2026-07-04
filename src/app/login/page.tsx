"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "발송에 실패했어요");
    setStep("code");
  }

  async function login() {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, code, redirect: false });
    setLoading(false);
    if (result?.error) {
      return setError("코드가 올바르지 않거나 가입되지 않은 이메일이에요");
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <main className="px-6 py-10">
      <span className="logo-thread text-2xl font-extrabold">다리</span>
      <h1 className="mt-8 text-[22px] font-extrabold tracking-tight">다시 만나서 반가워요</h1>
      <p className="mt-1 text-sm text-sub">가입한 이메일로 로그인 코드를 보내드려요.</p>

      {step === "email" ? (
        <div className="mt-8 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="w-full rounded-2xl border border-line bg-white px-4 py-4 text-base outline-none focus:border-blue"
          />
          <button
            onClick={sendCode}
            disabled={loading || !email}
            className="w-full rounded-2xl bg-blue py-4 text-base font-extrabold text-white disabled:opacity-40"
          >
            {loading ? "보내는 중..." : "인증코드 받기"}
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <p className="text-sm font-semibold">{email} 로 코드를 보냈어요</p>
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6자리 코드"
            className="w-full rounded-2xl border border-line bg-white px-4 py-4 text-center text-2xl font-extrabold tracking-[8px] outline-none focus:border-blue"
          />
          <button
            onClick={login}
            disabled={loading || code.length !== 6}
            className="w-full rounded-2xl bg-blue py-4 text-base font-extrabold text-white disabled:opacity-40"
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
          <button onClick={() => setStep("email")} className="w-full py-2 text-sm text-sub">
            이메일 다시 입력
          </button>
        </div>
      )}
      {error && <p className="mt-4 text-sm font-semibold text-thread">{error}</p>}
    </main>
  );
}
