'use client';
import { useState } from 'react';
import { MdSupportAgent } from 'react-icons/md';


const Footer = () => {
  const [showSupport, setShowSupport] = useState(false);

  return (
    <div className="flex w-full flex-col items-center justify-between px-1 pb-8 pt-3 lg:px-8 xl:flex-row">
      <p className="mb-4 text-center text-sm font-medium text-gray-600 sm:!mb-0 md:text-lg">
        <span className="mb-4 text-center text-sm text-gray-600 sm:!mb-0 md:text-base">
          ©{new Date().getFullYear()} Sistema de Gestión de Mantenimiento — Acreditación en Salud
        </span>
      </p>
      <div>
        <ul className="flex flex-wrap items-center gap-3 sm:flex-nowrap md:gap-10">
          <li>
            <button
              onClick={() => setShowSupport(true)}
              className="text-base font-medium text-gray-600 hover:text-navy-700 dark:hover:text-white flex items-center gap-2"
            >
              <MdSupportAgent className="h-5 w-5" />
              Soporte y Asistencia
            </button>
          </li>
        </ul>
      </div>

      {/* Support Modal */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowSupport(false)}>
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-navy-800" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-navy-700 dark:text-white">
                Contacto de Soporte
              </h3>
              <button
                onClick={() => setShowSupport(false)}
                className="text-gray-500 hover:text-red-500"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p className="font-bold text-lg text-navy-700 dark:text-white">Soporte y Asistencia</p>
              <div className="mt-2 space-y-1">
                <p>Atte.</p>
                <p className="font-semibold text-navy-700 dark:text-white">Fernando Ramírez S.</p>
                <p>Profesional de Mantenimiento</p>
                <p>Unidad de Gestión de Mantenimiento</p>
              </div>
              <div className="mt-4 bg-gray-50 p-3 rounded-lg dark:bg-navy-700 text-xs text-gray-500 space-y-1">
                <p>+56 9 5963 3653</p>
                <p>Anexo: 284413</p>
                <p className="font-medium">Sistema de Gestión de Mantenimiento</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Footer;
