// 랜덤 닉네임 — 성사 전 실명 대신 표시 (PROJECT_SPEC §7.6)
// 프로필 생성 시 1회 부여 후 고정. migration 4_nickname의 백필 단어와 동일 목록 유지

const ADJECTIVES = [
  "포근한", "다정한", "씩씩한", "명랑한", "슬기로운", "온화한", "유쾌한", "진솔한",
  "순수한", "활발한", "차분한", "사려깊은", "낙천적인", "겸손한", "성실한", "용감한",
  "재치있는", "따뜻한", "반짝이는", "싱그러운", "느긋한", "상냥한", "당찬", "소탈한",
];

const ANIMALS = [
  "수달", "고슴도치", "펭귄", "사막여우", "알파카", "판다", "돌고래", "참새",
  "다람쥐", "토끼", "고래", "물범", "치타", "부엉이", "백조", "사슴",
  "여우", "곰돌이", "강아지", "고양이", "햄스터", "라마", "미어캣", "쿼카",
];

export function generateNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}
