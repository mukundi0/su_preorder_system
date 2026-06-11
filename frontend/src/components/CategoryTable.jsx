export default function CategoryTable({ categories, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-lowest">
            <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">Category Name</th>
            <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant text-center">Total Items</th>
            <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">Last Updated</th>
            <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {categories.map((cat) => {
            const themeParts = (cat.colorTheme || 'bg-primary-fixed text-primary').split(' ')
            const bgClass = themeParts[0] || 'bg-primary-fixed'
            const textClass = themeParts[1] || 'text-primary'

            const date = cat.updatedAt ? new Date(cat.updatedAt) : new Date()
            const formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            const formattedTime = date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <tr key={cat._id} className="hover:bg-surface-container-low transition-colors group cursor-pointer">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${bgClass} flex items-center justify-center ${textClass}`}>
                      <span className="material-symbols-outlined">{cat.iconName || 'category'}</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-on-surface capitalize">{cat.name}</div>
                      {cat.description && (
                        <div className="text-[12px] text-on-surface-variant">{cat.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="bg-surface-container-highest text-primary font-bold px-3 py-1 rounded-full text-sm">
                    {cat.itemCount ?? 0}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="text-sm text-on-surface">{formattedDate}</div>
                  <div className="text-[11px] text-on-surface-variant">
                    by {cat.updatedBy || 'System'} ({formattedTime})
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(cat)}
                      className="p-2 text-primary hover:bg-primary-fixed rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      onClick={() => onDelete(cat)}
                      className="p-2 text-secondary hover:bg-secondary-fixed rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
