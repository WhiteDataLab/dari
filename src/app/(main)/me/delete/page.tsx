import Link from "next/link";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

// 회원 탈퇴 확인 (§7.10)
export default function DeleteAccountPage() {
  return (
    <main className="px-6 py-8">
      <h1 className="text-[20px] font-extrabold tracking-tight">회원 탈퇴 😢</h1>
      <p className="mt-1 text-sm text-sub">떠나신다니 아쉬워요. 아래 내용을 꼭 확인해 주세요.</p>

      <div className="mt-5 space-y-2.5 rounded-2xl bg-white p-5 text-[13.5px] font-medium leading-relaxed shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        <p>• 내 프로필과 <b>내가 등록한 지인 프로필</b>(본인이 직접 관리 중인 프로필 제외)의 이름·연락처·사진·소개글이 <b>모두 삭제</b>돼요.</p>
        <p>• 진행 중이던 호감은 자동 종료되고, 성사됐던 상대에게도 더 이상 내 정보가 보이지 않아요.</p>
        <p>• 이미 성사되어 공개된 전화번호까지 되돌릴 수는 없어요.</p>
        <p>• 내가 초대한 지인들의 가입 관계(경로)는 유지되지만, 내 이름은 <b>&ldquo;지인&rdquo;으로 익명 표시</b>돼요.</p>
        <p>• 탈퇴 후에는 같은 이메일로 새로 가입해야 해요 (복구 불가).</p>
      </div>

      <div className="mt-6">
        <DeleteAccountButton />
      </div>

      <Link href="/me" className="mt-3 block py-3 text-center text-sm font-semibold text-sub">
        취소하고 돌아가기
      </Link>
    </main>
  );
}
