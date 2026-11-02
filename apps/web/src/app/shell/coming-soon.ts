import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Placeholder for tabs that land in a later pull request. Route data supplies the inputs. */
@Component({
  selector: 'app-coming-soon',
  template: `
    <main>
      <h1>{{ title() }}</h1>
      <p>{{ blurb() }}</p>
    </main>
  `,
  styles: `
    main {
      padding: 28px 20px;
    }
    h1 {
      margin-bottom: 12px;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 15px;
      line-height: 1.5;
      color: var(--muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoon {
  readonly title = input('');
  readonly blurb = input('');
}
