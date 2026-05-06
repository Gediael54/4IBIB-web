import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useChurchProfile } from "../lib/church-context";
import { safeUrl } from "../lib/safe-url";
import PageShell from "./PageShell";

const PIX_KEY = "46.882.520/0001-76";

export default function DonationsPage() {
  const church = useChurchProfile();
  const [copied, setCopied] = useState(false);

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // ignore — usuario pode copiar manualmente
    }
  }

  const whatsappHref = church.whatsapp ? safeUrl(`https://wa.me/${church.whatsapp.replace(/\D/g, "")}`) : "";

  return (
    <PageShell
      eyebrow="Contribuição"
      title="Doações"
      lead="Sua oferta sustenta a obra local: cultos, missões, evangelismo e cuidado pastoral. Toda contribuição é voluntária e tratada com transparência."
      breadcrumb={[
        { href: "#inicio", label: "Início" },
        { href: "#doacoes", label: "Doações" }
      ]}
    >
      <section className="page-section">
        <h2>PIX da igreja</h2>
        <p>
          Use a chave abaixo no app do seu banco. Identifique o pagador como{" "}
          <strong>{church.shortName}</strong> ao buscar pelo CNPJ.
        </p>
        <div className="pix-card">
          <p className="pix-label">Chave PIX (CNPJ)</p>
          <p className="pix-key">{PIX_KEY}</p>
          <button type="button" className="button primary" onClick={copyPix}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copiado" : "Copiar chave"}
          </button>
        </div>
      </section>

      <section className="page-section">
        <h2>Outras formas</h2>
        <p>
          Para entrega presencial de envelopes ou contribuição recorrente, fale com a tesouraria via WhatsApp{" "}
          {church.whatsapp && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              {church.whatsapp}
            </a>
          )}
          .
        </p>
      </section>
    </PageShell>
  );
}
