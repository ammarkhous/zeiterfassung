// Users without an email sign in with a username. Supabase Auth needs an email,
// so a username maps to a synthetic address that is never used for mail. Must
// match SYNTHETIC_EMAIL_DOMAIN in supabase/functions/admin-users/index.ts.
export const SYNTHETIC_EMAIL_DOMAIN = 'users.zeiterfassung.local';

export const identifierToEmail = (identifier: string): string => {
  const trimmed = identifier.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : `${trimmed}@${SYNTHETIC_EMAIL_DOMAIN}`;
};
