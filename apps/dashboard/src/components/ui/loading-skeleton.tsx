// Loading skeleton components for better UX

export function CardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
      <div className="h-8 bg-white/10 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-white/10 rounded w-1/3"></div>
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-6 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 animate-pulse">
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 bg-white/10 rounded flex-1"></div>
            <div className="h-4 bg-white/10 rounded w-24"></div>
            <div className="h-4 bg-white/10 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-10 bg-white/10 rounded w-1/3 animate-pulse"></div>
      <StatsGridSkeleton />
      <CardSkeleton />
    </div>
  );
}

