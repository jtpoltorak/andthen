import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { decodeSharedRoutine, describeSchedule } from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { RoutineIcon } from '../shared/routine-icon';

/**
 * `/add#…`: where a shared routine link lands. Shows the chain someone sent,
 * and adds it to this device with one tap. The routine travels after the #,
 * so it's read right here and never sent to a server.
 */
@Component({
  selector: 'app-add-shared-routine',
  imports: [RouterLink, RoutineIcon],
  template: `
    <main class="page">
      <a class="brand" routerLink="/" aria-label="AndThen home">
        <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
          <circle cx="8" cy="15" r="5" fill="currentColor" />
          <path d="M13 15h4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="22.5" cy="15" r="5" fill="none" stroke="currentColor" stroke-width="2.5" />
        </svg>
        AndThen
      </a>
      @if (shared; as routine) {
        <h1 tabindex="-1">Someone shared a routine with you</h1>
        <section class="card" aria-label="The shared routine">
          @if (routine.name) {
            <p class="name">{{ routine.name }}</p>
          }
          <ol class="chain">
            <li class="step anchor">
              @if (routine.icon) {
                <app-routine-icon [icon]="routine.icon" [tile]="true" />
              } @else {
                <span class="node anchor-node" aria-hidden="true"></span>
              }
              <span class="text">{{ routine.anchor }}</span>
            </li>
            @for (habit of routine.habits; track $index) {
              <li class="step">
                <span class="node" aria-hidden="true"></span>
                <span class="text">
                  <span class="habit">{{ habit.name }}</span>
                  <span class="sub">Tiny version: {{ lowerFirst(habit.twoMinuteVersion) }}</span>
                  @if (habit.schedule) {
                    <span class="sub">{{ scheduleText(habit.schedule) }}</span>
                  }
                  @if (habit.makeItEasier) {
                    <span class="sub easier">Make it easy: {{ habit.makeItEasier }}</span>
                  }
                </span>
              </li>
            }
          </ol>
        </section>
        <p class="hint">
          It becomes your own copy. Change anything you like afterwards; the person who sent it
          won't see your check-ins.
        </p>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        <button type="button" class="btn-primary" [disabled]="busy()" (click)="add()">
          Add to my routines
        </button>
        <a class="back" routerLink="/">No thanks</a>
      } @else {
        <h1 tabindex="-1">This link doesn't work</h1>
        <p class="hint">
          The shared routine in it is incomplete or damaged. Ask for the link again, or start your
          own routine.
        </p>
        <a class="btn-primary" routerLink="/">Open AndThen</a>
      }
    </main>
  `,
  styles: `
    .page {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 560px;
      margin: 0 auto;
      padding: 28px 20px 32px;
      font-size: 15px;
      line-height: 1.5;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      align-self: flex-start;
      color: var(--ink);
      font-size: 22px;
      font-weight: 800;
      text-decoration: none;
    }
    .brand svg {
      color: var(--accent);
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    .card {
      padding: 20px;
      border-radius: var(--radius-card);
      border: 1px solid var(--border);
      background: var(--surface);
    }
    .name {
      margin-bottom: 10px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .chain {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .step {
      position: relative;
      display: flex;
      gap: 14px;
      padding-bottom: 16px;
    }
    .step:last-child {
      padding-bottom: 0;
    }
    /* The line joining each step to the next. */
    .step:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 13px;
      top: 30px;
      bottom: 2px;
      width: 2px;
      background: var(--line);
    }
    .node {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid var(--accent);
      background: var(--surface);
    }
    .anchor-node {
      width: 12px;
      height: 12px;
      margin: 8px;
      border: none;
      background: var(--muted);
    }
    .anchor .text {
      color: var(--muted);
      font-weight: 600;
      line-height: 28px;
    }
    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .habit {
      font-size: 17px;
      font-weight: 700;
      line-height: 28px;
    }
    .sub {
      font-size: 13px;
      color: var(--muted);
    }
    .easier {
      color: var(--accent-ink);
    }
    .hint {
      color: var(--muted);
    }
    .error {
      color: var(--danger);
      font-weight: 600;
    }
    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 52px;
      border: none;
      border-radius: 14px;
      background: var(--accent);
      color: var(--on-accent);
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
    }
    .btn-primary:disabled {
      background: var(--disabled);
    }
    .back {
      align-self: center;
      min-height: 44px;
      line-height: 44px;
      color: var(--accent-ink);
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddSharedRoutine {
  private readonly store = inject(HabitStore);
  private readonly router = inject(Router);
  protected readonly shared = decodeSharedRoutine(inject(ActivatedRoute).snapshot.fragment ?? '');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly scheduleText = describeSchedule;
  protected readonly lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

  protected async add(): Promise<void> {
    if (!this.shared) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.load();
      await this.store.createFromTemplate(this.shared);
      await this.router.navigateByUrl('/today');
    } catch {
      this.error.set("Couldn't add it just now. Try again.");
      this.busy.set(false);
    }
  }
}
