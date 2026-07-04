"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const RELATIONS = [
  ["FRIEND", "지인"],
  ["FAMILY", "가족"],
  ["COWORKER", "직장동료"],
  ["SENIOR", "선배"],
  ["JUNIOR", "후배"],
  ["COUSIN", "사촌"],
  ["ETC", "기타"],
] as const;

// 가입 3단계 위저드 (PAGE_IA §2.2)
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 첫 회원(운영자)은 추천코드 단계를 건너뛴다
  const [needsReferral, setNeedsReferral] = useState(true);
  useEffect(() => {
    fetch("/api/signup")
      .then((r) => r.json())
      .then((d) => setNeedsReferral(d.needsReferral !== false))
      .catch(() => {});
  }, []);

  // STEP 1: 이메일 인증
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");

  // STEP 2: 추천코드
  const [referralCode, setReferralCode] = useState("");
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [relation, setRelation] = useState<string | null>(null);

  // STEP 3: 기본 정보 + 동의
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [company, setCompany] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [allowNameInPath, setAllowNameInPath] = useState(true);
  const [agreedPhoneReveal, setAgreedPhoneReveal] = useState(false);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function sendCode() {
    setLoading(true);
    setError("");
    const { ok, data } = await post("/api/auth/email/send", { email });
    setLoading(false);
    if (!ok) return setError(data.error ?? "발송 실패");
    setCodeSent(true);
  }

  async function verifyCode() {
    setLoading(true);
    setError("");
    const { ok, data } = await post("/api/auth/email/verify", { email, code });
    setLoading(false);
    if (!ok) return setError(data.error ?? "코드 확인 실패");
    if (data.isExistingUser) {
      setError("이미 가입된 이메일이에요. 로그인해 주세요.");
      return;
    }
    setStep(needsReferral ? 2 : 3);
  }

  async function checkReferral() {
    setLoading(true);
    setError("");
    const { ok, data } = await post("/api/auth/referral/check", { code: referralCode });
    setLoading(false);
    if (!ok) return setError(data.error ?? "추천코드 확인 실패");
    setReferrerName(data.referrerName);
  }

  async function submit() {
    setLoading(true);
    setError("");
    const { ok, data } = await post("/api/signup", {
      email,
      code,
      name,
      phone,
      birthDate,
      company,
      referralCode: referralCode || undefined,
      relationToReferrer: relation ?? undefined,
      allowNameInPath,
      agreedTerms,
      agreedPrivacy,
    });
    if (!ok) {
      setLoading(false);
      return setError(data.error ?? "가입에 실패했어요");
    }
    await signIn("credentials", { email, code, redirect: false });
    router.push("/onboarding");
    router.refresh();
  }

  const input =
    "w-full rounded-2xl border border-line bg-white px-4 py-4 text-base outline-none focus:border-blue";
  const btn =
    "w-full rounded-2xl bg-blue py-4 text-base font-extrabold text-white disabled:opacity-40";

  return (
    <main className="px-6 py-10">
      <div className="mb-6 flex gap-1.5">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${s <= step ? "bg-blue" : "bg-line"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <>
          <h1 className="text-[22px] font-extrabold tracking-tight">
            회사 이메일로 시작해요 📮
          </h1>
          <p className="mt-1 text-sm text-sub">
            이메일은 인증에만 쓰이고 다른 회원에게 공개되지 않아요.
          </p>
          <div className="mt-8 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className={input}
              disabled={codeSent}
            />
            {!codeSent ? (
              <button onClick={sendCode} disabled={loading || !email} className={btn}>
                {loading ? "보내는 중..." : "인증코드 받기"}
              </button>
            ) : (
              <>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6자리 코드"
                  className={`${input} text-center text-2xl font-extrabold tracking-[8px]`}
                />
                <button onClick={verifyCode} disabled={loading || code.length !== 6} className={btn}>
                  확인
                </button>
                <button onClick={() => setCodeSent(false)} className="w-full py-1 text-sm text-sub">
                  이메일 다시 입력
                </button>
              </>
            )}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="text-[22px] font-extrabold tracking-tight">
            누가 초대했나요? 🧵
          </h1>
          <p className="mt-1 text-sm text-sub">기존 회원의 추천코드를 입력해 주세요.</p>
          <div className="mt-8 space-y-4">
            <input
              value={referralCode}
              onChange={(e) => {
                setReferralCode(e.target.value.toUpperCase());
                setReferrerName(null);
              }}
              placeholder="DARI-XXXXXX"
              className={`${input} font-bold tracking-wider uppercase`}
            />
            {!referrerName ? (
              <button onClick={checkReferral} disabled={loading || !referralCode} className={btn}>
                코드 확인
              </button>
            ) : (
              <>
                <div className="rounded-2xl border-[1.5px] border-thread-soft bg-white p-5 text-center">
                  <p className="text-xs font-bold tracking-wide text-thread">나를 초대한 사람</p>
                  <p className="mt-1 text-2xl font-extrabold">{referrerName}</p>
                </div>
                <p className="pt-2 text-sm font-bold">{referrerName}님과 어떤 사이인가요?</p>
                <div className="flex flex-wrap gap-2">
                  {RELATIONS.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setRelation(value)}
                      className={`rounded-full border px-4 py-2.5 text-sm font-semibold ${
                        relation === value
                          ? "border-blue bg-blue-tint text-blue"
                          : "border-line bg-white text-sub"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep(3)} disabled={!relation} className={btn}>
                  다음
                </button>
              </>
            )}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="text-[22px] font-extrabold tracking-tight">기본 정보를 알려주세요</h1>
          <p className="mt-1 text-sm text-sub">연락처는 매칭 성사 전까지 아무에게도 공개되지 않아요.</p>
          <div className="mt-8 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className={input} />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="연락처 (010-0000-0000)"
              inputMode="tel"
              className={input}
            />
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={input}
            />
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="직장" className={input} />

            <div className="space-y-3 pt-3">
              {(
                [
                  ["서비스 이용약관 / 개인정보 수집·이용에 동의합니다 (필수)", agreedTerms, setAgreedTerms],
                  ["매칭 성사 시 전화번호가 상대방에게 공개되는 것에 동의합니다 (필수)", agreedPrivacy && agreedPhoneReveal, (v: boolean) => { setAgreedPrivacy(v); setAgreedPhoneReveal(v); }],
                  ["내 이름이 다른 회원의 관계 경로에 표시되는 것에 동의합니다", allowNameInPath, setAllowNameInPath],
                ] as const
              ).map(([label, checked, setter], i) => (
                <label key={i} className="flex items-start gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setter(e.target.checked)}
                    className="mt-0.5 h-5 w-5 accent-[#3182F6]"
                  />
                  <span>{label}</span>
                </label>
              ))}
              <p className="pl-8 text-xs text-sub">
                이름 표시에 동의하지 않으면 경로에 &ldquo;지인&rdquo;으로 익명 표시돼요.
              </p>
            </div>

            <button
              onClick={submit}
              disabled={loading || !name || !phone || !birthDate || !company || !agreedTerms || !agreedPrivacy}
              className={`${btn} mt-2`}
            >
              {loading ? "가입 중..." : "가입 완료 🎉"}
            </button>
          </div>
        </>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-thread">{error}</p>}
    </main>
  );
}
