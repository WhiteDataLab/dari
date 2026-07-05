// 메인 탭 화면 전환 중 로딩 (탭바는 layout이 유지)
export default function Loading() {
  return (
    <div className="flex min-h-[70dvh] items-center justify-center">
      <div className="flex items-center gap-2.5 rounded-full bg-white px-5 py-3.5 text-sm font-bold text-sub shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-[#3182F6]" />
        불러오는 중이에요…
      </div>
    </div>
  );
}
