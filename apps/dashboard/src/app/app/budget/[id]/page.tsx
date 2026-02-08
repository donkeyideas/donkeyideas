'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BudgetPeriodRedirect({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/app/budget?period=${params.id}`);
  }, [params.id, router]);

  return (
    <div className="p-8">
      <div className="text-center text-slate-400">Redirecting...</div>
    </div>
  );
}
