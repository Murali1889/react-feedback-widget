import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Avatar, AvatarStack } from '../primitives/Avatar.jsx';

describe('Avatar', () => {
  it('shows initials when src is missing', () => {
    const { getByText } = render(<Avatar name="Murali V" />);
    expect(getByText('MV')).toBeInTheDocument();
  });

  it('single-word name uses the first two letters', () => {
    const { getByText } = render(<Avatar name="Acme" />);
    expect(getByText('AC')).toBeInTheDocument();
  });

  it('image src renders an img; falls back on error', () => {
    const { getByRole, container } = render(<Avatar name="Murali V" src="/avatar.png" />);
    const img = getByRole('img');
    expect(img).toHaveAttribute('src', '/avatar.png');
    fireEvent.error(img);
    expect(container.textContent).toContain('MV');
  });

  it('size=lg sets a 40px box', () => {
    const { container } = render(<Avatar name="A" size="lg" />);
    expect(container.firstChild).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('deterministic tint: same name → same data-tone', () => {
    const { container: c1 } = render(<Avatar name="Murali V" />);
    const { container: c2 } = render(<Avatar name="Murali V" />);
    expect(c1.firstChild.getAttribute('data-tone')).toBe(c2.firstChild.getAttribute('data-tone'));
  });
});

describe('AvatarStack', () => {
  it('renders multiple avatars inline', () => {
    const { container } = render(
      <AvatarStack max={3}>
        <Avatar name="A B" />
        <Avatar name="C D" />
      </AvatarStack>
    );
    expect(container.querySelectorAll('[data-tone]').length).toBe(2);
  });

  it('overflow shows a +N tile', () => {
    const { getByText } = render(
      <AvatarStack max={2}>
        <Avatar name="A B" />
        <Avatar name="C D" />
        <Avatar name="E F" />
        <Avatar name="G H" />
      </AvatarStack>
    );
    expect(getByText('+3')).toBeInTheDocument();
  });
});
