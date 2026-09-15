'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

export const UpdatePrompt = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // The service worker (skipWaiting + clientsClaim) can claim clients the very
    // first time a page is ever visited, before there was any previous controller.
    // Only treat a controllerchange as a real update if a controller already
    // existed when this component mounted — otherwise this is just first-time
    // bootstrap, not a newer version replacing one the user is actively using.
    let sawInitialController = !!navigator.serviceWorker.controller;

    const handleControllerChange = () => {
      if (!sawInitialController) {
        sawInitialController = true;
        return;
      }
      setUpdateAvailable(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-3 border-b border-border bg-accent px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-sm text-white">
      <span>Neue Version verfügbar.</span>
      <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
        Neu laden
      </Button>
    </div>
  );
};
