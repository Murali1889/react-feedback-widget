export async function snapshotFlags(adapter) {
  if (typeof adapter !== 'function') return {};
  try {
    const result = await adapter();
    return result && typeof result === 'object' ? result : {};
  } catch {
    return { error: 'snapshot_failed' };
  }
}
