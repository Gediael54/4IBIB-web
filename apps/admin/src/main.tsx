import { type AdminSession, type PrayerRequest } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CalendarDays,
  Church,
  ClipboardList,
  HeartHandshake,
  LoaderCircle,
  LogOut,
  Megaphone,
  UsersRound
} from "lucide-react";
import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { backend, usePrayers, useSnapshot } from "./hooks";
import { initMonitoring } from "./monitoring";
import "./styles.css";
import { INITIAL_LIST_STATE, type ListState, type ListView } from "./utils";

void initMonitoring();

const DashboardView = lazy(() => import("./views/DashboardView"));
const AnnouncementsView = lazy(() => import("./views/AnnouncementsView"));
const ScheduleView = lazy(() => import("./views/ScheduleView"));
const MinistriesView = lazy(() => import("./views/MinistriesView"));
const ProfileView = lazy(() => import("./views/ProfileView"));
const PrayersView = lazy(() => import("./views/PrayersView"));

const DEV_PREFILL =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_ADMIN_EMAIL && import.meta.env.VITE_MOCK_ADMIN_PASSWORD
    ? {
        email: import.meta.env.VITE_MOCK_ADMIN_EMAIL,
        password: import.meta.env.VITE_MOCK_ADMIN_PASSWORD
      }
    : null;

const showDevPrefill = DEV_PREFILL !== null && backend.mode === "mock";

const TEXT_MAX = 200;

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

type AdminView = "dashboard" | "announcements" | "schedule" | "ministries" | "profile" | "prayers";

export function App() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<AdminView>("dashboard");
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
          <NavButton
            current={view}
            target="dashboard"
            icon={<ClipboardList />}
            label="Resumo"
            onClick={setView}
          />
          <NavButton
            current={view}
            target="announcements"
            icon={<Megaphone />}
            label="Avisos"
            onClick={setView}
          />
          <NavButton
            current={view}
            target="schedule"
            icon={<CalendarDays />}
            label="Programacao"
            onClick={setView}
          />
          <NavButton
            current={view}
            target="ministries"
            icon={<UsersRound />}
            label="Ministerios"
            onClick={setView}
          />
          <NavButton current={view} target="profile" icon={<Church />} label="Igreja" onClick={setView} />
          <NavButton
            current={view}
            target="prayers"
            icon={<HeartHandshake />}
            label="Oracao"
            onClick={setView}
          />
        </nav>
        <button className="sidebar-logout" onClick={handleLogout} type="button">
          <LogOut size={18} /> Sair
        </button>
      </aside>

      <section className="workspace">
        <Suspense
          fallback={
            <div className="loading">
              <LoaderCircle className="spin" />
            </div>
          }
        >
          {view === "dashboard" && <DashboardView snapshot={snapshot} prayers={prayers} />}
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
          {view === "ministries" && (
            <MinistriesView
              snapshot={snapshot}
              state={listState.ministries}
              onStateChange={(patch) => updateListState("ministries", patch)}
            />
          )}
          {view === "profile" && <ProfileView snapshot={snapshot} />}
          {view === "prayers" && (
            <PrayersView
              prayers={prayers}
              state={listState.prayers}
              onStateChange={(patch) => updateListState("prayers", patch)}
              statusFilter={prayerStatusFilter}
              onStatusFilterChange={setPrayerStatusFilter}
            />
          )}
        </Suspense>
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

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
