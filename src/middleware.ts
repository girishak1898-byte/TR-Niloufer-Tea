import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { createServerClient } from '@supabase/ssr';

const WORKER_SESSION_COOKIE = 'worker-session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Worker routes protection
  if (pathname.startsWith('/worker') && !pathname.startsWith('/worker/login')) {
    const sessionCookie = request.cookies.get(WORKER_SESSION_COOKIE);
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/worker/login', request.url));
    }
    try {
      const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);
      await jwtVerify(sessionCookie.value, secret);
    } catch {
      const response = NextResponse.redirect(new URL('/worker/login', request.url));
      response.cookies.delete(WORKER_SESSION_COOKIE);
      return response;
    }
  }

  // Admin routes protection
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const response = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options as Record<string, unknown>);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/worker/:path*', '/admin/:path*'],
};
