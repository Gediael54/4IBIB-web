import { sortRotationRules, type RotationRole, type RotationRule, type SiteSnapshot } from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { Plus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import DetailSheet from "../components/Layout/DetailSheet";
import FilterChips, { type ChipOption } from "../components/Layout/FilterChips";
import ViewHeader from "../components/Layout/ViewHeader";
import { useToast } from "../components/Toast";
import { useArchiveRotationRule, useMembers, useRestoreRotationRule, useSaveRotationRule } from "../hooks";
import { type ListState } from "../lib/list-state";
import { ROTATION_ROLE_LABEL } from "../lib/rotation-labels";
import { rotationRuleSchema, type RotationRuleFormValues } from "../schemas";
import RotationRuleCard from "./rotation/RotationRuleCard";
import RotationRuleForm from "./rotation/RotationRuleForm";

interface RotationRulesViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

type RoleFilter = "all" | RotationRole;

function emptyValues(): RotationRuleFormValues {
  return {
    memberId: "",
    role: "preacher",
    frequency: "every_week",
    weekday: 0,
    ministry: "",
    priority: 0,
    active: true,
    notes: ""
  };
}

function ruleToFormValues(rule: RotationRule): RotationRuleFormValues {
  return {
    id: rule.id,
    memberId: rule.memberId,
    role: rule.role,
    frequency: rule.frequency,
    weekday: rule.weekday,
    ministry: rule.ministry,
    priority: rule.priority,
    active: rule.active,
    notes: rule.notes
  };
}

export default function RotationRulesView({ snapshot, state, onStateChange }: RotationRulesViewProps) {
  void state;
  void onStateChange;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const saveMutation = useSaveRotationRule();
  const archiveMutation = useArchiveRotationRule();
  const restoreMutation = useRestoreRotationRule();
  const { toast } = useToast();
  const confirm = useConfirm();

  const membersQuery = useMembers();
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      map.set(member.id, member.fullName);
    }
    return map;
  }, [members]);

  const orderedRules = useMemo(() => sortRotationRules(snapshot.rotationRules), [snapshot.rotationRules]);

  const visibleRules = useMemo(() => {
    if (roleFilter === "all") return orderedRules;
    return orderedRules.filter((rule) => rule.role === roleFilter);
  }, [orderedRules, roleFilter]);

  const counts = useMemo(() => {
    const all = orderedRules.length;
    const preacher = orderedRules.filter((r) => r.role === "preacher").length;
    const director = orderedRules.filter((r) => r.role === "director").length;
    const sound = orderedRules.filter((r) => r.role === "sound").length;
    return { all, preacher, director, sound };
  }, [orderedRules]);

  const form = useForm<RotationRuleFormValues>({
    resolver: valibotResolver(rotationRuleSchema),
    defaultValues: emptyValues()
  });
  const { reset, formState } = form;

  function openCreate() {
    setEditingId(null);
    reset(emptyValues());
    setSheetOpen(true);
  }

  function openEdit(rule: RotationRule) {
    setEditingId(rule.id);
    reset(ruleToFormValues(rule));
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingId(null);
    reset(emptyValues());
  }

  async function onSubmit(values: RotationRuleFormValues) {
    try {
      await saveMutation.mutateAsync({
        id: editingId ?? undefined,
        memberId: values.memberId,
        role: values.role,
        frequency: values.frequency,
        weekday: values.weekday,
        ministry: values.ministry.trim(),
        priority: values.priority,
        active: values.active,
        notes: values.notes
      });
      toast(editingId ? "Regra atualizada." : "Regra criada.", { variant: "success" });
      closeSheet();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui salvar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleDelete(rule: RotationRule) {
    const memberName = memberNameById.get(rule.memberId) ?? "regra";
    const ok = await confirm({
      title: `Excluir regra de ${memberName}?`,
      message: `${ROTATION_ROLE_LABEL[rule.role]} · ${rule.notes || "sem anotação"}`,
      confirmText: "Excluir",
      destructive: true
    });
    if (!ok) return;
    try {
      await archiveMutation.mutateAsync(rule.id);
      toast.undo({
        message: `Regra de ${memberName} arquivada.`,
        onUndo: () => restoreMutation.mutate(rule.id)
      });
      if (editingId === rule.id) closeSheet();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui excluir — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  const filterOptions: ReadonlyArray<ChipOption<RoleFilter>> = [
    { value: "all", label: "Todas", count: counts.all },
    { value: "preacher", label: "Pregador", count: counts.preacher },
    { value: "director", label: "Dirigente", count: counts.director },
    { value: "sound", label: "Som", count: counts.sound }
  ];

  const saving = formState.isSubmitting || saveMutation.isPending;

  return (
    <section className="apple-view">
      <ViewHeader
        eyebrow="Escala"
        title="Regras de rotação"
        lead="Defina quem entra na escala automaticamente e em qual frequência. O gerador respeita as datas indisponíveis de cada voluntário."
        primaryAction={
          <button type="button" className="button primary" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            <span>Nova regra</span>
          </button>
        }
      />

      <FilterChips<RoleFilter>
        value={roleFilter}
        onChange={setRoleFilter}
        options={filterOptions}
        ariaLabel="Filtrar regras por função"
      />

      {visibleRules.length === 0 ? (
        <EmptyState
          icon={<UsersRound size={32} aria-hidden="true" />}
          title="Sem regras cadastradas."
          description="Crie a primeira regra para que o gerador preencha a escala automaticamente."
        />
      ) : (
        <div className="data-cards-grid data-cards-grid-2col">
          {visibleRules.map((rule) => (
            <RotationRuleCard
              key={rule.id}
              rule={rule}
              memberName={memberNameById.get(rule.memberId) ?? "Voluntário desconhecido"}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <DetailSheet
        open={sheetOpen}
        title={editingId ? "Editar regra" : "Nova regra de rotação"}
        onClose={closeSheet}
      >
        <RotationRuleForm
          form={form}
          members={members}
          saving={saving}
          onSubmit={onSubmit}
          onCancel={closeSheet}
        />
      </DetailSheet>
    </section>
  );
}
