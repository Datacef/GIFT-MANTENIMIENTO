/* eslint-disable */

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { HiX } from 'react-icons/hi';
import { MdSettings, MdExpandMore, MdExpandLess } from 'react-icons/md';
import Links from './components/Links';
import NavLink from 'components/link/NavLink';
import Parse from 'utils/parseClient';
import { UserRole, accessLevelToRole } from 'types/user.types';

import { IRoute } from 'types/navigation';
import { configRoutes } from 'routes';

function SidebarHorizon(props: { routes: IRoute[]; [x: string]: any }) {
  const { routes, open, setOpen } = props;
  const pathname = usePathname();
  const [configOpen, setConfigOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const user = Parse.User.current();
    if (user) {
      const name = user.get('displayName') || user.get('firstName') || user.getUsername() || '';
      setUserName(name);
      const accessLevel = user.get('accessLevel') || 1;
      setUserRole(user.get('role') || accessLevelToRole(accessLevel));
    }
  }, []);

  const activeRoute = (routePath: string) => {
    if (!pathname) return false;
    return pathname === `/admin/${routePath}`;
  };

  // Auto-abrir si una ruta de config está activa
  useEffect(() => {
    const configActive = configRoutes.some((r) => activeRoute(r.path));
    if (configActive) setConfigOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

  return (
    <div
      className={`sm:none duration-175 linear fixed !z-50 flex min-h-full flex-col bg-white pb-10 shadow-2xl shadow-white/5 transition-all dark:!bg-navy-800 dark:text-white md:!z-50 lg:!z-50 xl:!z-0 ${
        open ? 'translate-x-0' : '-translate-x-96 xl:translate-x-0'
      }`}
    >
      <span
        className="absolute right-4 top-4 block cursor-pointer xl:hidden"
        onClick={() => setOpen(false)}
      >
        <HiX />
      </span>

      <div className={`mx-[56px] mt-[50px] flex items-center`}>
        <div className="ml-1 mt-1 h-2.5 font-poppins text-[26px] font-bold uppercase text-navy-700 dark:text-white">
          MMTTO <span className="font-medium text-sm block normal-case">Gestion de Mantenimiento</span>
        </div>
      </div>
      <div className="mb-7 mt-[58px] h-px bg-gray-300 dark:bg-white/30" />

      {/* Rutas principales */}
      <ul className="mb-auto pt-1">
        <Links routes={routes} />
      </ul>

      {/* Separador */}
      <div className="mx-6 h-px bg-gray-200 dark:bg-white/20" />

      {/* Sección de configuración (abajo) */}
      {isAdmin && (
        <div className="pt-3 pb-2">
          {/* Toggle configuración */}
          <div
            onClick={() => setConfigOpen(!configOpen)}
            className="mx-4 flex cursor-pointer items-center justify-between rounded-xl px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <div className="flex items-center gap-3">
              <MdSettings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-navy-700 dark:text-white">
                  {userName || 'Configuracion'}
                </p>
                <p className="text-[10px] text-gray-400">Administracion</p>
              </div>
            </div>
            <span className="text-gray-400">
              {configOpen ? (
                <MdExpandLess className="h-4 w-4" />
              ) : (
                <MdExpandMore className="h-4 w-4" />
              )}
            </span>
          </div>

          {/* Sub-menú de configuración */}
          {configOpen && (
            <div className="mt-1">
              {configRoutes.map((route, index) => {
                if (route.allowedRoles && (!userRole || !route.allowedRoles.includes(userRole))) {
                  return null;
                }
                return (
                  <NavLink key={index} href={route.layout + '/' + route.path}>
                    <div className="relative flex hover:cursor-pointer">
                      <li className="my-[2px] flex cursor-pointer items-center pl-14 pr-8">
                        <span
                          className={`${
                            activeRoute(route.path)
                              ? 'font-bold text-brand-500 dark:text-white'
                              : 'font-medium text-gray-500'
                          }`}
                        >
                          {route.icon}
                        </span>
                        <p
                          className={`leading-1 ml-3 flex text-sm ${
                            activeRoute(route.path)
                              ? 'font-bold text-navy-700 dark:text-white'
                              : 'font-medium text-gray-500'
                          }`}
                        >
                          {route.name}
                        </p>
                      </li>
                      {activeRoute(route.path) ? (
                        <div className="absolute right-0 top-px h-7 w-1 rounded-lg bg-brand-500 dark:bg-brand-400" />
                      ) : null}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SidebarHorizon;
