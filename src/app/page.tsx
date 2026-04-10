import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="flex flex-col items-center gap-3">
        <Logo size="lg" />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-chai-700">TR Hyderabad</h1>
          <p className="text-lg font-medium text-chai-600">Tea Shop</p>
          <p className="mt-1 text-sm text-gray-500">Sales Tracker</p>
        </div>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-4">
        <Link
          href="/worker/login"
          className="rounded-xl bg-chai-600 px-8 py-4 text-center text-lg font-semibold text-white shadow-lg transition-colors hover:bg-chai-700 active:bg-chai-800"
        >
          Worker Portal
        </Link>
        <Link
          href="/admin/login"
          className="rounded-xl bg-gray-800 px-8 py-4 text-center text-lg font-semibold text-white shadow-lg transition-colors hover:bg-gray-900 active:bg-gray-950"
        >
          Admin Portal
        </Link>
      </div>
    </div>
  );
}
