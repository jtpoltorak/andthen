import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Copyright } from '../legal/copyright';
import { BackButton } from '../shared/back-button';

/** `/privacy`: what AndThen keeps, where, and for how long. Plain words, no legalese. */
@Component({
  selector: 'app-privacy',
  imports: [BackButton, RouterLink, Copyright],
  template: `
    <main class="reading">
      <app-back-button />
      <h1 tabindex="-1">Privacy</h1>
      <p class="lede">
        AndThen is built to keep your habits yours. Here's exactly what it stores, and where.
      </p>

      <h2>Without sync (the default)</h2>
      <p>
        Everything stays on your device: your routines, check-ins, reflections and settings. None of
        it is sent anywhere. There's no account, no ads, no analytics and no tracking.
      </p>
      <p>
        On your device, AndThen keeps things in your browser's own storage (IndexedDB and local
        storage). It sets no cookies for tracking or advertising, which is why there's no cookie
        banner.
      </p>
      <p>
        The app's font is loaded from Google Fonts, so Google sees that a device asked for it (like
        it would for most websites). It doesn't see any of your data.
      </p>

      <h2>With sync turned on</h2>
      <p>Sync is optional. When you turn it on, our server keeps:</p>
      <ul>
        <li>your email address, to sign you in;</li>
        <li>
          a copy of your routines, habits, check-ins and weekly reflections, so your devices can
          share them;
        </li>
        <li>
          for each signed-in device: a rough name (like "Safari on iPhone"), when it signed in and
          when it was last used;
        </li>
        <li>when you last synced.</li>
      </ul>
      <p>
        Your name, theme and reminder settings are not synced; they stay on each device. There's no
        password: you sign in with a code we email you. We only keep a scrambled (hashed) version of
        that code and of each device's sign-in token, never the real ones.
      </p>
      <p>
        Your data travels encrypted (HTTPS). It is not end-to-end encrypted: the server can read it,
        which it needs in order to merge changes from your devices. We never sell it, share it, or
        look at it except to fix a problem you've asked us about.
      </p>

      <h2>Who helps run it</h2>
      <ul>
        <li>
          <strong>Railway</strong> hosts the app, the server and its database, in the United States.
          If you live elsewhere, synced data is stored there.
        </li>
        <li><strong>Cloudflare</strong> handles the domain and passes traffic to Railway.</li>
        <li><strong>Resend</strong> sends the sign-in emails, so it sees your email address.</li>
      </ul>
      <p>
        Like most web services, these providers keep short-lived technical logs, which can include
        your IP address.
      </p>

      <h2>Taking it with you, or deleting it</h2>
      <p>
        In <strong>Settings → Sync across devices</strong> you can download everything your account
        holds (as a backup file the app can restore) or delete your account. Deleting it removes
        your email and the server's copy of your data straight away, and signs out all your devices.
        What's on your devices stays there.
      </p>
      <p>
        If an account isn't used for two years, we delete it. We email you 30 days before; opening
        AndThen on a device with sync on keeps it.
      </p>

      <h2>Your rights</h2>
      <p>Wherever you live, you can:</p>
      <ul>
        <li>see and download everything we hold about you (Settings → Sync across devices);</li>
        <li>correct it, by editing it in the app;</li>
        <li>delete it, by deleting your account or turning sync off and resetting the app;</li>
        <li>ask us anything about it, or ask us to do any of this for you, by email.</li>
      </ul>
      <p>
        We answer within 30 days. We don't sell or share your personal information, and we don't use
        it for advertising or to train AI models.
      </p>

      <h2>Children</h2>
      <p>
        AndThen is for people 13 and older (or older, where local law requires). We don't knowingly
        keep data from children under 13. If you think a child has turned on sync, email us and
        we'll delete that account.
      </p>

      <h2>Keeping it safe</h2>
      <p>
        Everything travels over HTTPS, sign-in codes expire quickly, and only scrambled versions of
        codes and tokens are stored. If you find a security problem, please email us before sharing
        it publicly.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes, we'll update the date below and point out meaningful changes in
        <a routerLink="/whats-new">What's new</a>. We'll never start using your data in a new way
        without telling you first.
      </p>

      <h2>Questions</h2>
      <p>Email <a href="mailto:hello@andthenhabits.com">hello&#64;andthenhabits.com</a>.</p>
      <p>See also the <a routerLink="/terms">Terms of Use</a>.</p>
      <p class="muted">Effective November 4, 2026.</p>
      <app-copyright />
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Privacy {}
