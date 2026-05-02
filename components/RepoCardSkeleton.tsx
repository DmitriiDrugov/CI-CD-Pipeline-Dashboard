export function RepoCardSkeleton() {
  return (
    <div className="relative rounded-xl bg-bg-raised border border-white/5 p-5 overflow-hidden animate-pulse">
      <div className="absolute inset-0 bg-card-shine" />
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="h-4 w-36 rounded-md bg-white/6" />
          <div className="h-3 w-52 rounded-md bg-white/4" />
        </div>
        <div className="h-4 w-4 rounded bg-white/5 ml-4" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-5 w-16 rounded-full bg-white/6" />
        <div className="h-3 w-20 rounded bg-white/4" />
      </div>
      <div className="flex gap-4">
        <div className="h-3 w-24 rounded bg-white/4" />
        <div className="h-3 w-16 rounded bg-white/4" />
        <div className="h-3 w-12 rounded bg-white/4" />
      </div>
    </div>
  );
}
