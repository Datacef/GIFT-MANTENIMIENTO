'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const user = Parse.User.current();
    if (user) {
      const accessLevel = user.get('accessLevel') || 1;
      if (accessLevel >= 4) {
        setIsAuthorized(true);
      } else {
        router.push('/admin/default');
      }
    } else {
      router.push('/auth/sign-in');
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
};

export default AdminGuard;
