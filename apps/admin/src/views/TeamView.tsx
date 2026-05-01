import type { AdminRole, AdminUser } from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Field, ListToolbar, Pagination, SelectField } from "../components/ui";
import { inviteAdminSchema, type InviteAdminFormValues } from "../schemas";
import { useAdmins, useInviteAdmin, useRemoveAdmin, useUpdateAdminRole } from "../hooks";
import {
  ADMIN_ROLE_LABELS,
  compareText,
  formatDateTimeLabel,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  TEAM_SORT_OPTIONS,
  type ListState
} from "../utils";

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
  const [inviteError, setInviteError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InviteAdminFormValues>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: EMPTY_INVITE
  });

  const admins = adminsQuery.data ?? [];

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
    setInviteError(null);
    try {
      await inviteMutation.mutateAsync({ email: values.email.trim(), role: values.role });
      reset(EMPTY_INVITE);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao convidar admin.";
      setInviteError(message);
    }
  }

  async function handleRemove(admin: AdminUser) {
    const label = getEmailLabel(admin);
    if (!window.confirm(`Remover acesso de ${label}?`)) {
      return;
    }
    await removeMutation.mutateAsync(admin.userId);
  }

  function handleRoleChange(admin: AdminUser, role: AdminRole) {
    if (admin.role === role) {
      return;
    }
    updateRoleMutation.mutate({ userId: admin.userId, role });
  }

  const saving = isSubmitting || inviteMutation.isPending;

  return (
    <section>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Equipe</p>
          <h1>Administradores</h1>
        </div>
      </header>

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
          {inviteError && (
            <small className="form-error" role="alert">
              {inviteError}
            </small>
          )}
        </form>
      </div>

      <div className="list-panel">
        <ListToolbar
          search={state.search}
          searchLabel="Email ou nome"
          sort={state.sort}
          sortOptions={TEAM_SORT_OPTIONS}
          total={list.total}
          onSearch={(search) => onStateChange({ search, page: 1 })}
          onSort={(sort) => onStateChange({ sort, page: 1 })}
        />
        {adminsQuery.isLoading && <p className="empty-note">Carregando admins...</p>}
        {!adminsQuery.isLoading &&
          list.items.map((admin) => (
            <article className="prayer-row" key={admin.userId}>
              <div>
                <strong>{getEmailLabel(admin)}</strong>
                <span>{ADMIN_ROLE_LABELS[admin.role]}</span>
                <span>{formatDateTimeLabel(admin.createdAt)}</span>
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
          ))}
        {!adminsQuery.isLoading && list.items.length === 0 && (
          <p className="empty-note">Nenhum admin cadastrado.</p>
        )}
        <Pagination list={list} onPageChange={(page) => onStateChange({ page })} />
      </div>
    </section>
  );
}
