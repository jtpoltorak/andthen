import { buildApp } from './app';
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

// Railway stops a deploy with SIGTERM: finish open requests, then close the pool.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, async () => {
    await app.close();
    await close();
    process.exit(0);
  });
}

await app.listen({ host: '0.0.0.0', port: config.port });
