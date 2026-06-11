import Sidebar from '../components/Sidebar'

export default function SectionPlaceholder({ title, description }) {
  return (
    <div className="bg-background text-on-background overflow-x-hidden min-h-screen">
      <Sidebar />
      <header className="flex items-center px-8 h-16 w-[calc(100%-16rem)] ml-64 bg-surface-container-lowest sticky top-0 border-b border-outline-variant z-40">
        <h2 className="text-xl font-bold text-primary">{title}</h2>
      </header>

      <main className="ml-64 p-8 min-h-[calc(100vh-4rem)]">
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8">
          <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
          <p className="text-on-surface-variant text-sm">{description}</p>
        </section>
      </main>
    </div>
  )
}
