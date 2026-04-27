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
const DEV_PREFILL = import.meta.env.DEV
  ? { email: "admin@4ibib.local", password: "123456" }
  : null;
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
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { createBackend } from "./backend";
import "./styles.css";

const backend = createBackend();
const showDevPrefill = DEV_PREFILL !== null && backend.mode === "mock";

const TEXT_MAX = 200;
const TEXTAREA_MAX = 2000;
const URL_MAX = 500;

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );
}

function formatScheduleDetail(item: ScheduleItem): string {
  return `${formatDateLabel(item.startsAt)} - ${formatTimeRange(item.startsAt, item.endsAt)} - ${item.ministry}`;
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
    leader: "",
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

  useEffect(() => {
    return backend.auth.subscribe((nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
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

  const scheduleLeaders = useMemo(
    () => uniqueSorted(snapshot?.schedule.map((item) => item.leader) ?? []),
    [snapshot]
  );

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
      leader: String(formData.get("leader") ?? ""),
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
      mapsUrl: String(formData.get("mapsUrl") ?? ""),
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
            items={snapshot.announcements}
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
              <input
                name="title"
                placeholder="Titulo"
                defaultValue={announcementDraft.title}
                maxLength={TEXT_MAX}
                required
              />
              <textarea
                name="summary"
                placeholder="Resumo"
                defaultValue={announcementDraft.summary}
                maxLength={TEXTAREA_MAX}
                required
              />
              <div className="form-grid">
                <select name="category" defaultValue={announcementDraft.category}>
                  <option value="geral">Geral</option>
                  <option value="evento">Evento</option>
                  <option value="juventude">Juventude</option>
                  <option value="oracao">Oracao</option>
                </select>
                <input
                  name="publishedAt"
                  type="datetime-local"
                  defaultValue={formatInputDateTime(announcementDraft.publishedAt)}
                  required
                />
              </div>
              <div className="form-grid">
                <input
                  name="ctaLabel"
                  placeholder="Texto do botao"
                  defaultValue={announcementDraft.ctaLabel}
                  maxLength={TEXT_MAX}
                />
                <input
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
            items={snapshot.schedule}
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
              leaders={scheduleLeaders}
              saving={saving}
              onSubmit={saveSchedule}
              onCancel={() => setScheduleDraft(emptyScheduleItem())}
            />
          </CrudPanel>
        )}

        {view === "ministries" && (
          <CrudPanel
            title="Ministerios"
            items={snapshot.ministries}
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
                <input
                  name="name"
                  placeholder="Nome"
                  defaultValue={ministryDraft.name}
                  maxLength={TEXT_MAX}
                  required
                />
                <input
                  name="meetingTime"
                  placeholder="Horario"
                  defaultValue={ministryDraft.meetingTime}
                  maxLength={TEXT_MAX}
                  required
                />
              </div>
              <textarea
                name="summary"
                placeholder="Resumo"
                defaultValue={ministryDraft.summary}
                maxLength={TEXTAREA_MAX}
                required
              />
              <div className="form-grid">
                <input
                  name="contact"
                  placeholder="Contato"
                  defaultValue={ministryDraft.contact}
                  maxLength={TEXT_MAX}
                  required
                />
                <input name="color" type="color" defaultValue={ministryDraft.color} />
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
                <input name="name" placeholder="Nome" defaultValue={snapshot.profile.name} required />
                <input name="shortName" placeholder="Nome curto" defaultValue={snapshot.profile.shortName} required />
              </div>
              <input name="tagline" placeholder="Chamada" defaultValue={snapshot.profile.tagline} required />
              <textarea name="mission" placeholder="Missao" defaultValue={snapshot.profile.mission} required />
              <div className="form-grid">
                <input name="city" placeholder="Cidade" defaultValue={snapshot.profile.city} required />
                <input name="pastorName" placeholder="Pastor" defaultValue={snapshot.profile.pastorName} required />
              </div>
              <input name="address" placeholder="Endereco" defaultValue={snapshot.profile.address} required />
              <div className="form-grid">
                <input name="email" placeholder="Email" defaultValue={snapshot.profile.email} required />
                <input name="whatsapp" placeholder="WhatsApp" defaultValue={snapshot.profile.whatsapp} required />
              </div>
              <div className="form-grid">
                <input name="instagramUrl" placeholder="Instagram" defaultValue={snapshot.profile.instagramUrl} />
                <input name="youtubeUrl" placeholder="YouTube" defaultValue={snapshot.profile.youtubeUrl} />
              </div>
              <input name="mapsUrl" placeholder="Google Maps" defaultValue={snapshot.profile.mapsUrl} />
              <input name="heroVerse" placeholder="Versiculo" defaultValue={snapshot.profile.heroVerse} required />
              <input name="foundedText" placeholder="Texto historico" defaultValue={snapshot.profile.foundedText} required />
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
              {prayers.map((request) => (
                <article className="prayer-row" key={request.id}>
                  <div>
                    <strong>{request.name}</strong>
                    <span>{request.contact || "Sem contato"}</span>
                    <p>{request.message}</p>
                  </div>
                  <select
                    value={request.status}
                    onChange={(event) => updatePrayerStatus(request.id, event.currentTarget.value as PrayerRequest["status"])}
                  >
                    <option value="novo">Novo</option>
                    <option value="em_oracao">Em oracao</option>
                    <option value="concluido">Concluido</option>
                  </select>
                </article>
              ))}
              {prayers.length === 0 && <p className="empty-note">Nenhum pedido recebido.</p>}
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
  return (
    <button
      className={props.current === props.target ? "active" : ""}
      onClick={() => props.onClick(props.target)}
      type="button"
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
        <div className="list-panel">{props.items.map(props.renderItem)}</div>
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

function ScheduleForm(props: {
  draft: ScheduleItem;
  ministries: string[];
  locations: string[];
  leaders: string[];
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
        <input
          name="title"
          placeholder="Titulo"
          defaultValue={props.draft.title}
          maxLength={TEXT_MAX}
          required
        />
        <input
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
        <label>
          <span className="field-label">Inicio</span>
          <input
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
        </label>
        <label>
          <span className="field-label">Termino</span>
          <input
            name="endsAt"
            type="datetime-local"
            value={endsAt}
            min={startsAt}
            onChange={(event) => setEndsAt(event.currentTarget.value)}
            required
          />
        </label>
      </div>
      <div className="form-grid">
        <input
          name="location"
          list="schedule-locations"
          placeholder="Local"
          defaultValue={props.draft.location}
          maxLength={TEXT_MAX}
          required
        />
        <input
          name="leader"
          list="schedule-leaders"
          placeholder="Responsavel"
          defaultValue={props.draft.leader}
          maxLength={TEXT_MAX}
          required
        />
      </div>
      <datalist id="schedule-locations">
        {props.locations.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="schedule-leaders">
        {props.leaders.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <textarea
        name="summary"
        placeholder="Resumo"
        defaultValue={props.draft.summary}
        maxLength={TEXTAREA_MAX}
        required
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
