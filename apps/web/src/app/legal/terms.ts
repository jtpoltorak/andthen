import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackButton } from '../shared/back-button';
import { Copyright } from './copyright';

/**
 * `/terms`: the Terms of Use, in plain words like the privacy page.
 * When this changes in a way that matters, update the date and add a release note.
 */
@Component({
  selector: 'app-terms',
  imports: [BackButton, RouterLink, Copyright],
  template: `
    <main class="reading">
      <app-back-button />
      <h1 tabindex="-1">Terms of Use</h1>
      <p class="lede">
        The short version: AndThen is a free tool to help you build habits. Use it kindly, your data
        stays yours, and it comes without guarantees.
      </p>
      <p>
        These terms are an agreement between you and Jonathan T. Poltorak, who makes AndThen ("we",
        "us"). By using AndThen at andthenhabits.com, or as an installed app, you agree to them. Our
        <a routerLink="/privacy">privacy policy</a> explains what we keep and why.
      </p>

      <h2>Who can use AndThen</h2>
      <p>
        You need to be at least 13 years old, or older if the law where you live requires it to use
        a service like this on your own.
      </p>

      <h2>Not medical advice</h2>
      <p>
        AndThen is a self-help tool. It isn't medical, mental-health, nutrition or fitness advice,
        and it doesn't replace a professional. If a habit touches your health, such as exercise,
        diet, sleep, medication or recovery, check with a qualified professional before you start.
        If you're in crisis, contact your local emergency number.
      </p>

      <h2>Your data is yours</h2>
      <p>
        Your routines, check-ins and reflections belong to you. Without sync, they never leave your
        device. If you turn on sync, you let us store and copy them only so your devices can share
        them, as the privacy policy describes. You can download or delete them at any time.
      </p>
      <p>
        Keep your own backups. On-device data can be lost if you clear your browser's data, and we
        can't recover anything that was never synced.
      </p>

      <h2>Using it fairly</h2>
      <p>Please don't:</p>
      <ul>
        <li>use someone else's email address to sign in, or try to get into their account;</li>
        <li>send sign-in codes to people who didn't ask for them;</li>
        <li>overload, probe or attack the service, or get around its limits;</li>
        <li>use it to store anything unlawful.</li>
      </ul>
      <p>
        We can suspend or remove an account that does these things. We also remove accounts unused
        for two years, after an email warning, as the privacy policy explains.
      </p>

      <h2>Free, and may change</h2>
      <p>
        AndThen is free today. We may add, change or remove features, and we may stop offering sync
        or the app altogether. If we stop sync, we'll give you notice and a way to download your
        data first. If we ever add paid features, we'll say so plainly before you're charged
        anything; nothing that's free today will start costing money without your choice.
      </p>

      <h2>The app itself</h2>
      <p>
        The AndThen app, its name, design, words and code are © Jonathan T. Poltorak, all rights
        reserved. You're welcome to use the app; please don't copy or redistribute it. AndThen also
        uses open-source software, credited in the
        <a href="/3rdpartylicenses.txt">open-source licenses</a>.
      </p>

      <h2>No guarantees</h2>
      <p>
        AndThen is provided "as is" and "as available", without warranties of any kind, express or
        implied, including fitness for a particular purpose. We work to keep it running and your
        data safe, but we can't promise it will always be available, error-free, or that data will
        never be lost.
      </p>

      <h2>Limits on liability</h2>
      <p>
        As far as the law allows, we aren't liable for indirect, incidental or consequential losses
        from using AndThen, including lost data. Since AndThen is free, our total liability for any
        claim is limited to US $50. Some places don't allow these limits, so they may not all apply
        to you.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If we change these terms, we'll update the date below, and we'll point out meaningful
        changes in <a routerLink="/whats-new">What's new</a>. Continuing to use AndThen after a
        change means you accept the new terms.
      </p>

      <h2>The law that applies</h2>
      <p>
        These terms are governed by the laws of the Commonwealth of Pennsylvania, USA, without
        regard to its conflict-of-law rules. This doesn't take away any protection you have under
        the consumer laws of the place you live.
      </p>

      <h2>Questions</h2>
      <p>Email <a href="mailto:hello@andthenhabits.com">hello&#64;andthenhabits.com</a>.</p>
      <p class="muted">Effective November 4, 2026.</p>
      <app-copyright />
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Terms {}
