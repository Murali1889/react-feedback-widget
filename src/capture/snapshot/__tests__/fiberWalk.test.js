import { describe, it, expect } from 'vitest';
import { snapshotFiberTree } from '../fiberWalk.js';

function makeFiber(name, props = {}, state = null, parent = null) {
  return {
    type: { displayName: name },
    memoizedProps: props,
    memoizedState: state,
    return: parent,
  };
}

describe('snapshotFiberTree', () => {
  it('walks up the parent chain to the given depth', () => {
    const root = makeFiber('App');
    const middle = makeFiber('Layout', {}, null, root);
    const leaf = makeFiber('Button', { label: 'Go' }, null, middle);
    const tree = snapshotFiberTree(leaf, { depth: 6 });
    expect(Object.keys(tree)).toEqual(['Button', 'Layout', 'App']);
    expect(tree.Button.props.label).toBe('Go');
  });

  it('caps depth', () => {
    let f = makeFiber('Leaf');
    for (let i = 0; i < 10; i += 1) f = makeFiber(`N${i}`, {}, null, f);
    const tree = snapshotFiberTree(f, { depth: 3 });
    expect(Object.keys(tree).length).toBeLessThanOrEqual(3);
  });

  it('replaces functions with [Function]', () => {
    const fn = function go() {};
    const leaf = makeFiber('X', { onClick: fn });
    const tree = snapshotFiberTree(leaf);
    expect(tree.X.props.onClick).toMatch(/^\[Function/);
  });

  it('replaces DOM nodes with [DOMNode]', () => {
    const div = document.createElement('div');
    div.id = 'x';
    const leaf = makeFiber('X', { el: div });
    const tree = snapshotFiberTree(leaf);
    expect(tree.X.props.el).toMatch(/^\[DOMNode/);
  });

  it('breaks cycles', () => {
    const obj = { a: 1 };
    obj.self = obj;
    const leaf = makeFiber('X', { obj });
    const tree = snapshotFiberTree(leaf);
    expect(JSON.stringify(tree)).toContain('[Circular]');
  });

  it('truncates long strings', () => {
    const longStr = 'a'.repeat(5000);
    const leaf = makeFiber('X', { msg: longStr });
    const tree = snapshotFiberTree(leaf, { maxStr: 100 });
    expect(tree.X.props.msg.length).toBeLessThan(140);
    expect(tree.X.props.msg).toMatch(/\.\.\./);
  });

  it('truncates wide objects to maxKeys', () => {
    const wide = {};
    for (let i = 0; i < 200; i += 1) wide[`k${i}`] = i;
    const leaf = makeFiber('X', { wide });
    const tree = snapshotFiberTree(leaf, { maxKeys: 5 });
    expect(Object.keys(tree.X.props.wide).length).toBeLessThanOrEqual(6);
  });

  it('completes under the perf budget for a typical tree', () => {
    let f = makeFiber('Leaf', { x: 1, y: 'hi' });
    for (let i = 0; i < 6; i += 1) f = makeFiber(`N${i}`, { idx: i }, null, f);
    const start = performance.now();
    for (let i = 0; i < 100; i += 1) snapshotFiberTree(f);
    const avg = (performance.now() - start) / 100;
    expect(avg).toBeLessThan(2);
  });
});
