export default function Home() {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 40,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 12px' }}>
          react-visual-feedback · Pages Router
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          Press <kbd style={kbd}>Alt + A</kbd> to open the feedback modal,{' '}
          <kbd style={kbd}>Alt + Q</kbd> for the dashboard,{' '}
          <kbd style={kbd}>Alt + W</kbd> to record your screen.
        </p>
      </div>
    </main>
  )
}

const kbd: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  padding: '2px 8px', borderRadius: 6,
  fontFamily: 'SF Mono, Menlo, monospace', fontSize: 13,
}
