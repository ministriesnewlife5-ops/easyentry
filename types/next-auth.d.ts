import NextAuth, { DefaultSession } from "next-auth";
import { AppRole } from "@/lib/auth-store";

declare module "next-auth" {
  interface Session {
    user: {
      role?: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
  }
}
