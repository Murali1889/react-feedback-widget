import Link from 'next/link';

type Destination = {
  id: string;
  name: string;
  blurb: string;
  status: 'live' | 'soon';
  emoji: string;
};

const DESTINATIONS: Destination[] = [
  { id: 'github',   name: 'GitHub Issues', blurb: 'File feedback as issues in a repo you own',     status: 'live', emoji: 'GH' },
  { id: 'linear',   name: 'Linear',        blurb: 'Create issues in a Linear team',                 status: 'soon', emoji: 'LN' },
  { id: 'slack',    name: 'Slack',         blurb: 'Post messages to a channel',                     status: 'soon', emoji: 'SL' },
  { id: 'discord',  name: 'Discord',       blurb: 'Webhook into a Discord channel',                 status: 'soon', emoji: 'DC' },
  { id: 'notion',   name: 'Notion',        blurb: 'Insert into a Notion database',                  status: 'soon', emoji: 'NT' },
  { id: 'sheets',   name: 'Google Sheets', blurb: 'Append rows to a sheet you own',                 status: 'soon', emoji: 'GS' },
  { id: 'jira',     name: 'Jira',          blurb: 'Create tickets in an Atlassian project',         status: 'soon', emoji: 'JR' },
  { id: 'hubspot',  name: 'HubSpot',       blurb: 'Open Service Hub tickets',                       status: 'soon', emoji: 'HS' },
  { id: 'supabase', name: 'Supabase',      blurb: 'Write rows directly to a Supabase table',        status: 'soon', emoji: 'SB' },
];

export default function Home() {
  return (
    <>
      <h1 style={{ fontSize: 32, margin: '0 0 8px' }}>
        Connect a destination
      </h1>
      <p style={{ color: '#94a3b8', margin: '0 0 32px' }}>
        Pick where feedback should land. We open the provider's consent
        screen, walk you through it, and hand the credentials back to your
        stack — we never store them.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {DESTINATIONS.map((d) => (
          <DestinationCard key={d.id} d={d} />
        ))}
      </div>

      <p style={{ marginTop: 40, color: '#64748b', fontSize: 13 }}>
        Prefer the terminal? <code>npx rvf auth &lt;name&gt;</code> does the same thing
        from your shell.
      </p>
    </>
  );
}

function DestinationCard({ d }: { d: Destination }) {
  const isLive = d.status === 'live';
  const content = (
    <div
      style={{
        background: isLive ? '#0f172a' : '#0b1220',
        border: `1px solid ${isLive ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 10,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '100%',
        opacity: isLive ? 1 : 0.55,
        cursor: isLive ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(96,165,250,0.12)',
            color: '#bfdbfe',
            fontWeight: 700, fontSize: 12,
          }}
        >
          {d.emoji}
        </span>
        <span style={{ fontWeight: 600 }}>{d.name}</span>
        {!isLive && (
          <span
            style={{
              marginLeft: 'auto', fontSize: 11, color: '#94a3b8',
              background: 'rgba(255,255,255,0.06)',
              padding: '2px 8px', borderRadius: 999,
            }}
          >
            soon
          </span>
        )}
      </div>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
        {d.blurb}
      </p>
    </div>
  );
  return isLive ? <Link href={`/connect/${d.id}`}>{content}</Link> : content;
}
