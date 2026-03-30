import { NextResponse } from "next/server";
import { getUserByEmail, updateUserPassword, verifyOtpForEmail } from "@/lib/auth-store";
import { hash } from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = (await request.json()) as {
      email?: string;
      otp?: string;
      newPassword?: string;
    };

    const normalizedEmail = email?.trim().toLowerCase();
    const trimmedOtp = otp?.trim();

    if (!normalizedEmail || !trimmedOtp || !newPassword) {
      return NextResponse.json(
        { message: "Email, OTP, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const isValid = await verifyOtpForEmail(normalizedEmail, trimmedOtp);
    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(newPassword, 10);
    await updateUserPassword(normalizedEmail, hashedPassword);

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password";
    return NextResponse.json({ message }, { status: 500 });
  }
}
