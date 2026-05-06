import PageShell from "./PageShell";

interface CardItem {
  title: string;
  body: string;
}

const CARDS: CardItem[] = [
  {
    title: "O que esperar?",
    body: "Cultos com canto congregacional, oração, leitura bíblica e pregação centrada em Cristo. Duração típica de 90 minutos."
  },
  {
    title: "Como me visto?",
    body: "Como se sentir à vontade. Não há código de vestimenta — venha como você é."
  },
  {
    title: "E para crianças?",
    body: "Crianças são bem-vindas no culto solene. Aos domingos pela manhã temos escola bíblica organizada por faixa etária."
  },
  {
    title: "Onde estacionar?",
    body: "Vagas no entorno do templo. Em cultos cheios, recomendamos chegar 15 minutos antes."
  },
  {
    title: "Como participo mais?",
    body: "Procure um pastor ou líder após o culto. Você pode também mandar um pedido de oração ou mensagem pelo WhatsApp."
  }
];

export default function FirstTimePage() {
  return (
    <PageShell
      eyebrow="Quem somos"
      title="Primeira vez aqui?"
      lead="Que alegria receber você. Reunimos abaixo as dúvidas mais comuns de quem nos visita."
      breadcrumb={[
        { href: "#inicio", label: "Início" },
        { href: "#quem-somos", label: "Quem somos" },
        { href: "#primeira-vez", label: "Primeira vez aqui" }
      ]}
    >
      <section className="page-section">
        <div className="first-time-grid">
          {CARDS.map((card) => (
            <article className="first-time-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
