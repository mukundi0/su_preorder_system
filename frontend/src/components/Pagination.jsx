export default function Pagination({ page, totalPages, total, limit, onPageChange }) {
  const pageSize = limit || (totalPages > 0 ? Math.ceil(total / totalPages) : 0)
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0
  const endItem = Math.min(page * pageSize, total)

  return (
    <div className="px-6 py-4 bg-surface-container-lowest flex items-center justify-between text-on-surface-variant text-sm">
      <p>
        Showing <span className="font-bold text-primary">{startItem}</span> to{' '}
        <span className="font-bold text-primary">{endItem}</span> of{' '}
        <span className="font-bold text-primary">{total}</span> categories
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 border rounded-lg transition-colors cursor-pointer ${
              p === page
                ? 'border-outline-variant bg-primary text-on-primary'
                : 'border-outline-variant hover:bg-surface-container'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}
