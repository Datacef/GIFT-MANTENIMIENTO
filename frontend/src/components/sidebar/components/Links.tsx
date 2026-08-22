/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import NavLink from 'components/link/NavLink';
import DashIcon from 'components/icons/DashIcon';
import Parse from 'utils/parseClient';
import { UserRole, accessLevelToRole } from 'types/user.types';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';

export const SidebarLinks = (props: { routes: RoutesType[] }): JSX.Element => {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const { routes } = props;

  useEffect(() => {
    const user = Parse.User.current();
    if (user) {
      const accessLevel = user.get('accessLevel') || 1;
      const role = user.get('role') || accessLevelToRole(accessLevel);
      setUserRole(role);
    } else {
      setUserRole(null);
    }
  }, []);

  // Match exacto del pathname contra `/admin/{routePath}`. Soporta paths
  // con subrutas (p.ej. 'inventario/papelera', 'mantenimiento/gantt',
  // 'solicitudes/mis-asignaciones').
  const activeRoute = useCallback(
    (routePath: string) => {
      if (!pathname) return false;
      const target = `/admin/${routePath}`;
      // Match exacto evita falsos positivos entre hermanos cuyo path
      // es prefijo de otro (p.ej. 'inventario' vs 'inventario/papelera').
      return pathname === target;
    },
    [pathname],
  );

  // Auto-abrir menú padre si un hijo está activo
  useEffect(() => {
    routes.forEach((route) => {
      if (route.children) {
        const childActive = route.children.some((child) => activeRoute(child.path));
        if (childActive) {
          setOpenMenus((prev) => ({ ...prev, [route.name]: true }));
        }
      }
    });
  }, [pathname, routes, activeRoute]);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const hasAccess = (route: RoutesType): boolean => {
    if (!route.allowedRoles) return true;
    if (!userRole) return false;
    return route.allowedRoles.includes(userRole);
  };

  const createLinks = (routes: RoutesType[]) => {
    return routes.map((route, index) => {
      if (!hasAccess(route)) return null;

      // Ruta con hijos (menú desplegable)
      if (route.children && route.children.length > 0) {
        const visibleChildren = route.children.filter(hasAccess);
        if (visibleChildren.length === 0) return null;

        const isOpen = openMenus[route.name] || false;
        const anyChildActive = visibleChildren.some((child) => activeRoute(child.path));

        return (
          <div key={index}>
            {/* Padre: toggle desplegable */}
            <div
              onClick={() => toggleMenu(route.name)}
              className="relative mb-1 flex cursor-pointer hover:cursor-pointer"
            >
              <li className="my-[3px] flex w-full cursor-pointer items-center justify-between px-8">
                <div className="flex items-center">
                  <span
                    className={`${
                      anyChildActive
                        ? 'font-bold text-brand-500 dark:text-white'
                        : 'font-medium text-gray-600'
                    }`}
                  >
                    {route.icon ? route.icon : <DashIcon />}
                  </span>
                  <p
                    className={`leading-1 ml-4 flex ${
                      anyChildActive
                        ? 'font-bold text-navy-700 dark:text-white'
                        : 'font-medium text-gray-600'
                    }`}
                  >
                    {route.name}
                  </p>
                </div>
                <span className="text-gray-400">
                  {isOpen ? (
                    <MdExpandLess className="h-5 w-5" />
                  ) : (
                    <MdExpandMore className="h-5 w-5" />
                  )}
                </span>
              </li>
            </div>

            {/* Hijos */}
            {isOpen && (
              <div className="mb-2">
                {visibleChildren.map((child, childIndex) => (
                  <NavLink
                    key={`${index}-${childIndex}`}
                    href={child.layout + '/' + child.path}
                  >
                    <div className="relative flex hover:cursor-pointer">
                      <li className="my-[2px] flex cursor-pointer items-center pl-14 pr-8">
                        <span
                          className={`${
                            activeRoute(child.path)
                              ? 'font-bold text-brand-500 dark:text-white'
                              : 'font-medium text-gray-500'
                          }`}
                        >
                          {child.icon ? child.icon : <DashIcon />}
                        </span>
                        <p
                          className={`leading-1 ml-3 flex text-sm ${
                            activeRoute(child.path)
                              ? 'font-bold text-navy-700 dark:text-white'
                              : 'font-medium text-gray-500'
                          }`}
                        >
                          {child.name}
                        </p>
                      </li>
                      {activeRoute(child.path) ? (
                        <div className="absolute right-0 top-px h-7 w-1 rounded-lg bg-brand-500 dark:bg-brand-400" />
                      ) : null}
                    </div>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      }

      // Ruta simple (sin hijos)
      if (
        route.layout === '/admin' ||
        route.layout === '/auth' ||
        route.layout === '/rtl'
      ) {
        return (
          <NavLink key={index} href={route.layout + '/' + route.path}>
            <div className="relative mb-3 flex hover:cursor-pointer">
              <li
                className="my-[3px] flex cursor-pointer items-center px-8"
                key={index}
              >
                <span
                  className={`${
                    activeRoute(route.path) === true
                      ? 'font-bold text-brand-500 dark:text-white'
                      : 'font-medium text-gray-600'
                  }`}
                >
                  {route.icon ? route.icon : <DashIcon />}{' '}
                </span>
                <p
                  className={`leading-1 ml-4 flex ${
                    activeRoute(route.path) === true
                      ? 'font-bold text-navy-700 dark:text-white'
                      : 'font-medium text-gray-600'
                  }`}
                >
                  {route.name}
                </p>
              </li>
              {activeRoute(route.path) ? (
                <div className="absolute right-0 top-px h-9 w-1 rounded-lg bg-brand-500 dark:bg-brand-400" />
              ) : null}
            </div>
          </NavLink>
        );
      }
    });
  };

  return <>{createLinks(routes)}</>;
};

export default SidebarLinks;
