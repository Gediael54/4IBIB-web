import {
  formatDateLabel,
  type Announcement,
  type MinistryRecord,
  type PrayerRequest,
  type ScheduleItem,
  type SiteSnapshot,
  type Volunteer
} from "@4ibib/core";
import { useEffect, useMemo, useRef, useState } from "react";

export type PaletteView =
  | "dashboard"
  | "announcements"
  | "schedule"
  | "volunteers"
  | "prayers"
  | "ministries"
  | "profile"
  | "audit"
  | "team";

interface CommandPaletteProps {
  snapshot: SiteSnapshot;
  prayers: PrayerRequest[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: PaletteView) => void;
}

interface PaletteItem {
  key: string;
  title: string;
  meta: string;
  view: PaletteView;
}

const VIEW_LABELS: { id: PaletteView; label: string }[] = [
  { id: "dashboard", label: "Resumo" },
  { id: "announcements", label: "Avisos" },
  { id: "schedule", label: "Programacao" },
  { id: "volunteers", label: "Voluntarios" },
  { id: "prayers", label: "Oracao" },
  { id: "ministries", label: "Ministerios" },
  { id: "profile", label: "Perfil" },
  { id: "audit", label: "Auditoria" },
  { id: "team", label: "Equipe" }
];

const PER_CATEGORY = 5;
const TOTAL_LIMIT = 30;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function matches(query: string, ...fields: string[]): boolean {
  if (!query) return true;
  const haystack = normalize(fields.join(" "));
  return haystack.includes(query);
}

function announcementItem(item: Announcement): PaletteItem {
  return {
    key: `announcement:${item.id}`,
    title: item.title || "(sem titulo)",
    meta: `Aviso - ${item.category}`,
    view: "announcements"
  };
}

function scheduleItem(item: ScheduleItem): PaletteItem {
  return {
    key: `schedule:${item.id}`,
    title: item.title || "(sem titulo)",
    meta: `Programacao - ${formatDateLabel(item.startsAt)}`,
    view: "schedule"
  };
}

function volunteerItem(item: Volunteer): PaletteItem {
  return {
    key: `volunteer:${item.id}`,
    title: item.name || "(sem nome)",
    meta: `Voluntario - ${item.role}`,
    view: "volunteers"
  };
}

function ministryItem(item: MinistryRecord): PaletteItem {
  return {
    key: `ministry:${item.id}`,
    title: item.name || "(sem nome)",
    meta: "Ministerio",
    view: "ministries"
  };
}

function prayerItem(item: PrayerRequest): PaletteItem {
  return {
    key: `prayer:${item.id}`,
    title: item.name || "(anonimo)",
    meta: `Oracao - ${item.status}`,
    view: "prayers"
  };
}

function viewItem(entry: { id: PaletteView; label: string }): PaletteItem {
  return {
    key: `view:${entry.id}`,
    title: entry.label,
    meta: "Ir para",
    view: entry.id
  };
}

export function CommandPalette({ snapshot, prayers, open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const results = useMemo(() => {
    const normalized = normalize(query);

    const views = VIEW_LABELS.filter((entry) => matches(normalized, entry.label, entry.id)).map(viewItem);

    const announcements = snapshot.announcements
      .filter((item) => matches(normalized, item.title, item.summary, item.category))
      .slice(0, PER_CATEGORY)
      .map(announcementItem);

    const schedule = snapshot.schedule
      .filter((item) =>
        matches(normalized, item.title, item.ministry, item.preacher, item.director, item.location)
      )
      .slice(0, PER_CATEGORY)
      .map(scheduleItem);

    const volunteers = snapshot.volunteers
      .filter((item) => matches(normalized, item.name))
      .slice(0, PER_CATEGORY)
      .map(volunteerItem);

    const ministries = snapshot.ministries
      .filter((item) => matches(normalized, item.name))
      .slice(0, PER_CATEGORY)
      .map(ministryItem);

    const prayerResults = prayers
      .filter((item) => matches(normalized, item.name, item.message))
      .slice(0, PER_CATEGORY)
      .map(prayerItem);

    return [...views, ...announcements, ...schedule, ...volunteers, ...ministries, ...prayerResults].slice(
      0,
      TOTAL_LIMIT
    );
  }, [query, snapshot, prayers]);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  function activate(item: PaletteItem) {
    onNavigate(item.view);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (results.length === 0 ? 0 : (current + 1) % results.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (results.length === 0 ? 0 : (current - 1 + results.length) % results.length));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = results[active];
      if (item) activate(item);
    }
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onOpenChange(false);
    }
  }

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Busca rapida"
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          type="text"
          className="command-palette-input"
          placeholder="Buscar avisos, eventos, voluntarios..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          aria-label="Buscar"
        />
        <ul className="command-palette-list" ref={listRef} role="listbox">
          {results.length === 0 && (
            <li className="command-palette-item" aria-disabled="true">
              <span className="command-palette-item-title">Nenhum resultado</span>
            </li>
          )}
          {results.map((item, index) => (
            <li
              key={item.key}
              data-index={index}
              role="option"
              aria-selected={index === active}
              className={`command-palette-item${index === active ? " active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => activate(item)}
            >
              <span className="command-palette-item-title">{item.title}</span>
              <span className="command-palette-item-meta">{item.meta}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default CommandPalette;
