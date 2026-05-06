import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  asAdmin,
  asAnon,
  asAuthenticated,
  asServiceRole,
  connectTestDb,
  createAuthUser,
  deleteAuthUser,
  makeAdmin,
  type TestDb
} from "./helpers";

describe("RLS schedule_items", () => {
  let db: TestDb;
  let adminUserId: string;
  let nonAdminUserId: string;
  let visibleId: string;
  let archivedId: string;

  beforeAll(async () => {
    db = await connectTestDb();
    await asServiceRole(db.client);
    adminUserId = await createAuthUser(db.client, `admin-sched-${Date.now()}@test.local`);
    nonAdminUserId = await createAuthUser(db.client, `user-sched-${Date.now()}@test.local`);
    await makeAdmin(db.client, adminUserId, "owner");

    const visible = await db.client.query<{ id: string }>(
      `insert into public.schedule_items (title, ministry, starts_at, ends_at, location, summary)
       values ('Sched RLS Visivel', 'louvor', now() + interval '1 day', now() + interval '1 day 2 hours', 'Salao', 'visivel')
       returning id`
    );
    visibleId = visible.rows[0].id;

    const archived = await db.client.query<{ id: string }>(
      `insert into public.schedule_items (title, ministry, starts_at, ends_at, location, summary, deleted_at)
       values ('Sched RLS Arquivado', 'louvor', now() + interval '2 day', now() + interval '2 day 2 hours', 'Salao', 'oculto', now())
       returning id`
    );
    archivedId = archived.rows[0].id;
  });

  afterAll(async () => {
    await asServiceRole(db.client);
    await db.client.query("delete from public.schedule_items where id = any($1::uuid[])", [
      [visibleId, archivedId]
    ]);
    await db.client.query("delete from public.admin_rate_limit_buckets where user_id = any($1::uuid[])", [
      [adminUserId, nonAdminUserId]
    ]);
    await db.client.query("delete from public.admin_users where user_id = any($1::uuid[])", [
      [adminUserId, nonAdminUserId]
    ]);
    await deleteAuthUser(db.client, adminUserId);
    await deleteAuthUser(db.client, nonAdminUserId);
    await db.cleanup();
  });

  beforeEach(async () => {
    await asServiceRole(db.client);
  });

  it("anon le schedule ativos", async () => {
    await asAnon(db.client);
    const result = await db.client.query("select id from public.schedule_items where id = $1", [visibleId]);
    expect(result.rows).toHaveLength(1);
  });

  it("anon nao ve schedule arquivado", async () => {
    await asAnon(db.client);
    const result = await db.client.query("select id from public.schedule_items where id = $1", [archivedId]);
    expect(result.rows).toHaveLength(0);
  });

  it("admin atualiza schedule", async () => {
    await asAdmin(db.client, adminUserId);
    const result = await db.client.query<{ id: string }>(
      "update public.schedule_items set summary = 'editado pelo admin' where id = $1 returning id",
      [visibleId]
    );
    expect(result.rows).toHaveLength(1);
  });

  it("non-admin authenticated nao consegue atualizar schedule", async () => {
    await asAuthenticated(db.client, nonAdminUserId);
    const result = await db.client.query(
      "update public.schedule_items set summary = 'tentativa nao autorizada' where id = $1 returning id",
      [visibleId]
    );
    expect(result.rows).toHaveLength(0);
  });

  it("non-admin authenticated nao consegue inserir schedule", async () => {
    await asAuthenticated(db.client, nonAdminUserId);
    await expect(
      db.client.query(
        `insert into public.schedule_items (title, ministry, starts_at, ends_at, location, summary)
         values ('Tentativa', 'louvor', now() + interval '3 day', now() + interval '3 day 2 hours', 'Salao', 'x')`
      )
    ).rejects.toThrow(/row-level security/i);
  });

  it("admin insere schedule", async () => {
    await asAdmin(db.client, adminUserId);
    const inserted = await db.client.query<{ id: string }>(
      `insert into public.schedule_items (title, ministry, starts_at, ends_at, location, summary)
       values ('Admin Inseriu', 'louvor', now() + interval '4 day', now() + interval '4 day 2 hours', 'Salao', 'inserted')
       returning id`
    );
    expect(inserted.rows).toHaveLength(1);

    await asServiceRole(db.client);
    await db.client.query("delete from public.schedule_items where id = $1", [inserted.rows[0].id]);
  });
});
