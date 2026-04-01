import NextAuth, { DefaultSession } from "next-auth";
import { AppRole } from "@/lib/auth-store";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
  }
}
