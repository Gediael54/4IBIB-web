import { Copy, MessageCircle } from "lucide-react";
import { buildWhatsAppShareUrl, copyMessageToClipboard } from "../lib/whatsapp-share";
import { useToast } from "./Toast";

interface WhatsAppShareButtonProps {
  message: string;
  label?: string;
  size?: "sm" | "md";
}

export default function WhatsAppShareButton({
  message,
  label = "Avisar grupo",
  size = "md"
}: WhatsAppShareButtonProps) {
  const { toast } = useToast();
  const url = buildWhatsAppShareUrl(message);
  const sizeClass = size === "sm" ? "whatsapp-share-sm" : "";

  async function handleCopy() {
    const ok = await copyMessageToClipboard(message);
    toast(ok ? "Mensagem copiada." : "Nao consegui copiar — copia o texto manualmente.", {
      variant: ok ? "success" : "danger"
    });
  }

  return (
    <div className={`whatsapp-share ${sizeClass}`.trim()}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="button whatsapp-share-action"
        aria-label={`${label} no WhatsApp`}
      >
        <MessageCircle size={16} aria-hidden="true" />
        <span>{label}</span>
      </a>
      <button type="button" className="button ghost" onClick={handleCopy} aria-label="Copiar mensagem">
        <Copy size={16} aria-hidden="true" />
        <span>Copiar</span>
      </button>
    </div>
  );
}
