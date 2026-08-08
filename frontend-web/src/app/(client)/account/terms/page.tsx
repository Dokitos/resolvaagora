import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SECTIONS = [
  {
    title: 'Condições do serviço',
    body: `Qualquer serviço não inclui peças/materiais adicionais não selecionados.

1) O valor apresentado é um orçamento estimado com base no valor médio para os serviços selecionados.
2) O orçamento final do serviço será determinado no local após levantamento das tarefas a realizar e está sujeito a confirmação.
3) Serviço com custo mínimo de 30,00€.
4) Em todos os casos, o agendamento está sujeito ao pagamento do valor apresentado.
5) Serviço com 6 meses de garantia.`,
  },
  {
    title: 'Política de cancelamento',
    body: 'O cancelamento é gratuito e com reembolso completo até à data e hora agendadas para o serviço. Após esse período, poderão aplicar-se custos de deslocação.',
  },
  {
    title: 'Pagamentos',
    body: 'Os pagamentos são processados de forma segura. Com o pagamento deste serviço, está a confirmar o seu interesse na contratação de uma equipa profissional ResolvaAgora para a execução do serviço.',
  },
  {
    title: 'Privacidade',
    body: 'Os teus dados pessoais são tratados de acordo com a legislação aplicável e utilizados apenas para a prestação e gestão dos serviços contratados.',
  },
]

export default function TermsPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/account">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Termos e condições</h1>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="font-bold text-gray-900 mb-2">{s.title}</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
