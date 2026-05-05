import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asServiceRole, connectTestDb, type TestDb } from "./helpers";

interface Relationship {
  from_member_id: string;
  to_member_id: string;
  type: string;
}

async function relationshipsBetween(db: TestDb, a: string, b: string): Promise<Relationship[]> {
  const result = await db.client.query<Relationship>(
    `select from_member_id, to_member_id, type
     from public.member_relationships
     where (from_member_id = $1 and to_member_id = $2)
        or (from_member_id = $2 and to_member_id = $1)
     order by type`,
    [a, b]
  );
  return result.rows;
}

describe("Member relationship triggers", () => {
  let db: TestDb;
  const memberIds: string[] = [];

  async function createMember(
    fullName: string,
    gender: "masculino" | "feminino" | "outro" | null = null
  ): Promise<string> {
    const result = await db.client.query<{ id: string }>(
      `insert into public.members (full_name, gender)
       values ($1, $2) returning id`,
      [fullName, gender]
    );
    const id = result.rows[0].id;
    memberIds.push(id);
    return id;
  }

  beforeAll(async () => {
    db = await connectTestDb();
    await asServiceRole(db.client);
  });

  afterAll(async () => {
    await asServiceRole(db.client);
    if (memberIds.length > 0) {
      await db.client.query(
        "delete from public.member_relationships where from_member_id = any($1::uuid[]) or to_member_id = any($1::uuid[])",
        [memberIds]
      );
      await db.client.query("delete from public.members where id = any($1::uuid[])", [memberIds]);
    }
    await db.cleanup();
  });

  beforeEach(async () => {
    await asServiceRole(db.client);
  });

  it("create_reverse_relationship inserts reverse 'filho' when 'pai' inserted", async () => {
    const pai = await createMember("Trigger Pai", "masculino");
    const filho = await createMember("Trigger Filho", "masculino");

    await db.client.query(
      "insert into public.member_relationships (from_member_id, to_member_id, type) values ($1, $2, 'pai')",
      [pai, filho]
    );

    const rels = await relationshipsBetween(db, pai, filho);
    expect(rels).toHaveLength(2);
    const reverse = rels.find((r) => r.from_member_id === filho && r.to_member_id === pai);
    expect(reverse).toBeDefined();
    expect(reverse?.type).toBe("filho");
  });

  it("create_reverse_relationship picks 'mae' when reverse target gender is feminino for 'filho'", async () => {
    const mae = await createMember("Trigger Mae", "feminino");
    const filhoMasc = await createMember("Trigger FilhoM", "masculino");

    await db.client.query(
      "insert into public.member_relationships (from_member_id, to_member_id, type) values ($1, $2, 'filho')",
      [filhoMasc, mae]
    );

    const rels = await relationshipsBetween(db, mae, filhoMasc);
    const reverse = rels.find((r) => r.from_member_id === mae && r.to_member_id === filhoMasc);
    expect(reverse).toBeDefined();
    expect(reverse?.type).toBe("mae");
  });

  it("create_reverse_relationship picks 'pai' when reverse target gender is masculino for 'filho'", async () => {
    const pai = await createMember("Trigger Pai2", "masculino");
    const filho = await createMember("Trigger FilhoM2", "feminino");

    await db.client.query(
      "insert into public.member_relationships (from_member_id, to_member_id, type) values ($1, $2, 'filho')",
      [filho, pai]
    );

    const rels = await relationshipsBetween(db, pai, filho);
    const reverse = rels.find((r) => r.from_member_id === pai && r.to_member_id === filho);
    expect(reverse).toBeDefined();
    expect(reverse?.type).toBe("pai");
  });

  it("delete_reverse_relationship removes the mirrored row when original deleted", async () => {
    const pai = await createMember("Trigger PaiDel", "masculino");
    const filho = await createMember("Trigger FilhoDel", "masculino");

    await db.client.query(
      "insert into public.member_relationships (from_member_id, to_member_id, type) values ($1, $2, 'pai')",
      [pai, filho]
    );

    let rels = await relationshipsBetween(db, pai, filho);
    expect(rels).toHaveLength(2);

    await db.client.query(
      "delete from public.member_relationships where from_member_id = $1 and to_member_id = $2 and type = 'pai'",
      [pai, filho]
    );

    rels = await relationshipsBetween(db, pai, filho);
    expect(rels).toHaveLength(0);
  });

  it("pg_trigger_depth guard prevents infinite recursion (insert produces exactly one mirror)", async () => {
    const a = await createMember("Trigger ConjA", "masculino");
    const b = await createMember("Trigger ConjB", "feminino");

    await db.client.query(
      "insert into public.member_relationships (from_member_id, to_member_id, type) values ($1, $2, 'conjuge')",
      [a, b]
    );

    const rels = await relationshipsBetween(db, a, b);
    expect(rels).toHaveLength(2);
    expect(rels.every((r) => r.type === "conjuge")).toBe(true);
  });
});
