import { TestBed } from '@angular/core/testing';
import { ROUTINE_ICONS } from '@andthen/core';
import {
  ROUTINE_ICON_GROUPS,
  ROUTINE_ICON_NAMES,
  RoutineIcon,
  searchRoutineIcons,
} from './routine-icon';

describe('routine icons', () => {
  it('puts every icon in exactly one picker group', () => {
    const grouped = ROUTINE_ICON_GROUPS.flatMap((g) => g.icons);
    expect([...grouped].sort()).toEqual([...ROUTINE_ICONS].sort());
  });

  it('names every icon', () => {
    for (const icon of ROUTINE_ICONS) expect(ROUTINE_ICON_NAMES[icon]).toBeTruthy();
  });
});

describe('routine icon search', () => {
  it('finds icons by name, group and keywords, needing every word', () => {
    const ids = (q: string) => searchRoutineIcons(q).flatMap((g) => g.icons);
    expect(ids('swim')).toContain('swim');
    expect(ids('tea')).toEqual(expect.arrayContaining(['tea', 'coffee']));
    expect(ids('LAUNDRY')).toEqual(['shirt']);
    expect(ids('calm self-care bath')).toEqual(['bath']);
    expect(ids('zzzzz')).toEqual([]);
  });

  it('draws every icon', () => {
    for (const icon of ROUTINE_ICONS) {
      TestBed.resetTestingModule();
      const fixture = TestBed.createComponent(RoutineIcon);
      fixture.componentRef.setInput('icon', icon);
      fixture.detectChanges();
      const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
      expect(svg.querySelectorAll('path, circle').length, icon).toBeGreaterThan(0);
    }
  });
});
