export function serializeFiberTree(tree) {
  if (!tree || typeof tree !== 'object') return {};
  const out = {};
  for (const name of Object.keys(tree)) {
    const node = tree[name] || {};
    out[name] = {
      props: node.props ?? {},
      state: node.state ?? null,
    };
  }
  return out;
}
