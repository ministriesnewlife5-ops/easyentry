import React from 'react';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      <main className="max-w-3xl mx-auto p-4">{children}</main>
    </div>
  );
}
