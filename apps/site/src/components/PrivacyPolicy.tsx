import { ArrowLeft } from "lucide-react";
import { useChurchProfile } from "../lib/church-context";

export const PRIVACY_POLICY_LAST_UPDATED = "2026-05-02";

export default function PrivacyPolicy() {
  const church = useChurchProfile();
  const contactEmail = church.email;

  return (
    <main className="legal-page">
      <a className="skip-link" href="#politica-privacidade">
        Pular para o conteúdo
      </a>
      <header className="legal-page-topbar" aria-label="Navegação da política de privacidade">
        <a className="legal-page-back" href="#inicio">
          <ArrowLeft size={20} aria-hidden="true" />
          <span>Voltar</span>
        </a>
        <nav className="legal-page-crumbs" aria-label="Caminho">
          <span className="legal-page-brand">{church.shortName}</span>
          <span className="legal-page-crumb-sep" aria-hidden="true">
            ›
          </span>
          <span>Política de privacidade</span>
        </nav>
      </header>

      <article className="legal-page-content" id="politica-privacidade">
        <p className="eyebrow">Privacidade e LGPD</p>
        <h1>Política de privacidade</h1>
        <p className="legal-page-lead">
          Esta política descreve como a {church.name} trata os dados pessoais coletados em seu site e
          atividades pastorais, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
        <p className="legal-page-meta">Última atualização: {PRIVACY_POLICY_LAST_UPDATED}</p>

        <section aria-labelledby="quem-somos">
          <h2 id="quem-somos">Quem somos</h2>
          <p>
            A {church.name} (4a IBIB), com sede em {church.address}, {church.city}, é uma comunidade cristã
            batista de perfil reformado. O contato oficial é{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </section>

        <section aria-labelledby="dados-coletados">
          <h2 id="dados-coletados">Dados que coletamos</h2>
          <ul>
            <li>
              <strong>Pedido de oração</strong>: nome informado, contato opcional (WhatsApp ou email) e a
              mensagem do pedido.
            </li>
            <li>
              <strong>Dados técnicos básicos</strong>: endereços IP, agente de navegador e logs mínimos
              coletados pelos provedores de infraestrutura (Cloudflare e Supabase) para segurança, prevenção
              de abuso e estabilidade do serviço.
            </li>
            <li>
              <strong>Sem cookies de rastreamento</strong>: não usamos cookies de marketing, analytics de
              terceiros nem perfis publicitários.
            </li>
          </ul>
        </section>

        <section aria-labelledby="finalidade">
          <h2 id="finalidade">Finalidade do tratamento</h2>
          <ul>
            <li>Atender pedidos de oração com cuidado pastoral.</li>
            <li>Permitir contato pastoral quando solicitado pelo titular.</li>
            <li>Manter registro interno histórico de pedidos para acompanhamento.</li>
            <li>Garantir segurança, integridade e disponibilidade do site.</li>
          </ul>
        </section>

        <section aria-labelledby="base-legal">
          <h2 id="base-legal">Base legal (LGPD)</h2>
          <ul>
            <li>
              <strong>Consentimento</strong> (Art. 7, inciso I): a checkbox marcada no envio do pedido de
              oração autoriza o tratamento dos dados ali informados.
            </li>
            <li>
              <strong>Execução de atividade religiosa</strong> (Art. 7, inciso V e Art. 11, inciso II, alínea
              &quot;a&quot;): tratamento necessário para a finalidade pastoral própria de uma comunidade
              religiosa.
            </li>
            <li>
              <strong>Legítimo interesse</strong> (Art. 7, inciso IX): para registros técnicos mínimos de
              segurança e prevenção de fraude.
            </li>
          </ul>
        </section>

        <section aria-labelledby="retencao">
          <h2 id="retencao">Retenção</h2>
          <p>
            Pedidos de oração concluídos são arquivados e eliminados após 18 meses, salvo expressa solicitação
            do titular para anonimização ou exclusão antecipada. Logs técnicos seguem a política de retenção
            dos provedores de infraestrutura.
          </p>
        </section>

        <section aria-labelledby="direitos">
          <h2 id="direitos">Direitos do titular</h2>
          <p>
            Você tem direito a acessar, corrigir, anonimizar, portar, eliminar seus dados e revogar o
            consentimento. Para exercer qualquer um desses direitos, envie um email para{" "}
            <a href={`mailto:${contactEmail}?subject=Direitos%20do%20titular%20-%20LGPD`}>{contactEmail}</a>{" "}
            com o assunto &quot;Direitos do titular - LGPD&quot;. Veja a página{" "}
            <a href="#meus-dados">Meus dados</a> para mais detalhes.
          </p>
        </section>

        <section aria-labelledby="compartilhamento">
          <h2 id="compartilhamento">Compartilhamento</h2>
          <p>
            Não compartilhamos seus dados com terceiros para fins comerciais. Os dados ficam armazenados em
            provedores de infraestrutura técnica que atuam como operadores:
          </p>
          <ul>
            <li>
              <strong>Cloudflare</strong> (CDN, hospedagem do site e proteção contra abuso).
            </li>
            <li>
              <strong>Supabase</strong> (banco de dados e autenticação do painel administrativo).
            </li>
          </ul>
          <p>
            Esses provedores tratam dados conforme suas próprias políticas de privacidade e contratos de
            operação com a igreja.
          </p>
        </section>

        <section aria-labelledby="seguranca">
          <h2 id="seguranca">Segurança</h2>
          <p>
            Aplicamos controles técnicos como Row Level Security no banco, criptografia em trânsito (HTTPS),
            autenticação para acesso administrativo e validação Cloudflare Turnstile no formulário público de
            pedidos de oração.
          </p>
        </section>

        <section aria-labelledby="dpo">
          <h2 id="dpo">Encarregado pelo tratamento (DPO)</h2>
          <p>
            Para qualquer questão sobre privacidade ou LGPD, entre em contato com a liderança pastoral pelo
            email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </section>

        <section aria-labelledby="alteracoes">
          <h2 id="alteracoes">Alterações nesta política</h2>
          <p>
            Podemos atualizar esta política para refletir mudanças legais ou operacionais. A data de última
            atualização acima indica a versão vigente.
          </p>
        </section>
      </article>
    </main>
  );
}
