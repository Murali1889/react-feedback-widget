/**
 * Supabase — server-proxied feedback destination.
 *
 * Pairs with the client adapter `supabaseProxied({ endpoint: '/api/feedback/supabase' })`
 * from 'react-visual-feedback/destinations'.
 *
 * Required env:
 *   SUPABASE_URL                — https://YOUR-PROJECT.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   — service-role key from
 *                                  https://app.supabase.com/project/_/settings/api
 *                                  ⚠ NEVER ship this to the browser. The widget
 *                                  has a runtime guard that refuses to accept it
 *                                  via the client adapter, but the safer pattern
 *                                  is what this route does — keep it server-only.
 *   SUPABASE_FEEDBACK_TABLE     — defaults to "feedback"
 *
 * Required table:
 *
 *   create table feedback (
 *     id uuid primary key default gen_random_uuid(),
 *     payload jsonb not null,
 *     created_at timestamptz not null default now(),
 *     origin text
 *   );
 *
 * If you want to skip this server entirely and let the browser write
 * directly with the anon key, use `supabasePublic({ url, anonKey })`
 * on the client — but read the RLS warning in that adapter first.
 */

import {
  withSecureDefaults,
  createSupabaseHandler,
  FeedbackAuthError,
} from 'react-visual-feedback/server'
import { getDemoSession } from '@/lib/feedback-auth'

export const POST = withSecureDefaults({
  authorize: async (req: any) => {
    const session = await getDemoSession(req)
    if (!session) throw new FeedbackAuthError()
    return {
      userId: session.userId,
      projectId: session.projectId,
      role: session.role,
    }
  },
})(createSupabaseHandler({}))
