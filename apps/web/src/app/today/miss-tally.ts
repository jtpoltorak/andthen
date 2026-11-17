import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  MISS_REASON_LABELS,
  addDays,
  mostMissedHabit,
  tallyMissReasons,
  weekStart,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { PreferencesStore } from '../data/preferences';

/**
 * "What got in the way" this week, from the notes on missed days, under This week
 * on Today. When one reason comes up more than once, it offers a "make it easy"
 * note on the habit missed most: turning a pattern into a plan.
 */
@Component({
  selector: 'app-miss-tally',
  imports: [RouterLink],
  template: `
    @if (tally().length) {
      <section class="tally" aria-labelledby="miss-tally-title">
        <h3 id="miss-tally-title" class="eyebrow">What got in the way</h3>
        <ul class="reasons">
          @for (t of tally(); track t.reason) {
            <li class="reason">{{ labels[t.reason] }} · {{ t.count }}</li>
          }
        </ul>
        @if (pattern(); as top) {
          <p class="hint">{{ top }} comes up most. Want to plan around it?</p>
          @if (habitToPlan(); as habit) {
            <a class="plan" [routerLink]="['/routines', habit.routineId]"
              >Add a "make it easy" note<span class="visually-hidden"> to {{ habit.name }}</span></a
            >
          }
        }
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
      align-self: stretch;
    }
    .tally {
      margin-top: 6px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .eyebrow {
      margin: 0 0 10px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .reasons {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .reason {
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--amber-soft);
      color: var(--amber-soft-ink);
      font-size: 13px;
      font-weight: 700;
    }
    .hint {
      margin: 10px 0 0;
      font-size: 13px;
      line-height: 1.4;
      color: var(--muted);
    }
    .plan {
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
export class MissTally {
  private readonly store = inject(HabitStore);
  private readonly preferences = inject(PreferencesStore);
  protected readonly labels = MISS_REASON_LABELS;

  private readonly span = computed(() => {
    const from = weekStart(this.store.today(), this.preferences.prefs().weekStartsOn);
    return { from, to: addDays(from, 6) };
  });
  protected readonly tally = computed(() => {
    const { from, to } = this.span();
    return tallyMissReasons(this.store.habits(), from, to);
  });
  /** The top reason, once it has come up at least twice. */
  protected readonly pattern = computed(() => {
    const top = this.tally()[0];
    return top && top.count >= 2 ? MISS_REASON_LABELS[top.reason] : undefined;
  });
  protected readonly habitToPlan = computed(() => {
    const { from, to } = this.span();
    return mostMissedHabit(
      this.store.habits().filter((h) => !h.archivedOn),
      from,
      to,
    );
  });
}
