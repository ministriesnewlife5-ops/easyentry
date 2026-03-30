import { NextResponse } from "next/server";
import { verifyOtpForEmail } from "@/lib/auth-store";

export async function POST(request: Request) {
  try {
    const { email, otp } = (await request.json()) as { email?: string; otp?: string };
    const normalizedEmail = email?.trim().toLowerCase();
    const trimmedOtp = otp?.trim();

    if (!normalizedEmail || !trimmedOtp) {
      return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 });
    }

    const isValid = await verifyOtpForEmail(normalizedEmail, trimmedOtp);
    if (!isValid) {
      return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 });
    }

    return NextResponse.json({ message: "OTP verified successfully" }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Failed to verify OTP" }, { status: 500 });
  }
}
