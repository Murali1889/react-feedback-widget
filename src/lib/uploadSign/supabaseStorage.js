/**
 * Supabase Storage signed-URL helper.
 *
 * Uses Supabase's built-in signed-upload-URL REST endpoint:
 *   POST /storage/v1/object/upload/sign/{bucket}/{path}
 *
 * Returns a one-shot upload token that the browser then PUTs the
 * binary to. No SDK required — single fetch call.
 *
 *   const { url, finalUrl, expiresAt } = await presignSupabaseUpload({
 *     supabaseUrl: 'https://abc.supabase.co',
 *     serviceKey: 'eyJ…',          // service-role; SERVER-ONLY
 *     bucket: 'feedback',
 *     key: 'projectId/uuid/screenshot.webp',
 *   })
 */

export async function presignSupabaseUpload({
  supabaseUrl,
  serviceKey,
  bucket,
  key,
  publicBaseUrl = null,
}) {
  if (!supabaseUrl || !serviceKey) throw new Error('presignSupabaseUpload: missing supabaseUrl or serviceKey');
  if (!bucket || !key)              throw new Error('presignSupabaseUpload: missing bucket or key');

  const base = supabaseUrl.replace(/\/$/, '');
  const endpoint = `${base}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`supabase storage signer ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = await res.json();
  // Supabase returns { url: '/object/upload/sign/<bucket>/<key>?token=...', token: '...' }
  const uploadUrl = body.url?.startsWith('http')
    ? body.url
    : `${base}/storage/v1${body.url}`;
  const finalUrl = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
    : `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;

  // The signed-upload-URL is a one-shot PUT; Supabase docs say ~2h validity.
  return {
    url: uploadUrl,
    headers: { 'content-type': 'application/octet-stream' },
    finalUrl,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  };
}
