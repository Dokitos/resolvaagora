import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-brand-700">
      <SiteHeader />

      <section className="bg-gradient-to-br from-brand-700 to-brand-900 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-white/60">ResolvaAgora · Última atualização: {updated}</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div
          className="mx-auto max-w-3xl space-y-4 px-5 text-brand-600 sm:px-8
            [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-brand-700 [&_h2]:first:mt-0
            [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:leading-relaxed
            [&_a]:font-semibold [&_a]:text-accent-700 [&_a]:underline [&_strong]:text-brand-700
            [&_table]:w-full [&_table]:border-collapse [&_th]:border-b [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
            [&_td]:border-b [&_td]:border-gray-100 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_table]:text-sm"
        >
          {children}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
