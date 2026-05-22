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

export default {
  logStructured,
  respondSuccess,
  respondError,
};
