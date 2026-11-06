import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ROUTINE_TEMPLATES, type RoutineTemplate } from '@andthen/core';
import { RoutineIcon } from '../shared/routine-icon';

/**
 * Ready-made routines as tappable cards. One tap picks a whole chain;
 * the parent decides what happens next (save it, then go somewhere).
 */
@Component({
  selector: 'app-template-list',
  imports: [RoutineIcon],
  template: `
    <ul class="templates" role="list">
      @for (t of templates(); track t.id) {
        <li>
          <button
            type="button"
            class="template"
            [disabled]="disabled()"
            [attr.aria-label]="'Use ' + t.name"
            [attr.aria-describedby]="'tpl-' + t.id + '-blurb tpl-' + t.id"
            (click)="picked.emit(t)"
          >
            <span class="template-head">
              <span class="template-name">
                <app-routine-icon class="template-icon" [icon]="t.icon" />{{ t.name }}
              </span>
              <span class="template-use" aria-hidden="true">Use</span>
            </span>
            <span class="template-blurb" [id]="'tpl-' + t.id + '-blurb'">{{ t.blurb }}</span>
            <span class="template-chain" [id]="'tpl-' + t.id">
              <span class="template-anchor">{{ t.anchor }}</span>
              @for (h of t.habits; track h.name) {
                <span class="template-habit"><em>and then</em> {{ h.name.toLowerCase() }}</span>
              }
            </span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    .template-icon {
      margin-right: 8px;
      vertical-align: -3px;
      color: var(--accent-ink);
    }
    .templates {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .template {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      padding: 16px 18px;
      border: 1.5px solid var(--line);
      border-radius: 18px;
      background: var(--surface);
      text-align: left;
    }
    .template:hover:not(:disabled) {
      border-color: var(--accent);
    }
    .template:disabled {
      opacity: 0.6;
    }
    .template-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    .template-name {
      font-size: 17px;
      font-weight: 800;
    }
    .template-use {
      color: var(--accent-ink);
      font-size: 14px;
      font-weight: 700;
    }
    .template-blurb {
      font-size: 14px;
      line-height: 1.4;
      color: var(--muted);
    }
    .template-chain {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 4px;
      padding-left: 12px;
      border-left: 2px solid var(--line);
      font-size: 14px;
      line-height: 1.45;
    }
    .template-anchor {
      font-weight: 700;
      color: var(--ink-soft);
    }
    .template-habit em {
      font-weight: 600;
      color: var(--accent-ink);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateList {
  readonly templates = input<readonly RoutineTemplate[]>(ROUTINE_TEMPLATES);
  readonly disabled = input(false);
  readonly picked = output<RoutineTemplate>();
}
