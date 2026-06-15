'use client'

import dynamic from 'next/dynamic'
import { ReactNode, useState } from 'react'

// Dynamic import to avoid SSR issues
const FeedbackProvider = dynamic(
  () => import('react-visual-feedback').then((mod) => mod.FeedbackProvider),
  { ssr: false }
)

interface FeedbackProviderWrapperProps {
  children: ReactNode
}

export function FeedbackProviderWrapper({ children }: FeedbackProviderWrapperProps) {
  const [integrationType, setIntegrationType] = useState<'server' | 'apps-script' | 'zapier'>('server')

  const handleFeedbackSubmit = async (feedbackData: any) => {
    console.log('Feedback submitted:', feedbackData)
    // The integrations will handle sending to Jira/Sheets automatically
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
      {/* Integration Type Selector - for testing */}
      <div style={{
        position: 'fixed',
        top: 10,
        left: 10,
        zIndex: 9999,
        background: 'white',
        padding: '12px 16px',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        fontSize: 13
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Integration Type:</div>
        <select
          value={integrationType}
          onChange={(e) => setIntegrationType(e.target.value as any)}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #ddd',
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          <option value="server">Server (Jira + Sheets API)</option>
          <option value="apps-script">Google Apps Script</option>
          <option value="zapier">Zapier Webhooks</option>
        </select>
      </div>

      <FeedbackProvider
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
        // Phase A: secure-by-default. Session auth uses same-site cookies
        // plus automatic CSRF discovery. Server enforces every request.
        auth={{ mode: 'session' }}
        redact="default"
        // Phase C: AI-actionable capture. Every submission gets enriched with
        // file/line/code-snippet/state/repro/flags. Inspect via the Workflow
        // Panel's "Copy as → AI ticket (Markdown)" action.
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
        }}
      >
        {children}
      </FeedbackProvider>
    </>
  )
}
