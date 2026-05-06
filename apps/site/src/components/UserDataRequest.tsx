import { ArrowLeft, Mail } from "lucide-react";
import { useChurchProfile } from "../lib/church-context";

const REQUEST_SUBJECT = "Direitos do titular - LGPD";
const RESPONSE_DEADLINE_DAYS = 15;

const RIGHTS = [
  {
    key: "acesso",
    title: "Acesso",
    description: "Saber quais dados pessoais a igreja mantém sobre você."
  },
  {
    key: "correcao",
    title: "Correção",
    description: "Solicitar correção de dados incompletos, inexatos ou desatualizados."
  },
  {
    key: "anonimizacao",
    title: "Anonimização ou bloqueio",
    description: "Pedir anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos."
  },
  {
    key: "portabilidade",
    title: "Portabilidade",
    description: "Receber seus dados em formato estruturado e interoperável."
  },
  {
    key: "eliminacao",
    title: "Eliminação",
    description: "Eliminar dados tratados com base no seu consentimento."
  },
  {
    key: "revogacao",
    title: "Revogação do consentimento",
    description: "Retirar o consentimento dado para tratamentos específicos."
  }
];

export default function UserDataRequest() {
  const church = useChurchProfile();
  const contactEmail = church.email;
  const mailtoHref = `mailto:${contactEmail}?subject=${encodeURIComponent(REQUEST_SUBJECT)}`;

  return (
    <main className="legal-page">
      <a className="skip-link" href="#meus-dados">
        Pular para o conteúdo
      </a>
      <header className="legal-page-topbar" aria-label="Navegação da página meus dados">
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
          Você pode solicitar, a qualquer momento, acesso, correção ou exclusão dos dados que a {church.name}{" "}
          mantém sobre você.
        </p>

        <section aria-labelledby="como-solicitar">
          <h2 id="como-solicitar">Como solicitar</h2>
          <p>
            Envie um email para{" "}
            <a href={mailtoHref} className="legal-page-mail">
              <Mail size={16} aria-hidden="true" /> {contactEmail}
            </a>{" "}
            com o assunto <strong>&quot;{REQUEST_SUBJECT}&quot;</strong>. Inclua seu nome completo, descreva
            qual direito deseja exercer e, se possível, anexe informações que facilitem a identificação do
            pedido (data aproximada, contato usado, etc.).
          </p>
          <p>
            Respondemos em até <strong>{RESPONSE_DEADLINE_DAYS} dias úteis</strong>. Pedidos que envolvam
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
          <h2 id="observacoes">Observações</h2>
          <p>
            Para detalhes completos sobre como tratamos seus dados, finalidades e bases legais, consulte a{" "}
            <a href="#politica-privacidade">política de privacidade</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
