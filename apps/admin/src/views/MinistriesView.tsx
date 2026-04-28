import type { Ministry, SiteSnapshot } from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CrudPanel,
  Field,
  FormActions,
  ItemRow,
  ListToolbar,
  Pagination,
  TextAreaField
} from "../components/ui";
import { useDeleteMinistry, useSaveMinistry } from "../hooks";
import { ministrySchema, type MinistryFormValues } from "../schemas";
import {
  compareText,
  matchesSearch,
  MINISTRY_SORT_OPTIONS,
  normalizeSearch,
  paginateItems,
  TEXT_MAX,
  TEXTAREA_MAX,
  uniqueSorted,
  type ListState
} from "../utils";

interface MinistriesViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

function emptyMinistryValues(): MinistryFormValues {
  return {
    name: "",
    summary: "",
    meetingTime: "",
    contact: "",
    color: "#0f766e"
  };
}

function ministryToFormValues(item: Ministry): MinistryFormValues {
  return {
    name: item.name,
    summary: item.summary,
    meetingTime: item.meetingTime,
    contact: item.contact,
    color: item.color
  };
}

export default function MinistriesView({ snapshot, state, onStateChange }: MinistriesViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const saveMutation = useSaveMinistry();
  const deleteMutation = useDeleteMinistry();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<MinistryFormValues>({
    resolver: zodResolver(ministrySchema),
    defaultValues: emptyMinistryValues()
  });

  const ministryContacts = useMemo(
    () => uniqueSorted(snapshot.ministries.map((item) => item.contact)),
    [snapshot]
  );

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = snapshot.ministries.filter((item) =>
      matchesSearch(query, [item.name, item.summary, item.meetingTime, item.contact])
    );
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "meetingTimeAsc") {
        return compareText(left.meetingTime, right.meetingTime);
      }
      if (state.sort === "contactAsc") {
        return compareText(left.contact, right.contact);
      }
      return compareText(left.name, right.name);
    });
    return paginateItems(sorted, state.page);
  }, [snapshot, state]);

  function startEdit(item: Ministry) {
    setEditingId(item.id);
    reset(ministryToFormValues(item));
  }

  function cancelEdit() {
    setEditingId(null);
    reset(emptyMinistryValues());
  }

  async function onSubmit(values: MinistryFormValues) {
    await saveMutation.mutateAsync({
      id: editingId ?? undefined,
      name: values.name,
      summary: values.summary,
      meetingTime: values.meetingTime,
      contact: values.contact,
      color: values.color
    });
    cancelEdit();
  }

  async function handleDelete(item: Ministry) {
    if (!window.confirm(`Excluir o ministerio "${item.name}"?`)) {
      return;
    }
    await deleteMutation.mutateAsync(item.id);
    if (editingId === item.id) {
      cancelEdit();
    }
  }

  const saving = isSubmitting || saveMutation.isPending;

  return (
    <CrudPanel
      title="Ministerios"
      items={list.items}
      toolbar={
        <ListToolbar
          search={state.search}
          searchLabel="Nome, resumo, horario ou contato"
          sort={state.sort}
          sortOptions={MINISTRY_SORT_OPTIONS}
          total={list.total}
          onSearch={(search) => onStateChange({ search, page: 1 })}
          onSort={(sort) => onStateChange({ sort, page: 1 })}
        />
      }
      footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
      emptyLabel="Nenhum ministerio encontrado."
      renderItem={(item) => (
        <ItemRow key={item.id} title={item.name} detail={item.meetingTime}>
          <button onClick={() => startEdit(item)} type="button">
            Editar
          </button>
          <button
            onClick={() => handleDelete(item)}
            type="button"
            aria-label={`Excluir ministerio ${item.name}`}
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </ItemRow>
      )}
    >
      <form className="editor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-grid">
          <Field
            label="Nome"
            placeholder="Nome"
            maxLength={TEXT_MAX}
            error={errors.name?.message}
            {...register("name")}
          />
          <Field
            label="Horario"
            placeholder="Horario"
            maxLength={TEXT_MAX}
            error={errors.meetingTime?.message}
            {...register("meetingTime")}
          />
        </div>
        <TextAreaField
          label="Resumo"
          placeholder="Resumo"
          maxLength={TEXTAREA_MAX}
          error={errors.summary?.message}
          {...register("summary")}
        />
        <div className="form-grid">
          <Field
            label="Contato"
            list="ministry-contacts"
            placeholder="Contato"
            maxLength={TEXT_MAX}
            error={errors.contact?.message}
            {...register("contact")}
          />
          <Field label="Cor" type="color" error={errors.color?.message} {...register("color")} />
        </div>
        <datalist id="ministry-contacts">
          {ministryContacts.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        {saveMutation.error && (
          <p className="form-error">
            {saveMutation.error instanceof Error ? saveMutation.error.message : "Falha ao salvar."}
          </p>
        )}
        <FormActions saving={saving} onCancel={cancelEdit} />
      </form>
    </CrudPanel>
  );
}
