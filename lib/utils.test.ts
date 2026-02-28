import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('lib/utils cn()', () => {
  it('merges tailwind classes correctly', () => {
    // Should pass through single classes
    expect(cn('bg-red-500')).toBe('bg-red-500');

    // Should merge multiple classes
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  it('handles conditional classes properly', () => {
    const isTrue = true;
    const isFalse = false;

    // Truthy conditions should be included
    expect(cn('flex', isTrue && 'items-center')).toBe('flex items-center');

    // Falsy conditions should be ignored
    expect(cn('flex', isFalse && 'items-center')).toBe('flex');
    expect(cn('flex', isFalse ? 'hidden' : 'text-sm')).toBe('flex text-sm');
  });

  it('resolves tailwind conflicts using tailwind-merge', () => {
    // text-white and text-black conflict, text-black wins because it's last
    expect(cn('text-white', 'text-black', 'text-red-500')).toBe('text-red-500');

    // padding x conflicts
    expect(cn('px-2', 'px-4')).toBe('px-4');

    // padding all vs padding x
    expect(cn('p-2', 'px-4')).toBe('p-2 px-4');
  });
});
