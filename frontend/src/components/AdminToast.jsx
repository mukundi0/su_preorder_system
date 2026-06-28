import { useEffect, useState, useCallback } from 'react'

export function useAdminToast() {
  const [toast, setToast] = useState(null)

  const dismiss = useCallback(() => setToast(null), [])

  const success = useCallback((message) => setToast({ type: 'success', message, id: Date.now() }), [])
  const error   = useCallback((message) => setToast({ type: 'error',   message, id: Date.now() }), [])

  return { toast, dismiss, success, error }
}

export default function AdminToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [toast?.id, onDismiss])

  if (!toast) return null

  const ok = toast.type === 'success'

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold w-[calc(100vw-3rem)] max-w-sm md:w-auto animate-fade-in-up ${
      ok ? 'bg-surface border-green-200' : 'bg-surface border-red-200'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ok ? 'bg-green-100' : 'bg-red-100'}`}>
        <span
          className={`material-symbols-outlined text-[18px] ${ok ? 'text-green-600' : 'text-red-600'}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {ok ? 'check_circle' : 'error'}
        </span>
      </div>
      <span className="flex-1 text-on-surface">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 text-on-surface-variant hover:text-on-surface border-none bg-transparent cursor-pointer p-0.5"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  )
}
