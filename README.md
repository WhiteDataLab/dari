# 다리 🧵 — 지인의 지인, 어쩌면 인연

지인 관계를 **드러내는** 소개팅 웹서비스. 모든 프로필에 "나와 몇 다리인지" 관계 경로를 보여준다.
기획: [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md) · 데이터: [`docs/DB_SCHEMA.md`](docs/DB_SCHEMA.md) · 화면: [`docs/PAGE_IA.md`](docs/PAGE_IA.md)

## 시작하기 (처음 세팅)

### 1. 필요한 계정/키 발급

| 서비스 | 용도 | 발급 방법 | 비용 |
|---|---|---|---|
| **Supabase** | DB + 사진 저장소 | supabase.com 가입 → New Project (리전: Seoul) | 무료 |
| **Gmail 앱 비밀번호** | 인증코드 이메일 발송 | Google 계정 → 보안 → 2단계 인증 켜기 → 앱 비밀번호 생성 | 무료 |
| **Vercel** | 배포 | vercel.com 가입 (GitHub 연동) | 무료 |
| **GitHub** | 코드 저장 + Vercel 자동배포 | 새 repo 생성 | 무료 |

**Supabase에서 복사할 것 4가지**
1. `Settings → Database → Connection string`: Transaction pooler(6543) → `DATABASE_URL` / Session(5432) → `DIRECT_URL`
2. `Settings → API`: Project URL → `SUPABASE_URL` / `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY`
3. `Storage`: `photos` 버킷 생성 (**Public bucket** 체크)

### 2. 로컬 설정

```bash
cp .env.example .env.local   # 값 채우기
npm install
npx prisma migrate deploy    # DB 테이블 생성
npm run dev                  # http://localhost:3000
```

시크릿 생성:
```bash
# AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# PHONE_ENC_KEY (전화번호 암호화)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> SMTP를 안 채우면 개발 모드: 인증코드가 `npm run dev` 콘솔에 출력된다.

### 3. 첫 가입 = 운영자
DB가 빈 상태에서 첫 가입자는 **추천코드 없이 가입되고 자동으로 ADMIN**이 된다.
이후 가입자는 전부 기존 회원의 추천코드가 필요하다 (MY 탭에서 공유).

### 4. Vercel 배포
1. GitHub repo에 push → Vercel에서 Import
2. 환경변수 전부 등록 (`.env.local`과 동일)
3. `vercel.json`의 크론(호감 기한 만료 처리)은 자동 등록됨

## Phase 현황
- ✅ Phase 1: 가입 / 프로필 / 피드 / 관계 경로 / 호감→성사→번호 공개 / 알림
- ⬜ Phase 2: 중매 제안 / 리더보드 / 신고·차단 / 관리자
- ⬜ Phase 3: PWA·푸시 / 경로 공유 카드 / 보증 가입 / 필터
