import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ScheduleItem } from "@4ibib/core";
import { sortSchedule } from "@4ibib/core";
import { CHURCH } from "../config/church";
import { formatMonthShort, formatWeekdayLong, getDayKey, getMonthKey, getZonedParts } from "../lib/date";
import { categoryOf, nameMatches, type ScheduleCategory } from "../lib/event";
import EventCard from "./EventCard";

export interface SchedulePageProps {
  schedule: ScheduleItem[];
}

interface DayGroup {
  dayKey: string;
  weekdayLabel: string;
  dayNumber: number;
  monthLabelShort: string;
  items: ScheduleItem[];
}

function getInitialQuery(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("nome")?.trim() ?? "";
}

function buildMonthOptions(items: ScheduleItem[]): { value: string; label: string }[] {
  const map = new Map<string, string>();
  for (const item of items) {
    const { key, label } = getMonthKey(item.startsAt);
    if (!map.has(key)) {
      map.set(key, label);
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([value, label]) => ({ value, label }));
}

function pickInitialMonth(options: { value: string }[]): string {
  if (options.length === 0) {
    return "";
  }
  const todayKey = getMonthKey(new Date()).key;
  if (options.some((opt) => opt.value === todayKey)) {
    return todayKey;
  }
  const future = options.find((opt) => opt.value >= todayKey);
  return future?.value ?? options[0].value;
}

function groupByDay(items: ScheduleItem[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const item of sortSchedule(items)) {
    const dayKey = getDayKey(item.startsAt);
    const existing = map.get(dayKey);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    const parts = getZonedParts(item.startsAt);
    map.set(dayKey, {
      dayKey,
      weekdayLabel: formatWeekdayLong(item.startsAt),
      dayNumber: parts.day,
      monthLabelShort: formatMonthShort(item.startsAt),
      items: [item]
    });
  }
  return Array.from(map.values()).sort((a, b) => (a.dayKey < b.dayKey ? -1 : 1));
}

const TYPE_OPTIONS: { value: ScheduleCategory; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "cultos", label: "Cultos" },
  { value: "estudos", label: "Estudos" },
  { value: "especiais", label: "Eventos especiais" }
];

export default function SchedulePage({ schedule }: SchedulePageProps) {
  const [query, setQuery] = useState<string>(() => getInitialQuery());
  const monthOptions = useMemo(() => buildMonthOptions(schedule), [schedule]);
  const [pickedMonth, setPickedMonth] = useState<string>("");
  const [typeValue, setTypeValue] = useState<ScheduleCategory>("all");

  const monthValue = useMemo(() => {
    if (pickedMonth && monthOptions.some((opt) => opt.value === pickedMonth)) {
      return pickedMonth;
    }
    return pickInitialMonth(monthOptions);
  }, [pickedMonth, monthOptions]);

  const filtered = useMemo(() => {
    return schedule.filter((item) => {
      if (monthValue) {
        const itemMonth = getMonthKey(item.startsAt).key;
        if (itemMonth !== monthValue) return false;
      }
      if (typeValue !== "all" && categoryOf(item) !== typeValue) {
        return false;
      }
      const trimmedQuery = query.trim();
      if (trimmedQuery && !nameMatches(item, trimmedQuery)) {
        return false;
      }
      return true;
    });
  }, [schedule, monthValue, typeValue, query]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  function handleClear() {
    setQuery("");
    setPickedMonth("");
    setTypeValue("all");
  }

  return (
    <main className="schedule-page">
      <a className="skip-link" href="#programacao">
        Pular para o conteudo
      </a>
      <header className="schedule-page-topbar" aria-label="Navegacao da programacao">
        <a className="schedule-page-back" href="#inicio">
          <ArrowLeft size={20} aria-hidden="true" />
          <span>Voltar</span>
        </a>
        <nav className="schedule-page-crumbs" aria-label="Caminho">
          <span className="schedule-page-brand">{CHURCH.shortName}</span>
          <span className="schedule-page-crumb-sep" aria-hidden="true">
            ›
          </span>
          <span>Programacao</span>
        </nav>
      </header>

      <section className="schedule-page-hero">
        <p className="eyebrow">Cultos e agenda</p>
        <h1>Programacao</h1>
        <p className="schedule-page-lead">Veja onde voce serve nos cultos.</p>
      </section>

      <section className="schedule-page-controls" aria-label="Filtros da programacao">
        <label className="schedule-page-search">
          <span className="schedule-page-search-label">Seu nome</span>
          <span className="schedule-page-search-input">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              name="nome"
              autoComplete="off"
              placeholder="Digite seu nome"
              value={query}
              onChange={handleQueryChange}
            />
          </span>
        </label>

        <div className="schedule-page-filters">
          <label className="schedule-page-filter">
            <span>Mes</span>
            <select
              value={monthValue}
              onChange={(event) => setPickedMonth(event.target.value)}
              disabled={monthOptions.length === 0}
            >
              {monthOptions.length === 0 ? (
                <option value="">Sem eventos</option>
              ) : (
                monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="schedule-page-filter">
            <span>Tipo</span>
            <select
              value={typeValue}
              onChange={(event) => setTypeValue(event.target.value as ScheduleCategory)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="schedule-page-list" aria-label="Lista de eventos">
        {grouped.length === 0 ? (
          <div className="schedule-page-empty">
            <p>Nenhum evento encontrado para os filtros selecionados.</p>
            <button type="button" className="button secondary" onClick={handleClear}>
              Limpar filtros
            </button>
          </div>
        ) : (
          grouped.map((group) => (
            <section key={group.dayKey} className="schedule-page-day" aria-label={group.weekdayLabel}>
              <h2 className="schedule-page-day-header">
                {group.weekdayLabel} · {group.dayNumber} {group.monthLabelShort}
              </h2>
              <ul className="schedule-page-day-events">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <EventCard item={item} highlight={query} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </section>
    </main>
  );
}
