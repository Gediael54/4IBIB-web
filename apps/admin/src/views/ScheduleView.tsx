import { formatInputDateTime, inputDateTimeToIso, type ScheduleItem, type SiteSnapshot } from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  CrudPanel,
  Field,
  FormActions,
  ItemRow,
  ListToolbar,
  Pagination,
  SelectField,
  TextAreaField
} from "../components/ui";
import { useDeleteScheduleItem, useSaveScheduleItem } from "../hooks";
import { scheduleSchema, type ScheduleFormValues } from "../schemas";
import {
  compareText,
  formatScheduleDetail,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  SCHEDULE_SORT_OPTIONS,
  TEXT_MAX,
  TEXTAREA_MAX,
  uniqueSorted,
  type ListState
} from "../utils";

interface ScheduleViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

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
    passage: item.passage,
    occasionLabel: item.occasionLabel,
    status: item.status,
    featured: item.featured
  };
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

  useEffect(() => {
    reset(props.initialValues);
  }, [props.resetSignal, props.initialValues, reset]);

  const startsAt = useWatch({ control, name: "startsAt" });

  const ministryNames = useMemo(
    () =>
      uniqueSorted([
        ...props.snapshot.ministries.map((item) => item.name),
        ...props.snapshot.schedule.map((item) => item.ministry)
      ]),
    [props.snapshot]
  );

  const scheduleLocations = useMemo(
    () => uniqueSorted(props.snapshot.schedule.map((item) => item.location)),
    [props.snapshot]
  );

  const schedulePreachers = useMemo(
    () => uniqueSorted(props.snapshot.schedule.map((item) => item.preacher)),
    [props.snapshot]
  );

  const scheduleDirectors = useMemo(
    () => uniqueSorted(props.snapshot.schedule.map((item) => item.director)),
    [props.snapshot]
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
  const deleteMutation = useDeleteScheduleItem();

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = snapshot.schedule.filter((item) =>
      matchesSearch(query, [
        item.title,
        item.ministry,
        item.location,
        item.preacher,
        item.director,
        item.passage,
        item.occasionLabel,
        item.status
      ])
    );
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
  }, [snapshot, state]);

  function startEdit(item: ScheduleItem) {
    setEditingId(item.id);
    setInitialValues(scheduleToFormValues(item));
    setResetSignal((value) => value + 1);
  }

  function cancelEdit() {
    setEditingId(null);
    setInitialValues(emptyScheduleValues());
    setResetSignal((value) => value + 1);
  }

  async function handleDelete(item: ScheduleItem) {
    if (!window.confirm(`Excluir "${item.title}" da programacao?`)) {
      return;
    }
    await deleteMutation.mutateAsync(item.id);
    if (editingId === item.id) {
      cancelEdit();
    }
  }

  return (
    <CrudPanel
      title="Programacao"
      items={list.items}
      toolbar={
        <ListToolbar
          search={state.search}
          searchLabel="Titulo, ministerio, local ou status"
          sort={state.sort}
          sortOptions={SCHEDULE_SORT_OPTIONS}
          total={list.total}
          onSearch={(search) => onStateChange({ search, page: 1 })}
          onSort={(sort) => onStateChange({ sort, page: 1 })}
        />
      }
      footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
      emptyLabel="Nenhum item de programacao encontrado."
      renderItem={(item) => (
        <ItemRow key={item.id} title={item.title} detail={formatScheduleDetail(item)}>
          <button onClick={() => startEdit(item)} type="button">
            Editar
          </button>
          <button
            onClick={() => handleDelete(item)}
            type="button"
            aria-label={`Excluir ${item.title}`}
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </ItemRow>
      )}
    >
      <ScheduleForm
        snapshot={snapshot}
        editingId={editingId}
        initialValues={initialValues}
        resetSignal={resetSignal}
        onSaved={cancelEdit}
        onCancel={cancelEdit}
      />
    </CrudPanel>
  );
}
