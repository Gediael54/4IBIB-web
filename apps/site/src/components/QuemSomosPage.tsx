import { ArrowRight, BookOpen, HeartHandshake, Users } from "lucide-react";
import PageShell from "./PageShell";

const CARDS = [
  {
    href: "#confissao-de-fe",
    icon: BookOpen,
    title: "Confissão de fé",
    body: "O que cremos sobre a Bíblia, Deus, salvação, igreja e a esperança em Cristo."
  },
  {
    href: "#lideranca",
    icon: Users,
    title: "Liderança",
    body: "Conheça pastores, presbíteros e diáconos que servem a congregação."
  },
  {
    href: "#primeira-vez",
    icon: HeartHandshake,
    title: "Primeira vez aqui?",
    body: "Tudo que você precisa saber pra visitar nossos cultos pela primeira vez."
  }
];

export default function QuemSomosPage() {
  return (
    <PageShell
      eyebrow="Conheça a 4a IBIB"
      title="Quem somos"
      lead="Igreja batista de perfil reformado em Caruaru, Pernambuco. Pertencemos à tradição histórica das igrejas de fé e ordem batista."
      breadcrumb={[
        { href: "#inicio", label: "Início" },
        { href: "#quem-somos", label: "Quem somos" }
      ]}
    >
      <section className="page-section">
        <div className="quemsomos-grid">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <a key={card.href} href={card.href} className="quemsomos-card">
                <Icon size={28} aria-hidden="true" />
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <span className="quemsomos-arrow">
                  Saiba mais <ArrowRight size={16} aria-hidden="true" />
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
