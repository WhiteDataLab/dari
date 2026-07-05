# HANDOFF.md — 세션 인수인계

> 최신 내용이 위로 오도록 기록한다.

## 2026-07-05 (4차) — 지인의 지인 + 산업 분야 + 사진 편집 강화 (migration 6_industry_relation, 배포 완료)

### 사용자 요구 → 조치
1. **지인의 지인 등록**: `RelationType.FRIEND_OF_FRIEND` 추가 (폼 관계 칩 "지인의 지인"). 관계 경로 문장은 "…의 지인의 지인", 촌수는 미가입 지인 1명을 거치므로 **+2칸** 계산 (`relationPath.ts`)
2. **산업 분야**: `Profile.industry` (기존 행 nullable, 신규/수정은 필수 — 16종 셀렉트). 직장명 마스킹 시 상세에 "OO (사명 비공개)"로 표시, 비마스킹 시 "업계" 행 별도 표시. 공유 페이지(/s)에도 업계 행 추가 (회사명은 여전히 미노출)
3. **사진 편집 강화**: ① `PATCH /api/photos` `{id, action:"setMain"}` — 대표사진 변경 (트랜잭션으로 단일 대표 보장), PhotoUploader에 "대표로 설정" 버튼 ② 프로필 상세에 "🖼 사진" 버튼 → `/p/[id]/edit?step=photo` 로 사진 단계 직행 (`ProfileForm.startAtPhotos`)

### 메모
- 기존 프로필은 industry가 null — 수정 화면 진입 시 선택 강제됨 (zod 필수)
- migration `6_industry_relation` 프로덕션 적용 완료

---

## 2026-07-05 (3차) — 비가입자 공유 링크 + 중매인 모드 안내 (migration 5_share, 배포 완료)

### 사용자 요구 → 조치
1. **"추천만 하는데 왜 내 프로필을 입력해야 하나"**: 실제로는 프로필 없이 열람 가능했으나 홈 배너("내 프로필을 완성해 주세요")가 필수처럼 보였음 → 카드덱만 있는 회원에겐 "🃏 중매인 모드로 둘러보는 중" 배너로 교체. 스펙 §7.8 명문화. **남성 중매인의 여성 사진 잠금(§7.2)은 보안 원칙이라 유지** — 완화하려면 스펙 변경 필요
2. **카드덱 프로필 카톡 공유 (비가입자 열람)**: `Profile.shareToken` + 공개 페이지 `/s/[token]` (auth 미들웨어 public 등록). 상세 페이지 "📤 공유" 버튼(편집 가능자, ACTIVE만) → Web Share 시트(모바일=카톡 포함)/링크 복사. 공개 범위는 닉네임 기준(실명·연락처·회사명 제외, 여성 사진 잠금). OG 메타로 카톡 미리보기. 하단 CTA → `/signup?code=추천코드` 자동 입력(가입 페이지에 쿼리 프리필 추가). 스펙 §7.7

### 메모
- 공유 회수 API는 있음(`action:"unshare"`) — 버튼 UI는 TODO(phase-1.5)
- migration `5_share` 프로덕션 적용 완료

---

## 2026-07-05 (2차) — 랜덤 닉네임 + 이름·연락처 불변 (migration 4_nickname, 배포 완료)

### 사용자 요구 → 조치
1. **성사 전 실명 비공개 (랜덤 닉네임)**: `Profile.nickname` 신설 (생성 시 랜덤 부여, 예 "포근한 수달", `src/lib/nickname.ts`). 기존 프로필은 마이그레이션에서 SQL로 백필. 실명은 ①내 프로필 ②성사된 상대에게만 — 그 외 탐색 피드/상세/호감함/관계경로 nodes/GET API 전부 닉네임. 상세엔 "🔒 실명과 연락처는 매칭이 성사되면 공개돼요" 안내, 본인 화면(MY·상세·카드덱)엔 "🎭 다른 회원에게는 OO로 보여요" 표시. 스펙 §7.6
2. **이름·연락처 최초 등록 후 수정 불가 (도용 방지)**: `profileUpdateSchema`에서 name/phone 제외 (서버가 무시), 수정 폼에선 두 필드 disabled + 안내 문구. 수정 화면에 전달되는 연락처도 마스킹(010-****-1234)으로 변경 — 원본은 클라이언트로 안 감. 스펙 §7.5 갱신

### 주의점
- 실명 공개 = 성사(Match) 기준. 보낸 호감 탭의 ACCEPTED(성사) 카드만 실명, 나머지 상태는 닉네임
- 관계 경로 중간 인물(회원) 실명은 기존 `allowNameInPath` 동의 기반 유지 (이번 변경 아님)
- 클레임 매칭(이름+연락처 일치)은 불변이라 더 안전해짐 — 등록 후 바꿔치기 불가
- 닉네임 단어 목록은 nickname.ts와 migration 4_nickname SQL 양쪽에 있음 (백필용 — 이후엔 TS만 사용)
- migration `4_nickname` 프로덕션 적용 완료

## 2026-07-05 — 사용자 테스트 피드백 4건 반영 (migration 3_claim, 배포 완료)

### 사용자 피드백 → 조치
1. **온보딩 "나중에 하기" 무반응**: 버튼 자체는 정상(`/home` Link)이었고, 원인은 **느린 서버 렌더링 동안 아무 피드백이 없던 것** (콜드스타트 + /home의 카드별 관계경로 재귀 CTE). 아래 2번으로 해결
2. **메뉴 이동 중 피드백 없음**: 전역 `NavigationIndicator` 추가 — 내부 링크 클릭·뒤로가기 감지, **250ms 이상 걸리면 화면 가운데 "화면을 불러오는 중이에요…" 말풍선** 표시, 경로 변경 시 자동 숨김(failsafe 15초). `app/loading.tsx` + `app/(main)/loading.tsx` 스켈레톤도 추가 (탭 전환 시 즉시 표시)
3. **지인 프로필 수정 불가**: 전체 항목 수정 구현 — `PATCH /api/profiles/[id]` `action:"update"` (zod 검증 + 연락처 우회 감지 + phone 재암호화), `/p/[id]/edit` 페이지 (ProfileForm 수정 모드: 초기값 프리필, 사진 관리 포함), 상세 페이지 우상단 "✏️ 수정" 버튼, MY>내 프로필에 "항목 수정하기" 링크
4. **본인 직접 가입 시 대리 등록 프로필 연동 (클레임)**: 스펙 §7.4 신설
   - 가입 시 이름+연락처(HMAC 해시) 정확 일치하는 미연동 대리 프로필 자동 연동 (`userId`+`claimedAt`), 추천인에게 `PROFILE_CLAIMED` 알림
   - 온보딩/MY>내 프로필에서 당사자가 결정: "같이 수정"(`ownerCanEdit=true`) vs "나만 수정"(추천인 열람만) → `EDIT_SHARE_DECIDED` 알림
   - 편집 권한 판정은 `src/lib/profileAccess.ts::canEditProfile` 단일 함수 (프로필 PATCH·사진 업로드/삭제·수정 페이지 공용)

### 구조 변경
- **"내 프로필" 조회 규칙 변경**: `{ userId, isSelf: true }` → `{ userId }` (8곳: home/likes/photoGate/visibility/session/me·avoid/me·profile/상세). `Profile.userId`가 unique라 의미 동일하며, 클레임된 프로필도 본인 프로필로 동작 (호감 전송, 사진 gate, 회피 설정)
- 클레임된 계정은 본인 프로필 중복 생성 불가 (POST /api/profiles 409)
- 피드·상세의 거절 이력 제외 계산에 클레임 프로필 포함 (`OR: [{ownerId}, {userId}]`)
- 프로필 입력 zod 스키마를 `src/lib/profileInput.ts`로 분리 (생성/수정 공용)
- migration `3_claim` 프로덕션 적용 완료: Profile.claimedAt/ownerCanEdit/editShareDecidedAt + NotificationType 2종

### 검증
- `npm run build` 통과. 로컬 프리뷰(3001): 랜딩/가입/로그인 렌더 정상, 이동 인디케이터가 느린 이동에서 표시 → 도착 시 소멸 확인, 빠른 이동(250ms 미만)에선 미표시(의도). 콘솔/서버 에러 0. 실데이터 미생성
- `next lint`는 ESLint 미설정으로 대화형 프롬프트가 떠서 실행 불가 (별도 설정 필요 시 `npx @next/codemod@canary next-lint-to-eslint-cli .`)

### 남은 일 / 메모
- **/home 피드 성능**: 카드마다 관계경로 재귀 CTE 실행 (최대 60회) — 회원 늘면 느려짐. 배치 계산 or 캐싱 필요 (TODO(phase-2))
- 클레임 시 동일인 대리 프로필이 2개 이상이면 최초 1개만 연동됨 (userId unique 제약)
- 클레임 결정 전에는 추천인 편집 권한 유지 (기존 동작과 동일)

## 2026-07-04 (밤) — 전체 보안 감사 + 강화 (migration 2_security, 배포 완료)

### 감사 결과
- 커밋 이력 시크릿 스캔: `.env`/`.env.local` 미커밋 확인, DB 비밀번호·secret key·앱 비밀번호 등 유효 시크릿 커밋 이력 없음. HANDOFF에 남아있던 **무효화된 옛 Gmail 앱 비밀번호 문자열만 발견·제거** (이미 로그인 불가한 값, git 이력에는 잔존 — repo는 private 유지 권장)
- 위험 싱크 없음: dangerouslySetInnerHTML / queryRawUnsafe / eval / 하드코딩 호스트 0건. SQL은 전부 파라미터화($queryRaw 태그드 템플릿)
- 기존 안전장치 재확인: phone AES-256-GCM + 성사 전 API 미포함, 여성 사진 서버사이드 gate, IDOR(소유자 검사) 전 라우트 커버, 세션 쿠키 SameSite=Lax(CSRF 완화)

### 발견·수정한 취약점 (전부 배포됨)
1. 인증코드 재사용: 로그인 검증이 usedAt 미확인 → 10분 내 replay 가능 → 소진 처리로 차단
2. 6자리 코드 무차별 대입: 시도 제한 없음 → `EmailVerification.attempts` 5회 초과 시 무효화
3. 메일 폭탄: 이메일당 제한만 존재 → 전역 시간당 30회 상한 추가
4. 추천코드 열거로 회원 실명 수집 가능(비인증 API) → 이메일 인증 통과자만 조회 가능
5. API 응답에 phoneHash 노출 → 제거 / 업로드 파일 타입 미검증 → image/* + sharp 실패 400
6. 보안 헤더 부재 → XFO(DENY)·nosniff·Referrer-Policy·Permissions-Policy 추가
7. 첫 가입자 ADMIN 레이스 → 트랜잭션 내 재확인

### 검증
- 보안 E2E: 헤더/5회 잠금/추천코드 게이트/replay 차단/2번째 가입자 MEMBER/비로그인 401 — 통과 후 테스트 계정 즉시 삭제
- **실서비스 가동 시작**: 운영자 계정(백종환, ADMIN) 프로덕션 가입 확인 — 이후 로컬 E2E는 라이브 DB 공유이므로 실데이터 미생성·즉시삭제 원칙 준수할 것

### 수용한 잔여 리스크 (10~30명 규모 기준)
- IP 단위 레이트 리밋 없음 (서버리스 + DB 카운트 방식으로 대체) / phone 암호화·HMAC이 같은 키(PHONE_ENC_KEY) 사용 / Vercel cron은 CRON_SECRET 설정 시 자동 Bearer 첨부로 보호됨

---

## 2026-07-04 (저녁) — 첫 가입 버그 수정 + 노출 회피 기능 (배포 완료)

### 완료
- **버그 수정**: 첫 회원(운영자)인데 가입 화면이 추천코드를 강제 → 회원 0명이면 `GET /api/signup`의 `needsReferral=false`로 코드 단계 자동 건너뜀. **프로덕션(dari-five.vercel.app) 배포·확인 완료**
- **같은 회사 상호 비노출**: `Profile.avoidSameCompany` (기본 ON, 프로필 폼 체크박스 + MY>아는 사람 피하기 토글). 회사명 정규화(소문자/공백/"(주)" 제거) 비교, 한쪽이라도 ON이면 피드·상세(404)·호감(404)에서 상호 숨김. `src/lib/visibility.ts`
- **아는 사람 피하기**: `/me/avoid`에서 번호 등록(최대 200개) → HMAC-SHA256 해시만 저장(`ContactBlock`, 원본 미보관, 라벨 010-****-1234). `User.phoneHash`/`Profile.phoneHash`와 매칭해 **상호 비노출**. 대리 등록 당사자(비회원) 차단 목록은 TODO(phase-2)
- migration `1_avoidance` 프로덕션 적용 완료. 스펙 §7.3 추가
- E2E #2: 10/11 통과 (1건은 테스트 순서 이슈 — 호감 차단 검사 전에 사진 미등록 400이 먼저 걸림. 차단 로직 자체는 상세 404로 동일 함수 검증됨). 테스트 데이터 정리 완료

### 트러블슈팅
- **P3005**: 첫 `migrate deploy`가 테이블은 만들었는데 `_prisma_migrations` 기록이 없었음 → `prisma migrate resolve --applied 0_init`으로 baseline 후 deploy 정상화
- 새 마이그레이션 생성은 shadow DB가 없어 `prisma migrate diff --from-url <라이브DB> --to-schema-datamodel --script` 방식 사용

---

## 2026-07-04 (오후) — 키 반영 · DB 구축 · E2E 통과

### 완료
- `.env.local`/`.env` 실제 값 반영 (Supabase secret key, DB pooler, Gmail 앱 비밀번호 재발급분)
- **DB 마이그레이션 완료** (`prisma migrate deploy`, 테이블 전체 생성)
- **Storage `photos` 버킷 생성** (public, API로 생성)
- **SMTP 정상 확인** (테스트 메일 발송 성공 — 첫 앱 비밀번호는 BadCredentials, 재발급분으로 해결)
- **E2E 23/23 통과** (실제 API+DB): 첫 가입자 ADMIN / 전화번호 암호화 / 모더레이션 저장 거부 / 추천코드 게이트 / 관계 경로 1다리 / 여성 사진 서버사이드 잠금 / 여성 발신 호감 → 사진 공개 → 성사 / 번호 복호화 공개 / 프로필 졸업 / 알림. 테스트 데이터는 DB·Storage 모두 삭제 완료 (잔여 0)
- GitHub push 완료

### 연결 정보 (중요)
- **DB 직접 연결(db.*.supabase.co:5432)은 IPv6 전용이라 이 PC에서 불통.** pooler 사용:
  - 런타임: `aws-1-ap-northeast-2.pooler.supabase.com:6543` + `?pgbouncer=true`
  - 마이그레이션(DIRECT_URL): 같은 호스트 `:5432` (session pooler)
  - 사용자명은 `postgres.pscskgdxhnlojzygrptt` 형식
- Storage 오브젝트 삭제 API는 단건 DELETE가 아니라 `DELETE /storage/v1/object/{bucket}` + `{prefixes:[...]}` 벌크 형식 (앱 코드는 supabase-js `.remove()`라 문제 없음)

### 남은 일
- **Vercel import만 남음** (사용자가 대시보드에서 Add New → Project → WhiteDataLab/dari → 환경변수 붙여넣기 → Deploy)
- 배포 후: 운영자가 실제 이메일로 첫 가입 (→ 자동 ADMIN, 추천코드 면제) → MY 탭 추천코드로 지인 초대 시작

---

## 2026-07-04 (오전) — Phase 1 MVP 구축 + 배포 준비

### 완료
- Phase 1 전체 구현 (커밋 `30549b9`): 가입(이메일 코드+추천코드) / 본인·지인 프로필 / 피드 / 상세+관계 경로(재귀 CTE) / 비대칭 사진 gate / 호감 3단계·2단계 / 성사 트랜잭션+번호 공개 / 카드덱 / 알림 / 만료 크론
- `npm run build` 통과, 로컬 프리뷰(port 3001)에서 랜딩·가입 UI 확인
- GitHub push 완료: https://github.com/WhiteDataLab/dari (git credential manager로 인증됨, gh CLI 없음)
- `.env.local`: Supabase URL·Gmail SMTP 반영 (AUTH_SECRET, PHONE_ENC_KEY는 로컬 생성값)

### 미완료 / 블로커 (사용자 입력 대기)
1. **DB 비밀번호 없음** — 연결 문자열이 `[YOUR-PASSWORD]` 플레이스홀더. 받으면: `.env.local` 갱신 → `npx prisma migrate deploy`
   - 분실 시: Supabase → Settings → Database → Reset database password
   - **주의**: 직접 연결(5432)만 받았음. Vercel 배포용으론 Transaction pooler(6543, `...pooler.supabase.com`) 문자열도 필요 (서버리스에서 직접 연결은 커넥션 고갈)
2. **Supabase Secret key 없음** — 받은 건 publishable(`sb_publishable_...`)뿐. 사진 업로드(서버 사이드, RLS 우회)에는 `sb_secret_...` 필요: Settings → API keys → Secret keys → Create
   - 받으면 `SUPABASE_SERVICE_ROLE_KEY`에 넣음 (변수명은 그대로 사용)
   - Storage에 `photos` 버킷도 생성 필요 (Public). Secret key 받으면 API로 생성 가능
3. **Gmail 앱 비밀번호 인증 실패** — 최초 전달분으로 SMTP 로그인 시 535 BadCredentials. 앱 비밀번호 재발급 필요 (Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호). 미해결이어도 개발 모드(코드 콘솔 출력)로 동작은 함
4. **Vercel 프로젝트 import 미완** — CLI 미설치·토큰 없음. 대시보드에서: Add New → Project → `WhiteDataLab/dari` Import → 환경변수 등록(아래) → Deploy
   ```
   DATABASE_URL      (pooler 6543, ?pgbouncer=true)
   DIRECT_URL        (직접 5432)
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   SUPABASE_STORAGE_BUCKET=photos
   AUTH_SECRET       (프로덕션용 새로 생성 권장)
   AUTH_TRUST_HOST=true
   PHONE_ENC_KEY     (로컬과 동일해야 함 — 다르면 기존 암호화 번호 복호화 불가)
   SMTP_HOST=smtp.gmail.com / SMTP_PORT=465 / SMTP_USER / SMTP_PASS / MAIL_FROM
   CRON_SECRET
   ```

### 트러블슈팅 기록
- next-auth beta.31이 nodemailer ^7 요구 → nodemailer 6→7 업그레이드로 해결
- Prisma 마이그레이션은 DB 없이 `prisma migrate diff --from-empty --script`로 오프라인 생성 (`prisma/migrations/0_init/`). PowerShell `Out-File`이 BOM을 넣어서 `[IO.File]::WriteAllText`로 BOM 제거함
- 로컬 프리뷰는 C:\Market\.claude\launch.json의 `dari-dev` 항목 (port 3001, `npm run dev --prefix C:\dari`)

### 다음 단계 (키 수령 후)
1. `.env.local` 실제 값 반영 → `npx prisma migrate deploy`
2. Secret key로 `photos` 버킷 생성 (Public)
3. 로컬에서 가입→프로필→호감→성사 E2E 확인 (첫 가입자 = ADMIN, 추천코드 면제)
4. Vercel 배포 + 환경변수 → 배포 URL로 카톡 초대 시작
5. Phase 2 착수는 사용자 승인 후 (CLAUDE.md 황금률)
