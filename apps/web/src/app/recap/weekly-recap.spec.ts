import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { WeeklyRecap } from './weekly-recap';

describe('WeeklyRecap', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [WeeklyRecap],
      providers: [
        provideRouter([]),
        { provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository() },
      ],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    const routine = await store.createChain({
      anchor: 'After I pour my coffee',
      habitName: 'Drink water',
      twoMinuteVersion: 'Take one sip of water',
    });
    const [water] = store.habitsOf(routine.id);
    await store.checkIn(water.id, 'mini');
    const fixture = TestBed.createComponent(WeeklyRecap);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement, store };
  }

  it('describes the week for screen readers and offers to save it', async () => {
    const { root } = await setup();
    const label = root.querySelector('canvas')?.getAttribute('aria-label') ?? '';
    expect(label).toContain('showed up 1 of');
    expect(label).toContain('1 as 2 minutes');
    const buttons = [...root.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(buttons).toContain('Save image');
  });

  it('switches to a 9:16 story size and can hide names', async () => {
    const { fixture, root } = await setup();
    const canvas = () => root.querySelector('canvas')!;
    expect(canvas().getAttribute('height')).toBe('1350');
    const story = root.querySelector<HTMLInputElement>('input[value="story"]')!;
    story.click();
    await fixture.whenStable();
    expect(canvas().getAttribute('width')).toBe('1080');
    expect(canvas().getAttribute('height')).toBe('1920');
    const names = root.querySelector<HTMLInputElement>('.switch-row input')!;
    expect(names.checked).toBe(true);
    names.click();
    await fixture.whenStable();
    expect(names.checked).toBe(false);
  });
});
