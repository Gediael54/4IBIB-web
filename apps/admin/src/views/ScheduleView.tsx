import {
  formatInputDateTime,
  inputDateTimeToIso,
  type ScheduleBulkPatch,
  type ScheduleItem,
  type ScheduleStatus,
  type SiteSnapshot
} from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Copy, ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { EmptyState } from "../components/EmptyState";
import { ListView } from "../components/ListView";
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
  useBulkUpdateScheduleItems,
  useDeleteScheduleItem,
  useDuplicateScheduleItem,
  useSaveScheduleItem
} from "../hooks";
import { clearFormAutosave, useFormAutosave } from "../lib/use-form-autosave";
import { scheduleSchema, type ScheduleFormValues } from "../schemas";
import { formatScheduleDetail } from "../lib/format";
import { TEXT_MAX, TEXTAREA_MAX } from "../lib/limits";
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
    featured: false
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
    featured: item.featured
  };
}

const SCHEDULE_DRAFT_KEY = "schedule-draft";

export function ScheduleForm(props: {
  snapshot: SiteSnapshot;
  editingId: string | null;
  onSaved: () => void;
  onCancel: () => void;
  initialValues: ScheduleFormValues;
  resetSignal: number;
}) {
  const saveMutation = useSaveScheduleItem();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: props.initialValues
  });

  useFormAutosave(SCHEDULE_DRAFT_KEY, control, reset, props.editingId === null);

  useEffect(() => {
    reset(props.initialValues);
  }, [props.resetSignal, props.initialValues, reset]);

  const startsAt = useWatch({ control, name: "startsAt" });

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

  const schedulePreachers = useMemo(
    () => uniqueSorted([...generalVolunteerNames, ...props.snapshot.schedule.map((item) => item.preacher)]),
    [props.snapshot, generalVolunteerNames]
  );

  const scheduleDirectors = useMemo(
    () => uniqueSorted([...generalVolunteerNames, ...props.snapshot.schedule.map((item) => item.director)]),
    [props.snapshot, generalVolunteerNames]
  );

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
    await saveMutation.mutateAsync({
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
      featured: values.featured
    });
    props.onSaved();
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
        <Field
          label="Pregador"
          list="schedule-preachers"
          placeholder="Pregador"
          maxLength={TEXT_MAX}
          error={errors.preacher?.message}
          {...register("preacher")}
        />
        <Field
          label="Dirigente"
          list="schedule-directors"
          placeholder="Dirigente"
          maxLength={TEXT_MAX}
          error={errors.director?.message}
          {...register("director")}
        />
      </div>
      <Field
        label="Equipe de som"
        list="schedule-sound-team"
        placeholder="Miguel, Brainer (separe com virgula)"
        maxLength={TEXT_MAX}
        error={errors.soundTeam?.message}
        {...register("soundTeam")}
      />
      <datalist id="schedule-sound-team">
        {soundVolunteerNames.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
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
      <datalist id="schedule-preachers">
        {schedulePreachers.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="schedule-directors">
        {scheduleDirectors.map((value) => (
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
      {saveMutation.error && (
        <p className="form-error">
          {saveMutation.error instanceof Error ? saveMutation.error.message : "Falha ao salvar."}
        </p>
      )}
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
  const [bulkError, setBulkError] = useState<string | null>(null);

  const deleteMutation = useDeleteScheduleItem();
  const duplicateMutation = useDuplicateScheduleItem();
  const bulkMutation = useBulkUpdateScheduleItems();

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
    setBulkError(null);
  }

  function closeBulkPanel() {
    setBulkMode(null);
    setBulkText("");
    setBulkError(null);
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
    if (!window.confirm(`Excluir "${item.title}" da programacao?`)) {
      return;
    }
    await deleteMutation.mutateAsync(item.id);
    setSelectedIds((prev) => {
      if (!prev.has(item.id)) return prev;
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    if (editingId === item.id) {
      cancelEdit();
    }
  }

  async function handleDuplicate(item: ScheduleItem) {
    await duplicateMutation.mutateAsync(item.id);
  }

  async function applyBulkPatch(patch: ScheduleBulkPatch) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await bulkMutation.mutateAsync({ ids, patch });
    clearSelection();
  }

  async function handleBulkSubmit() {
    setBulkError(null);
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
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Falha ao aplicar alteracao.");
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Excluir ${ids.length} itens da programacao?`)) {
      return;
    }
    for (const id of ids) {
      await deleteMutation.mutateAsync(id);
    }
    if (editingId && ids.includes(editingId)) {
      cancelEdit();
    }
    clearSelection();
  }

  const selectionCount = selectedIds.size;
  const bulkPending = bulkMutation.isPending || deleteMutation.isPending;

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
              <div className="bulk-action-bar" role="region" aria-label="Acoes em massa">
                <span className="bulk-action-bar-count">{selectionCount} selecionados</span>
                <div className="bulk-action-bar-buttons">
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
                    {bulkError && <p className="form-error">{bulkError}</p>}
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
            title="Nenhum item de programacao encontrado."
            description="Cadastre um item no formulario ao lado para comecar a montar a agenda."
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
