import { Client } from "pg";

export interface TestDb {
  client: Client;
  cleanup: () => Promise<void>;
}

export async function connectTestDb(): Promise<TestDb> {
  const client = new Client({
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    database: process.env.PGDATABASE ?? "postgres"
  });
  await client.connect();
  return {
    client,
    cleanup: async () => {
      await client.end();
    }
  };
}

export async function resetSession(client: Client): Promise<void> {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claim.sub', '', true)");
  await client.query("select set_config('request.jwt.claim.role', '', true)");
  await client.query("select set_config('request.jwt.claims', '', true)");
}

export async function setRole(
  client: Client,
  role: "anon" | "authenticated" | "service_role"
): Promise<void> {
  await client.query(`set role ${role}`);
}

export async function asAnon(client: Client): Promise<void> {
  await resetSession(client);
  await client.query("select set_config('request.jwt.claim.role', 'anon', true)");
  await setRole(client, "anon");
}

export async function asAuthenticated(client: Client, userId: string): Promise<void> {
  await resetSession(client);
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
  await client.query(
    "select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
    [userId]
  );
  await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)");
  await setRole(client, "authenticated");
}

export async function asAdmin(client: Client, userId: string): Promise<void> {
  await asAuthenticated(client, userId);
}

export async function asServiceRole(client: Client): Promise<void> {
  await resetSession(client);
  await setRole(client, "service_role");
}

export async function createAuthUser(client: Client, email: string): Promise<string> {
  const result = await client.query<{ id: string }>(
    `insert into auth.users (id, email, instance_id, aud, role)
     values (gen_random_uuid(), $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
     returning id`,
    [email]
  );
  return result.rows[0].id;
}

export async function makeAdmin(
  client: Client,
  userId: string,
  role: "owner" | "editor" = "owner"
): Promise<void> {
  await client.query(
    `insert into public.admin_users (user_id, role) values ($1, $2)
     on conflict (user_id) do update set role = excluded.role`,
    [userId, role]
  );
}

export async function deleteAuthUser(client: Client, userId: string): Promise<void> {
  await client.query("delete from auth.users where id = $1", [userId]);
}
