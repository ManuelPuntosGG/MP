import React from 'react';

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div 
        className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" 
        aria-label="Cargando contenido..."
      ></div>
    </div>
  );
}
