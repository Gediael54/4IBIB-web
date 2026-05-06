import PageShell from "./PageShell";

export default function ConfessionPage() {
  return (
    <PageShell
      eyebrow="Quem somos"
      title="Confissão de fé"
      lead="Cremos na Bíblia como única regra de fé e prática. Esta página apresenta um sumário das convicções doutrinárias da 4a IBIB."
      breadcrumb={[
        { href: "#inicio", label: "Início" },
        { href: "#quem-somos", label: "Quem somos" },
        { href: "#confissao-de-fe", label: "Confissão de fé" }
      ]}
    >
      <section className="page-section">
        <h2>Em construção</h2>
        <p>
          Estamos finalizando o texto. Em breve você encontrará aqui nossas convicções detalhadas sobre a
          Trindade, Escrituras, salvação pela graça, igreja, batismo, ceia do Senhor e a esperança da volta de
          Cristo.
        </p>
      </section>
    </PageShell>
  );
}
