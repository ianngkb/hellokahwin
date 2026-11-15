import { describe, it, expect } from 'vitest';
import { moveMember } from '../[cluster-id]/move-member';

describe('moveMember', () => {
  const list = ['a', 'b', 'c'];

  it('moves an item up and down by one', () => {
    expect(moveMember(list, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveMember(list, 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('leaves the first item when moved up and the last when moved down', () => {
    expect(moveMember(list, 0, -1)).toEqual(list);
    expect(moveMember(list, 2, 1)).toEqual(list);
  });

  it('never mutates its input and handles one or zero items', () => {
    const before = [...list];
    moveMember(list, 0, 1);
    expect(list).toEqual(before);
    expect(moveMember(['only'], 0, 1)).toEqual(['only']);
    expect(moveMember([], 0, -1)).toEqual([]);
  });
});
