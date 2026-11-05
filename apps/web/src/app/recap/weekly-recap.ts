import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  type DayKey,
  type DayStatus,
  addDays,
  dayStatus,
  fromDayKey,
  habitWeeks,
  indexCheckIns,
  reflectionFor,
  summarize,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { PreferencesStore } from '../data/preferences';
import { ReflectionPrompt } from '../reflection/reflection-prompt';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  type RecapData,
  drawRecapCard,
  readRecapColors,
} from './recap-card';

const shortDate = (day: DayKey) =>
  fromDayKey(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * The week as a picture: days showed up, each habit's seven dots, and what went well.
 * Save it, or share it with someone who's cheering you on. Made on the device; nothing is uploaded.
 */
@Component({
  selector: 'app-weekly-recap',
  imports: [RouterLink],
  templateUrl: './weekly-recap.html',
  styleUrl: './weekly-recap.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyRecap {
  private readonly store = inject(HabitStore);
  private readonly preferences = inject(PreferencesStore);
  private readonly week = inject(ReflectionPrompt).week;
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('card');

  protected readonly width = CARD_WIDTH;
  protected readonly height = CARD_HEIGHT;
  protected readonly status = signal('');
  /** The phone's share sheet, where the browser can share image files. */
  protected readonly canShare = signal(false);

  protected readonly data = computed((): RecapData => {
    const today = this.store.today();
    const week = this.week();
    const startsOn = this.preferences.prefs().weekStartsOn;
    const index = indexCheckIns(this.store.checkIns());
    const last = week.to < today ? week.to : today;
    const summary = summarize(this.store.checkIns(), week.from, last);
    const habits = habitWeeks(
      this.store.activeRoutines(),
      this.store.habits(),
      index,
      week,
      today,
      startsOn,
    ).map((entry) => {
      const days: DayStatus[] = [];
      for (let d = week.from; d <= week.to; d = addDays(d, 1)) {
        days.push(dayStatus(entry.habit, entry.routine, index, d, today, startsOn));
      }
      return { name: entry.habit.name, days };
    });
    const data: RecapData = {
      range: `${shortDate(week.from)} – ${shortDate(week.to)}`,
      daysShowedUp: summary.daysShowedUp,
      daysSoFar: summary.daysSoFar,
      full: summary.full,
      mini: summary.mini,
      skips: summary.skips,
      habits,
      dayLabels: Array.from({ length: 7 }, (_, i) =>
        fromDayKey(addDays(week.from, i)).toLocaleDateString(undefined, { weekday: 'narrow' }),
      ),
    };
    const wentWell = reflectionFor(this.store.reflections(), week.from)?.wentWell;
    if (wentWell) data.wentWell = wentWell;
    return data;
  });

  /** Plain-text version of the card, for screen readers and the share message. */
  protected readonly summaryText = computed(() => {
    const d = this.data();
    return `My week with AndThen (${d.range}): showed up ${d.daysShowedUp} of ${d.daysSoFar} days. ${d.full} done, ${d.mini} as 2 minutes, ${d.skips} skipped.`;
  });

  constructor() {
    effect(() => {
      const data = this.data();
      this.preferences.prefs(); // Redraw when the theme or accent changes.
      const el = this.canvas()?.nativeElement;
      if (el) void this.draw(el, data);
    });
  }

  private async draw(el: HTMLCanvasElement, data: RecapData): Promise<void> {
    const ctx = el.getContext('2d');
    if (!ctx) return;
    // Draw once right away, and again when the app font is ready, so text never shows late.
    drawRecapCard(ctx, data, readRecapColors());
    try {
      await document.fonts?.load(`800 40px Manrope`);
      drawRecapCard(ctx, data, readRecapColors());
    } catch {
      // The system font is fine.
    }
    const probe = new File([''], 'probe.png', { type: 'image/png' });
    this.canShare.set(!!navigator.canShare?.({ files: [probe] }));
  }

  private toBlob(): Promise<Blob | null> {
    const el = this.canvas()?.nativeElement;
    return new Promise((resolve) => (el ? el.toBlob(resolve, 'image/png') : resolve(null)));
  }

  private fileName(): string {
    return `andthen-week-${this.week().from}.png`;
  }

  protected async share(): Promise<void> {
    const blob = await this.toBlob();
    if (!blob) return;
    const file = new File([blob], this.fileName(), { type: 'image/png' });
    try {
      await navigator.share({ files: [file], text: this.summaryText() });
    } catch {
      // Closing the share sheet isn't an error worth showing.
    }
  }

  protected async save(): Promise<void> {
    const blob = await this.toBlob();
    if (!blob) {
      this.status.set("Couldn't make the image on this device.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.status.set('Saved to your downloads.');
  }
}
