import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// 인증 가드: /home 이하 전부 로그인 필수, /admin은 ADMIN 전용 (PAGE_IA §1)
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
