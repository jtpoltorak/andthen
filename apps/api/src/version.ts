// Replaced with the root package.json version when build.mjs bundles the API.
// Under `npm run dev` and tests it isn't defined, so the version reads "dev".
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
