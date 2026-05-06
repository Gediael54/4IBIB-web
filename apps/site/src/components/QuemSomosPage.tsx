import { ArrowRight, BookOpen, HeartHandshake, Users } from "lucide-react";

const CARDS = [
  {
    href: "#confissao-de-fe",
    icon: BookOpen,
    title: "Confissao de fe",
    body: "O que cremos sobre a Biblia, Deus, salvacao, igreja e a esperanca em Cristo."
  },
  {
    href: "#lideranca",
    icon: Users,
    title: "Lideranca",
    body: "Conheca pastores, presbiteros e diaconos que servem a congregacao."
  },
  {
    href: "#primeira-vez",
    icon: HeartHandshake,
    title: "Primeira vez aqui?",
    body: "Tudo que voce precisa saber pra visitar nossos cultos pela primeira vez."
  }
];

export default function QuemSomosPage() {
  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Conheca a 4a IBIB</p>
        <h1>Quem somos</h1>
        <p className="page-lead">
          Igreja batista de perfil reformado em Caruaru, Pernambuco. Pertencemos a tradicao historica das
          igrejas de fe e ordem batista.
        </p>
      </header>

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
    </main>
  );
}
