import { buildWhatsAppUrl, getPinnedAnnouncements } from "@4ibib/core";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
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
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { backend } from "./backend";
import Gallery from "./components/Gallery";
import PictureSet from "./components/PictureSet";
import PrivacyPolicy from "./components/PrivacyPolicy";
import SchedulePage from "./components/SchedulePage";
import SmartContactInput from "./components/SmartContactInput";
import TurnstileWidget from "./components/TurnstileWidget";
import UpcomingEvents from "./components/UpcomingEvents";
import UserDataRequest from "./components/UserDataRequest";
import { CHURCH } from "./config/church";
import { ChurchProvider, useChurchProfile, useMinistries, useRegularMeetings } from "./lib/church-context";
import { initMonitoring } from "./monitoring";
import "./styles.css";

void initMonitoring();

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

const SITE_TITLE = CHURCH.name;
const SECTION_TITLES: Record<string, string> = {
  inicio: SITE_TITLE,
  avisos: `Avisos | ${SITE_TITLE}`,
  programacao: `Programacao | ${SITE_TITLE}`,
  agenda: `Agenda completa | ${SITE_TITLE}`,
  ministerios: `Ministerios | ${SITE_TITLE}`,
  contato: `Pedido de oracao | ${SITE_TITLE}`,
  "politica-privacidade": `Politica de privacidade | ${SITE_TITLE}`,
  "meus-dados": `Meus dados | ${SITE_TITLE}`
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

function getCurrentHash(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.hash.replace(/^#/, "");
}

interface SiteHomeProps {
  pinnedAnnouncements: ReturnType<typeof getPinnedAnnouncements>;
  schedule: Parameters<typeof UpcomingEvents>[0]["schedule"];
  prayerMutation: ReturnType<
    typeof useMutation<
      Awaited<ReturnType<typeof backend.content.createPrayerRequest>>,
      Error,
      Parameters<typeof backend.content.createPrayerRequest>[0]
    >
  >;
  prayerFormError: string | null;
  onPrayerRequest: (event: FormEvent<HTMLFormElement>) => void;
}

function SiteHome({
  pinnedAnnouncements,
  schedule,
  prayerMutation,
  prayerFormError,
  onPrayerRequest
}: SiteHomeProps) {
  const church = useChurchProfile();
  const regularMeetings = useRegularMeetings();
  const ministries = useMinistries();

  return (
    <main>
      <a className="skip-link" href="#inicio">
        Pular para o conteudo
      </a>
      <nav className="nav" aria-label="Navegacao principal">
        <a className="brand" href="#inicio">
          <img src="/logo.png" alt="" className="brand-logo" />
          <span>{church.shortName}</span>
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
          <p className="eyebrow">{church.city}</p>
          <h1>{church.name}</h1>
          <p className="hero-copy">{church.tagline}</p>
          <div className="hero-actions">
            <a href="#programacao" className="button primary">
              <CalendarDays size={18} /> Conheca nossa programacao
            </a>
            {church.whatsapp && (
              <a
                href={buildWhatsAppUrl(church.whatsapp, "Ola, quero saber mais sobre a igreja.")}
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
        {regularMeetings.map((meeting) => (
          <article key={`${meeting.weekday}-${meeting.startsAt}-${meeting.title}`}>
            <strong>{meeting.title}</strong>
            <span>
              {meeting.weekday}, {meeting.startsAt} - {meeting.endsAt}
            </span>
            {meeting.description && <p>{meeting.description}</p>}
          </article>
        ))}
      </section>

      <section className="section intro">
        <div className="intro-image">
          <PictureSet
            src="/intro.jpg"
            alt="Membro da congregacao em momento de leitura biblica"
            loading="lazy"
          />
        </div>
        <div className="intro-text">
          <p className="eyebrow">Nossa missao</p>
          <h2>{church.mission}</h2>
          <blockquote className="intro-verse">{church.heroVerse}</blockquote>
        </div>
      </section>

      <Gallery />

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
        <UpcomingEvents schedule={schedule} />
        <a href="#agenda" className="schedule-section-cta">
          <span>Ver agenda completa</span>
          <ArrowRight size={18} aria-hidden="true" />
        </a>
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
            <article
              className="ministry-card"
              key={ministry.slug}
              style={{ borderLeftColor: ministry.color }}
            >
              <h3>{ministry.name}</h3>
              {ministry.summary && <p>{ministry.summary}</p>}
              {ministry.meetingTime && <strong>{ministry.meetingTime}</strong>}
              {ministry.contact && <small>{ministry.contact}</small>}
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
            {church.email && (
              <a href={`mailto:${church.email}`}>
                <Mail size={18} /> {church.email}
              </a>
            )}
            {church.mapsUrl && (
              <a href={church.mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin size={18} /> {church.address}
              </a>
            )}
            {church.instagramUrl && (
              <a href={church.instagramUrl} target="_blank" rel="noopener noreferrer">
                <Instagram size={18} /> Instagram
              </a>
            )}
            {church.youtubeUrl && (
              <a href={church.youtubeUrl} target="_blank" rel="noopener noreferrer">
                <Youtube size={18} /> YouTube
              </a>
            )}
          </div>
        </div>

        <form className="prayer-form" onSubmit={onPrayerRequest}>
          <label>
            Nome
            <input name="name" required maxLength={PRAYER_FIELD_LIMITS.name} placeholder="Seu nome" />
          </label>
          <label>
            Contato
            <SmartContactInput name="contact" maxLength={PRAYER_FIELD_LIMITS.contact} />
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
          <label className="prayer-consent">
            <input type="checkbox" name="consent" required />
            <span>
              Autorizo a 4a IBIB a tratar meus dados (nome, contato, pedido) com finalidade pastoral e
              religiosa, conforme a{" "}
              <a className="prayer-consent-link" href="#politica-privacidade">
                politica de privacidade
              </a>
              .
            </span>
          </label>
          {TURNSTILE_SITE_KEY && <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} />}
          <button className="button primary" type="submit" disabled={prayerMutation.isPending}>
            <HeartHandshake size={18} />
            {prayerMutation.isPending
              ? "Enviando..."
              : prayerMutation.isSuccess
                ? "Pedido enviado"
                : "Enviar pedido"}
          </button>
          {prayerMutation.isSuccess && <p className="form-success">Recebemos seu pedido. Estamos orando.</p>}
          {prayerFormError && <p className="form-error">{prayerFormError}</p>}
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
            {church.name} - {church.city}
          </span>
        </div>
        <nav className="footer-nav" aria-label="Navegacao do rodape">
          <a href="#inicio">Inicio</a>
          <a href="#avisos">Avisos</a>
          <a href="#programacao">Programacao</a>
          <a href="#ministerios">Ministerios</a>
          <a href="#contato">Pedido de oracao</a>
          <a href="#politica-privacidade">Politica de privacidade</a>
          <a href="#meus-dados">Meus dados</a>
          <a href="/admin">Admin</a>
        </nav>
      </footer>
    </main>
  );
}

export function App() {
  const [route, setRoute] = useState<string>(() => getCurrentHash());
  const [prayerFormError, setPrayerFormError] = useState<string | null>(null);
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
    const updateHash = () => {
      document.title = getDocumentTitle(window.location.hash);
      setRoute(getCurrentHash());
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
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

    if (formData.get("consent") !== "on") {
      setPrayerFormError("E necessario autorizar o tratamento dos dados conforme a politica de privacidade.");
      return;
    }
    setPrayerFormError(null);

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

  return (
    <ChurchProvider
      profile={snapshot.profile}
      ministries={snapshot.ministries}
      recurringMeetings={snapshot.recurringMeetings}
    >
      {route === "agenda" ? (
        <SchedulePage schedule={schedule} />
      ) : route === "politica-privacidade" ? (
        <PrivacyPolicy />
      ) : route === "meus-dados" ? (
        <UserDataRequest />
      ) : (
        <SiteHome
          pinnedAnnouncements={pinnedAnnouncements}
          schedule={schedule}
          prayerMutation={prayerMutation}
          prayerFormError={prayerFormError}
          onPrayerRequest={handlePrayerRequest}
        />
      )}
    </ChurchProvider>
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
