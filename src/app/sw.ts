/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker';
import { NetworkOnly, Serwist } from 'serwist';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope;

const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, '');

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // defaultCache stores every cross-origin GET, which would copy customer data, time
    // entries and signature images from the Supabase API into Cache Storage (readable on
    // the device after sign-out). Offline data comes from IndexedDB, never from this cache.
    {
      matcher: ({ url }) => /^\/(rest|auth|functions|storage|realtime)\/v1\//.test(url.pathname),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: `${scopePath}/offline`,
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
