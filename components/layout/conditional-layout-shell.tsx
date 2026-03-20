'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/layout/footer';
import Navbar from '@/components/layout/navbar';

export function ConditionalLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthOrJoin =
    pathname?.startsWith('/auth') || pathname?.startsWith('/join');

  if (isAuthOrJoin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
