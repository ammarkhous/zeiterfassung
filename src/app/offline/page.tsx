'use client';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <p className="text-text">Sie sind offline. Ihre lokalen Daten sind weiterhin verfügbar.</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-[filter] duration-150 ease-out hover:brightness-110"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
