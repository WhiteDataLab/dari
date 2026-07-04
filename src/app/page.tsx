import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Landing() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <main className="flex min-h-dvh flex-col justify-between px-6 py-12">
      <div className="mt-16">
        <span className="logo-thread text-4xl font-extrabold tracking-tight">다리</span>
        <h1 className="mt-8 text-[26px] font-extrabold leading-snug tracking-tight">
          지인의 지인,
          <br />
          어쩌면 인연 🧵
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-sub">
          다른 앱은 지인을 피하게 해주지만,
          <br />
          다리는 지인 관계가 신뢰의 다리가 돼요.
          <br />
          모든 프로필에서 <b className="text-thread">나와 몇 다리인지</b> 보여드려요.
        </p>
      </div>

      <div className="mb-4 space-y-3">
        <Link
          href="/signup"
          className="block w-full rounded-2xl bg-blue py-[17px] text-center text-base font-extrabold text-white shadow-[0_6px_16px_rgba(49,130,246,0.3)] active:scale-[0.98]"
        >
          추천코드로 가입하기
        </Link>
        <Link
          href="/login"
          className="block w-full rounded-2xl border border-line bg-white py-[17px] text-center text-base font-bold text-sub active:scale-[0.98]"
        >
          로그인
        </Link>
        <p className="pt-2 text-center text-xs text-sub">
          가입에는 기존 회원의 추천코드가 필요해요
        </p>
      </div>
    </main>
  );
}
