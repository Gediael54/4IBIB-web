import { formatDateOnly, type AdminRole, type AdminUser } from "@4ibib/core";
import { ShieldCheck, Trash2, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import DataCard from "../components/Layout/DataCard";
import FilterChips, { type ChipOption } from "../components/Layout/FilterChips";
import ViewHeader from "../components/Layout/ViewHeader";
import { useToast } from "../components/Toast";
import { ADMIN_ROLE_LABELS } from "../lib/labels";
import { type ListState } from "../lib/list-state";
import { useAdmins, useRemoveAdmin, useUpdateAdminRole } from "../hooks";

interface TeamViewProps {
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

type RoleFilter = "all" | "owner" | "editor";

const OWNER_ICON_BACKGROUND = "linear-gradient(135deg, #f59e0b, #ea580c)";
const OWNER_ICON_COLOR = "#fff";

function getDisplayLabel(admin: AdminUser): string {
  if (admin.displayName.trim()) {
    return admin.displayName;
  }
  if (admin.email) {
    return admin.email;
  }
  return "(sem identificacao)";
}

function getSubtitle(admin: AdminUser): string | undefined {
  if (admin.displayName.trim() && admin.email) {
    return admin.email;
  }
  return undefined;
}

function compareRoleThenName(left: AdminUser, right: AdminUser): number {
  if (left.role !== right.role) {
    return left.role === "owner" ? -1 : 1;
  }
  return getDisplayLabel(left).localeCompare(getDisplayLabel(right), "pt-BR", {
    sensitivity: "base"
  });
}

export default function TeamView({ state, onStateChange }: TeamViewProps) {
  void state;
  void onStateChange;

  const adminsQuery = useAdmins();
  const updateRoleMutation = useUpdateAdminRole();
  const removeMutation = useRemoveAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const admins = useMemo(() => adminsQuery.data ?? [], [adminsQuery.data]);

  const sortedAdmins = useMemo(() => [...admins].sort(compareRoleThenName), [admins]);

  const counts = useMemo(
    () => ({
      all: admins.length,
      owner: admins.filter((entry) => entry.role === "owner").length,
      editor: admins.filter((entry) => entry.role === "editor").length
    }),
    [admins]
  );

  const visibleAdmins = useMemo(() => {
    if (roleFilter === "all") {
      return sortedAdmins;
    }
    return sortedAdmins.filter((entry) => entry.role === roleFilter);
  }, [sortedAdmins, roleFilter]);

  const filterOptions: ReadonlyArray<ChipOption<RoleFilter>> = [
    { value: "all", label: "Todos", count: counts.all },
    { value: "owner", label: "Owners", count: counts.owner },
    { value: "editor", label: "Editors", count: counts.editor }
  ];

  async function handleRemove(admin: AdminUser) {
    const label = getDisplayLabel(admin);
    const ok = await confirm({
      title: "Remover acesso?",
      message: `${label} perde imediatamente o acesso ao painel.`,
      confirmText: "Remover",
      destructive: true,
      requireText: "EXCLUIR"
    });
    if (!ok) {
      return;
    }
    try {
      await removeMutation.mutateAsync(admin.userId);
      toast(`Acesso de ${label} removido.`, { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui remover — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  function handleRoleChange(admin: AdminUser, role: AdminRole) {
    if (admin.role === role) {
      return;
    }
    updateRoleMutation.mutate(
      { userId: admin.userId, role },
      {
        onSuccess: () => toast("Funcao atualizada.", { variant: "success" }),
        onError: (error) =>
          toast(error instanceof Error ? error.message : "Nao consegui mudar a funcao — tenta de novo?", {
            variant: "danger"
          })
      }
    );
  }

  const queryError = adminsQuery.error;
  const errorMessage = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Nao foi possivel carregar a equipe."
    : null;

  return (
    <section className="apple-view">
      <ViewHeader
        eyebrow="Acesso"
        title="Equipe"
        lead="Pessoas com acesso ao painel administrativo. Novos cadastros são feitos pelo Supabase Auth."
      />

      <FilterChips<RoleFilter>
        ariaLabel="Filtrar por funcao"
        value={roleFilter}
        onChange={setRoleFilter}
        options={filterOptions}
      />

      {errorMessage ? (
        <EmptyState
          icon={<ShieldCheck size={32} aria-hidden="true" />}
          title="Não foi possível carregar a equipe."
          description={errorMessage}
        />
      ) : adminsQuery.isLoading ? (
        <EmptyState icon={<ShieldCheck size={32} aria-hidden="true" />} title="Carregando equipe..." />
      ) : visibleAdmins.length === 0 ? (
        <EmptyState
          icon={<UserCog size={32} aria-hidden="true" />}
          title="Sem admins ainda."
          description="Cadastre o primeiro acesso pelo painel do Supabase Auth."
        />
      ) : (
        <div className="data-cards-grid data-cards-grid-2col">
          {visibleAdmins.map((admin) => {
            const isOwner = admin.role === "owner";
            const label = getDisplayLabel(admin);
            const subtitle = getSubtitle(admin);
            const createdLabel = formatDateOnly(admin.createdAt);
            return (
              <DataCard
                key={admin.userId}
                icon={<ShieldCheck size={22} aria-hidden="true" />}
                iconBackground={isOwner ? OWNER_ICON_BACKGROUND : "var(--accent-soft)"}
                iconColor={isOwner ? OWNER_ICON_COLOR : "var(--accent)"}
                title={label}
                subtitle={subtitle}
                badge={
                  <span className={`status-pill ${isOwner ? "status-pill-warning" : ""}`}>
                    {ADMIN_ROLE_LABELS[admin.role]}
                  </span>
                }
                meta={createdLabel ? <span>Cadastrado em {createdLabel}</span> : undefined}
                secondaryActions={
                  <>
                    <span className="team-role-select">
                      <select
                        aria-label={`Funcao de ${label}`}
                        value={admin.role}
                        onChange={(event) => handleRoleChange(admin, event.currentTarget.value as AdminRole)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <option value="editor">{ADMIN_ROLE_LABELS.editor}</option>
                        <option value="owner">{ADMIN_ROLE_LABELS.owner}</option>
                      </select>
                    </span>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleRemove(admin)}
                      aria-label={`Remover ${label}`}
                      title="Remover"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
