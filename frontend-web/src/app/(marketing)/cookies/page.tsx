import type { Metadata } from 'next'
import { LegalPage } from '../_components/legal-page'
import { CookiePreferencesButton } from './cookie-preferences-button'

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Que cookies e tecnologias semelhantes a ResolvaAgora usa, e como pode gerir as suas preferências.',
  alternates: { canonical: '/cookies' },
}

export default function CookiesPage() {
  return (
    <LegalPage title="Política de Cookies" updated="8 de agosto de 2026">
      <h2>1. O que são cookies</h2>
      <p>
        Cookies são pequenos ficheiros guardados no seu dispositivo quando visita um site, que permitem
        reconhecer o seu browser e guardar informação, como preferências ou o estado de início de sessão. Usamos
        também tecnologias semelhantes (como <em>local storage</em> e <em>session storage</em> do browser) com
        finalidades equivalentes.
      </p>

      <h2>2. Como gerimos o seu consentimento</h2>
      <p>
        Na sua primeira visita, mostramos um aviso onde pode <strong>aceitar tudo</strong>,{' '}
        <strong>rejeitar os cookies não essenciais</strong>, ou <strong>personalizar</strong> a sua escolha por
        categoria. Pode mudar de ideias a qualquer momento, aqui:
      </p>
      <p>
        <CookiePreferencesButton />
      </p>

      <h2>3. Categorias de cookies que usamos</h2>
      <table>
        <tbody>
          <tr><th>Categoria</th><th>Finalidade</th><th>Pode desativar?</th></tr>
          <tr>
            <td><strong>Necessários</strong></td>
            <td>
              Manter a sua sessão iniciada em segurança (autenticação) e guardar o progresso de um pedido de
              serviço em curso (ex.: passos do agendamento) enquanto navega no site.
            </td>
            <td>Não — indispensáveis para o site funcionar.</td>
          </tr>
          <tr>
            <td><strong>Analíticos</strong></td>
            <td>
              Ajudam-nos a perceber como o site é usado (páginas visitadas, erros), para o melhorarmos. Só são
              ativados com o seu consentimento.
            </td>
            <td>Sim, a qualquer momento.</td>
          </tr>
          <tr>
            <td><strong>Marketing</strong></td>
            <td>
              Usados para medir a eficácia de campanhas e mostrar comunicações mais relevantes. Só são ativados
              com o seu consentimento.
            </td>
            <td>Sim, a qualquer momento.</td>
          </tr>
        </tbody>
      </table>
      <p>
        Atualmente não usamos cookies de publicidade de terceiros. Se isso mudar, esta política e o aviso de
        consentimento serão atualizados antes de qualquer novo cookie ser ativado.
      </p>

      <h2>4. Cookies e armazenamento que pode encontrar</h2>
      <ul>
        <li><strong>Sessão (necessário):</strong> identifica a sua sessão de utilizador autenticado, definido pelo NextAuth ao iniciar sessão.</li>
        <li><strong>Segurança/CSRF (necessário):</strong> protege formulários (como o login) contra pedidos maliciosos.</li>
        <li><strong>Preferência de cookies (necessário):</strong> guarda a sua escolha neste aviso, para não voltar a perguntar em cada visita.</li>
        <li><strong>Progresso da reserva (necessário):</strong> guarda os passos já preenchidos ao criar um pedido de serviço, para não os perder ao navegar entre páginas.</li>
      </ul>

      <h2>5. Como controlar cookies no seu browser</h2>
      <p>
        Além das nossas preferências, pode bloquear ou eliminar cookies diretamente nas definições do seu browser.
        Note que bloquear cookies necessários pode impedir o funcionamento correto do site, nomeadamente o início
        de sessão.
      </p>

      <h2>6. Mais informação</h2>
      <p>
        Para saber como tratamos os seus dados pessoais de um modo geral, consulte a nossa{' '}
        <a href="/privacidade">Política de Privacidade</a>. Para dúvidas, contacte{' '}
        <a href="mailto:suporte@resolvaagora.pt">suporte@resolvaagora.pt</a>.
      </p>
    </LegalPage>
  )
}
