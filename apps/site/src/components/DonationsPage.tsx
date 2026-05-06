import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useChurchProfile } from "../lib/church-context";

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

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Contribuicao</p>
        <h1>Doacoes</h1>
        <p className="page-lead">
          Sua oferta sustenta a obra local: cultos, missoes, evangelismo e cuidado pastoral. Toda contribuicao
          e voluntaria e tratada com transparencia.
        </p>
      </header>

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
          Para entrega presencial de envelopes ou contribuicao recorrente, fale com a tesouraria via WhatsApp{" "}
          {church.whatsapp && (
            <a
              href={`https://wa.me/${church.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {church.whatsapp}
            </a>
          )}
          .
        </p>
      </section>
    </main>
  );
}
