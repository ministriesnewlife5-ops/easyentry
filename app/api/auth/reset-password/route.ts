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

    const user = getUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const result = verifyOtpForEmail(normalizedEmail, trimmedOtp);
    if (!result.ok) {
      return NextResponse.json(
        { message: result.reason },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(newPassword, 10);
    const updateResult = await updateUserPassword(normalizedEmail, hashedPassword);

    if (!updateResult.ok) {
      return NextResponse.json(
        { message: updateResult.reason },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password";
    return NextResponse.json({ message }, { status: 500 });
  }
}
