'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  getTemplateAvailability,
  refreshTemplateAvailability,
  subscribeTemplateAvailability,
} from '@/lib/templates';

const SERVER_SNAPSHOT = { monthly: false, session: false };

// Whether an admin-uploaded Word template exists for each report type. All export
// buttons share one store, so a long session list does not query IndexedDB per row.
export const useReportTemplates = () => {
  const availability = useSyncExternalStore(
    subscribeTemplateAvailability,
    getTemplateAvailability,
    () => SERVER_SNAPSHOT
  );

  useEffect(() => {
    refreshTemplateAvailability().catch(() => {});
  }, []);

  return availability;
};
