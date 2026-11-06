import postgres from "postgres";
import { readFileSync } from "node:fs";

export function secret(name) {
  const value = process.env[`${name}_FILE`]
    ? readFileSync(process.env[`${name}_FILE`], "utf8").trim()
    : process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function connect(url) {
  return postgres(url, {
    prepare: false,
    max: 1,
    connect_timeout: 15,
    connection: { statement_timeout: 30000, search_path: "inventory_demo" },
  });
}

export async function manifest(tx) {
  await tx`set local timezone='UTC'`;
  const tables = await tx`select c.relname as name, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='inventory_demo' and c.relkind='r' order by c.relname`;
  if (tables.length !== 11 || tables.some((table) => !table.rls))
    throw new Error("Expected 11 RLS-protected demo tables");
  const result = [];
  for (const table of tables) {
    const [data] = await tx`select count(*)::int as rows,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by md5(to_jsonb(t)::text)), '')) as digest
      from ${tx("inventory_demo")}.${tx(table.name)} t`;
    result.push({ ...table, ...data });
  }
  const constraints =
    await tx`select c.relname as table_name, p.conname, p.contype,
    pg_get_constraintdef(p.oid) as definition from pg_constraint p
    join pg_class c on c.oid=p.conrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='inventory_demo' order by c.relname,p.conname`;
  const indexes = await tx`select tablename,indexname,indexdef from pg_indexes
    where schemaname='inventory_demo' order by tablename,indexname`;
  const policies =
    await tx`select tablename,policyname,permissive,roles,cmd,qual,with_check
    from pg_policies where schemaname='inventory_demo' order by tablename,policyname`;
  return {
    tables: result,
    constraints: [...constraints],
    indexes: [...indexes],
    policies: [...policies],
  };
}
