// Audit-log helper for security-relevant events.
//
// Writes to a Supabase table using the service role. Failures are logged to
// stderr but never block the operation being audited — the product must keep
// working even if the audit table is temporarily unavailable.

import { createAdminSupabase } from '@/lib/supabase-server';

export type AuditEvent =
  | 'handoff_get'
  | 'handoff_post'
  | 'handoff_redeemed'
  | 'handoff_rejected'
  | 'report_generation_requested'
  | 'report_generation_failed'
  | 'subscription_changed'
  | 'profile_updated'
  | 'admin_access';

export interface AuditPayload {
  event: AuditEvent;
  actor?: string | null;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export async function audit(payload: AuditPayload): Promise<void> {
  const supabase = createAdminSupabase();
  const { error } = await supabase.from('audit_log').insert({
    event: payload.event,
    actor: payload.actor || null,
    ip: payload.ip || null,
    user_agent: payload.userAgent || null,
    metadata: payload.metadata || null,
    error: payload.error || null,
  });

  if (error) {
    console.error('[audit] failed to write audit log:', error.message, payload);
  }
}

export function getClientInfo(req: { headers: Headers; ip?: string | null }): { ip: string; userAgent: string } {
  const rawIp = req.ip ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return {
    ip: rawIp,
    userAgent: req.headers.get('user-agent') || 'unknown',
  };
}
