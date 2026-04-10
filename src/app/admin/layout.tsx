'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/admin/sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="px-4 py-6 pt-16 lg:px-8 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
