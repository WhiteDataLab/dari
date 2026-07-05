import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { REL_LABEL } from "@/lib/relationPath";

export const dynamic = "force-dynamic";

// 비가입자 공유 프로필 (PROJECT_SPEC §7.7)
// 공개 범위: 닉네임·나이·지역·직무·라이프스타일·취미·소개글만.
// 실명·연락처·회사명은 절대 미포함. 여성 사진은 가입 후 매칭 과정에서만 (§9.0).

const BODY_LABEL: Record<string, string> = {
  SLIM: "마른", SLENDER: "슬림", NORMAL: "보통", CHUBBY: "통통", MUSCULAR: "근육질", GLAMOROUS: "글래머",
};
const RELIGION_LABEL: Record<string, string> = {
  NONE: "무교", PROTESTANT: "기독교", CATHOLIC: "천주교", BUDDHIST: "불교", ETC: "기타",
};
const DRINK_LABEL: Record<string, string> = { NEVER: "안 함", SOMETIMES: "가끔", OFTEN: "즐김" };
const SMOKE_LABEL: Record<string, string> = { NON_SMOKER: "비흡연", E_CIGARETTE: "전자담배", SMOKER: "흡연" };

async function getProfile(token: string) {
  return prisma.profile.findUnique({
    where: { shareToken: token },
    include: {
      photos: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] },
      owner: { select: { referralCode: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const profile = await getProfile(token);
  if (!profile || profile.status !== "ACTIVE") return { title: "다리 — 지인의 지인, 어쩌면 인연" };
  const age = new Date().getFullYear() - profile.birthYear + 1;
  return {
    title: `다리 — ${profile.nickname} (${age})`,
    description:
      profile.recommenderComment ??
      `${profile.areaSido} ${profile.areaGugun} · ${profile.jobTitle}`,
    openGraph: {
      title: `${profile.nickname}님을 소개해요 🧵`,
      description: profile.recommenderComment ?? "지인이 보증하는 소개팅, 다리",
      images:
        profile.gender === "MALE" && profile.photos[0]
          ? [{ url: profile.photos[0].url }]
          : undefined,
    },
  };
}

export default async function SharedProfilePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const profile = await getProfile(token);
  if (!profile) notFound();

  if (profile.status !== "ACTIVE") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <p className="text-4xl">🧵</p>
        <p className="mt-3 font-bold">지금은 볼 수 없는 프로필이에요</p>
        <p className="mt-1 text-sm text-sub">이미 좋은 인연을 만났거나, 잠시 쉬는 중이에요.</p>
        <Link href="/" className="mt-5 rounded-xl bg-blue px-5 py-3 text-sm font-extrabold text-white">
          다리 구경하기
        </Link>
      </main>
    );
  }

  const age = new Date().getFullYear() - profile.birthYear + 1;
  const photosPublic = profile.gender === "MALE" && profile.photos.length > 0;
  const signupHref = `/signup?code=${profile.owner.referralCode}`;

  const infoRows: [string, string][] = [
    ["키", `${profile.heightCm}cm`],
    ["체형", BODY_LABEL[profile.bodyType] ?? profile.bodyType],
    ["종교", RELIGION_LABEL[profile.religion] ?? profile.religion],
    ["음주", DRINK_LABEL[profile.drinking] + (profile.drinkCapacity ? ` (${profile.drinkCapacity})` : "")],
    ["흡연", SMOKE_LABEL[profile.smoking] ?? profile.smoking],
    ...(profile.industry ? ([["업계", profile.industry]] as [string, string][]) : []),
    ["직무", profile.jobTitle],
    ...(profile.mbti ? ([["MBTI", profile.mbti]] as [string, string][]) : []),
  ];

  return (
    <main className="pb-32">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="logo-thread text-xl font-extrabold">다리</span>
        <Link href="/login" className="text-[13px] font-bold text-sub">
          로그인
        </Link>
      </header>

      <div className="mx-5">
        {photosPublic ? (
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto">
            {profile.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.url}
                alt=""
                className="aspect-[4/4.6] w-full flex-shrink-0 snap-center rounded-3xl object-cover shadow-[0_2px_12px_rgba(28,27,24,0.06)]"
              />
            ))}
          </div>
        ) : (
          <div className="flex aspect-[4/4.6] flex-col items-center justify-center gap-2.5 rounded-3xl bg-gradient-to-br from-[#EEE9DF] to-[#DFD8C8]">
            <span className="text-[70px] opacity-45 grayscale">👤</span>
            <p className="px-8 text-center text-[13px] font-bold text-sub">
              {profile.gender === "FEMALE"
                ? "사진은 가입 후 매칭 과정에서 서로 수락하면 공개돼요"
                : "아직 사진이 없어요"}
            </p>
          </div>
        )}
      </div>

      <div className="px-6 pt-4">
        <h1 className="text-[24px] font-extrabold tracking-tight">
          {profile.nickname}, {age}
        </h1>
        <p className="mt-0.5 text-sm text-sub">
          {profile.areaSido} {profile.areaGugun} · {profile.jobTitle}
        </p>
        <p className="mt-1 text-xs font-semibold text-sub">
          🔒 실명·연락처는 다리에서 매칭이 성사되면 공개돼요
        </p>
      </div>

      {profile.recommenderComment && (
        <div className="mx-5 mt-4 rounded-[4px_18px_18px_18px] bg-yellow-tint px-4 py-3">
          <p className="text-[11px] font-extrabold text-[#B08900]">
            {profile.isSelf ? "본인의 한 마디" : `추천인(${REL_LABEL[profile.relationToOwner]} 사이)의 한 줄 소개`}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#6B5B1E]">
            &ldquo;{profile.recommenderComment}&rdquo;
          </p>
        </div>
      )}

      <div className="mx-5 mt-4 rounded-[20px] bg-white px-4.5 py-1.5 shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        {infoRows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line py-3 text-sm last:border-0">
            <span className="font-semibold text-sub">{k}</span>
            <span className="font-bold">{v}</span>
          </div>
        ))}
      </div>

      <section className="mx-6 mt-4.5">
        <h4 className="mb-2 text-[13px] font-extrabold tracking-wide text-sub">취미</h4>
        <div className="flex flex-wrap gap-1.5">
          {profile.hobbies.map((h) => (
            <span key={h} className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-[#5B554A]">
              {h}
            </span>
          ))}
        </div>
      </section>

      {profile.idealType && (
        <section className="mx-6 mt-4.5">
          <h4 className="mb-1.5 text-[13px] font-extrabold tracking-wide text-sub">이상형</h4>
          <p className="text-[15px] leading-relaxed">{profile.idealType}</p>
        </section>
      )}

      <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white/95 px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <Link
          href={signupHref}
          className="block rounded-2xl bg-blue py-4 text-center text-base font-extrabold text-white"
        >
          이 분과 이어지고 싶다면 — 다리 가입하기 🧵
        </Link>
        <p className="mt-1.5 text-center text-[11px] text-sub">
          지인이 보증하는 소개팅 · 추천코드가 자동으로 입력돼요
        </p>
      </div>
    </main>
  );
}
