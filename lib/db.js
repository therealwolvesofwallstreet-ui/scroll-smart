// Kết nối Postgres (Supabase). Bảng được tạo tự động ở lần gọi đầu tiên.
'use strict';

const MIGRATE = `
create table if not exists diary_entries (
  id text primary key,
  code text not null,
  date text not null,
  purpose text not null,
  purpose_other text not null default '',
  planned integer not null,
  actual integer,
  negative integer,
  match text not null default '',
  last5 text not null default '',
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists diary_entries_code_idx on diary_entries (code);
alter table diary_entries enable row level security;
create table if not exists app_settings (key text primary key, value text not null);
alter table app_settings enable row level security;
insert into app_settings (key, value)
  values ('export_key', substr(md5(random()::text || clock_timestamp()::text), 1, 10))
  on conflict (key) do nothing;
`;

let db = null;
let ready = null;

function findUrl() {
  const env = process.env;
  const direct = env.POSTGRES_URL || env.DATABASE_URL || env.SUPABASE_DB_URL;
  if (direct) return direct;
  // Tích hợp Supabase trên Vercel có thể thêm tiền tố vào tên biến
  const k = Object.keys(env).find(n => /POSTGRES_URL$/.test(n) && !/NON_POOLING|PRISMA/.test(n));
  return k ? env[k] : null;
}

function getDb() {
  if (db) return db;
  const url = findUrl();
  if (!url) throw new Error('Chưa cấu hình cơ sở dữ liệu (POSTGRES_URL).');
  const postgres = require('postgres');
  const local = /localhost|127\.0\.0\.1/.test(url);
  // Chỉ giữ sslmode; các tham số lạ (vd. supa=..., pgbouncer=...) sẽ bị Postgres từ chối.
  let clean = url;
  try { const u = new URL(url); [...u.searchParams.keys()].forEach(k => { if (k !== 'sslmode') u.searchParams.delete(k); }); clean = u.toString(); } catch (e) {}
  const sql = postgres(clean, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 15, ssl: local ? false : 'require' });
  db = {
    query: (text, params) => sql.unsafe(text, params || []).then(r => Array.from(r)),
    exec: text => sql.unsafe(text).then(() => undefined)
  };
  return db;
}

/** Dùng trong kiểm thử: thay kết nối bằng một CSDL khác có cùng giao diện query/exec. */
function setDb(d) { db = d; ready = null; }

function ensureReady() {
  if (!ready) {
    const d = getDb();
    ready = d.exec(MIGRATE).catch(async err => {
      // Hai lần khởi động cùng lúc có thể đụng nhau khi tạo bảng; thử lại một lần.
      await new Promise(r => setTimeout(r, 400));
      return d.exec(MIGRATE);
    }).catch(err => { ready = null; throw err; });
  }
  return ready.then(() => db);
}

module.exports = { getDb, setDb, ensureReady, MIGRATE };
