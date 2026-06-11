export default function StatsDashboard({ totalCategories, totalItems, thisMonthCategories }) {
  const monthDeltaLabel = thisMonthCategories > 0
    ? `+${thisMonthCategories} This Month`
    : `${thisMonthCategories} This Month`

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant hover:border-primary transition-colors cursor-default shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-primary-fixed rounded-lg">
            <span className="material-symbols-outlined text-primary">category</span>
          </div>
          <span className="text-green-700 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">{monthDeltaLabel}</span>
        </div>
        <h3 className="text-on-surface-variant text-xs uppercase font-bold tracking-wider">Total Categories</h3>
        <p className="text-3xl font-bold text-primary mt-1">{totalCategories}</p>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant hover:border-primary transition-colors cursor-default shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-secondary-fixed rounded-lg">
            <span className="material-symbols-outlined text-secondary">fastfood</span>
          </div>
          <span className="text-on-surface-variant text-xs font-bold bg-surface-container px-2 py-1 rounded-full">Across Menus</span>
        </div>
        <h3 className="text-on-surface-variant text-xs uppercase font-bold tracking-wider">Total Items</h3>
        <p className="text-3xl font-bold text-primary mt-1">{totalItems}</p>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant hover:border-primary transition-colors cursor-default md:col-span-2 overflow-hidden relative shadow-sm">
        <div className="relative z-10">
          <h3 className="text-on-surface-variant text-xs uppercase font-bold tracking-wider mb-2">Category Health</h3>
          <p className="text-sm text-on-surface-variant max-w-[240px]">
            Most categories are performing well with high turnover in{' '}
            <span className="font-bold text-primary">Main Meals</span>.
          </p>
          <div className="mt-4 flex gap-2">
            <div className="h-2 flex-grow bg-primary rounded-full"></div>
            <div className="h-2 w-1/4 bg-secondary rounded-full"></div>
            <div className="h-2 w-1/6 bg-tertiary-fixed-dim rounded-full"></div>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-primary-container/5 -skew-x-12 translate-x-8"></div>
      </div>
    </div>
  )
}
