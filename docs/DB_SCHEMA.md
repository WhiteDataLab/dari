# DB_SCHEMA.md — 데이터 모델 & 관계 그래프 설계

> 연관 문서: `PROJECT_SPEC.md`(기획), `PAGE_IA.md`(화면)
> DB: Supabase PostgreSQL / ORM: Prisma 6

---

## 1. 설계 원칙

1. **User(회원)와 Profile(소개팅 대상)을 분리한다.**
   - 회원이 아닌 지인도 프로필로 등록될 수 있음 (중매인 대리 등록)
   - 본인 프로필은 `Profile.isSelf = true` + `userId` 연결
2. **관계 그래프의 노드는 User, 엣지는 두 종류다.**
   - 가입 추천 엣지: `User.referredById` + 관계 유형 (가입 시 1회 생성, 불변)
   - 프로필 소유 엣지: `Profile.ownerId` + `relationToOwner` (경로의 마지막 한 칸)
3. **전화번호는 성사 전까지 API 응답에서 서버 사이드로 차단한다.** (select 제외를 기본값으로)

## 2. Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─────────────────────────────
// 회원 & 인증
// ─────────────────────────────

enum RelationType {
  FRIEND      // 지인
  FAMILY      // 가족
  COWORKER    // 직장동료
  SENIOR      // 선배
  JUNIOR      // 후배
  COUSIN      // 사촌
  ETC         // 기타
  SELF        // 본인 (Profile.relationToOwner 전용)
}

enum VerificationMethod {
  COMPANY_EMAIL // 회사 이메일 인증
  VOUCH         // 지인 보증
}

enum UserRole {
  MEMBER
  ADMIN
}

model User {
  id                 String             @id @default(cuid())
  role               UserRole           @default(MEMBER)
  email              String             @unique
  emailVerifiedAt    DateTime?
  verificationMethod VerificationMethod @default(COMPANY_EMAIL)

  name       String
  phone      String   // AES 암호화 저장 (앱 레이어에서 암복호화)
  birthDate  DateTime
  company    String

  // 추천 관계 (그래프 엣지 #1)
  referralCode     String        @unique @default(cuid()) // 내가 발급하는 코드
  referredById     String?                                // 나를 추천한 회원
  referredBy       User?         @relation("Referral", fields: [referredById], references: [id])
  referrals        User[]        @relation("Referral")
  relationToReferrer RelationType?                        // 추천인과 나의 관계

  // 개인정보 동의
  allowNameInPath    Boolean @default(true)  // 관계 경로에 실명 표시 동의
  agreedTermsAt      DateTime
  agreedPrivacyAt    DateTime

  profiles       Profile[]       @relation("ProfileOwner")
  selfProfile    Profile?        @relation("SelfProfile")
  sentLikes      Like[]          @relation("LikeActor")
  proposals      MatchProposal[] @relation("Matchmaker")
  notifications  Notification[]
  vouchesGiven   VouchRequest[]  @relation("Voucher")
  vouchReceived  VouchRequest?   @relation("Vouchee")
  blocksMade     Block[]         @relation("Blocker")
  blocksReceived Block[]         @relation("Blocked")
  reportsMade    Report[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([referredById])
}

model EmailVerification {
  id        String   @id @default(cuid())
  email     String
  code      String   // 6자리
  expiresAt DateTime // 발급 후 10분
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([email, code])
}

model VouchRequest {
  id        String   @id @default(cuid())
  voucherId String            // 보증인 (인증된 회원)
  voucher   User     @relation("Voucher", fields: [voucherId], references: [id])
  voucheeId String   @unique  // 보증 대상 (가입 대기자)
  vouchee   User     @relation("Vouchee", fields: [voucheeId], references: [id])
  status    VouchStatus @default(PENDING)
  createdAt DateTime @default(now())
  decidedAt DateTime?
}

enum VouchStatus {
  PENDING
  APPROVED
  DENIED
}

// ─────────────────────────────
// 소개팅 프로필
// ─────────────────────────────

enum Gender { MALE FEMALE }

enum BodyType { SLIM SLENDER NORMAL CHUBBY MUSCULAR GLAMOROUS }

enum Religion { NONE PROTESTANT CATHOLIC BUDDHIST ETC }

enum DrinkingHabit { NEVER SOMETIMES OFTEN }

enum SmokingHabit { NON_SMOKER E_CIGARETTE SMOKER }

enum ProfileStatus {
  ACTIVE   // 탐색 노출 중 (⬛ 대기)
  ENGAGED  // 호감/제안 진행 중 (🟨) — Like/Proposal 존재 여부로 파생 계산도 가능
  MATCHED  // 성사, 졸업 (🟩) — 피드에서 숨김
  HIDDEN   // 소유자가 숨김
}

model Profile {
  id      String  @id @default(cuid())
  ownerId String            // 등록자 (본인 or 중매인)
  owner   User    @relation("ProfileOwner", fields: [ownerId], references: [id])
  isSelf  Boolean @default(false)
  userId  String? @unique   // isSelf=true일 때 본인 User 연결
  user    User?   @relation("SelfProfile", fields: [userId], references: [id])

  relationToOwner RelationType // 등록자와의 관계 (isSelf면 SELF). 경로의 마지막 칸

  // 대리 등록 시 당사자 동의 확인
  consentConfirmed Boolean  @default(false)
  consentNotifiedAt DateTime?
  delegatePhotoConsent Boolean @default(false) // 사진 열람 수락 권한을 중매인에게 위임 (대리 등록 여성)

  name      String
  gender    Gender
  birthYear Int
  heightCm  Int
  bodyType  BodyType
  phone     String        // 암호화 저장, 성사 전 응답 미포함
  areaSido  String        // 시/도
  areaGugun String        // 구/군
  company   String
  companyMasked Boolean   @default(false) // true면 업종 수준만 노출
  jobTitle  String
  religion  Religion
  drinking  DrinkingHabit
  drinkCapacity String?   // drinking=OFTEN일 때
  smoking   SmokingHabit
  isDivorced Boolean      @default(false)
  mbti      String?
  hobbies   String[]      // 태그 칩, 최대 5
  idealType String?       @db.VarChar(200)
  loveView  String?       @db.VarChar(200)
  recommenderComment String? @db.VarChar(100) // 추천인의 한 줄 소개

  status ProfileStatus @default(ACTIVE)

  photos        ProfilePhoto[]
  likesSent     Like[]  @relation("LikeFrom")
  likesReceived Like[]  @relation("LikeTo")
  proposalsA    MatchProposal[] @relation("ProposalA")
  proposalsB    MatchProposal[] @relation("ProposalB")
  matchesA      Match[] @relation("MatchA")
  matchesB      Match[] @relation("MatchB")
  reports       Report[]
  flags         ModerationFlag[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
  @@index([status, gender])
}

model ProfilePhoto {
  id        String  @id @default(cuid())
  profileId String
  profile   Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  url       String  // Supabase Storage public URL
  isMain    Boolean @default(false)
  sortOrder Int     @default(0)

  @@index([profileId])
}

// ─────────────────────────────
// 호감 / 제안 / 성사
// ─────────────────────────────

enum LikeStatus {
  PENDING        // 1단계: 남성 프로필 전송, 여성 응답 대기 (7일)
  PHOTO_GRANTED  // 2단계: 여성 수락 → 사진 공개, 남성 최종 결정 대기 (48시간)
  ACCEPTED       // 3단계: 최종 수락 → Match 생성
  REJECTED
  EXPIRED        // 기한 무응답 (1단계 7일 / 3단계 48시간)
}
// 여성 발신 Like는 생성 시점에 PhotoAccess 동시 발급 → PHOTO_GRANTED 단계 없이
// 남성의 수락/거절 1회로 종료 (PENDING → ACCEPTED/REJECTED)

enum RejectReason {
  NOT_READY        // 지금은 연애 생각이 없어요
  NOT_MY_TYPE      // 이상형과 조금 달랐어요
  KNOW_EACH_OTHER  // 아는 사이라서요
  TOO_FAR          // 거리가 멀어서요
  NO_REASON        // 사유 없이 거절
}

model Like {
  id            String     @id @default(cuid())
  fromProfileId String
  fromProfile   Profile    @relation("LikeFrom", fields: [fromProfileId], references: [id])
  toProfileId   String
  toProfile     Profile    @relation("LikeTo", fields: [toProfileId], references: [id])
  actorUserId   String     // 실제 버튼 누른 회원 (본인 or 중매인)
  actor         User       @relation("LikeActor", fields: [actorUserId], references: [id])
  status        LikeStatus @default(PENDING)
  rejectReason  RejectReason?
  expiresAt     DateTime   // 1단계 기한: 생성 + 7일
  photoGrantedAt DateTime? // 여성 수락(사진 공개) 시각
  finalDeadline  DateTime? // 3단계 기한: photoGrantedAt + 48시간
  respondedAt   DateTime?
  createdAt     DateTime   @default(now())

  @@unique([fromProfileId, toProfileId]) // 재호감 방지 (거절 후 영구 비노출)
  @@index([toProfileId, status])
}

enum PhotoAccessSource {
  FEMALE_GRANT   // 여성이 남성의 프로필 전송을 수락
  FEMALE_INITIATE // 여성 발신 호감 (사진 동봉)
  MATCH          // 성사
}

// 여성 사진 열람권. 모든 여성 사진 응답은 이 테이블을 통과해야 함 (서버 사이드 gate)
model PhotoAccess {
  id        String   @id @default(cuid())
  profileId String   // 사진 소유 프로필 (여성)
  viewerId  String   // 열람 허용된 회원 (남성)
  source    PhotoAccessSource
  likeId    String?  // 발급 근거 Like
  grantedAt DateTime @default(now())
  revokedAt DateTime? // 거절/만료/차단 시 즉시 세팅 → 열람 차단

  @@unique([profileId, viewerId])
  @@index([viewerId, revokedAt])
}

enum ProposalStatus {
  PENDING
  MATCHED       // 양측 수락
  REJECTED
  EXPIRED
}

model MatchProposal {
  id           String  @id @default(cuid())
  matchmakerId String
  matchmaker   User    @relation("Matchmaker", fields: [matchmakerId], references: [id])
  profileAId   String
  profileA     Profile @relation("ProposalA", fields: [profileAId], references: [id])
  profileBId   String
  profileB     Profile @relation("ProposalB", fields: [profileBId], references: [id])
  acceptedA    Boolean?
  acceptedB    Boolean?
  rejectReason RejectReason?
  status       ProposalStatus @default(PENDING)
  createdAt    DateTime @default(now())
  decidedAt    DateTime?

  @@index([matchmakerId, status])
}

model Match {
  id          String   @id @default(cuid())
  profileAId  String
  profileA    Profile  @relation("MatchA", fields: [profileAId], references: [id])
  profileBId  String
  profileB    Profile  @relation("MatchB", fields: [profileBId], references: [id])
  sourceLikeId     String? @unique
  sourceProposalId String? @unique
  matchmakerId     String? // 리더보드 집계용
  degreeOfSeparation Int?  // 성사 시점 촌수 스냅샷 ("4다리 커플")
  phoneRevealedAt  DateTime @default(now())
  createdAt        DateTime @default(now())

  @@unique([profileAId, profileBId])
}

// ─────────────────────────────
// 알림 / 차단 / 신고
// ─────────────────────────────

enum NotificationType {
  LIKE_RECEIVED
  LIKE_ACCEPTED
  LIKE_REJECTED
  LIKE_EXPIRED
  PROPOSAL_RECEIVED
  MATCH_CREATED
  VOUCH_REQUESTED
  PROFILE_REGISTERED_CONSENT // 대리 등록 당사자 통지
}

model Notification {
  id      String @id @default(cuid())
  userId  String
  user    User   @relation(fields: [userId], references: [id])
  type    NotificationType
  payload Json   // { likeId, profileId, ... }
  readAt  DateTime?
  createdAt DateTime @default(now())

  @@index([userId, readAt])
}

model Block {
  id        String @id @default(cuid())
  blockerId String
  blocker   User   @relation("Blocker", fields: [blockerId], references: [id])
  blockedId String
  blocked   User   @relation("Blocked", fields: [blockedId], references: [id])
  createdAt DateTime @default(now())

  @@unique([blockerId, blockedId])
}

enum ReportReason {
  OBSCENE       // 음란성
  AD_SPAM       // 광고·스팸
  ILLEGAL       // 불법 (도박·성매매 등)
  FAKE_INFO     // 허위 정보
  NO_CONSENT    // 당사자 미동의 등록
  CONTACT_LEAK  // 연락처·SNS 노출 (우회 교환)
  ETC
}

enum ReportStatus { PENDING RESOLVED_REMOVED RESOLVED_DISMISSED }

model Report {
  id         String @id @default(cuid())
  reporterId String
  reporter   User   @relation(fields: [reporterId], references: [id])
  profileId  String
  profile    Profile @relation(fields: [profileId], references: [id])
  photoId    String?       // 개별 사진 신고 시
  reason     ReportReason
  detail     String?
  status     ReportStatus @default(PENDING)
  resolvedById String?     // 처리 관리자 (감사 추적)
  resolvedAt DateTime?
  createdAt  DateTime @default(now())

  @@index([status])
}

// ─────────────────────────────
// 자동 감지 & 제재
// ─────────────────────────────

enum FlagSource { AUTO_TEXT AUTO_IMAGE USER_REPORT RATE_LIMIT }
enum FlagLabel  { OBSCENE AD_SPAM ILLEGAL CONTACT_LEAK }
enum FlagStatus {
  PENDING    // 검토 대기
  DISMISSED  // 기각 (오탐)
  REMOVED    // 삭제/숨김 확정
}

// 자동 감지 결과. autoBlocked=true 항목은 생성과 동시에 대상 콘텐츠 비공개 (선조치 후검토)
model ModerationFlag {
  id        String     @id @default(cuid())
  profileId String
  profile   Profile    @relation(fields: [profileId], references: [id])
  photoId   String?    // 사진 감지 시
  field     String?    // 텍스트 감지 시 대상 필드명 (예: "idealType")
  source    FlagSource
  labels    FlagLabel[]
  score     Float?     // 모더레이션 API 신뢰도 (0~1)
  autoBlocked Boolean  @default(false)
  status    FlagStatus @default(PENDING)
  reviewedById String? // 처리 관리자
  reviewedAt DateTime?
  createdAt DateTime   @default(now())

  @@index([status, createdAt])
}

enum SanctionType { WARNING SUSPEND_7D BAN }

model Sanction {
  id         String @id @default(cuid())
  userId     String       // 대상 회원
  type       SanctionType
  reason     String
  flagId     String?      // 근거 ModerationFlag / Report id
  issuedById String       // 부과 관리자
  expiresAt  DateTime?    // SUSPEND류만 사용
  createdAt  DateTime @default(now())

  @@index([userId])
}
```

## 3. 상태 컬러 매핑 (카드덱)

| ProfileStatus / 파생 상태 | 카드 표시 |
|---|---|
| ACTIVE + 진행 중 Like/Proposal 없음 | ⬛ 검정 (대기) |
| ACTIVE + PENDING Like/Proposal 존재 | 🟨 노랑 (진행 중) |
| MATCHED | 🟩 초록 (졸업) |
| HIDDEN | 회색 반투명 |

> 구현 권장: 🟨는 별도 상태값 저장 대신 `PENDING` 존재 여부로 파생 계산 (상태 불일치 버그 방지). `ENGAGED` enum은 예약만 해두고 미사용.

## 4. 관계 경로 계산 (핵심 로직)

### 4.1 그래프 정의
- 노드: `User`
- 엣지: `(referredById, id)` 쌍 — **양방향으로 취급** (짱구가 영희를 추천했어도 "영희의 지인 짱구"로 역방향 표현 가능)
- 목표: `열람자 User` → `Profile.ownerId` 최단 경로 (BFS) + 마지막 칸 `Profile.relationToOwner`

### 4.2 PostgreSQL 재귀 CTE

```sql
-- $1 = 열람자 userId, $2 = 프로필 소유자 userId
WITH RECURSIVE edges AS (
  -- 추천 엣지를 양방향으로 펼침
  SELECT "referredById" AS a, id AS b, "relationToReferrer" AS rel FROM "User" WHERE "referredById" IS NOT NULL
  UNION ALL
  SELECT id AS a, "referredById" AS b, "relationToReferrer" AS rel FROM "User" WHERE "referredById" IS NOT NULL
),
paths AS (
  SELECT b AS node, ARRAY[a, b] AS path, ARRAY[rel::text] AS rels, 1 AS depth
  FROM edges WHERE a = $1
  UNION ALL
  SELECT e.b, p.path || e.b, p.rels || e.rel::text, p.depth + 1
  FROM paths p
  JOIN edges e ON e.a = p.node
  WHERE NOT e.b = ANY(p.path)   -- 사이클 방지
    AND p.depth < 6             -- 최대 6촌 탐색
)
SELECT path, rels, depth
FROM paths
WHERE node = $2
ORDER BY depth
LIMIT 1;
```

### 4.3 문장 렌더링 규칙 (앱 레이어)

```
입력: path = [나, 짱구, 영희, 맹구], rels = [지인, 지인, 지인], 마지막 칸 relationToOwner
출력: "{path[1].name}님의 {rels[0]}({path[2].name})의 {rels[1]}({path[3].name})의 {relationToOwner}"
```

- 규칙 1: 경로 첫 인물만 `OO님` 존칭, 이후는 괄호 실명
- 규칙 2: `allowNameInPath = false`인 중간 인물은 이름 생략 → `...의 지인의...`
- 규칙 3: 촌수 = `depth + 1` (relationToOwner 한 칸 포함) → 뱃지 `🔗 N다리`
- 규칙 4: 6촌 초과/미발견 → `아득히 먼 인연 ✨`
- 규칙 5: 경로 결과는 `(viewerId, ownerId)` 키로 캐시 (동일 세션 재계산 방지). 회원 수백 명 규모에선 성능 문제 없음.

### 4.4 규모 확장 시 (참고)
- 수천 명 이상으로 커지면: 경로 테이블 사전 계산(materialized) 또는 그래프 DB 검토. MVP에서는 불필요.

## 5. 보안 규칙 요약

1. `phone` 컬럼: 앱 레이어 AES-256-GCM 암호화. 복호화는 ① 본인/등록 중매인 조회 ② Match 성사 응답, 두 경로에서만
2. Prisma 기본 select에서 `phone` 제외 — 명시적으로 요청하는 서비스 함수에서만 포함
3. 거절/차단된 상대 프로필: 피드 쿼리와 상세 API 양쪽에서 필터 (`Like.status = REJECTED` OR `Block` 존재 시 404)
4. 사진 Storage 버킷: public read + 추측 불가 경로(cuid), 삭제 시 Storage 파일 동반 삭제
5. **여성 사진 비대칭 gate**: 여성 `ProfilePhoto` 원본 URL은 `PhotoAccess`(revokedAt null) 존재 시에만 API 응답에 포함. 미보유 남성에게는 업로드 시 생성해 둔 실루엣 파생 이미지 URL만 응답. **프론트 CSS blur 절대 금지** (원본 URL 노출)
6. 거절/만료/차단 트랜잭션에 `PhotoAccess.revokedAt` 세팅 포함 — 열람권 회수 누락 방지

## 6. 관리자 대시보드 통계 쿼리

MVP 규모(수백 명)에서는 실시간 집계 쿼리로 충분. 수천 명 이상 시 일별 스냅샷 테이블(DailyStat) 전환.

```sql
-- 성비 (활성 프로필 기준)
SELECT gender, COUNT(*) FROM "Profile"
WHERE status = 'ACTIVE' GROUP BY gender;

-- 매칭 퍼널 (최근 30일): 호감 발신 → 사진 공개 → 최종 성사
SELECT
  COUNT(*)                                                        AS sent,
  COUNT(*) FILTER (WHERE "photoGrantedAt" IS NOT NULL)            AS photo_granted,
  COUNT(*) FILTER (WHERE status = 'ACCEPTED')                     AS matched
FROM "Like"
WHERE "createdAt" > now() - interval '30 days';

-- 성사 지표: 평균 촌수, 중매 개입 비율
SELECT AVG("degreeOfSeparation")                    AS avg_degree,
       AVG(("matchmakerId" IS NOT NULL)::int) * 100 AS matchmaker_pct
FROM "Match";

-- 안전 지표: 미처리 큐
SELECT
  (SELECT COUNT(*) FROM "Report"         WHERE status = 'PENDING') AS reports_pending,
  (SELECT COUNT(*) FROM "ModerationFlag" WHERE status = 'PENDING') AS flags_pending;
```

## 7. 텍스트 자동 감지 규칙 (AUTO_TEXT 초기 세트)

```
전화번호   : (01[016789])[-.\s]?\d{3,4}[-.\s]?\d{4}
URL       : https?:// | www\. | \.com|\.kr|\.net (한글 혼용 우회 포함: "닷컴")
카톡/SNS   : "카톡", "카카오 아이디", "ㅋㅌ", "인스타", "@아이디" 패턴
계좌       : 은행명 + 10~14자리 숫자 조합
금칙어 사전 : 도박·성매매·대출 키워드 (운영하며 증분 관리, DB 테이블화)
```
- 확정 패턴(전화번호·계좌)은 저장 거부, 의심 패턴(키워드)은 저장 허용 + ModerationFlag(PENDING) 생성
- 우회 표기(공백 삽입, 자모 분리 "ㅇ1ㅇ")는 정규화 전처리 후 검사
