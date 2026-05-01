import type { PrayerRequest, ScheduleItem, SiteSnapshot } from "@4ibib/core";

type AdminView =
  | "announcements"
  | "schedule"
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

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
const BURNOUT_THRESHOLD = 5;

function isCultoSolene(item: ScheduleItem): boolean {
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

function countCultosWithoutRole(schedule: ScheduleItem[], field: "preacher" | "director"): number {
  const now = Date.now();
  return schedule.filter(
    (item) =>
      item.status === "scheduled" &&
      isWithinNextDays(item, now, SEVEN_DAYS_MS) &&
      item[field].trim() === "" &&
      isCultoSolene(item)
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

interface DashboardCardProps {
  tone: CardTone;
  title: string;
  count: number;
  description: string;
  emptyDescription: string;
  ctaLabel?: string;
  onAction?: () => void;
}

function DashboardCard({
  tone,
  title,
  count,
  description,
  emptyDescription,
  ctaLabel,
  onAction
}: DashboardCardProps) {
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

export default function DashboardView({ snapshot, prayers, onNavigate }: DashboardViewProps) {
  const newPrayersCount = countNewPrayers(prayers);
  const cultosWithoutPreacher = countCultosWithoutRole(snapshot.schedule, "preacher");
  const cultosWithoutDirector = countCultosWithoutRole(snapshot.schedule, "director");
  const stalePinnedCount = countStalePinned(snapshot);
  const top = topVolunteer(snapshot.schedule);
  const burnoutTone: CardTone = top && top.count >= BURNOUT_THRESHOLD ? "warning" : "default";

  return (
    <section>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Resumo</p>
          <h1>Dashboard</h1>
        </div>
      </header>

      <div className="dashboard-grid">
        <DashboardCard
          tone="alert"
          title="Pedidos de oracao novos"
          count={newPrayersCount}
          description="Pedidos com mais de 24h sem leitura. Priorize o cuidado pastoral."
          emptyDescription="OK, nada pendente."
          ctaLabel={onNavigate ? "Ver pedidos novos" : undefined}
          onAction={onNavigate ? () => onNavigate("prayers") : undefined}
        />

        <DashboardCard
          tone="warning"
          title="Cultos solenes sem pregador"
          count={cultosWithoutPreacher}
          description="Cultos solenes nos proximos 7 dias ainda sem pregador definido."
          emptyDescription="OK, nada pendente."
          ctaLabel={onNavigate ? "Editar programacao" : undefined}
          onAction={onNavigate ? () => onNavigate("schedule") : undefined}
        />

        <DashboardCard
          tone="warning"
          title="Cultos solenes sem dirigente"
          count={cultosWithoutDirector}
          description="Cultos solenes nos proximos 7 dias ainda sem dirigente definido."
          emptyDescription="OK, nada pendente."
          ctaLabel={onNavigate ? "Editar programacao" : undefined}
          onAction={onNavigate ? () => onNavigate("schedule") : undefined}
        />

        <DashboardCard
          tone="warning"
          title="Avisos fixados desatualizados"
          count={stalePinnedCount}
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
