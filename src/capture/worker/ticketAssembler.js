import { extractSnippet } from './codeContext.js';
import { serializeFiberTree } from './fiberSerializer.js';

function coalesceInputs(steps) {
  const out = [];
  for (const s of steps) {
    const last = out.at(-1);
    if (
      last && last.kind === 'input' && s.kind === 'input' &&
      last.target?.selector === s.target?.selector
    ) {
      last.value = s.value;
      last.ts = s.ts;
    } else {
      out.push(s);
    }
  }
  return out;
}

function reproSteps(input) {
  const allEvents = [
    ...(input.routes || []).map((r) => ({ kind: 'route', from: r.from, to: r.to, ts: r.ts })),
    ...(input.interactions || []).map((e) => ({
      kind: e.type,
      target: e.target,
      value: e.value,
      redacted: e.redacted,
      ts: e.ts,
    })),
    ...(input.errors || []).map((e) => ({ kind: 'error', message: e.message, stack: e.stack, ts: e.ts })),
  ].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  return coalesceInputs(allEvents).slice(-30);
}

function summarize(input) {
  const it = input.item || {};
  return {
    type: it.type || 'bug',
    severity: it.severity || 'medium',
    userName: it.userName || 'Anonymous',
    userEmail: it.userEmail || null,
    page: it.url || null,
    timestamp: it.timestamp || new Date().toISOString(),
    feedback: it.feedback || '',
  };
}

function whereFrom(input) {
  const frame = (input.resolvedFrames || [])[0];
  const ei = input.item?.elementInfo || {};
  if (!frame && !ei.sourceFile) return null;
  const snippetSource = frame?.sourcesContent || input.codeContext || null;
  const line = frame?.line || (ei.sourceFile?.match(/:(\d+)/)?.[1]) || null;
  const snippet = snippetSource && line ? extractSnippet(snippetSource, Number(line)) : { lines: [] };
  return {
    file: frame?.source || ei.sourceFile || null,
    line: frame?.line || (line ? Number(line) : null),
    column: frame?.column || null,
    name: frame?.name || null,
    component: (ei.componentStack || []).join(' > '),
    selector: ei.selector || null,
    codeSnippet: snippet.lines,
  };
}

function logsSummary(item, errors, network) {
  const out = [];
  for (const e of (item.eventLogs || [])) {
    if (e.type === 'console') out.push({ type: 'console', level: e.level, message: e.message, ts: e.timestamp });
    if (e.type === 'network' && (e.status === undefined || e.status >= 400 || e.status === 'failed')) {
      out.push({ type: 'network', method: e.method, url: e.url, status: e.status, ts: e.timestamp });
    }
  }
  for (const n of network || []) {
    out.push({
      type: 'network',
      method: n.method,
      url: n.url,
      status: n.status,
      ok: n.ok,
      duration: n.duration,
      error: n.error,
      ts: n.ts,
    });
  }
  for (const e of errors || []) out.push({ type: 'error', message: e.message, ts: e.ts });
  return out;
}

function environment(input) {
  const it = input.item || {};
  return {
    build: input.buildInfo || {},
    viewport: it.viewport || null,
    browser: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    flags: input.flags || {},
  };
}

function fmtCodeSnippet(snippet) {
  if (!snippet || !snippet.length) return '';
  const w = String(snippet.at(-1).line).length;
  return snippet.map((l) => {
    const num = String(l.line).padStart(w, ' ');
    return `${l.highlight ? '>>>' : '   '} ${num}  ${l.text}`;
  }).join('\n');
}

function fmtRepro(steps) {
  return steps.map((s, i) => {
    const n = i + 1;
    if (s.kind === 'route') return `${n}. Visited \`${s.to}\``;
    if (s.kind === 'click') return `${n}. Clicked \`${s.target?.selector || ''}\`${s.target?.label ? ' (label "' + s.target.label + '")' : ''}`;
    if (s.kind === 'input') {
      const value = s.redacted ? `<${s.redacted}>` : (s.value ?? '<unknown>');
      return `${n}. Typed \`${value}\` into \`${s.target?.selector || ''}\``;
    }
    if (s.kind === 'error') return `${n}. **ERROR** ${s.message || ''}${s.stack ? '\n   ' + s.stack.split('\n')[0] : ''}`;
    return `${n}. ${s.kind}`;
  }).join('\n');
}

function fmtState(tree) {
  const lines = ['```json'];
  lines.push(JSON.stringify(tree, null, 2));
  lines.push('```');
  return lines.join('\n');
}

function fmtMarkdown(json) {
  const where = json.where;
  const code = fmtCodeSnippet(where?.codeSnippet || []);
  return [
    `# Feedback · ${(json.summary.feedback || '').slice(0, 80)}`,
    `*From ${json.summary.userName}${json.summary.userEmail ? ' (' + json.summary.userEmail + ')' : ''}, ${json.summary.timestamp} — ${json.summary.type}, severity ${json.summary.severity}*`,
    '',
    '## Summary',
    `> ${(json.summary.feedback || '').replace(/\n/g, '\n> ')}`,
    '',
    '## Where',
    where ? `- **File:** \`${where.file}:${where.line}\`${where.name ? '  (function `' + where.name + '`)' : ''}` : '- *(unresolved)*',
    where?.component ? `- **Component:** ${where.component}` : '',
    where?.selector ? `- **Selector:** \`${where.selector}\`` : '',
    `- **Page:** ${json.summary.page || '—'}`,
    code ? `\n### Code (\`${where?.file}\`, lines ${where?.codeSnippet[0]?.line}–${where?.codeSnippet.at(-1)?.line})\n\`\`\`\n${code}\n\`\`\`` : '',
    '',
    '### State at click time',
    fmtState(json.state),
    '',
    '## Repro',
    fmtRepro(json.repro.steps),
    '',
    '## Logs',
    ...(json.logs.length === 0 ? ['*(none captured)*'] : json.logs.slice(-20).map((l) => `- \`${new Date(l.ts || 0).toISOString()}\` [${l.type}${l.level ? '.' + l.level : ''}] ${l.message || l.url || ''}`)),
    '',
    '## Environment',
    `- **Branch:** \`${json.environment.build.branch || '—'}\` · **Commit:** \`${json.environment.build.commit || '—'}\` · **Built:** ${json.environment.build.builtAt || '—'}`,
    json.environment.build.packageVersion ? `- **Package:** \`${json.environment.build.packageVersion}\`` : '',
    `- **Env:** ${json.environment.build.environment || '—'}`,
    json.environment.viewport ? `- **Viewport:** ${json.environment.viewport.width}×${json.environment.viewport.height}` : '',
    json.environment.browser ? `- **Browser:** ${json.environment.browser}` : '',
    Object.keys(json.environment.flags).length ? `- **Active flags:** ${Object.entries(json.environment.flags).map(([k,v]) => `\`${k}: ${JSON.stringify(v)}\``).join(', ')}` : '',
  ].filter(Boolean).join('\n');
}

export function assembleTicket(input) {
  const json = {
    schemaVersion: '1.0',
    summary: summarize(input),
    where: whereFrom(input),
    state: serializeFiberTree(input.fiberSnapshot || {}),
    repro: { steps: reproSteps(input), format: 'v1' },
    logs: logsSummary(input.item || {}, input.errors || [], input.network || []),
    environment: environment(input),
    evidence: {
      hasScreenshot: !!input.item?.screenshot,
      hasVideo: !!input.item?.video,
      eventCount: (input.item?.eventLogs || []).length,
    },
  };
  return {
    markdown: fmtMarkdown(json),
    json,
    generatedAt: new Date().toISOString(),
  };
}
