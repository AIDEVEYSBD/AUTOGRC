/* Shown instantly during navigation between platform tabs while the
   server renders (every page is force-dynamic). Keeps the shell visible. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-bd p-6 min-h-[160px] flex flex-col gap-3">
            <div className="ey-skeleton h-3 w-1/2" />
            <div className="ey-skeleton h-10 w-2/3" />
            <div className="ey-skeleton h-3 w-3/4" />
            <div className="ey-skeleton mt-auto h-3 w-1/3" />
          </div>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-card border border-bd p-6 lg:col-span-2 flex flex-col gap-4">
          <div className="ey-skeleton h-4 w-1/3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="ey-skeleton h-3 w-28" />
              <div className="ey-skeleton h-3 flex-1" />
              <div className="ey-skeleton h-3 w-10" />
            </div>
          ))}
        </div>
        <div className="bg-card border border-bd p-6 flex flex-col gap-4">
          <div className="ey-skeleton h-4 w-1/2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ey-skeleton h-3 w-full" />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-bd">
        <div className="border-b border-bd p-5">
          <div className="ey-skeleton h-4 w-48" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-hair px-6 py-4">
            <div className="ey-skeleton h-4 w-1/4" />
            <div className="ey-skeleton h-4 w-1/3" />
            <div className="ey-skeleton h-4 w-1/6" />
            <div className="ey-skeleton h-4 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
