import React from 'react';

// Layout PUBLICO — no aplica AuthGuard ni sidebar admin.
export default function SolicitudPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> DATACEF — Sistema de Mantenimiento
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
