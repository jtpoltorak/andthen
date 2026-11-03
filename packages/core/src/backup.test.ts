import { describe, expect, it } from 'vitest';
import { backupFileName, createBackup, parseBackup } from './backup';
import type { BackupData } from './backup';

const sample = (): BackupData => ({
  routines: [
    {
      id: 'r1',
      anchor: 'After I pour my coffee',
      usualTime: '07:30',
      order: 0,
      createdOn: '2026-10-01',
    },
  ],
  habits: [
    {
      id: 'h2',
      routineId: 'r1',
      name: 'Stretch',
      twoMinuteVersion: 'Touch toes',
      makeItEasier: 'Keep the yoga mat out',
      obstacle: 'Running late',
      order: 1,
      createdOn: '2026-10-01',
    },
    {
      id: 'h1',
      routineId: 'r1',
      name: 'Water',
      twoMinuteVersion: 'One sip',
      order: 0,
      createdOn: '2026-10-01',
      archivedOn: '2026-10-20',
    },
  ],
  checkIns: [
    { habitId: 'h2', date: '2026-10-03', kind: 'mini' },
    { habitId: 'h1', date: '2026-10-02', kind: 'full' },
    { habitId: 'h1', date: '2026-10-03', kind: 'skip' },
  ],
  reflections: [
    {
      week: '2026-09-28',
      wentWell: 'Stretched most days',
      tweak: 'Water by the bed',
      savedOn: '2026-10-04',
    },
  ],
});

const file = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ ...createBackup(sample(), new Date('2026-11-02T12:00:00Z')), ...over });

describe('createBackup', () => {
  it('wraps the data with app, version, and time, in a stable order', () => {
    const backup = createBackup(sample(), new Date('2026-11-02T12:00:00Z'));
    expect(backup).toMatchObject({
      app: 'andthen',
      version: 1,
      exportedAt: '2026-11-02T12:00:00.000Z',
    });
    expect(backup.data.habits.map((h) => h.id)).toEqual(['h1', 'h2']);
    expect(backup.data.checkIns.map((c) => c.date)).toEqual([
      '2026-10-02',
      '2026-10-03',
      '2026-10-03',
    ]);
  });

  it('names the file by day', () => {
    expect(backupFileName('2026-11-02')).toBe('andthen-backup-2026-11-02.json');
  });
});

describe('parseBackup', () => {
  it('round-trips a backup and summarizes it', () => {
    const result = parseBackup(file());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.routines[0].usualTime).toBe('07:30');
    expect(result.data.habits.find((h) => h.id === 'h1')?.archivedOn).toBe('2026-10-20');
    expect(result.summary).toEqual({
      routines: 1,
      habits: 2,
      checkIns: 3,
      firstDay: '2026-10-02',
      lastDay: '2026-10-03',
      exportedAt: '2026-11-02T12:00:00.000Z',
    });
  });

  it('keeps "make it easier" notes, trimming them and dropping blank ones', () => {
    const backup = createBackup(sample());
    const water = backup.data.habits.find((h) => h.id === 'h1')!;
    water.makeItEasier = '   ';
    water.obstacle = '  Forgetting  ';
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stretch = result.data.habits.find((h) => h.id === 'h2')!;
    expect(stretch).toMatchObject({
      makeItEasier: 'Keep the yoga mat out',
      obstacle: 'Running late',
    });
    const restoredWater = result.data.habits.find((h) => h.id === 'h1')!;
    expect('makeItEasier' in restoredWater).toBe(false);
    expect(restoredWater.obstacle).toBe('Forgetting');
  });

  it('reads older backups that have no "make it easier" notes', () => {
    const backup = createBackup(sample());
    for (const h of backup.data.habits) {
      delete h.makeItEasier;
      delete h.obstacle;
    }
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok && result.data.habits.every((h) => !('obstacle' in h))).toBe(true);
  });

  it('keeps weekly reflections', () => {
    const result = parseBackup(file());
    expect(result.ok && result.data.reflections).toEqual(sample().reflections);
  });

  it('reads older backups that have no reflections', () => {
    const backup = createBackup(sample()) as unknown as { data: Record<string, unknown> };
    delete backup.data['reflections'];
    const result = parseBackup(backup);
    expect(result.ok && result.data.reflections).toEqual([]);
  });

  it('rejects two reflections for the same week', () => {
    const backup = createBackup(sample());
    backup.data.reflections.push({ ...backup.data.reflections[0] });
    const result = parseBackup(backup);
    expect(!result.ok && result.error).toContain('two reflections');
  });

  it('rejects a note that is not text', () => {
    const backup = createBackup(sample());
    (backup.data.habits[0] as unknown as Record<string, unknown>)['obstacle'] = 42;
    const result = parseBackup(backup);
    expect(result.ok).toBe(false);
  });

  it('drops unknown fields', () => {
    const backup = createBackup(sample());
    (backup.data.routines[0] as unknown as Record<string, unknown>)['evil'] = '<script>';
    const result = parseBackup(backup);
    expect(result.ok && 'evil' in result.data.routines[0]).toBe(false);
  });

  it.each([
    ['not json', '{oops', 'valid JSON'],
    ['another app', JSON.stringify({ app: 'other' }), "isn't an AndThen backup"],
    ['a newer version', file({ version: 2 }), 'newer version'],
    ['missing data', file({ data: null }), 'no data'],
  ])('rejects %s', (_label, input, message) => {
    const result = parseBackup(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  it('rejects bad records with a pointer to which one', () => {
    const bad = (mutate: (d: BackupData) => void) => {
      const backup = createBackup(sample());
      mutate(backup.data);
      const result = parseBackup(JSON.stringify(backup));
      return result.ok ? 'ok' : result.error;
    };
    expect(bad((d) => ((d.routines[0] as { anchor: unknown }).anchor = ''))).toContain('Routine 1');
    expect(bad((d) => (d.routines[0].usualTime = '25:00'))).toContain('usualTime');
    expect(bad((d) => (d.habits[0].createdOn = '2026-13-01'))).toContain('bad date');
    expect(bad((d) => ((d.checkIns[0] as { kind: string }).kind = 'maybe'))).toContain(
      'unknown kind',
    );
    expect(bad((d) => (d.habits[0].routineId = 'gone'))).toContain(
      "routine that isn't in the backup",
    );
    expect(bad((d) => (d.checkIns[0].habitId = 'gone'))).toContain(
      "habit that isn't in the backup",
    );
    expect(bad((d) => d.checkIns.push({ ...d.checkIns[0] }))).toContain('two check-ins');
    expect(bad((d) => d.habits.push({ ...d.habits[0] }))).toContain('same id');
  });

  it('accepts an empty backup', () => {
    const result = parseBackup(
      createBackup({ routines: [], habits: [], checkIns: [], reflections: [] }),
    );
    expect(result.ok && result.summary.firstDay).toBeUndefined();
  });
});
