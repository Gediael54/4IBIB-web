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

describe("RPCs", () => {
  let db: TestDb;
  let adminUserId: string;
  let nonAdminUserId: string;

  beforeAll(async () => {
    db = await connectTestDb();
    await asServiceRole(db.client);
    adminUserId = await createAuthUser(db.client, `admin-rpc-${Date.now()}@test.local`);
    nonAdminUserId = await createAuthUser(db.client, `user-rpc-${Date.now()}@test.local`);
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

  describe("archive_member / restore_member", () => {
    it("archive_member sets deleted_at when called by admin", async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.members (full_name) values ('RPC Archive') returning id`
      );
      const memberId = inserted.rows[0].id;

      await asAdmin(db.client, adminUserId);
      await db.client.query("select public.archive_member($1)", [memberId]);

      await asServiceRole(db.client);
      const after = await db.client.query<{ deleted_at: string | null }>(
        "select deleted_at from public.members where id = $1",
        [memberId]
      );
      expect(after.rows[0].deleted_at).not.toBeNull();

      await db.client.query("delete from public.members where id = $1", [memberId]);
    });

    it("archive_member raises when caller is not admin", async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.members (full_name) values ('RPC NoAdmin') returning id`
      );
      const memberId = inserted.rows[0].id;

      await asAuthenticated(db.client, nonAdminUserId);
      await expect(db.client.query("select public.archive_member($1)", [memberId])).rejects.toThrow(
        /Acesso negado/
      );

      await asServiceRole(db.client);
      await db.client.query("delete from public.members where id = $1", [memberId]);
    });

    it("restore_member clears deleted_at", async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.members (full_name, deleted_at) values ('RPC Restore', now()) returning id`
      );
      const memberId = inserted.rows[0].id;

      await asAdmin(db.client, adminUserId);
      await db.client.query("select public.restore_member($1)", [memberId]);

      await asServiceRole(db.client);
      const after = await db.client.query<{ deleted_at: string | null }>(
        "select deleted_at from public.members where id = $1",
        [memberId]
      );
      expect(after.rows[0].deleted_at).toBeNull();

      await db.client.query("delete from public.members where id = $1", [memberId]);
    });
  });

  describe("find_member_duplicates", () => {
    const ids: string[] = [];

    afterAll(async () => {
      await asServiceRole(db.client);
      if (ids.length > 0) {
        await db.client.query("delete from public.members where id = any($1::uuid[])", [ids]);
      }
    });

    it("returns cpf_match with score 1.0 when CPF matches", async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.members (full_name, cpf) values ('Dup CPF', '12345678901') returning id`
      );
      ids.push(inserted.rows[0].id);

      await asAdmin(db.client, adminUserId);
      const result = await db.client.query<{
        member_id: string;
        score: string;
        match_reason: string;
      }>("select * from public.find_member_duplicates($1, $2, $3, $4)", [
        "Outro Nome",
        "12345678901",
        "",
        ""
      ]);
      const found = result.rows.find((r) => r.member_id === inserted.rows[0].id);
      expect(found).toBeDefined();
      expect(Number(found?.score)).toBeCloseTo(1.0, 5);
      expect(found?.match_reason).toBe("cpf_match");
    });

    it("returns email_match with score 0.9 when email matches case-insensitively", async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.members (full_name, email) values ('Dup Email', 'tester@example.com') returning id`
      );
      ids.push(inserted.rows[0].id);

      await asAdmin(db.client, adminUserId);
      const result = await db.client.query<{
        member_id: string;
        score: string;
        match_reason: string;
      }>("select * from public.find_member_duplicates($1, $2, $3, $4)", [
        "Sem Nome",
        null,
        "TESTER@example.com",
        ""
      ]);
      const found = result.rows.find((r) => r.member_id === inserted.rows[0].id);
      expect(found).toBeDefined();
      expect(Number(found?.score)).toBeCloseTo(0.9, 5);
      expect(found?.match_reason).toBe("email_match");
    });

    it("returns phone_match with score 0.85 when phone digits match", async () => {
      await asServiceRole(db.client);
      const inserted = await db.client.query<{ id: string }>(
        `insert into public.members (full_name, phone) values ('Dup Phone', '+55 (81) 99999-1234') returning id`
      );
      ids.push(inserted.rows[0].id);

      await asAdmin(db.client, adminUserId);
      const result = await db.client.query<{
        member_id: string;
        score: string;
        match_reason: string;
      }>("select * from public.find_member_duplicates($1, $2, $3, $4)", [
        "Sem Nome",
        null,
        "",
        "5581999991234"
      ]);
      const found = result.rows.find((r) => r.member_id === inserted.rows[0].id);
      expect(found).toBeDefined();
      expect(Number(found?.score)).toBeCloseTo(0.85, 5);
      expect(found?.match_reason).toBe("phone_match");
    });

    it("raises when caller is not admin", async () => {
      await asAuthenticated(db.client, nonAdminUserId);
      await expect(
        db.client.query("select * from public.find_member_duplicates($1, $2, $3, $4)", ["Test", "", "", ""])
      ).rejects.toThrow(/Acesso negado/);
    });
  });

  describe("check_admin_rate_limit", () => {
    it("returns true for first 30 calls in a minute", async () => {
      await asAuthenticated(db.client, adminUserId);
      for (let i = 0; i < 30; i++) {
        const result = await db.client.query<{ check_admin_rate_limit: boolean }>(
          "select public.check_admin_rate_limit('rate_test') as check_admin_rate_limit"
        );
        expect(result.rows[0].check_admin_rate_limit).toBe(true);
      }
    });

    it("returns false on the 31st call within a minute", async () => {
      await asAuthenticated(db.client, adminUserId);
      for (let i = 0; i < 30; i++) {
        await db.client.query("select public.check_admin_rate_limit('rate_block')");
      }
      const result = await db.client.query<{ check_admin_rate_limit: boolean }>(
        "select public.check_admin_rate_limit('rate_block') as check_admin_rate_limit"
      );
      expect(result.rows[0].check_admin_rate_limit).toBe(false);
    });

    it("returns false when called without authenticated user", async () => {
      await asServiceRole(db.client);
      await db.client.query("select set_config('request.jwt.claim.sub', '', true)");
      const result = await db.client.query<{ check_admin_rate_limit: boolean }>(
        "select public.check_admin_rate_limit('rate_anon') as check_admin_rate_limit"
      );
      expect(result.rows[0].check_admin_rate_limit).toBe(false);
    });
  });
});
