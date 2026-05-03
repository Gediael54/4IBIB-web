import { ArrowLeft, Mail } from "lucide-react";
import { useChurchProfile } from "../lib/church-context";

const REQUEST_SUBJECT = "Direitos do titular - LGPD";
const RESPONSE_DEADLINE_DAYS = 15;

const RIGHTS = [
  {
    key: "acesso",
    title: "Acesso",
    description: "Saber quais dados pessoais a igreja mantem sobre voce."
  },
  {
    key: "correcao",
    title: "Correcao",
    description: "Solicitar correcao de dados incompletos, inexatos ou desatualizados."
  },
  {
    key: "anonimizacao",
    title: "Anonimizacao ou bloqueio",
    description: "Pedir anonimizacao, bloqueio ou eliminacao de dados desnecessarios ou excessivos."
  },
  {
    key: "portabilidade",
    title: "Portabilidade",
    description: "Receber seus dados em formato estruturado e interoperavel."
  },
  {
    key: "eliminacao",
    title: "Eliminacao",
    description: "Eliminar dados tratados com base no seu consentimento."
  },
  {
    key: "revogacao",
    title: "Revogacao do consentimento",
    description: "Retirar o consentimento dado para tratamentos especificos."
  }
];

export default function UserDataRequest() {
  const church = useChurchProfile();
  const contactEmail = church.email;
  const mailtoHref = `mailto:${contactEmail}?subject=${encodeURIComponent(REQUEST_SUBJECT)}`;

  return (
    <main className="legal-page">
      <a className="skip-link" href="#meus-dados">
        Pular para o conteudo
      </a>
      <header className="legal-page-topbar" aria-label="Navegacao da pagina meus dados">
        <a className="legal-page-back" href="#inicio">
          <ArrowLeft size={20} aria-hidden="true" />
          <span>Voltar</span>
        </a>
        <nav className="legal-page-crumbs" aria-label="Caminho">
          <span className="legal-page-brand">{church.shortName}</span>
          <span className="legal-page-crumb-sep" aria-hidden="true">
            ›
          </span>
          <span>Meus dados</span>
        </nav>
      </header>

      <article className="legal-page-content" id="meus-dados">
        <p className="eyebrow">Direitos do titular</p>
        <h1>Meus dados</h1>
        <p className="legal-page-lead">
          Voce pode solicitar, a qualquer momento, acesso, correcao ou exclusao dos dados que a {church.name}{" "}
          mantem sobre voce.
        </p>

        <section aria-labelledby="como-solicitar">
          <h2 id="como-solicitar">Como solicitar</h2>
          <p>
            Envie um email para{" "}
            <a href={mailtoHref} className="legal-page-mail">
              <Mail size={16} aria-hidden="true" /> {contactEmail}
            </a>{" "}
            com o assunto <strong>&quot;{REQUEST_SUBJECT}&quot;</strong>. Inclua seu nome completo, descreva
            qual direito deseja exercer e, se possivel, anexe informacoes que facilitem a identificacao do
            pedido (data aproximada, contato usado, etc.).
          </p>
          <p>
            Respondemos em ate <strong>{RESPONSE_DEADLINE_DAYS} dias uteis</strong>. Pedidos que envolvam
            terceiros ou registros antigos podem demandar prazo adicional, sempre comunicado ao titular.
          </p>
        </section>

        <section aria-labelledby="seus-direitos">
          <h2 id="seus-direitos">Seus direitos</h2>
          <ul className="legal-page-rights">
            {RIGHTS.map((right) => (
              <li key={right.key}>
                <strong>{right.title}.</strong> {right.description}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="observacoes">
          <h2 id="observacoes">Observacoes</h2>
          <p>
            Para detalhes completos sobre como tratamos seus dados, finalidades e bases legais, consulte a{" "}
            <a href="#politica-privacidade">politica de privacidade</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
