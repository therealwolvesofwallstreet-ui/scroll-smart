// Xử lý yêu cầu API: tải nhật kí theo mã, lưu / xoá một lần lướt, thống kê nhóm, xuất dữ liệu.
'use strict';

const core = require('./core');
const { ensureReady } = require('./db');

const COLS = `id, code, date, purpose, purpose_other as "purposeOther", planned, actual, negative, match, last5, status,
  to_char(created_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS') as "createdAt",
  to_char(updated_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS') as "updatedAt"`;

let statsCache = null; // { at, value }
const STATS_TTL = 15000;

function nowStr() {
  return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
}

async function allEntries(db) {
  return db.query(`select ${COLS} from diary_entries order by code, date, created_at`);
}

async function stats(db) {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL) return statsCache.value;
  const value = core.computeStats(await allEntries(db), nowStr());
  statsCache = { at: Date.now(), value };
  return value;
}

async function listFor(db, code) {
  core.checkCode(code);
  return db.query(`select ${COLS} from diary_entries where code = $1 order by date, created_at`, [code]);
}

async function save(db, input) {
  const e = core.validate(input);
  if (!e.id) e.id = require('crypto').randomUUID();
  const rows = await db.query(
    `insert into diary_entries (id, code, date, purpose, purpose_other, planned, actual, negative, match, last5, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (id) do update set
       date = excluded.date, purpose = excluded.purpose, purpose_other = excluded.purpose_other,
       planned = excluded.planned, actual = excluded.actual, negative = excluded.negative,
       match = excluded.match, last5 = excluded.last5, status = excluded.status, updated_at = now()
     where diary_entries.code = excluded.code
     returning ${COLS}`,
    [e.id, e.code, e.date, e.purpose, e.purposeOther, e.planned, e.actual, e.negative, e.match, e.last5, e.status]
  );
  if (!rows.length) throw new core.UserError('Không sửa được trang của mã khác.');
  statsCache = null;
  return rows[0];
}

async function remove(db, id, code) {
  core.checkCode(code);
  id = String(id || '');
  const rows = await db.query('delete from diary_entries where id = $1 and code = $2 returning id', [id, code]);
  if (!rows.length) {
    const other = await db.query('select code from diary_entries where id = $1', [id]);
    if (other.length) throw new core.UserError('Không xoá được trang của mã khác.');
  }
  statsCache = null;
  return id;
}

async function exportAll(db, key) {
  // Ưu tiên biến môi trường EXPORT_KEY trên Vercel; nếu chưa đặt thì dùng mã ngẫu nhiên trong bảng app_settings.
  let real = (process.env.EXPORT_KEY || '').trim();
  if (!real) {
    const k = await db.query("select value from app_settings where key = 'export_key'");
    real = k.length ? k[0].value : '';
  }
  if (!real || String(key || '').trim() !== real) throw new core.UserError('Mã xuất dữ liệu chưa đúng.');
  const entries = await allEntries(db);
  return { entries, stats: core.computeStats(entries, nowStr()) };
}

/** req: { method, query, body } → { status, body } */
async function handle(req) {
  try {
    const db = await ensureReady();
    if (req.method === 'GET') {
      const q = req.query || {};
      if (q.action === 'load') {
        const out = { ok: true, stats: await stats(db) };
        if (q.code) out.entries = await listFor(db, q.code);
        return { status: 200, body: out };
      }
      if (q.action === 'stats') return { status: 200, body: { ok: true, stats: await stats(db) } };
      if (q.action === 'list') return { status: 200, body: { ok: true, entries: await listFor(db, q.code) } };
      return { status: 200, body: { ok: true, app: 'scroll-smart' } };
    }
    if (req.method === 'POST') {
      let b = req.body;
      if (typeof b === 'string') b = JSON.parse(b || '{}');
      if (Buffer.isBuffer(b)) b = JSON.parse(b.toString('utf8') || '{}');
      b = b || {};
      if (b.action === 'save') return { status: 200, body: { ok: true, entry: await save(db, b.entry) } };
      if (b.action === 'delete') return { status: 200, body: { ok: true, id: await remove(db, b.id, b.code) } };
      if (b.action === 'export') return { status: 200, body: Object.assign({ ok: true }, await exportAll(db, b.key)) };
      return { status: 400, body: { ok: false, error: 'Yêu cầu không hợp lệ.' } };
    }
    return { status: 405, body: { ok: false, error: 'Phương thức không được hỗ trợ.' } };
  } catch (err) {
    if (err instanceof core.UserError) return { status: 400, body: { ok: false, error: err.message } };
    if (err instanceof SyntaxError) return { status: 400, body: { ok: false, error: 'Dữ liệu gửi lên không đọc được.' } };
    console.error(err);
    return { status: 500, body: { ok: false, error: 'Máy chủ đang trục trặc. Thử lại sau ít phút nhé.' } };
  }
}

module.exports = { handle, _resetCache: () => { statsCache = null; } };
