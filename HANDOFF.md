# HANDOFF.md — 세션 인수인계

> 최신 내용이 위로 오도록 기록한다.

## 2026-07-04 — Phase 1 MVP 구축 + 배포 준비

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
3. **Gmail 앱 비밀번호 인증 실패** — `jcrbilptyoggjihk` 로 SMTP 로그인 시 535 BadCredentials. 앱 비밀번호 재발급 필요 (Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호). 미해결이어도 개발 모드(코드 콘솔 출력)로 동작은 함
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
