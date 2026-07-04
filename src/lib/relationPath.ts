import { prisma } from "@/lib/prisma";
import { RelationType } from "@prisma/client";

// 관계 경로 계산 — DB_SCHEMA §4
// 노드: User / 엣지: 추천 관계(양방향) / 목표: 열람자 → 프로필 소유자 최단 경로(BFS)
// + 마지막 칸 Profile.relationToOwner

export const REL_LABEL: Record<RelationType, string> = {
  FRIEND: "지인",
  FAMILY: "가족",
  COWORKER: "직장동료",
  SENIOR: "선배",
  JUNIOR: "후배",
  COUSIN: "사촌",
  ETC: "지인",
  SELF: "본인",
};

export type PathResult = {
  degree: number; // 촌수 (relationToOwner 한 칸 포함)
  sentence: string; // "짱구님의 지인(영희)의 후배"
  nodes: { name: string | null; rel: string }[]; // 시각화용 (이름 null = 비공개)
  far: boolean; // 6촌 초과/미발견
};

type RawPath = { path: string[]; rels: string[]; depth: number };

export async function computeRelationPath(
  viewerId: string,
  profile: { ownerId: string; relationToOwner: RelationType; isSelf: boolean; userId: string | null; name: string },
): Promise<PathResult | null> {
  // 목표 노드: 본인 프로필이면 당사자, 대리 등록이면 등록자(중매인)
  const targetUserId = profile.isSelf && profile.userId ? profile.userId : profile.ownerId;

  if (viewerId === targetUserId) {
    return null; // 내 프로필 / 내가 등록한 프로필 — 경로 표시 없음
  }

  const rows = await prisma.$queryRaw<RawPath[]>`
    WITH RECURSIVE edges AS (
      SELECT "referredById" AS a, id AS b, "relationToReferrer"::text AS rel
      FROM "User" WHERE "referredById" IS NOT NULL
      UNION ALL
      SELECT id AS a, "referredById" AS b, "relationToReferrer"::text AS rel
      FROM "User" WHERE "referredById" IS NOT NULL
    ),
    paths AS (
      SELECT b AS node, ARRAY[a, b] AS path, ARRAY[rel] AS rels, 1 AS depth
      FROM edges WHERE a = ${viewerId}
      UNION ALL
      SELECT e.b, p.path || e.b, p.rels || e.rel, p.depth + 1
      FROM paths p
      JOIN edges e ON e.a = p.node
      WHERE NOT e.b = ANY(p.path)
        AND p.depth < 6
    )
    SELECT path, rels, depth
    FROM paths
    WHERE node = ${targetUserId}
    ORDER BY depth
    LIMIT 1;
  `;

  const lastRel =
    profile.isSelf ? null : REL_LABEL[profile.relationToOwner];

  if (rows.length === 0) {
    return { degree: 0, sentence: "아득히 먼 인연 ✨", nodes: [], far: true };
  }

  const { path, rels } = rows[0];

  // 경로 인물 정보 (이름 노출 동의 확인)
  const users = await prisma.user.findMany({
    where: { id: { in: path } },
    select: { id: true, name: true, allowNameInPath: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  // 문장 렌더링 (DB_SCHEMA §4.3)
  // path = [나, A, B, ..., 소유자], rels = [나-A 관계, A-B 관계, ...]
  const parts: string[] = [];
  const nodes: { name: string | null; rel: string }[] = [];

  for (let i = 1; i < path.length; i++) {
    const u = byId.get(path[i]);
    const nameVisible = u?.allowNameInPath ?? false;
    const relLabel = REL_LABEL[(rels[i - 1] as RelationType) ?? "FRIEND"] ?? "지인";

    if (i === 1) {
      // 첫 인물만 "OO님" 존칭
      parts.push(nameVisible ? `${u!.name}님` : "지인");
      nodes.push({ name: nameVisible ? u!.name : null, rel: relLabel });
    } else {
      parts.push(nameVisible ? `${relLabel}(${u!.name})` : relLabel);
      nodes.push({ name: nameVisible ? u!.name : null, rel: relLabel });
    }
  }

  let sentence: string;
  let degree: number;

  if (profile.isSelf) {
    // 마지막 노드가 당사자 본인 — 경로 그대로
    // parts 마지막은 당사자와의 관계 표현이므로, "짱구님의 지인(영희)" 형태로 연결
    const relParts = parts.slice(1); // 첫 인물 이후
    sentence =
      relParts.length === 0
        ? `${parts[0]}` // 1촌: "짱구님" — 관계는 rels[0]
        : `${parts[0]}의 ${relParts.join("의 ")}`;
    // 1촌인 경우 관계 라벨 붙이기: "짱구님의 지인" 형태가 아니라 당사자가 짱구 자신
    degree = rows[0].depth;
    if (relParts.length === 0) {
      // 열람자와 직접 연결된 본인 — "OO님과 아는 사이" 대신 관계 라벨
      const relLabel = REL_LABEL[(rels[0] as RelationType) ?? "FRIEND"] ?? "지인";
      const u = byId.get(path[1]);
      sentence = u?.allowNameInPath
        ? `나의 ${relLabel} (${u.name})`
        : `나의 ${relLabel}`;
    }
  } else {
    // 대리 등록: 경로는 소유자(중매인)까지 + 마지막 칸 relationToOwner
    sentence = `${parts.join("의 ")}의 ${lastRel}`;
    nodes.push({ name: profile.name, rel: lastRel! });
    degree = rows[0].depth + 1;
  }

  if (degree > 6) {
    return { degree, sentence: "아득히 먼 인연 ✨", nodes: [], far: true };
  }

  return { degree, sentence, nodes, far: false };
}
