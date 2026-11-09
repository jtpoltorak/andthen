import { DEFAULT_EXT_SETTINGS, parseExtSettings } from './ext-settings';

describe('parseExtSettings', () => {
  it('falls back to the defaults for anything odd', () => {
    expect(parseExtSettings(undefined)).toEqual(DEFAULT_EXT_SETTINGS);
    expect(parseExtSettings({ badge: 'nope', weekStartsOn: 3, reminders: 7 })).toEqual(
      DEFAULT_EXT_SETTINGS,
    );
  });

  it('keeps valid settings', () => {
    expect(
      parseExtSettings({
        badge: false,
        weekStartsOn: 0,
        reminders: { enabled: true, leadMinutes: 15, mutedRoutineIds: ['r1'] },
      }),
    ).toEqual({
      badge: false,
      weekStartsOn: 0,
      reminders: { enabled: true, leadMinutes: 15, mutedRoutineIds: ['r1'] },
    });
  });
});
