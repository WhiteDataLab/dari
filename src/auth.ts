import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

// 이메일 6자리 코드 인증 → JWT 세션 (PROJECT_SPEC §6.1)
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "email-code",
      credentials: {
        email: { type: "email" },
        code: { type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const code = String(credentials?.code ?? "").trim();
        if (!email || !/^\d{6}$/.test(code)) return null;

        const verification = await prisma.emailVerification.findFirst({
          where: {
            email,
            code,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });
        if (!verification) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        if (!verification.usedAt) {
          await prisma.emailVerification.update({
            where: { id: verification.id },
            data: { usedAt: new Date() },
          });
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
