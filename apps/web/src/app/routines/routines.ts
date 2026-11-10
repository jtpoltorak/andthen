import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { isPausedOn } from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { EmptyState } from '../shared/empty-state';
import { HelpLink } from '../help/help-link';
import { RoutineIcon } from '../shared/routine-icon';
import { ListDrag } from '../shared/list-drag';
import { byId, focusAfterRender } from '../shared/focus';

/**
 * Routines tab: every chain at a glance. Tap one to edit it, or tap Reorder to drag them
 * (or move them with arrows) into the order they show everywhere else.
 */
@Component({
  selector: 'app-routines',
  imports: [RouterLink, HelpLink, EmptyState, RoutineIcon],
  template: `
    <main class="page">
      <div class="title-row">
        <h1>Routines</h1>
        <div class="title-tools">
          @if (items().length > 1) {
            <button
              type="button"
              id="reorder-toggle"
              class="reorder-toggle"
              [class.on]="reordering()"
              [attr.aria-pressed]="reordering()"
              (click)="toggleReorder()"
            >
              {{ reordering() ? 'Done' : 'Reorder' }}
            </button>
          }
          <app-help-link slug="routines" />
        </div>
      </div>

      @if (reordering()) {
        <p class="hint">
          Drag a routine by its handle, or use the arrows. Today keeps morning, afternoon and
          evening apart, and uses this order inside each.
        </p>
        <ol class="reorder-list" aria-label="Routine order">
          @for (
            item of items();
            track item.routine.id;
            let i = $index, first = $first, last = $last
          ) {
            <li
              class="reorder-row"
              [class.dragging]="drag()?.id === item.routine.id"
              [class.drag-active]="!!drag()"
              [style.transform]="rowShift(i)"
            >
              <!-- Drag handle for touch and mouse. Keyboards use the up and down buttons. -->
              <span
                class="grip"
                aria-hidden="true"
                [title]="'Drag to move ' + label(item.routine)"
                (pointerdown)="startDrag($event, item.routine.id, i)"
                (pointermove)="moveDrag($event)"
                (pointerup)="endDrag($event)"
                (pointercancel)="endDrag($event, true)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="6" r="1.6" />
                  <circle cx="15" cy="6" r="1.6" />
                  <circle cx="9" cy="12" r="1.6" />
                  <circle cx="15" cy="12" r="1.6" />
                  <circle cx="9" cy="18" r="1.6" />
                  <circle cx="15" cy="18" r="1.6" />
                </svg>
              </span>
              <span class="reorder-label">
                @if (item.routine.icon) {
                  <app-routine-icon class="anchor-icon" [icon]="item.routine.icon" />
                } @else {
                  <span class="anchor-dot" aria-hidden="true"></span>
                }
                <span class="reorder-text">{{ label(item.routine) }}</span>
              </span>
              <button
                type="button"
                class="icon-btn"
                [id]="'up-' + item.routine.id"
                [disabled]="first"
                [attr.aria-label]="'Move ' + label(item.routine) + ' up'"
                (click)="move(item.routine.id, -1)"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 15l6-6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                class="icon-btn"
                [id]="'down-' + item.routine.id"
                [disabled]="last"
                [attr.aria-label]="'Move ' + label(item.routine) + ' down'"
                (click)="move(item.routine.id, 1)"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </li>
          }
        </ol>
      } @else {
        <p class="hint">
          Each routine starts with something you already do, and then a few tiny habits.
        </p>
        @for (item of items(); track item.routine.id) {
          <a
            class="routine-card"
            [class.named]="!!item.routine.name"
            [routerLink]="['/routines', item.routine.id]"
          >
            @if (item.routine.name) {
              <span class="routine-name">{{ item.routine.name }}</span>
            }
            <span class="routine-anchor">
              @if (item.routine.icon) {
                <app-routine-icon class="anchor-icon" [icon]="item.routine.icon" />
              } @else {
                <span class="anchor-dot" aria-hidden="true"></span>
              }
              {{ item.routine.anchor }}
              @if (item.paused) {
                <span class="paused-tag">Paused</span>
              }
            </span>
            <span class="routine-habits">
              @for (h of item.habits; track h.id; let last = $last) {
                {{ h.name }}{{ last ? '' : ' · ' }}
              } @empty {
                No habits yet
              }
            </span>
            <span class="routine-edit">Edit</span>
          </a>
        } @empty {
          <app-empty-state art="chain" heading="No routines yet">
            <p>
              A routine is one thing you already do, and a tiny habit or two after it. "After I pour
              my coffee, and then I'll stretch."
            </p>
          </app-empty-state>
        }

        <a class="and-then" routerLink="/routines/new">+ New routine</a>
      }
    </main>
  `,
  styleUrl: './routines.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Routines {
  private readonly store = inject(HabitStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** True while the list is folded into slim rows for reordering. */
  protected readonly reordering = signal(false);

  private readonly dragger = new ListDrag(
    () => [...this.host.nativeElement.querySelectorAll<HTMLElement>('.reorder-row')],
    (id, by) => this.store.moveRoutine(id, by),
  );
  protected readonly drag = this.dragger.state;

  protected readonly items = computed(() =>
    this.store.activeRoutines().map((routine) => ({
      routine,
      habits: this.store.habitsOf(routine.id),
      paused: isPausedOn(routine, this.store.today()),
    })),
  );

  /** A routine's short label: its name if it has one, else its anchor. */
  protected label(routine: { name?: string; anchor: string }): string {
    return routine.name || routine.anchor;
  }

  protected toggleReorder(): void {
    this.reordering.update((on) => !on);
    focusAfterRender(this.injector, byId('reorder-toggle'));
  }

  protected startDrag(event: PointerEvent, id: string, index: number): void {
    this.dragger.start(event, id, index);
  }

  protected moveDrag(event: PointerEvent): void {
    this.dragger.move(event);
  }

  protected endDrag(event: PointerEvent, cancelled = false): Promise<void> {
    return this.dragger.end(event, cancelled);
  }

  protected rowShift(index: number): string | null {
    return this.dragger.shift(index);
  }

  /** Moves a routine, keeping focus on its arrow (or the other one, at the top or bottom). */
  protected async move(id: string, by: number): Promise<void> {
    await this.store.moveRoutine(id, by);
    const [same, other] = by < 0 ? ['up', 'down'] : ['down', 'up'];
    focusAfterRender(this.injector, () => {
      const button = document.getElementById(`${same}-${id}`) as HTMLButtonElement | null;
      return button && !button.disabled ? button : document.getElementById(`${other}-${id}`);
    });
  }
}
