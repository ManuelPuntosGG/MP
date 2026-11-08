import React from 'react';

export default function PageLoader() {
  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[60dvh] flex flex-col justify-start gap-6 animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label="Cargando contenido..."
    >
      <div className="space-y-3">
        <div className="h-8 w-56 bg-gray-200/70 dark:bg-gray-800/70 rounded-xl animate-pulse" />
        <div className="h-4 w-80 max-w-full bg-gray-200/50 dark:bg-gray-800/50 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="h-52 bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 rounded-3xl p-6 animate-pulse" />
        <div className="h-52 bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 rounded-3xl p-6 animate-pulse" />
      </div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
