import { buildWhatsAppForContact, formatDateTime, type PrayerRequest } from "@4ibib/core";
import { MessageCircle, Save } from "lucide-react";
import { useState } from "react";
import DetailSheet from "../../components/Layout/DetailSheet";
import { TextAreaField } from "../../components/ui";
import { TEXTAREA_MAX } from "../../lib/limits";
import { PRAYER_STATUS_SHORT_LABEL } from "./columns";

interface PrayerDetailSheetProps {
  request: PrayerRequest | null;
  onClose: () => void;
  onSaveNotes: (id: string, notes: string) => void;
  saving: boolean;
}

const WHATSAPP_DEFAULT_MESSAGE = "Ola, recebemos seu pedido de oracao na 4a Betel. Estamos orando por voce.";

export default function PrayerDetailSheet(props: PrayerDetailSheetProps) {
  if (!props.request) {
    return (
      <DetailSheet open={false} title="" onClose={props.onClose}>
        {null}
      </DetailSheet>
    );
  }
  return <PrayerDetailSheetInner key={props.request.id} {...props} request={props.request} />;
}

function PrayerDetailSheetInner({
  request,
  onClose,
  onSaveNotes,
  saving
}: PrayerDetailSheetProps & { request: PrayerRequest }) {
  const [notes, setNotes] = useState(request.pastoralNotes ?? "");

  const displayName = request.name?.trim() ? request.name.trim() : "Anônimo";
  const whatsappUrl = request.contact
    ? buildWhatsAppForContact(request.contact, WHATSAPP_DEFAULT_MESSAGE)
    : null;
  const dirty = notes !== request.pastoralNotes;

  return (
    <DetailSheet
      open={true}
      title={displayName}
      subtitle={`Recebido em ${formatDateTime(request.createdAt)}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button ghost" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!dirty || saving}
            onClick={() => onSaveNotes(request.id, notes)}
          >
            <Save size={16} aria-hidden="true" /> Salvar notas
          </button>
        </>
      }
    >
      <dl className="prayer-detail-meta">
        <div>
          <dt>Status</dt>
          <dd>{PRAYER_STATUS_SHORT_LABEL[request.status]}</dd>
        </div>
        <div>
          <dt>Contato</dt>
          <dd>
            {request.contact || "Sem contato"}
            {whatsappUrl && (
              <a
                className="button ghost prayer-detail-whatsapp"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={14} aria-hidden="true" />
                Enviar mensagem
              </a>
            )}
          </dd>
        </div>
        {request.seenAt && (
          <div>
            <dt>Visto em</dt>
            <dd>{formatDateTime(request.seenAt)}</dd>
          </div>
        )}
      </dl>

      <section className="prayer-detail-message" aria-label="Mensagem do pedido">
        <h3 className="prayer-detail-section-title">Mensagem</h3>
        <p>{request.message}</p>
      </section>

      <section className="prayer-detail-notes">
        <h3 className="prayer-detail-section-title">Notas pastorais (admin)</h3>
        <TextAreaField
          label="Notas pastorais"
          value={notes}
          maxLength={TEXTAREA_MAX}
          onChange={(event) => setNotes(event.currentTarget.value)}
          placeholder="Anote acompanhamento, contato feito, resposta de oracao..."
        />
      </section>
    </DetailSheet>
  );
}
