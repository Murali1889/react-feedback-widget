/**
 * Generate a copy-pasteable failing test scaffold from the
 * captured state. The reporter clicks "Generate failing test" in
 * the Review step and gets back something like:
 *
 *   import { render, screen, fireEvent } from '@testing-library/react';
 *   import { CheckoutButton } from './CheckoutButton';
 *
 *   it('reproduces feedback #abc: ...', () => {
 *     render(<CheckoutButton />);
 *     fireEvent.click(screen.getByRole('button', { name: /Place order/i }));
 *     // EXPECTED: order created
 *     // ACTUAL:   POST /api/orders → 500
 *   });
 */
export function generateTestScaffold({ elementInfo, description, networkLog }) {
  const component = elementInfo?.reactComponent || elementInfo?.tagName || 'Subject';
  const label = elementInfo?.text?.trim?.() || elementInfo?.label || null;
  const lastFailing = (networkLog || [])
    .filter((n) => n && (n.ok === false || (n.status && n.status >= 400)))
    .slice(-1)[0];

  const titleHint = (description || '').split('\n')[0].slice(0, 60) || 'reproduces user feedback';
  const labelSel = label
    ? `screen.getByRole('button', { name: /${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i })`
    : `screen.getByRole('button')`;

  const expected = lastFailing
    ? `// EXPECTED: ${lastFailing.method} ${lastFailing.url} should succeed
    // ACTUAL:   ${lastFailing.method} ${lastFailing.url} → ${lastFailing.status || 'failed'}`
    : `// EXPECTED: <write the expected outcome>
    // ACTUAL:   <write what happened instead>`;

  return [
    `import { render, screen, fireEvent } from '@testing-library/react';`,
    `import { ${component} } from './${component}';`,
    ``,
    `it('${titleHint.replace(/'/g, "\\'")}', () => {`,
    `  render(<${component} />);`,
    `  fireEvent.click(${labelSel});`,
    `    ${expected}`,
    `});`,
  ].join('\n');
}
