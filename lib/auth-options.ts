import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { addUser, AppRole, consumeOtpVerification, getUserByEmail, isEmailOtpVerified } from "@/lib/auth-store";
import { normalizeRole } from "@/lib/roles";

const signUpRoles: AppRole[] = ["CUSTOMER", "ARTIST", "PROMOTER", "ORGANIZER"];

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@example.com" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
        isSignUp: { label: "isSignUp", type: "text" }
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const isSignUp = credentials.isSignUp === "true";

        if (isSignUp) {
          const userExists = await getUserByEmail(normalizedEmail);
          if (userExists) {
            throw new Error("User already exists with this email");
          }

          const isVerified = await isEmailOtpVerified(normalizedEmail);
          if (!isVerified) {
            throw new Error("Email is not OTP verified");
          }

          const hashedPassword = await hash(credentials.password, 10);
          const requestedRole = normalizeRole(credentials.role) ?? "CUSTOMER";
          const role = signUpRoles.includes(requestedRole as AppRole) ? requestedRole : "CUSTOMER";
          const name = normalizedEmail.split("@")[0];

          const newUser = await addUser({
            email: normalizedEmail,
            password: hashedPassword,
            role,
            name,
          });

          await consumeOtpVerification(normalizedEmail);

          return {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: normalizeRole(newUser.role) ?? "CUSTOMER",
          };
        } else {
          const user = await getUserByEmail(normalizedEmail);
          console.log(`Login search for ${normalizedEmail}: ${user ? 'Found' : 'NOT FOUND'}`);

          if (!user) {
            throw new Error("No user found with this email");
          }

          const isValid = await compare(credentials.password, user.hashed_password);

          if (!isValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user.id,
            name: user.name || user.email.split("@")[0],
            email: user.email,
            role: normalizeRole(user.role) ?? "CUSTOMER",
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = normalizeRole(user.role) ?? "CUSTOMER";
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = normalizeRole(token.role) ?? "CUSTOMER";
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
