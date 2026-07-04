import type { NextAuthConfig } from "next-auth";

// middleware(edge)에서도 쓰는 공통 설정 — prisma 임포트 금지
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "MEMBER";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const publicPaths = ["/", "/login", "/signup"];
      const isPublic =
        publicPaths.includes(pathname) ||
        pathname.startsWith("/signup/") ||
        pathname.startsWith("/api/auth");
      if (isPublic) return true;
      if (pathname.startsWith("/admin")) {
        return (auth?.user as { role?: string })?.role === "ADMIN";
      }
      return !!auth?.user;
    },
  },
  providers: [], // auth.ts에서 주입
} satisfies NextAuthConfig;
