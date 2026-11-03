import { buildApp } from './app';
import { readConfig } from './config';
import { connect } from './db/client';

const config = readConfig();
const { db, close } = connect(config.databaseUrl);
const app = await buildApp({ db, allowedOrigins: config.allowedOrigins, logger: true });

// Railway stops a deploy with SIGTERM: finish open requests, then close the pool.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, async () => {
    await app.close();
    await close();
    process.exit(0);
  });
}

await app.listen({ host: '0.0.0.0', port: config.port });
