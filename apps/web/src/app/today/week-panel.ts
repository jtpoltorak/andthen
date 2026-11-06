import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addDays, fromDayKey, summarize, weekStart } from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { PreferencesStore } from '../data/preferences';

interface WeekDay {
  date: string;
  letter: string;
  label: string;
  state: 'full' | 'mini' | 'skip' | 'none' | 'future';
  today: boolean;
}

/**
 * "This week", beside Today on wide screens: days showed up, the week's totals, and a
 * dot per day. Hidden on phones by Today's own layout, where Progress has the same.
 */
@Component({
  selector: 'app-week-panel',
  imports: [RouterLink],
  template: `
    <section class="panel" aria-labelledby="week-panel-title">
      <h2 id="week-panel-title" class="eyebrow">This week</h2>
      <p class="big">
        Showed up {{ week().daysShowedUp }} of {{ week().daysSoFar }}
        {{ week().daysSoFar === 1 ? 'day' : 'days' }}
      </p>
      <ol class="days">
        @for (day of days(); track day.date) {
          <li [class.today]="day.today">
            <span [class]="'dot dot-' + day.state" [title]="day.label"></span>
            <span class="letter" aria-hidden="true">{{ day.letter }}</span>
            <span class="visually-hidden">{{ day.label }}</span>
          </li>
        }
      </ol>
      <div class="chips">
        <span class="chip chip-full">{{ week().full }} done</span>
        <span class="chip chip-mini">{{ week().mini }} as 2 min</span>
        <span class="chip chip-skip">{{ week().skips }} skipped</span>
      </div>
      <div class="links">
        <a routerLink="/progress">See Progress</a>
        <a routerLink="/reflect">Reflect on your week</a>
      </div>
    </section>
  `,
  styles: `
    .panel {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
    }
    .eyebrow {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .big {
      font-size: 20px;
      font-weight: 800;
      line-height: 1.25;
    }
    .days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .days li {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      box-sizing: border-box;
    }
    .dot-full {
      background: var(--accent);
    }
    .dot-mini {
      background: var(--amber);
    }
    .dot-skip {
      border: 2px dashed var(--dashed);
    }
    .dot-none {
      background: var(--line);
    }
    .dot-future {
      border: 2px solid var(--line);
    }
    .letter {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
    }
    .today .letter {
      color: var(--accent-ink);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
    }
    .chip-full {
      background: var(--accent-soft);
      color: var(--accent-ink);
    }
    .chip-mini {
      background: var(--amber-soft);
      color: var(--amber-soft-ink);
    }
    .chip-skip {
      border: 1px solid var(--border);
      color: var(--muted);
    }
    .links {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .links a {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      color: var(--accent-ink);
      font-size: 14px;
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPanel {
  private readonly store = inject(HabitStore);
  private readonly preferences = inject(PreferencesStore);

  private readonly start = computed(() =>
    weekStart(this.store.today(), this.preferences.prefs().weekStartsOn),
  );

  protected readonly week = computed(() =>
    summarize(this.store.checkIns(), this.start(), this.store.today()),
  );

  /** One dot per day: the best answer that day (done beats 2 min beats skip). */
  protected readonly days = computed((): WeekDay[] => {
    const today = this.store.today();
    const byDay = new Map<string, Set<string>>();
    for (const c of this.store.checkIns()) {
      if (c.date < this.start() || c.date > today) continue;
      const kinds = byDay.get(c.date) ?? new Set<string>();
      kinds.add(c.kind);
      byDay.set(c.date, kinds);
    }
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(this.start(), i);
      const kinds = byDay.get(date);
      const state: WeekDay['state'] =
        date > today
          ? 'future'
          : kinds?.has('full')
            ? 'full'
            : kinds?.has('mini')
              ? 'mini'
              : kinds?.has('skip')
                ? 'skip'
                : 'none';
      const day = fromDayKey(date);
      const name = day.toLocaleDateString(undefined, { weekday: 'long' });
      const words = {
        full: 'done',
        mini: 'did a 2-minute version',
        skip: 'skipped',
        none: 'no check-in',
        future: 'still to come',
      }[state];
      return {
        date,
        letter: name.charAt(0),
        label: `${name}: ${words}`,
        state,
        today: date === today,
      };
    });
  });
}
