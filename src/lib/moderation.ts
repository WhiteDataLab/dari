// 텍스트 자동 감지 — 연락처 우회 교환 차단 (DB_SCHEMA §7)
// 확정 패턴(전화번호·계좌)은 저장 거부. Phase 2에서 의심 키워드 큐 확장 예정.

const PHONE_RE = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/;
const URL_RE = /https?:\/\/|www\.|\.com|\.kr|\.net|닷컴/i;
const SNS_RE = /카톡|카카오\s?아이디|ㅋㅌ|인스타|@[a-zA-Z0-9_.]{3,}/;

// 자모 분리·공백 삽입 우회 정규화 ("ㅇ1ㅇ-1234" 등)
function normalize(text: string): string {
  return text.replace(/[ㅇo0]/gi, "0").replace(/\s+/g, "");
}

export function checkFreeText(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.trim();
  if (PHONE_RE.test(t) || PHONE_RE.test(normalize(t))) {
    return "전화번호는 적을 수 없어요. 성사되면 자동으로 공개돼요.";
  }
  if (URL_RE.test(t)) {
    return "링크(URL)는 적을 수 없어요.";
  }
  if (SNS_RE.test(t)) {
    return "카톡·SNS 아이디는 적을 수 없어요. 성사되면 번호가 공개돼요.";
  }
  return null;
}
