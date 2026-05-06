import {
  formatDateLabel,
  formatInputDateTime,
  formatTimeRange,
  inputDateTimeToIso,
  type Member,
  type ScheduleBulkPatch,
  type ScheduleItem,
  type ScheduleStatus,
  type SiteSnapshot
} from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import DataCard from "../components/Layout/DataCard";
import DetailSheet from "../components/Layout/DetailSheet";
import FilterChips, { type ChipOption } from "../components/Layout/FilterChips";
import ViewHeader from "../components/Layout/ViewHeader";
import RescheduleDialog from "../components/Schedule/RescheduleDialog";
import SuspendScheduleDialog from "../components/Schedule/SuspendScheduleDialog";
import { useToast } from "../components/Toast";
import { Field, FormActions, ListToolbar, Pagination, SelectField, TextAreaField } from "../components/ui";
import WhatsAppShareButton from "../components/WhatsAppShareButton";
import { MINISTRIES } from "../config/church";
import {
  useArchiveScheduleItem,
  useBulkUpdateScheduleItems,
  useMembers,
  useRestoreScheduleItem,
  useSaveScheduleItem,
  useUpdateScheduleItemMembers
} from "../hooks";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "../lib/limits";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  uniqueSorted,
  type ListState
} from "../lib/list-state";
import { findMemberByName, sortMembersForAutocomplete } from "../lib/members";
import { withSchedule, withStatus } from "../lib/schedule-actions";
import { scheduleSchema, type ScheduleFormValues } from "../schemas";
import { SCHEDULE_SORT_OPTIONS } from "../lib/sort-options";
import { clearFormAutosave, useFormAutosave } from "../lib/use-form-autosave";
import { buildScheduleMessage } from "../lib/whatsapp-share";

interface ScheduleViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

type BulkMode = "preacher" | "director" | "status" | "featured" | null;
type StatusFilter = "all" | "scheduled" | "suspended" | "free";

const SCHEDULE_DRAFT_KEY = "schedule-draft";

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  scheduled: "Programado",
  suspended: "Suspenso",
  free: "Livre"
};

const MINISTRY_PALETTE: Array<{ background: string; color: string }> = [
  { background: "rgba(0, 122, 255, 0.14)", color: "#0a59c5" },
  { background: "rgba(175, 82, 222, 0.14)", color: "#7b2da3" },
  { background: "rgba(255, 149, 0, 0.16)", color: "#a85b00" },
  { background: "rgba(48, 209, 88, 0.16)", color: "#1f7a3a" },
  { background: "rgba(255, 45, 85, 0.14)", color: "#a51b3b" },
  { background: "rgba(0, 199, 190, 0.16)", color: "#0a7873" }
];

function ministryAccent(ministry: string): { background: string; color: string } {
  const key = ministry.trim().toLocaleLowerCase("pt-BR");
  if (!key) return MINISTRY_PALETTE[0];
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return MINISTRY_PALETTE[hash % MINISTRY_PALETTE.length];
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

function startOfWeekIso(value: string): string {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date.toISOString();
}

function endOfWeekIso(start: string): string {
  const date = new Date(start);
  date.setDate(date.getDate() + 6);
  return date.toISOString();
}

function shortDayLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

interface WeekGroup {
  start: string;
  end: string;
  items: ScheduleItem[];
}

function groupByWeek(items: ScheduleItem[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();
  for (const item of items) {
    const start = startOfWeekIso(item.startsAt);
    const existing = map.get(start);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(start, { start, end: endOfWeekIso(start), items: [item] });
    }
  }
  return Array.from(map.values());
}

function StatusPill({ status }: { status: ScheduleStatus }) {
  return (
    <span className={`schedule-status-pill schedule-status-pill-${status}`}>{STATUS_LABELS[status]}</span>
  );
}

interface ScheduleCardProps {
  item: ScheduleItem;
  selected: boolean;
  onToggleSelected: () => void;
  onEdit: () => void;
  onSuspend: () => void;
  onReschedule: () => void;
  onRestore: () => void;
  onDelete: () => void;
  restoring: boolean;
}

function ScheduleCard(props: ScheduleCardProps) {
  const { item } = props;
  const accent = ministryAccent(item.ministry);
  const dateLabel = formatDateLabel(item.startsAt);
  const timeLabel = formatTimeRange(item.startsAt, item.endsAt);

  const metaParts: string[] = [];
  if (item.preacher) metaParts.push(`Pregador: ${item.preacher}`);
  if (item.director) metaParts.push(`Dirigente: ${item.director}`);
  if (item.soundTeam) metaParts.push(`Som: ${item.soundTeam}`);

  const description = [item.passage, item.summary].filter((value) => value && value.trim()).join(" — ");
  const cardStatus = item.status === "suspended" ? "danger" : item.status === "free" ? "muted" : "default";

  return (
    <DataCard
      icon={<CalendarDays size={20} />}
      iconBackground={accent.background}
      iconColor={accent.color}
      status={cardStatus}
      title={
        <span className="schedule-card-title-wrap">
          <label
            className="schedule-card-checkbox"
            aria-label={`Selecionar ${item.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <input type="checkbox" checked={props.selected} onChange={props.onToggleSelected} />
          </label>
          {item.title}
        </span>
      }
      badge={<StatusPill status={item.status} />}
      subtitle={
        <>
          <span className="schedule-card-meta-item">{dateLabel}</span>
          <span> · </span>
          <span className="schedule-card-meta-item">{timeLabel}</span>
          {item.location && (
            <>
              <span> · </span>
              <span className="schedule-card-meta-item">{item.location}</span>
            </>
          )}
        </>
      }
      meta={
        metaParts.length > 0 ? (
          <>
            {metaParts.map((value) => (
              <span key={value} className="schedule-card-meta-item">
                {value}
              </span>
            ))}
          </>
        ) : undefined
      }
      description={description ? description : undefined}
      secondaryActions={
        <div className="schedule-card-actions-row">
          <button
            type="button"
            className="schedule-card-action"
            onClick={props.onEdit}
            aria-label={`Editar ${item.title}`}
          >
            Editar
          </button>
          {item.status === "scheduled" && (
            <>
              <button
                type="button"
                className="schedule-card-action"
                onClick={props.onReschedule}
                aria-label={`Remarcar ${item.title}`}
              >
                Remarcar
              </button>
              <button
                type="button"
                className="schedule-card-action"
                onClick={props.onSuspend}
                aria-label={`Suspender ${item.title}`}
              >
                Suspender
              </button>
              <WhatsAppShareButton message={buildScheduleMessage(item)} size="sm" label="Avisar grupo" />
            </>
          )}
          {item.status === "suspended" && (
            <button
              type="button"
              className="schedule-card-action"
              onClick={props.onRestore}
              disabled={props.restoring}
              aria-label={`Restaurar ${item.title}`}
            >
              Restaurar
            </button>
          )}
          <button
            type="button"
            className="schedule-card-action danger"
            onClick={props.onDelete}
            aria-label={`Excluir ${item.title}`}
            title="Excluir"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      }
    />
  );
}

export default function ScheduleView({ snapshot, state, onStateChange }: ScheduleViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<ScheduleFormValues>(() => emptyScheduleValues());
  const [resetSignal, setResetSignal] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [bulkMode, setBulkMode] = useState<BulkMode>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkStatus, setBulkStatus] = useState<ScheduleStatus>("scheduled");
  const [suspendTarget, setSuspendTarget] = useState<ScheduleItem | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduleItem | null>(null);

  const saveMutation = useSaveScheduleItem();
  const archiveMutation = useArchiveScheduleItem();
  const restoreMutation = useRestoreScheduleItem();
  const bulkMutation = useBulkUpdateScheduleItems();
  const { toast } = useToast();
  const confirm = useConfirm();

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: snapshot.schedule.length,
      scheduled: 0,
      suspended: 0,
      free: 0
    };
    for (const item of snapshot.schedule) {
      counts[item.status] += 1;
    }
    return counts;
  }, [snapshot.schedule]);

  const statusChips: ReadonlyArray<ChipOption<StatusFilter>> = useMemo(
    () => [
      { value: "all", label: "Todos", count: statusCounts.all },
      { value: "scheduled", label: "Programados", count: statusCounts.scheduled },
      { value: "suspended", label: "Suspensos", count: statusCounts.suspended },
      { value: "free", label: "Livres", count: statusCounts.free }
    ],
    [statusCounts]
  );

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = snapshot.schedule.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      return matchesSearch(query, [
        item.title,
        item.ministry,
        item.location,
        item.preacher,
        item.director,
        item.passage,
        item.occasionLabel,
        item.status
      ]);
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
  }, [snapshot, state, statusFilter]);

  const weekGroups = useMemo(() => groupByWeek(list.items), [list.items]);

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

  function openCreateSheet() {
    setEditingId(null);
    setInitialValues(emptyScheduleValues());
    setResetSignal((value) => value + 1);
    setSheetOpen(true);
  }

  function startEdit(item: ScheduleItem) {
    setEditingId(item.id);
    setInitialValues(scheduleToFormValues(item));
    setResetSignal((value) => value + 1);
    setSheetOpen(true);
  }

  function closeSheet() {
    if (editingId === null) {
      clearFormAutosave(SCHEDULE_DRAFT_KEY);
    }
    setEditingId(null);
    setInitialValues(emptyScheduleValues());
    setResetSignal((value) => value + 1);
    setSheetOpen(false);
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
        closeSheet();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui excluir — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleRestore(item: ScheduleItem) {
    try {
      await saveMutation.mutateAsync(withStatus(item, "scheduled"));
      toast(`"${item.title}" voltou para programado.`, { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui restaurar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleConfirmSuspend(reason: string) {
    if (!suspendTarget) return;
    try {
      await saveMutation.mutateAsync(withStatus(suspendTarget, "suspended"));
      toast(`"${suspendTarget.title}" marcado como SUSPENSO.`, { variant: "success" });
      setSuspendTarget(null);
      void reason;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui suspender — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleConfirmReschedule({
    startsAt,
    endsAt,
    reason
  }: {
    startsAt: string;
    endsAt: string;
    reason: string;
  }) {
    if (!rescheduleTarget) return;
    try {
      await saveMutation.mutateAsync(withSchedule(rescheduleTarget, startsAt, endsAt));
      toast(`"${rescheduleTarget.title}" remarcado.`, { variant: "success" });
      setRescheduleTarget(null);
      void reason;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui remarcar — tenta de novo?";
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
        closeSheet();
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
    <div className="schedule-view">
      <ViewHeader
        eyebrow="Programacao"
        title="Programação"
        lead="Cultos, escola biblica e encontros da semana — agrupados pra facilitar a leitura."
        primaryAction={
          <button type="button" className="button primary" onClick={openCreateSheet}>
            <Plus size={16} aria-hidden="true" />
            <span>Novo evento</span>
          </button>
        }
      />

      <FilterChips<StatusFilter>
        value={statusFilter}
        onChange={(value) => {
          setStatusFilter(value);
          onStateChange({ page: 1 });
        }}
        options={statusChips}
        ariaLabel="Filtrar por status"
      />

      <div className="schedule-view-toolbar">
        <ListToolbar
          search={state.search}
          searchLabel="Titulo, ministerio, local ou status"
          sort={state.sort}
          sortOptions={SCHEDULE_SORT_OPTIONS}
          total={list.total}
          onSearch={(search) => onStateChange({ search, page: 1 })}
          onSort={(sort) => onStateChange({ sort, page: 1 })}
        />
      </div>

      {list.items.length === 0 ? (
        <div className="schedule-empty">
          <p className="schedule-empty-title">Nenhum evento encontrado.</p>
          <p className="schedule-empty-desc">
            Ajuste os filtros ou cadastre um novo culto, encontro ou evento.
          </p>
        </div>
      ) : (
        weekGroups.map((group) => (
          <section
            key={group.start}
            className="schedule-week-group"
            aria-label={`Semana de ${shortDayLabel(group.start)}`}
          >
            <header className="schedule-week-header">
              <h2 className="schedule-week-title">
                Semana de {shortDayLabel(group.start)} a {shortDayLabel(group.end)}
              </h2>
              <span className="schedule-week-count">{group.items.length} eventos</span>
            </header>
            <div className="data-cards-grid">
              {group.items.map((item) => (
                <ScheduleCard
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  onToggleSelected={() => toggleSelected(item.id)}
                  onEdit={() => startEdit(item)}
                  onSuspend={() => setSuspendTarget(item)}
                  onReschedule={() => setRescheduleTarget(item)}
                  onRestore={() => handleRestore(item)}
                  onDelete={() => handleDelete(item)}
                  restoring={saveMutation.isPending}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <Pagination list={list} onPageChange={(page) => onStateChange({ page })} />

      {selectionCount > 0 && (
        <div
          className="sticky-action-bar bulk-action-bar schedule-bulk-bar"
          role="region"
          aria-label="Acoes em massa"
        >
          <span className="sticky-action-message bulk-action-bar-count">{selectionCount} selecionados</span>
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
            <button type="button" className="button ghost" onClick={clearSelection} disabled={bulkPending}>
              Limpar selecao
            </button>
          </div>
          {bulkMode !== null && (
            <div className="bulk-action-form schedule-bulk-bar-form">
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
                <p className="bulk-action-info">Marcar {selectionCount} itens como destacados na agenda?</p>
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

      <DetailSheet
        open={sheetOpen}
        title={editingId ? "Editar evento" : "Novo evento"}
        subtitle={editingId ? "Ajuste os detalhes e salve." : "Preencha os campos e salve."}
        onClose={closeSheet}
      >
        <ScheduleForm
          snapshot={snapshot}
          editingId={editingId}
          initialValues={initialValues}
          resetSignal={resetSignal}
          onSaved={closeSheet}
          onCancel={closeSheet}
        />
      </DetailSheet>

      <SuspendScheduleDialog
        item={suspendTarget}
        saving={saveMutation.isPending}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleConfirmSuspend}
      />
      <RescheduleDialog
        item={rescheduleTarget}
        saving={saveMutation.isPending}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleConfirmReschedule}
      />
    </div>
  );
}
