// Shared database types — no runtime imports, safe for both client and server.
//
// NOTE: these mirror schema.sql. The subscription tier column is
// `subscription_tier` (not `tier`) — see schema.sql.

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  organization?: string;
  role?: string;
  subscription_status: 'active' | 'inactive' | 'trialing' | 'cancelled';
  subscription_tier: 'basic' | 'pro' | 'enterprise';
  trial_ends_at?: string;
  last_reviewed_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at?: string;
}

export interface Finding {
  id: string;
  report_date: string;
  authority: string;
  category: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  summary: string;
  detail?: string;
  source_url?: string;
  effective_date?: string;
  comment_deadline?: string;
  document_number?: string;
  is_comment_deadline_soon: boolean;
  /** 'verified' = the authority's own structured record. See migrations/003. */
  verification?: 'verified' | 'unverified';
  source_id?: string;
  /** Stable document identity; unique across runs. */
  finding_key?: string;
  /** When RegIntel first ingested this document. Never moves. */
  first_seen_at?: string;
  /** When the authority last amended it. */
  last_changed_at?: string;
}

export interface Report {
  id: string;
  report_date: string;
  generated_at: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
  full_report_markdown?: string;
  total_items_found: number;
  authorities_searched?: string[];
  priority_alerts?: Finding[];
}
