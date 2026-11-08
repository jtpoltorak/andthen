import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HelpArticle } from '../help-article';

// Part 2: Using AndThen. One article per feature. Keep these in step with the screens:
// when a feature changes, update its article in the same PR.

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-getting-started',
  template: `
    <app-help-article slug="getting-started">
      <p class="lede">Your first routine takes about a minute, and there's no account to make.</p>
      <ol>
        <li>
          <strong>Pick one habit.</strong> Something small you'd like to do every day. Choose a
          suggestion or type your own.
        </li>
        <li>
          <strong>Pick its anchor.</strong> Something you already do daily, like "After I pour my
          coffee". The habit will follow it.
        </li>
        <li>
          <strong>Set its 2-minute version.</strong> The smallest step that still counts, for busy
          days.
        </li>
        <li><strong>Start.</strong> You'll land on Today, ready for your first check-in.</li>
      </ol>
      <p>
        Prefer a head start? Choose <strong>Or pick a ready-made routine</strong> on the welcome
        screen. See <a routerLink="/help/templates">Ready-made routines</a>.
      </p>
      <h2>Already use AndThen somewhere else?</h2>
      <p>
        On the welcome screen, look under <strong>Already use AndThen?</strong>.
        <strong>Sign in to sync</strong> brings in everything from your sync account, and
        <strong>Restore from a backup</strong> loads a backup file.
      </p>
      <h2>What next</h2>
      <p>
        Live with one routine for a week or so. When it feels easy, add another habit to the chain
        with <strong>+ and then…</strong>, or start a second routine in
        <a routerLink="/routines">Routines</a>.
      </p>
      <h2>Finding your way around Help</h2>
      <p>
        Every screen has a <strong>?</strong> that opens its help. On a laptop or desktop, Help
        lists every topic down the left side, with a search box at the top, and longer articles have
        an <strong>On this page</strong> list on the right to jump between sections.
      </p>
    </app-help-article>
  `,
})
export class GettingStarted {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-today',
  template: `
    <app-help-article slug="today">
      <p class="lede">
        Today shows your chains for the day and asks about one habit at a time, in order.
      </p>
      <p>
        The routine most likely to be next opens on its own: the first unfinished one whose usual
        time has passed, or else the first unfinished one. Tap any other routine to open it.
      </p>
      <p>
        With routines at different times of day, Today groups them under
        <strong>Morning</strong> (before noon), <strong>Afternoon</strong> (noon to 5 pm),
        <strong>Evening</strong> and <strong>Anytime</strong> (no usual time). A finished routine
        folds into one line with a check, so what's left stands out.
      </p>
      <h2>Three answers</h2>
      <ul>
        <li><strong>Done</strong> (teal check): you did the full habit.</li>
        <li>
          <strong>Did 2 min</strong> (amber "2m"): you did the 2-minute version. It counts toward
          your chain just like Done.
        </li>
        <li>
          <strong>Skip</strong> (open ring): you chose not to today. A skip isn't counted as done,
          but it's never counted as a miss, and it never brings a nudge.
        </li>
      </ul>
      <h2>How did it feel?</h2>
      <p>
        After Done or Did 2 min, AndThen asks how it felt: <strong>Felt good</strong>,
        <strong>Okay</strong> or <strong>Hard</strong>, and a few words if you like. Both are
        optional; just carry on if you'd rather not. Tap <strong>Edit</strong> to change it later
        that day.
      </p>
      <p>
        On <a routerLink="/progress">Progress</a>, a day with a note has a small hole in its dot,
        and each habit lists its latest notes. Over time they show what helps and what gets in the
        way.
      </p>
      <p>
        Each routine is drawn as a chain: your anchor at the top, then each habit, joined by a line.
        As you answer, the link leading to that habit fills in: teal for Done, amber for 2 minutes,
        dashed for a skip. You can see how far along the chain you are at a glance.
      </p>
      <p>
        Done and Did 2 min give the habit's ring a quick pop, and Done draws its tick in. Answering
        the last habit in a routine brings a small "Chain complete" moment. It's a tiny reward on
        purpose: feeling finished is part of what makes a habit stick (see
        <a routerLink="/help/feel-finished">Make it feel finished</a>). If your device is set to
        reduce motion, the animations are turned off.
      </p>
      <p>
        Moving around the app is smooth too: screens cross-fade as you switch tabs, and tapping
        <strong>Run</strong> grows the routine's card into the Run screen. These also switch off
        with reduced motion.
      </p>
      <p>
        Anything you don't answer by the end of the day counts as missed. One miss is fine; see
        <a routerLink="/help/never-miss-twice">Never miss twice</a>.
      </p>
      <h2>Run a routine, one habit at a time</h2>
      <p>
        Tap <strong>Run</strong> on a routine's card for a calm, full-screen view: "After I pour my
        coffee, and then…", one habit at a time, with big Done, Did 2 min and Skip buttons. Your
        "why" and make-it-easy notes show along the way, and, for a chain of two or more, a bar at
        the top fills in as you go. Made a mistake? Tap <strong>Undo</strong> at the bottom. When
        the chain is done, you're back on Today with one tap.
      </p>
      <h2>Changing an answer</h2>
      <p>Tap <strong>Undo</strong> next to any answered habit to clear it, then answer again.</p>
      <h2>Other things you'll see</h2>
      <ul>
        <li>
          <strong>The ring</strong> beside the Today title: one piece for each habit planned today,
          filling teal for Done, amber for 2 minutes and grey for a skip. It shows how many you've
          done, and a check once every habit has its answer.
        </li>
        <li>
          <strong>A little plant</strong> at the foot of each routine's card: it grows with every
          Done and 2 min, and tells you how many check-ins until its next stage. See
          <a routerLink="/help/progress">Your garden</a>.
        </li>
        <li><strong>"2 of 3 this week"</strong> on habits scheduled a few times a week.</li>
        <li><strong>"Make it easy: …"</strong> under the next habit, if you've added a note.</li>
        <li>
          <strong>A badge</strong> like "Missed yesterday · don't miss twice". See
          <a routerLink="/help/nudges">the nudge article</a>.
        </li>
        <li><strong>Resting today</strong>: routines with nothing scheduled today.</li>
        <li>
          <strong>On a computer</strong>: the tabs move to a rail on the left, and a
          <strong>This week</strong> card sits beside your routines with a dot for each day.
        </li>
        <li>
          <strong>Weekly reflection</strong>: a card at the end of the week. See
          <a routerLink="/help/reflection">Weekly reflection</a>.
        </li>
      </ul>
    </app-help-article>
  `,
})
export class TodayHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-routines',
  template: `
    <app-help-article slug="routines">
      <p class="lede">
        A routine is an anchor plus a short chain of habits. Edit one by tapping it in
        <a routerLink="/routines">Routines</a>, or <strong>Edit</strong> on Today.
      </p>
      <h2>The anchor</h2>
      <p>
        Tap <strong>Edit</strong> next to the anchor at the top to change what the chain starts
        after. You can also give it a <strong>usual time</strong> (optional). The usual time helps
        Today open the right routine, places it under Morning, Afternoon or Evening, and is when
        <a routerLink="/help/reminders">reminders</a> arrive.
      </p>
      <h2>An icon</h2>
      <p>
        Pick an icon at the top of the editor, like a mug, a moon or a laptop, so routines are easy
        to tell apart at a glance. It shows on Today, Routines, Progress and the Run screen, and
        goes along when you share the routine. Ready-made routines come with one. Pick the plain dot
        to go without.
      </p>
      <h2>Habits</h2>
      <ul>
        <li>
          <strong>Add</strong> one at the end with <strong>+ and then…</strong>. Give it a name and
          a 2-minute version.
        </li>
        <li>
          <strong>Edit</strong> a habit to change its name, 2-minute version,
          <a routerLink="/help/schedules">how often</a>, and
          <a routerLink="/help/easier-notes">make-it-easier notes</a>.
        </li>
        <li>
          <strong>Reorder</strong> by dragging a habit by its handle (the six dots), or with the up
          and down arrows. The arrows also work from a keyboard.
        </li>
        <li>
          <strong>Remove</strong> one from inside its edit form. It leaves the chain from today on,
          and its past check-ins stay in Progress. A chain needs at least one habit.
        </li>
      </ul>
      <h2>New and removed routines</h2>
      <p>
        <strong>New routine</strong> in Routines starts one from scratch or from a
        <a routerLink="/help/templates">template</a>. To retire a whole routine, open it and use
        <strong>Remove routine</strong> at the bottom. It disappears from Today, and its history
        stays in Progress. Just need a break? <a routerLink="/help/pause">Pause it</a> instead.
      </p>
      <p class="muted">
        Tip: keep a chain to 3 or 4 small habits. Short chains are easier to finish.
      </p>
    </app-help-article>
  `,
})
export class RoutinesHelp {}

@Component({
  imports: [HelpArticle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-templates',
  template: `
    <app-help-article slug="templates">
      <p class="lede">
        Ready-made routines give you a sensible anchor and a few tiny habits to start from.
      </p>
      <ul>
        <li><strong>Morning reset</strong>: after waking up, before the phone.</li>
        <li><strong>Desk breaks</strong>: a midday break for your eyes and back.</li>
        <li><strong>Home reset</strong>: switching out of work mode when you get home.</li>
        <li><strong>Wind-down</strong>: an easier bedtime and a better tomorrow.</li>
      </ul>
      <p>
        Pick one from the welcome screen or <strong>New routine</strong> in Routines. It becomes an
        ordinary routine, so rename the anchor, swap habits, or delete the ones that don't fit. A
        template is a starting point, not a prescription.
      </p>
    </app-help-article>
  `,
})
export class TemplatesHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-easier-notes',
  template: `
    <app-help-article slug="easier-notes">
      <p class="lede">
        A few optional notes per habit: why it matters to you, and how to make the hard moments
        easier.
      </p>
      <h2>Why it matters to you</h2>
      <p>
        Open a habit in the chain editor and fill in <strong>Why it matters to you</strong>, like
        "So I have energy for the kids". One short line is plenty. It shows under the habit on
        Progress and in your weekly reflection, so on a flat week you see the reason, not just the
        dots. A habit you care about is easier to come back to.
      </p>
      <h2>Make it easier</h2>
      <p>In the chain editor, open a habit and expand <strong>Make it easier</strong>:</p>
      <ul>
        <li>
          <strong>One thing that makes it easier to start</strong>, like "Lay out my shoes the night
          before". It shows on Today under that habit when it's next.
        </li>
        <li>
          <strong>What usually gets in the way?</strong>, like "I'm too tired after work". Naming it
          is the first step to designing around it.
        </li>
      </ul>
      <p>
        Not sure what to write? Read
        <a routerLink="/help/make-it-easy">Make the good choice the easy one</a>.
      </p>
    </app-help-article>
  `,
})
export class EasierNotes {}

@Component({
  imports: [HelpArticle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-schedules',
  template: `
    <app-help-article slug="schedules">
      <p class="lede">
        Not every habit needs to happen every day. Each habit has its own schedule.
      </p>
      <p>Open a habit in the chain editor and choose <strong>How often</strong>:</p>
      <ul>
        <li><strong>Every day</strong>: the default.</li>
        <li>
          <strong>Some days</strong>: pick the weekdays, like Mon, Wed and Fri. On the other days
          the habit rests: it isn't listed on Today and never counts as missed.
        </li>
        <li>
          <strong>Times a week</strong>: from 1 to 6, on whichever days suit you. The habit shows
          every day with a count like "2 of 3 this week", and stops asking once you reach it.
        </li>
      </ul>
      <h2>How they count</h2>
      <ul>
        <li>Rest days are never held against you, on Today or in Progress.</li>
        <li>
          "Times a week" habits never get a daily nudge. Their chain on Progress counts whole weeks
          instead of days: a week that reaches its count is a link.
        </li>
        <li>If every habit in a routine rests today, Today lists it under "Resting today".</li>
      </ul>
    </app-help-article>
  `,
})
export class SchedulesHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-pause',
  template: `
    <app-help-article slug="pause">
      <p class="lede">
        Life happens. Pause a routine for a few days and it simply rests: nothing counts as missed.
      </p>
      <h2>Pause</h2>
      <p>
        Open the routine, scroll to <strong>Take a break</strong>, and tap
        <strong>Pause this routine…</strong>. Choose 3 days, 1 week, 2 weeks, or
        <strong>Until I resume</strong>. The pause starts today.
      </p>
      <h2>While it's paused</h2>
      <ul>
        <li>It moves to a quiet "Paused" row at the bottom of Today, with a Resume button.</li>
        <li>No reminders, and no "don't miss twice" nudges.</li>
        <li>
          On Progress, paused days are rest days. Your chain doesn't grow, and it doesn't break.
        </li>
        <li>"Times a week" habits ask for fewer that week, to fit the days left.</li>
      </ul>
      <h2>Coming back</h2>
      <p>
        A pause with an end date finishes on its own. To come back early, tap
        <strong>Resume</strong> on Today or <strong>Resume now</strong> in the routine. Starting
        again with the 2-minute version is a great way back in; see
        <a routerLink="/help/never-miss-twice">Never miss twice</a>.
      </p>
    </app-help-article>
  `,
})
export class PauseHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-share',
  template: `
    <app-help-article slug="share">
      <p class="lede">
        Doing a routine with a friend helps you both keep it. Send them a link to set up the same
        chain in a tap.
      </p>
      <h2>Send it</h2>
      <p>
        Open the routine in <a routerLink="/routines">Routines</a>, scroll to
        <strong>Share this routine</strong>, and tap <strong>Share a link…</strong>. On a phone the
        share sheet opens; elsewhere the link is copied, ready to paste into a message.
      </p>
      <h2>What's in the link</h2>
      <ul>
        <li>The anchor, the habits in order, and their 2-minute versions.</li>
        <li>Make-it-easy notes and schedules, as starting points.</li>
        <li>
          Never your check-ins, journal notes, reflections or "why" lines. Those stay on your
          devices.
        </li>
      </ul>
      <p>
        The routine is packed into the link itself, after the #, so it isn't stored on a server.
        Anyone with the link can see the habits in it.
      </p>
      <h2>Getting one</h2>
      <p>
        Open the link and tap <strong>Add to my routines</strong>. It becomes your own copy: change
        anything, and neither of you sees the other's check-ins. It works without an account, even
        if you've never used AndThen.
      </p>
    </app-help-article>
  `,
})
export class ShareHelp {}

@Component({
  imports: [HelpArticle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-make-it-yours',
  template: `
    <app-help-article slug="make-it-yours">
      <p class="lede">A few small settings under <strong>Settings → You</strong>.</p>
      <ul>
        <li><strong>Your name</strong>: used for a hello on Today. Leave it blank to skip it.</li>
        <li>
          <strong>Look</strong>: System follows your device's light or dark setting, or pick Light
          or Dark.
        </li>
        <li>
          <strong>Sky that follows the day</strong>: an optional soft sky behind the top of Today. A
          sunrise in the morning, daylight with a cloud, a warm dusk, then a moon and stars at
          night. It changes on its own as the hours pass, in light and dark. Off unless you turn it
          on.
        </li>
        <li>
          <strong>Accent color</strong>: Teal, Blue, Plum, Clay or Slate. It changes buttons,
          checkmarks and highlights, in both light and dark. The amber for "Did 2 min" stays the
          same, so it always stands out.
        </li>
        <li>
          <strong>Larger text</strong>: makes everything about 15% bigger, buttons and spacing too,
          like zooming in. Screens reflow to fit, so nothing gets cut off.
        </li>
        <li>
          <strong>More contrast</strong>: darker gray text, lines and borders, in light and dark.
          Handy in bright sunlight.
        </li>
        <li>
          <strong>Weeks start on</strong>: Monday or Sunday. It changes "This week" and the grid on
          Progress.
        </li>
      </ul>
      <p>
        These belong to each device, so your phone and laptop can look different. They aren't in
        backups and aren't synced.
      </p>
    </app-help-article>
  `,
})
export class MakeItYoursHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-reminders',
  template: `
    <app-help-article slug="reminders">
      <p class="lede">
        A quiet notification around a routine's usual time, only if there's something left to do.
      </p>
      <h2>Turning them on</h2>
      <ol>
        <li>Give your routines a usual time in the chain editor.</li>
        <li>
          In <a routerLink="/settings">Settings → Reminders</a>, turn on
          <strong>Remind me</strong> and allow notifications when your browser asks.
        </li>
        <li>
          Choose when: at the usual time, or 5 or 15 minutes before. Untick any routine you don't
          want reminders for.
        </li>
      </ol>
      <h2>What to know</h2>
      <ul>
        <li>
          <strong>AndThen needs to be open</strong>, in a tab or as an installed app, even in the
          background. Web apps can't wake themselves up, so a closed app can't remind you.
        </li>
        <li>
          <strong>Late reminders are dropped.</strong> If the app wasn't open within an hour of the
          time, you won't get a stale nudge hours later.
        </li>
        <li>
          <strong>On iPhone and iPad</strong>, notifications only work once AndThen is
          <a routerLink="/help/install">added to your Home Screen</a> and opened from there.
        </li>
        <li>Reminders are set per device, and aren't synced or included in backups.</li>
      </ul>
      <p>
        Not getting them? See <a routerLink="/help/no-reminders">My reminders didn’t arrive</a>.
      </p>
    </app-help-article>
  `,
})
export class RemindersHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-progress',
  template: `
    <app-help-article slug="progress">
      <p class="lede">Progress shows how you're showing up, kindly.</p>
      <h2>This week</h2>
      <p>
        "Showed up 4 of 5 days" counts days with at least one habit done, in full or as the 2-minute
        version. Below it: how many check-ins were done, done as 2 minutes, and skipped. Choose
        whether weeks start on Monday or Sunday in
        <a routerLink="/settings">Settings</a>.
      </p>
      <h2>Your garden</h2>
      <p>
        Each routine grows its own little plant. Every Done and every 2-minute check-in in the
        routine helps it grow, so the tiny version is just as good for it. It goes from a
        <strong>seed</strong> to a <strong>sprout</strong> after your first check-in, then a
        <strong>seedling</strong> at 5, a <strong>young plant</strong> at 15,
        <strong>budding</strong> at 30, and <strong>in bloom</strong> at 60.
      </p>
      <p>
        Growth is a running total, not a streak. Skips and missed days never take any away, and
        plants never wilt. A paused routine, or one with no check-ins for a week, shows faded with a
        little moon. It's only resting, and it wakes up with your next check-in.
      </p>
      <p>
        On <a routerLink="/today">Today</a>, each routine's plant sits at the foot of its card with
        how many check-ins until the next stage, and you'll get a short note the moment it grows.
      </p>
      <h2>Share your week</h2>
      <p>
        <strong>Share your week</strong> turns the week into a picture: days you showed up, each
        habit's seven dots, your garden, and "what went well" if you reflected. Pick a size first:
        <strong>Story</strong> (9:16) fills the screen in Instagram, Facebook or WhatsApp stories,
        with everything kept clear of their buttons, and <strong>Post</strong> (4:5) fits a feed or
        a message.
      </p>
      <p>
        Posting somewhere public? Switch off <strong>Show habit and routine names</strong> and the
        card shows just your dots and plants, with stage names in place of routine names. You can
        leave out what went well the same way.
      </p>
      <p>
        Tap <strong>Share</strong> to open your phone's share sheet and pick an app, or
        <strong>Save image</strong> to keep it. It's drawn on your device in your theme and accent
        color, and nothing is uploaded.
      </p>
      <h2>The dot grid</h2>
      <p>
        Each habit gets a column of dots per week, one dot per day, with the days of the week down
        the side. The legend above the grid shows each kind: <strong>Done</strong> (teal),
        <strong>2 min</strong> (amber), <strong>Skipped</strong>, <strong>No check-in</strong>, and
        <strong>Rest day</strong> for habits with a schedule. The rest of this week shows as faint
        rings, waiting to fill in.
      </p>
      <p>
        A new habit's grid starts the week you added it and grows a column each week, up to the last
        8 weeks. Days before a habit existed are left blank.
      </p>
      <h2>The forgiving chain</h2>
      <p>
        Each habit's chain counts how many days it has kept going. Unlike a strict streak, it
        survives skips, rest days and a single missed day. Only two misses in a row end it. You'll
        also see your longest chain, so a break never erases what you built.
      </p>
      <p>For "times a week" habits, the chain counts weeks that reached their target.</p>
      <h2>The trend line</h2>
      <p>
        Once a habit has three weeks behind it, a tiny line under its dots shows the last 8 weeks.
        Each point is how much of that week's asked-for days you did, in full or as 2 minutes.
        Skips, rest days and paused days don't count either way. Beside it, a few words sum it up:
        <strong>Getting steadier</strong>, <strong>Holding steady</strong>, or
        <strong>A quieter stretch</strong>. A quieter stretch is normal, and the 2-minute version is
        the easiest way back.
      </p>
      <h2>Milestones</h2>
      <p>
        Milestones are quiet markers for how much you've shown up, ever: your first check-in, then
        25, 100, 250, 500 and 1,000 check-ins, and 7, 30, 100 and 365 days with at least one habit
        done. Done and 2-minute check-ins both count; skips don't.
      </p>
      <p>
        When you reach one, a small card says so at the top of <a routerLink="/today">Today</a>. Tap
        <strong>Thanks</strong> to put it away. It only shows for a few days, so coming back after a
        break never greets you with a pile of them. The Milestones card here lists every one you've
        reached, with the day you reached it, and the next one coming up. They only ever count up: a
        missed day never takes one away.
      </p>
      <h2>Your year</h2>
      <p>
        Tap <strong>See your year</strong> under This week for the last 12 months as little
        calendars, one per month. Each day is shaded by how much of what it asked for you did, in
        full or as 2 minutes: a light grey square for none, darker shades for some and most, and the
        full accent color for all of it. Days with nothing asked for, like rest days and paused
        days, show as a small dot, and skips never count against you.
      </p>
      <p>
        Pick a routine at the top to see just that one. Above the calendars you'll find how many
        days you showed up, your check-ins, and your best month. On a laptop, point at a day to see
        exactly what you did.
      </p>
      <h2>Removed habits and routines</h2>
      <p>Their history stays at the bottom of Progress. Nothing you've done is ever thrown away.</p>
    </app-help-article>
  `,
})
export class ProgressHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-reflection',
  template: `
    <app-help-article slug="reflection">
      <p class="lede">Two minutes, once a week: what went well, and what to make easier.</p>
      <p>
        On the last day of the week, Today shows a <strong>Weekly reflection</strong> card. It stays
        for one more day in case you miss it, and <strong>Not this week</strong> hides it. You can
        also open it any time from <a routerLink="/progress">Progress</a>.
      </p>
      <h2>What it shows</h2>
      <ul>
        <li>Your week at a glance, and last week's planned tweak, so you can see how it went.</li>
        <li>How each habit went, day by day.</li>
        <li>
          For a habit done on fewer than half its days, a few one-tap tweaks: shrink it to its
          2-minute version, move it to another routine, or do it first in its chain.
        </li>
        <li>
          Two optional notes: <strong>What went well?</strong> and
          <strong>What will you tweak next week?</strong>
        </li>
      </ul>
      <p>
        Saved reflections appear on Progress. Why this helps:
        <a routerLink="/help/reflect-adjust">Reflect and adjust</a>.
      </p>
    </app-help-article>
  `,
})
export class ReflectionHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-nudges',
  template: `
    <app-help-article slug="nudges">
      <p class="lede">Small badges on Today that help you get back on track, without guilt.</p>
      <ul>
        <li>
          <strong>"Missed yesterday · don't miss twice"</strong> (or the day it was last planned):
          the habit's chain is one miss from breaking. The 2-minute version moves to the front, so
          keeping it alive takes almost nothing.
        </li>
        <li>
          <strong>"Welcome back · 2 minutes counts"</strong>: it's been two or more misses. No
          broken-streak drama, just an easy restart.
        </li>
        <li>
          On a closed routine, <strong>"1 habit to keep alive today"</strong> tells you a nudge is
          waiting inside.
        </li>
      </ul>
      <p>
        Skips and rest days never cause a nudge, and "times a week" habits don't get them. Why it
        matters: <a routerLink="/help/never-miss-twice">Never miss twice</a>.
      </p>
    </app-help-article>
  `,
})
export class NudgesHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-install',
  template: `
    <app-help-article slug="install">
      <p class="lede">
        AndThen runs in your browser, and you can install it like an app. It then opens in its own
        window, works offline, and can send reminders.
      </p>
      <h2>The quick way</h2>
      <p>
        Open <strong>Settings</strong>. Where your browser can install AndThen, an
        <strong>Install AndThen</strong> card is at the top, with a one-tap button (Chrome, Edge and
        Android) or the steps for iPhone and iPad. Once it's installed, the card goes away.
      </p>
      <h2>iPhone and iPad (Safari)</h2>
      <ol>
        <li>Open andthenhabits.com in Safari.</li>
        <li>Tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.</li>
        <li>Open AndThen from its new icon.</li>
      </ol>
      <h2>Android (Chrome)</h2>
      <ol>
        <li>Open andthenhabits.com in Chrome.</li>
        <li>
          Tap the <strong>⋮</strong> menu, then <strong>Install app</strong> or
          <strong>Add to Home screen</strong>.
        </li>
      </ol>
      <h2>Computer (Chrome or Edge)</h2>
      <p>
        Click the install icon at the right end of the address bar, or open the browser menu and
        choose <strong>Install AndThen</strong>.
      </p>
      <h2>Good to know</h2>
      <ul>
        <li>
          An installed app and the browser tab share the same data on that device, except on iPhone
          and iPad, where the Home Screen app keeps its own. Use
          <a routerLink="/help/backup">a backup</a> or <a routerLink="/help/sync">sync</a> to move
          things across.
        </li>
        <li>Updates arrive on their own. See <a routerLink="/help/updates">updates</a>.</li>
        <li>
          On Android, press and hold the AndThen icon for shortcuts straight to Today or Progress.
        </li>
      </ul>
    </app-help-article>
  `,
})
export class InstallHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-backup',
  template: `
    <app-help-article slug="backup">
      <p class="lede">
        Without sync, your habits live only in this browser. A backup file is your safety net.
      </p>
      <h2>Back up</h2>
      <p>
        In <a routerLink="/settings">Settings → Your data</a>, tap <strong>Back up my data</strong>.
        A small file with all your routines, habits, check-ins and reflections goes to your
        downloads. Keep it somewhere safe, like your cloud drive, and make a fresh one now and then.
      </p>
      <h2>Restore</h2>
      <p>
        Tap <strong>Restore from a backup</strong> and choose the file. AndThen shows what's inside
        before doing anything. Restoring <strong>replaces</strong> everything on this device, so
        back up first if you might want what's there now.
      </p>
      <p>You can also restore from the welcome screen on a new device or browser.</p>
      <h2>What's not included</h2>
      <p>
        Your name, look, accent color and reminder settings belong to each device and aren't in the
        file.
      </p>
      <p>
        Using sync? You can also download your account's data from
        <a routerLink="/settings">Settings → Sync across devices</a>. It's the same kind of file.
      </p>
    </app-help-article>
  `,
})
export class BackupHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-sync',
  template: `
    <app-help-article slug="sync">
      <p class="lede">
        Optional. Sync keeps your habits the same on your phone, tablet and computer.
      </p>
      <h2>Turning it on</h2>
      <ol>
        <li>
          In <a routerLink="/settings">Settings → Sync across devices</a>, tap
          <strong>Set up sync…</strong>.
        </li>
        <li>Enter your email. We send a 6-digit code; there's no password.</li>
        <li>Enter the code, or tap the link in the email. Syncing starts right away.</li>
        <li>Do the same on your other devices, with the same email.</li>
      </ol>
      <p>
        The first time, the routines on this device are added to your account. If the account
        already has a copy of something, the account's copy is kept.
      </p>
      <h2>Day to day</h2>
      <ul>
        <li>Changes sync in the background. <strong>Sync now</strong> does it right away.</li>
        <li>Offline? Keep going. Changes sync when you're back online.</li>
        <li>If the same thing changes on two devices, the most recent change wins.</li>
        <li>Name, look, accent color and reminder settings stay per device.</li>
      </ul>
      <h2>Your devices</h2>
      <p>
        <strong>Signed-in devices</strong> lists every phone, tablet and computer using your
        account, with when each was last active (to the day). The one you're holding is marked
        <strong>This device</strong>.
      </p>
      <p>
        Lost a phone, or signed in on a borrowed computer? Tap <strong>Sign out…</strong> next to
        it. It stops syncing straight away. Whatever was already on that device stays there, so for
        a device you don't control, also clear it if you can.
      </p>
      <h2>Turning it off, or leaving</h2>
      <ul>
        <li>
          <strong>Turn off sync</strong> signs this device out. Everything stays on the device, and
          your other devices keep syncing.
        </li>
        <li><strong>Download account data</strong> saves everything as a backup file.</li>
        <li>
          <strong>Delete account</strong> removes your email and the server's copy straight away,
          and signs out all your devices. What's on each device stays there.
        </li>
        <li>Accounts unused for two years are deleted, after an email warning.</li>
      </ul>
      <p>Exactly what's stored, and where: <a routerLink="/privacy">Privacy</a>.</p>
    </app-help-article>
  `,
})
export class SyncHelp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-start-over',
  template: `
    <app-help-article slug="start-over">
      <p class="lede">Clear this device and begin again from the welcome screen.</p>
      <p>
        In <a routerLink="/settings">Settings → Start over</a>, tap
        <strong>Reset everything…</strong>. It deletes all routines, check-ins, reflections and
        settings on this device, and can't be undone. You'll be offered a backup first.
      </p>
      <p>
        If sync is on, resetting also turns it off for this device. Your account and your other
        devices keep their copy. To remove the account's copy too, use
        <strong>Delete account</strong>. See <a routerLink="/help/sync">Sync across devices</a>.
      </p>
      <p class="muted">
        Just want a fresh start with a habit? You don't need to reset. Remove it, or shrink it, in
        <a routerLink="/routines">Routines</a>.
      </p>
    </app-help-article>
  `,
})
export class StartOverHelp {}
