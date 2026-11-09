import { TestBed } from '@angular/core/testing';
import { loadExtSettings, resetExtSettingsForTests } from '../shared/ext-settings';
import { SettingsPanel } from './settings-panel';

describe('SettingsPanel', () => {
  beforeEach(() => resetExtSettingsForTests());

  async function setup() {
    TestBed.configureTestingModule({ imports: [SettingsPanel] });
    const fixture = TestBed.createComponent(SettingsPanel);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('turns reminders on and picks how early they come', async () => {
    const { fixture, root } = await setup();
    const reminders = root.querySelector<HTMLInputElement>('#ext-reminders')!;
    expect(reminders.checked).toBe(false);
    expect(root.querySelector('#ext-lead')).toBeNull();

    reminders.click();
    await fixture.whenStable();
    expect((await loadExtSettings()).reminders.enabled).toBe(true);

    const lead = root.querySelector<HTMLSelectElement>('#ext-lead')!;
    lead.value = '15';
    lead.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect((await loadExtSettings()).reminders.leadMinutes).toBe(15);
  });

  it('turns the badge off', async () => {
    const { fixture, root } = await setup();
    const badge = root.querySelector<HTMLInputElement>('#ext-badge')!;
    expect(badge.checked).toBe(true);
    badge.click();
    await fixture.whenStable();
    expect((await loadExtSettings()).badge).toBe(false);
  });
});
