export type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackType = 'bug' | 'idea' | 'praise' | 'question' | 'other';
export type FeedbackAuthMode = 'none' | 'session' | 'bearer' | 'signed';
export type FeedbackErrorCode =
  | 'unauthorized' | 'forbidden' | 'csrf_failed' | 'origin_blocked'
  | 'rate_limited' | 'validation_failed' | 'payload_too_large'
  | 'integration_failed' | 'integration_unavailable' | 'redacted_blocked'
  | 'server_error';

export interface FeedbackOwner {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface FeedbackIntegrationState {
  local?:  { status: 'saved' | 'pending' | 'error'; error?: string };
  jira?:   { status: 'not_sent' | 'pending' | 'created' | 'synced' | 'error';
             issueKey?: string; issueUrl?: string; error?: string };
  sheets?: { status: 'not_sent' | 'pending' | 'appended' | 'synced' | 'error';
             rowId?: string; error?: string };
}

export interface FeedbackStatusHistoryItem {
  from?: string; to: string;
  changedBy?: string; changedAt: string;
  comment?: string;
}

export interface FeedbackSecurityContext {
  projectId?: string;
  tenantId?: string;
  submittedBy?: { id?: string; role?: string };
  authMode?: FeedbackAuthMode;
  redactionApplied?: boolean;
  captureConsent?: 'implicit' | 'explicit';
}

export interface FeedbackAuthConfig {
  mode: FeedbackAuthMode;
  getToken?: () => string | null | Promise<string | null>;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  csrfToken?: string | (() => string | null | Promise<string | null>);
  retryOnUnauthorized?: boolean;
}

export interface FeedbackRedactionConfig {
  preset?: 'default' | 'strict';
  redactHeaders?: string[];
  redactHeaderPrefixes?: string[];
  redactQueryParams?: string[];
  redactBodyKeys?: string[];
  maxBodyLength?: number;
  maxLogMessageLength?: number;
  allowRequestBodies?: boolean;
  allowResponseBodies?: boolean;
  stripUrlQuery?: boolean;
  dropStorageValues?: boolean;
  dropIndexedDbEvents?: boolean;
}

export interface AuthorizedFeedbackContext {
  userId?: string;
  projectId?: string;
  tenantId?: string;
  role?: string;
  [key: string]: unknown;
}

export interface FeedbackServerSecurityHooks {
  authorize: (req: unknown) => Promise<AuthorizedFeedbackContext>;
  validateOrigin?: (req: unknown) => boolean | Promise<boolean>;
  rateLimit?: (req: unknown, ctx: AuthorizedFeedbackContext) => Promise<void>;
  redactFeedback?: (feedback: unknown, ctx: AuthorizedFeedbackContext) => Promise<unknown>;
  resolveIntegrationSecrets?: (ctx: AuthorizedFeedbackContext) => Promise<Record<string, unknown>>;
  errorNormalizer?: (err: unknown, ctx?: AuthorizedFeedbackContext) => unknown;
}

export type FeedbackServerResponse<T = unknown> =
  | { ok: true; data: T; securityContext: FeedbackSecurityContext }
  | { ok: false; error: FeedbackErrorCode; message?: string; fields?: Record<string, string> };
