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

type EventRequestEmailInput = {
  adminEmail: string;
  requestId: string;
  outletName: string;
  outletEmail: string;
  submittedAt: number;
  eventData: {
    title: string;
    subtitle: string;
    date: string;
    time: string;
    venue: string;
    category: string;
    price: string;
    description: string;
  };
};

export async function sendEventRequestNotificationEmail({
  adminEmail,
  requestId,
  outletName,
  outletEmail,
  submittedAt,
  eventData,
}: EventRequestEmailInput) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to: adminEmail,
    subject: `New hosted event request: ${eventData.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 8px;">New event request received</h2>
        <p style="margin-top: 0;">An outlet provider has submitted a new hosted event request.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 24px 0;">
          <tbody>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">Request ID</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${requestId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">Outlet</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${outletName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">Outlet Email</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${outletEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">Event Title</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${eventData.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">Category</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${eventData.category}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">Date & Time</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${eventData.date} · ${eventData.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">Venue</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${eventData.venue}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">Price</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${eventData.price}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">Submitted At</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${new Date(submittedAt).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-bottom: 8px; font-weight: 700;">Event Summary</p>
        <p style="margin-top: 0;">${eventData.subtitle}</p>
        <p>${eventData.description}</p>
      </div>
    `,
  });
}
