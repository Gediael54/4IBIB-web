import { useState } from "react";
import type { ScheduleItem } from "@4ibib/core";
import { formatInputDateTime, inputDateTimeToIso } from "@4ibib/core";
import Modal from "../Modal";
import WhatsAppShareButton from "../WhatsAppShareButton";
import { buildScheduleRescheduledMessage } from "../../lib/whatsapp-share";

interface RescheduleDialogProps {
  item: ScheduleItem | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (next: { startsAt: string; endsAt: string; reason: string }) => Promise<void> | void;
}

export default function RescheduleDialog(props: RescheduleDialogProps) {
  if (!props.item) return null;
  return <RescheduleDialogInner key={props.item.id} {...props} item={props.item} />;
}

function RescheduleDialogInner({
  item,
  saving,
  onClose,
  onConfirm
}: RescheduleDialogProps & { item: ScheduleItem }) {
  const [startsAt, setStartsAt] = useState(formatInputDateTime(item.startsAt));
  const [endsAt, setEndsAt] = useState(formatInputDateTime(item.endsAt));
  const [reason, setReason] = useState("");

  async function handleConfirm() {
    await onConfirm({
      startsAt: inputDateTimeToIso(startsAt),
      endsAt: inputDateTimeToIso(endsAt),
      reason
    });
  }

  const previewItem: ScheduleItem = {
    ...item,
    startsAt: startsAt ? inputDateTimeToIso(startsAt) : item.startsAt,
    endsAt: endsAt ? inputDateTimeToIso(endsAt) : item.endsAt
  };
  const message = buildScheduleRescheduledMessage(previewItem, item.startsAt, reason);

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Remarcar "${item.title}"?`}
      size="sm"
      footer={
        <>
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="button primary" onClick={handleConfirm} disabled={saving}>
            {saving ? "Salvando..." : "Remarcar"}
          </button>
        </>
      }
    >
      <div className="reschedule-fields">
        <label>
          <span className="field-label">Nova data e hora de inicio</span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            required
          />
        </label>
        <label>
          <span className="field-label">Nova data e hora de termino</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            required
          />
        </label>
        <label>
          <span className="field-label">Motivo (opcional)</span>
          <textarea
            rows={2}
            maxLength={300}
            placeholder="Ex.: pregadora ficou doente"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </div>
      <div className="suspend-preview">
        <p className="field-label">Mensagem que vai ser enviada:</p>
        <pre className="suspend-preview-text">{message}</pre>
      </div>
      <WhatsAppShareButton message={message} label="Avisar grupo agora" />
    </Modal>
  );
}
