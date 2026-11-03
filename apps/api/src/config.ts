/** Settings read from the environment. Railway provides them as service variables. */
export interface Config {
  port: number;
  databaseUrl: string;
  /** Web origins allowed to call the API (CORS). */
  allowedOrigins: string[];
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('DATABASE_URL is not set.');
  return {
    port: Number(env['PORT'] ?? 3000),
    databaseUrl,
    allowedOrigins: (env['APP_ORIGIN'] ?? 'https://andthenhabits.com')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}
