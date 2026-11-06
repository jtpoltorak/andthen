import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The AndThen idea in one picture: something you already do cues a tiny habit, which cues
 * the next, and checking them off closes the loop until tomorrow's cue. Built from HTML, not
 * an image, so it follows the theme and accent color, reflows on phones (top to bottom) and
 * laptops (left to right), and reads in order with a screen reader.
 */
@Component({
  selector: 'app-and-then-diagram',
  template: `
    <figure class="diagram">
      <ol class="flow">
        <li class="step anchor">
          <span class="node" aria-hidden="true"></span>
          <span class="kind">Something you already do</span>
          <span class="example">“After I pour my coffee…”</span>
          <span class="note">The cue. You never have to remember it.</span>
        </li>
        <li class="link" aria-hidden="true"><span>and then</span></li>
        <li class="step habit">
          <span class="node" aria-hidden="true"></span>
          <span class="kind">A tiny habit</span>
          <span class="example">“…I drink a glass of water…”</span>
          <span class="note">Full, or the 2-minute version. Both count.</span>
        </li>
        <li class="link" aria-hidden="true"><span>and then</span></li>
        <li class="step habit">
          <span class="node" aria-hidden="true"></span>
          <span class="kind">The next tiny habit</span>
          <span class="example">“…and I stretch.”</span>
          <span class="note">Each habit becomes the cue for the next.</span>
        </li>
        <li class="link" aria-hidden="true"><span>and then</span></li>
        <li class="step done">
          <span class="node" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <span class="kind">Check it off</span>
          <span class="example">Chain complete</span>
          <span class="note">It feels finished, so you want to come back.</span>
        </li>
      </ol>
      <div class="loop">
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
          <path d="M20 12a8 8 0 1 1-2.6-5.9" />
          <path d="M20 4v5h-5" />
        </svg>
        <span>
          <strong>Tomorrow, the same cue starts it again.</strong> Missed a day? The chain survives
          one miss. Just don't miss twice.
        </span>
      </div>
      <figcaption>
        The AndThen loop: one thing you already do, and then a few tiny habits, each cueing the
        next.
      </figcaption>
    </figure>
  `,
  styles: `
    :host {
      display: block;
      container: and-then / inline-size;
    }
    .diagram {
      margin: 8px 0;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
    }
    .flow {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .flow li + li {
      margin-top: 0;
    }
    .step {
      display: grid;
      grid-template-columns: 28px 1fr;
      column-gap: 12px;
      align-items: center;
    }
    .node {
      grid-row: 1 / span 3;
      align-self: start;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      box-sizing: border-box;
      border-radius: 50%;
    }
    .anchor .node {
      transform: scale(0.5);
      background: var(--muted);
    }
    .habit .node {
      border: 3px solid var(--accent);
      background: var(--surface);
    }
    .done .node {
      background: var(--accent);
      color: var(--on-accent);
    }
    .kind {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      line-height: 1.4;
      text-transform: uppercase;
    }
    .example {
      color: var(--ink);
      font-size: 16px;
      font-weight: 700;
      line-height: 1.35;
    }
    .note {
      color: var(--ink-soft);
      font-size: 14px;
      line-height: 1.45;
    }
    /* The connector between steps: a line with "and then" beside it. */
    .link {
      display: grid;
      grid-template-columns: 28px 1fr;
      column-gap: 12px;
      align-items: center;
      min-height: 40px;
    }
    .link::before {
      content: '';
      justify-self: center;
      width: 2px;
      height: 100%;
      min-height: 40px;
      background: var(--accent);
    }
    .link span {
      color: var(--accent-ink);
      font-size: 13px;
      font-style: italic;
      font-weight: 600;
    }
    .loop {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 18px;
      padding: 12px 14px;
      border-radius: 14px;
      background: var(--accent-soft);
      color: var(--accent-ink);
      font-size: 14px;
      line-height: 1.5;
    }
    .loop svg {
      flex: none;
      margin-top: 2px;
    }
    .loop span {
      color: var(--ink);
    }
    figcaption {
      margin-top: 10px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    /* Wide enough: the chain runs left to right, like a sentence. Measured on the
       diagram's own width, so it fits wherever it sits (Help home or an article). */
    @container and-then (min-width: 600px) {
      .flow {
        flex-direction: row;
        align-items: stretch;
      }
      .step {
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        min-width: 0;
      }
      .node {
        margin-bottom: 6px;
      }
      .example {
        font-size: 15px;
      }
      .note {
        font-size: 13px;
      }
      /* The line runs through the middle of the 28px nodes, the label sits on it. */
      .link {
        position: relative;
        display: block;
        flex: 0 0 56px;
        min-height: 0;
        margin: 0 6px;
      }
      .link::before {
        position: absolute;
        top: 13px;
        left: 0;
        right: 0;
        justify-self: stretch;
        width: auto;
        height: 2px;
        min-height: 0;
      }
      .link span {
        position: absolute;
        top: -6px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 12px;
        white-space: nowrap;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndThenDiagram {}
