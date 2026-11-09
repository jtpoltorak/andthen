import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  ROUTINE_TEMPLATES,
  type Chain,
  type ChainLink,
  type CheckInKind,
  type PartOfDay,
  type RoutineTemplate,
  chainsByPartOfDay,
  fromDayKey,
  pickActiveRoutine,
} from '@andthen/core';
import { HabitStore } from '@web/data/habit-store';
import { PreferencesStore } from '@web/data/preferences';
import { readJson } from '@web/data/local-store';
import { SyncService } from '@web/sync/sync.service';
import { CheckInJournal } from '@web/today/check-in-journal';
import { DayRing } from '@web/today/day-ring';
import { WeekPanel } from '@web/today/week-panel';
import { WEB_APP_URL } from './links';
import { PENDING_KEY, SignIn } from './sign-in';
import { SyncStatus } from './sync-status';
import { SettingsPanel } from './settings-panel';
import {
  extensionApi,
  notifyHabitsChanged,
  onHabitsChanged,
  saveExtSettings,
} from '../shared/ext-settings';

/** How long "Saved … Undo" stays after an answer. */
export const UNDO_MS = 6000;

const lowerFirst = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : '');

export { WEB_APP_URL };

/** What the popup's body shows. */
export type Panel = 'today' | 'sign-in' | 'sync' | 'settings';

const PART_LABELS: Record<PartOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

/**
 * The toolbar popup: today's routines, with the next habit up front and one tap
 * to check it off. Anything that needs room opens the full app in a tab.
 *
 * The same page is the side panel (sidepanel.html, marked data-mode="panel"), where
 * there's room for this week's dots and the tiny journal too.
 */
@Component({
  selector: 'ext-popup',
  imports: [DayRing, SignIn, SyncStatus, SettingsPanel, WeekPanel, CheckInJournal],
  host: { '[class.in-panel]': 'inPanel' },
  templateUrl: './popup.html',
  styleUrl: './popup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Popup {
  protected readonly store = inject(HabitStore);
  // Applies the theme, accent and text options to the popup, as in the app.
  private readonly preferences = inject(PreferencesStore);
  protected readonly sync = inject(SyncService);

  /** Opens on sign-in when one was left half done (the popup closed to read the email). */
  protected readonly panel = signal<Panel>(readJson(PENDING_KEY) ? 'sign-in' : 'today');
  /** On first run, after "I'm new": the starter routines. */
  protected readonly choosingStarter = signal(false);

  protected readonly webAppUrl = WEB_APP_URL;
  protected readonly lowerFirst = lowerFirst;
  private undoTimer?: ReturnType<typeof setTimeout>;
  protected readonly partLabels = PART_LABELS;
  protected readonly loaded = signal(false);

  /** A card opened by hand; otherwise the popup opens the routine that's due. */
  private readonly openedByHand = signal<string | undefined>(undefined);
  /** The habit just answered, so it can be undone. */
  protected readonly lastAnswer = signal<{ habitId: string; name: string } | undefined>(undefined);

  protected readonly dateLabel = computed(() =>
    fromDayKey(this.store.today()).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  );

  protected readonly chains = computed(() => this.store.chains());
  protected readonly groups = computed(() => chainsByPartOfDay(this.chains()));
  protected readonly statuses = computed(() =>
    this.chains().flatMap((c) => c.links.map((l) => l.status)),
  );
  protected readonly allDone = computed(() => {
    const chains = this.chains().filter((c) => c.total > 0 && !c.paused);
    return chains.length > 0 && chains.every((c) => c.complete);
  });

  protected readonly activeId = computed(() => {
    const byHand = this.openedByHand();
    if (byHand && this.chains().some((c) => c.routine.id === byHand)) return byHand;
    const now = new Date();
    return pickActiveRoutine(this.chains(), now.getHours() * 60 + now.getMinutes());
  });

  /** Offered while the extension has no routines yet. */
  protected readonly starters = ROUTINE_TEMPLATES;

  /** True in the side panel, false in the popup. */
  protected readonly inPanel = inject(DOCUMENT).documentElement.dataset['mode'] === 'panel';
  /** The habit whose "how did it feel?" box is open (side panel). */
  protected readonly journaling = signal<string | undefined>(undefined);
  /** Today's done and 2-minute answers, for the tiny journal in the side panel. */
  protected readonly answeredToday = computed(() =>
    this.chains().flatMap((c) =>
      c.links.filter((l) => l.status === 'full' || l.status === 'mini').map((l) => l.habit),
    ),
  );

  private readonly api = extensionApi();
  /** Known before the click, because opening the side panel must happen right in it. */
  private windowId?: number;
  /** Chrome and Edge's side panel, or Firefox's sidebar, from the popup. */
  protected readonly canOpenPanel =
    !this.inPanel && !!(this.api?.sidePanel?.open || this.api?.sidebarAction?.open);

  constructor() {
    void this.store.load().then(() => this.loaded.set(true));
    // With sync on, every open catches up with the other devices (and the store reloads).
    void this.sync.start();
    // The background worker counts "N times a week" habits by the same week as the app.
    void saveExtSettings({ weekStartsOn: this.preferences.prefs().weekStartsOn });
    // When sync brings changes from other devices, the badge and any other open page catch up.
    effect(() => {
      if (this.sync.lastSyncedAt()) untracked(() => notifyHabitsChanged());
    });
    // A check-in in the popup shows up in an open side panel, and the other way round.
    const stopListening = onHabitsChanged(() => void this.store.reload());
    if (this.canOpenPanel && this.api?.sidePanel) {
      void this.api.windows.getCurrent().then((w) => (this.windowId = w.id));
    }
    // "Today" rolls over at midnight, even in a side panel left open all night.
    const onVisible = () => this.store.refreshDay();
    document.addEventListener('visibilitychange', onVisible);
    const dayTimer = this.inPanel ? setInterval(onVisible, 60_000) : undefined;
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(dayTimer);
      stopListening();
      this.sync.stop();
      clearTimeout(this.undoTimer);
    });
  }

  protected nextLink(chain: Chain): ChainLink | undefined {
    return chain.links.find((l) => l.isNext);
  }

  protected toggle(chain: Chain): void {
    this.openedByHand.set(this.activeId() === chain.routine.id ? '' : chain.routine.id);
  }

  protected async answer(link: ChainLink, kind: CheckInKind): Promise<void> {
    await this.store.checkIn(link.habit.id, kind);
    notifyHabitsChanged();
    this.lastAnswer.set({ habitId: link.habit.id, name: link.habit.name });
    clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => this.lastAnswer.set(undefined), UNDO_MS);
  }

  protected async undo(): Promise<void> {
    const last = this.lastAnswer();
    if (!last) return;
    clearTimeout(this.undoTimer);
    await this.store.undoCheckIn(last.habitId);
    notifyHabitsChanged();
    this.lastAnswer.set(undefined);
  }

  protected async start(template: RoutineTemplate): Promise<void> {
    await this.store.createFromTemplate(template);
    notifyHabitsChanged();
    this.choosingStarter.set(false);
  }

  /** Moves to the side panel. The call happens right in the click, as browsers require. */
  protected openPanel(): void {
    const api = this.api;
    if (!api) return;
    const opening =
      api.sidePanel && this.windowId !== undefined
        ? api.sidePanel.open({ windowId: this.windowId })
        : api.sidebarAction?.open();
    void opening?.then(() => window.close()).catch(() => undefined);
  }

  protected show(panel: Panel): void {
    this.panel.set(panel);
  }
}
