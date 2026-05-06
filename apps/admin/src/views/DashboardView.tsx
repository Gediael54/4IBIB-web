import { formatDateTime, type PrayerRequest, type ScheduleItem, type SiteSnapshot } from "@4ibib/core";

type AdminView =
  | "announcements"
  | "schedule"
  | "members"
  | "volunteers"
  | "prayers"
  | "profile"
  | "ministries"
  | "audit"
  | "team";

interface DashboardViewProps {
  snapshot: SiteSnapshot;
  prayers: PrayerRequest[];
  onNavigate?: (view: AdminView) => void;
}

type CardTone = "default" | "warning" | "alert";
type Severity = 0 | 1 | 2 | 3;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
const BURNOUT_THRESHOLD = 5;

function isMainService(item: ScheduleItem): boolean {
  return item.title.toLowerCase().includes("culto solene");
}

function isWithinNextDays(item: ScheduleItem, now: number, windowMs: number): boolean {
  const startsAt = Date.parse(item.startsAt);
  return startsAt > now && startsAt < now + windowMs;
}

function countNewPrayers(prayers: PrayerRequest[]): number {
  const cutoff = Date.now() - ONE_DAY_MS;
  return prayers.filter(
    (prayer) => prayer.status === "novo" && prayer.seenAt === null && Date.parse(prayer.createdAt) < cutoff
  ).length;
}

function countServicesMissingRole(schedule: ScheduleItem[], field: "preacher" | "director"): number {
  const now = Date.now();
  return schedule.filter(
    (item) =>
      item.status === "scheduled" &&
      isWithinNextDays(item, now, SEVEN_DAYS_MS) &&
      item[field].trim() === "" &&
      isMainService(item)
  ).length;
}

function countStalePinned(snapshot: SiteSnapshot): number {
  const now = Date.now();
  return snapshot.announcements.filter((announcement) => {
    if (!announcement.pinned) {
      return false;
    }
    if (announcement.status === "archived") {
      return true;
    }
    if (announcement.expiresAt && Date.parse(announcement.expiresAt) < now) {
      return true;
    }
    return false;
  }).length;
}

function topVolunteer(schedule: ScheduleItem[]): { name: string; count: number } | null {
  const now = Date.now();
  const counts = new Map<string, number>();
  const upcoming = schedule.filter(
    (item) => item.status === "scheduled" && isWithinNextDays(item, now, THIRTY_DAYS_MS)
  );

  for (const item of upcoming) {
    const names = [item.preacher, item.director, ...item.soundTeam.split(",").map((entry) => entry.trim())];
    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) {
        continue;
      }
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  let topName = "";
  let topCount = 0;
  for (const [name, count] of counts) {
    if (count > topCount) {
      topName = name;
      topCount = count;
    }
  }

  if (topCount === 0) {
    return null;
  }

  return { name: topName, count: topCount };
}

function nextSevenDaysEvents(schedule: ScheduleItem[]): ScheduleItem[] {
  const now = Date.now();
  return schedule
    .filter((item) => item.status === "scheduled" && isWithinNextDays(item, now, SEVEN_DAYS_MS))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
}

interface MetricSummary {
  id: string;
  title: string;
  count: number;
  description: string;
  emptyDescription: string;
  ctaLabel: string;
  navigateTo: AdminView;
  severity: Severity;
  tone: CardTone;
}

function buildMetrics(snapshot: SiteSnapshot, prayers: PrayerRequest[]): MetricSummary[] {
  const newPrayersCount = countNewPrayers(prayers);
  const servicesMissingPreacher = countServicesMissingRole(snapshot.schedule, "preacher");
  const servicesMissingDirector = countServicesMissingRole(snapshot.schedule, "director");
  const stalePinned = countStalePinned(snapshot);

  return [
    {
      id: "prayers",
      title: "Pedidos de oracao novos",
      count: newPrayersCount,
      description: "Pedidos com mais de 24h sem leitura. Priorize o cuidado pastoral.",
      emptyDescription: "OK, nada pendente.",
      ctaLabel: "Ver pedidos novos",
      navigateTo: "prayers",
      severity: newPrayersCount > 0 ? 3 : 0,
      tone: "alert"
    },
    {
      id: "preacher",
      title: "Cultos solenes sem pregador",
      count: servicesMissingPreacher,
      description: "Cultos solenes nos proximos 7 dias ainda sem pregador definido.",
      emptyDescription: "OK, nada pendente.",
      ctaLabel: "Editar programacao",
      navigateTo: "schedule",
      severity: servicesMissingPreacher > 0 ? 2 : 0,
      tone: "warning"
    },
    {
      id: "director",
      title: "Cultos solenes sem dirigente",
      count: servicesMissingDirector,
      description: "Cultos solenes nos proximos 7 dias ainda sem dirigente definido.",
      emptyDescription: "OK, nada pendente.",
      ctaLabel: "Editar programacao",
      navigateTo: "schedule",
      severity: servicesMissingDirector > 0 ? 2 : 0,
      tone: "warning"
    },
    {
      id: "pinned",
      title: "Avisos fixados desatualizados",
      count: stalePinned,
      description: "Avisos fixados arquivados ou com data de expiracao no passado.",
      emptyDescription: "OK, nada pendente.",
      ctaLabel: "Ver avisos",
      navigateTo: "announcements",
      severity: stalePinned > 0 ? 1 : 0,
      tone: "warning"
    }
  ];
}

interface SummaryCardProps {
  title: string;
  count: number;
  description: string;
  emptyDescription: string;
  tone: CardTone;
  ctaLabel?: string;
  onAction?: () => void;
}

function SummaryCard({
  title,
  count,
  description,
  emptyDescription,
  tone,
  ctaLabel,
  onAction
}: SummaryCardProps) {
  const isEmpty = count === 0;
  const className = isEmpty ? "dashboard-card empty" : `dashboard-card ${tone}`;
  return (
    <article className={className}>
      <header>
        <h3>{title}</h3>
        <strong className="dashboard-card-count">{count}</strong>
      </header>
      <p>{isEmpty ? emptyDescription : description}</p>
      {!isEmpty && ctaLabel && onAction && (
        <button className="button ghost" type="button" onClick={onAction}>
          {ctaLabel}
        </button>
      )}
    </article>
  );
}

interface DashboardCardProps extends SummaryCardProps {
  // backwards-compatible alias for tests/external callers
  tone: CardTone;
}

export function DashboardCard(props: DashboardCardProps) {
  return <SummaryCard {...props} />;
}

export default function DashboardView({ snapshot, prayers, onNavigate }: DashboardViewProps) {
  const metrics = buildMetrics(snapshot, prayers);
  const hero = metrics
    .filter((metric) => metric.count > 0)
    .sort((left, right) => right.severity - left.severity)[0];
  const upcomingEvents = nextSevenDaysEvents(snapshot.schedule).slice(0, 5);
  const top = topVolunteer(snapshot.schedule);
  const burnoutTone: CardTone = top && top.count >= BURNOUT_THRESHOLD ? "warning" : "default";

  return (
    <section className="dashboard-view">
      <header className="workspace-heading dashboard-heading">
        <div>
          <p className="eyebrow">Resumo</p>
          <h1>Dashboard</h1>
        </div>
        {onNavigate && (
          <div className="dashboard-quick-actions" role="toolbar" aria-label="Atalhos rapidos">
            <button
              className="button primary"
              type="button"
              onClick={() => onNavigate("announcements")}
              data-testid="quick-new-announcement"
            >
              Novo aviso
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() => onNavigate("members")}
              data-testid="quick-new-member"
            >
              Cadastrar membro
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() => onNavigate("prayers")}
              data-testid="quick-view-prayers"
            >
              Ver oracao
            </button>
          </div>
        )}
      </header>

      {hero ? (
        <article
          className={`dashboard-hero dashboard-hero-${hero.tone}`}
          role="region"
          aria-label="Alerta priorizado"
          data-testid="dashboard-hero"
        >
          <header>
            <p className="eyebrow">Prioridade alta</p>
            <h2 data-testid="dashboard-hero-title">Atencao: {hero.title}</h2>
            <strong className="dashboard-hero-count">{hero.count}</strong>
          </header>
          <p>{hero.description}</p>
          {onNavigate && (
            <button
              className="button primary"
              type="button"
              data-testid="dashboard-hero-cta"
              onClick={() => onNavigate(hero.navigateTo)}
            >
              Ir para {hero.title.toLowerCase()}
            </button>
          )}
        </article>
      ) : (
        <article className="dashboard-hero dashboard-hero-empty" role="region" aria-label="Sem alertas">
          <header>
            <p className="eyebrow">Tudo em dia</p>
            <h2>Sem alertas pendentes</h2>
          </header>
          <p>Nenhuma metrica critica para tratar agora. Use os atalhos para criar conteudo novo.</p>
        </article>
      )}

      <div className="dashboard-grid">
        <SummaryCard
          tone="default"
          title="Voluntarios cadastrados"
          count={snapshot.volunteers.length}
          description={`${snapshot.volunteers.length} voluntarios disponiveis para escalar.`}
          emptyDescription="Nenhum voluntario cadastrado ainda."
          ctaLabel={onNavigate ? "Ver membros" : undefined}
          onAction={onNavigate ? () => onNavigate("members") : undefined}
        />
        <SummaryCard
          tone="default"
          title="Proximos eventos (7 dias)"
          count={upcomingEvents.length}
          description="Eventos agendados nos proximos 7 dias."
          emptyDescription="Sem eventos nos proximos 7 dias."
          ctaLabel={onNavigate ? "Ver programacao" : undefined}
          onAction={onNavigate ? () => onNavigate("schedule") : undefined}
        />
        <SummaryCard
          tone="default"
          title="Avisos publicados"
          count={snapshot.announcements.filter((announcement) => announcement.status === "published").length}
          description="Avisos atualmente publicados no site."
          emptyDescription="Nenhum aviso publicado."
          ctaLabel={onNavigate ? "Ver avisos publicados" : undefined}
          onAction={onNavigate ? () => onNavigate("announcements") : undefined}
        />
      </div>

      <section className="dashboard-upcoming" aria-label="Proximos 7 dias">
        <h2>Proximos 7 dias</h2>
        {upcomingEvents.length === 0 ? (
          <p className="empty-note">Sem eventos nos proximos 7 dias.</p>
        ) : (
          <ul className="dashboard-upcoming-list">
            {upcomingEvents.map((event) => (
              <li key={event.id} className="dashboard-upcoming-item">
                <strong>{event.title}</strong>
                <span>{formatDateTime(event.startsAt)}</span>
                <span>{event.ministry}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Manter cards detalhados para compatibilidade com testes existentes. */}
      <div className="dashboard-grid dashboard-grid-secondary">
        <SummaryCard
          tone="alert"
          title="Pedidos de oracao novos"
          count={countNewPrayers(prayers)}
          description="Pedidos com mais de 24h sem leitura. Priorize o cuidado pastoral."
          emptyDescription="OK, nada pendente."
          ctaLabel={onNavigate ? "Ver pedidos novos" : undefined}
          onAction={onNavigate ? () => onNavigate("prayers") : undefined}
        />
        <SummaryCard
          tone="warning"
          title="Cultos solenes sem pregador"
          count={countServicesMissingRole(snapshot.schedule, "preacher")}
          description="Cultos solenes nos proximos 7 dias ainda sem pregador definido."
          emptyDescription="OK, nada pendente."
          ctaLabel={onNavigate ? "Editar programacao" : undefined}
          onAction={onNavigate ? () => onNavigate("schedule") : undefined}
        />
        <SummaryCard
          tone="warning"
          title="Cultos solenes sem dirigente"
          count={countServicesMissingRole(snapshot.schedule, "director")}
          description="Cultos solenes nos proximos 7 dias ainda sem dirigente definido."
          emptyDescription="OK, nada pendente."
          ctaLabel={onNavigate ? "Editar programacao" : undefined}
          onAction={onNavigate ? () => onNavigate("schedule") : undefined}
        />
        <SummaryCard
          tone="warning"
          title="Avisos fixados desatualizados"
          count={countStalePinned(snapshot)}
          description="Avisos fixados arquivados ou com data de expiracao no passado."
          emptyDescription="OK, nada pendente."
          ctaLabel={onNavigate ? "Ver avisos" : undefined}
          onAction={onNavigate ? () => onNavigate("announcements") : undefined}
        />
        {top ? (
          <article className={`dashboard-card ${burnoutTone}`}>
            <header>
              <h3>Voluntario mais escalado (30 dias)</h3>
              <strong className="dashboard-card-count">{top.count}</strong>
            </header>
            <p>
              {top.name} aparece em {top.count} escalas nos proximos 30 dias.
              {burnoutTone === "warning" ? " Considere distribuir mais entre os voluntarios." : ""}
            </p>
            {onNavigate && (
              <button className="button ghost" type="button" onClick={() => onNavigate("schedule")}>
                Revisar escalas
              </button>
            )}
          </article>
        ) : (
          <article className="dashboard-card empty">
            <header>
              <h3>Voluntario mais escalado (30 dias)</h3>
              <strong className="dashboard-card-count">0</strong>
            </header>
            <p>Sem escalas registradas nos proximos 30 dias.</p>
          </article>
        )}
      </div>

      <footer className="dashboard-totals">
        <span>{snapshot.announcements.length} avisos</span>
        <span>{snapshot.schedule.length} eventos</span>
        <span>{snapshot.volunteers.length} voluntarios</span>
        <span>{prayers.length} pedidos de oracao</span>
        <span>{snapshot.ministries.length} ministerios</span>
      </footer>
    </section>
  );
}
