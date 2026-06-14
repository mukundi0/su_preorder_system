export default function TopNav({ search, onSearchChange, onAddClick }) {
  return (
    <header className="flex justify-between items-center px-8 h-16 w-[calc(100%-16rem)] ml-64 bg-surface-container-lowest sticky top-0 border-b border-outline-variant z-40">
      <div className="flex items-center gap-6 flex-grow">
        <h2 className="text-xl font-bold text-primary whitespace-nowrap">Category Management</h2>
        <div className="relative w-full max-w-md ml-auto mr-auto">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline scale-90">search</span>
          <input
            className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary-container transition-all"
            placeholder="Search categories..."
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={onAddClick}
          className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add New Category
        </button>
        <div className="flex items-center gap-1 border-l border-outline-variant pl-4 ml-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative cursor-pointer">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-surface-container-lowest"></span>
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors cursor-pointer">
            <span className="material-symbols-outlined">help</span>
          </button>
        </div>
      </div>
    </header>
  )
}
