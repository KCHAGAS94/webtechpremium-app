'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard/usuarios');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">WebTech Premium</h1>
        <p className="text-xl text-blue-100 mb-8">Redirecionando...</p>
      </div>
    </div>
  );
}
