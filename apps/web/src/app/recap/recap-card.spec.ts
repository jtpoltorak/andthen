import { type RecapData, fitRows } from './recap-card';

const data = (habits: number, over: Partial<RecapData> = {}): RecapData => ({
  range: 'Nov 2 – Nov 8',
  daysShowedUp: 3,
  daysSoFar: 7,
  full: 3,
  mini: 0,
  skips: 0,
  habits: Array.from({ length: habits }, () => ({ name: 'Water', days: [] })),
  dayLabels: [],
  ...over,
});

describe('fitRows', () => {
  it('shows up to six habits when there is room', () => {
    expect(fitRows(data(8), false, 2000)).toBe(6);
    expect(fitRows(data(2), false, 2000)).toBe(2);
  });

  it('gives up rows so "what went well" and the story garden always fit', () => {
    const plants = [{ stage: 'sprout' as const, resting: false, label: 'Seed' }];
    // 610 px: six rows fit alone, but "what went well" (160) needs some of that room.
    expect(fitRows(data(6), false, 610)).toBe(6);
    expect(fitRows(data(6, { wentWell: 'Kept going' }), false, 610)).toBe(4);
    // A story also reserves room for the garden.
    expect(fitRows(data(6, { wentWell: 'Kept going', plants }), true, 826)).toBe(3);
    expect(fitRows(data(6, { plants }), false, 610)).toBe(6);
  });
});
