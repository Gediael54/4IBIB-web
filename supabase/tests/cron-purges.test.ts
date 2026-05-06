import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, asServiceRole, connectTestDb, type TestDb } from "./helpers";

describe("Cron purge functions", () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await connectTestDb();
    await asServiceRole(db.client);
  });

  afterAll(async () => {
    await db.cleanup();
  });

  describe("purge_old_prayers", () => {
    it("marca deleted_at em prayers concluidos antigos e preserva recentes", async () => {
      await asServiceRole(db.client);

      const oldPrayer = await db.client.query<{ id: string }>(
        `insert into public.prayer_requests (name, message, status, updated_at)
           values ('Velho Concluido', 'pedido antigo', 'concluido', now() - interval '20 months')
         returning id`
      );
      const recentPrayer = await db.client.query<{ id: string }>(
        `insert into public.prayer_requests (name, message, status, updated_at)
           values ('Recente Concluido', 'pedido recente', 'concluido', now() - interval '6 months')
         returning id`
      );
      const oldNovo = await db.client.query<{ id: string }>(
        `insert into public.prayer_requests (name, message, status, updated_at)
           values ('Velho Em Aberto', 'ainda em aberto', 'novo', now() - interval '20 months')
         returning id`
      );

      const oldId = oldPrayer.rows[0].id;
      const recentId = recentPrayer.rows[0].id;
      const novoId = oldNovo.rows[0].id;

      await db.client.query("select public.purge_old_prayers()");

      const result = await db.client.query<{
        id: string;
        deleted_at: string | null;
      }>("select id, deleted_at from public.prayer_requests where id = any($1::uuid[])", [
        [oldId, recentId, novoId]
      ]);
      const map = new Map(result.rows.map((row) => [row.id, row.deleted_at] as const));
      expect(map.get(oldId)).not.toBeNull();
      expect(map.get(recentId)).toBeNull();
      expect(map.get(novoId)).toBeNull();

      await db.client.query("delete from public.prayer_requests where id = any($1::uuid[])", [
        [oldId, recentId, novoId]
      ]);
    });

    it("anon nao consegue executar purge_old_prayers", async () => {
      await asAnon(db.client);
      await expect(db.client.query("select public.purge_old_prayers()")).rejects.toThrow(
        /permission denied/i
      );
    });
  });

  describe("purge_old_audit", () => {
    it("apaga entries antigas e preserva recentes", async () => {
      await asServiceRole(db.client);

      const oldEntry = await db.client.query<{ id: string }>(
        `insert into public.content_audit_log (table_name, row_id, action, changed_at)
           values ('schedule_items', 'fake-1', 'UPDATE', now() - interval '30 months')
         returning id`
      );
      const recentEntry = await db.client.query<{ id: string }>(
        `insert into public.content_audit_log (table_name, row_id, action, changed_at)
           values ('schedule_items', 'fake-2', 'UPDATE', now() - interval '6 months')
         returning id`
      );

      const oldId = oldEntry.rows[0].id;
      const recentId = recentEntry.rows[0].id;

      await db.client.query("select public.purge_old_audit()");

      const remaining = await db.client.query<{ id: string }>(
        "select id from public.content_audit_log where id = any($1::uuid[])",
        [[oldId, recentId]]
      );
      const ids = remaining.rows.map((row) => row.id);
      expect(ids).not.toContain(oldId);
      expect(ids).toContain(recentId);

      await db.client.query("delete from public.content_audit_log where id = $1", [recentId]);
    });

    it("anon nao consegue executar purge_old_audit", async () => {
      await asAnon(db.client);
      await expect(db.client.query("select public.purge_old_audit()")).rejects.toThrow(/permission denied/i);
    });
  });
});
