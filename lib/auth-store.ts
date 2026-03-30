import { supabase, type AppUser, type OtpRecord } from './supabase';
import { randomInt } from 'crypto';

export type AppRole = 'artist' | 'promoter' | 'outlet' | 'user' | 'admin' | 'outlet_provider';

/**
 * Find a user by their email address
 */
export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to find user: ${error.message}`);
  }

  return data as AppUser;
}

/**
 * Find a user by their ID
 */
export async function findUserById(id: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to find user: ${error.message}`);
  }

  return data as AppUser;
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  hashedPassword: string,
  role: AppRole = 'user',
  name?: string
): Promise<AppUser> {
  const { data, error } = await supabase
    .from('app_users')
    .insert({
      email: email.toLowerCase().trim(),
      hashed_password: hashedPassword,
      role,
      name: name || null,
      is_verified: false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('User with this email already exists');
    }
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data as AppUser;
}

/**
 * Update a user's verification status
 */
export async function verifyUser(email: string): Promise<void> {
  const { error } = await supabase
    .from('app_users')
    .update({ is_verified: true } as any)
    .eq('email', email.toLowerCase().trim());

  if (error) {
    throw new Error(`Failed to verify user: ${error.message}`);
  }
}

/**
 * Update user's password
 */
export async function updateUserPassword(
  email: string,
  hashedPassword: string
): Promise<void> {
  const { error } = await supabase
    .from('app_users')
    .update({ hashed_password: hashedPassword } as any)
    .eq('email', email.toLowerCase().trim());

  if (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }
}

/**
 * Create a new OTP record
 * Returns the generated OTP code
 */
export async function createOtp(
  email: string,
  ttlMinutes: number = 10
): Promise<string> {
  const code = randomInt(100000, 1000000).toString();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

  // Mark any existing OTPs for this email as used
  await supabase
    .from('otp_records')
    .update({ is_used: true } as any)
    .eq('email', email.toLowerCase().trim())
    .eq('is_used', false);

  const { data, error } = await supabase
    .from('otp_records')
    .insert({
      email: email.toLowerCase().trim(),
      code,
      expires_at: expiresAt.toISOString(),
      is_used: false,
    } as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create OTP: ${error.message}`);
  }

  return code;
}

/**
 * Verify an OTP code
 * Returns true if valid and not expired, false otherwise
 */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('otp_records')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('code', code)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return false;
  }

  // Mark OTP as used
  await supabase
    .from('otp_records')
    .update({ is_used: true } as any)
    .eq('id', data.id);

  return true;
}

/**
 * Check if email has a verified OTP (legacy compatibility)
 */
export async function isEmailOtpVerified(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('otp_records')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('is_used', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return false;
  }

  // Check if verified within last hour
  const verifiedAt = new Date(data.created_at);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return verifiedAt > oneHourAgo;
}

/**
 * Clean up expired OTP records
 */
export async function cleanupExpiredOtps(): Promise<void> {
  const { error } = await supabase
    .from('otp_records')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Failed to cleanup expired OTPs:', error.message);
  }
}

/**
 * Get all users (for admin purposes)
 */
export async function getAllUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }

  return data as AppUser[];
}

/**
 * Delete a user by ID
 */
export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('app_users')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

/**
 * Update user role
 */
export async function updateUserRole(id: string, role: AppRole): Promise<void> {
  const { error } = await supabase
    .from('app_users')
    .update({ role } as any)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update user role: ${error.message}`);
  }
}

// Legacy compatibility exports
export async function getUserByEmail(email: string): Promise<AppUser | null> {
  return findUserByEmail(email);
}

export async function addUser(user: { email: string; password: string; role: AppRole; name: string }): Promise<AppUser> {
  return createUser(user.email, user.password, user.role, user.name);
}

export async function createOtpForEmail(email: string, ttlMinutes = 10): Promise<string> {
  return createOtp(email, ttlMinutes);
}

export async function verifyOtpForEmail(email: string, otp: string): Promise<{ ok: boolean; reason?: string }> {
  const isValid = await verifyOtp(email, otp);
  if (isValid) {
    return { ok: true };
  }
  return { ok: false, reason: 'Invalid or expired OTP' };
}

export async function consumeOtpVerification(email: string): Promise<void> {
  await supabase
    .from('otp_records')
    .delete()
    .eq('email', email.toLowerCase().trim());
}
