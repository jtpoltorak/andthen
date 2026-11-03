import { buildApp } from './app';
import { cleanUp } from './cleanup';
import { readConfig } from './config';
import { connect } from './db/client';
import { ConsoleMailer, NoMailer, ResendMailer, type Mailer } from './mail';

const config = readConfig();
const { db, close } = connect(config.databaseUrl);
const mailer: Mailer = config.resendApiKey
  ? new ResendMailer(config.resendApiKey, config.mailFrom)
  : config.production
    ? new NoMailer()
    : new ConsoleMailer();
const app = await buildApp({ db, allowedOrigins: config.allowedOrigins, mailer, logger: true });
if (!config.resendApiKey) {
  app.log.warn('RESEND_API_KEY is not set: sign-in emails are not being sent.');
}

// The daily tidy-up: warn, then delete, accounts unused for two years; drop expired sessions.
// Runs a minute after start (so it never slows a deploy) and then once a day.
const DAY_MS = 24 * 60 * 60 * 1000;
const appLink = config.allowedOrigins[0] ?? 'https://andthenhabits.com';
async function tidyUp() {
  try {
    const result = await cleanUp(db, mailer, appLink);
    app.log.info(result, 'Cleanup done');
  } catch (err) {
    app.log.error(err, 'Cleanup failed');
  }
}
const firstRun = setTimeout(tidyUp, 60_000);
const daily = setInterval(tidyUp, DAY_MS);
firstRun.unref();
daily.unref();

// Railway stops a deploy with SIGTERM: finish open requests, then close the pool.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, async () => {
    clearTimeout(firstRun);
    clearInterval(daily);
    await app.close();
    await close();
    process.exit(0);
  });
}

await app.listen({ host: '0.0.0.0', port: config.port });
