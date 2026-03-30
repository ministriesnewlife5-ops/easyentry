import { NextResponse } from "next/server";
import { createOtpForEmail, getUserByEmail } from "@/lib/auth-store";
import { sendOtpEmail } from "@/lib/mailer";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { message: "Please provide a valid email" },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(normalizedEmail);
    if (!existingUser) {
      return NextResponse.json(
        { message: "No account found with this email" },
        { status: 404 }
      );
    }

    const otp = await createOtpForEmail(normalizedEmail, 10);
    await sendOtpEmail(normalizedEmail, otp);

    return NextResponse.json(
      { message: "OTP sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ message }, { status: 500 });
  }
}
