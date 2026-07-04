# CLAUDE.md — 다리 (지인 기반 소개팅)

이 파일은 Claude Code가 이 레포에서 작업할 때 따르는 규칙이다.
**제품/기능의 단일 진실 공급원은 [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md)**,
데이터 모델은 [`docs/DB_SCHEMA.md`](docs/DB_SCHEMA.md), 화면은 [`docs/PAGE_IA.md`](docs/PAGE_IA.md).

## 0. 황금률
- **한 번에 한 Phase만.** 끝나면 멈추고 요약 후 승인받고 다음 Phase.
- 다음 Phase 기능 선구현 금지. 발견 시 `// TODO(phase-N): ...` 주석만.
- 스펙과 코드가 어긋나면 스펙을 먼저 고치고 코드를 맞춘다.

## 1. 기술 스택 (확정)
- Next.js 15 (App Router) + TypeScript strict + React 19
- Tailwind CSS v4 (CSS-first, `@theme` 토큰, config 파일 없음)
- Auth.js (NextAuth v5 beta) — 이메일 6자리 코드 + Credentials, **JWT 세션**
- Prisma 6 + PostgreSQL (Supabase: DB + Storage)
- 배포: Vercel (크론: /api/cron/expire)

## 2. 절대 보안 규칙 (DB_SCHEMA §5)
1. `phone`은 AES-256-GCM 암호화(`@/lib/crypto`). 복호화는 ① 본인/등록 중매인 ② Match 성사 응답 두 경로만.
2. **여성 사진 비대칭 gate**: 원본 URL은 `PhotoAccess`(revokedAt null) 보유자·여성·소유자에게만 응답.
   권한 없으면 URL 자체를 응답에서 제외. **프론트 CSS blur 절대 금지.**
3. 거절/만료/차단 트랜잭션에 `PhotoAccess.revokedAt` 세팅 필수 (열람권 회수).
4. 거절 이력 상대는 피드 제외 + 상세 404.
5. 자유 텍스트(이상형·연애관·한 줄 소개)는 저장 시 `@/lib/moderation` 연락처 감지 통과 필수.

## 3. 코드 컨벤션
- TypeScript strict, `any` 지양. 컴포넌트는 함수형 + named export, 파일명 PascalCase.
- 기본 Server Component. 상호작용 필요 시에만 `"use client"`.
- 임포트 `@/*` 별칭. DB는 반드시 `@/lib/prisma` 싱글톤.
- UI 카피는 친근체 한국어. 선택 입력은 칩(chip), 바텀시트 우선, 터치 타겟 44px+.
- 디자인 토큰은 `globals.css`의 `@theme` (ivory/ink/sub/blue/thread/grn/yellow).
- Match 생성은 반드시 트랜잭션 (Like 상태 + Match + Profile 2건 MATCHED + PhotoAccess + 알림 2건).

## 4. 외부 API / 시크릿
- 모든 키는 환경변수. `.env.local` 커밋 금지. 새 변수 추가 시 `.env.example` 갱신.
- **키 없이도 빌드가 깨지지 않게** 가드 (SMTP 미설정 → 콘솔 출력, Storage 미설정 → 에러 메시지).

## 5. Phase 현황
- **Phase 1 (완료)**: 가입(이메일 인증+추천코드) / 본인·지인 프로필 / 탐색 피드 / 상세+관계 경로 / 호감 3단계→성사→번호 공개 / 인앱 알림
- **Phase 2 (미착수)**: 중매인 매칭 제안 / 리더보드·뱃지 / 신고·차단 / 자동 감지 파이프라인 / 관리자 대시보드 / 사진 워터마크
- **Phase 3 (미착수)**: PWA + Web Push / 인연 경로 공유 카드 / 지인 보증 가입 / 필터 검색

## 6. 검증 & 커밋
- 변경 후 `npm run build` 통과가 기본 확인선.
- 커밋: `feat:` / `fix:` / `chore:`. Phase 완료 시 커밋.
