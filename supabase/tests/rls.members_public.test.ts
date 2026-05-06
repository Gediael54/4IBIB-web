import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

describe("members_public view", () => {
  let db: TestDb;
  let adminUserId: string;
  let publicMemberId: string;
  let privateMemberId: string;
  let archivedMemberId: string;

  beforeAll(async () => {
    db = await connectTestDb();
    await asServiceRole(db.client);
    adminUserId = await createAuthUser(db.client, `admin-mempub-${Date.now()}@test.local`);
    await makeAdmin(db.client, adminUserId, "owner");

    const pub = await db.client.query<{ id: string }>(
      `insert into public.members (
         full_name, preferred_name, photo_url, public_bio,
         email, phone, whatsapp, cpf, rg, allergies, medical_notes,
         emergency_contact_name, emergency_contact_phone, public_directory
       ) values (
         'Membro Publico', 'Pub', 'https://x/photo.jpg', 'Pastor da igreja desde 2010.',
         'pub@ex.com', '+55 81 99999-1111', '+55 81 99999-2222',
         '11122233344', 'RG-PUB', 'sem alergias', 'sem nota',
         'Mae Pub', '+55 81 91111-0000', true
       ) returning id`
    );
    publicMemberId = pub.rows[0].id;

    const priv = await db.client.query<{ id: string }>(
      `insert into public.members (full_name, public_directory)
         values ('Membro Privado', false) returning id`
    );
    privateMemberId = priv.rows[0].id;

    const arch = await db.client.query<{ id: string }>(
      `insert into public.members (full_name, public_directory, deleted_at)
         values ('Membro Arquivado', true, now()) returning id`
    );
    archivedMemberId = arch.rows[0].id;
  });

  afterAll(async () => {
    await asServiceRole(db.client);
    await db.client.query("delete from public.members where id = any($1::uuid[])", [
      [publicMemberId, privateMemberId, archivedMemberId]
    ]);
    await db.client.query("delete from public.admin_users where user_id = $1", [adminUserId]);
    await deleteAuthUser(db.client, adminUserId);
    await db.cleanup();
  });

  it("anon le members_public somente registros com public_directory=true e deleted_at=null", async () => {
    await asAnon(db.client);
    const result = await db.client.query<{ id: string }>(
      "select id from public.members_public where id = any($1::uuid[])",
      [[publicMemberId, privateMemberId, archivedMemberId]]
    );
    const ids = result.rows.map((r) => r.id);
    expect(ids).toContain(publicMemberId);
    expect(ids).not.toContain(privateMemberId);
    expect(ids).not.toContain(archivedMemberId);
  });

  it("members_public nao expoe colunas com PII", async () => {
    await asAnon(db.client);
    const cols = await db.client.query<{ column_name: string }>(
      `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = 'members_public'`
    );
    const names = cols.rows.map((r) => r.column_name);
    for (const sensitive of [
      "cpf",
      "rg",
      "rg_issuer",
      "email",
      "phone",
      "whatsapp",
      "allergies",
      "medical_notes",
      "emergency_contact_name",
      "emergency_contact_phone",
      "address_zip",
      "address_street",
      "birth_date"
    ]) {
      expect(names).not.toContain(sensitive);
    }
  });

  it("anon nao consegue ler members direto", async () => {
    await asAnon(db.client);
    const result = await db.client.query("select id from public.members where id = $1", [publicMemberId]);
    expect(result.rows).toHaveLength(0);
  });

  it("admin le members direto incluindo PII", async () => {
    await asAdmin(db.client, adminUserId);
    const result = await db.client.query<{ id: string; cpf: string | null; email: string }>(
      "select id, cpf, email from public.members where id = $1",
      [publicMemberId]
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].cpf).toBe("11122233344");
    expect(result.rows[0].email).toBe("pub@ex.com");
  });

  it("anon nao le volunteers (PII via contact)", async () => {
    await asAnon(db.client);
    await expect(db.client.query("select id from public.volunteers limit 1")).rejects.toThrow(
      /permission denied/i
    );
  });
});
