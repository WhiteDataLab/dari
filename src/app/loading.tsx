// 라우트 전환 중 즉시 표시되는 로딩 화면 (전 구간 공통)
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex items-center gap-2.5 rounded-full bg-white px-5 py-3.5 text-sm font-bold text-sub shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-[#3182F6]" />
        불러오는 중이에요…
      </div>
    </div>
  );
}
