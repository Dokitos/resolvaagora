import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '../_components/legal-page'

export const metadata: Metadata = {
  title: 'Termos e Condições',
  description: 'Termos e condições de utilização da plataforma ResolvaAgora.',
  alternates: { canonical: '/termos' },
}

export default function TermosPage() {
  return (
    <LegalPage title="Termos e Condições de Utilização" updated="4 de julho de 2026">
      <h2>1. Objeto</h2>
      <p>
        Estes termos regulam a utilização da aplicação e do site ResolvaAgora, uma plataforma que liga clientes a
        técnicos para serviços de assistência ao domicílio (eletricidade, canalização, climatização,
        eletrodomésticos, entre outros), operada por Douglas Miranda – Per4manceMD (NIF 255568789), com sede em
        Rua Dr. Justino de Carvalho 4, Samouco.
      </p>

      <h2>2. Aceitação</h2>
      <p>
        Ao criar conta ou utilizar a aplicação, o utilizador aceita estes termos e a{' '}
        <Link href="/privacidade">Política de Privacidade</Link>. Se não concordar, não deve utilizar o serviço.
      </p>

      <h2>3. Conta</h2>
      <p>
        O utilizador deve fornecer informação verdadeira e mantê-la atualizada, é responsável pela confidencialidade
        da palavra-passe e por toda a atividade na sua conta, e deve ter pelo menos 18 anos.
      </p>

      <h2>4. Funcionamento do serviço</h2>
      <p>
        Os pedidos são efetuados pela aplicação ou pelo site, com morada, descrição e agendamento. É devida uma{' '}
        <strong>taxa de deslocação</strong> para o técnico se deslocar ao local; o <strong>orçamento do trabalho</strong>{' '}
        é apresentado após avaliação no local, sendo o serviço executado apenas após aprovação. Os preços incluem
        IVA à taxa legal em vigor, salvo indicação em contrário.
      </p>

      <h2>5. Pagamentos</h2>
      <p>
        Os pagamentos são processados de forma segura através da Stripe. Ao confirmar um pagamento, o utilizador
        autoriza a cobrança do valor indicado. A faturação é emitida com os dados fiscais fornecidos pelo
        utilizador.
      </p>

      <h2>6. Cancelamentos e reembolsos</h2>
      <p>
        O cliente pode cancelar um pedido antes da confirmação/deslocação do técnico, nas condições indicadas na
        aplicação. Cancelamentos após o técnico estar a caminho ou no local podem implicar a cobrança da taxa de
        deslocação. Os pedidos de reembolso são avaliados caso a caso, sem prejuízo dos direitos do consumidor
        previstos na lei.
      </p>

      <h2>7. Subscrições (Plano Premium)</h2>
      <p>
        Quando disponível, a subscrição confere benefícios (ex.: desconto na deslocação, visitas gratuitas,
        prioridade), nas condições descritas na aplicação, podendo ser cancelada nos termos aí indicados.
      </p>

      <h2>8. Obrigações do utilizador</h2>
      <p>
        O utilizador compromete-se a não fornecer informação falsa, usar o serviço para fins ilícitos, interferir
        com o funcionamento da plataforma, ou desrespeitar os técnicos e restantes utilizadores.
      </p>

      <h2>9. Avaliações e conteúdos</h2>
      <p>
        As avaliações devem ser honestas e respeitosas. Reservamo-nos o direito de remover conteúdos ofensivos,
        falsos ou que violem direitos de terceiros.
      </p>

      <h2>10. Responsabilidade</h2>
      <p>
        A ResolvaAgora atua como intermediária entre clientes e técnicos e envida os melhores esforços para
        garantir a qualidade do serviço. Não nos responsabilizamos por danos indiretos resultantes do uso da
        aplicação, salvo nos limites impostos pela lei. Nada nestes termos exclui responsabilidades que não possam
        ser legalmente excluídas.
      </p>

      <h2>11. Propriedade intelectual</h2>
      <p>
        A aplicação, o site, a marca, o logótipo e os conteúdos são propriedade da ResolvaAgora / Per4manceMD e não
        podem ser usados sem autorização.
      </p>

      <h2>12. Suspensão e cessação</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes termos ou a lei. O utilizador pode eliminar a sua
        conta a qualquer momento.
      </p>

      <h2>13. Resolução de litígios</h2>
      <p>
        Em caso de litígio de consumo, o utilizador pode recorrer às entidades de resolução alternativa de
        litígios (RAL) competentes em Portugal. Estes termos regem-se pela lei portuguesa, sendo competentes os
        tribunais da comarca de Lisboa.
      </p>

      <p className="mt-8 rounded-xl border-l-4 border-accent-500 bg-accent-50 p-4 text-sm">
        <strong>Contacto:</strong> Douglas Miranda – Per4manceMD · Rua Dr. Justino de Carvalho 4, Samouco ·{' '}
        <a href="mailto:suporte@resolvaagora.pt">suporte@resolvaagora.pt</a>
      </p>
    </LegalPage>
  )
}
