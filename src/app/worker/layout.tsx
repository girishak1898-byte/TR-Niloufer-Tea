import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { WorkerNav } from './worker-nav';
import { LogoWithText } from '@/components/ui/logo';

async function getSessionFromCookie() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('worker-session')?.value;
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return {
      worker_name: payload.worker_name as string,
    };
  } catch {
    return null;
  }
}

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookie();

  return (
    <div className="flex min-h-screen flex-col bg-chai-50">
      <header className="sticky top-0 z-40 border-b border-chai-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex h-14 items-center justify-between px-4">
          <LogoWithText size="sm" />
          {session && (
            <span className="text-sm font-medium text-chai-600">
              {session.worker_name}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      {session && <WorkerNav />}
    </div>
  );
}
