import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 587);
const secure = process.env.SMTP_SECURE === "true";
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM;

function getTransporter() {
  if (!host || !user || !pass || !from) {
    throw new Error("SMTP environment variables are not configured");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendOtpEmail(email: string, otp: string) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to: email,
    subject: "Your EasyEntry OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 8px;">EasyEntry Verification Code</h2>
        <p style="margin-top: 0;">Use the OTP below to complete your signup.</p>
        <div style="font-size: 32px; letter-spacing: 8px; font-weight: 700; margin: 24px 0;">${otp}</div>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `,
  });
}
