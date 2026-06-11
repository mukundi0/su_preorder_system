function toTitleCase(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

export default function StatsDashboard({ totalCategories, totalItems, thisMonthCategories, categoryHealth = [] }) {
  const monthDeltaLabel = thisMonthCategories > 0
    ? `+${thisMonthCategories} This Month`
    : `${thisMonthCategories} This Month`
  const topCategory = categoryHealth[0]
  const displayedHealth = categoryHealth.slice(0, 3)
  const barStyles = ['bg-primary', 'bg-secondary', 'bg-tertiary-fixed-dim']

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
          {topCategory ? (
            <>
              <p className="text-sm text-on-surface-variant max-w-[320px]">
                Top category is{' '}
                <span className="font-bold text-primary">{toTitleCase(topCategory.name)}</span>
                {' '}with {topCategory.count} of {totalItems} items ({topCategory.percentage}%).
              </p>
              <div className="mt-4 space-y-3">
                {displayedHealth.map((entry, index) => (
                  <div key={entry.name}>
                    <div className="flex justify-between text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                      <span>{toTitleCase(entry.name)}</span>
                      <span>{entry.count} items</span>
                    </div>
                    <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barStyles[index] || 'bg-primary'}`}
                        style={{ width: `${Math.max(entry.percentage, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-on-surface-variant max-w-[320px]">
              No menu item data yet. Add items to see category distribution health.
            </p>
          )}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-primary-container/5 -skew-x-12 translate-x-8"></div>
      </div>
    </div>
  )
}
