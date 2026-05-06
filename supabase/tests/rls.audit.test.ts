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

describe("RLS content_audit_log", () => {
  let db: TestDb;
  let adminUserId: string;
  let nonAdminUserId: string;
  let auditEntryId: string;

  beforeAll(async () => {
    db = await connectTestDb();
    await asServiceRole(db.client);
    adminUserId = await createAuthUser(db.client, `admin-audit-${Date.now()}@test.local`);
    nonAdminUserId = await createAuthUser(db.client, `user-audit-${Date.now()}@test.local`);
    await makeAdmin(db.client, adminUserId, "owner");

    const inserted = await db.client.query<{ id: string }>(
      `insert into public.content_audit_log (table_name, row_id, action, changed_by, new_row)
       values ('schedule_items', 'fake-row', 'INSERT', $1, '{"title":"x"}')
       returning id`,
      [adminUserId]
    );
    auditEntryId = inserted.rows[0].id;
  });

  afterAll(async () => {
    await asServiceRole(db.client);
    await db.client.query("delete from public.content_audit_log where id = $1", [auditEntryId]);
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

  it("anon nao le audit log", async () => {
    await asAnon(db.client);
    const result = await db.client.query("select id from public.content_audit_log where id = $1", [
      auditEntryId
    ]);
    expect(result.rows).toHaveLength(0);
  });

  it("non-admin authenticated nao le audit log", async () => {
    await asAuthenticated(db.client, nonAdminUserId);
    const result = await db.client.query("select id from public.content_audit_log where id = $1", [
      auditEntryId
    ]);
    expect(result.rows).toHaveLength(0);
  });

  it("admin le audit log", async () => {
    await asAdmin(db.client, adminUserId);
    const result = await db.client.query("select id from public.content_audit_log where id = $1", [
      auditEntryId
    ]);
    expect(result.rows).toHaveLength(1);
  });
});
