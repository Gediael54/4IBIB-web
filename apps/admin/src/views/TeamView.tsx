import { formatDateTime, type AdminRole, type AdminUser } from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { Save, Trash2, UserPlus } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ListView } from "../components/ListView";
import { useToast } from "../components/Toast";
import { Field, ListToolbar, Pagination, SelectField } from "../components/ui";
import { ADMIN_ROLE_LABELS } from "../lib/labels";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  type ListState
} from "../lib/list-state";
import { TEAM_SORT_OPTIONS } from "../lib/sort-options";
import { inviteAdminSchema, type InviteAdminFormValues } from "../schemas";
import { useAdmins, useInviteAdmin, useRemoveAdmin, useUpdateAdminRole } from "../hooks";

interface TeamViewProps {
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

const EMPTY_INVITE: InviteAdminFormValues = { email: "", role: "editor" };

function compareRole(left: AdminRole, right: AdminRole): number {
  if (left === right) {
    return 0;
  }
  return left === "owner" ? -1 : 1;
}

function getEmailLabel(admin: AdminUser): string {
  if (admin.email) {
    return admin.email;
  }
  if (admin.displayName) {
    return admin.displayName;
  }
  return "(sem email)";
}

export default function TeamView({ state, onStateChange }: TeamViewProps) {
  const adminsQuery = useAdmins();
  const inviteMutation = useInviteAdmin();
  const updateRoleMutation = useUpdateAdminRole();
  const removeMutation = useRemoveAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InviteAdminFormValues>({
    resolver: valibotResolver(inviteAdminSchema),
    defaultValues: EMPTY_INVITE
  });

  const admins = useMemo(() => adminsQuery.data ?? [], [adminsQuery.data]);

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = admins.filter((item) => matchesSearch(query, [item.email, item.displayName]));
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "emailAsc") {
        return compareText(left.email, right.email);
      }
      if (state.sort === "createdDesc") {
        return Date.parse(right.createdAt) - Date.parse(left.createdAt);
      }
      const roleOrder = compareRole(left.role, right.role);
      if (roleOrder !== 0) {
        return roleOrder;
      }
      return compareText(left.email, right.email);
    });
    return paginateItems(sorted, state.page);
  }, [admins, state]);

  async function onSubmit(values: InviteAdminFormValues) {
    try {
      await inviteMutation.mutateAsync({ email: values.email.trim(), role: values.role });
      reset(EMPTY_INVITE);
      toast("Convite enviado.", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao consegui enviar o convite — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleRemove(admin: AdminUser) {
    const label = getEmailLabel(admin);
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

  const saving = isSubmitting || inviteMutation.isPending;
  const queryError = adminsQuery.error;

  return (
    <section>
      <div className="editor-panel">
        <form className="editor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="off"
            placeholder="pessoa@igreja.org"
            error={errors.email?.message}
            {...register("email")}
          />
          <SelectField label="Funcao" error={errors.role?.message} {...register("role")}>
            <option value="editor">{ADMIN_ROLE_LABELS.editor}</option>
            <option value="owner">{ADMIN_ROLE_LABELS.owner}</option>
          </SelectField>
          <div className="form-actions">
            <button className="button primary" disabled={saving} type="submit">
              <Save size={18} /> Convidar
            </button>
          </div>
        </form>
      </div>

      <ListView
        title="Administradores"
        count={list.total}
        toolbar={
          <ListToolbar
            search={state.search}
            searchLabel="Email ou nome"
            sort={state.sort}
            sortOptions={TEAM_SORT_OPTIONS}
            total={list.total}
            onSearch={(search) => onStateChange({ search, page: 1 })}
            onSort={(sort) => onStateChange({ sort, page: 1 })}
          />
        }
        items={list.items}
        loading={adminsQuery.isLoading}
        error={
          queryError
            ? {
                message:
                  queryError instanceof Error ? queryError.message : "Nao foi possivel carregar a equipe."
              }
            : null
        }
        getId={(admin) => admin.userId}
        emptyState={
          <EmptyState
            icon={<UserPlus size={32} />}
            title="Sem admins ainda."
            description="Use o formulario acima pra convidar quem vai cuidar do painel."
          />
        }
        footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
        renderItem={(admin) => (
          <article className="prayer-row">
            <div>
              <strong>{getEmailLabel(admin)}</strong>
              <span>{ADMIN_ROLE_LABELS[admin.role]}</span>
              <span>{formatDateTime(admin.createdAt)}</span>
              {admin.displayName && admin.email && <span>{admin.displayName}</span>}
            </div>
            <SelectField
              label="Funcao"
              value={admin.role}
              onChange={(event) => handleRoleChange(admin, event.currentTarget.value as AdminRole)}
            >
              <option value="editor">{ADMIN_ROLE_LABELS.editor}</option>
              <option value="owner">{ADMIN_ROLE_LABELS.owner}</option>
            </SelectField>
            <div className="row-actions">
              <button
                type="button"
                onClick={() => handleRemove(admin)}
                aria-label={`Remover ${getEmailLabel(admin)}`}
                title="Remover"
              >
                <Trash2 size={16} /> Remover
              </button>
            </div>
          </article>
        )}
      />
    </section>
  );
}
