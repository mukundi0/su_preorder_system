import { useState, useEffect } from 'react'

const defaultThemes = [
  { label: 'Blue', value: 'bg-primary-fixed text-primary' },
  { label: 'Red', value: 'bg-secondary-fixed text-secondary' },
  { label: 'Amber', value: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' },
  { label: 'Gray', value: 'bg-outline-variant/30 text-on-surface-variant' },
]

const defaultIcons = [
  'dinner_dining', 'cookie', 'local_bar', 'icecream',
  'bakery_dining', 'set_meal', 'ramen_dining', 'lunch_dining',
  'egg_alt', 'kebab_dining', 'tapas', 'breakfast_dining',
  'coffee', 'water_drop', 'soup_kitchen', 'cake',
]

const emptyForm = {
  name: '',
  description: '',
  iconName: 'category',
  colorTheme: 'bg-primary-fixed text-primary',
  updatedBy: '',
}

export default function CategoryModal({ open, onClose, onSubmit, editCategory }) {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (editCategory) {
      setForm({
        name: editCategory.name || '',
        description: editCategory.description || '',
        iconName: editCategory.iconName || 'category',
        colorTheme: editCategory.colorTheme || 'bg-primary-fixed text-primary',
        updatedBy: editCategory.updatedBy || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [editCategory, open])

  if (!open) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  const isEditing = !!editCategory

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h3 className="text-lg font-bold text-primary">
            {isEditing ? 'Edit Category' : 'Add New Category'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Category Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              required
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-container transition-all"
              placeholder="e.g. Main Meals"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-container transition-all resize-none"
              placeholder="e.g. Hot entrees & university specials"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {defaultIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, iconName: icon }))}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    form.iconName === icon
                      ? 'border-primary bg-primary-fixed text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Color Theme
            </label>
            <div className="flex flex-wrap gap-2">
              {defaultThemes.map((theme) => {
                const parts = theme.value.split(' ')
                const bgClass = parts[0] || 'bg-primary-fixed'
                const textClass = parts[1] || 'text-primary'
                return (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, colorTheme: theme.value }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                      form.colorTheme === theme.value
                        ? 'border-primary ring-2 ring-primary-fixed'
                        : 'border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded ${bgClass} flex items-center justify-center ${textClass}`}>
                      <span className="material-symbols-outlined text-[14px]">circle</span>
                    </div>
                    <span className="text-sm text-on-surface">{theme.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Updated By
            </label>
            <input
              type="text"
              value={form.updatedBy}
              onChange={handleChange('updatedBy')}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-container transition-all"
              placeholder="e.g. Admin"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant font-medium text-sm hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-medium text-sm hover:bg-primary-container transition-all cursor-pointer"
            >
              {isEditing ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
