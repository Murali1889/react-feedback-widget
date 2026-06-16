'use client'

import dynamic from 'next/dynamic'
import { ReactNode, useState } from 'react'
import feedbackConfig from '../../feedback.config'

// Dynamic import to avoid SSR issues
const FeedbackProvider = dynamic(
  () => import('react-visual-feedback').then((mod) => mod.FeedbackProvider),
  { ssr: false }
)

interface FeedbackProviderWrapperProps {
  children: ReactNode
}

type ModalVariant = 'centered' | 'drawer' | 'compact' | 'stepper' | 'two-column' | 'workspace'

function readUploadStrategy(): 'json' | 'multipart' | 'signed-url' | undefined {
  if (typeof window === 'undefined') return undefined
  const v = new URLSearchParams(window.location.search).get('upload')
  if (v === 'signed-url' || v === 'multipart' || v === 'json') return v
  return undefined
}

export function FeedbackProviderWrapper({ children }: FeedbackProviderWrapperProps) {
  const [integrationType, setIntegrationType] = useState<'server' | 'apps-script' | 'zapier'>('server')
  const [modalVariant, setModalVariant] = useState<ModalVariant>('centered')
  const uploadStrategy = readUploadStrategy()

  const handleFeedbackSubmit = async (feedbackData: any) => {
    console.log('Feedback submitted:', feedbackData)
    // Stash on window so the Playwright verification script can read it back
    // and assert that every captured field is present in the payload.
    if (typeof window !== 'undefined') {
      ;(window as any).__lastFeedback = feedbackData
      ;(window as any).__feedbackHistory = [
        feedbackData,
        ...((window as any).__feedbackHistory || []).slice(0, 9),
      ]
    }
  }

  const handleStatusChange = async ({ id, status, comment }: { id: string; status: string; comment?: string }) => {
    console.log('Status changed:', { id, status, comment })
  }

  const handleIntegrationSuccess = (type: string, result: any) => {
    console.log(`✅ ${type} integration success:`, result)
  }

  const handleIntegrationError = (type: string, error: any) => {
    console.error(`❌ ${type} integration error:`, error)
  }

  // Integration config based on selected type
  const getIntegrationConfig = () => {
    switch (integrationType) {
      case 'server':
        return {
          jira: {
            enabled: true,
            type: 'server' as const,
            endpoint: '/api/feedback/jira',
            projectKey: process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || 'BUG',
            syncStatus: true
          },
          sheets: {
            enabled: true,
            type: 'server' as const,
            endpoint: '/api/feedback/sheets'
          }
        }

      case 'apps-script':
        return {
          jira: {
            enabled: false
          },
          sheets: {
            enabled: true,
            type: 'google-apps-script' as const,
            deploymentUrl: process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || ''
          }
        }

      case 'zapier':
        return {
          jira: {
            enabled: true,
            type: 'zapier' as const,
            webhookUrl: process.env.NEXT_PUBLIC_ZAPIER_JIRA_WEBHOOK || ''
          },
          sheets: {
            enabled: true,
            type: 'zapier' as const,
            webhookUrl: process.env.NEXT_PUBLIC_ZAPIER_SHEETS_WEBHOOK || ''
          }
        }
    }
  }

  return (
    <>
      {/* Dev controls: integration type + modal variant picker */}
      <div style={{
        position: 'fixed',
        top: 10,
        left: 10,
        zIndex: 9999,
        background: 'white',
        padding: '14px 16px',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        fontSize: 13,
        display: 'grid',
        gap: 10,
        minWidth: 240,
      }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Modal layout</div>
          <select
            value={modalVariant}
            onChange={(e) => setModalVariant(e.target.value as ModalVariant)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 13,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <option value="workspace">⭐ Workspace (rail + impact map + pins)</option>
            <option value="centered">Centered modal (default)</option>
            <option value="drawer">Drawer (slide from right)</option>
            <option value="compact">Compact card (bottom-right)</option>
            <option value="stepper">Stepper wizard (3 steps)</option>
            <option value="two-column">Two-column (form + evidence)</option>
          </select>
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Integration</div>
          <select
            value={integrationType}
            onChange={(e) => setIntegrationType(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 13,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <option value="server">Server (Jira + Sheets API)</option>
            <option value="apps-script">Google Apps Script</option>
            <option value="zapier">Zapier Webhooks</option>
          </select>
        </div>
      </div>

      <FeedbackProvider
        // Phase F: spread the single-source-of-truth config. The same
        // file is imported by the catch-all route at
        // app/api/feedback/[...rest]/route.ts — adding a new destination
        // requires editing feedback.config.ts and nothing else.
        {...feedbackConfig}
        // Per-page overrides (the picker UI in this demo, host-side
        // callbacks, the legacy integrations the example shows). Every
        // prop here wins over the config spread because of object key
        // order in JSX.
        onSubmit={handleFeedbackSubmit}
        onStatusChange={handleStatusChange}
        dashboard={true}
        isDeveloper={true}
        userName="Test User"
        userEmail="test@example.com"
        mode="light"
        integrations={getIntegrationConfig()}
        onIntegrationSuccess={handleIntegrationSuccess}
        onIntegrationError={handleIntegrationError}
        captureConfig={{
          buildInfo: {
            commit: 'demo-commit-abc123',
            branch: 'main',
            environment: 'development',
          },
          flagsSnapshot: () => ({
            'checkout-redesign': 'variant-b',
            'demo-mode': true,
          }),
          // Test flag: ?upload=signed-url|multipart|json overrides the
          // default upload strategy live. Used by the Playwright E2E
          // verification scripts.
          ...(uploadStrategy ? { upload: { strategy: uploadStrategy } } : {}),
        }}
        // The picker overrides the variant set in feedback.config.ts so
        // the demo can switch layouts live.
        modalVariant={modalVariant}
      >
        {children}
      </FeedbackProvider>
    </>
  )
}
