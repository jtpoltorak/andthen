import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BackButton } from '../shared/back-button';

/** `/privacy`: what AndThen keeps, where, and for how long. Plain words, no legalese. */
@Component({
  selector: 'app-privacy',
  imports: [BackButton],
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
        <li><strong>Railway</strong> hosts the app, the server and its database.</li>
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

      <h2>Questions</h2>
      <p>Email <a href="mailto:hello@andthenhabits.com">hello&#64;andthenhabits.com</a>.</p>
      <p class="muted">Last updated November 3, 2026.</p>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Privacy {}
