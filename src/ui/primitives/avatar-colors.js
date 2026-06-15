// 8 hash buckets; index by a tiny string hash.
export const TONES = [
  { bg: '#fee2e2', fg: '#b91c1c' }, // red
  { bg: '#ffedd5', fg: '#c2410c' }, // orange
  { bg: '#fef3c7', fg: '#92400e' }, // amber
  { bg: '#d1fae5', fg: '#047857' }, // emerald
  { bg: '#cffafe', fg: '#0e7490' }, // cyan
  { bg: '#dbeafe', fg: '#1d4ed8' }, // blue
  { bg: '#ede9fe', fg: '#5b21b6' }, // violet
  { bg: '#fce7f3', fg: '#9d174d' }, // pink
];

export function toneFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h) % TONES.length;
}
