import { randomInt } from "crypto";

export type AppRole = "artist" | "promoter" | "outlet" | "user" | "admin";

type AppUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AppRole;
};

type OtpRecord = {
  otp: string;
  expiresAt: number;
  verified: boolean;
};

const globalStore = globalThis as unknown as {
  appUsers?: AppUser[];
  otpRecords?: Map<string, OtpRecord>;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const initialUsers: AppUser[] = [
  {
    id: "1",
    name: "Demo User",
    email: "test@example.com",
    password: "$2b$10$bb9KZo9iaM1KBUXFvjHqGOUmqGLG9sn/PSItMXPjfICbU3wisGzLC",
    role: "user" as AppRole,
  },
  {
    id: "2",
    name: "Admin",
    email: "admin@easyentry.com",
    password: "$2b$10$M4TaRySopD0Gp0B9EYslnOCsY7yXpB9BplXdAhnSVF6JQGqhz3Vsy", // hash for 'admin123'
    role: "admin" as AppRole,
  },
  {
    id: "3",
    name: "Outlet Provider",
    email: "provider@athryan.com",
    password: "$2b$10$P9H5i9J1vHq.v9dixqsiCu6p3j5nPHI2k9D66STQcyEIq36BFsE7q", // hash for 'provider123'
    role: "outlet" as AppRole,
  },
  {
    id: "4",
    name: "Artist",
    email: "artist@athryan.com",
    password: "$2b$10$8dRlrPtXhSRZSUXeOJeyi./y03McyYgI0sP0TKkc4gUQUFUc/S.7C", // hash for 'artist123'
    role: "artist" as AppRole,
  },
  {
    id: "5",
    name: "Influencer",
    email: "influencer@athryan.com",
    password: "$2b$10$zsy1c5fPukQg.rHjhTBfkeqwVRokAzDfvuzhHOon7iZ7P4bx3QqRu", // hash for 'influencer123'
    role: "promoter" as AppRole,
  },
];

export const appUsers = globalStore.appUsers ?? [...initialUsers];

if (!globalStore.appUsers) {
  globalStore.appUsers = appUsers;
}

// Ensure admin exists and has the correct password if somehow lost or outdated in global state
const adminUser = appUsers.find(u => u.email === "admin@easyentry.com");
if (!adminUser) {
  appUsers.push(initialUsers[1]);
} else if (adminUser.password !== initialUsers[1].password) {
  adminUser.password = initialUsers[1].password;
}

const otpRecords = globalStore.otpRecords ?? new Map<string, OtpRecord>();

if (!globalStore.otpRecords) {
  globalStore.otpRecords = otpRecords;
}

export function getUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  return appUsers.find((user) => normalizeEmail(user.email) === normalizedEmail);
}

export function addUser(user: AppUser) {
  appUsers.push(user);
}

export function createOtpForEmail(email: string, ttlMinutes = 10) {
  const normalizedEmail = normalizeEmail(email);
  const otp = randomInt(100000, 1000000).toString();
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  otpRecords.set(normalizedEmail, { otp, expiresAt, verified: false });
  return otp;
}

export function verifyOtpForEmail(email: string, otp: string) {
  const normalizedEmail = normalizeEmail(email);
  const record = otpRecords.get(normalizedEmail);
  if (!record) {
    return { ok: false, reason: "OTP not found" };
  }
  if (Date.now() > record.expiresAt) {
    otpRecords.delete(normalizedEmail);
    return { ok: false, reason: "OTP expired" };
  }
  if (record.otp !== otp) {
    return { ok: false, reason: "Invalid OTP" };
  }
  otpRecords.set(normalizedEmail, { ...record, verified: true });
  return { ok: true as const };
}

export function isEmailOtpVerified(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const record = otpRecords.get(normalizedEmail);
  if (!record) {
    return false;
  }
  if (Date.now() > record.expiresAt) {
    otpRecords.delete(normalizedEmail);
    return false;
  }
  return record.verified;
}

export function consumeOtpVerification(email: string) {
  const normalizedEmail = normalizeEmail(email);
  otpRecords.delete(normalizedEmail);
}

export async function updateUserPassword(email: string, newPasswordHash: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = appUsers.find((u) => normalizeEmail(u.email) === normalizedEmail);
  if (!user) {
    return { ok: false, reason: "User not found" };
  }
  user.password = newPasswordHash;
  return { ok: true };
}
