export function RepoCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-gray-800 rounded" />
          <div className="h-3 w-56 bg-gray-800/60 rounded" />
        </div>
        <div className="h-4 w-4 bg-gray-800 rounded ml-4 flex-shrink-0" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-5 w-16 bg-gray-800 rounded-full" />
        <div className="h-3 w-20 bg-gray-800/60 rounded" />
        <div className="h-3 w-14 bg-gray-800/40 rounded" />
      </div>
      <div className="flex gap-4">
        <div className="h-3 w-28 bg-gray-800/60 rounded" />
        <div className="h-3 w-16 bg-gray-800/60 rounded" />
        <div className="h-3 w-12 bg-gray-800/60 rounded" />
      </div>
    </div>
  );
}
