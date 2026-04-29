import { buildWhatsAppUrl, getPinnedAnnouncements } from "@4ibib/core";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  HeartHandshake,
  Instagram,
  LoaderCircle,
  Mail,
  MapPin,
  Megaphone,
  Send,
  UsersRound,
  Youtube
} from "lucide-react";
import { useEffect, useMemo, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { createBackend } from "./backend";
import MonthScrollCalendar from "./components/MonthScrollCalendar";
import UpcomingEvents from "./components/UpcomingEvents";
import { initMonitoring } from "./monitoring";
import "./styles.css";

void initMonitoring();

const backend = createBackend();
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

const CATEGORY_LABELS: Record<string, string> = {
  geral: "Geral",
  evento: "Evento",
  juventude: "Juventude",
  oracao: "Oracao"
};

const SITE_TITLE = "4a Igreja Batista Independente Betel";
const SECTION_TITLES: Record<string, string> = {
  inicio: SITE_TITLE,
  avisos: `Avisos | ${SITE_TITLE}`,
  programacao: `Programacao | ${SITE_TITLE}`,
  ministerios: `Ministerios | ${SITE_TITLE}`,
  contato: `Pedido de oracao | ${SITE_TITLE}`
};
const PRAYER_FIELD_LIMITS = {
  name: 120,
  contact: 160,
  message: 1200
};

function getDocumentTitle(hash: string) {
  const sectionId = hash.replace(/^#/, "");
  return SECTION_TITLES[sectionId] ?? SITE_TITLE;
}

export function App() {
  const {
    data: snapshot,
    isLoading,
    error
  } = useQuery({
    queryKey: ["snapshot"],
    queryFn: () => backend.content.getSnapshot()
  });

  const prayerMutation = useMutation({
    mutationFn: (input: Parameters<typeof backend.content.createPrayerRequest>[0]) =>
      backend.content.createPrayerRequest(input)
  });

  useEffect(() => {
    const updateTitle = () => {
      document.title = getDocumentTitle(window.location.hash);
    };

    updateTitle();
    window.addEventListener("hashchange", updateTitle);
    return () => window.removeEventListener("hashchange", updateTitle);
  }, []);

  const pinnedAnnouncements = useMemo(
    () => (snapshot ? getPinnedAnnouncements(snapshot.announcements) : []),
    [snapshot]
  );
  const schedule = useMemo(() => snapshot?.schedule ?? [], [snapshot]);

  async function handlePrayerRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await prayerMutation.mutateAsync({
        name: String(formData.get("name") ?? ""),
        contact: String(formData.get("contact") ?? ""),
        message: String(formData.get("message") ?? ""),
        turnstileToken: String(formData.get("cf-turnstile-response") ?? "")
      });
      form.reset();
    } catch {
      // surfaced via prayerMutation.error
    }
  }

  if (error) {
    return (
      <main className="state-screen">
        <h1>Conteudo indisponivel</h1>
        <p>{error instanceof Error ? error.message : "Falha ao carregar conteudo."}</p>
      </main>
    );
  }

  if (isLoading || !snapshot) {
    return (
      <main className="state-screen">
        <LoaderCircle className="spin" />
        <p>Carregando programacao...</p>
      </main>
    );
  }

  const { profile, ministries } = snapshot;

  return (
    <main>
      <a className="skip-link" href="#inicio">
        Pular para o conteudo
      </a>
      <nav className="nav" aria-label="Navegacao principal">
        <a className="brand" href="#inicio">
          <img src="/logo.png" alt="" className="brand-logo" />
          <span>{profile.shortName}</span>
        </a>
        <div className="nav-links">
          <a href="#avisos">Avisos</a>
          <a href="#programacao">Programacao</a>
          <a href="#ministerios">Ministerios</a>
          <a href="/admin">Admin</a>
        </div>
      </nav>

      <header className="hero">
        <section className="hero-content" id="inicio">
          <p className="eyebrow">{profile.city}</p>
          <h1>{profile.name}</h1>
          <p className="hero-copy">{profile.tagline}</p>
          <div className="hero-actions">
            <a href="#programacao" className="button primary">
              <CalendarDays size={18} /> Ver programacao
            </a>
            {profile.whatsapp && (
              <a
                href={buildWhatsAppUrl(profile.whatsapp, "Ola, quero saber mais sobre a igreja.")}
                className="button secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send size={18} /> Falar no WhatsApp
              </a>
            )}
          </div>
        </section>
      </header>

      <section className="meeting-band">
        {profile.regularMeetings.map((meeting) => (
          <article key={meeting.id}>
            <strong>{meeting.title}</strong>
            <span>
              {meeting.weekday}, {meeting.time}
            </span>
            <p>{meeting.description}</p>
          </article>
        ))}
      </section>

      <section className="section intro">
        <div>
          <p className="eyebrow">Nossa missao</p>
          <h2>{profile.mission}</h2>
        </div>
        <p>{profile.heroVerse}</p>
        <p>{profile.foundedText}</p>
      </section>

      <section className="section" id="avisos">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Atualizacoes</p>
            <h2>Avisos importantes</h2>
          </div>
          <Megaphone />
        </div>
        <div className="announcement-grid">
          {pinnedAnnouncements.map((announcement) => (
            <article className="announcement-card" key={announcement.id}>
              <span>{CATEGORY_LABELS[announcement.category] ?? announcement.category}</span>
              <h3>{announcement.title}</h3>
              <p>{announcement.summary}</p>
              {announcement.ctaUrl && announcement.ctaLabel && (
                <a href={announcement.ctaUrl} target="_blank" rel="noopener noreferrer">
                  {announcement.ctaLabel}
                </a>
              )}
            </article>
          ))}
          {pinnedAnnouncements.length === 0 && (
            <p className="empty-note">Nenhum aviso publicado no momento.</p>
          )}
        </div>
      </section>

      <section className="section schedule-section" id="programacao">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cultos e agenda</p>
            <h2>Programacao</h2>
          </div>
          <CalendarDays />
        </div>
        <p className="schedule-subhead">Proximos eventos</p>
        <UpcomingEvents schedule={schedule} profile={profile} />
        <p className="schedule-subhead">Calendario do mes</p>
        <MonthScrollCalendar schedule={schedule} profile={profile} />
      </section>

      <section className="section" id="ministerios">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Servico</p>
            <h2>Ministerios</h2>
          </div>
          <UsersRound />
        </div>
        <div className="ministry-grid">
          {ministries.map((ministry) => (
            <article className="ministry-card" key={ministry.id} style={{ borderLeftColor: ministry.color }}>
              <h3>{ministry.name}</h3>
              <p>{ministry.summary}</p>
              <strong>{ministry.meetingTime}</strong>
              <small>{ministry.contact}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-section" id="contato">
        <div>
          <p className="eyebrow">Cuidado pastoral</p>
          <h2>Pedido de oracao</h2>
          <p>Envie um pedido para a equipe pastoral acompanhar em oracao.</p>
          <div className="contact-links">
            {profile.email && (
              <a href={`mailto:${profile.email}`}>
                <Mail size={18} /> {profile.email}
              </a>
            )}
            {profile.mapsUrl && (
              <a href={profile.mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin size={18} /> {profile.address}
              </a>
            )}
            {profile.instagramUrl && (
              <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer">
                <Instagram size={18} /> Instagram
              </a>
            )}
            {profile.youtubeUrl && (
              <a href={profile.youtubeUrl} target="_blank" rel="noopener noreferrer">
                <Youtube size={18} /> YouTube
              </a>
            )}
          </div>
        </div>

        <form className="prayer-form" onSubmit={handlePrayerRequest}>
          <label>
            Nome
            <input name="name" required maxLength={PRAYER_FIELD_LIMITS.name} placeholder="Seu nome" />
          </label>
          <label>
            Contato
            <input name="contact" maxLength={PRAYER_FIELD_LIMITS.contact} placeholder="WhatsApp ou email" />
          </label>
          <label>
            Pedido
            <textarea
              name="message"
              required
              rows={5}
              maxLength={PRAYER_FIELD_LIMITS.message}
              placeholder="Como podemos orar?"
            />
          </label>
          {TURNSTILE_SITE_KEY && (
            <div
              className="cf-turnstile"
              data-sitekey={TURNSTILE_SITE_KEY}
              data-theme="light"
              data-language="pt-BR"
            />
          )}
          <button className="button primary" type="submit" disabled={prayerMutation.isPending}>
            <HeartHandshake size={18} />
            {prayerMutation.isPending
              ? "Enviando..."
              : prayerMutation.isSuccess
                ? "Pedido enviado"
                : "Enviar pedido"}
          </button>
          {prayerMutation.isSuccess && <p className="form-success">Recebemos seu pedido. Estamos orando.</p>}
          {prayerMutation.isError && (
            <p className="form-error">
              {prayerMutation.error instanceof Error
                ? prayerMutation.error.message
                : "Nao foi possivel enviar o pedido."}
            </p>
          )}
        </form>
      </section>

      <footer className="footer">
        <div className="footer-brand">
          <img src="/logo.png" alt="" className="footer-logo" />
          <span>
            {profile.name} - {profile.city}
          </span>
        </div>
        <nav className="footer-nav" aria-label="Navegacao do rodape">
          <a href="#inicio">Inicio</a>
          <a href="#avisos">Avisos</a>
          <a href="#programacao">Programacao</a>
          <a href="#ministerios">Ministerios</a>
          <a href="#contato">Pedido de oracao</a>
          <a href="/admin">Admin</a>
        </nav>
      </footer>
    </main>
  );
}

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
