import type { Metadata } from 'next'
import { LegalPage } from '../_components/legal-page'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como a ResolvaAgora recolhe, usa e protege os seus dados pessoais, em conformidade com o RGPD.',
  alternates: { canonical: '/privacidade' },
}

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updated="4 de julho de 2026">
      <p>
        <strong>Responsável pelo tratamento:</strong> Douglas Miranda – Per4manceMD, NIF 255568789, com sede em Rua
        Dr. Justino de Carvalho 4, Samouco. Contacto: <a href="mailto:suporte@resolvaagora.pt">suporte@resolvaagora.pt</a>.
      </p>

      <h2>1. Introdução</h2>
      <p>
        A ResolvaAgora (&quot;nós&quot;) explica nesta política como recolhemos, usamos e protegemos os seus dados
        pessoais quando utiliza a nossa aplicação, o nosso site e os nossos serviços de assistência técnica ao
        domicílio. Cumprimos o Regulamento Geral sobre a Proteção de Dados (RGPD — Regulamento (UE) 2016/679) e a
        legislação portuguesa aplicável.
      </p>

      <h2>2. Que dados recolhemos</h2>
      <ul>
        <li><strong>Dados de conta:</strong> nome, apelido, email, número de telefone e palavra-passe (guardada encriptada — nunca em texto simples).</li>
        <li><strong>Moradas de serviço:</strong> rua, número, andar, código postal, localidade e distrito.</li>
        <li><strong>Localização:</strong> com a sua autorização, a localização do dispositivo para indicar a morada e apoiar a deslocação do técnico.</li>
        <li><strong>Pedidos de serviço:</strong> tipo de serviço, descrição do problema, datas e fotografias que anexe.</li>
        <li><strong>Pagamentos:</strong> processados diretamente pela Stripe; <strong>não</strong> guardamos o número do cartão — apenas o estado e o valor da transação, e o NIF quando indicado para faturação.</li>
        <li><strong>Comunicações:</strong> mensagens de suporte e avaliações que deixe.</li>
        <li><strong>Cookies e dados técnicos:</strong> ver a nossa <a href="/cookies">Política de Cookies</a> para detalhe sobre o que é usado no site.</li>
      </ul>

      <h2>3. Para que usamos os dados (finalidades e base legal)</h2>
      <table>
        <tbody>
          <tr><th>Finalidade</th><th>Base legal (RGPD)</th></tr>
          <tr><td>Criar e gerir a conta</td><td>Execução do contrato (art. 6.º/1-b)</td></tr>
          <tr><td>Processar e acompanhar pedidos</td><td>Execução do contrato</td></tr>
          <tr><td>Processar pagamentos</td><td>Execução do contrato</td></tr>
          <tr><td>Notificações sobre pedidos</td><td>Execução do contrato / interesse legítimo</td></tr>
          <tr><td>Suporte ao cliente</td><td>Execução do contrato</td></tr>
          <tr><td>Prevenção de fraude e segurança</td><td>Interesse legítimo (art. 6.º/1-f)</td></tr>
          <tr><td>Obrigações legais e fiscais</td><td>Obrigação legal (art. 6.º/1-c)</td></tr>
          <tr><td>Cookies analíticos e de marketing</td><td>Consentimento (art. 6.º/1-a)</td></tr>
        </tbody>
      </table>

      <h2>4. Com quem partilhamos</h2>
      <p>
        Não vendemos os seus dados. Partilhamos apenas com quem é necessário: <strong>técnicos</strong> afetos ao
        pedido (nome, contacto e morada do serviço); <strong>Stripe</strong> (pagamentos); <strong>fornecedores de
        infraestrutura</strong> (alojamento, base de dados, email e notificações), como subcontratantes sob
        obrigações de confidencialidade; e <strong>autoridades</strong>, quando legalmente exigido.
      </p>

      <h2>5. Transferências internacionais</h2>
      <p>
        Alguns fornecedores (ex.: Stripe, notificações) podem processar dados fora do Espaço Económico Europeu,
        sempre com salvaguardas adequadas (ex.: Cláusulas Contratuais-Tipo da Comissão Europeia).
      </p>

      <h2>6. Durante quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa e pelo período necessário ao cumprimento de obrigações
        legais (ex.: dados de faturação, tipicamente 10 anos por lei fiscal portuguesa). Depois, são eliminados ou
        anonimizados.
      </p>

      <h2>7. Os seus direitos</h2>
      <p>
        Tem direito a aceder, corrigir, eliminar, limitar ou opor-se ao tratamento, e à portabilidade dos dados.
        Pode retirar o consentimento a qualquer momento. Para exercer estes direitos, contacte{' '}
        <a href="mailto:suporte@resolvaagora.pt">suporte@resolvaagora.pt</a>. Pode ainda reclamar junto da{' '}
        <strong>CNPD</strong> (<a href="https://www.cnpd.pt" target="_blank" rel="noreferrer">www.cnpd.pt</a>).
      </p>

      <h2>8. Segurança</h2>
      <p>
        Aplicamos medidas técnicas e organizativas: encriptação de palavras-passe, tokens de sessão, comunicação
        por HTTPS, controlo de acessos por perfil e limitação de tentativas de início de sessão.
      </p>

      <h2>9. Menores</h2>
      <p>A aplicação destina-se a maiores de 18 anos. Não recolhemos intencionalmente dados de menores.</p>

      <h2>10. Alterações</h2>
      <p>
        Poderemos atualizar esta política. Alterações significativas serão comunicadas na aplicação ou no site. A
        data no topo indica a última revisão.
      </p>

      <p className="mt-8 rounded-xl border-l-4 border-accent-500 bg-accent-50 p-4 text-sm">
        <strong>Contacto:</strong> Douglas Miranda – Per4manceMD · Rua Dr. Justino de Carvalho 4, Samouco ·{' '}
        <a href="mailto:suporte@resolvaagora.pt">suporte@resolvaagora.pt</a>
      </p>
    </LegalPage>
  )
}
