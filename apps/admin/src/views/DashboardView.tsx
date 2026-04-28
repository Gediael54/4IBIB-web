import type { PrayerRequest, SiteSnapshot } from "@4ibib/core";

interface DashboardViewProps {
  snapshot: SiteSnapshot;
  prayers: PrayerRequest[];
}

function Stat(props: { label: string; value: number }) {
  return (
    <article className="stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

export default function DashboardView({ snapshot, prayers }: DashboardViewProps) {
  return (
    <>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Operacao</p>
          <h1>Resumo do conteudo</h1>
        </div>
      </header>
      <div className="stats-grid">
        <Stat label="Avisos" value={snapshot.announcements.length} />
        <Stat label="Eventos" value={snapshot.schedule.length} />
        <Stat label="Ministerios" value={snapshot.ministries.length} />
        <Stat label="Pedidos de oracao" value={prayers.length} />
      </div>
    </>
  );
}
