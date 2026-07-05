"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoUploader } from "@/components/PhotoUploader";

const RELATIONS = [
  ["FRIEND", "지인"], ["FAMILY", "가족"], ["COWORKER", "직장동료"],
  ["SENIOR", "선배"], ["JUNIOR", "후배"], ["COUSIN", "사촌"],
  ["FRIEND_OF_FRIEND", "지인의 지인"], ["ETC", "기타"],
] as const;
const BODY_TYPES = [
  ["SLIM", "마른"], ["SLENDER", "슬림"], ["NORMAL", "보통"],
  ["CHUBBY", "통통"], ["MUSCULAR", "근육질"], ["GLAMOROUS", "글래머"],
] as const;
const RELIGIONS = [
  ["NONE", "무교"], ["PROTESTANT", "기독교"], ["CATHOLIC", "천주교"],
  ["BUDDHIST", "불교"], ["ETC", "기타"],
] as const;
const DRINKING = [["NEVER", "안 함"], ["SOMETIMES", "가끔"], ["OFTEN", "즐김"]] as const;
const SMOKING = [["NON_SMOKER", "비흡연"], ["E_CIGARETTE", "전자담배"], ["SMOKER", "흡연"]] as const;
const SIDO = [
  "서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];
const HOBBY_PRESETS = [
  "운동", "헬스", "등산", "러닝", "골프", "테니스", "요가", "여행", "맛집탐방", "요리",
  "카페투어", "영화", "전시회", "공연", "독서", "음악", "게임", "사진", "반려동물", "와인",
];
const MBTI = [
  "ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ",
];
const INDUSTRIES = [
  "IT·인터넷", "금융·보험", "제조·생산", "의료·제약", "교육", "공공·행정",
  "법률·회계", "미디어·콘텐츠", "유통·물류", "건설·부동산", "서비스·외식",
  "패션·뷰티", "여행·항공", "스포츠·레저", "연구·개발", "기타",
];

function Chip({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2.5 text-sm font-semibold ${
        selected ? "border-blue bg-blue-tint text-blue" : "border-line bg-white text-sub"
      }`}
    >
      {children}
    </button>
  );
}

// 수정 모드 초기값 (서버에서 복호화된 phone 포함)
export type ProfileInitial = {
  name: string;
  gender: "MALE" | "FEMALE";
  birthYear: number;
  heightCm: number;
  bodyType: string;
  phone: string;
  areaSido: string;
  areaGugun: string;
  company: string;
  companyMasked: boolean;
  industry: string | null;
  avoidSameCompany: boolean;
  jobTitle: string;
  religion: string;
  drinking: string;
  drinkCapacity: string | null;
  smoking: string;
  isDivorced: boolean;
  mbti: string | null;
  hobbies: string[];
  idealType: string | null;
  loveView: string | null;
  recommenderComment: string | null;
};

// 본인/지인 공용 다단계 프로필 폼 (PAGE_IA §2.7) — editId가 있으면 수정 모드
export function ProfileForm({
  isSelf,
  editId,
  initial,
  initialPhotos = [],
  startAtPhotos = false,
}: {
  isSelf: boolean;
  editId?: string;
  initial?: ProfileInitial;
  initialPhotos?: { id: string; url: string }[];
  startAtPhotos?: boolean; // 수정 모드에서 사진 단계로 바로 진입
}) {
  const router = useRouter();
  const isEdit = !!editId;
  const steps =
    isSelf || isEdit
      ? ["기본 정보", "라이프스타일", "어필", "사진"]
      : ["관계 & 동의", "기본 정보", "라이프스타일", "어필", "사진"];
  const [step, setStep] = useState(isEdit && startAtPhotos ? steps.indexOf("사진") : 0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(editId ?? null);

  // STEP: 관계 & 동의 (대리 등록만)
  const [relation, setRelation] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [delegateConsent, setDelegateConsent] = useState(false);

  // 기본 정보
  const [name, setName] = useState(initial?.name ?? "");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | null>(initial?.gender ?? null);
  const [birthYear, setBirthYear] = useState(initial ? String(initial.birthYear) : "");
  const [heightCm, setHeightCm] = useState(initial ? String(initial.heightCm) : "");
  const [bodyType, setBodyType] = useState<string | null>(initial?.bodyType ?? null);
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [areaSido, setAreaSido] = useState(initial?.areaSido ?? "");
  const [areaGugun, setAreaGugun] = useState(initial?.areaGugun ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [companyMasked, setCompanyMasked] = useState(initial?.companyMasked ?? false);
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [avoidSameCompany, setAvoidSameCompany] = useState(initial?.avoidSameCompany ?? true);
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? "");

  // 라이프스타일
  const [religion, setReligion] = useState<string | null>(initial?.religion ?? null);
  const [drinking, setDrinking] = useState<string | null>(initial?.drinking ?? null);
  const [drinkCapacity, setDrinkCapacity] = useState(initial?.drinkCapacity ?? "");
  const [smoking, setSmoking] = useState<string | null>(initial?.smoking ?? null);
  const [isDivorced, setIsDivorced] = useState<boolean | null>(initial?.isDivorced ?? null);
  const [mbti, setMbti] = useState(initial?.mbti ?? "");
  const [hobbies, setHobbies] = useState<string[]>(initial?.hobbies ?? []);
  const [customHobby, setCustomHobby] = useState("");

  // 어필
  const [comment, setComment] = useState(initial?.recommenderComment ?? "");
  const [idealType, setIdealType] = useState(initial?.idealType ?? "");
  const [loveView, setLoveView] = useState(initial?.loveView ?? "");

  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 1996 - 1960 + 20 }, (_, i) => yearNow - 20 - i).filter(
    (y) => y >= 1960,
  );

  function toggleHobby(h: string) {
    setHobbies((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : prev.length < 5 ? [...prev, h] : prev,
    );
  }

  const stepKey = steps[step];

  function validate(): string | null {
    if (stepKey === "관계 & 동의") {
      if (!relation) return "관계를 선택해 주세요";
      if (!consent) return "당사자 동의 확인이 필요해요";
    }
    if (stepKey === "기본 정보") {
      if (!gender || !birthYear || !heightCm || !bodyType || !areaSido || !areaGugun || !company || !industry || !jobTitle)
        return "모든 항목을 채워 주세요";
      if (!isEdit) {
        // 이름·연락처는 최초 등록 시에만 입력 (수정 모드에선 잠금)
        if (!name || !phone) return "모든 항목을 채워 주세요";
        if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone)) return "연락처 형식을 확인해 주세요";
      }
    }
    if (stepKey === "라이프스타일") {
      if (!religion || !drinking || !smoking || isDivorced === null) return "모든 항목을 선택해 주세요";
      if (hobbies.length === 0) return "취미를 1개 이상 골라 주세요";
    }
    if (stepKey === "어필") {
      if (!isSelf && !comment.trim()) return "추천인의 한 줄 소개는 필수예요";
    }
    return null;
  }

  async function next() {
    const v = validate();
    if (v) return setError(v);
    setError("");

    if (stepKey === "어필") {
      // 저장 (생성 or 수정) → 사진 단계로
      setLoading(true);
      const fields = {
        // 이름·연락처는 최초 등록 후 변경 불가 — 수정 모드에선 보내지 않음 (서버도 거부)
        ...(isEdit ? {} : { name, phone }),
        gender,
        birthYear: Number(birthYear),
        heightCm: Number(heightCm),
        bodyType, areaSido, areaGugun, company, companyMasked, industry, avoidSameCompany, jobTitle,
        religion, drinking,
        drinkCapacity: drinkCapacity || null,
        smoking,
        isDivorced: !!isDivorced,
        mbti: mbti || null,
        hobbies,
        idealType: idealType || null,
        loveView: loveView || null,
        recommenderComment: comment || null,
      };
      const res = isEdit
        ? await fetch(`/api/profiles/${editId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update", fields }),
          })
        : await fetch("/api/profiles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              isSelf,
              relationToOwner: isSelf ? "SELF" : relation,
              consentConfirmed: consent,
              delegatePhotoConsent: delegateConsent,
              ...fields,
            }),
          });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) return setError(data.error ?? "저장에 실패했어요");
      if (!isEdit) setProfileId(data.profileId);
    }
    setStep((s) => s + 1);
  }

  const input =
    "w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-base outline-none focus:border-blue";
  const label = "block pt-4 pb-2 text-sm font-extrabold";
  const btn =
    "mt-6 w-full rounded-2xl bg-blue py-4 text-base font-extrabold text-white disabled:opacity-40";

  return (
    <main className="px-6 py-8">
      <div className="mb-2 flex gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-blue" : "bg-line"}`} />
        ))}
      </div>
      <h1 className="text-[20px] font-extrabold tracking-tight">
        {isEdit ? "프로필 수정" : isSelf ? "내 소개팅 프로필" : "지인 프로필 등록"} · {stepKey}
      </h1>

      {stepKey === "관계 & 동의" && (
        <div>
          <p className={label}>이 분과 어떤 사이인가요?</p>
          <div className="flex flex-wrap gap-2">
            {RELATIONS.map(([v, l]) => (
              <Chip key={v} selected={relation === v} onClick={() => setRelation(v)}>{l}</Chip>
            ))}
          </div>
          <div className="mt-6 space-y-3 rounded-2xl bg-yellow-tint p-4">
            <label className="flex items-start gap-3 text-sm font-semibold text-[#6B5B1E]">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[#3182F6]" />
              ⚠️ 당사자에게 등록 동의를 받았습니다 (필수)
            </label>
            <label className="flex items-start gap-3 text-sm font-medium text-[#6B5B1E]">
              <input type="checkbox" checked={delegateConsent} onChange={(e) => setDelegateConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[#3182F6]" />
              (여성 등록 시) 사진 열람 수락 권한을 나에게 위임받았어요
            </label>
          </div>
        </div>
      )}

      {stepKey === "기본 정보" && (
        <div>
          <p className={label}>이름</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isEdit}
            className={`${input} disabled:bg-[#F1EDE6] disabled:text-sub`}
          />
          {isEdit && (
            <p className="mt-1.5 text-xs text-sub">
              🔒 이름과 연락처는 도용 방지를 위해 등록 후 바꿀 수 없어요
            </p>
          )}
          <p className={label}>성별</p>
          <div className="flex gap-2">
            <Chip selected={gender === "MALE"} onClick={() => setGender("MALE")}>남성</Chip>
            <Chip selected={gender === "FEMALE"} onClick={() => setGender("FEMALE")}>여성</Chip>
          </div>
          <p className={label}>출생년도</p>
          <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className={input}>
            <option value="">선택</option>
            {years.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <p className={label}>키 (cm)</p>
          <input inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value.replace(/\D/g, ""))} className={input} />
          <p className={label}>체형 <span className="font-medium text-sub">(몸무게 대신)</span></p>
          <div className="flex flex-wrap gap-2">
            {BODY_TYPES.map(([v, l]) => (
              <Chip key={v} selected={bodyType === v} onClick={() => setBodyType(v)}>{l}</Chip>
            ))}
          </div>
          <p className={label}>연락처 <span className="font-medium text-sub">(성사 전까지 비공개)</span></p>
          <input
            inputMode="tel"
            value={isEdit ? phone || "등록된 번호 (변경 불가)" : phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isEdit}
            placeholder="010-0000-0000"
            className={`${input} disabled:bg-[#F1EDE6] disabled:text-sub`}
          />
          <p className={label}>사는 곳</p>
          <div className="flex gap-2">
            <select value={areaSido} onChange={(e) => setAreaSido(e.target.value)} className={input}>
              <option value="">시/도</option>
              {SIDO.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={areaGugun} onChange={(e) => setAreaGugun(e.target.value)} placeholder="구/군" className={input} />
          </div>
          <p className={label}>직장</p>
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={input} />
          <label className="mt-2 flex items-center gap-2 text-[13px] font-medium text-sub">
            <input type="checkbox" checked={companyMasked} onChange={(e) => setCompanyMasked(e.target.checked)} className="h-4 w-4 accent-[#3182F6]" />
            프로필에는 직장명을 숨길래요
          </label>
          <p className={label}>
            산업 분야{" "}
            <span className="font-medium text-sub">(직장명을 숨겨도 업계는 보여요)</span>
          </p>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={input}>
            <option value="">선택</option>
            {INDUSTRIES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <label className="mt-2 flex items-center gap-2 text-[13px] font-medium text-sub">
            <input type="checkbox" checked={avoidSameCompany} onChange={(e) => setAvoidSameCompany(e.target.checked)} className="h-4 w-4 accent-[#3182F6]" />
            같은 회사 사람과는 서로 안 보이게 할래요 (권장)
          </label>
          <p className={label}>직무</p>
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={input} />
        </div>
      )}

      {stepKey === "라이프스타일" && (
        <div>
          <p className={label}>종교</p>
          <div className="flex flex-wrap gap-2">
            {RELIGIONS.map(([v, l]) => <Chip key={v} selected={religion === v} onClick={() => setReligion(v)}>{l}</Chip>)}
          </div>
          <p className={label}>음주</p>
          <div className="flex gap-2">
            {DRINKING.map(([v, l]) => <Chip key={v} selected={drinking === v} onClick={() => setDrinking(v)}>{l}</Chip>)}
          </div>
          {drinking === "OFTEN" && (
            <input value={drinkCapacity} onChange={(e) => setDrinkCapacity(e.target.value)} placeholder="주량 (예: 소주 1병)" className={`${input} mt-2`} />
          )}
          <p className={label}>흡연</p>
          <div className="flex gap-2">
            {SMOKING.map(([v, l]) => <Chip key={v} selected={smoking === v} onClick={() => setSmoking(v)}>{l}</Chip>)}
          </div>
          <p className={label}>돌싱 여부</p>
          <div className="flex gap-2">
            <Chip selected={isDivorced === false} onClick={() => setIsDivorced(false)}>아니요</Chip>
            <Chip selected={isDivorced === true} onClick={() => setIsDivorced(true)}>예</Chip>
          </div>
          <p className={label}>MBTI <span className="font-medium text-sub">(선택)</span></p>
          <select value={mbti} onChange={(e) => setMbti(e.target.value)} className={input}>
            <option value="">선택 안 함</option>
            {MBTI.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <p className={label}>취미 <span className="font-medium text-sub">(최대 5개)</span></p>
          <div className="flex flex-wrap gap-2">
            {[...HOBBY_PRESETS, ...hobbies.filter((h) => !HOBBY_PRESETS.includes(h))].map((h) => (
              <Chip key={h} selected={hobbies.includes(h)} onClick={() => toggleHobby(h)}>{h}</Chip>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={customHobby} onChange={(e) => setCustomHobby(e.target.value)} placeholder="직접 입력" className={input} />
            <button
              type="button"
              onClick={() => {
                const h = customHobby.trim();
                if (h && !hobbies.includes(h) && hobbies.length < 5) {
                  setHobbies((p) => [...p, h]);
                  setCustomHobby("");
                }
              }}
              className="flex-shrink-0 rounded-2xl border border-line bg-white px-4 text-sm font-bold text-sub"
            >
              추가
            </button>
          </div>
        </div>
      )}

      {stepKey === "어필" && (
        <div>
          <p className={label}>
            {isSelf ? "자기 소개 한 줄" : "추천인의 한 줄 소개 ★필수"}
            <span className="font-medium text-sub"> (100자)</span>
          </p>
          <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 100))}
            placeholder={isSelf ? "예: 주말마다 맛집을 찾아다녀요" : "예: 요리를 저보다 잘하는 착한 동생입니다"}
            rows={2} className={input} />
          <p className={label}>이상형 <span className="font-medium text-sub">(선택, 200자)</span></p>
          <textarea value={idealType} onChange={(e) => setIdealType(e.target.value.slice(0, 200))} rows={3} className={input} />
          <p className={label}>연애관 <span className="font-medium text-sub">(선택, 200자)</span></p>
          <textarea value={loveView} onChange={(e) => setLoveView(e.target.value.slice(0, 200))} rows={3} className={input} />
          <p className="mt-3 text-xs text-sub">
            연락처·카톡 ID·링크는 적을 수 없어요. 성사되면 번호가 자동 공개돼요.
          </p>
        </div>
      )}

      {stepKey === "사진" && profileId && (
        <div className="pt-4">
          <PhotoUploader
            profileId={profileId}
            initialPhotos={initialPhotos}
            onDone={() =>
              router.push(isEdit ? `/p/${editId}` : isSelf ? "/home" : "/deck")
            }
          />
        </div>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-thread">{error}</p>}

      {stepKey !== "사진" && (
        <button onClick={next} disabled={loading} className={btn}>
          {loading
            ? "저장 중..."
            : stepKey === "어필"
              ? isEdit
                ? "저장하고 사진 관리 →"
                : "저장하고 사진 등록 →"
              : "다음"}
        </button>
      )}
      {step > 0 && stepKey !== "사진" && (
        <button onClick={() => setStep((s) => s - 1)} className="mt-2 w-full py-2 text-sm font-semibold text-sub">
          이전
        </button>
      )}
    </main>
  );
}
