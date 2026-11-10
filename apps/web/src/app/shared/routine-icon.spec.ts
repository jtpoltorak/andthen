import { ROUTINE_ICONS } from '@andthen/core';
import { ROUTINE_ICON_GROUPS, ROUTINE_ICON_NAMES } from './routine-icon';

describe('routine icons', () => {
  it('puts every icon in exactly one picker group', () => {
    const grouped = ROUTINE_ICON_GROUPS.flatMap((g) => g.icons);
    expect([...grouped].sort()).toEqual([...ROUTINE_ICONS].sort());
  });

  it('names every icon', () => {
    for (const icon of ROUTINE_ICONS) expect(ROUTINE_ICON_NAMES[icon]).toBeTruthy();
  });
});
