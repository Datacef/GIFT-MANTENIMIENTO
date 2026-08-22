'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Parse from 'utils/parseClient';

const publicRoutes = ['/auth/sign-in', '/auth/sign-up/default'];
// Rutas publicas adicionales que NO redirigen a admin aunque el usuario este logueado.
// Se usan para el formulario publico de solicitud de mantenimiento.
const publicPermanentRoutes = ['/solicitud'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const currentUser = Parse.User.current();
    const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
    const isPublicPermanent = publicPermanentRoutes.some(route => pathname?.startsWith(route));

    if (isPublicPermanent) return; // sin redirecciones en rutas publicas permanentes
    if (!currentUser && !isPublicRoute) {
      router.push('/auth/sign-in');
    } else if (currentUser && isPublicRoute) {
      router.push('/admin/default');
    }
  }, [pathname, router]);

  return <>{children}</>;
}
