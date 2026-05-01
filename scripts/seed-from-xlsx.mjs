import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as XLSX from "xlsx";

const ROOT = process.cwd();
const CULTOS_XLSX = resolve(ROOT, "supabase/sources/Escala-de-cultos.xlsx");
const SOM_XLSX = resolve(ROOT, "supabase/sources/escala-som.xlsx");
const SCHEMA_PATH = resolve(ROOT, "supabase/schema.sql");
const BR_OFFSET_HOURS = 3;
const BEGIN_MARKER = "-- BEGIN SEED ------------------------------------------------------------------";
const END_MARKER = "-- END SEED --------------------------------------------------------------------";

const stripAccents = (value) => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "");

const normalizeName = (raw) => {
  if (!raw) return "";
  let name = stripAccents(String(raw).trim());
  name = name.replace(/^Semin\./i, "Sem.");
  return name;
};

const SOUND_NAME_MAP = new Map([
  ["Ana Claudia", "Ir. Ana Claudia"],
  ["Brainer", "Ir. Brainer"],
  ["Fernando", "Ir. Fernando"],
  ["Leandro", "Ir. Leandro"],
  ["Miguel", "Ir. Miguel"]
]);

const normalizeSoundName = (raw) => {
  const trimmed = stripAccents(String(raw).trim());
  return SOUND_NAME_MAP.get(trimmed) ?? trimmed;
};

function excelDateTimeToIso(daySerial, timeFraction) {
  const days = daySerial - 25569;
  const seconds = Math.round(days * 86400 + (timeFraction || 0) * 86400);
  const ms = (seconds + BR_OFFSET_HOURS * 3600) * 1000;
  return new Date(ms).toISOString();
}

function excelDateToIsoDay(daySerial) {
  const days = daySerial - 25569;
  const ms = days * 86400 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function ddmmyyyyToIsoDay(value) {
  const [dd, mm, yyyy] = String(value).split("/");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function ministryFor(title) {
  const t = title.toLowerCase();
  if (t.startsWith("escola")) return "escola-biblica";
  if (t.startsWith("encontro de mulheres")) return "mulheres";
  if (t.includes("livre")) return "geral";
  if (t.startsWith("culto")) return "culto";
  return "geral";
}

function deterministicUuid(...parts) {
  const hash = createHash("sha256").update(parts.join("|")).digest();
  const bytes = Array.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const cultosBuffer = await readFile(CULTOS_XLSX);
const cultosWb = XLSX.read(cultosBuffer, { type: "buffer" });
const cultosRows = XLSX.utils.sheet_to_json(cultosWb.Sheets[cultosWb.SheetNames[0]], {
  header: 1,
  raw: true,
  defval: null
});

const somBuffer = await readFile(SOM_XLSX);
const somWb = XLSX.read(somBuffer, { type: "buffer" });
const somRows = XLSX.utils.sheet_to_json(somWb.Sheets[somWb.SheetNames[0]], {
  header: 1,
  raw: true,
  defval: null
});

const soundByDay = new Map();
for (let i = 1; i < somRows.length; i++) {
  const row = somRows[i];
  if (!row) continue;
  const [date, , responsavel] = row;
  if (!date || !responsavel) continue;
  const isoDay = typeof date === "number" ? excelDateToIsoDay(date) : ddmmyyyyToIsoDay(date);
  soundByDay.set(isoDay, normalizeSoundName(responsavel));
}

function parseRow(row) {
  const [date, , timeStart, timeEnd, rawTitle, , director, preacher, leitura, special] = row;
  if (!date || !rawTitle) return null;

  let title = stripAccents(String(rawTitle).trim());
  let status = "scheduled";

  if (/livre/i.test(title)) {
    status = "free";
    title = "Livre";
  } else if (/\(\s*suspens[ao]\s*\)/i.test(title)) {
    status = "suspended";
    title = title.replace(/\s*\(\s*suspens[ao]\s*\)\s*/i, "").trim();
  }

  const startsAt = excelDateTimeToIso(date, timeStart || 0);
  const endsAt = excelDateTimeToIso(date, timeEnd || (timeStart || 0) + 90 / 1440);
  const isoDay = excelDateToIsoDay(date);
  const ministryName = ministryFor(title);

  const isCultoSolene = title.toLowerCase() === "culto solene";

  return {
    id: deterministicUuid(startsAt, ministryName, title),
    title,
    ministry: ministryName,
    startsAt,
    endsAt,
    location: "Templo principal",
    summary: "",
    preacher: normalizeName(preacher),
    director: normalizeName(director),
    soundTeam: isCultoSolene ? (soundByDay.get(isoDay) ?? "") : "",
    passage: leitura ? stripAccents(String(leitura).trim()) : "",
    occasionLabel: special ? stripAccents(String(special).trim()) : "",
    status
  };
}

const items = [];
for (let i = 1; i <= 212; i++) {
  const parsed = parseRow(cultosRows[i]);
  if (parsed) items.push(parsed);
}

const PERSON_PREFIX_ORDER = ["Pr.", "Pb.", "Sem.", "Diac.", "Ir."];

function sortKey(name) {
  const isGroup = /^[A-Z\s]+$/.test(name) || name === "Convidado";
  if (isGroup) return [PERSON_PREFIX_ORDER.length + 1, name];
  for (let i = 0; i < PERSON_PREFIX_ORDER.length; i++) {
    if (name.startsWith(PERSON_PREFIX_ORDER[i] + " ")) return [i, name];
  }
  return [PERSON_PREFIX_ORDER.length, name];
}

const preacherDirectorNames = new Set();
const soundNames = new Set();
for (const item of items) {
  if (item.preacher) preacherDirectorNames.add(item.preacher);
  if (item.director) preacherDirectorNames.add(item.director);
  if (item.soundTeam) soundNames.add(item.soundTeam);
}

const allNames = new Set([...preacherDirectorNames, ...soundNames]);
const volunteers = [...allNames]
  .map((name) => ({
    id: deterministicUuid("volunteer", name),
    name,
    role: preacherDirectorNames.has(name) ? "geral" : "som",
    sortOrder: 0
  }))
  .sort((left, right) => {
    const [lt, ln] = sortKey(left.name);
    const [rt, rn] = sortKey(right.name);
    if (lt !== rt) return lt - rt;
    return ln.localeCompare(rn, "pt-BR");
  })
  .map((volunteer, index) => ({ ...volunteer, sortOrder: (index + 1) * 10 }));

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const scheduleValueRows = items
  .map((item, index) => {
    const cells = [
      `${quote(item.id)}::uuid`,
      quote(item.title),
      quote(item.ministry),
      index === 0 ? `${quote(item.startsAt)}::timestamptz` : quote(item.startsAt),
      index === 0 ? `${quote(item.endsAt)}::timestamptz` : quote(item.endsAt),
      quote(item.location),
      quote(item.summary),
      quote(item.preacher),
      quote(item.director),
      quote(item.soundTeam),
      quote(item.passage),
      quote(item.occasionLabel),
      index === 0 ? `${quote(item.status)}::public.schedule_status` : quote(item.status)
    ].join(", ");
    return `    (${cells})`;
  })
  .join(",\n");

const volunteerValueRows = volunteers
  .map((volunteer) => {
    const cells = [
      `${quote(volunteer.id)}::uuid`,
      quote(volunteer.name),
      quote(volunteer.role),
      String(volunteer.sortOrder)
    ].join(", ");
    return `    (${cells})`;
  })
  .join(",\n");

const scheduleSeed = `with schedule_seed (
  id, title, ministry, starts_at, ends_at, location, summary,
  preacher, director, sound_team, passage, occasion_label, status
) as (
  values
${scheduleValueRows}
)
insert into public.schedule_items as si
  (id, title, ministry, starts_at, ends_at, location, summary,
   preacher, director, sound_team, passage, occasion_label, status, featured)
select
  ss.id,
  ss.title,
  ss.ministry,
  ss.starts_at,
  ss.ends_at,
  ss.location,
  ss.summary,
  ss.preacher,
  ss.director,
  ss.sound_team,
  ss.passage,
  ss.occasion_label,
  ss.status,
  false
from schedule_seed ss
on conflict (starts_at, title) do update set
  ministry = excluded.ministry,
  ends_at = excluded.ends_at,
  location = excluded.location,
  summary = excluded.summary,
  preacher = excluded.preacher,
  director = excluded.director,
  sound_team = excluded.sound_team,
  passage = excluded.passage,
  occasion_label = excluded.occasion_label,
  status = excluded.status
where si.ministry is distinct from excluded.ministry
   or si.ends_at is distinct from excluded.ends_at
   or si.location is distinct from excluded.location
   or si.summary is distinct from excluded.summary
   or si.preacher is distinct from excluded.preacher
   or si.director is distinct from excluded.director
   or si.sound_team is distinct from excluded.sound_team
   or si.passage is distinct from excluded.passage
   or si.occasion_label is distinct from excluded.occasion_label
   or si.status is distinct from excluded.status;`;

const volunteersSeed = `with volunteer_seed (id, name, role, sort_order) as (
  values
${volunteerValueRows}
)
insert into public.volunteers as v (id, name, role, sort_order)
select vs.id, vs.name, vs.role, vs.sort_order
from volunteer_seed vs
on conflict ((lower(name))) do update set
  role = excluded.role,
  sort_order = excluded.sort_order
where v.role is distinct from excluded.role
   or v.sort_order is distinct from excluded.sort_order;`;

const seed = `${scheduleSeed}\n\n${volunteersSeed}`;
const block = [BEGIN_MARKER, seed, END_MARKER].join("\n");

const schema = await readFile(SCHEMA_PATH, "utf8");
const startIdx = schema.indexOf(BEGIN_MARKER);
const endIdx = schema.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  throw new Error(`SEED markers not found in ${SCHEMA_PATH}`);
}

const next = schema.slice(0, startIdx) + block + schema.slice(endIdx + END_MARKER.length);
await writeFile(SCHEMA_PATH, next);
console.log(
  `Updated SEED block in ${SCHEMA_PATH}: ${items.length} schedule items, ${volunteers.length} volunteers`
);
