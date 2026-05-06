import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  asAdmin,
  asAuthenticated,
  asServiceRole,
  connectTestDb,
  createAuthUser,
  deleteAuthUser,
  makeAdmin,
  type TestDb
} from "./helpers";

describe("Archive/restore RPCs", () => {
  let db: TestDb;
  let adminUserId: string;
  let nonAdminUserId: string;

  beforeAll(async () => {
    db = await connectTestDb();
    await asServiceRole(db.client);
    adminUserId = await createAuthUser(db.client, `admin-arch-${Date.now()}@test.local`);
    nonAdminUserId = await createAuthUser(db.client, `user-arch-${Date.now()}@test.local`);
    await makeAdmin(db.client, adminUserId, "owner");
  });

  afterAll(async () => {
    await asServiceRole(db.client);
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
    await db.client.query("delete from public.admin_rate_limit_buckets where user_id = any($1::uuid[])", [
      [adminUserId, nonAdminUserId]
    ]);
  });

  describe("announcements", () => {
    it("archive_announcement marca deleted_at e restore_announcement limpa", async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.announcements (title, summary, category)
         values ('Arc Aviso', 'sumario', 'geral') returning id`
      );
      const id = inserted.rows[0].id;

      await asAdmin(db.client, adminUserId);
      await db.client.query("select public.archive_announcement($1)", [id]);

      await asServiceRole(db.client);
      let row = await db.client.query<{ deleted_at: string | null }>(
        "select deleted_at from public.announcements where id = $1",
        [id]
      );
      expect(row.rows[0].deleted_at).not.toBeNull();

      await asAdmin(db.client, adminUserId);
      await db.client.query("select public.restore_announcement($1)", [id]);

      await asServiceRole(db.client);
      row = await db.client.query<{ deleted_at: string | null }>(
        "select deleted_at from public.announcements where id = $1",
        [id]
      );
      expect(row.rows[0].deleted_at).toBeNull();

      await db.client.query("delete from public.announcements where id = $1", [id]);
    });

    it("archive_announcement nega non-admin", async () => {
      await asAuthenticated(db.client, nonAdminUserId);
      await expect(
        db.client.query("select public.archive_announcement($1)", ["00000000-0000-0000-0000-000000000000"])
      ).rejects.toThrow(/Acesso negado/);
    });

    it("restore_announcement nega non-admin", async () => {
      await asAuthenticated(db.client, nonAdminUserId);
      await expect(
        db.client.query("select public.restore_announcement($1)", ["00000000-0000-0000-0000-000000000000"])
      ).rejects.toThrow(/Acesso negado/);
    });
  });

  describe("schedule_items", () => {
    it("archive_schedule_item / restore_schedule_item ciclo completo", async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.schedule_items (title, ministry, starts_at, ends_at, location, summary)
         values ('Arc Sched', 'louvor', now() + interval '1 day', now() + interval '1 day 2 hours', 'Salao', 'x')
         returning id`
      );
      const id = inserted.rows[0].id;

      await asAdmin(db.client, adminUserId);
      await db.client.query("select public.archive_schedule_item($1)", [id]);

      await asServiceRole(db.client);
      let row = await db.client.query<{ deleted_at: string | null }>(
        "select deleted_at from public.schedule_items where id = $1",
        [id]
      );
      expect(row.rows[0].deleted_at).not.toBeNull();

      await asAdmin(db.client, adminUserId);
      await db.client.query("select public.restore_schedule_item($1)", [id]);

      await asServiceRole(db.client);
      row = await db.client.query<{ deleted_at: string | null }>(
        "select deleted_at from public.schedule_items where id = $1",
        [id]
      );
      expect(row.rows[0].deleted_at).toBeNull();

      await db.client.query("delete from public.schedule_items where id = $1", [id]);
    });

    it("archive_schedule_item nega non-admin", async () => {
      await asAuthenticated(db.client, nonAdminUserId);
      await expect(
        db.client.query("select public.archive_schedule_item($1)", ["00000000-0000-0000-0000-000000000000"])
      ).rejects.toThrow(/Acesso negado/);
    });

    it("restore_schedule_item nega non-admin", async () => {
      await asAuthenticated(db.client, nonAdminUserId);
      await expect(
        db.client.query("select public.restore_schedule_item($1)", ["00000000-0000-0000-0000-000000000000"])
      ).rejects.toThrow(/Acesso negado/);
    });
  });

  describe("prayer_requests", () => {
    it("archive_prayer_request / restore_prayer_request ciclo completo", async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.prayer_requests (name, message)
         values ('Arc Prayer', 'pedido') returning id`
      );
      const id = inserted.rows[0].id;

      await asAdmin(db.client, adminUserId);
      await db.client.query("select public.archive_prayer_request($1)", [id]);

      await asServiceRole(db.client);
      let row = await db.client.query<{ deleted_at: string | null }>(
        "select deleted_at from public.prayer_requests where id = $1",
        [id]
      );
      expect(row.rows[0].deleted_at).not.toBeNull();

      await asAdmin(db.client, adminUserId);
      await db.client.query("select public.restore_prayer_request($1)", [id]);

      await asServiceRole(db.client);
      row = await db.client.query<{ deleted_at: string | null }>(
        "select deleted_at from public.prayer_requests where id = $1",
        [id]
      );
      expect(row.rows[0].deleted_at).toBeNull();

      await db.client.query("delete from public.prayer_requests where id = $1", [id]);
    });

    it("archive_prayer_request nega non-admin", async () => {
      await asAuthenticated(db.client, nonAdminUserId);
      await expect(
        db.client.query("select public.archive_prayer_request($1)", ["00000000-0000-0000-0000-000000000000"])
      ).rejects.toThrow(/Acesso negado/);
    });

    it("restore_prayer_request nega non-admin", async () => {
      await asAuthenticated(db.client, nonAdminUserId);
      await expect(
        db.client.query("select public.restore_prayer_request($1)", ["00000000-0000-0000-0000-000000000000"])
      ).rejects.toThrow(/Acesso negado/);
    });
  });

  describe("ministries", () => {
    it("archive_ministry / restore_ministry ciclo completo", async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.ministries (slug, name)
         values ('arc-test-${Date.now()}', 'Arc Ministerio') returning id`
      );
      const id = inserted.rows[0].id;

      await asAdmin(db.client, adminUserId);
      await db.client.query("select public.archive_ministry($1)", [id]);

      await asServiceRole(db.client);
      let row = await db.client.query<{ deleted_at: string | null }>(
        "select deleted_at from public.ministries where id = $1",
        [id]
      );
      expect(row.rows[0].deleted_at).not.toBeNull();

      await asAdmin(db.client, adminUserId);
      await db.client.query("select public.restore_ministry($1)", [id]);

      await asServiceRole(db.client);
      row = await db.client.query<{ deleted_at: string | null }>(
        "select deleted_at from public.ministries where id = $1",
        [id]
      );
      expect(row.rows[0].deleted_at).toBeNull();

      await db.client.query("delete from public.ministries where id = $1", [id]);
    });

    it("archive_ministry nega non-admin", async () => {
      await asAuthenticated(db.client, nonAdminUserId);
      await expect(
        db.client.query("select public.archive_ministry($1)", ["00000000-0000-0000-0000-000000000000"])
      ).rejects.toThrow(/Acesso negado/);
    });

    it("restore_ministry nega non-admin", async () => {
      await asAuthenticated(db.client, nonAdminUserId);
      await expect(
        db.client.query("select public.restore_ministry($1)", ["00000000-0000-0000-0000-000000000000"])
      ).rejects.toThrow(/Acesso negado/);
    });
  });
});
