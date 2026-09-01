import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { email, displayName, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email dan kode OTP wajib disertakan" },
        { status: 400 }
      );
    }

    const recipientName = displayName || "Mahasiswa";

    // ── HTML Email Template ───────────────────────────────────────────────────
    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kode Verifikasi Hapus Akun MindFlow AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 10px 18px; border-radius: 16px; margin-bottom: 12px;">
                <span style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">🧠 MindFlow AI</span>
              </div>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; line-height: 1.3;">
                Verifikasi Penghapusan Akun
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px; text-align: left;">
              <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0; line-height: 1.6;">
                Halo <strong>${recipientName}</strong>,
              </p>
              <p style="font-size: 14px; color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">
                Kami menerima permintaan untuk <strong>menghapus akun MindFlow AI Anda secara permanen</strong>. Jika Anda yang meminta tindakan ini, gunakan kode verifikasi 6 digit di bawah ini untuk melanjutkan:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #fef2f2; border: 2px dashed #f87171; border-radius: 18px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 11px; font-weight: 800; color: #b91c1c; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">
                  Kode Keamanan Verifikasi Ganda
                </span>
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #dc2626; display: inline-block; padding: 4px 12px;">
                  ${code}
                </span>
                <span style="font-size: 12px; color: #ef4444; font-weight: 600; display: block; margin-top: 8px;">
                  ⏱️ Berlaku selama 10 menit
                </span>
              </div>

              <!-- Warning Box -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="font-size: 12px; color: #92400e; margin: 0; line-height: 1.5;">
                  <strong>Peringatan:</strong> Menghapus akun akan memusnahkan seluruh catatan, papan tugas, sesi pomodoro, dan analitik AI Anda secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <p style="font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5;">
                Jika Anda tidak pernah meminta penghapusan ini, abaikan email ini. Akun dan seluruh data Anda akan tetap aman.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} MindFlow AI · Platform Manajemen Tugas & Asisten Belajar Cerdas
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // ── Check SMTP / Email Service Configuration ─────────────────────────────
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
    const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
    const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");

    let emailSent = false;
    let deliveryMethod = "simulated";
    let smtpErrorDetails = null;

    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"MindFlow AI Security" <${smtpUser}>`,
          to: email,
          subject: `[PERINGATAN] Kode Verifikasi Penghapusan Akun: ${code}`,
          html: htmlContent,
        });

        emailSent = true;
        deliveryMethod = "smtp";
        console.log(`[EMAIL DISPATCH] Real email successfully sent to ${email} via SMTP.`);
      } catch (smtpErr: unknown) {
        const errObj = smtpErr as { message?: string };
        smtpErrorDetails = errObj.message;
        console.error("[EMAIL DISPATCH ERROR] Failed to send via SMTP:", smtpErr);
      }
    }


    // Console log fallback for local development or when SMTP is not configured yet
    console.log(`
======================================================
📧 [MINDFLOW AI EMAIL DISPATCH: VERIFIKASI HAPUS AKUN]
Kepada: ${recipientName} <${email}>
Status: ${emailSent ? "TERKIRIM KE INBOX ASLI (SMTP)" : "SIMULATED / PREVIEW MODE"}
Subjek: [PERINGATAN] Kode Verifikasi Penghapusan Akun MindFlow AI
------------------------------------------------------
Kode Verifikasi 6 Digit: [ ${code} ]
Berlaku: 10 Menit
======================================================
    `);

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Kode verifikasi telah dikirimkan langsung ke email ${email}`
        : `Kode verifikasi telah disiapkan untuk ${email}`,
      deliveryMethod,
      recipient: email,
    });
  } catch (error) {
    console.error("Failed to process send-deletion-email:", error);
    return NextResponse.json(
      { error: "Gagal memproses email verifikasi" },
      { status: 500 }
    );
  }
}
