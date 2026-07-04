import nodemailer from "nodemailer";

// SMTP 미설정 시 콘솔 출력 (키 없이도 개발 가능 — CLAUDE.md §4 가드)
export async function sendVerificationEmail(to: string, code: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[dev-mail] ${to} 인증코드: ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: Number(SMTP_PORT ?? 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: MAIL_FROM ?? SMTP_USER,
    to,
    subject: `[다리] 인증코드 ${code}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="letter-spacing:-0.02em">다리 🧵</h2>
        <p>아래 6자리 코드를 입력해 주세요. 10분간 유효해요.</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#FBF6EF;border-radius:12px;padding:20px;text-align:center">${code}</div>
      </div>`,
  });
}
