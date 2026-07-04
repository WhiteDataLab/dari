# HANDOFF.md — 세션 인수인계

> 최신 내용이 위로 오도록 기록한다.

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
