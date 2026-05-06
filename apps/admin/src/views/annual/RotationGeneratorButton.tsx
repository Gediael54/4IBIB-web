import { generateScheduleAssignments, type ScheduleItem } from "@4ibib/core";
import { Wand2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "../../components/Toast";
import { useMembers } from "../../hooks";
import type { PendingState, RoleColumn } from "./cadence";

interface RotationGeneratorButtonProps {
  yearItems: ScheduleItem[];
  rotationRules: import("@4ibib/core").RotationRule[];
  pending: Map<string, PendingState>;
  setPendingForCell: (itemId: string, role: RoleColumn, value: string) => void;
}

const RULE_ROLE_TO_COLUMN: Record<"preacher" | "director" | "sound", RoleColumn> = {
  preacher: "preacher",
  director: "director",
  sound: "soundTeam"
};

export default function RotationGeneratorButton({
  yearItems,
  rotationRules,
  pending,
  setPendingForCell
}: RotationGeneratorButtonProps) {
  const [running, setRunning] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const { toast } = useToast();
  const membersQuery = useMembers();

  const ready = !membersQuery.isPending && rotationRules.length > 0 && yearItems.length > 0;

  function applyResult() {
    const members = (membersQuery.data ?? []).map((member) => ({
      id: member.id,
      name: member.fullName,
      unavailableIsoDates: member.volunteerUnavailableDates ?? []
    }));

    const merged: ScheduleItem[] = yearItems.map((item) => {
      const patch = pending.get(item.id);
      if (!patch) return item;
      return {
        ...item,
        preacher: patch.preacher ?? item.preacher,
        director: patch.director ?? item.director,
        soundTeam: patch.soundTeam ?? item.soundTeam
      };
    });

    const result = generateScheduleAssignments({
      items: merged,
      rules: rotationRules,
      members,
      overwrite
    });

    let applied = 0;
    for (const assignment of result.assignments) {
      const column = RULE_ROLE_TO_COLUMN[assignment.role];
      setPendingForCell(assignment.itemId, column, assignment.memberName);
      applied += 1;
    }

    if (applied === 0) {
      toast("Nenhum slot foi preenchido. Verifique regras e disponibilidade.", { variant: "danger" });
    } else if (result.conflicts.length > 0) {
      toast(`${applied} preenchidos. ${result.conflicts.length} conflito(s) — alguem indisponivel.`, {
        variant: "danger"
      });
    } else {
      toast(`${applied} ${applied === 1 ? "slot preenchido" : "slots preenchidos"}.`, {
        variant: "success"
      });
    }
  }

  async function handleClick() {
    if (running || !ready) return;
    setRunning(true);
    try {
      applyResult();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rotation-generator">
      <label className="rotation-generator-toggle">
        <input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} />
        <span>Sobrescrever preenchidos</span>
      </label>
      <button
        type="button"
        className="button primary"
        onClick={handleClick}
        disabled={running || !ready}
        title={
          rotationRules.length === 0
            ? "Cadastre regras primeiro em 'Regras de rotação'"
            : yearItems.length === 0
              ? "Sem eventos no ano selecionado"
              : ""
        }
      >
        <Wand2 size={16} aria-hidden="true" />
        <span>{running ? "Gerando..." : "Gerar com regras"}</span>
      </button>
    </div>
  );
}
