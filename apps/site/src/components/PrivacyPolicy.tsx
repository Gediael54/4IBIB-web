import { ArrowLeft } from "lucide-react";
import { useChurchProfile } from "../lib/church-context";

export const PRIVACY_POLICY_LAST_UPDATED = "2026-05-02";

export default function PrivacyPolicy() {
  const church = useChurchProfile();
  const contactEmail = church.email;

  return (
    <main className="legal-page">
      <a className="skip-link" href="#politica-privacidade">
        Pular para o conteudo
      </a>
      <header className="legal-page-topbar" aria-label="Navegacao da politica de privacidade">
        <a className="legal-page-back" href="#inicio">
          <ArrowLeft size={20} aria-hidden="true" />
          <span>Voltar</span>
        </a>
        <nav className="legal-page-crumbs" aria-label="Caminho">
          <span className="legal-page-brand">{church.shortName}</span>
          <span className="legal-page-crumb-sep" aria-hidden="true">
            ›
          </span>
          <span>Politica de privacidade</span>
        </nav>
      </header>

      <article className="legal-page-content" id="politica-privacidade">
        <p className="eyebrow">Privacidade e LGPD</p>
        <h1>Politica de privacidade</h1>
        <p className="legal-page-lead">
          Esta politica descreve como a {church.name} trata os dados pessoais coletados em seu site e
          atividades pastorais, em conformidade com a Lei Geral de Protecao de Dados (Lei 13.709/2018).
        </p>
        <p className="legal-page-meta">Ultima atualizacao: {PRIVACY_POLICY_LAST_UPDATED}</p>

        <section aria-labelledby="quem-somos">
          <h2 id="quem-somos">Quem somos</h2>
          <p>
            A {church.name} (4a IBIB), com sede em {church.address}, {church.city}, e uma comunidade crista
            batista de perfil reformado. O contato oficial e{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </section>

        <section aria-labelledby="dados-coletados">
          <h2 id="dados-coletados">Dados que coletamos</h2>
          <ul>
            <li>
              <strong>Pedido de oracao</strong>: nome informado, contato opcional (WhatsApp ou email) e a
              mensagem do pedido.
            </li>
            <li>
              <strong>Dados tecnicos basicos</strong>: enderecos IP, agente de navegador e logs minimos
              coletados pelos provedores de infraestrutura (Cloudflare e Supabase) para seguranca, prevencao
              de abuso e estabilidade do servico.
            </li>
            <li>
              <strong>Sem cookies de rastreamento</strong>: nao usamos cookies de marketing, analytics de
              terceiros nem perfis publicitarios.
            </li>
          </ul>
        </section>

        <section aria-labelledby="finalidade">
          <h2 id="finalidade">Finalidade do tratamento</h2>
          <ul>
            <li>Atender pedidos de oracao com cuidado pastoral.</li>
            <li>Permitir contato pastoral quando solicitado pelo titular.</li>
            <li>Manter registro interno historico de pedidos para acompanhamento.</li>
            <li>Garantir seguranca, integridade e disponibilidade do site.</li>
          </ul>
        </section>

        <section aria-labelledby="base-legal">
          <h2 id="base-legal">Base legal (LGPD)</h2>
          <ul>
            <li>
              <strong>Consentimento</strong> (Art. 7, inciso I): a checkbox marcada no envio do pedido de
              oracao autoriza o tratamento dos dados ali informados.
            </li>
            <li>
              <strong>Execucao de atividade religiosa</strong> (Art. 7, inciso V e Art. 11, inciso II, alinea
              &quot;a&quot;): tratamento necessario para a finalidade pastoral propria de uma comunidade
              religiosa.
            </li>
            <li>
              <strong>Legitimo interesse</strong> (Art. 7, inciso IX): para registros tecnicos minimos de
              seguranca e prevencao de fraude.
            </li>
          </ul>
        </section>

        <section aria-labelledby="retencao">
          <h2 id="retencao">Retencao</h2>
          <p>
            Pedidos de oracao concluidos sao arquivados e eliminados apos 18 meses, salvo expressa solicitacao
            do titular para anonimizacao ou exclusao antecipada. Logs tecnicos seguem a politica de retencao
            dos provedores de infraestrutura.
          </p>
        </section>

        <section aria-labelledby="direitos">
          <h2 id="direitos">Direitos do titular</h2>
          <p>
            Voce tem direito a acessar, corrigir, anonimizar, portar, eliminar seus dados e revogar o
            consentimento. Para exercer qualquer um desses direitos, envie um email para{" "}
            <a href={`mailto:${contactEmail}?subject=Direitos%20do%20titular%20-%20LGPD`}>{contactEmail}</a>{" "}
            com o assunto &quot;Direitos do titular - LGPD&quot;. Veja a pagina{" "}
            <a href="#meus-dados">Meus dados</a> para mais detalhes.
          </p>
        </section>

        <section aria-labelledby="compartilhamento">
          <h2 id="compartilhamento">Compartilhamento</h2>
          <p>
            Nao compartilhamos seus dados com terceiros para fins comerciais. Os dados ficam armazenados em
            provedores de infraestrutura tecnica que atuam como operadores:
          </p>
          <ul>
            <li>
              <strong>Cloudflare</strong> (CDN, hospedagem do site e protecao contra abuso).
            </li>
            <li>
              <strong>Supabase</strong> (banco de dados e autenticacao do painel administrativo).
            </li>
          </ul>
          <p>
            Esses provedores tratam dados conforme suas proprias politicas de privacidade e contratos de
            operacao com a igreja.
          </p>
        </section>

        <section aria-labelledby="seguranca">
          <h2 id="seguranca">Seguranca</h2>
          <p>
            Aplicamos controles tecnicos como Row Level Security no banco, criptografia em transito (HTTPS),
            autenticacao para acesso administrativo e validacao Cloudflare Turnstile no formulario publico de
            pedidos de oracao.
          </p>
        </section>

        <section aria-labelledby="dpo">
          <h2 id="dpo">Encarregado pelo tratamento (DPO)</h2>
          <p>
            Para qualquer questao sobre privacidade ou LGPD, entre em contato com a lideranca pastoral pelo
            email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </section>

        <section aria-labelledby="alteracoes">
          <h2 id="alteracoes">Alteracoes nesta politica</h2>
          <p>
            Podemos atualizar esta politica para refletir mudancas legais ou operacionais. A data de ultima
            atualizacao acima indica a versao vigente.
          </p>
        </section>
      </article>
    </main>
  );
}
