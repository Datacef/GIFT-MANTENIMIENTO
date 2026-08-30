import React from 'react';

// Icon Imports
import {
  MdHome,
  MdPerson,
  MdQuestionAnswer,
  MdPrecisionManufacturing,
  MdDirectionsCar,
  MdBusiness,
  MdBuild,
  MdMedicalServices,
  MdWarehouse,
  MdSettings,
  MdHandshake,
  MdInbox,
  MdAssignment,
  MdEngineering,
  MdOutlineMarkEmailRead,
  MdAssessment,
  MdPrint,
  MdNotificationsActive,
  MdHelpOutline,
  MdHealthAndSafety,
} from 'react-icons/md';
import { UserRole } from 'types/user.types';

// Rutas principales del sidebar
const routes = [
  {
    name: 'Dashboard',
    layout: '/admin',
    path: 'default',
    icon: <MdHome className="h-6 w-6" />,
  },
  {
    name: 'Ayuda y Manual',
    layout: '/admin',
    path: 'ayuda',
    icon: <MdHelpOutline className="h-6 w-6" />,
  },
  {
    name: 'Inventarios',
    layout: '/admin',
    path: 'inventarios',
    icon: <MdWarehouse className="h-6 w-6" />,
    allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    children: [
      {
        name: 'Equipos Medicos',
        layout: '/admin',
        path: 'inventario',
        icon: <MdMedicalServices className="h-4 w-4" />,
        allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        name: 'Equipos Industriales',
        layout: '/admin',
        path: 'inventario-industrial',
        icon: <MdPrecisionManufacturing className="h-4 w-4" />,
        allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        name: 'Flota Vehicular',
        layout: '/admin',
        path: 'flota-vehicular',
        icon: <MdDirectionsCar className="h-4 w-4" />,
        allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        name: 'Infraestructura',
        layout: '/admin',
        path: 'infraestructura',
        icon: <MdBusiness className="h-4 w-4" />,
        allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        name: 'Papelera',
        layout: '/admin',
        path: 'inventario/papelera',
        icon: <MdInbox className="h-4 w-4" />,
        allowedRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
    ],
  },
  {
    name: 'Proveedores',
    layout: '/admin',
    path: 'proveedores',
    icon: <MdHandshake className="h-6 w-6" />,
    allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    name: 'Mantenimiento',
    layout: '/admin',
    path: 'mantenimiento',
    icon: <MdBuild className="h-6 w-6" />,
    allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    children: [
      {
        name: 'Bandeja',
        layout: '/admin',
        path: 'mantenimiento',
        icon: <MdInbox className="h-4 w-4" />,
        allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        name: 'Cumplimiento',
        layout: '/admin',
        path: 'mantenimiento/cumplimiento',
        icon: <MdAssessment className="h-4 w-4" />,
        allowedRoles: [UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        name: 'Carta Gantt',
        layout: '/admin',
        path: 'mantenimiento/gantt',
        icon: <MdAssessment className="h-4 w-4" />,
        allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        name: 'Reporte Semanal',
        layout: '/admin',
        path: 'mantenimiento/reporte',
        icon: <MdPrint className="h-4 w-4" />,
        allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        name: 'Alertas Vencimientos',
        layout: '/admin',
        path: 'alertas',
        icon: <MdNotificationsActive className="h-4 w-4" />,
        allowedRoles: [UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
    ]
  },
  {
    name: 'Solicitudes',
    layout: '/admin',
    path: 'solicitudes',
    icon: <MdInbox className="h-6 w-6" />,
    allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    children: [
      {
        name: 'Bandeja',
        layout: '/admin',
        path: 'solicitudes',
        icon: <MdInbox className="h-4 w-4" />,
        allowedRoles: [UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        name: 'Mis asignaciones',
        layout: '/admin',
        path: 'solicitudes/mis-asignaciones',
        icon: <MdAssignment className="h-4 w-4" />,
        allowedRoles: [UserRole.OPERATOR, UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
    ],
  },
];

// Rutas del menú de configuración (abajo del sidebar, solo ADMIN+)
export const configRoutes = [
  {
    name: 'Estado Sistema',
    layout: '/admin',
    path: 'salud',
    icon: <MdHealthAndSafety className="h-4 w-4" />,
    allowedRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    name: 'Preguntas Mantenimiento',
    layout: '/admin',
    path: 'preguntas',
    icon: <MdQuestionAnswer className="h-4 w-4" />,
    allowedRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    name: 'Encargados',
    layout: '/admin',
    path: 'encargados',
    icon: <MdEngineering className="h-4 w-4" />,
    allowedRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    name: 'Diagnostico Correo',
    layout: '/admin',
    path: 'diagnostico-correo',
    icon: <MdOutlineMarkEmailRead className="h-4 w-4" />,
    allowedRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    name: 'Gestion Usuarios',
    layout: '/admin',
    path: 'user-management',
    icon: <MdPerson className="h-4 w-4" />,
    allowedRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
];

export default routes;
