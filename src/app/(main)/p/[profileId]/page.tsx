import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewPhotos } from "@/lib/photoGate";
import { computeRelationPath } from "@/lib/relationPath";
import { getViewerContext, isProfileVisible } from "@/lib/visibility";
import { canEditProfile } from "@/lib/profileAccess";
import { LikeCta, type CtaMode } from "@/components/LikeCta";
import { ShareProfileButton } from "@/components/ShareProfileButton";
import { DeleteProfileButton } from "@/components/DeleteProfileButton";
import { HideToggle } from "@/components/HideToggle";
import { ReportButton } from "@/components/ReportButton";

export const dynamic = "force-dynamic";

const BODY_LABEL: Record<string, string> = {
  SLIM: "마른", SLENDER: "슬림", NORMAL: "보통", CHUBBY: "통통", MUSCULAR: "근육질", GLAMOROUS: "글래머",
};
const RELIGION_LABEL: Record<string, string> = {
  NONE: "무교", PROTESTANT: "기독교", CATHOLIC: "천주교", BUDDHIST: "불교", ETC: "기타",
};
const DRINK_LABEL: Record<string, string> = { NEVER: "안 함", SOMETIMES: "가끔", OFTEN: "즐김" };
const SMOKE_LABEL: Record<string, string> = { NON_SMOKER: "비흡연", E_CIGARETTE: "전자담배", SMOKER: "흡연" };

// 프로필 상세 ★핵심 화면 (PAGE_IA §2.5)
export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const isAdmin = (session!.user as { role?: string }).role === "ADMIN"; // 관리자는 운영 목적 전체 열람
  const { profileId } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { photos: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] } },
  });
  if (!profile) notFound();

  const isMine = profile.ownerId === userId || profile.userId === userId;
  const canEdit = canEditProfile(userId, profile) || isAdmin; // 관리자는 전체 카드 편집·삭제 (§12.4)

  // 숨김 프로필은 본인·등록자·관리자만
  if (profile.status === "HIDDEN" && !isMine && !isAdmin) notFound();

  // 이름·연락처 미입력 프로필은 등록자·관리자 외 비노출 (§7.9)
  if (profile.identityPending && !isMine && !isAdmin) notFound();

  // 노출 회피 (같은 회사 / 아는 사람) — 회피 대상이면 404
  if (!isMine && !isAdmin) {
    const ctx = await getViewerContext(userId);
    if (!(await isProfileVisible(ctx, profile))) notFound();
  }

  const mySelf = await prisma.profile.findFirst({ where: { userId } });

  // 나(본인 프로필)와 이 프로필 사이의 진행 중 Like → CTA 모드 결정
  let mode: CtaMode = isMine ? "none" : "send";
  let likeId: string | undefined;

  if (!isMine && mySelf) {
    const like = await prisma.like.findFirst({
      where: {
        OR: [
          { fromProfileId: mySelf.id, toProfileId: profileId },
          { fromProfileId: profileId, toProfileId: mySelf.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    if (like) {
      likeId = like.id;
      const iAmSender = like.fromProfileId === mySelf.id;
      if (like.status === "REJECTED") {
        if (!isAdmin) notFound(); // 거절 이력 → 404 (관리자는 열람만)
        mode = "none";
      }
      else if (like.status === "ACCEPTED") mode = "matched";
      else if (like.status === "EXPIRED") mode = "none";
      else if (like.status === "PENDING") mode = iAmSender ? "waiting" : "respond";
      else if (like.status === "PHOTO_GRANTED") mode = iAmSender ? "final" : "waiting";
    }
  }
  if (profile.status === "MATCHED" && mode !== "matched") mode = "none";

  // 열람 기록 (NEW 마크 해제) — 직접 링크로 들어온 경우도 커버
  if (!isMine && !isAdmin) {
    await prisma.profileView
      .upsert({
        where: { userId_profileId: { userId, profileId } },
        create: { userId, profileId },
        update: {},
      })
      .catch(() => {});
  }

  const photosVisible = await canViewPhotos(userId, profile);
  const path = await computeRelationPath(userId, profile).catch(() => null);
  const age = new Date().getFullYear() - profile.birthYear + 1;
  // 실명은 내 프로필이거나 성사된 사이일 때만 (PROJECT_SPEC §7.6)
  const displayName = isMine || mode === "matched" ? profile.name : profile.nickname;

  const infoRows: [string, string][] = [
    ["체형", BODY_LABEL[profile.bodyType] ?? profile.bodyType],
    ["종교", RELIGION_LABEL[profile.religion] ?? profile.religion],
    [
      "음주",
      DRINK_LABEL[profile.drinking] + (profile.drinkCapacity ? ` (${profile.drinkCapacity})` : ""),
    ],
    ["흡연", SMOKE_LABEL[profile.smoking] ?? profile.smoking],
    ["돌싱", profile.isDivorced ? "예" : "아니요"],
    ...(profile.mbti ? ([["MBTI", profile.mbti]] as [string, string][]) : []),
    // 직장명을 숨겨도 업계는 보여준다 (§7.1)
    ["직장", profile.companyMasked ? (profile.industry ? `${profile.industry} (사명 비공개)` : "비공개") : profile.company],
    ...(profile.industry && !profile.companyMasked
      ? ([["업계", profile.industry]] as [string, string][])
      : []),
    ["직무", profile.jobTitle],
  ];

  return (
    <main className="pb-[130px]">
      <div className="flex items-center justify-between px-4 py-3.5">
        <Link
          href="/home"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[17px] shadow-[0_2px_12px_rgba(28,27,24,0.06)]"
        >
          ←
        </Link>
        {canEdit && (
          <span className="flex items-center gap-2">
            {profile.status === "ACTIVE" && !profile.identityPending && (
              <ShareProfileButton profileId={profile.id} nickname={profile.nickname} />
            )}
            <Link
              href={`/p/${profile.id}/edit?step=photo`}
              className="flex h-10 items-center gap-1 rounded-full bg-white px-4 text-sm font-bold text-sub shadow-[0_2px_12px_rgba(28,27,24,0.06)]"
            >
              🖼 사진
            </Link>
            <Link
              href={`/p/${profile.id}/edit`}
              className="flex h-10 items-center gap-1 rounded-full bg-white px-4 text-sm font-bold text-sub shadow-[0_2px_12px_rgba(28,27,24,0.06)]"
            >
              ✏️ 수정
            </Link>
            <DeleteProfileButton profileId={profile.id} isSelf={profile.isSelf} />
          </span>
        )}
      </div>

      {/* 사진 — 비대칭 gate: 권한 없으면 서버가 URL 자체를 렌더하지 않음 */}
      <div className="mx-5">
        {photosVisible && profile.photos.length > 0 ? (
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
            {profile.photos.length > 0 ? (
              <>
                <span className="text-[70px] opacity-45 grayscale">👤</span>
                <p className="px-8 text-center text-[13px] font-bold text-sub">
                  사진 {profile.photos.length}장 — 서로 사진 교환을 수락하면 공개돼요 🔒
                </p>
              </>
            ) : (
              // 사진 미등록 — 성별 아이콘으로 표시 (v1.5)
              <>
                <span className="text-[70px]">{profile.gender === "MALE" ? "🙋‍♂️" : "🙋‍♀️"}</span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-[12px] font-extrabold text-sub">
                  📷 사진 미등록 프로필이에요
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pt-4">
        <h1 className="text-[26px] font-extrabold tracking-tight">
          {displayName}, {age}
        </h1>
        {!isMine && mode !== "matched" && (
          <p className="mt-0.5 text-xs font-semibold text-sub">
            🔒 실명과 연락처는 매칭이 성사되면 공개돼요
          </p>
        )}
        {isMine && !profile.identityPending && (
          <p className="mt-0.5 text-xs font-semibold text-sub">
            🎭 다른 회원에게는 <b className="text-ink">{profile.nickname}</b>(으)로 보여요
          </p>
        )}
        {profile.identityPending && (
          <div className="mt-1.5 rounded-xl bg-yellow-tint px-3 py-2.5 text-xs font-semibold text-[#6B5B1E]">
            ⏳ 이름·연락처를 입력하면 탐색에 공개돼요
            {profile.viaName ? ` (다리 지인 ${profile.viaName}님도 입력 가능)` : ""}
            {isMine && (
              <Link href={`/p/${profile.id}/identify`} className="mt-1.5 block font-extrabold text-blue">
                ✍️ 지금 입력하기 ›
              </Link>
            )}
          </div>
        )}
        <p className="mt-0.5 text-sm text-sub">
          {profile.heightCm}cm · {profile.areaSido} {profile.areaGugun}
        </p>
      </div>

      {/* ★ 인연의 실 — 관계 경로 배너 */}
      {path && (
        <div className="mx-5 mt-4 overflow-hidden rounded-[20px] border-[1.5px] border-thread-soft bg-white px-4.5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-wide text-thread">
              🧵 인연의 실
            </span>
            {!path.far && (
              <span className="rounded-full bg-thread-soft px-2 py-0.5 text-[11px] font-bold text-thread">
                {path.degree}다리
              </span>
            )}
          </div>
          <p className="text-[15px] font-bold leading-relaxed">
            {path.far ? "아득히 먼 인연 ✨" : path.sentence}
          </p>
        </div>
      )}

      {/* 추천인 한 줄 소개 */}
      {profile.recommenderComment && (
        <div className="mx-5 mt-3.5 rounded-[4px_18px_18px_18px] bg-yellow-tint px-4 py-3">
          <p className="text-[11px] font-extrabold text-[#B08900]">
            {profile.isSelf ? "본인의 한 마디" : "추천인의 한 줄 소개"}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#6B5B1E]">
            &ldquo;{profile.recommenderComment}&rdquo;
          </p>
        </div>
      )}

      <div className="mx-5 mt-4 rounded-[20px] bg-white px-4.5 py-1.5 shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        {infoRows.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between border-b border-line py-3 text-sm last:border-0"
          >
            <span className="font-semibold text-sub">{k}</span>
            <span className="font-bold">{v}</span>
          </div>
        ))}
      </div>

      <section className="mx-6 mt-4.5">
        <h4 className="mb-2 text-[13px] font-extrabold tracking-wide text-sub">취미</h4>
        <div className="flex flex-wrap gap-1.5">
          {profile.hobbies.map((h) => (
            <span
              key={h}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-[#5B554A]"
            >
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
      {profile.loveView && (
        <section className="mx-6 mt-4.5">
          <h4 className="mb-1.5 text-[13px] font-extrabold tracking-wide text-sub">연애관</h4>
          <p className="text-[15px] leading-relaxed">{profile.loveView}</p>
        </section>
      )}

      {/* 삭제가 부담스러우면 숨김 — 탐색·호감에서만 제외, 데이터는 유지 (§7.11) */}
      {canEdit && profile.status !== "MATCHED" && (
        <div className="mx-5 mt-6">
          {profile.status === "HIDDEN" && (
            <p className="mb-2 text-center text-xs font-bold text-sub">
              🙈 지금 이 카드는 숨김 상태예요 — 탐색에 노출되지 않아요
            </p>
          )}
          <HideToggle profileId={profile.id} hidden={profile.status === "HIDDEN"} />
        </div>
      )}

      {!isMine && <ReportButton profileId={profile.id} />}

      {mode !== "none" && (
        <LikeCta mode={mode} toProfileId={profile.id} likeId={likeId} />
      )}
    </main>
  );
}
