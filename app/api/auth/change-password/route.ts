import { NextResponse } from "next/server";
import { getUserByEmail, updateUserPassword } from "@/lib/auth-store";
import { compare, hash } from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, oldPassword, newPassword } = (await request.json()) as {
      email?: string;
      oldPassword?: string;
      newPassword?: string;
    };

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !oldPassword || !newPassword) {
      return NextResponse.json(
        { message: "Email, old password, and new password are required" },
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

    const isValid = await compare(oldPassword, user.hashed_password);
    if (!isValid) {
      return NextResponse.json(
        { message: "Old password is incorrect" },
        { status: 401 }
      );
    }

    const hashedPassword = await hash(newPassword, 10);
    await updateUserPassword(normalizedEmail, hashedPassword);

    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to change password";
    return NextResponse.json({ message }, { status: 500 });
  }
}
