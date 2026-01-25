import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Get user identifier for storage isolation
 * Uses session-based identifier for all users
 */
export async function getUserStorageId(request: NextRequest): Promise<string> {
  // Use session ID from cookies or generate one
  const sessionId = request.cookies.get('csv-splitter-session')?.value;
  if (sessionId) {
    return `session_${sessionId}`;
  }

  // Generate a new session ID (will be set as cookie in the response)
  const newSessionId = crypto.randomBytes(16).toString('hex');
  return `session_${newSessionId}`;
}

/**
 * Get storage directory path for a user
 */
export function getUserStorageDir(userId: string): string {
  return `csv-chunks/${userId}`;
}
