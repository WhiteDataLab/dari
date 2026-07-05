// 12간지 띠 — 출생년도 % 12 기준 (4=쥐, 5=소, …, 3=돼지)
const ZODIAC: [string, string][] = [
  ["원숭이", "🐵"], ["닭", "🐔"], ["개", "🐶"], ["돼지", "🐷"],
  ["쥐", "🐭"], ["소", "🐮"], ["호랑이", "🐯"], ["토끼", "🐰"],
  ["용", "🐲"], ["뱀", "🐍"], ["말", "🐴"], ["양", "🐑"],
];

export function zodiacOf(birthYear: number): { label: string; emoji: string } {
  const [name, emoji] = ZODIAC[((birthYear % 12) + 12) % 12];
  return { label: `${name}띠`, emoji };
}
