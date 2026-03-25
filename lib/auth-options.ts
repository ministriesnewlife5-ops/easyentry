import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { addUser, AppRole, appUsers, consumeOtpVerification, getUserByEmail, isEmailOtpVerified } from "@/lib/auth-store";

const signUpRoles: AppRole[] = ["user", "artist", "promoter", "outlet"];

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const isSignUp = credentials.isSignUp === "true";

        if (isSignUp) {
          const userExists = getUserByEmail(normalizedEmail);
          if (userExists) {
            throw new Error("User already exists with this email");
          }

          if (!isEmailOtpVerified(normalizedEmail)) {
            throw new Error("Email is not OTP verified");
          }

          const hashedPassword = await hash(credentials.password, 10);
          const requestedRole = (credentials.role ?? "user") as AppRole;
          const role = signUpRoles.includes(requestedRole) ? requestedRole : "user";
          const newUser = {
            id: String(appUsers.length + 1),
            name: normalizedEmail.split("@")[0],
            email: normalizedEmail,
            password: hashedPassword,
            role,
          };

          addUser(newUser);
          consumeOtpVerification(normalizedEmail);

          return {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
          };
        } else {
          const user = getUserByEmail(normalizedEmail);
          console.log(`Login search for ${normalizedEmail}: ${user ? 'Found' : 'NOT FOUND'}`);

          if (!user) {
            throw new Error("No user found with this email");
          }

          const isValid = await compare(credentials.password, user.password);

          if (!isValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
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
