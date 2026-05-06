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
import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { backend } from "./backend";
import EyebrowTag, { categoryToVariant } from "./components/EyebrowTag";
import Gallery from "./components/Gallery";
import LatestTeaching from "./components/LatestTeaching";
import Leadership from "./components/Leadership";
import PictureSet from "./components/PictureSet";
import PrivacyPolicy from "./components/PrivacyPolicy";
import SchedulePage from "./components/SchedulePage";
import SiteNav from "./components/SiteNav";

const ConfessionPage = lazy(() => import("./components/ConfessionPage"));
const FirstTimePage = lazy(() => import("./components/FirstTimePage"));
const DonationsPage = lazy(() => import("./components/DonationsPage"));
const TeachingsPage = lazy(() => import("./components/TeachingsPage"));
const QuemSomosPage = lazy(() => import("./components/QuemSomosPage"));
import SmartContactInput from "./components/SmartContactInput";
import TurnstileWidget from "./components/TurnstileWidget";
import UpcomingEvents from "./components/UpcomingEvents";
import UserDataRequest from "./components/UserDataRequest";
import { CHURCH } from "./config/church";
import { ChurchProvider, useChurchProfile, useMinistries, useRegularMeetings } from "./lib/church-context";
import { safeUrl } from "./lib/safe-url";
import { initMonitoring } from "./monitoring";
import "./styles.css";

const CHURCH_CNPJ = "46.882.520/0001-76";

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
  oracao: "Oração"
};

const SITE_TITLE = CHURCH.name;
const SECTION_TITLES: Record<string, string> = {
  inicio: SITE_TITLE,
  avisos: `Avisos | ${SITE_TITLE}`,
  programacao: `Programação | ${SITE_TITLE}`,
  agenda: `Agenda completa | ${SITE_TITLE}`,
  ministerios: `Ministérios | ${SITE_TITLE}`,
  lideranca: `Liderança | ${SITE_TITLE}`,
  "quem-somos": `Quem somos | ${SITE_TITLE}`,
  "confissao-de-fe": `Confissão de fé | ${SITE_TITLE}`,
  "primeira-vez": `Primeira vez aqui | ${SITE_TITLE}`,
  pregacoes: `Pregações | ${SITE_TITLE}`,
  doacoes: `Doações | ${SITE_TITLE}`,
  contato: `Pedido de oração | ${SITE_TITLE}`,
  "politica-privacidade": `Política de privacidade | ${SITE_TITLE}`,
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
        Pular para o conteúdo
      </a>
      <SiteNav />

      <header className="hero">
        <section className="hero-content" id="inicio">
          <p className="eyebrow">{church.city}</p>
          <h1>{church.name}</h1>
          <p className="hero-copy">{church.tagline}</p>
          <div className="hero-actions">
            <a href="#programacao" className="button primary">
              <CalendarDays size={18} /> Conheça nossa programação
            </a>
            {church.whatsapp && (
              <a
                href={buildWhatsAppUrl(church.whatsapp, "Olá, quero saber mais sobre a igreja.")}
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

      <section className="meeting-band" aria-label="Horários dos cultos">
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

      <LatestTeaching schedule={schedule} />

      <section className="section intro">
        <div className="intro-image">
          <PictureSet
            src="/intro.jpg"
            alt="Membro da congregação em momento de leitura bíblica"
            loading="lazy"
          />
        </div>
        <div className="intro-text">
          <p className="eyebrow">Nossa missão</p>
          <h2>{church.mission}</h2>
          <blockquote className="intro-verse">{church.heroVerse}</blockquote>
        </div>
      </section>

      <Gallery />

      <section className="section" id="avisos">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Atualizações</p>
            <h2>Avisos importantes</h2>
          </div>
          <Megaphone />
        </div>
        <div className="announcement-grid">
          {pinnedAnnouncements.map((announcement) => (
            <article className="announcement-card" key={announcement.id}>
              <EyebrowTag
                label={CATEGORY_LABELS[announcement.category] ?? announcement.category}
                variant={categoryToVariant(announcement.category)}
              />
              <h3>{announcement.title}</h3>
              <p>{announcement.summary}</p>
              {announcement.ctaUrl && announcement.ctaLabel && (
                <a href={safeUrl(announcement.ctaUrl)} target="_blank" rel="noopener noreferrer">
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
            <h2>Programação</h2>
          </div>
          <CalendarDays />
        </div>
        <p className="schedule-subhead">Próximos eventos</p>
        <UpcomingEvents schedule={schedule} />
        <a href="#agenda" className="schedule-section-cta">
          <span>Ver agenda completa</span>
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </section>

      <section className="section" id="ministerios">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Serviço</p>
            <h2>Ministérios</h2>
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

      <Leadership />

      <section className="contact-section" id="contato">
        <div>
          <p className="eyebrow">Cuidado pastoral</p>
          <h2>Pedido de oração</h2>
          <p>Envie um pedido para a equipe pastoral acompanhar em oração.</p>
          <div className="contact-links">
            {church.email && (
              <a href={`mailto:${church.email}`}>
                <Mail size={18} /> {church.email}
              </a>
            )}
            {church.mapsUrl && (
              <a href={safeUrl(church.mapsUrl)} target="_blank" rel="noopener noreferrer">
                <MapPin size={18} /> {church.address}
              </a>
            )}
            {church.instagramUrl && (
              <a href={safeUrl(church.instagramUrl)} target="_blank" rel="noopener noreferrer">
                <Instagram size={18} /> Instagram
              </a>
            )}
            {church.youtubeUrl && (
              <a href={safeUrl(church.youtubeUrl)} target="_blank" rel="noopener noreferrer">
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
                política de privacidade
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
                : "Não foi possível enviar o pedido."}
            </p>
          )}
        </form>
      </section>

      <footer className="site-footer">
        <div className="site-footer-grid">
          <section className="site-footer-col" aria-label="Sobre a igreja">
            <div className="site-footer-brand">
              <img src="/logo.png" alt="" className="footer-logo" />
              <span>{church.shortName}</span>
            </div>
            <p className="site-footer-text">{church.tagline}</p>
            <p className="site-footer-text">
              {church.address}
              <br />
              {church.city}
            </p>
            <p className="site-footer-meta">CNPJ {CHURCH_CNPJ}</p>
            <div className="site-footer-social" aria-label="Redes sociais">
              {church.instagramUrl && (
                <a
                  href={safeUrl(church.instagramUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram size={20} aria-hidden="true" />
                </a>
              )}
              {church.youtubeUrl && (
                <a
                  href={safeUrl(church.youtubeUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <Youtube size={20} aria-hidden="true" />
                </a>
              )}
            </div>
          </section>

          <section className="site-footer-col" aria-label="Contato">
            <h3 className="site-footer-heading">Contato</h3>
            <ul className="site-footer-list">
              {church.whatsapp && (
                <li>
                  <a
                    href={safeUrl(buildWhatsAppUrl(church.whatsapp, "Olá, quero saber mais sobre a igreja."))}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp {church.whatsapp}
                  </a>
                </li>
              )}
              {church.email && (
                <li>
                  <a href={`mailto:${church.email}`}>{church.email}</a>
                </li>
              )}
              <li>Quinta 19h30 - Culto de louvor</li>
              <li>Domingo 09h30 - Escola Bíblica</li>
              <li>Domingo 17h00 - Culto solene</li>
            </ul>
          </section>

          <nav className="site-footer-col" aria-label="Ações">
            <h3 className="site-footer-heading">Ações</h3>
            <ul className="site-footer-list">
              <li>
                <a href="#contato">Pedido de oração</a>
              </li>
              <li>
                <a href="#doacoes">Doações</a>
              </li>
              <li>
                <a href="#lideranca">Liderança</a>
              </li>
              <li>
                <a href="#confissao-de-fe">Confissão de fé</a>
              </li>
              <li>
                <a href="#pregacoes">Pregações</a>
              </li>
            </ul>
          </nav>

          <nav className="site-footer-col" aria-label="Legal">
            <h3 className="site-footer-heading">Legal</h3>
            <ul className="site-footer-list">
              <li>
                <a href="#politica-privacidade">Política de privacidade</a>
              </li>
              <li>
                <a href="#meus-dados">Meus dados</a>
              </li>
              <li>
                <a href="#quem-somos">Quem somos</a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="site-footer-bottom">
          <span>
            &copy; {new Date().getFullYear()} {church.name}
          </span>
        </div>
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
      <Suspense fallback={<p className="state-screen">Carregando...</p>}>
        {route === "agenda" ? (
          <SchedulePage schedule={schedule} />
        ) : route === "politica-privacidade" ? (
          <PrivacyPolicy />
        ) : route === "meus-dados" ? (
          <UserDataRequest />
        ) : route === "quem-somos" ? (
          <QuemSomosPage />
        ) : route === "confissao-de-fe" ? (
          <ConfessionPage />
        ) : route === "primeira-vez" ? (
          <FirstTimePage />
        ) : route === "pregacoes" ? (
          <TeachingsPage schedule={schedule} />
        ) : route === "doacoes" ? (
          <DonationsPage />
        ) : (
          <SiteHome
            pinnedAnnouncements={pinnedAnnouncements}
            schedule={schedule}
            prayerMutation={prayerMutation}
            prayerFormError={prayerFormError}
            onPrayerRequest={handlePrayerRequest}
          />
        )}
      </Suspense>
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
