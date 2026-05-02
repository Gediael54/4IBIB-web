import { type AdminSession, type PrayerRequest } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  HeartHandshake,
  History,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { CommandPalette } from "./components/CommandPalette";
import { ErrorBoundary, ViewBoundary } from "./components/ErrorBoundary";
import { MobileTopbar } from "./components/MobileTopbar";
import { ThemeToggle } from "./components/ThemeToggle";
import { ToastProvider } from "./components/Toast";
import { backend, usePrayers, useSnapshot } from "./hooks";
import { initMonitoring, setSentryUser } from "./monitoring";
import "./styles.css";
import { TEXT_MAX } from "./lib/limits";
import {
  INITIAL_LIST_STATE,
  type ListState,
  type ListView,
  type VolunteerRoleFilter
} from "./lib/list-state";

initMonitoring();

const DashboardView = lazy(() => import("./views/DashboardView"));
const AnnouncementsView = lazy(() => import("./views/AnnouncementsView"));
const ScheduleView = lazy(() => import("./views/ScheduleView"));
const AnnualScheduleView = lazy(() => import("./views/AnnualScheduleView"));
const VolunteersView = lazy(() => import("./views/VolunteersView"));
const PrayersView = lazy(() => import("./views/PrayersView"));
const ProfileView = lazy(() => import("./views/ProfileView"));
const MinistriesView = lazy(() => import("./views/MinistriesView"));
const AuditLogView = lazy(() => import("./views/AuditLogView"));
const TeamView = lazy(() => import("./views/TeamView"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

type AdminView =
  | "dashboard"
  | "announcements"
  | "schedule"
  | "annual"
  | "volunteers"
  | "prayers"
  | "profile"
  | "ministries"
  | "audit"
  | "team";

const VIEW_TITLES: Record<AdminView, string> = {
  dashboard: "Resumo",
  announcements: "Avisos",
  schedule: "Programacao",
  annual: "Escala anual",
  volunteers: "Voluntarios",
  prayers: "Oracao",
  profile: "Perfil",
  ministries: "Ministerios",
  audit: "Auditoria",
  team: "Equipe"
};

export function App() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<AdminView>("dashboard");
  const [listState, setListState] = useState<Record<ListView, ListState>>(INITIAL_LIST_STATE);
  const [prayerStatusFilter, setPrayerStatusFilter] = useState<PrayerRequest["status"] | "all">("all");
  const [volunteerRoleFilter, setVolunteerRoleFilter] = useState<VolunteerRoleFilter>("all");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function navigateTo(next: AdminView) {
    setView(next);
    setDrawerOpen(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  useEffect(() => {
    return backend.auth.subscribe((nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      setSentryUser(nextSession ? { id: nextSession.uid, email: nextSession.email } : null);
    });
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = "/";
    document.head.append(link);
    return () => link.remove();
  }, []);

  const snapshotQuery = useSnapshot();
  const prayersQuery = usePrayers();

  function updateListState(viewName: ListView, patch: Partial<ListState>) {
    setListState((current) => ({
      ...current,
      [viewName]: {
        ...current[viewName],
        ...patch
      }
    }));
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const formData = new FormData(event.currentTarget);

    try {
      await backend.auth.signIn(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "Falha ao entrar.");
    }
  }

  async function handleLogout() {
    await backend.auth.signOut();
    queryClient.clear();
    setSentryUser(null);
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
      <ErrorBoundary>
        <main className="login-screen">
          <section className="login-panel">
            <img src="/logo.png" alt="" className="login-logo" />
            <p className="eyebrow">Painel da igreja</p>
            <h1>Entrar no admin</h1>
            <form onSubmit={handleLogin}>
              <label>
                Email
                <input name="email" type="email" autoComplete="email" maxLength={TEXT_MAX} required />
              </label>
              <label>
                Senha
                <input
                  name="password"
                  type="password"
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
          </section>
        </main>
      </ErrorBoundary>
    );
  }

  if (snapshotQuery.isLoading || prayersQuery.isLoading || !snapshotQuery.data || !prayersQuery.data) {
    return (
      <main className="loading">
        <LoaderCircle className="spin" />
      </main>
    );
  }

  if (snapshotQuery.error || prayersQuery.error) {
    const message =
      (snapshotQuery.error instanceof Error ? snapshotQuery.error.message : null) ??
      (prayersQuery.error instanceof Error ? prayersQuery.error.message : null) ??
      "Falha ao carregar dados.";
    return (
      <main className="loading">
        <p className="form-error">{message}</p>
      </main>
    );
  }

  const snapshot = snapshotQuery.data;
  const prayers = prayersQuery.data;

  return (
    <ErrorBoundary>
      <main className={`admin-shell${drawerOpen ? " drawer-open" : ""}`}>
        <MobileTopbar
          title={VIEW_TITLES[view]}
          drawerOpen={drawerOpen}
          onToggleDrawer={() => setDrawerOpen((value) => !value)}
          action={
            <button
              type="button"
              className="cmdk-trigger cmdk-trigger-mobile"
              aria-label="Buscar"
              onClick={() => setPaletteOpen(true)}
            >
              <Search size={18} />
            </button>
          }
        />
        <div className="sidebar-backdrop" aria-hidden={!drawerOpen} onClick={() => setDrawerOpen(false)} />
        <aside id="admin-sidebar" className="sidebar" aria-hidden={false}>
          <div className="sidebar-brand">
            <img src="/logo.png" alt="" className="sidebar-logo" />
            <div>
              <strong>4a Betel</strong>
              <span>{session.email}</span>
            </div>
          </div>
          <nav>
            <NavButton
              current={view}
              target="dashboard"
              icon={<ClipboardList />}
              label="Resumo"
              onClick={navigateTo}
            />
            <NavButton
              current={view}
              target="announcements"
              icon={<Megaphone />}
              label="Avisos"
              onClick={navigateTo}
            />
            <NavButton
              current={view}
              target="volunteers"
              icon={<Users />}
              label="Voluntarios"
              onClick={navigateTo}
            />
            <NavButton
              current={view}
              target="schedule"
              icon={<CalendarDays />}
              label="Programacao"
              onClick={navigateTo}
            />
            <NavButton
              current={view}
              target="annual"
              icon={<LayoutGrid />}
              label="Escala anual"
              onClick={navigateTo}
            />
            <NavButton
              current={view}
              target="prayers"
              icon={<HeartHandshake />}
              label="Oracao"
              onClick={navigateTo}
            />
            <NavButton
              current={view}
              target="ministries"
              icon={<Sparkles />}
              label="Ministerios"
              onClick={navigateTo}
            />
            <NavButton
              current={view}
              target="profile"
              icon={<Building2 />}
              label="Perfil"
              onClick={navigateTo}
            />
            <NavButton
              current={view}
              target="audit"
              icon={<History />}
              label="Auditoria"
              onClick={navigateTo}
            />
            <NavButton
              current={view}
              target="team"
              icon={<ShieldCheck />}
              label="Equipe"
              onClick={navigateTo}
            />
          </nav>
          <div className="sidebar-footer">
            <ThemeToggle />
            <button className="sidebar-logout" onClick={handleLogout} type="button">
              <LogOut size={18} /> Sair
            </button>
          </div>
        </aside>

        <section className="workspace">
          <div className="workspace-toolbar">
            <button
              type="button"
              className="cmdk-trigger cmdk-trigger-desktop"
              onClick={() => setPaletteOpen(true)}
              aria-label="Abrir busca rapida"
            >
              <Search size={16} />
              <span>Buscar</span>
              <kbd>{"⌘K"}</kbd>
            </button>
          </div>
          <Suspense
            fallback={
              <div className="loading">
                <LoaderCircle className="spin" />
              </div>
            }
          >
            <ViewBoundary
              key={view}
              viewName={VIEW_TITLES[view]}
              onBackToDashboard={view === "dashboard" ? undefined : () => navigateTo("dashboard")}
            >
              {view === "dashboard" && (
                <DashboardView snapshot={snapshot} prayers={prayers} onNavigate={navigateTo} />
              )}
              {view === "announcements" && (
                <AnnouncementsView
                  snapshot={snapshot}
                  state={listState.announcements}
                  onStateChange={(patch) => updateListState("announcements", patch)}
                />
              )}
              {view === "schedule" && (
                <ScheduleView
                  snapshot={snapshot}
                  state={listState.schedule}
                  onStateChange={(patch) => updateListState("schedule", patch)}
                />
              )}
              {view === "annual" && <AnnualScheduleView snapshot={snapshot} />}
              {view === "volunteers" && (
                <VolunteersView
                  snapshot={snapshot}
                  state={listState.volunteers}
                  onStateChange={(patch) => updateListState("volunteers", patch)}
                  roleFilter={volunteerRoleFilter}
                  onRoleFilterChange={setVolunteerRoleFilter}
                />
              )}
              {view === "prayers" && (
                <PrayersView
                  prayers={prayers}
                  state={listState.prayers}
                  onStateChange={(patch) => updateListState("prayers", patch)}
                  statusFilter={prayerStatusFilter}
                  onStatusFilterChange={setPrayerStatusFilter}
                />
              )}
              {view === "profile" && <ProfileView snapshot={snapshot} />}
              {view === "ministries" && (
                <MinistriesView
                  snapshot={snapshot}
                  state={listState.ministries}
                  onStateChange={(patch) => updateListState("ministries", patch)}
                />
              )}
              {view === "audit" && (
                <AuditLogView
                  state={listState.audit}
                  onStateChange={(patch) => updateListState("audit", patch)}
                />
              )}
              {view === "team" && (
                <TeamView state={listState.team} onStateChange={(patch) => updateListState("team", patch)} />
              )}
            </ViewBoundary>
          </Suspense>
        </section>

        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          snapshot={snapshot}
          prayers={prayers}
          onNavigate={(nextView) => {
            navigateTo(nextView);
            setPaletteOpen(false);
          }}
        />
      </main>
    </ErrorBoundary>
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

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
