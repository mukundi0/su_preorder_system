import { useState, useRef, useEffect } from 'react'

const CATEGORIES = ['Main Meals', 'Snacks', 'Drinks', 'Pastries', 'Desserts']

const emptyForm = {
  name: '',
  category: '',
  halfPrice: '',
  fullPrice: '',
  description: '',
  isAvailable: true,
}

export default function AddMenuItemModal({ open, onClose, onSubmit, editItem }) {
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (editItem) {
      setForm({
        name: editItem.name || '',
        category: editItem.category || '',
        halfPrice: editItem.halfPrice?.toString() || '',
        fullPrice: editItem.fullPrice?.toString() || editItem.price?.toString() || '',
        description: editItem.description || '',
        isAvailable: editItem.isAvailable !== false,
      })
      setImagePreview(editItem.imageUrl || null)
      setImageFile(null)
      setSubmitError('')
    } else {
      setForm(emptyForm)
      setImagePreview(null)
      setImageFile(null)
      setSubmitError('')
    }
  }, [editItem, open])

  if (!open) return null

  const handleChange = (field) => (e) => {
    const value = field === 'isAvailable' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleImageSelect(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    handleImageSelect(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    if (!form.name.trim()) return
    if (!form.category) return
    const hasHalf = form.halfPrice !== ''
    const hasFull = form.fullPrice !== ''

    if (!hasHalf && !hasFull) return
    if (hasHalf && (isNaN(form.halfPrice) || Number(form.halfPrice) < 0)) return
    if (hasFull && (isNaN(form.fullPrice) || Number(form.fullPrice) < 0)) return
    if (!imagePreview && !editItem) return

    setSubmitting(true)

    const formData = new FormData()
    formData.append('name', form.name.trim())
    formData.append('category', form.category)
    formData.append('halfPrice', form.halfPrice)
    formData.append('fullPrice', form.fullPrice)
    formData.append('price', form.fullPrice || form.halfPrice)
    formData.append('description', form.description.trim())
    formData.append('isAvailable', form.isAvailable)

    if (imageFile) {
      formData.append('image', imageFile)
    }

    try {
      await onSubmit(formData, editItem)
      setSubmitting(false)
    } catch (error) {
      setSubmitError(error.message || 'Failed to save menu item.')
      setSubmitting(false)
    }
  }

  const isEditing = !!editItem

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-lg border border-outline-variant flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center shrink-0">
          <h3 className="text-headline-sm font-bold text-primary">
            {isEditing ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h3>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <label className="text-label-md text-on-surface font-semibold block">Item Image</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer group relative min-h-[160px] ${
                dragOver ? 'border-primary bg-primary-fixed/20' : 'border-outline-variant'
              }`}
            >
              {imagePreview ? (
                <div className="relative w-full h-full flex flex-col items-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-36 rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage() }}
                    className="mt-2 text-xs text-error hover:underline cursor-pointer"
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-on-primary-container">add_photo_alternate</span>
                  </div>
                  <p className="text-body-md font-semibold text-primary mb-1">Click to upload or drag and drop</p>
                  <p className="text-label-md text-outline">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-label-md text-on-surface font-semibold block">Item Name</label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                required
                className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md transition-colors"
                placeholder="e.g., Premium Basmati Rice"
              />
            </div>

            <div className="space-y-2">
              <label className="text-label-md text-on-surface font-semibold block">Category</label>
              <select
                value={form.category}
                onChange={handleChange('category')}
                required
                className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md transition-colors"
              >
                <option value="" disabled>Select Category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-label-md text-on-surface font-semibold block">Half Price (KES)</label>
              <input
                type="number"
                value={form.halfPrice}
                onChange={handleChange('halfPrice')}
                min="0"
                step="0.01"
                className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md transition-colors"
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <label className="text-label-md text-on-surface font-semibold block">Full Price (KES)</label>
              <input
                type="number"
                value={form.fullPrice}
                onChange={handleChange('fullPrice')}
                min="0"
                step="0.01"
                className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md transition-colors"
                placeholder="Optional"
              />
              <p className="text-[11px] text-on-surface-variant">Provide at least one price (half or full).</p>
            </div>

            <div className="space-y-2">
              <label className="text-label-md text-on-surface font-semibold block">Initial Status</label>
              <div className="flex items-center gap-3 h-12">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={handleChange('isAvailable')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-dim peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
                <span className="text-body-md text-on-surface-variant">
                  {form.isAvailable ? 'Available' : 'Sold Out'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-label-md text-on-surface font-semibold block">Description</label>
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              rows={3}
              className="w-full p-4 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md transition-colors resize-none"
              placeholder="Brief description of the item..."
            />
          </div>

          {submitError && (
            <div className="rounded-lg border border-error bg-error-container/30 px-4 py-3 text-sm text-error">
              {submitError}
            </div>
          )}
        </form>

        <div className="p-6 border-t border-outline-variant flex justify-end gap-3 shrink-0 bg-surface">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-outline text-on-surface hover:bg-surface-container transition-colors font-semibold text-body-md cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity font-semibold text-body-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {submitting && <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>}
            {isEditing ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}
