import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HelpArticle } from '../help-article';

// Part 3: Questions and fixes.

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-where-data',
  template: `
    <app-help-article slug="where-data">
      <p class="lede">On your device, in this browser, unless you turn on sync.</p>
      <ul>
        <li>
          <strong>Without sync</strong>, nothing about your habits leaves your device. There's no
          account, no ads, no analytics and no tracking.
        </li>
        <li>
          <strong>With sync</strong>, our server keeps your email and a copy of your habits so your
          devices can share them. You can download or delete it any time.
        </li>
      </ul>
      <p>
        Because on-device data lives in your browser, clearing your browser's data for
        andthenhabits.com deletes it. Keep a <a routerLink="/help/backup">backup</a>, or turn on
        <a routerLink="/help/sync">sync</a>.
      </p>
      <p>
        The <a routerLink="/help/browser-extension">browser extension</a> keeps its own copy, in the
        extension's storage. Sync keeps the two the same.
      </p>
      <p>The full details: <a routerLink="/privacy">Privacy</a>.</p>
    </app-help-article>
  `,
})
export class WhereData {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-no-reminders',
  template: `
    <app-help-article slug="no-reminders">
      <p class="lede">Work down this list. It's almost always one of these.</p>
      <ol>
        <li>
          <strong>Was AndThen open?</strong> Reminders can only come while the app is open in a tab
          or installed window, even in the background. A fully closed app can't send them.
        </li>
        <li>
          <strong>Does the routine have a usual time?</strong> Only routines with one get reminders.
          Set it with <strong>Edit</strong> on the anchor in the chain editor.
        </li>
        <li>
          <strong>Was everything already answered?</strong> Reminders only come when something is
          left to do.
        </li>
        <li>
          <strong>Is the routine ticked</strong> in
          <a routerLink="/settings">Settings → Reminders</a>?
        </li>
        <li>
          <strong>Are notifications allowed?</strong> If Settings says they're blocked, allow them
          in your browser's site settings for andthenhabits.com, then turn reminders on again. Also
          check your phone or computer isn't in Do Not Disturb or Focus mode.
        </li>
        <li>
          <strong>On iPhone or iPad?</strong> AndThen must be added to the Home Screen and opened
          from there. See <a routerLink="/help/install">Install AndThen as an app</a>.
        </li>
        <li>
          <strong>Was it more than an hour late?</strong> If the app opened long after the time, the
          reminder is skipped on purpose rather than nagging you late.
        </li>
      </ol>
    </app-help-article>
  `,
})
export class NoReminders {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-updates',
  template: `
    <app-help-article slug="updates">
      <p class="lede">AndThen updates itself, in the background.</p>
      <p>
        When a new version has downloaded, a banner at the top says
        <strong>A new version of AndThen is ready</strong>. Tap <strong>Reload</strong> to switch.
        Afterwards you'll see what changed in <a routerLink="/whats-new">What’s new</a>.
      </p>
      <h2>To check right now</h2>
      <p>
        Open <a routerLink="/settings">Settings → About</a> and tap
        <strong>Check for updates</strong>. Your version number is shown there too.
      </p>
      <h2>Still stuck on an old version?</h2>
      <p>
        Fully close AndThen (every tab, or swipe the installed app away) and open it again. As a
        last resort, clear this site's data in your browser settings. That also deletes anything
        that isn't synced or backed up, so <a routerLink="/help/backup">back up</a> first.
      </p>
    </app-help-article>
  `,
})
export class UpdatesHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-new-device',
  template: `
    <app-help-article slug="new-device">
      <p class="lede">How you move depends on whether sync was on.</p>
      <h2>With sync</h2>
      <p>
        Open andthenhabits.com on the new device, choose <strong>Sign in to sync</strong> on the
        welcome screen, and use the same email. Everything comes across.
      </p>
      <p>
        Lost the old device? Its data on the server is safe. If you're worried someone else has it,
        delete your account from the new device and set up sync again, which signs every device out.
      </p>
      <h2>With a backup file</h2>
      <p>
        Choose <strong>Restore from a backup</strong> on the welcome screen and pick your most
        recent file.
      </p>
      <h2>With neither</h2>
      <p>
        Unfortunately, data that only lived on a lost device can't be recovered. Start fresh, and
        this time turn on <a routerLink="/help/sync">sync</a> or keep
        <a routerLink="/help/backup">backups</a>. Your habits are still in your head, and that's the
        part that matters.
      </p>
    </app-help-article>
  `,
})
export class NewDevice {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-contact',
  template: `
    <app-help-article slug="contact">
      <p class="lede">
        Email <a href="mailto:hello@andthenhabits.com">hello&#64;andthenhabits.com</a>. A real
        person reads every message.
      </p>
      <p>When reporting a problem, these help:</p>
      <ul>
        <li>what you did, what you expected, and what happened instead;</li>
        <li>your device and browser (for example, "Safari on iPhone");</li>
        <li>your AndThen version, from <a routerLink="/settings">Settings → About</a>.</li>
      </ul>
      <p>Ideas and "this confused me" notes are just as welcome.</p>
      <h2>Accessibility</h2>
      <p>
        AndThen is meant to work for everyone: with a keyboard alone, with screen readers like
        VoiceOver and TalkBack, with larger text, in light or dark mode, and with reduced motion. We
        aim to meet the WCAG 2.2 AA guidelines. If anything gets in your way, please tell us, and
        we'll treat it as a bug.
      </p>
      <p class="muted">
        Security problem? Email the same address, and please give us a chance to fix it before
        sharing it publicly.
      </p>
    </app-help-article>
  `,
})
export class ContactHelp {}
