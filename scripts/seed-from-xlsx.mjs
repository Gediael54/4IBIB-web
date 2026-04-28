import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as XLSX from "xlsx";

const ROOT = process.cwd();
const XLSX_PATH = resolve(ROOT, "supabase/sources/Escala-de-cultos.xlsx");
const SCHEMA_PATH = resolve(ROOT, "supabase/schema.sql");
const BR_OFFSET_HOURS = 3;
const BEGIN_MARKER = "-- BEGIN SEED ------------------------------------------------------------------";
const END_MARKER = "-- END SEED --------------------------------------------------------------------";

const buffer = await readFile(XLSX_PATH);
const workbook = XLSX.read(buffer, { type: "buffer" });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

function excelDateTimeToIso(daySerial, timeFraction) {
  const days = daySerial - 25569;
  const seconds = Math.round(days * 86400 + (timeFraction || 0) * 86400);
  const ms = (seconds + BR_OFFSET_HOURS * 3600) * 1000;
  return new Date(ms).toISOString();
}

function ministryFor(title) {
  const t = (title || "").toLowerCase();
  if (t.startsWith("escola")) return "Escola Biblica";
  if (t.startsWith("encontro de mulheres")) return "Mulheres";
  if (t.includes("livre")) return "Geral";
  if (t.startsWith("culto")) return "Culto";
  return "Geral";
}

function parseRow(row) {
  const [date, , timeStart, timeEnd, rawTitle, eventId, director, preacher, leitura, special] = row;
  if (!date || !rawTitle) return null;

  let title = String(rawTitle).trim();
  let status = "scheduled";

  if (/livre/i.test(title)) {
    status = "free";
    title = "Livre";
  } else if (/\(\s*suspens[ao]\s*\)/i.test(title)) {
    status = "suspended";
    title = title.replace(/\s*\(\s*suspens[ao]\s*\)\s*/i, "").trim();
  }

  return {
    title,
    ministryName: ministryFor(title),
    startsAt: excelDateTimeToIso(date, timeStart || 0),
    endsAt: excelDateTimeToIso(date, timeEnd || (timeStart || 0) + 90 / 1440),
    location: "Templo principal",
    summary: "",
    preacher: preacher ? String(preacher).trim() : "",
    director: director ? String(director).trim() : "",
    passage: leitura ? String(leitura).trim() : "",
    occasionLabel: special ? String(special).trim() : "",
    googleEventId: eventId ? String(eventId).trim() : "",
    status
  };
}

const items = [];
for (let i = 1; i <= 212; i++) {
  const parsed = parseRow(rows[i]);
  if (parsed && parsed.googleEventId) items.push(parsed);
}

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const valueRows = items
  .map((item, index) => {
    const cells = [
      quote(item.title),
      quote(item.ministryName),
      index === 0 ? `${quote(item.startsAt)}::timestamptz` : quote(item.startsAt),
      index === 0 ? `${quote(item.endsAt)}::timestamptz` : quote(item.endsAt),
      quote(item.location),
      quote(item.summary),
      quote(item.preacher),
      quote(item.director),
      quote(item.passage),
      quote(item.occasionLabel),
      quote(item.googleEventId),
      quote(item.status)
    ].join(", ");
    return `    (${cells})`;
  })
  .join(",\n");

const seed = `with schedule_seed (
  title, ministry_name, starts_at, ends_at, location, summary,
  preacher, director, passage, occasion_label, google_event_id, status
) as (
  values
${valueRows}
)
insert into public.schedule_items as si
  (id, title, ministry_id, starts_at, ends_at, location, summary,
   preacher, director, passage, occasion_label, google_event_id, status, featured)
select
  gen_random_uuid(),
  ss.title,
  public.upsert_ministry_id(ss.ministry_name),
  ss.starts_at,
  ss.ends_at,
  ss.location,
  ss.summary,
  ss.preacher,
  ss.director,
  ss.passage,
  ss.occasion_label,
  ss.google_event_id,
  ss.status,
  false
from schedule_seed ss
on conflict (google_event_id) where google_event_id is not null do update set
  title = excluded.title,
  ministry_id = excluded.ministry_id,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  location = excluded.location,
  summary = excluded.summary,
  preacher = excluded.preacher,
  director = excluded.director,
  passage = excluded.passage,
  occasion_label = excluded.occasion_label,
  status = excluded.status
where si.title is distinct from excluded.title
   or si.ministry_id is distinct from excluded.ministry_id
   or si.starts_at is distinct from excluded.starts_at
   or si.ends_at is distinct from excluded.ends_at
   or si.location is distinct from excluded.location
   or si.summary is distinct from excluded.summary
   or si.preacher is distinct from excluded.preacher
   or si.director is distinct from excluded.director
   or si.passage is distinct from excluded.passage
   or si.occasion_label is distinct from excluded.occasion_label
   or si.status is distinct from excluded.status;`;

const block = [BEGIN_MARKER, seed, END_MARKER].join("\n");

const schema = await readFile(SCHEMA_PATH, "utf8");
const startIdx = schema.indexOf(BEGIN_MARKER);
const endIdx = schema.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  throw new Error(`SEED markers not found in ${SCHEMA_PATH}`);
}

const next = schema.slice(0, startIdx) + block + schema.slice(endIdx + END_MARKER.length);
await writeFile(SCHEMA_PATH, next);
console.log(`Updated SEED block in ${SCHEMA_PATH} with ${items.length} schedule items`);
