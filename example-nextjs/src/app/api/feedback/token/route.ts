/**
 * Short-lived signed token issuance for anonymous capture.
 * The browser POSTs here (with whatever your public anti-abuse layer requires),
 * receives a 5-minute HMAC-signed token, and sends it as a Bearer header to
 * /api/feedback/anonymous.
 *
 * In production, rate-limit and CAPTCHA this endpoint at the edge.
 */

import { signSubmissionToken } from '@/lib/feedback-auth'

export async function POST() {
  const token = signSubmissionToken({ tenantId: 'public' })
  return Response.json({ token })
}
