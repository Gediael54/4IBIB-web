import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  asAdmin,
  asAnon,
  asServiceRole,
  connectTestDb,
  createAuthUser,
  deleteAuthUser,
  makeAdmin,
  type TestDb
} from "./helpers";

describe("RLS policies", () => {
  let db: TestDb;
  let adminUserId: string;
  let nonAdminUserId: string;

  beforeAll(async () => {
    db = await connectTestDb();
    await asServiceRole(db.client);
    adminUserId = await createAuthUser(db.client, `admin-rls-${Date.now()}@test.local`);
    nonAdminUserId = await createAuthUser(db.client, `user-rls-${Date.now()}@test.local`);
    await makeAdmin(db.client, adminUserId, "owner");
  });

  afterAll(async () => {
    await asServiceRole(db.client);
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

  describe("prayer_requests", () => {
    let prayerId: string;

    beforeAll(async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.prayer_requests (name, message)
         values ('Visitante RLS', 'pedido de teste') returning id`
      );
      prayerId = inserted.rows[0].id;
    });

    afterAll(async () => {
      await asServiceRole(db.client);
      await db.client.query("delete from public.prayer_requests where id = $1", [prayerId]);
    });

    it("anon cannot SELECT prayer_requests", async () => {
      await asAnon(db.client);
      const result = await db.client.query("select id from public.prayer_requests where id = $1", [prayerId]);
      expect(result.rows).toHaveLength(0);
    });

    it("authenticated non-admin cannot SELECT prayer_requests", async () => {
      await asAdmin(db.client, nonAdminUserId);
      const result = await db.client.query("select id from public.prayer_requests where id = $1", [prayerId]);
      expect(result.rows).toHaveLength(0);
    });

    it("admin can SELECT prayer_requests", async () => {
      await asAdmin(db.client, adminUserId);
      const result = await db.client.query("select id from public.prayer_requests where id = $1", [prayerId]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(prayerId);
    });
  });

  describe("announcements", () => {
    let visibleId: string;
    let archivedId: string;

    beforeAll(async () => {
      await asServiceRole(db.client);
      const visible = await db.client.query<{ id: string }>(
        `insert into public.announcements (title, summary, category)
         values ('RLS visivel', 'sumario visivel', 'geral') returning id`
      );
      visibleId = visible.rows[0].id;
      const archived = await db.client.query<{ id: string }>(
        `insert into public.announcements (title, summary, category, deleted_at)
         values ('RLS arquivado', 'sumario arquivado', 'geral', now()) returning id`
      );
      archivedId = archived.rows[0].id;
    });

    afterAll(async () => {
      await asServiceRole(db.client);
      await db.client.query("delete from public.announcements where id = any($1::uuid[])", [
        [visibleId, archivedId]
      ]);
    });

    it("public can SELECT announcements when deleted_at is null", async () => {
      await asAnon(db.client);
      const result = await db.client.query("select id from public.announcements where id = $1", [visibleId]);
      expect(result.rows).toHaveLength(1);
    });

    it("public cannot SELECT archived announcements", async () => {
      await asAnon(db.client);
      const result = await db.client.query("select id from public.announcements where id = $1", [archivedId]);
      expect(result.rows).toHaveLength(0);
    });
  });

  describe("members", () => {
    let publicMemberId: string;
    let privateMemberId: string;

    beforeAll(async () => {
      await asServiceRole(db.client);
      const publicMember = await db.client.query<{ id: string }>(
        `insert into public.members (full_name, public_directory)
         values ('RLS Membro Publico', true) returning id`
      );
      publicMemberId = publicMember.rows[0].id;
      const privateMember = await db.client.query<{ id: string }>(
        `insert into public.members (full_name, public_directory)
         values ('RLS Membro Privado', false) returning id`
      );
      privateMemberId = privateMember.rows[0].id;
    });

    afterAll(async () => {
      await asServiceRole(db.client);
      await db.client.query("delete from public.members where id = any($1::uuid[])", [
        [publicMemberId, privateMemberId]
      ]);
    });

    it("public can SELECT members when public_directory=true", async () => {
      await asAnon(db.client);
      const result = await db.client.query("select id from public.members where id = $1", [publicMemberId]);
      expect(result.rows).toHaveLength(1);
    });

    it("public cannot SELECT members when public_directory=false", async () => {
      await asAnon(db.client);
      const result = await db.client.query("select id from public.members where id = $1", [privateMemberId]);
      expect(result.rows).toHaveLength(0);
    });

    it("admin can SELECT all members regardless of public_directory", async () => {
      await asAdmin(db.client, adminUserId);
      const result = await db.client.query("select id from public.members where id = any($1::uuid[])", [
        [publicMemberId, privateMemberId]
      ]);
      expect(result.rows).toHaveLength(2);
    });
  });
});
