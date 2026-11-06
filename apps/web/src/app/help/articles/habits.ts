import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AndThenDiagram } from '../and-then-diagram';
import { HelpArticle } from '../help-article';

// Part 1: How habits stick. The ideas behind AndThen, in our own words.
// Sources and credits are in "Further reading" at the end.

@Component({
  imports: [HelpArticle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-start-small',
  template: `
    <app-help-article slug="start-small">
      <p class="lede">
        The hardest part of most habits is starting. So make starting almost too easy to skip.
      </p>
      <p>
        Motivation comes and goes. On a good day you could run five miles; on a bad day, putting on
        your shoes feels like a chore. A habit that only works on good days isn't a habit yet.
      </p>
      <p>
        That's why every habit in AndThen has a <strong>2-minute version</strong>: the smallest step
        that still counts. "Read for 20 minutes" becomes "read one page". "Go for a run" becomes
        "put on my running shoes".
      </p>
      <h2>Why it works</h2>
      <ul>
        <li>
          <strong>It removes the negotiation.</strong> You won't argue yourself out of something
          that takes two minutes.
        </li>
        <li>
          <strong>Starting is most of the battle.</strong> Once your shoes are on, a walk often
          follows. If it doesn't, you still kept the habit alive.
        </li>
        <li>
          <strong>It builds the groove first.</strong> Doing something tiny every day teaches your
          brain "this is what happens after coffee". You can grow it later.
        </li>
      </ul>
      <h2>Try it</h2>
      <p>
        Pick the habit you're most likely to skip, and shrink its 2-minute version until it feels a
        little silly. That's the right size. On busy days, tap
        <strong>Did 2 min</strong> on Today and move on, without guilt.
      </p>
    </app-help-article>
  `,
})
export class StartSmall {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-anchors',
  template: `
    <app-help-article slug="anchors">
      <p class="lede">
        "I'll meditate more" rarely happens. "After I pour my coffee, I'll sit for one minute"
        usually does.
      </p>
      <p>
        Every habit needs a cue: something that tells you it's time. Vague intentions like "more" or
        "sometime today" don't give you one, so the habit waits for a moment that never comes.
      </p>
      <p>
        You already have dozens of reliable cues: waking up, brushing your teeth, sitting down at
        your desk, getting home, shutting your laptop. They happen every day without any effort. An
        <strong>anchor</strong> borrows one of them.
      </p>
      <h2>A good anchor is</h2>
      <ul>
        <li><strong>Something you already do every day</strong>, at about the same time.</li>
        <li><strong>Specific.</strong> "After I start the coffee maker" beats "in the morning".</li>
        <li>
          <strong>A good fit for the habit.</strong> Stretching fits after getting out of bed;
          planning tomorrow fits after shutting your laptop.
        </li>
      </ul>
      <p>
        Research on "if-then" plans backs this up: people who decide exactly when and where they'll
        act follow through far more often than people who just intend to.
      </p>
      <p>
        In AndThen, every routine starts with its anchor, "After I…". Change it any time in
        <a routerLink="/routines">Routines</a>.
      </p>
    </app-help-article>
  `,
})
export class Anchors {}

@Component({
  imports: [HelpArticle, RouterLink, AndThenDiagram],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-chains',
  template: `
    <app-help-article slug="chains">
      <p class="lede">
        Once a habit is anchored, it becomes an anchor itself. That's a chain: this, and then that,
        and then the next.
      </p>
      <p>
        "After I pour my coffee, I drink a glass of water, <em>and then</em> I stretch, and then I
        write down today's one important task." Each step cues the next, so you only have to
        remember the first one.
      </p>
      <h2>The whole idea in one picture</h2>
      <app-and-then-diagram />
      <h2>Building a chain that holds</h2>
      <ul>
        <li>
          <strong>Keep it short.</strong> Three or four small habits is plenty. A long chain is hard
          to finish, and an unfinished chain feels like failure even when it isn't.
        </li>
        <li>
          <strong>Put the easiest or most important habit first.</strong> If you only get one done,
          make it that one.
        </li>
        <li>
          <strong>Add one link at a time.</strong> Once a chain feels automatic, try adding another
          with <strong>+ and then…</strong>.
        </li>
        <li>
          <strong>Use more than one chain.</strong> A morning chain, a lunchtime chain and an
          evening chain spread the load across your day.
        </li>
      </ul>
      <p>
        On Today, AndThen shows each chain as a line of rings and asks about one habit at a time, in
        order. See <a routerLink="/help/today">Today: Done, Did 2 min, and Skip</a>.
      </p>
    </app-help-article>
  `,
})
export class Chains {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-make-it-easy',
  template: `
    <app-help-article slug="make-it-easy">
      <p class="lede">
        We like to think habits are about willpower. Mostly, they're about what's in front of us.
      </p>
      <p>
        If your guitar is in its case in the closet, you'll play less than if it's on a stand by the
        couch. If your phone charges by the bed, you'll scroll more at night. Small bits of effort,
        or friction, decide a lot.
      </p>
      <h2>Take friction out of good habits</h2>
      <ul>
        <li>Lay out tomorrow's workout clothes tonight.</li>
        <li>Put the book on your pillow.</li>
        <li>Fill the water glass before bed and leave it by the coffee maker.</li>
        <li>Keep the vitamin bottle next to your toothbrush.</li>
      </ul>
      <h2>Add friction to the ones you want less of</h2>
      <ul>
        <li>Charge your phone in another room.</li>
        <li>Log out of the app that eats your evenings.</li>
        <li>Keep snacks on a high shelf, out of sight.</li>
      </ul>
      <h2>Plan for what gets in the way</h2>
      <p>
        Think about the usual reason you'd skip, and decide now what you'll do about it. "I'm too
        tired after work" might mean moving the habit to the morning, or shrinking it.
      </p>
      <p>
        AndThen gives each habit a place for both: one thing that makes it easier, and what usually
        gets in the way. See
        <a routerLink="/help/easier-notes">Make-it-easier notes</a>.
      </p>
    </app-help-article>
  `,
})
export class MakeItEasy {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-feel-finished',
  template: `
    <app-help-article slug="feel-finished">
      <p class="lede">
        Many good habits pay off months from now. Your brain wants something today.
      </p>
      <p>
        Flossing doesn't feel any different the day you do it. Neither does saving money or
        stretching. When the reward is far away, it helps to add a small one you can feel right now.
      </p>
      <p>
        That's what a check-in is for. Tapping <strong>Done</strong>, watching the ring fill in, and
        seeing the next link light up is a tiny moment of "finished". It's small, but it's
        immediate, and it's yours.
      </p>
      <h2>Make the moment count</h2>
      <ul>
        <li>Check in right after you do the habit, not hours later.</li>
        <li>Take a breath and notice it. You did the thing.</li>
        <li>
          Glance at <a routerLink="/progress">Progress</a> once in a while. A row of filled dots is
          proof of the kind of person you're becoming.
        </li>
      </ul>
      <p>
        AndThen deliberately avoids flashy rewards, points and leaderboards. The goal is a calm
        sense of progress, not a game you can lose.
      </p>
    </app-help-article>
  `,
})
export class FeelFinished {}

@Component({
  imports: [HelpArticle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-showing-up',
  template: `
    <app-help-article slug="showing-up">
      <p class="lede">
        Every time you show up, even for two minutes, you're practicing being someone who does this.
      </p>
      <p>
        Habits form through repetition, not intensity. Ten minutes every day does more than an hour
        once a week, because each repetition strengthens the link between the cue and the action.
      </p>
      <p>
        That's why a 2-minute day still counts in AndThen. It shows as an amber ring on Today and an
        amber dot on Progress, and it keeps your chain going exactly like a full day does.
      </p>
      <h2>What counts as showing up</h2>
      <ul>
        <li><strong>Done:</strong> you did the full habit.</li>
        <li><strong>Did 2 min:</strong> you did the small version. That counts.</li>
        <li>
          <strong>Skip:</strong> you chose not to, for a reason. It doesn't count as done, but it
          doesn't count against you either.
        </li>
      </ul>
      <p>
        On a hard week, aim to show up rather than to perform. The full version will come back when
        life calms down, and the habit will still be there for it.
      </p>
    </app-help-article>
  `,
})
export class ShowingUp {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-never-miss-twice',
  template: `
    <app-help-article slug="never-miss-twice">
      <p class="lede">
        Missing once is life. Missing twice is the start of a new habit: not doing it.
      </p>
      <p>
        Everyone misses days. You get sick, travel, have a long night. One miss barely affects a
        habit. The danger is the second one, because two misses in a row quietly turns into a week,
        and then into "I used to do that".
      </p>
      <p>So the rule is simple: if you miss a day, make the next one count, even if it's tiny.</p>
      <h2>How AndThen helps</h2>
      <ul>
        <li>
          <strong>A gentle badge.</strong> If a habit was missed on its last planned day, Today
          marks it "don't miss twice" and offers the 2-minute version first.
        </li>
        <li>
          <strong>A forgiving chain.</strong> On Progress, a single miss doesn't break your chain.
          Only two misses in a row do.
        </li>
        <li>
          <strong>No guilt after a break.</strong> If you've been away longer, you'll see "Welcome
          back", not a broken streak.
        </li>
      </ul>
      <p>
        Skips never trigger any of this. A skip is a choice, not a slip. See
        <a routerLink="/help/nudges">The “don’t miss twice” nudge</a>.
      </p>
    </app-help-article>
  `,
})
export class NeverMissTwice {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-how-long',
  template: `
    <app-help-article slug="how-long">
      <p class="lede">
        You may have heard it takes 21 days to form a habit. The real answer is "it depends", and
        usually longer.
      </p>
      <p>
        In one well-known study, people picked a new daily habit, like drinking water with lunch or
        doing sit-ups after breakfast, and reported how automatic it felt each day. On average it
        took about two months to level off, and the range ran from under three weeks to the better
        part of a year. Simple habits got there faster; harder ones took longer.
      </p>
      <h2>What that means for you</h2>
      <ul>
        <li>
          <strong>Don't judge a habit at day 21.</strong> If it still takes effort, that's normal,
          not a sign you're doing it wrong.
        </li>
        <li>
          <strong>Missing a day didn't reset the clock.</strong> In the same study, an occasional
          miss made little difference. Consistency over weeks is what mattered.
        </li>
        <li>
          <strong>It gets easier.</strong> The effort a habit takes fades over time. That's the
          whole point.
        </li>
      </ul>
      <p>
        Think in seasons, not sprints. The 8-week grid on
        <a routerLink="/progress">Progress</a> is sized for exactly this.
      </p>
    </app-help-article>
  `,
})
export class HowLong {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help-reflect-adjust',
  template: `
    <app-help-article slug="reflect-adjust">
      <p class="lede">If a habit keeps slipping, the habit needs changing. You don't.</p>
      <p>
        It's easy to read a missed habit as a character flaw: "I'm just not disciplined." Usually
        the real problem is design. The habit is too big, anchored to the wrong moment, or competing
        with something stronger.
      </p>
      <h2>Questions worth asking once a week</h2>
      <ul>
        <li><strong>What went well?</strong> Notice it, so you can do more of it.</li>
        <li>
          <strong>Which habit was hardest?</strong> Could it be smaller? Earlier in the chain? On a
          different anchor?
        </li>
        <li>
          <strong>What got in the way?</strong> Is there one change to your space or schedule that
          would remove it?
        </li>
        <li>
          <strong>Is this still a habit I want?</strong> It's fine to retire one that no longer fits
          your life.
        </li>
      </ul>
      <p>
        Change one thing at a time, then give it a week. AndThen's
        <a routerLink="/help/reflection">weekly reflection</a> walks you through this in about two
        minutes, and suggests tweaks for habits that had a hard week.
      </p>
    </app-help-article>
  `,
})
export class ReflectAdjust {}

@Component({
  imports: [HelpArticle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .reading-list li + li {
      margin-top: 12px;
    }
    .for {
      display: block;
      color: var(--muted);
      font-size: 14px;
    }
  `,
  selector: 'app-help-further-reading',
  template: `
    <app-help-article slug="further-reading">
      <p class="lede">
        AndThen didn't invent these ideas. They come from writers and researchers worth reading in
        full. Here's where to go next, and what each is good for.
      </p>
      <h2>Books</h2>
      <ul class="reading-list">
        <li>
          <strong><em>Atomic Habits</em></strong> by James Clear (2018). The most popular guide to
          habit stacking, making habits easy, and not missing twice. A big influence on AndThen.
          <span class="for">Read it for: a practical system you can start with today.</span>
        </li>
        <li>
          <strong><em>Tiny Habits</em></strong> by BJ Fogg (2019). From a Stanford behavior
          scientist: anchor a very small behavior to something you already do, then celebrate it
          straight away. <span class="for">Read it for: making habits small enough to stick.</span>
        </li>
        <li>
          <strong><em>Good Habits, Bad Habits</em></strong> by Wendy Wood (2019). A researcher's
          look at how much of daily life runs on habit, and why changing your surroundings beats
          relying on willpower.
          <span class="for">Read it for: the science, explained plainly.</span>
        </li>
        <li>
          <strong><em>The Power of Habit</em></strong> by Charles Duhigg (2012). Stories from people
          and companies about the cue, routine and reward behind everyday habits.
          <span class="for">Read it for: understanding habits you'd like to change.</span>
        </li>
        <li>
          <strong><em>How to Change</em></strong> by Katy Milkman (2021). A behavioral scientist on
          the obstacles that get in the way of change, like forgetting, procrastinating and giving
          up, and what helps with each.
          <span class="for">Read it for: getting unstuck.</span>
        </li>
        <li>
          <strong><em>Better Than Before</em></strong> by Gretchen Rubin (2015). Different people
          build habits in different ways, so knowing your own tendencies helps you pick strategies
          that fit. <span class="for">Read it for: making habits fit you.</span>
        </li>
      </ul>
      <h2>Research</h2>
      <p>Free to read online:</p>
      <ul class="reading-list">
        <li>
          <a href="https://doi.org/10.1002/ejsp.674" target="_blank" rel="noopener"
            >How are habits formed</a
          >, Phillippa Lally and colleagues, <em>European Journal of Social Psychology</em> (2010).
          People followed a new daily habit for 12 weeks. How long it took to feel automatic varied
          a lot from person to person, and missing a single day didn't undo progress. See
          <a routerLink="/help/how-long">How long it really takes</a>.
        </li>
        <li>
          <a
            href="https://www.socmot.uni-konstanz.de/sites/default/files/99_Gollwitzer_Implementation_Intentions.pdf"
            target="_blank"
            rel="noopener"
            >Implementation intentions: strong effects of simple plans</a
          >, Peter Gollwitzer, <em>American Psychologist</em> (1999). Planning exactly when and
          where you'll act ("when X happens, I'll do Y") makes you much more likely to follow
          through. It's the idea behind anchors.
        </li>
        <li>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3505409/" target="_blank" rel="noopener"
            >Making health habitual</a
          >, Benjamin Gardner, Phillippa Lally and Jane Wardle,
          <em>British Journal of General Practice</em> (2012). A short, readable summary of how
          habits form, with practical tips: pick a simple action, tie it to the same cue, repeat.
        </li>
        <li>
          <a
            href="https://dornsife.usc.edu/wendy-wood/wp-content/uploads/sites/183/2023/10/wood.runger.2016.pdf"
            target="_blank"
            rel="noopener"
            >Psychology of habit</a
          >, Wendy Wood and Dennis Rünger, <em>Annual Review of Psychology</em> (2016). A deeper
          review of what habits are, how they form through repetition in a stable context, and why
          they persist.
        </li>
      </ul>
      <h2>A note on our words</h2>
      <p>
        The help guide puts these ideas in our own words. It doesn't quote or speak for any of these
        authors, and AndThen isn't affiliated with or endorsed by them. Links open on other sites.
      </p>
      <p class="muted">
        AndThen is a self-help tool, not medical or mental-health advice. If a habit touches your
        health, check with a professional. See the <a routerLink="/terms">Terms of Use</a>.
      </p>
    </app-help-article>
  `,
})
export class FurtherReading {}
