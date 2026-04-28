import {
  formatDateLabel,
  formatInputDateTime,
  formatTimeRange,
  inputDateTimeToIso,
  type AdminSession,
  type Announcement,
  type AnnouncementCategory,
  type ChurchProfile,
  type Ministry,
  type PrayerRequest,
  type ScheduleItem,
  type SiteSnapshot
} from "@4ibib/core";
import {
  CalendarDays,
  Church,
  ClipboardList,
  HeartHandshake,
  LoaderCircle,
  LogOut,
  Megaphone,
  Save,
  Trash2,
  UsersRound
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";
import { createRoot } from "react-dom/client";
import { createBackend } from "./backend";
import "./styles.css";

const DEV_PREFILL = import.meta.env.DEV
  && import.meta.env.VITE_MOCK_ADMIN_EMAIL
  && import.meta.env.VITE_MOCK_ADMIN_PASSWORD
  ? {
      email: import.meta.env.VITE_MOCK_ADMIN_EMAIL,
      password: import.meta.env.VITE_MOCK_ADMIN_PASSWORD
    }
  : null;

const backend = createBackend();
const showDevPrefill = DEV_PREFILL !== null && backend.mode === "mock";

const TEXT_MAX = 200;
const TEXTAREA_MAX = 2000;
const URL_MAX = 500;
const PAGE_SIZE = 8;

type ListView = "announcements" | "schedule" | "ministries" | "prayers";

interface ListState {
  search: string;
  sort: string;
  page: number;
}

interface VisibleList<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

const INITIAL_LIST_STATE: Record<ListView, ListState> = {
  announcements: { search: "", sort: "publishedDesc", page: 1 },
  schedule: { search: "", sort: "startsAsc", page: 1 },
  ministries: { search: "", sort: "nameAsc", page: 1 },
  prayers: { search: "", sort: "createdDesc", page: 1 }
};

const ANNOUNCEMENT_SORT_OPTIONS = [
  { value: "publishedDesc", label: "Mais recentes" },
  { value: "publishedAsc", label: "Mais antigos" },
  { value: "titleAsc", label: "Titulo A-Z" },
  { value: "categoryAsc", label: "Categoria A-Z" }
];

const SCHEDULE_SORT_OPTIONS = [
  { value: "startsAsc", label: "Data crescente" },
  { value: "startsDesc", label: "Data decrescente" },
  { value: "titleAsc", label: "Titulo A-Z" },
  { value: "ministryAsc", label: "Ministerio A-Z" },
  { value: "statusAsc", label: "Status A-Z" }
];

const MINISTRY_SORT_OPTIONS = [
  { value: "nameAsc", label: "Nome A-Z" },
  { value: "meetingTimeAsc", label: "Horario A-Z" },
  { value: "contactAsc", label: "Contato A-Z" }
];

const PRAYER_SORT_OPTIONS = [
  { value: "createdDesc", label: "Mais recentes" },
  { value: "createdAsc", label: "Mais antigos" },
  { value: "statusAsc", label: "Status A-Z" },
  { value: "nameAsc", label: "Nome A-Z" }
];

const PRAYER_STATUS_OPTIONS: Array<{ value: PrayerRequest["status"] | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "em_oracao", label: "Em oracao" },
  { value: "concluido", label: "Concluido" }
];

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );
}

function formatScheduleDetail(item: ScheduleItem): string {
  const base = `${formatDateLabel(item.startsAt)} - ${formatTimeRange(item.startsAt, item.endsAt)} - ${item.ministry}`;
  if (item.status === "suspended") return `${base} (SUSPENSO)`;
  if (item.status === "free") return `${base} (LIVRE)`;
  return base;
}

function formatDateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function matchesSearch(query: string, values: string[]): boolean {
  if (!query) {
    return true;
  }

  return values.some((value) => normalizeSearch(value).includes(query));
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "pt-BR");
}

function paginateItems<T>(items: T[], page: number): VisibleList<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * PAGE_SIZE;

  return {
    items: items.slice(start, start + PAGE_SIZE),
    total: items.length,
    page: safePage,
    pageCount
  };
}

function normalizeOptionalHttpUrl(value: string, label: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
    return url.toString();
  } catch {
    throw new Error(`Informe uma URL http/https valida para ${label}.`);
  }
}

type AdminView = "dashboard" | "announcements" | "schedule" | "ministries" | "profile" | "prayers";

function emptyAnnouncement(): Announcement {
  return {
    id: "",
    title: "",
    summary: "",
    category: "geral",
    publishedAt: new Date().toISOString(),
    pinned: false,
    ctaLabel: "",
    ctaUrl: ""
  };
}

function emptyScheduleItem(): ScheduleItem {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  start.setHours(19, 30, 0, 0);
  const end = new Date(start);
  end.setHours(21, 0, 0, 0);

  return {
    id: "",
    title: "",
    ministry: "",
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    location: "Templo principal",
    summary: "",
    preacher: "",
    director: "",
    passage: "",
    specialDate: "",
    googleEventId: "",
    status: "scheduled",
    featured: false
  };
}

function emptyMinistry(): Ministry {
  return {
    id: "",
    name: "",
    summary: "",
    meetingTime: "",
    contact: "",
    color: "#0f766e"
  };
}

function App() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [snapshot, setSnapshot] = useState<SiteSnapshot | null>(null);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [view, setView] = useState<AdminView>("dashboard");
  const [announcementDraft, setAnnouncementDraft] = useState<Announcement>(emptyAnnouncement);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleItem>(emptyScheduleItem);
  const [ministryDraft, setMinistryDraft] = useState<Ministry>(emptyMinistry);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [listState, setListState] = useState<Record<ListView, ListState>>(INITIAL_LIST_STATE);
  const [prayerStatusFilter, setPrayerStatusFilter] = useState<PrayerRequest["status"] | "all">("all");

  useEffect(() => {
    return backend.auth.subscribe((nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = "/";
    document.head.append(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    if (session) {
      refresh();
    }
  }, [session]);

  const stats = useMemo(() => {
    return {
      announcements: snapshot?.announcements.length ?? 0,
      schedule: snapshot?.schedule.length ?? 0,
      ministries: snapshot?.ministries.length ?? 0,
      prayers: prayers.length
    };
  }, [snapshot, prayers]);

  const ministryNames = useMemo(
    () =>
      uniqueSorted([
        ...(snapshot?.ministries.map((item) => item.name) ?? []),
        ...(snapshot?.schedule.map((item) => item.ministry) ?? [])
      ]),
    [snapshot]
  );

  const scheduleLocations = useMemo(
    () => uniqueSorted(snapshot?.schedule.map((item) => item.location) ?? []),
    [snapshot]
  );

  const schedulePreachers = useMemo(
    () => uniqueSorted(snapshot?.schedule.map((item) => item.preacher) ?? []),
    [snapshot]
  );

  const scheduleDirectors = useMemo(
    () => uniqueSorted(snapshot?.schedule.map((item) => item.director) ?? []),
    [snapshot]
  );

  const announcementList = useMemo(() => {
    const state = listState.announcements;
    const query = normalizeSearch(state.search);
    const filtered = (snapshot?.announcements ?? []).filter((item) =>
      matchesSearch(query, [item.title, item.summary, item.category])
    );
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "publishedAsc") {
        return Date.parse(left.publishedAt) - Date.parse(right.publishedAt);
      }
      if (state.sort === "titleAsc") {
        return compareText(left.title, right.title);
      }
      if (state.sort === "categoryAsc") {
        return compareText(left.category, right.category);
      }
      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    });
    return paginateItems(sorted, state.page);
  }, [snapshot, listState.announcements]);

  const scheduleList = useMemo(() => {
    const state = listState.schedule;
    const query = normalizeSearch(state.search);
    const filtered = (snapshot?.schedule ?? []).filter((item) =>
      matchesSearch(query, [
        item.title,
        item.ministry,
        item.location,
        item.preacher,
        item.director,
        item.passage,
        item.specialDate,
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
  }, [snapshot, listState.schedule]);

  const ministryList = useMemo(() => {
    const state = listState.ministries;
    const query = normalizeSearch(state.search);
    const filtered = (snapshot?.ministries ?? []).filter((item) =>
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
  }, [snapshot, listState.ministries]);

  const prayerList = useMemo(() => {
    const state = listState.prayers;
    const query = normalizeSearch(state.search);
    const filtered = prayers.filter((item) => {
      const statusMatches = prayerStatusFilter === "all" || item.status === prayerStatusFilter;
      return statusMatches && matchesSearch(query, [item.name, item.contact, item.message, item.status]);
    });
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "createdAsc") {
        return Date.parse(left.createdAt) - Date.parse(right.createdAt);
      }
      if (state.sort === "statusAsc") {
        return compareText(left.status, right.status);
      }
      if (state.sort === "nameAsc") {
        return compareText(left.name, right.name);
      }
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
    return paginateItems(sorted, state.page);
  }, [prayers, listState.prayers, prayerStatusFilter]);

  function updateListState(viewName: ListView, patch: Partial<ListState>) {
    setListState((current) => ({
      ...current,
      [viewName]: {
        ...current[viewName],
        ...patch
      }
    }));
  }

  async function refresh() {
    const [nextSnapshot, nextPrayers] = await Promise.all([
      backend.content.getSnapshot(),
      backend.content.listPrayerRequests()
    ]);
    setSnapshot(nextSnapshot);
    setPrayers(nextPrayers);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const formData = new FormData(event.currentTarget);

    try {
      await backend.auth.signIn(
        String(formData.get("email") ?? ""),
        String(formData.get("password") ?? "")
      );
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "Falha ao entrar.");
    }
  }

  async function handleLogout() {
    await backend.auth.signOut();
    setSnapshot(null);
  }

  async function saveAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    await backend.content.saveAnnouncement({
      id: announcementDraft.id || undefined,
      title: String(formData.get("title") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      category: String(formData.get("category") ?? "geral") as AnnouncementCategory,
      publishedAt: inputDateTimeToIso(String(formData.get("publishedAt"))),
      pinned: formData.get("pinned") === "on",
      ctaLabel: String(formData.get("ctaLabel") ?? ""),
      ctaUrl: String(formData.get("ctaUrl") ?? "")
    });
    setAnnouncementDraft(emptyAnnouncement());
    await refresh();
    setSaving(false);
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    await backend.content.saveScheduleItem({
      id: scheduleDraft.id || undefined,
      title: String(formData.get("title") ?? ""),
      ministry: String(formData.get("ministry") ?? ""),
      startsAt: inputDateTimeToIso(String(formData.get("startsAt"))),
      endsAt: inputDateTimeToIso(String(formData.get("endsAt"))),
      location: String(formData.get("location") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      preacher: String(formData.get("preacher") ?? ""),
      director: String(formData.get("director") ?? ""),
      passage: String(formData.get("passage") ?? ""),
      specialDate: String(formData.get("specialDate") ?? ""),
      googleEventId: scheduleDraft.googleEventId,
      status: String(formData.get("status") ?? "scheduled") as ScheduleItem["status"],
      featured: formData.get("featured") === "on"
    });
    setScheduleDraft(emptyScheduleItem());
    await refresh();
    setSaving(false);
  }

  async function saveMinistry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    await backend.content.saveMinistry({
      id: ministryDraft.id || undefined,
      name: String(formData.get("name") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      meetingTime: String(formData.get("meetingTime") ?? ""),
      contact: String(formData.get("contact") ?? ""),
      color: String(formData.get("color") ?? "#0f766e")
    });
    setMinistryDraft(emptyMinistry());
    await refresh();
    setSaving(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!snapshot) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setProfileError("");

    let mapsUrl = "";
    try {
      mapsUrl = normalizeOptionalHttpUrl(String(formData.get("mapsUrl") ?? ""), "Google Maps");
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : "URL invalida.");
      return;
    }

    const nextProfile: ChurchProfile = {
      ...snapshot.profile,
      name: String(formData.get("name") ?? ""),
      shortName: String(formData.get("shortName") ?? ""),
      tagline: String(formData.get("tagline") ?? ""),
      city: String(formData.get("city") ?? ""),
      pastorName: String(formData.get("pastorName") ?? ""),
      address: String(formData.get("address") ?? ""),
      email: String(formData.get("email") ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? ""),
      instagramUrl: String(formData.get("instagramUrl") ?? ""),
      youtubeUrl: String(formData.get("youtubeUrl") ?? ""),
      mapsUrl,
      heroVerse: String(formData.get("heroVerse") ?? ""),
      mission: String(formData.get("mission") ?? ""),
      foundedText: String(formData.get("foundedText") ?? "")
    };

    setSaving(true);
    await backend.content.updateProfile(nextProfile);
    await refresh();
    setSaving(false);
  }

  async function removeAnnouncement(item: Announcement) {
    if (!window.confirm(`Excluir o aviso "${item.title}"?`)) {
      return;
    }
    await backend.content.deleteAnnouncement(item.id);
    if (announcementDraft.id === item.id) {
      setAnnouncementDraft(emptyAnnouncement());
    }
    await refresh();
  }

  async function removeScheduleItem(item: ScheduleItem) {
    if (!window.confirm(`Excluir "${item.title}" da programacao?`)) {
      return;
    }
    await backend.content.deleteScheduleItem(item.id);
    if (scheduleDraft.id === item.id) {
      setScheduleDraft(emptyScheduleItem());
    }
    await refresh();
  }

  async function removeMinistry(item: Ministry) {
    if (!window.confirm(`Excluir o ministerio "${item.name}"?`)) {
      return;
    }
    await backend.content.deleteMinistry(item.id);
    if (ministryDraft.id === item.id) {
      setMinistryDraft(emptyMinistry());
    }
    await refresh();
  }

  async function updatePrayerStatus(id: string, status: PrayerRequest["status"]) {
    await backend.content.updatePrayerRequestStatus(id, status);
    await refresh();
  }

  if (!authReady) {
    return (
      <main className="loading">
        <LoaderCircle className="spin" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <img src="/logo.png" alt="" className="login-logo" />
          <p className="eyebrow">Painel da igreja</p>
          <h1>Entrar no admin</h1>
          <form onSubmit={handleLogin}>
            <label>
              Email
              <input
                name="email"
                type="email"
                defaultValue={showDevPrefill ? DEV_PREFILL.email : ""}
                autoComplete="email"
                maxLength={TEXT_MAX}
                required
              />
            </label>
            <label>
              Senha
              <input
                name="password"
                type="password"
                defaultValue={showDevPrefill ? DEV_PREFILL.password : ""}
                autoComplete="current-password"
                maxLength={TEXT_MAX}
                required
              />
            </label>
            {authError && <p className="form-error">{authError}</p>}
            <button className="button primary" type="submit">
              Entrar
            </button>
          </form>
          {showDevPrefill && (
            <p className="login-hint">Modo demonstracao: use as credenciais ja preenchidas.</p>
          )}
        </section>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="loading">
        <LoaderCircle className="spin" />
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="" className="sidebar-logo" />
          <div>
            <strong>{snapshot.profile.shortName}</strong>
            <span>{session.email}</span>
          </div>
        </div>
        <nav>
          <NavButton current={view} target="dashboard" icon={<ClipboardList />} label="Resumo" onClick={setView} />
          <NavButton current={view} target="announcements" icon={<Megaphone />} label="Avisos" onClick={setView} />
          <NavButton current={view} target="schedule" icon={<CalendarDays />} label="Programacao" onClick={setView} />
          <NavButton current={view} target="ministries" icon={<UsersRound />} label="Ministerios" onClick={setView} />
          <NavButton current={view} target="profile" icon={<Church />} label="Igreja" onClick={setView} />
          <NavButton current={view} target="prayers" icon={<HeartHandshake />} label="Oracao" onClick={setView} />
        </nav>
        <button className="sidebar-logout" onClick={handleLogout} type="button">
          <LogOut size={18} /> Sair
        </button>
      </aside>

      <section className="workspace">
        {view === "dashboard" && (
          <>
            <header className="workspace-heading">
              <div>
                <p className="eyebrow">Operacao</p>
                <h1>Resumo do conteudo</h1>
              </div>
            </header>
            <div className="stats-grid">
              <Stat label="Avisos" value={stats.announcements} />
              <Stat label="Eventos" value={stats.schedule} />
              <Stat label="Ministerios" value={stats.ministries} />
              <Stat label="Pedidos de oracao" value={stats.prayers} />
            </div>
          </>
        )}

        {view === "announcements" && (
          <CrudPanel
            title="Avisos"
            items={announcementList.items}
            toolbar={
              <ListToolbar
                search={listState.announcements.search}
                searchLabel="Titulo, resumo ou categoria"
                sort={listState.announcements.sort}
                sortOptions={ANNOUNCEMENT_SORT_OPTIONS}
                total={announcementList.total}
                onSearch={(search) => updateListState("announcements", { search, page: 1 })}
                onSort={(sort) => updateListState("announcements", { sort, page: 1 })}
              />
            }
            footer={
              <Pagination
                list={announcementList}
                onPageChange={(page) => updateListState("announcements", { page })}
              />
            }
            emptyLabel="Nenhum aviso encontrado."
            renderItem={(item) => (
              <ItemRow key={item.id} title={item.title} detail={item.category}>
                <button onClick={() => setAnnouncementDraft(item)} type="button">Editar</button>
                <button
                  onClick={() => removeAnnouncement(item)}
                  type="button"
                  aria-label={`Excluir aviso ${item.title}`}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </ItemRow>
            )}
          >
            <form
              key={announcementDraft.id || "new-announcement"}
              className="editor-form"
              onSubmit={saveAnnouncement}
            >
              <Field
                label="Titulo"
                name="title"
                placeholder="Titulo"
                defaultValue={announcementDraft.title}
                maxLength={TEXT_MAX}
                required
              />
              <TextAreaField
                label="Resumo"
                name="summary"
                placeholder="Resumo"
                defaultValue={announcementDraft.summary}
                maxLength={TEXTAREA_MAX}
                required
              />
              <div className="form-grid">
                <SelectField label="Categoria" name="category" defaultValue={announcementDraft.category}>
                  <option value="geral">Geral</option>
                  <option value="evento">Evento</option>
                  <option value="juventude">Juventude</option>
                  <option value="oracao">Oracao</option>
                </SelectField>
                <Field
                  label="Publicacao"
                  name="publishedAt"
                  type="datetime-local"
                  defaultValue={formatInputDateTime(announcementDraft.publishedAt)}
                  required
                />
              </div>
              <div className="form-grid">
                <Field
                  label="Texto do botao"
                  name="ctaLabel"
                  placeholder="Texto do botao"
                  defaultValue={announcementDraft.ctaLabel}
                  maxLength={TEXT_MAX}
                />
                <Field
                  label="URL do botao"
                  name="ctaUrl"
                  type="url"
                  placeholder="URL do botao (https://...)"
                  defaultValue={announcementDraft.ctaUrl}
                  maxLength={URL_MAX}
                />
              </div>
              <label className="check-row">
                <input name="pinned" type="checkbox" defaultChecked={announcementDraft.pinned} />
                Destacar aviso
              </label>
              <FormActions saving={saving} onCancel={() => setAnnouncementDraft(emptyAnnouncement())} />
            </form>
          </CrudPanel>
        )}

        {view === "schedule" && (
          <CrudPanel
            title="Programacao"
            items={scheduleList.items}
            toolbar={
              <ListToolbar
                search={listState.schedule.search}
                searchLabel="Titulo, ministerio, local ou status"
                sort={listState.schedule.sort}
                sortOptions={SCHEDULE_SORT_OPTIONS}
                total={scheduleList.total}
                onSearch={(search) => updateListState("schedule", { search, page: 1 })}
                onSort={(sort) => updateListState("schedule", { sort, page: 1 })}
              />
            }
            footer={
              <Pagination
                list={scheduleList}
                onPageChange={(page) => updateListState("schedule", { page })}
              />
            }
            emptyLabel="Nenhum item de programacao encontrado."
            renderItem={(item) => (
              <ItemRow key={item.id} title={item.title} detail={formatScheduleDetail(item)}>
                <button onClick={() => setScheduleDraft(item)} type="button">Editar</button>
                <button
                  onClick={() => removeScheduleItem(item)}
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
              key={scheduleDraft.id || "new-schedule"}
              draft={scheduleDraft}
              ministries={ministryNames}
              locations={scheduleLocations}
              preachers={schedulePreachers}
              directors={scheduleDirectors}
              saving={saving}
              onSubmit={saveSchedule}
              onCancel={() => setScheduleDraft(emptyScheduleItem())}
            />
          </CrudPanel>
        )}

        {view === "ministries" && (
          <CrudPanel
            title="Ministerios"
            items={ministryList.items}
            toolbar={
              <ListToolbar
                search={listState.ministries.search}
                searchLabel="Nome, resumo, horario ou contato"
                sort={listState.ministries.sort}
                sortOptions={MINISTRY_SORT_OPTIONS}
                total={ministryList.total}
                onSearch={(search) => updateListState("ministries", { search, page: 1 })}
                onSort={(sort) => updateListState("ministries", { sort, page: 1 })}
              />
            }
            footer={
              <Pagination
                list={ministryList}
                onPageChange={(page) => updateListState("ministries", { page })}
              />
            }
            emptyLabel="Nenhum ministerio encontrado."
            renderItem={(item) => (
              <ItemRow key={item.id} title={item.name} detail={item.meetingTime}>
                <button onClick={() => setMinistryDraft(item)} type="button">Editar</button>
                <button
                  onClick={() => removeMinistry(item)}
                  type="button"
                  aria-label={`Excluir ministerio ${item.name}`}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </ItemRow>
            )}
          >
            <form
              key={ministryDraft.id || "new-ministry"}
              className="editor-form"
              onSubmit={saveMinistry}
            >
              <div className="form-grid">
                <Field
                  label="Nome"
                  name="name"
                  placeholder="Nome"
                  defaultValue={ministryDraft.name}
                  maxLength={TEXT_MAX}
                  required
                />
                <Field
                  label="Horario"
                  name="meetingTime"
                  placeholder="Horario"
                  defaultValue={ministryDraft.meetingTime}
                  maxLength={TEXT_MAX}
                  required
                />
              </div>
              <TextAreaField
                label="Resumo"
                name="summary"
                placeholder="Resumo"
                defaultValue={ministryDraft.summary}
                maxLength={TEXTAREA_MAX}
                required
              />
              <div className="form-grid">
                <Field
                  label="Contato"
                  name="contact"
                  placeholder="Contato"
                  defaultValue={ministryDraft.contact}
                  maxLength={TEXT_MAX}
                  required
                />
                <Field label="Cor" name="color" type="color" defaultValue={ministryDraft.color} />
              </div>
              <FormActions saving={saving} onCancel={() => setMinistryDraft(emptyMinistry())} />
            </form>
          </CrudPanel>
        )}

        {view === "profile" && (
          <section>
            <header className="workspace-heading">
              <div>
                <p className="eyebrow">Configuracao</p>
                <h1>Dados da igreja</h1>
              </div>
            </header>
            <form
              key={snapshot.profile.updatedAt}
              className="profile-form"
              onSubmit={saveProfile}
            >
              <div className="form-grid">
                <Field
                  label="Nome"
                  name="name"
                  placeholder="Nome"
                  defaultValue={snapshot.profile.name}
                  maxLength={TEXT_MAX}
                  required
                />
                <Field
                  label="Nome curto"
                  name="shortName"
                  placeholder="Nome curto"
                  defaultValue={snapshot.profile.shortName}
                  maxLength={TEXT_MAX}
                  required
                />
              </div>
              <Field
                label="Chamada"
                name="tagline"
                placeholder="Chamada"
                defaultValue={snapshot.profile.tagline}
                maxLength={TEXT_MAX}
                required
              />
              <TextAreaField
                label="Missao"
                name="mission"
                placeholder="Missao"
                defaultValue={snapshot.profile.mission}
                maxLength={TEXTAREA_MAX}
                required
              />
              <div className="form-grid">
                <Field
                  label="Cidade"
                  name="city"
                  placeholder="Cidade"
                  defaultValue={snapshot.profile.city}
                  maxLength={TEXT_MAX}
                  required
                />
                <Field
                  label="Pastor"
                  name="pastorName"
                  placeholder="Pastor"
                  defaultValue={snapshot.profile.pastorName}
                  maxLength={TEXT_MAX}
                  required
                />
              </div>
              <Field
                label="Endereco"
                name="address"
                placeholder="Endereco"
                defaultValue={snapshot.profile.address}
                maxLength={TEXT_MAX}
                required
              />
              <div className="form-grid">
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  defaultValue={snapshot.profile.email}
                  maxLength={TEXT_MAX}
                  required
                />
                <Field
                  label="WhatsApp"
                  name="whatsapp"
                  placeholder="WhatsApp"
                  defaultValue={snapshot.profile.whatsapp}
                  maxLength={TEXT_MAX}
                  required
                />
              </div>
              <div className="form-grid">
                <Field
                  label="Instagram"
                  name="instagramUrl"
                  type="url"
                  placeholder="Instagram"
                  defaultValue={snapshot.profile.instagramUrl}
                  maxLength={URL_MAX}
                />
                <Field
                  label="YouTube"
                  name="youtubeUrl"
                  type="url"
                  placeholder="YouTube"
                  defaultValue={snapshot.profile.youtubeUrl}
                  maxLength={URL_MAX}
                />
              </div>
              <Field
                label="Google Maps"
                name="mapsUrl"
                type="url"
                placeholder="Google Maps"
                defaultValue={snapshot.profile.mapsUrl}
                maxLength={URL_MAX}
              />
              <Field
                label="Versiculo"
                name="heroVerse"
                placeholder="Versiculo"
                defaultValue={snapshot.profile.heroVerse}
                maxLength={TEXTAREA_MAX}
                required
              />
              <Field
                label="Texto historico"
                name="foundedText"
                placeholder="Texto historico"
                defaultValue={snapshot.profile.foundedText}
                maxLength={TEXTAREA_MAX}
                required
              />
              {profileError && <p className="form-error">{profileError}</p>}
              <button className="button primary" disabled={saving} type="submit">
                <Save size={18} /> Salvar igreja
              </button>
            </form>
          </section>
        )}

        {view === "prayers" && (
          <section>
            <header className="workspace-heading">
              <div>
                <p className="eyebrow">Cuidado</p>
                <h1>Pedidos de oracao</h1>
              </div>
            </header>
            <div className="list-panel">
              <ListToolbar
                search={listState.prayers.search}
                searchLabel="Nome, contato, pedido ou status"
                sort={listState.prayers.sort}
                sortOptions={PRAYER_SORT_OPTIONS}
                total={prayerList.total}
                onSearch={(search) => updateListState("prayers", { search, page: 1 })}
                onSort={(sort) => updateListState("prayers", { sort, page: 1 })}
              >
                <SelectField
                  label="Status"
                  value={prayerStatusFilter}
                  onChange={(event) => {
                    setPrayerStatusFilter(event.currentTarget.value as PrayerRequest["status"] | "all");
                    updateListState("prayers", { page: 1 });
                  }}
                >
                  {PRAYER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </ListToolbar>
              {prayerList.items.map((request) => (
                <article className="prayer-row" key={request.id}>
                  <div>
                    <strong>{request.name}</strong>
                    <span>{formatDateTimeLabel(request.createdAt)}</span>
                    <span>{request.contact || "Sem contato"}</span>
                    <p>{request.message}</p>
                  </div>
                  <SelectField
                    label="Status"
                    value={request.status}
                    onChange={(event) => updatePrayerStatus(request.id, event.currentTarget.value as PrayerRequest["status"])}
                  >
                    <option value="novo">Novo</option>
                    <option value="em_oracao">Em oracao</option>
                    <option value="concluido">Concluido</option>
                  </SelectField>
                </article>
              ))}
              {prayerList.items.length === 0 && <p className="empty-note">Nenhum pedido encontrado.</p>}
              <Pagination
                list={prayerList}
                onPageChange={(page) => updateListState("prayers", { page })}
              />
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function NavButton(props: {
  current: AdminView;
  target: AdminView;
  icon: React.ReactNode;
  label: string;
  onClick: (view: AdminView) => void;
}) {
  const active = props.current === props.target;
  return (
    <button
      className={active ? "active" : ""}
      onClick={() => props.onClick(props.target)}
      type="button"
      aria-current={active ? "page" : undefined}
    >
      {props.icon}
      {props.label}
    </button>
  );
}

function Stat(props: { label: string; value: number }) {
  return (
    <article className="stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

function CrudPanel<T>(props: {
  title: string;
  items: T[];
  children: React.ReactNode;
  renderItem: (item: T) => React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  emptyLabel?: string;
}) {
  return (
    <section>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Conteudo</p>
          <h1>{props.title}</h1>
        </div>
      </header>
      <div className="crud-layout">
        <div className="list-panel">
          {props.toolbar}
          {props.items.map(props.renderItem)}
          {props.items.length === 0 && <p className="empty-note">{props.emptyLabel ?? "Nenhum registro encontrado."}</p>}
          {props.footer}
        </div>
        <div className="editor-panel">{props.children}</div>
      </div>
    </section>
  );
}

function ItemRow(props: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <article className="item-row">
      <div>
        <strong>{props.title}</strong>
        <span>{props.detail}</span>
      </div>
      <div className="row-actions">{props.children}</div>
    </article>
  );
}

function FormActions(props: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="form-actions">
      <button className="button primary" disabled={props.saving} type="submit">
        <Save size={18} /> Salvar
      </button>
      <button className="button ghost" onClick={props.onCancel} type="button">
        Limpar
      </button>
    </div>
  );
}

function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label>
      <span className="field-label">{label}</span>
      <input {...inputProps} />
    </label>
  );
}

function TextAreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, ...textareaProps } = props;
  return (
    <label>
      <span className="field-label">{label}</span>
      <textarea {...textareaProps} />
    </label>
  );
}

function SelectField(props: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: React.ReactNode }) {
  const { label, children, ...selectProps } = props;
  return (
    <label>
      <span className="field-label">{label}</span>
      <select {...selectProps}>{children}</select>
    </label>
  );
}

function ListToolbar(props: {
  search: string;
  searchLabel: string;
  sort: string;
  sortOptions: Array<{ value: string; label: string }>;
  total: number;
  onSearch: (value: string) => void;
  onSort: (value: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="list-toolbar">
      <Field
        label="Buscar"
        type="search"
        value={props.search}
        placeholder={props.searchLabel}
        maxLength={TEXT_MAX}
        onChange={(event) => props.onSearch(event.currentTarget.value)}
      />
      <SelectField
        label="Ordenar"
        value={props.sort}
        onChange={(event) => props.onSort(event.currentTarget.value)}
      >
        {props.sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      {props.children}
      <span>{props.total} itens</span>
    </div>
  );
}

function Pagination(props: {
  list: VisibleList<unknown>;
  onPageChange: (page: number) => void;
}) {
  if (props.list.pageCount <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <span>
        Pagina {props.list.page} de {props.list.pageCount}
      </span>
      <button
        className="button ghost"
        type="button"
        disabled={props.list.page <= 1}
        onClick={() => props.onPageChange(props.list.page - 1)}
      >
        Anterior
      </button>
      <button
        className="button ghost"
        type="button"
        disabled={props.list.page >= props.list.pageCount}
        onClick={() => props.onPageChange(props.list.page + 1)}
      >
        Proxima
      </button>
    </div>
  );
}

function ScheduleForm(props: {
  draft: ScheduleItem;
  ministries: string[];
  locations: string[];
  preachers: string[];
  directors: string[];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const [startsAt, setStartsAt] = useState(formatInputDateTime(props.draft.startsAt));
  const [endsAt, setEndsAt] = useState(formatInputDateTime(props.draft.endsAt));

  function shiftEndsAt(nextStarts: string) {
    if (!endsAt || endsAt < nextStarts) {
      const startMs = new Date(nextStarts).getTime();
      if (Number.isFinite(startMs)) {
        const shifted = new Date(startMs + 90 * 60 * 1000);
        setEndsAt(formatInputDateTime(shifted.toISOString()));
      }
    }
  }

  return (
    <form className="editor-form" onSubmit={props.onSubmit}>
      <div className="form-grid">
        <Field
          label="Titulo"
          name="title"
          placeholder="Titulo"
          defaultValue={props.draft.title}
          maxLength={TEXT_MAX}
          required
        />
        <Field
          label="Ministerio"
          name="ministry"
          list="schedule-ministries"
          placeholder="Ministerio"
          defaultValue={props.draft.ministry}
          maxLength={TEXT_MAX}
          required
        />
      </div>
      <datalist id="schedule-ministries">
        {props.ministries.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <div className="form-grid">
        <Field
          label="Inicio"
          name="startsAt"
          type="datetime-local"
          value={startsAt}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setStartsAt(next);
            shiftEndsAt(next);
          }}
          required
        />
        <Field
          label="Termino"
          name="endsAt"
          type="datetime-local"
          value={endsAt}
          min={startsAt}
          onChange={(event) => setEndsAt(event.currentTarget.value)}
          required
        />
      </div>
      <div className="form-grid">
        <Field
          label="Local"
          name="location"
          list="schedule-locations"
          placeholder="Local"
          defaultValue={props.draft.location}
          maxLength={TEXT_MAX}
          required
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={props.draft.status}
          required
        >
          <option value="scheduled">Agendado</option>
          <option value="suspended">Suspenso</option>
          <option value="free">Livre</option>
        </SelectField>
      </div>
      <div className="form-grid">
        <Field
          label="Pregador"
          name="preacher"
          list="schedule-preachers"
          placeholder="Pregador"
          defaultValue={props.draft.preacher}
          maxLength={TEXT_MAX}
        />
        <Field
          label="Dirigente"
          name="director"
          list="schedule-directors"
          placeholder="Dirigente"
          defaultValue={props.draft.director}
          maxLength={TEXT_MAX}
        />
      </div>
      <div className="form-grid">
        <Field
          label="Passagem biblica"
          name="passage"
          placeholder="Passagem biblica"
          defaultValue={props.draft.passage}
          maxLength={TEXT_MAX}
        />
        <Field
          label="Data especial"
          name="specialDate"
          placeholder="Data especial (ex: PASCOA)"
          defaultValue={props.draft.specialDate}
          maxLength={TEXT_MAX}
        />
      </div>
      <datalist id="schedule-locations">
        {props.locations.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="schedule-preachers">
        {props.preachers.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="schedule-directors">
        {props.directors.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <TextAreaField
        label="Resumo"
        name="summary"
        placeholder="Resumo"
        defaultValue={props.draft.summary}
        maxLength={TEXTAREA_MAX}
      />
      <label className="check-row">
        <input name="featured" type="checkbox" defaultChecked={props.draft.featured} />
        Destacar na agenda
      </label>
      <FormActions saving={props.saving} onCancel={props.onCancel} />
    </form>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
