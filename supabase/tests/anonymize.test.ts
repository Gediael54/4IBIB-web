import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asAdmin,
  asServiceRole,
  connectTestDb,
  createAuthUser,
  deleteAuthUser,
  makeAdmin,
  type TestDb
} from "./helpers";

describe("anonymize_member", () => {
  let db: TestDb;
  let adminUserId: string;

  beforeAll(async () => {
    db = await connectTestDb();
    await asServiceRole(db.client);
    adminUserId = await createAuthUser(db.client, `admin-anon-${Date.now()}@test.local`);
    await makeAdmin(db.client, adminUserId, "owner");
  });

  afterAll(async () => {
    await asServiceRole(db.client);
    await db.client.query("delete from public.admin_rate_limit_buckets where user_id = $1", [adminUserId]);
    await db.client.query("delete from public.admin_users where user_id = $1", [adminUserId]);
    await deleteAuthUser(db.client, adminUserId);
    await db.cleanup();
  });

  it("zera PII e marca deleted_at quando chamada por admin", async () => {
    await asServiceRole(db.client);
    const inserted = await db.client.query<{ id: string }>(
      `insert into public.members (
         full_name, email, phone, whatsapp, cpf, rg, allergies, medical_notes,
         emergency_contact_name, emergency_contact_phone, public_directory
       ) values (
         'PII Original', 'pii@test.local', '+55 81 99999-1111', '+55 81 99999-2222',
         '00011122233', 'RG-1234', 'amendoim', 'glicose alta',
         'Mae do PII', '+55 81 91111-0000', true
       ) returning id`
    );
    const memberId = inserted.rows[0].id;

    await asAdmin(db.client, adminUserId);
    await db.client.query("select public.anonymize_member($1)", [memberId]);

    await asServiceRole(db.client);
    const after = await db.client.query<{
      full_name: string;
      email: string;
      phone: string;
      whatsapp: string;
      cpf: string | null;
      rg: string;
      allergies: string;
      medical_notes: string;
      emergency_contact_name: string;
      emergency_contact_phone: string;
      public_directory: boolean;
      deleted_at: string | null;
    }>(
      `select full_name, email, phone, whatsapp, cpf, rg, allergies, medical_notes,
              emergency_contact_name, emergency_contact_phone, public_directory, deleted_at
         from public.members where id = $1`,
      [memberId]
    );
    const row = after.rows[0];
    expect(row.full_name).toBe("[anonimizado]");
    expect(row.email).toBe("");
    expect(row.phone).toBe("");
    expect(row.whatsapp).toBe("");
    expect(row.cpf).toBeNull();
    expect(row.rg).toBe("");
    expect(row.allergies).toBe("");
    expect(row.medical_notes).toBe("");
    expect(row.emergency_contact_name).toBe("");
    expect(row.emergency_contact_phone).toBe("");
    expect(row.public_directory).toBe(false);
    expect(row.deleted_at).not.toBeNull();

    const audit = await db.client.query<{ count: string }>(
      `select count(*)::text as count from public.content_audit_log
        where table_name = 'members' and row_id = $1::text and action = 'UPDATE'`,
      [memberId]
    );
    expect(Number(audit.rows[0].count)).toBeGreaterThanOrEqual(1);

    await db.client.query(
      "delete from public.content_audit_log where table_name = 'members' and row_id = $1::text",
      [memberId]
    );
    await db.client.query("delete from public.members where id = $1", [memberId]);
  });

  it("preserva deleted_at original quando ja existia", async () => {
    await asServiceRole(db.client);
    const inserted = await db.client.query<{ id: string; deleted_at: string }>(
      `insert into public.members (full_name, deleted_at)
         values ('Ja Removido', now() - interval '2 days')
       returning id, deleted_at`
    );
    const memberId = inserted.rows[0].id;
    const originalDeletedAt = inserted.rows[0].deleted_at;

    await asAdmin(db.client, adminUserId);
    await db.client.query("select public.anonymize_member($1)", [memberId]);

    await asServiceRole(db.client);
    const after = await db.client.query<{ deleted_at: string }>(
      "select deleted_at from public.members where id = $1",
      [memberId]
    );
    expect(new Date(after.rows[0].deleted_at).toISOString()).toBe(new Date(originalDeletedAt).toISOString());

    await db.client.query(
      "delete from public.content_audit_log where table_name = 'members' and row_id = $1::text",
      [memberId]
    );
    await db.client.query("delete from public.members where id = $1", [memberId]);
  });
});
