import {
  formatInputDateTime,
  inputDateTimeToIso,
  type Member,
  type ScheduleBulkPatch,
  type ScheduleItem,
  type ScheduleStatus,
  type SiteSnapshot
} from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { CalendarDays, Copy, ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ListView } from "../components/ListView";
import { useToast } from "../components/Toast";
import {
  Field,
  FormActions,
  ItemRow,
  ListToolbar,
  Pagination,
  SelectField,
  TextAreaField
} from "../components/ui";
import { MINISTRIES } from "../config/church";
import {
  useArchiveScheduleItem,
  useBulkUpdateScheduleItems,
  useDuplicateScheduleItem,
  useMembers,
  useRestoreScheduleItem,
  useSaveScheduleItem,
  useUpdateScheduleItemMembers
} from "../hooks";
import { clearFormAutosave, useFormAutosave } from "../lib/use-form-autosave";
import { scheduleSchema, type ScheduleFormValues } from "../schemas";
import { formatScheduleDetail } from "../lib/format";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "../lib/limits";
import { findMemberByName, sortMembersForAutocomplete } from "../lib/members";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  uniqueSorted,
  type ListState
} from "../lib/list-state";
import { SCHEDULE_SORT_OPTIONS } from "../lib/sort-options";

interface ScheduleViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

type BulkMode = "preacher" | "director" | "status" | "featured" | null;

function emptyScheduleValues(): ScheduleFormValues {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  start.setHours(19, 30, 0, 0);
  const end = new Date(start);
  end.setHours(21, 0, 0, 0);

  return {
    title: "",
    ministry: "",
    startsAt: formatInputDateTime(start.toISOString()),
    endsAt: formatInputDateTime(end.toISOString()),
    location: "Templo principal",
    summary: "",
    preacher: "",
    director: "",
    soundTeam: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    youtubeUrl: ""
  };
}

function scheduleToFormValues(item: ScheduleItem): ScheduleFormValues {
  return {
    title: item.title,
    ministry: item.ministry,
    startsAt: formatInputDateTime(item.startsAt),
    endsAt: formatInputDateTime(item.endsAt),
    location: item.location,
    summary: item.summary,
    preacher: item.preacher,
    director: item.director,
    soundTeam: item.soundTeam ?? "",
    passage: item.passage,
    occasionLabel: item.occasionLabel,
    status: item.status,
    featured: item.featured,
    youtubeUrl: item.youtubeUrl ?? ""
  };
}

const SCHEDULE_DRAFT_KEY = "schedule-draft";

interface MemberAutocompleteInputProps {
  label: string;
  placeholder?: string;
  members: Member[];
  value: string;
  inputProps: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "list">;
  datalistId: string;
  badgeTestId: string;
  error?: string;
  extraOptions?: string[];
}

function MemberAutocompleteInput(props: MemberAutocompleteInputProps) {
  const sortedMembers = useMemo(() => sortMembersForAutocomplete(props.members), [props.members]);
  const matched = findMemberByName(props.value, props.members);
  const optionValues = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const member of sortedMembers) {
      const name = member.fullName.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
    for (const extra of props.extraOptions ?? []) {
      const name = extra.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
    return out;
  }, [sortedMembers, props.extraOptions]);

  return (
    <div className="member-field">
      <Field
        label={props.label}
        list={props.datalistId}
        placeholder={props.placeholder ?? props.label}
        maxLength={TEXT_MAX}
        error={props.error}
        {...props.inputProps}
      />
      {matched && (
        <span className="member-match-tag" data-testid={props.badgeTestId}>
          Membro vinculado
        </span>
      )}
      <datalist id={props.datalistId}>
        {optionValues.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </div>
  );
}

export function ScheduleForm(props: {
  snapshot: SiteSnapshot;
  editingId: string | null;
  onSaved: () => void;
  onCancel: () => void;
  initialValues: ScheduleFormValues;
  resetSignal: number;
}) {
  const saveMutation = useSaveScheduleItem();
  const updateMembersMutation = useUpdateScheduleItemMembers();
  const membersQuery = useMembers();
  const allMembers = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<ScheduleFormValues>({
    resolver: valibotResolver(scheduleSchema),
    defaultValues: props.initialValues
  });

  useFormAutosave(SCHEDULE_DRAFT_KEY, control, reset, props.editingId === null);

  useEffect(() => {
    reset(props.initialValues);
  }, [props.resetSignal, props.initialValues, reset]);

  const startsAt = useWatch({ control, name: "startsAt" });
  const preacherValue = useWatch({ control, name: "preacher" });
  const directorValue = useWatch({ control, name: "director" });
  const soundTeamValue = useWatch({ control, name: "soundTeam" });

  const ministryNames = useMemo(
    () =>
      uniqueSorted([
        ...MINISTRIES.map((item) => item.name),
        ...props.snapshot.schedule.map((item) => item.ministry)
      ]),
    [props.snapshot]
  );

  const scheduleLocations = useMemo(
    () => uniqueSorted(props.snapshot.schedule.map((item) => item.location)),
    [props.snapshot]
  );

  const volunteers = useMemo(() => props.snapshot.volunteers ?? [], [props.snapshot]);

  const generalVolunteerNames = useMemo(
    () => uniqueSorted(volunteers.filter((item) => item.role === "geral").map((item) => item.name)),
    [volunteers]
  );

  const soundVolunteerNames = useMemo(
    () => uniqueSorted(volunteers.filter((item) => item.role === "som").map((item) => item.name)),
    [volunteers]
  );

  const preacherExtras = useMemo(
    () => uniqueSorted([...generalVolunteerNames, ...props.snapshot.schedule.map((item) => item.preacher)]),
    [props.snapshot, generalVolunteerNames]
  );

  const directorExtras = useMemo(
    () => uniqueSorted([...generalVolunteerNames, ...props.snapshot.schedule.map((item) => item.director)]),
    [props.snapshot, generalVolunteerNames]
  );

  function resolveMemberId(name: string): string | null {
    return findMemberByName(name, allMembers)?.id ?? null;
  }

  const soundFirstName = (soundTeamValue ?? "").split(",")[0] ?? "";

  const schedulePassages = useMemo(
    () => uniqueSorted(props.snapshot.schedule.map((item) => item.passage)),
    [props.snapshot]
  );

  const scheduleOccasionLabels = useMemo(
    () => uniqueSorted(props.snapshot.schedule.map((item) => item.occasionLabel)),
    [props.snapshot]
  );

  function handleStartsAtChange(next: string) {
    setValue("startsAt", next, { shouldValidate: true, shouldDirty: true });
    const currentEnds = getValues("endsAt");
    if (!currentEnds || currentEnds < next) {
      const startMs = new Date(next).getTime();
      if (Number.isFinite(startMs)) {
        const shifted = new Date(startMs + 90 * 60 * 1000);
        setValue("endsAt", formatInputDateTime(shifted.toISOString()), {
          shouldValidate: true,
          shouldDirty: true
        });
      }
    }
  }

  async function onSubmit(values: ScheduleFormValues) {
    try {
      const saved = await saveMutation.mutateAsync({
        id: props.editingId ?? undefined,
        title: values.title,
        ministry: values.ministry,
        startsAt: inputDateTimeToIso(values.startsAt),
        endsAt: inputDateTimeToIso(values.endsAt),
        location: values.location,
        summary: values.summary,
        preacher: values.preacher,
        director: values.director,
        soundTeam: values.soundTeam,
        passage: values.passage,
        occasionLabel: values.occasionLabel,
        status: values.status,
        featured: values.featured,
        youtubeUrl: values.youtubeUrl?.trim() ?? ""
      });
      const preacherMemberId = resolveMemberId(values.preacher);
      const directorMemberId = resolveMemberId(values.director);
      const firstSoundName = values.soundTeam.split(",")[0] ?? "";
      const soundMemberId = resolveMemberId(firstSoundName);
      if (preacherMemberId || directorMemberId || soundMemberId) {
        await updateMembersMutation.mutateAsync({
          itemId: saved.id,
          members: { preacherMemberId, directorMemberId, soundMemberId }
        });
      }
      toast(props.editingId ? "Programacao atualizada." : "Programacao criada.", { variant: "success" });
      props.onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui salvar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  const saving = isSubmitting || saveMutation.isPending;

  const startsAtRegister = register("startsAt");

  return (
    <form className="editor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-grid">
        <Field
          label="Titulo"
          placeholder="Titulo"
          maxLength={TEXT_MAX}
          error={errors.title?.message}
          {...register("title")}
        />
        <Field
          label="Ministerio"
          list="schedule-ministries"
          placeholder="Ministerio"
          maxLength={TEXT_MAX}
          error={errors.ministry?.message}
          {...register("ministry")}
        />
      </div>
      <datalist id="schedule-ministries">
        {ministryNames.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <div className="form-grid">
        <Field
          label="Inicio"
          type="datetime-local"
          error={errors.startsAt?.message}
          {...startsAtRegister}
          onChange={(event) => {
            startsAtRegister.onChange(event);
            handleStartsAtChange(event.currentTarget.value);
          }}
        />
        <Field
          label="Termino"
          type="datetime-local"
          min={startsAt}
          error={errors.endsAt?.message}
          {...register("endsAt")}
        />
      </div>
      <div className="form-grid">
        <Field
          label="Local"
          list="schedule-locations"
          placeholder="Local"
          maxLength={TEXT_MAX}
          error={errors.location?.message}
          {...register("location")}
        />
        <SelectField label="Status" error={errors.status?.message} {...register("status")}>
          <option value="scheduled">Agendado</option>
          <option value="suspended">Suspenso</option>
          <option value="free">Livre</option>
        </SelectField>
      </div>
      <div className="form-grid">
        <MemberAutocompleteInput
          label="Pregador"
          members={allMembers}
          value={preacherValue ?? ""}
          inputProps={register("preacher")}
          datalistId="schedule-preachers"
          badgeTestId="preacher-member-tag"
          error={errors.preacher?.message}
          extraOptions={preacherExtras}
        />
        <MemberAutocompleteInput
          label="Dirigente"
          members={allMembers}
          value={directorValue ?? ""}
          inputProps={register("director")}
          datalistId="schedule-directors"
          badgeTestId="director-member-tag"
          error={errors.director?.message}
          extraOptions={directorExtras}
        />
      </div>
      <MemberAutocompleteInput
        label="Equipe de som"
        placeholder="Miguel, Brainer (separe com virgula)"
        members={allMembers}
        value={soundFirstName}
        inputProps={register("soundTeam")}
        datalistId="schedule-sound-team"
        badgeTestId="sound-member-tag"
        error={errors.soundTeam?.message}
        extraOptions={soundVolunteerNames}
      />
      <div className="form-grid">
        <Field
          label="Passagem biblica"
          list="schedule-passages"
          placeholder="Passagem biblica"
          maxLength={TEXT_MAX}
          error={errors.passage?.message}
          {...register("passage")}
        />
        <Field
          label="Data especial"
          list="schedule-occasion-labels"
          placeholder="Data especial (ex: PASCOA)"
          maxLength={TEXT_MAX}
          error={errors.occasionLabel?.message}
          {...register("occasionLabel")}
        />
      </div>
      <datalist id="schedule-locations">
        {scheduleLocations.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="schedule-passages">
        {schedulePassages.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="schedule-occasion-labels">
        {scheduleOccasionLabels.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <Field
        label="Link YouTube"
        type="url"
        placeholder="https://youtu.be/... (opcional)"
        maxLength={URL_MAX}
        error={errors.youtubeUrl?.message}
        {...register("youtubeUrl")}
      />
      <TextAreaField
        label="Resumo"
        placeholder="Resumo"
        maxLength={TEXTAREA_MAX}
        error={errors.summary?.message}
        {...register("summary")}
      />
      <label className="check-row">
        <input type="checkbox" {...register("featured")} />
        Destacar na agenda
      </label>
      <FormActions saving={saving} onCancel={props.onCancel} />
    </form>
  );
}

export default function ScheduleView({ snapshot, state, onStateChange }: ScheduleViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<ScheduleFormValues>(() => emptyScheduleValues());
  const [resetSignal, setResetSignal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [bulkMode, setBulkMode] = useState<BulkMode>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkStatus, setBulkStatus] = useState<ScheduleStatus>("scheduled");

  const archiveMutation = useArchiveScheduleItem();
  const restoreMutation = useRestoreScheduleItem();
  const duplicateMutation = useDuplicateScheduleItem();
  const bulkMutation = useBulkUpdateScheduleItems();
  const { toast } = useToast();
  const confirm = useConfirm();

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const fromMs = fromDate ? Date.parse(inputDateTimeToIso(fromDate)) : null;
    const toMs = toDate ? Date.parse(inputDateTimeToIso(toDate)) : null;
    const filtered = snapshot.schedule.filter((item) => {
      if (
        !matchesSearch(query, [
          item.title,
          item.ministry,
          item.location,
          item.preacher,
          item.director,
          item.passage,
          item.occasionLabel,
          item.status
        ])
      ) {
        return false;
      }
      const startsAtMs = Date.parse(item.startsAt);
      if (fromMs !== null && startsAtMs < fromMs) {
        return false;
      }
      if (toMs !== null && startsAtMs > toMs) {
        return false;
      }
      return true;
    });
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "startsDesc") {
        return Date.parse(right.startsAt) - Date.parse(left.startsAt);
      }
      if (state.sort === "titleAsc") {
        return compareText(left.title, right.title);
      }
      if (state.sort === "ministryAsc") {
        return compareText(left.ministry, right.ministry);
      }
      if (state.sort === "statusAsc") {
        return compareText(left.status, right.status);
      }
      return Date.parse(left.startsAt) - Date.parse(right.startsAt);
    });
    return paginateItems(sorted, state.page);
  }, [snapshot, state, fromDate, toDate]);

  const visibleIds = useMemo(() => list.items.map((item) => item.id), [list.items]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function togglePageSelection() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) {
          next.delete(id);
        }
      } else {
        for (const id of visibleIds) {
          next.add(id);
        }
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    closeBulkPanel();
  }

  function openBulkPanel(mode: Exclude<BulkMode, null>) {
    setBulkMode(mode);
    setBulkText("");
    setBulkStatus("scheduled");
  }

  function closeBulkPanel() {
    setBulkMode(null);
    setBulkText("");
  }

  function startEdit(item: ScheduleItem) {
    setEditingId(item.id);
    setInitialValues(scheduleToFormValues(item));
    setResetSignal((value) => value + 1);
  }

  function cancelEdit() {
    if (editingId === null) {
      clearFormAutosave(SCHEDULE_DRAFT_KEY);
    }
    setEditingId(null);
    setInitialValues(emptyScheduleValues());
    setResetSignal((value) => value + 1);
  }

  async function handleDelete(item: ScheduleItem) {
    const ok = await confirm({
      title: `Excluir "${item.title}"?`,
      message: "Este item sera removido da programacao e nao aparecera mais no site.",
      confirmText: "Excluir",
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await archiveMutation.mutateAsync(item.id);
      toast.undo({
        message: `"${item.title}" arquivado.`,
        onUndo: () => restoreMutation.mutate(item.id)
      });
      setSelectedIds((prev) => {
        if (!prev.has(item.id)) return prev;
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      if (editingId === item.id) {
        cancelEdit();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui excluir — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleDuplicate(item: ScheduleItem) {
    try {
      await duplicateMutation.mutateAsync(item.id);
      toast(`"${item.title}" duplicado.`, { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui duplicar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function applyBulkPatch(patch: ScheduleBulkPatch) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await bulkMutation.mutateAsync({ ids, patch });
    clearSelection();
  }

  async function handleBulkSubmit() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      closeBulkPanel();
      return;
    }
    try {
      if (bulkMode === "preacher") {
        await applyBulkPatch({ preacher: bulkText.trim() });
      } else if (bulkMode === "director") {
        await applyBulkPatch({ director: bulkText.trim() });
      } else if (bulkMode === "status") {
        await applyBulkPatch({ status: bulkStatus });
      } else if (bulkMode === "featured") {
        await applyBulkPatch({ featured: true });
      }
      toast(`${ids.length} itens atualizados.`, { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui aplicar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Excluir ${ids.length} itens?`,
      message: `Os ${ids.length} itens selecionados serao removidos da programacao. Esta acao nao pode ser desfeita.`,
      confirmText: "Excluir tudo",
      destructive: true,
      requireText: "EXCLUIR"
    });
    if (!ok) {
      return;
    }
    try {
      for (const id of ids) {
        await archiveMutation.mutateAsync(id);
      }
      toast.undo({
        message: `${ids.length} itens arquivados.`,
        onUndo: () => {
          for (const id of ids) {
            restoreMutation.mutate(id);
          }
        }
      });
      if (editingId && ids.includes(editingId)) {
        cancelEdit();
      }
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui excluir tudo — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  const selectionCount = selectedIds.size;
  const bulkPending = bulkMutation.isPending || archiveMutation.isPending;

  return (
    <div className="crud-layout">
      <ListView
        title="Programacao"
        count={list.total}
        toolbar={
          <>
            <ListToolbar
              search={state.search}
              searchLabel="Titulo, ministerio, local ou status"
              sort={state.sort}
              sortOptions={SCHEDULE_SORT_OPTIONS}
              total={list.total}
              onSearch={(search) => onStateChange({ search, page: 1 })}
              onSort={(sort) => onStateChange({ sort, page: 1 })}
            >
              <Field
                label="De"
                type="datetime-local"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.currentTarget.value);
                  onStateChange({ page: 1 });
                }}
              />
              <Field
                label="Ate"
                type="datetime-local"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.currentTarget.value);
                  onStateChange({ page: 1 });
                }}
              />
            </ListToolbar>
            {visibleIds.length > 0 && (
              <div className="bulk-select-row">
                <button type="button" className="button ghost" onClick={togglePageSelection}>
                  {allVisibleSelected ? "Limpar pagina" : "Selecionar pagina"}
                </button>
              </div>
            )}
            {selectionCount > 0 && (
              <div className="sticky-action-bar bulk-action-bar" role="region" aria-label="Acoes em massa">
                <span className="sticky-action-message bulk-action-bar-count">
                  {selectionCount} selecionados
                </span>
                <div className="sticky-action-buttons bulk-action-bar-buttons">
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => openBulkPanel("preacher")}
                    disabled={bulkPending}
                  >
                    Mudar pregador
                  </button>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => openBulkPanel("director")}
                    disabled={bulkPending}
                  >
                    Mudar dirigente
                  </button>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => openBulkPanel("status")}
                    disabled={bulkPending}
                  >
                    Mudar status
                  </button>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => openBulkPanel("featured")}
                    disabled={bulkPending}
                  >
                    Marcar destacado
                  </button>
                  <button
                    type="button"
                    className="button ghost danger"
                    onClick={handleBulkDelete}
                    disabled={bulkPending}
                  >
                    Excluir selecionados
                  </button>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={clearSelection}
                    disabled={bulkPending}
                  >
                    Limpar selecao
                  </button>
                </div>
                {bulkMode !== null && (
                  <div className="bulk-action-form">
                    {bulkMode === "preacher" && (
                      <Field
                        label={`Novo pregador para ${selectionCount} itens`}
                        placeholder="Nome do pregador"
                        maxLength={TEXT_MAX}
                        value={bulkText}
                        onChange={(event) => setBulkText(event.currentTarget.value)}
                      />
                    )}
                    {bulkMode === "director" && (
                      <Field
                        label={`Novo dirigente para ${selectionCount} itens`}
                        placeholder="Nome do dirigente"
                        maxLength={TEXT_MAX}
                        value={bulkText}
                        onChange={(event) => setBulkText(event.currentTarget.value)}
                      />
                    )}
                    {bulkMode === "status" && (
                      <SelectField
                        label={`Novo status para ${selectionCount} itens`}
                        value={bulkStatus}
                        onChange={(event) => setBulkStatus(event.currentTarget.value as ScheduleStatus)}
                      >
                        <option value="scheduled">Agendado</option>
                        <option value="suspended">Suspenso</option>
                        <option value="free">Livre</option>
                      </SelectField>
                    )}
                    {bulkMode === "featured" && (
                      <p className="bulk-action-info">
                        Marcar {selectionCount} itens como destacados na agenda?
                      </p>
                    )}
                    <div className="form-actions">
                      <button
                        type="button"
                        className="button primary"
                        onClick={handleBulkSubmit}
                        disabled={bulkPending}
                      >
                        Aplicar
                      </button>
                      <button
                        type="button"
                        className="button ghost"
                        onClick={closeBulkPanel}
                        disabled={bulkPending}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        }
        items={list.items}
        getId={(item) => item.id}
        emptyState={
          <EmptyState
            icon={<CalendarDays size={32} />}
            title="Agenda vazia."
            description="Cadastre um culto, encontro ou evento no formulario ao lado pra comecar."
          />
        }
        footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
        renderItem={(item) => {
          const checked = selectedIds.has(item.id);
          return (
            <ItemRow key={item.id} title={item.title} detail={formatScheduleDetail(item)}>
              <label className="row-checkbox" aria-label={`Selecionar ${item.title}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleSelected(item.id)} />
              </label>
              <button onClick={() => startEdit(item)} type="button">
                Editar
              </button>
              <button
                onClick={() => handleDuplicate(item)}
                type="button"
                aria-label={`Duplicar ${item.title}`}
                title="Duplicar"
                disabled={duplicateMutation.isPending}
              >
                <Copy size={16} />
              </button>
              <a
                href="/#agenda"
                target="_blank"
                rel="noopener noreferrer"
                className="row-action-link"
                aria-label={`Ver ${item.title} no site`}
                title="Ver no site"
              >
                <ExternalLink size={16} />
              </a>
              <button
                onClick={() => handleDelete(item)}
                type="button"
                aria-label={`Excluir ${item.title}`}
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </ItemRow>
          );
        }}
      />
      <div className="editor-panel">
        <ScheduleForm
          snapshot={snapshot}
          editingId={editingId}
          initialValues={initialValues}
          resetSignal={resetSignal}
          onSaved={cancelEdit}
          onCancel={cancelEdit}
        />
      </div>
    </div>
  );
}
