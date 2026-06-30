import { NextResponse } from 'next/server';

export function logStructured(moduleAction: string, message: string, details?: Record<string, unknown>) {
  const prefix = `[${moduleAction}]`;
  if (details) {
    console.info(prefix, message, details);
  } else {
    console.info(prefix, message);
  }
}

export function respondSuccess(details?: Record<string, unknown> | null, code = 'OK', message = 'Success', status = 200) {
  const body: Record<string, unknown> = { success: true, code, message };
  if (details && Object.keys(details).length > 0) body.details = details;
  return NextResponse.json(body, { status });
}

export function respondError(code: string, message: string, details?: Record<string, unknown> | null, status = 500) {
  const body: Record<string, unknown> = { success: false, code, message };
  if (details && Object.keys(details).length > 0) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Validates that a value is a valid UUID v4 string.
 * Returns the UUID string if valid, or throws a descriptive error.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertUUID(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      `Invalid ${fieldName}: expected a non-empty UUID string but got ${
        value === null ? 'null' : value === undefined ? 'undefined' : typeof value === 'string' && !value.trim() ? 'empty string' : typeof value
      }`
    );
  }
  const trimmed = value.trim();
  if (!UUID_REGEX.test(trimmed)) {
    throw new Error(`Invalid ${fieldName}: "${trimmed}" is not a valid UUID format`);
  }
  return trimmed;
}

export default {
  logStructured,
  respondSuccess,
  respondError,
};