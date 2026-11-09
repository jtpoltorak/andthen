import { vi } from 'vitest';

// Tests only.
/** A stand-in for Firefox's `browser`, with or without the data-consent manifest key. */
export function fakeBrowser(opts: { firefox: boolean; granted?: string[]; allow?: boolean }) {
  const request = vi.fn(async () => opts.allow ?? true);
  const api = {
    storage: { local: { get: async () => ({}), set: async () => undefined } },
    runtime: {
      getManifest: () =>
        opts.firefox
          ? {
              browser_specific_settings: {
                gecko: {
                  data_collection_permissions: {
                    required: ['none'],
                    optional: ['personallyIdentifyingInfo', 'authenticationInfo'],
                  },
                },
              },
            }
          : {},
    },
    permissions: { request, getAll: async () => ({ data_collection: opts.granted ?? [] }) },
  };
  (globalThis as { browser?: unknown }).browser = api;
  return { request };
}
