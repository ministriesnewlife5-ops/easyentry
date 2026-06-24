import React from 'react';
import Head from 'next/head';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] overflow-x-hidden">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/staff-manifest.json" />
        <meta name="theme-color" content="#E5A823" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      <main className="w-full max-w-3xl mx-auto p-4">{children}</main>
    </div>
  );
}
