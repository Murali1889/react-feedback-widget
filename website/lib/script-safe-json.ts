/**
 * JSON-stringify a value for safe inlining inside an HTML <script>.
 *
 * Plain JSON.stringify isn't safe in this context:
 *   · `</script>` inside any string would close the script tag early.
 *   · U+2028 / U+2029 are valid in JSON but ILLEGAL as raw line
 *     terminators in JavaScript (pre-ES2019 spec issue still present in
 *     deployed parsers); they end the script.
 *   · `<!--` can open an HTML comment scope that some parsers honor.
 *
 * Use this anywhere we inline server-side data into an inline script
 * (the bouncer page, future OAuth handoff pages, etc.).
 */
const RE_U2028 = new RegExp('\\u2028', 'g');
const RE_U2029 = new RegExp('\\u2029', 'g');

export function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/<\/(script)/gi, '<\\/$1')
    .replace(/<!--/g, '<\\!--')
    .replace(RE_U2028, '\\u2028')
    .replace(RE_U2029, '\\u2029');
}
