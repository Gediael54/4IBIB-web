import { useState } from "react";
import type { ScheduleItem } from "@4ibib/core";
import Modal from "../Modal";
import WhatsAppShareButton from "../WhatsAppShareButton";
import { buildScheduleSuspendedMessage } from "../../lib/whatsapp-share";

interface SuspendScheduleDialogProps {
  item: ScheduleItem | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

export default function SuspendScheduleDialog({
  item,
  saving,
  onClose,
  onConfirm
}: SuspendScheduleDialogProps) {
  const [reason, setReason] = useState("");

  if (!item) return null;

  async function handleConfirm() {
    if (!item) return;
    await onConfirm(reason);
  }

  const message = buildScheduleSuspendedMessage(item, reason);

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Suspender "${item.title}"?`}
      size="sm"
      footer={
        <>
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="button danger" onClick={handleConfirm} disabled={saving}>
            {saving ? "Suspendendo..." : "Suspender"}
          </button>
        </>
      }
    >
      <p className="muted">
        O evento ficará marcado como SUSPENSO no site. Você pode avisar a igreja agora pelo WhatsApp.
      </p>
      <label className="suspend-reason">
        <span className="field-label">Motivo (opcional)</span>
        <textarea
          rows={3}
          maxLength={300}
          placeholder="Ex.: pregadora ficou doente, dia das maes, etc."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <div className="suspend-preview">
        <p className="field-label">Mensagem que vai ser enviada:</p>
        <pre className="suspend-preview-text">{message}</pre>
      </div>
      <WhatsAppShareButton message={message} label="Avisar grupo agora" />
    </Modal>
  );
}
