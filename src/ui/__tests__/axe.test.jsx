import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import {
  Button, IconButton, Field, Chip, Surface, Stack, Spinner, Avatar,
} from '../primitives/index.js';

describe('axe-core smoke (default renders pass a11y)', () => {
  const cases = [
    ['Button',     <Button>OK</Button>],
    ['IconButton', <IconButton aria-label="Close" icon={<span>×</span>} />],
    ['Field',      <Field label="Email" />],
    ['Chip',       <Chip>bug</Chip>],
    ['Surface',    <Surface>card</Surface>],
    ['Stack',      <Stack><span>hi</span></Stack>],
    ['Spinner',    <Spinner />],
    ['Avatar',     <Avatar name="Murali V" />],
  ];

  for (const [name, node] of cases) {
    it(`${name} has no a11y violations`, async () => {
      const { container } = render(node);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  }
});
