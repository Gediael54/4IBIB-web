import {
  type ChurchRole,
  type Gender,
  type Household,
  type MaritalStatus,
  type Member,
  type MemberDuplicateMatch,
  type MemberRelationship,
  type MembershipStatus,
  type RelationshipType
} from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { Plus, Search, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { FieldGroup } from "../components/FieldGroup";
import DetailSheet from "../components/Layout/DetailSheet";
import FilterChips, { type ChipOption } from "../components/Layout/FilterChips";
import ViewHeader from "../components/Layout/ViewHeader";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { Field, FormActions, Pagination, SelectField, TextAreaField } from "../components/ui";
import MemberCard from "./members/MemberCard";
import {
  useAnonymizeMember,
  useArchiveMember,
  useFindMemberDuplicates,
  useHouseholds,
  useMembers,
  useRelationships,
  useRestoreMember,
  useSaveMember,
  useSaveRelationship,
  useDeleteRelationship
} from "../hooks";
import {
  BR_STATES,
  CHURCH_ROLE_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  MEMBERSHIP_STATUS_OPTIONS
} from "../lib/labels";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "../lib/limits";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  type ListState
} from "../lib/list-state";
import { maskCep, maskCpf, unmaskDigits } from "../lib/format";
import { memberSchema, type MemberFormValues } from "../schemas";

type DefaultFilter = {
  isVolunteer?: boolean;
  householdId?: string;
};

interface MembersViewProps {
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
  defaultFilter?: DefaultFilter;
  defaultTab?: string;
  mode?: "default" | "update";
  title?: string;
}

const DUPLICATE_BLOCKING_REASONS: ReadonlyArray<MemberDuplicateMatch["matchReason"]> = [
  "cpf_match",
  "email_match",
  "phone_match"
];

const MEMBER_TAB_FIELDS: Record<string, ReadonlyArray<keyof MemberFormValues>> = {
  identidade: [
    "fullName",
    "preferredName",
    "birthDate",
    "maritalStatus",
    "gender",
    "photoUrl",
    "cpf",
    "rg",
    "rgIssuer"
  ],
  contato: [
    "email",
    "phone",
    "whatsapp",
    "addressZip",
    "addressNumber",
    "addressStreet",
    "addressComplement",
    "addressNeighborhood",
    "addressCity",
    "addressState"
  ],
  familia: ["householdId"],
  igreja: [
    "churchRole",
    "membershipStatus",
    "joinedAt",
    "baptismDate",
    "baptismLocation",
    "transferredFrom",
    "notes",
    "publicBio"
  ],
  voluntariado: ["isVolunteer", "volunteerMinistries", "volunteerUnavailableDates", "volunteerNotes"],
  profissional: [
    "profession",
    "emergencyContactName",
    "emergencyContactPhone",
    "prayerTopics",
    "spiritualGifts"
  ],
  saude: ["allergies", "medicalNotes", "consentMedicalDataChecked"],
  lgpd: ["consentVersion", "publicDirectory", "dataRetentionUntil"]
};

const MEMBER_TAB_ORDER = [
  "identidade",
  "contato",
  "familia",
  "igreja",
  "voluntariado",
  "profissional",
  "saude",
  "lgpd"
] as const;

function emptyMemberValues(): MemberFormValues {
  return {
    fullName: "",
    preferredName: "",
    birthDate: "",
    maritalStatus: "",
    gender: "",
    photoUrl: "",
    cpf: "",
    rg: "",
    rgIssuer: "",
    email: "",
    phone: "",
    whatsapp: "",
    addressZip: "",
    addressStreet: "",
    addressNumber: "",
    addressComplement: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
    householdId: null,
    churchRole: "membro_comum",
    membershipStatus: "ativo",
    joinedAt: "",
    baptismDate: "",
    baptismLocation: "",
    transferredFrom: "",
    notes: "",
    isVolunteer: false,
    volunteerMinistries: [],
    volunteerUnavailableDates: [],
    volunteerNotes: "",
    profession: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    prayerTopics: [],
    spiritualGifts: [],
    allergies: "",
    medicalNotes: "",
    consentMedicalDataChecked: false,
    consentVersion: "1.0",
    publicDirectory: false,
    publicBio: "",
    dataRetentionUntil: ""
  };
}

function memberToFormValues(item: Member): MemberFormValues {
  return {
    id: item.id,
    fullName: item.fullName,
    preferredName: item.preferredName,
    birthDate: item.birthDate ?? "",
    maritalStatus: (item.maritalStatus ?? "") as MemberFormValues["maritalStatus"],
    gender: (item.gender ?? "") as MemberFormValues["gender"],
    photoUrl: item.photoUrl,
    cpf: item.cpf ?? "",
    rg: item.rg,
    rgIssuer: item.rgIssuer,
    email: item.email,
    phone: item.phone,
    whatsapp: item.whatsapp,
    addressZip: item.address.zip,
    addressStreet: item.address.street,
    addressNumber: item.address.number,
    addressComplement: item.address.complement,
    addressNeighborhood: item.address.neighborhood,
    addressCity: item.address.city,
    addressState: item.address.state,
    householdId: item.householdId,
    churchRole: item.churchRole,
    membershipStatus: item.membershipStatus,
    joinedAt: item.joinedAt ?? "",
    baptismDate: item.baptismDate ?? "",
    baptismLocation: item.baptismLocation,
    transferredFrom: item.transferredFrom,
    notes: item.notes,
    isVolunteer: item.isVolunteer,
    volunteerMinistries: item.volunteerMinistries,
    volunteerUnavailableDates: item.volunteerUnavailableDates,
    volunteerNotes: item.volunteerNotes,
    profession: item.profession,
    emergencyContactName: item.emergencyContactName,
    emergencyContactPhone: item.emergencyContactPhone,
    prayerTopics: item.prayerTopics,
    spiritualGifts: item.spiritualGifts,
    allergies: item.allergies,
    medicalNotes: item.medicalNotes,
    consentMedicalDataChecked: item.consentMedicalDataAt !== null,
    consentVersion: item.consentVersion || "1.0",
    publicDirectory: item.publicDirectory,
    publicBio: item.publicBio,
    dataRetentionUntil: item.dataRetentionUntil ?? ""
  };
}

function buildMemberPayload(
  values: MemberFormValues,
  options: { existing?: Member | null }
): Omit<Member, "id" | "createdAt" | "updatedAt" | "deletedAt"> & { id?: string } {
  const cpfDigits = unmaskDigits(values.cpf);
  const cepDigits = unmaskDigits(values.addressZip);
  const previousMedicalConsent = options.existing?.consentMedicalDataAt ?? null;
  const consentMedicalDataAt = values.consentMedicalDataChecked
    ? (previousMedicalConsent ?? new Date().toISOString())
    : null;
  return {
    id: values.id,
    fullName: values.fullName.trim(),
    preferredName: values.preferredName,
    birthDate: values.birthDate || null,
    maritalStatus: (values.maritalStatus || null) as MaritalStatus | null,
    gender: (values.gender || null) as Gender | null,
    photoUrl: values.photoUrl,
    email: values.email,
    phone: values.phone,
    whatsapp: values.whatsapp,
    cpf: cpfDigits || null,
    rg: values.rg,
    rgIssuer: values.rgIssuer,
    profession: values.profession,
    address: {
      zip: cepDigits,
      street: values.addressStreet,
      number: values.addressNumber,
      complement: values.addressComplement,
      neighborhood: values.addressNeighborhood,
      city: values.addressCity,
      state: values.addressState
    },
    householdId: values.householdId,
    churchRole: values.churchRole as ChurchRole,
    membershipStatus: values.membershipStatus as MembershipStatus,
    joinedAt: values.joinedAt || null,
    baptismDate: values.baptismDate || null,
    baptismLocation: values.baptismLocation,
    transferredFrom: values.transferredFrom,
    emergencyContactName: values.emergencyContactName,
    emergencyContactPhone: values.emergencyContactPhone,
    prayerTopics: values.prayerTopics,
    spiritualGifts: values.spiritualGifts,
    allergies: values.allergies,
    medicalNotes: values.medicalNotes,
    consentMedicalDataAt,
    isVolunteer: values.isVolunteer,
    volunteerMinistries: values.volunteerMinistries,
    volunteerUnavailableDates: values.volunteerUnavailableDates,
    volunteerNotes: values.volunteerNotes,
    notes: values.notes,
    consentGivenAt: options.existing?.consentGivenAt ?? new Date().toISOString(),
    consentVersion: values.consentVersion || "1.0",
    publicDirectory: values.publicDirectory,
    publicBio: values.publicDirectory ? values.publicBio : "",
    dataRetentionUntil: values.dataRetentionUntil || null
  };
}

interface RelationshipsPanelProps {
  editingMember: Member | null;
  membersAll: Member[];
}

type CategoryKey =
  | "conjuge"
  | "pai"
  | "mae"
  | "filhos"
  | "irmaos"
  | "avos"
  | "netos"
  | "tios"
  | "sobrinhos"
  | "responsavel";

interface CategoryDef {
  key: CategoryKey;
  label: string;
  describe: (rel: MemberRelationship, memberId: string) => boolean;
  otherSide: (rel: MemberRelationship, memberId: string) => string;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "conjuge",
    label: "Conjuge",
    describe: (rel) => rel.type === "conjuge",
    otherSide: (rel, memberId) => (rel.fromMemberId === memberId ? rel.toMemberId : rel.fromMemberId)
  },
  {
    key: "pai",
    label: "Pai",
    describe: (rel, memberId) => rel.toMemberId === memberId && rel.type === "pai",
    otherSide: (rel) => rel.fromMemberId
  },
  {
    key: "mae",
    label: "Mae",
    describe: (rel, memberId) => rel.toMemberId === memberId && rel.type === "mae",
    otherSide: (rel) => rel.fromMemberId
  },
  {
    key: "filhos",
    label: "Filhos",
    describe: (rel, memberId) => rel.fromMemberId === memberId && (rel.type === "pai" || rel.type === "mae"),
    otherSide: (rel) => rel.toMemberId
  },
  {
    key: "irmaos",
    label: "Irmaos",
    describe: (rel) => rel.type === "irmao",
    otherSide: (rel, memberId) => (rel.fromMemberId === memberId ? rel.toMemberId : rel.fromMemberId)
  },
  {
    key: "avos",
    label: "Avos",
    describe: (rel, memberId) => rel.toMemberId === memberId && rel.type === "avo",
    otherSide: (rel) => rel.fromMemberId
  },
  {
    key: "netos",
    label: "Netos",
    describe: (rel, memberId) => rel.fromMemberId === memberId && rel.type === "avo",
    otherSide: (rel) => rel.toMemberId
  },
  {
    key: "tios",
    label: "Tios",
    describe: (rel, memberId) => rel.toMemberId === memberId && rel.type === "tio",
    otherSide: (rel) => rel.fromMemberId
  },
  {
    key: "sobrinhos",
    label: "Sobrinhos",
    describe: (rel, memberId) => rel.fromMemberId === memberId && rel.type === "tio",
    otherSide: (rel) => rel.toMemberId
  },
  {
    key: "responsavel",
    label: "Responsavel",
    describe: (rel, memberId) => rel.toMemberId === memberId && rel.type === "responsavel",
    otherSide: (rel) => rel.fromMemberId
  }
];

function buildInsertPayload(
  category: CategoryKey,
  editingMember: Member,
  targetId: string
): { fromMemberId: string; toMemberId: string; type: RelationshipType } {
  const X = editingMember.id;
  switch (category) {
    case "conjuge":
      return { fromMemberId: X, toMemberId: targetId, type: "conjuge" };
    case "pai":
      return { fromMemberId: targetId, toMemberId: X, type: "pai" };
    case "mae":
      return { fromMemberId: targetId, toMemberId: X, type: "mae" };
    case "filhos":
      return {
        fromMemberId: X,
        toMemberId: targetId,
        type: editingMember.gender === "feminino" ? "mae" : "pai"
      };
    case "irmaos":
      return { fromMemberId: X, toMemberId: targetId, type: "irmao" };
    case "avos":
      return { fromMemberId: targetId, toMemberId: X, type: "avo" };
    case "netos":
      return { fromMemberId: X, toMemberId: targetId, type: "avo" };
    case "tios":
      return { fromMemberId: targetId, toMemberId: X, type: "tio" };
    case "sobrinhos":
      return { fromMemberId: X, toMemberId: targetId, type: "tio" };
    case "responsavel":
      return { fromMemberId: targetId, toMemberId: X, type: "responsavel" };
  }
}

function RelationshipsPanel({ editingMember, membersAll }: RelationshipsPanelProps) {
  const memberId = editingMember?.id ?? null;
  const relationshipsQuery = useRelationships(memberId);
  const saveRelationship = useSaveRelationship();
  const deleteRelationship = useDeleteRelationship();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [linkTarget, setLinkTarget] = useState<string>("");

  if (!memberId || !editingMember) {
    return <p className="empty-note">Salve o membro primeiro para registrar vinculos familiares.</p>;
  }

  const items = relationshipsQuery.data ?? [];

  function memberName(id: string): string {
    const found = membersAll.find((entry) => entry.id === id);
    return found?.fullName ?? "(removido)";
  }

  function uniqueOtherIds(category: CategoryDef): { relId: string; otherId: string }[] {
    const seen = new Set<string>();
    const out: { relId: string; otherId: string }[] = [];
    for (const rel of items) {
      if (!category.describe(rel, memberId!)) continue;
      const otherId = category.otherSide(rel, memberId!);
      if (seen.has(otherId)) continue;
      seen.add(otherId);
      out.push({ relId: rel.id, otherId });
    }
    return out;
  }

  async function addToCategory(category: CategoryKey) {
    if (!linkTarget || !editingMember) return;
    if (linkTarget === memberId) {
      toast("Selecione outro membro.", { variant: "warning" });
      return;
    }
    try {
      await saveRelationship.mutateAsync({
        ...buildInsertPayload(category, editingMember, linkTarget),
        startDate: null,
        endDate: null
      });
      toast("Vinculo adicionado.", { variant: "success" });
      setActiveCategory(null);
      setLinkTarget("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar vinculo.";
      toast(message, { variant: "danger" });
    }
  }

  async function removeLink(relId: string) {
    try {
      await deleteRelationship.mutateAsync(relId);
      toast("Vinculo removido.", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao remover.";
      toast(message, { variant: "danger" });
    }
  }

  return (
    <div className="relationships-panel">
      <span className="field-label">Vinculos familiares</span>
      <div className="relationships-grid">
        {CATEGORIES.map((category) => {
          const entries = uniqueOtherIds(category);
          return (
            <section key={category.key} className="relationship-category">
              <h4 className="relationship-category-title">{category.label}</h4>
              <div className="relationship-chips">
                {entries.map(({ relId, otherId }) => (
                  <span key={relId} className="relationship-chip">
                    <span className="relationship-chip-name">{memberName(otherId)}</span>
                    <button
                      type="button"
                      className="relationship-chip-remove"
                      onClick={() => removeLink(relId)}
                      aria-label={`Remover ${memberName(otherId)} de ${category.label}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  className="relationship-chip-add"
                  onClick={() => {
                    setActiveCategory(category.key);
                    setLinkTarget("");
                  }}
                  aria-label={`Adicionar em ${category.label}`}
                >
                  <UserPlus size={14} />
                </button>
              </div>
            </section>
          );
        })}
      </div>
      <Modal
        open={activeCategory !== null}
        onClose={() => setActiveCategory(null)}
        title={
          activeCategory ? `Adicionar em ${CATEGORIES.find((c) => c.key === activeCategory)?.label}` : ""
        }
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="button primary"
              onClick={() => activeCategory && addToCategory(activeCategory)}
              disabled={!linkTarget || saveRelationship.isPending}
            >
              Adicionar
            </button>
            <button type="button" className="button ghost" onClick={() => setActiveCategory(null)}>
              Cancelar
            </button>
          </>
        }
      >
        <SelectField
          label="Membro"
          value={linkTarget}
          onChange={(event) => setLinkTarget(event.currentTarget.value)}
        >
          <option value="">Selecione...</option>
          {membersAll
            .filter((entry) => entry.id !== memberId)
            .map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.fullName}
              </option>
            ))}
        </SelectField>
      </Modal>
    </div>
  );
}

interface ChipInputProps {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

function ChipInput({ label, values, onChange, placeholder }: ChipInputProps) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  }

  function remove(value: string) {
    onChange(values.filter((entry) => entry !== value));
  }

  return (
    <div className="chip-input">
      <span className="field-label">{label}</span>
      {values.length > 0 && (
        <ul className="chip-list">
          {values.map((value) => (
            <li key={value} className="member-tag">
              <span>{value}</span>
              <button type="button" aria-label={`Remover ${value}`} onClick={() => remove(value)}>
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="chip-add">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          maxLength={TEXT_MAX}
        />
        <button type="button" className="button ghost" onClick={add} disabled={!draft.trim()}>
          Adicionar
        </button>
      </div>
    </div>
  );
}

export default function MembersView({
  state,
  onStateChange,
  defaultFilter,
  defaultTab,
  mode = "default",
  title = "Membros"
}: MembersViewProps) {
  const filter = useMemo<DefaultFilter>(() => defaultFilter ?? {}, [defaultFilter]);
  const membersQuery = useMembers(filter);
  const allMembersQuery = useMembers();
  const householdsQuery = useHouseholds();
  const saveMutation = useSaveMember();
  const archiveMutation = useArchiveMember();
  const restoreMutation = useRestoreMember();
  const anonymizeMutation = useAnonymizeMember();
  const findDuplicates = useFindMemberDuplicates();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "ativo" | "voluntario" | "lideranca">("all");
  const [duplicateBlocking, setDuplicateBlocking] = useState<MemberDuplicateMatch | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<MemberDuplicateMatch[]>([]);
  const [forceCreate, setForceCreate] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(defaultTab ?? "identidade");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm<MemberFormValues>({
    resolver: valibotResolver(memberSchema),
    defaultValues: emptyMemberValues()
  });

  const watchedFullName = watch("fullName") ?? "";
  const watchedCpf = watch("cpf") ?? "";
  const watchedEmail = watch("email") ?? "";
  const watchedPhone = watch("phone") ?? "";
  const isVolunteer = watch("isVolunteer");
  const consentMedical = watch("consentMedicalDataChecked");
  const watchedAllergies = watch("allergies") ?? "";
  const watchedMedicalNotes = watch("medicalNotes") ?? "";
  const watchedDataRetentionUntil = watch("dataRetentionUntil") ?? "";
  const volunteerMinistries = watch("volunteerMinistries") ?? [];
  const volunteerUnavailableDates = watch("volunteerUnavailableDates") ?? [];
  const prayerTopics = watch("prayerTopics") ?? [];
  const spiritualGifts = watch("spiritualGifts") ?? [];
  const householdId = watch("householdId");
  const publicDirectoryEnabled = watch("publicDirectory");

  const medicalDataWithoutConsent =
    !consentMedical && (watchedAllergies.trim().length > 0 || watchedMedicalNotes.trim().length > 0);

  const retentionExpiredDate = useMemo(() => {
    if (!watchedDataRetentionUntil) return null;
    const parsed = Date.parse(watchedDataRetentionUntil);
    if (Number.isNaN(parsed)) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed >= today.getTime()) return null;
    return watchedDataRetentionUntil;
  }, [watchedDataRetentionUntil]);

  const [newDate, setNewDate] = useState("");

  const membersAll = useMemo(() => allMembersQuery.data ?? [], [allMembersQuery.data]);
  const filteredMembers = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const households = useMemo(() => householdsQuery.data ?? [], [householdsQuery.data]);

  const editingItem = useMemo(
    () => (editingId ? (membersAll.find((item) => item.id === editingId) ?? null) : null),
    [editingId, membersAll]
  );

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = filteredMembers.filter((item) =>
      matchesSearch(query, [item.fullName, item.preferredName, item.email, item.phone, item.cpf ?? ""])
    );
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "nameDesc") return compareText(right.fullName, left.fullName);
      if (state.sort === "joinedDesc")
        return Date.parse(right.joinedAt ?? "") - Date.parse(left.joinedAt ?? "");
      if (state.sort === "roleAsc")
        return compareText(left.churchRole, right.churchRole) || compareText(left.fullName, right.fullName);
      return compareText(left.fullName, right.fullName);
    });
    return paginateItems(sorted, state.page);
  }, [filteredMembers, state]);

  const dedupTimer = useRef<number | null>(null);
  useEffect(() => {
    if (editingId !== null || forceCreate) {
      setDuplicateBlocking(null);
      setDuplicateWarning([]);
      return;
    }
    if (dedupTimer.current) {
      window.clearTimeout(dedupTimer.current);
    }
    const cpfDigits = unmaskDigits(watchedCpf);
    const fullName = watchedFullName.trim();
    if (!fullName && !cpfDigits && !watchedEmail && !watchedPhone) {
      setDuplicateBlocking(null);
      setDuplicateWarning([]);
      return;
    }
    dedupTimer.current = window.setTimeout(() => {
      findDuplicates.mutate(
        {
          fullName,
          cpf: cpfDigits || null,
          email: watchedEmail,
          phone: watchedPhone
        },
        {
          onSuccess: (matches) => {
            if (matches.length === 0) {
              setDuplicateBlocking(null);
              setDuplicateWarning([]);
              return;
            }
            const blocking = matches.find(
              (match) => match.score >= 0.85 || DUPLICATE_BLOCKING_REASONS.includes(match.matchReason)
            );
            if (blocking) {
              setDuplicateBlocking(blocking);
              setDuplicateWarning([]);
            } else {
              setDuplicateBlocking(null);
              setDuplicateWarning(matches.filter((match) => match.score >= 0.5));
            }
          }
        }
      );
    }, 500);
    return () => {
      if (dedupTimer.current) {
        window.clearTimeout(dedupTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedFullName, watchedCpf, watchedEmail, watchedPhone, editingId, forceCreate]);

  function startEdit(item: Member) {
    setEditingId(item.id);
    setForceCreate(false);
    setDuplicateBlocking(null);
    setDuplicateWarning([]);
    reset(memberToFormValues(item));
    setActiveTab(defaultTab ?? "identidade");
    setSheetOpen(true);
  }

  function openCreate() {
    setEditingId(null);
    setForceCreate(false);
    setDuplicateBlocking(null);
    setDuplicateWarning([]);
    reset(emptyMemberValues());
    setActiveTab(defaultTab ?? "identidade");
    setSheetOpen(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForceCreate(false);
    setDuplicateBlocking(null);
    setDuplicateWarning([]);
    reset(emptyMemberValues());
    setSheetOpen(false);
  }

  async function onSubmit(values: MemberFormValues) {
    if (duplicateBlocking && !forceCreate && editingId === null) {
      toast("Resolva a possivel duplicata antes de salvar.", { variant: "warning" });
      return;
    }
    const allergiesFilled = values.allergies.trim().length > 0;
    const medicalNotesFilled = values.medicalNotes.trim().length > 0;
    if (!values.consentMedicalDataChecked && (allergiesFilled || medicalNotesFilled)) {
      const message = "Marque o consentimento de saude antes de salvar dados medicos.";
      if (allergiesFilled) {
        setError("allergies", { type: "manual", message });
      }
      if (medicalNotesFilled) {
        setError("medicalNotes", { type: "manual", message });
      }
      toast(message, { variant: "warning" });
      return;
    }
    clearErrors(["allergies", "medicalNotes"]);
    try {
      const payload = buildMemberPayload(values, { existing: editingItem });
      await saveMutation.mutateAsync(payload);
      toast(editingId ? "Membro atualizado." : "Membro cadastrado.", { variant: "success" });
      cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui salvar.";
      toast(message, { variant: "danger" });
    }
  }

  async function handleAnonymize() {
    if (!editingItem) return;
    const ok = await confirm({
      title: `Anonimizar dados de ${editingItem.fullName}?`,
      message:
        "Esta acao substitui PII por placeholders e arquiva o registro. NAO pode ser desfeita. O membro perde nome, contato, endereco, etc.",
      confirmText: "Anonimizar",
      destructive: true,
      requireText: "ANONIMIZAR"
    });
    if (!ok) return;
    try {
      await anonymizeMutation.mutateAsync(editingItem.id);
      toast("Dados anonimizados.", { variant: "warning" });
      cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui anonimizar.";
      toast(message, { variant: "danger" });
    }
  }

  async function handleArchive(item: Member) {
    const ok = await confirm({
      title: `Arquivar membro "${item.fullName}"?`,
      message: "O membro sera arquivado e some da listagem ativa. Voce pode restaurar depois.",
      confirmText: "Arquivar",
      destructive: true
    });
    if (!ok) return;
    try {
      await archiveMutation.mutateAsync(item.id);
      toast.undo({
        message: `"${item.fullName}" arquivado.`,
        onUndo: () => restoreMutation.mutate(item.id)
      });
      if (editingId === item.id) cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui arquivar.";
      toast(message, { variant: "danger" });
    }
  }

  function handleAdoptDuplicate(match: MemberDuplicateMatch) {
    const found = membersAll.find((entry) => entry.id === match.memberId);
    if (!found) {
      toast("Membro nao encontrado para edicao.", { variant: "warning" });
      return;
    }
    startEdit(found);
  }

  async function handleMarkAsRelative(match: MemberDuplicateMatch) {
    const formValues = getValues();
    try {
      const payload = buildMemberPayload({ ...formValues, id: undefined }, { existing: null });
      const created = await saveMutation.mutateAsync(payload);
      const newId = (created as Member | undefined)?.id;
      if (!newId) {
        toast("Membro criado, mas vinculo precisa ser feito manualmente.", { variant: "warning" });
        cancelEdit();
        return;
      }
      toast(`Membro criado. Adicione o vinculo familiar com ${match.fullName} pela aba Familia.`, {
        variant: "success"
      });
      setEditingId(newId);
      setDuplicateBlocking(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao criar.";
      toast(message, { variant: "danger" });
    }
  }

  function handleForceCreate() {
    setForceCreate(true);
    setDuplicateBlocking(null);
  }

  function handleAddDate() {
    const trimmed = newDate.trim();
    if (!trimmed) return;
    if (volunteerUnavailableDates.includes(trimmed)) {
      setNewDate("");
      return;
    }
    setValue("volunteerUnavailableDates", [...volunteerUnavailableDates, trimmed], {
      shouldDirty: true,
      shouldValidate: true
    });
    setNewDate("");
  }

  function handleRemoveDate(date: string) {
    setValue(
      "volunteerUnavailableDates",
      volunteerUnavailableDates.filter((entry) => entry !== date),
      { shouldDirty: true, shouldValidate: true }
    );
  }

  const saving = isSubmitting || saveMutation.isPending;

  const tabErrorCounts: Record<string, number> = {};
  for (const tabId of MEMBER_TAB_ORDER) {
    const fields = MEMBER_TAB_FIELDS[tabId] ?? [];
    let count = 0;
    for (const field of fields) {
      if (errors[field as keyof typeof errors]) count += 1;
    }
    tabErrorCounts[tabId] = count;
  }

  function focusFirstTabWithErrors() {
    for (const tabId of MEMBER_TAB_ORDER) {
      if ((tabErrorCounts[tabId] ?? 0) > 0) {
        setActiveTab(tabId);
        return;
      }
    }
  }

  const identidadePanel = (
    <>
      <Field
        label="Nome completo"
        placeholder="Nome completo"
        maxLength={TEXT_MAX}
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <div className="form-grid">
        <Field
          label="Como prefere ser chamado"
          placeholder="Apelido"
          maxLength={TEXT_MAX}
          error={errors.preferredName?.message}
          {...register("preferredName")}
        />
        <Field
          label="Data de nascimento"
          type="date"
          error={errors.birthDate?.message}
          {...register("birthDate")}
        />
      </div>
      <div className="form-grid">
        <SelectField
          label="Estado civil"
          error={errors.maritalStatus?.message}
          {...register("maritalStatus")}
        >
          <option value="">Nao informado</option>
          {MARITAL_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Genero" error={errors.gender?.message} {...register("gender")}>
          <option value="">Nao informado</option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>
      <Field
        label="Foto (URL)"
        type="url"
        placeholder="https://..."
        maxLength={URL_MAX}
        error={errors.photoUrl?.message}
        {...register("photoUrl")}
      />
      <div className="form-grid">
        <Field
          label="CPF"
          placeholder="000.000.000-00"
          value={watchedCpf}
          onChange={(event) =>
            setValue("cpf", maskCpf(event.currentTarget.value), {
              shouldDirty: true,
              shouldValidate: true
            })
          }
          error={errors.cpf?.message}
          maxLength={14}
        />
        <Field label="RG" placeholder="RG" maxLength={TEXT_MAX} {...register("rg")} />
      </div>
      <Field label="Orgao emissor" placeholder="Ex: SSP/PE" maxLength={TEXT_MAX} {...register("rgIssuer")} />
    </>
  );

  const contatoPanel = (
    <>
      <div className="form-grid">
        <Field
          label="Email"
          type="email"
          placeholder="email@exemplo.com"
          maxLength={TEXT_MAX}
          error={errors.email?.message}
          {...register("email")}
        />
        <Field label="Telefone" placeholder="+55 81 ..." maxLength={TEXT_MAX} {...register("phone")} />
      </div>
      <Field label="WhatsApp" placeholder="+55 81 ..." maxLength={TEXT_MAX} {...register("whatsapp")} />
      <div className="form-grid">
        <Field
          label="CEP"
          placeholder="00000-000"
          value={watch("addressZip") ?? ""}
          onChange={(event) =>
            setValue("addressZip", maskCep(event.currentTarget.value), {
              shouldDirty: true,
              shouldValidate: true
            })
          }
          maxLength={9}
        />
        <Field label="Numero" placeholder="Numero" maxLength={20} {...register("addressNumber")} />
      </div>
      <Field label="Rua" placeholder="Rua" maxLength={TEXT_MAX} {...register("addressStreet")} />
      <Field
        label="Complemento"
        placeholder="Complemento"
        maxLength={TEXT_MAX}
        {...register("addressComplement")}
      />
      <div className="form-grid">
        <Field
          label="Bairro"
          placeholder="Bairro"
          maxLength={TEXT_MAX}
          {...register("addressNeighborhood")}
        />
        <Field label="Cidade" placeholder="Cidade" maxLength={TEXT_MAX} {...register("addressCity")} />
      </div>
      <SelectField label="UF" {...register("addressState")}>
        <option value="">UF</option>
        {BR_STATES.map((uf) => (
          <option key={uf} value={uf}>
            {uf}
          </option>
        ))}
      </SelectField>
    </>
  );

  const familiaPanel = (
    <>
      <SelectField
        label="Familia"
        value={householdId ?? ""}
        onChange={(event) => {
          const value = event.currentTarget.value;
          setValue("householdId", value ? value : null, { shouldDirty: true });
        }}
      >
        <option value="">Sem familia cadastrada</option>
        {households.map((house: Household) => (
          <option key={house.id} value={house.id}>
            {house.name}
          </option>
        ))}
      </SelectField>
      <RelationshipsPanel editingMember={editingItem} membersAll={membersAll} />
    </>
  );

  const igrejaPanel = (
    <>
      <div className="form-grid">
        <SelectField label="Funcao" error={errors.churchRole?.message} {...register("churchRole")}>
          {CHURCH_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status de membresia"
          error={errors.membershipStatus?.message}
          {...register("membershipStatus")}
        >
          {MEMBERSHIP_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="form-grid">
        <Field
          label="Data de adesao"
          type="date"
          error={errors.joinedAt?.message}
          {...register("joinedAt")}
        />
        <Field
          label="Data de batismo"
          type="date"
          error={errors.baptismDate?.message}
          {...register("baptismDate")}
        />
      </div>
      <Field
        label="Local de batismo"
        placeholder="Igreja onde foi batizado"
        maxLength={TEXT_MAX}
        {...register("baptismLocation")}
      />
      <Field
        label="Transferido de"
        placeholder="Igreja anterior"
        maxLength={TEXT_MAX}
        {...register("transferredFrom")}
      />
      <TextAreaField
        label="Notas pastorais"
        placeholder="Observacoes pastorais"
        maxLength={TEXTAREA_MAX}
        {...register("notes")}
      />
      {publicDirectoryEnabled ? (
        <>
          <TextAreaField
            label="Bio publica"
            placeholder="Breve apresentacao para o site publico"
            maxLength={500}
            error={errors.publicBio?.message}
            {...register("publicBio")}
          />
          <small className="form-hint">
            Bio curta (1-2 paragrafos) que aparecera no site publico. So aplica a membros visiveis no
            diretorio.
          </small>
        </>
      ) : (
        <small className="form-hint">
          Marque &quot;Exibir no diretorio publico&quot; na aba LGPD para editar a bio publica.
        </small>
      )}
    </>
  );

  const voluntariadoPanel = (
    <>
      <label className="check-row">
        <input type="checkbox" {...register("isVolunteer")} />E voluntario(a)
      </label>
      {isVolunteer && (
        <>
          <ChipInput
            label="Ministerios"
            values={volunteerMinistries}
            onChange={(next) =>
              setValue("volunteerMinistries", next, { shouldDirty: true, shouldValidate: true })
            }
            placeholder="Ex: Louvor"
          />
          <div className="date-chip-section">
            <span className="field-label">Datas indisponiveis</span>
            {volunteerUnavailableDates.length > 0 && (
              <ul className="date-chip-list">
                {volunteerUnavailableDates.map((date) => (
                  <li key={date} className="date-chip">
                    <span>{date}</span>
                    <button
                      type="button"
                      className="date-chip-remove"
                      aria-label={`Remover data ${date}`}
                      onClick={() => handleRemoveDate(date)}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="date-chip-add">
              <input
                type="date"
                value={newDate}
                onChange={(event) => setNewDate(event.currentTarget.value)}
                aria-label="Nova data indisponivel"
              />
              <button type="button" className="button ghost" onClick={handleAddDate} disabled={!newDate}>
                Adicionar data
              </button>
            </div>
          </div>
          <TextAreaField
            label="Notas de voluntariado"
            placeholder="Restricoes, preferencias..."
            maxLength={TEXTAREA_MAX}
            {...register("volunteerNotes")}
          />
        </>
      )}
    </>
  );

  const profissionalPanel = (
    <>
      <Field label="Profissao" placeholder="Profissao" maxLength={TEXT_MAX} {...register("profession")} />
      <div className="form-grid">
        <Field
          label="Contato de emergencia"
          placeholder="Nome"
          maxLength={TEXT_MAX}
          {...register("emergencyContactName")}
        />
        <Field
          label="Telefone de emergencia"
          placeholder="+55 81 ..."
          maxLength={TEXT_MAX}
          {...register("emergencyContactPhone")}
        />
      </div>
      <ChipInput
        label="Topicos de oracao"
        values={prayerTopics}
        onChange={(next) => setValue("prayerTopics", next, { shouldDirty: true, shouldValidate: true })}
        placeholder="Ex: Familia"
      />
      <ChipInput
        label="Dons espirituais"
        values={spiritualGifts}
        onChange={(next) => setValue("spiritualGifts", next, { shouldDirty: true, shouldValidate: true })}
        placeholder="Ex: Ensino"
      />
    </>
  );

  const saudePanel = (
    <>
      <p className="consent-warning">
        Dados de saude sao categoria especial (LGPD Art.11) — so use se houver consentimento explicito do
        membro.
      </p>
      {medicalDataWithoutConsent && (
        <div className="lgpd-banner lgpd-banner-warning" role="alert">
          Atencao: dados de saude sao categoria especial (LGPD Art.11). Marque o consentimento explicito antes
          de salvar.
        </div>
      )}
      <TextAreaField
        label="Alergias"
        placeholder="Alergias conhecidas"
        maxLength={TEXTAREA_MAX}
        error={errors.allergies?.message}
        {...register("allergies")}
      />
      <TextAreaField
        label="Notas medicas"
        placeholder="Restricoes ou condicoes relevantes"
        maxLength={TEXTAREA_MAX}
        error={errors.medicalNotes?.message}
        {...register("medicalNotes")}
      />
      <label className="check-row">
        <input type="checkbox" {...register("consentMedicalDataChecked")} />
        Consinto que dados de saude sejam tratados
      </label>
      {editingItem?.consentMedicalDataAt && (
        <p className="form-hint">
          Consentimento medico registrado em{" "}
          {new Date(editingItem.consentMedicalDataAt).toLocaleString("pt-BR")}
        </p>
      )}
      <small className="form-hint">
        {consentMedical ? "" : "Sem consentimento — campos serao limpos no servidor."}
      </small>
    </>
  );

  const lgpdPanel = (
    <>
      <Field
        label="Consentimento dado em"
        type="text"
        readOnly
        value={
          editingItem?.consentGivenAt
            ? new Date(editingItem.consentGivenAt).toLocaleString("pt-BR")
            : "Sera registrado no salvamento"
        }
      />
      <Field
        label="Versao do consentimento"
        placeholder="1.0"
        maxLength={40}
        {...register("consentVersion")}
      />
      <label className="check-row">
        <input type="checkbox" {...register("publicDirectory")} />
        Exibir no diretorio publico
      </label>
      <small className="form-hint">
        Permite que este membro apareca em listagens publicas (ex: bio de pastores, equipe de lideranca).
        Default off por LGPD.
      </small>
      <Field label="Reter dados ate" type="date" {...register("dataRetentionUntil")} />
      {editingItem && (
        <div className="lgpd-anonymize-row">
          <button
            type="button"
            className="button danger"
            onClick={handleAnonymize}
            disabled={anonymizeMutation.isPending}
          >
            Anonimizar dados
          </button>
          <small className="form-hint">
            Substitui PII por placeholders e arquiva o registro. Acao irreversivel.
          </small>
        </div>
      )}
    </>
  );

  const filteredVisible = useMemo(() => {
    if (statusFilter === "all") return list.items;
    if (statusFilter === "ativo") return list.items.filter((item) => item.membershipStatus === "ativo");
    if (statusFilter === "voluntario") return list.items.filter((item) => item.isVolunteer);
    if (statusFilter === "lideranca") {
      const leadership = new Set(["pastor", "pastor_auxiliar", "presbitero", "diacono"]);
      return list.items.filter((item) => leadership.has(item.churchRole));
    }
    return list.items;
  }, [list.items, statusFilter]);

  const filterCounts = useMemo(() => {
    const ativo = list.items.filter((i) => i.membershipStatus === "ativo").length;
    const voluntario = list.items.filter((i) => i.isVolunteer).length;
    const leadership = new Set(["pastor", "pastor_auxiliar", "presbitero", "diacono"]);
    const lideranca = list.items.filter((i) => leadership.has(i.churchRole)).length;
    return { all: list.items.length, ativo, voluntario, lideranca };
  }, [list.items]);

  const filterChipOptions: ReadonlyArray<ChipOption<typeof statusFilter>> = [
    { value: "all", label: "Todos", count: filterCounts.all },
    { value: "ativo", label: "Ativos", count: filterCounts.ativo },
    { value: "voluntario", label: "Voluntários", count: filterCounts.voluntario },
    { value: "lideranca", label: "Liderança", count: filterCounts.lideranca }
  ];

  return (
    <section className="apple-view">
      <ViewHeader
        eyebrow={defaultFilter?.isVolunteer ? "Equipe" : "Cadastro"}
        title={title}
        lead="Cadastre membros, voluntários e liderança. Use os filtros para navegar."
        primaryAction={
          <button type="button" className="button primary" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            <span>Nova pessoa</span>
          </button>
        }
      />

      <div className="members-toolbar">
        <div className="members-search">
          <Search size={16} aria-hidden="true" className="members-search-icon" />
          <input
            type="search"
            value={state.search}
            placeholder="Buscar por nome, email, CPF ou telefone"
            onChange={(event) => onStateChange({ search: event.target.value, page: 1 })}
            aria-label="Buscar membros"
          />
        </div>
      </div>

      <FilterChips
        value={statusFilter}
        onChange={setStatusFilter}
        options={filterChipOptions}
        ariaLabel="Filtrar por situação"
      />

      {filteredVisible.length === 0 ? (
        <EmptyState
          icon={<Users size={32} aria-hidden="true" />}
          title="Sem membros cadastrados."
          description="Cadastre o primeiro membro clicando em Nova pessoa."
        />
      ) : (
        <div className="members-grid">
          {filteredVisible.map((item) => (
            <MemberCard key={item.id} member={item} onEdit={startEdit} onDelete={handleArchive} />
          ))}
        </div>
      )}

      {list.total > list.items.length && (
        <Pagination list={list} onPageChange={(page) => onStateChange({ page })} />
      )}

      <DetailSheet open={sheetOpen} title={editingId ? "Editar pessoa" : "Nova pessoa"} onClose={cancelEdit}>
        <form
          key={editingId ?? "new-member"}
          className="editor-form member-form"
          onSubmit={handleSubmit(onSubmit, () => focusFirstTabWithErrors())}
          noValidate
        >
          {mode === "update" && editingItem && (
            <p className="update-hint">
              Atualizando dados de <strong>{editingItem.fullName}</strong>. Preencha apenas os campos novos —
              os existentes serao mantidos.
            </p>
          )}
          {retentionExpiredDate && (
            <div className="lgpd-banner lgpd-banner-danger" role="alert">
              Retencao de dados expirou em {new Date(retentionExpiredDate).toLocaleDateString("pt-BR")}.
              Considere anonimizar ou atualizar consent.
            </div>
          )}
          {duplicateWarning.length > 0 && !duplicateBlocking && (
            <div className="dedup-banner" role="alert">
              <span>
                Encontramos {duplicateWarning.length} possivel(is) registro(s) parecido(s).{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setShowCandidates((value) => !value)}
                >
                  {showCandidates ? "Ocultar" : "Ver"} candidatos
                </button>
              </span>
              {showCandidates && (
                <ul className="dedup-candidates">
                  {duplicateWarning.map((match) => (
                    <li key={match.memberId}>
                      {match.fullName} ({Math.round(match.score * 100)}%)
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <FieldGroup
            defaultGroup={defaultTab}
            activeGroup={activeTab}
            onActiveChange={setActiveTab}
            groups={[
              {
                id: "identidade",
                label: "Identidade",
                content: identidadePanel,
                errorCount: tabErrorCounts.identidade
              },
              {
                id: "contato",
                label: "Contato",
                content: contatoPanel,
                errorCount: tabErrorCounts.contato
              },
              {
                id: "familia",
                label: "Familia",
                content: familiaPanel,
                errorCount: tabErrorCounts.familia
              },
              { id: "igreja", label: "Igreja", content: igrejaPanel, errorCount: tabErrorCounts.igreja },
              {
                id: "voluntariado",
                label: "Voluntariado",
                content: voluntariadoPanel,
                errorCount: tabErrorCounts.voluntariado
              },
              {
                id: "profissional",
                label: "Profissional",
                content: profissionalPanel,
                errorCount: tabErrorCounts.profissional
              },
              { id: "saude", label: "Saude", content: saudePanel, errorCount: tabErrorCounts.saude },
              { id: "lgpd", label: "LGPD", content: lgpdPanel, errorCount: tabErrorCounts.lgpd }
            ]}
          />
          <FormActions saving={saving} onCancel={cancelEdit} />
        </form>
      </DetailSheet>

      {duplicateBlocking && (
        <Modal
          open={true}
          onClose={() => setDuplicateBlocking(null)}
          title={`Possivel duplicata: ${duplicateBlocking.fullName}`}
          size="md"
          footer={
            <>
              <button
                type="button"
                className="button primary"
                onClick={() => handleAdoptDuplicate(duplicateBlocking)}
              >
                Atualizar {duplicateBlocking.fullName}
              </button>
              <button
                type="button"
                className="button ghost"
                onClick={() => handleMarkAsRelative(duplicateBlocking)}
              >
                Marcar como parente
              </button>
              <button type="button" className="button ghost" onClick={handleForceCreate}>
                Continuar criando duplicata
              </button>
            </>
          }
        >
          <p>
            Já existe um registro com dados muito parecidos:
            <strong> {duplicateBlocking.fullName}</strong> ({Math.round(duplicateBlocking.score * 100)}% de
            similaridade, {duplicateBlocking.matchReason}).
          </p>
          <p>Como prefere prosseguir?</p>
        </Modal>
      )}
    </section>
  );
}
