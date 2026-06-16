import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import feedbackConfig from '../../feedback.config'

// Dynamic import keeps the widget out of the SSR pass — Next 14 Pages
// Router doesn't tolerate styled-components in server rendering.
const FeedbackProvider = dynamic(
  () => import('react-visual-feedback').then((m) => m.FeedbackProvider),
  { ssr: false },
)

export default function App({ Component, pageProps }: AppProps) {
  return (
    <FeedbackProvider {...feedbackConfig}>
      <Component {...pageProps} />
    </FeedbackProvider>
  )
}
