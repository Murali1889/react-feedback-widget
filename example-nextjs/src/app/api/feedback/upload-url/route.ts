/**
 * Signed upload URL handler.
 *
 * The browser asks this route for short-lived signed URLs, then PUTs
 * each binary directly to object storage. The app server NEVER sees
 * the binary bytes — massive bandwidth + speed win at scale.
 *
 * Storage credentials live ONLY here. The widget bundle never sees them.
 *
 * Pick your provider in feedback.config.ts → upload + here in the env vars.
 *
 * Required env, picked by provider:
 *
 *   provider: 's3' or 'r2'
 *     S3_REGION, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY
 *     For R2: REGION='auto', S3_ENDPOINT='https://<account>.r2.cloudflarestorage.com'
 *     Optional: S3_PUBLIC_BASE_URL (CDN-fronted reads)
 *
 *   provider: 'supabase'
 *     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET
 */

import {
  withSecureDefaults,
  createUploadUrlHandler,
  FeedbackAuthError,
} from 'react-visual-feedback/server'
import { getDemoSession } from '@/lib/feedback-auth'

const provider = (process.env.FEEDBACK_UPLOAD_PROVIDER || 's3') as 's3' | 'r2' | 'supabase'

const config =
  provider === 'supabase'
    ? {
        provider: 'supabase' as const,
        supabaseUrl:   process.env.SUPABASE_URL!,
        serviceKey:    process.env.SUPABASE_SERVICE_ROLE_KEY!,
        bucket:        process.env.SUPABASE_STORAGE_BUCKET || 'feedback',
      }
    : {
        provider, // 's3' or 'r2'
        bucket:          process.env.S3_BUCKET!,
        region:          process.env.S3_REGION || (provider === 'r2' ? 'auto' : 'us-east-1'),
        endpoint:        process.env.S3_ENDPOINT!,
        accessKeyId:     process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
        publicBaseUrl:   process.env.S3_PUBLIC_BASE_URL,
      }

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
})(createUploadUrlHandler(config))
