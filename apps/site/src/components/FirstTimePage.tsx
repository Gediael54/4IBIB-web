interface CardItem {
  title: string;
  body: string;
}

const CARDS: CardItem[] = [
  {
    title: "O que esperar?",
    body: "Cultos com canto congregacional, oracao, leitura biblica e pregacao centrada em Cristo. Duracao tipica de 90 minutos."
  },
  {
    title: "Como me visto?",
    body: "Como se sentir a vontade. Nao ha codigo de vestimenta — venha como voce e."
  },
  {
    title: "E para criancas?",
    body: "Criancas sao bem-vindas no culto solene. Aos domingos pela manha temos escola biblica organizada por faixa etaria."
  },
  {
    title: "Onde estacionar?",
    body: "Vagas no entorno do templo. Em cultos cheios, recomendamos chegar 15 minutos antes."
  },
  {
    title: "Como participo mais?",
    body: "Procure um pastor ou lider apos o culto. Voce pode tambem mandar um pedido de oracao ou mensagem pelo WhatsApp."
  }
];

export default function FirstTimePage() {
  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Quem somos</p>
        <h1>Primeira vez aqui?</h1>
        <p className="page-lead">
          Que alegria receber voce. Reunimos abaixo as duvidas mais comuns de quem nos visita.
        </p>
      </header>
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
    </main>
  );
}
