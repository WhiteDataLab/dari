import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyEmailCode, consumeEmailCode } from "@/lib/emailCode";
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

        // 재사용(usedAt) 차단 + 5회 실패 시 무효화
        const result = await verifyEmailCode(email, code, { consume: false });
        if (!result.ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        await consumeEmailCode(result.id);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
