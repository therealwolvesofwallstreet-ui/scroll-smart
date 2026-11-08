/**
 * SCROLL SMART — máy chủ nhật kí
 * Google Apps Script gắn với một Google Sheet. Dữ liệu nằm ở trang tính "NhatKi".
 *
 * Cài đặt (làm một lần):
 *   1. Mở Google Sheet > Tiện ích mở rộng > Apps Script, dán toàn bộ file này vào Code.gs.
 *   2. Chọn hàm setup rồi bấm Chạy. Cấp quyền khi Google hỏi.
 *      Xem Nhật ký thực thi để lấy "mã xuất dữ liệu" cho nhóm nghiên cứu.
 *   3. Triển khai > Tùy chọn triển khai mới > Ứng dụng web
 *      Thực thi với tư cách: Tôi · Người có quyền truy cập: Bất kỳ ai.
 *   4. Dán URL kết thúc bằng /exec vào biến API_URL trong index.html.
 */

var SHEET_NAME = 'NhatKi';
var TZ = 'Asia/Ho_Chi_Minh';
var DAYS = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
var PURPOSES = ['Giải trí', 'Học tập', 'Nhắn tin/liên lạc', 'Xem tin tức', 'Giết thời gian', 'Khác'];
var MATCHES = ['Đúng hết', 'Một phần', 'Lệch hẳn'];
var DONE = 'Hoàn tất';
var TODO = 'Chưa hoàn tất';
var EQUAL_BAND = 5; // chênh tối đa ±5 phút thì tính là "bằng dự kiến"
var MAX_MIN = 1440;
var MAX_NEG = 500;

var FIELDS = ['id', 'code', 'date', 'purpose', 'purposeOther', 'planned', 'actual', 'negative', 'match', 'last5', 'status', 'createdAt', 'updatedAt'];
var HEADERS = ['ID', 'Mã HS', 'Ngày', 'Mục đích', 'Mục đích khác', 'Dự kiến (phút)', 'Thực tế (phút)', 'Bài tiêu cực', 'Đúng mục đích', '5 phút cuối', 'Trạng thái', 'Tạo lúc', 'Sửa lúc'];
var NUMERIC = { planned: 1, actual: 1, negative: 1 };

var CODES = (function () {
  var out = [];
  for (var i = 1; i <= 60; i++) out.push('HS' + ('00' + i).slice(-3));
  return out;
})();

/* ---------- Nhóm nội dung "5 phút cuối" ---------- */
// Từ khoá viết có dấu cho dễ đọc; khi so khớp sẽ bỏ dấu cả hai phía để bắt cả câu gõ không dấu.
var GROUPS = [
  { key: 'news', label: 'Tin tức, xã hội & môi trường', kw: ['tin tức', 'thời sự', 'tin bão', 'cơn bão', 'mưa bão', 'bão lũ', 'lũ lụt', 'ngập', 'thiên tai', 'động đất', 'sạt lở', 'báo chí', 'đọc báo', 'báo mới', 'vnexpress', 'tuổi trẻ', 'dân trí', 'thanh niên', 'news', 'chính trị', 'xã hội', 'môi trường', 'ô nhiễm', 'khí hậu', 'rác thải', 'tai nạn', 'cháy', 'vụ án', 'công an', 'cảnh sát', 'giá vàng', 'giá xăng', 'kinh tế', 'chứng khoán', 'thế giới', 'chiến tranh', 'bầu cử', 'tổng thống', 'tin buồn', 'tin nóng', 'sự kiện', 'thời tiết', 'dịch bệnh', 'luật', 'nghị định'] },
  { key: 'fun', label: 'Giải trí, âm nhạc & phim', kw: ['phim', 'nhạc', 'nghe nhạc', 'bài hát', 'ca sĩ', 'mv', 'idol', 'kpop', 'vpop', 'rap', 'concert', 'show', 'gameshow', 'talkshow', 'hài hước', 'clip hài', 'video hài', 'hài kịch', 'meme', 'giải trí', 'drama', 'anime', 'manga', 'truyện', 'netflix', 'vlog', 'podcast', 'livestream', 'diễn viên', 'nghệ sĩ', 'tiktoker', 'youtuber', 'streamer', 'trend', 'nhảy', 'dance', 'cover', 'spotify', 'reels', 'shorts', 'fan', 'fandom', 'người nổi tiếng', 'thần tượng'] },
  { key: 'study', label: 'Học tập & trường lớp', kw: ['học', 'bài tập', 'btvn', 'ôn thi', 'đề thi', 'kỳ thi', 'kì thi', 'thi thử', 'kiểm tra', 'giáo viên', 'thầy cô', 'cô giáo', 'thầy giáo', 'lớp', 'trường', 'tài liệu', 'kiến thức', 'ielts', 'toefl', 'tiếng anh', 'từ vựng', 'ngữ pháp', 'môn toán', 'bài toán', 'toán học', 'vật lý', 'vật lí', 'hoá học', 'hóa học', 'sinh học', 'lịch sử', 'địa lý', 'địa lí', 'ngữ văn', 'môn văn', 'văn học', 'tin học', 'lập trình', 'bài giảng', 'deadline', 'dự án', 'nghiên cứu', 'học bổng', 'du học', 'đại học', 'tuyển sinh', 'khkt'] },
  { key: 'sport', label: 'Thể thao & trò chơi', kw: ['bóng đá', 'đá bóng', 'thể thao', 'game', 'games', 'trò chơi', 'chơi game', 'liên quân', 'lmht', 'liên minh', 'free fire', 'ff', 'pubg', 'valorant', 'minecraft', 'roblox', 'genshin', 'fifa', 'fc online', 'esport', 'esports', 'cầu thủ', 'trận đấu', 'bàn thắng', 'world cup', 'ngoại hạng', 'champions league', 'c1', 'messi', 'ronaldo', 'cầu lông', 'pickleball', 'bóng rổ', 'bóng chuyền', 'tennis', 'gym', 'tập gym', 'thể dục', 'chạy bộ', 'bơi lội', 'võ thuật', 'highlight', 'highlights', 'tập luyện'] },
  { key: 'life', label: 'Đời sống, sở thích & tiêu dùng', kw: ['ăn uống', 'món ăn', 'đồ ăn', 'nấu ăn', 'ăn vặt', 'quán ăn', 'ẩm thực', 'công thức', 'mukbang', 'mua sắm', 'mua đồ', 'shopee', 'lazada', 'tiki', 'tiktok shop', 'sale', 'giảm giá', 'voucher', 'quần áo', 'thời trang', 'outfit', 'mỹ phẩm', 'mĩ phẩm', 'skincare', 'makeup', 'làm đẹp', 'kiểu tóc', 'du lịch', 'phượt', 'thú cưng', 'mèo', 'con chó', 'cún', 'decor', 'nhà cửa', 'trang trí', 'cây cảnh', 'sức khoẻ', 'sức khỏe', 'mẹo', 'lifestyle', 'đời sống', 'sở thích', 'vẽ tranh', 'chụp ảnh', 'nhiếp ảnh', 'handmade', 'cà phê', 'cafe', 'trà sữa', 'review'] },
  { key: 'social', label: 'Bạn bè, giao tiếp & bình luận', kw: ['nhắn tin', 'tin nhắn', 'chat', 'nhóm chat', 'box chat', 'bạn bè', 'bạn thân', 'bình luận', 'comment', 'cmt', 'story', 'stories', 'đăng bài', 'thả tim', 'like', 'react', 'gọi điện', 'call', 'video call', 'messenger', 'zalo', 'inbox', 'rep', 'trả lời', 'người yêu', 'crush', 'gia đình', 'nhóm lớp'] },
  { key: 'other', label: 'Khác / chưa đủ thông tin', kw: [] },
  { key: 'none', label: 'Không sử dụng mạng xã hội', kw: ['không dùng mạng xã hội', 'không dùng mxh', 'không sử dụng', 'không lướt', 'không vào mạng', 'không vào mxh', 'không xài', 'không mở mạng', 'ko dùng', 'ko lướt', 'k dùng', 'k lướt', 'kh dùng', 'kh lướt', 'nghỉ mxh', 'nghỉ mạng xã hội'] }
];

function fold_(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

var FOLDED_ = null;
function foldedGroups_() {
  if (FOLDED_) return FOLDED_;
  FOLDED_ = GROUPS.map(function (g) {
    return { key: g.key, kw: g.kw.map(fold_).filter(function (k) { return k; }) };
  });
  return FOLDED_;
}

/** Trả về danh sách key nhóm của một câu trả lời. Một câu có thể thuộc nhiều nhóm. */
function classify_(text) {
  var t = ' ' + fold_(text) + ' ';
  if (t.trim().length < 2) return ['other'];
  var fg = foldedGroups_();
  var none = fg.filter(function (g) { return g.key === 'none'; })[0];
  for (var i = 0; i < none.kw.length; i++) {
    if (t.indexOf(' ' + none.kw[i] + ' ') >= 0) return ['none'];
  }
  var hits = [];
  fg.forEach(function (g) {
    if (g.key === 'none' || g.key === 'other') return;
    for (var j = 0; j < g.kw.length; j++) {
      if (t.indexOf(' ' + g.kw[j] + ' ') >= 0) { hits.push(g.key); return; }
    }
  });
  return hits.length ? hits : ['other'];
}

/* ---------- Web app ---------- */

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'load') {
      var out = { ok: true, stats: cachedStats_() };
      if (p.code) out.entries = listFor_(p.code);
      return json_(out);
    }
    if (p.action === 'stats') return json_({ ok: true, stats: cachedStats_() });
    if (p.action === 'list') return json_({ ok: true, entries: listFor_(p.code) });
    return json_({ ok: true, app: 'scroll-smart' });
  } catch (err) {
    return json_({ ok: false, error: msg_(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'save') return json_(save_(body.entry || {}));
    if (body.action === 'delete') return json_(remove_(body.id, body.code));
    if (body.action === 'export') return json_(export_(body.key));
    return json_({ ok: false, error: 'Yêu cầu không hợp lệ.' });
  } catch (err) {
    return json_({ ok: false, error: msg_(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function msg_(err) {
  return String((err && err.message) || err);
}

/* ---------- Cài đặt ---------- */

function setup() {
  getSheet_();
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('EXPORT_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    props.setProperty('EXPORT_KEY', key);
  }
  Logger.log('Mã xuất dữ liệu cho nhóm nghiên cứu: ' + key);
  return key;
}

/** Xoá toàn bộ dữ liệu (giữ dòng tiêu đề). Chỉ chạy tay trong trình soạn thảo. */
function clearAllEntries() {
  var sh = getSheet_();
  var n = sh.getLastRow();
  if (n > 1) sh.deleteRows(2, n - 1);
  clearCache_();
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ---------- Đọc / ghi ---------- */

function nowStr_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
}

function cell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm:ss');
  return v == null ? '' : v;
}

function num_(v) {
  if (v === '' || v == null) return null;
  var n = Number(v);
  return isFinite(n) ? n : null;
}

function readAll_() {
  var sh = getSheet_();
  var n = sh.getLastRow();
  if (n < 2) return [];
  var rows = sh.getRange(2, 1, n - 1, FIELDS.length).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var o = { _row: i + 2 };
    for (var j = 0; j < FIELDS.length; j++) {
      var f = FIELDS[j];
      o[f] = NUMERIC[f] ? num_(rows[i][j]) : String(cell_(rows[i][j])).trim();
    }
    if (o.id) out.push(o);
  }
  return out;
}

function toRow_(e) {
  return FIELDS.map(function (f) {
    var v = e[f];
    if (NUMERIC[f]) return v == null ? '' : v;
    if (v == null || v === '') return '';
    // Dấu nháy đơn giữ nguyên dạng chữ: ngày không bị đổi định dạng, câu bắt đầu bằng "=" không thành công thức.
    return "'" + String(v);
  });
}

function public_(e) {
  var o = {};
  FIELDS.forEach(function (f) { o[f] = e[f]; });
  return o;
}

function sortEntries_(list) {
  return list.sort(function (a, b) {
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  });
}

function checkCode_(code) {
  if (CODES.indexOf(code) < 0) throw new Error('Mã học sinh không hợp lệ.');
}

function listFor_(code) {
  checkCode_(code);
  return sortEntries_(readAll_().filter(function (e) { return e.code === code; })).map(public_);
}

function intIn_(v, max, label, required) {
  if (v === '' || v == null) {
    if (required) throw new Error('Thiếu ' + label + '.');
    return null;
  }
  var n = Number(v);
  if (!isFinite(n) || n < 0 || n > max || Math.round(n) !== n) throw new Error(label + ' phải là số nguyên từ 0 đến ' + max + '.');
  return n;
}

function text_(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
}

function validate_(x) {
  var e = {};
  e.id = text_(x.id, 64).replace(/[^A-Za-z0-9-]/g, '');
  e.code = text_(x.code, 10);
  checkCode_(e.code);
  e.date = text_(x.date, 10);
  if (DAYS.indexOf(e.date) < 0) throw new Error('Ngày phải nằm trong 28/9 – 4/10/2026.');
  e.purpose = text_(x.purpose, 40);
  if (PURPOSES.indexOf(e.purpose) < 0) throw new Error('Chưa chọn mục đích.');
  e.purposeOther = e.purpose === 'Khác' ? text_(x.purposeOther, 80) : '';
  e.planned = intIn_(x.planned, MAX_MIN, 'Thời gian dự kiến', true);
  e.actual = intIn_(x.actual, MAX_MIN, 'Thời gian thực tế', false);
  e.negative = intIn_(x.negative, MAX_NEG, 'Số bài tiêu cực', false);
  e.match = text_(x.match, 20);
  if (e.match && MATCHES.indexOf(e.match) < 0) throw new Error('Mức đúng mục đích không hợp lệ.');
  e.last5 = text_(x.last5, 300);
  return e;
}

function isComplete_(e) {
  return e.actual != null && e.negative != null && !!e.match && !!e.last5;
}

function save_(input) {
  var v = validate_(input);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_();
    var now = nowStr_();
    var existing = null;
    if (v.id) {
      var all = readAll_();
      for (var i = 0; i < all.length; i++) if (all[i].id === v.id) { existing = all[i]; break; }
    }
    if (existing && existing.code !== v.code) throw new Error('Không sửa được trang của mã khác.');
    var entry = v;
    entry.status = isComplete_(entry) ? DONE : TODO;
    if (existing) {
      entry.createdAt = existing.createdAt;
      entry.updatedAt = now;
      sh.getRange(existing._row, 1, 1, FIELDS.length).setValues([toRow_(entry)]);
    } else {
      entry.id = v.id || Utilities.getUuid();
      entry.createdAt = now;
      entry.updatedAt = now;
      sh.appendRow(toRow_(entry));
    }
    clearCache_();
    return { ok: true, entry: public_(entry) };
  } finally {
    lock.releaseLock();
  }
}

function remove_(id, code) {
  checkCode_(code);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var all = readAll_();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) {
        if (all[i].code !== code) throw new Error('Không xoá được trang của mã khác.');
        getSheet_().deleteRow(all[i]._row);
        clearCache_();
        return { ok: true, id: id };
      }
    }
    return { ok: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

function export_(key) {
  var real = PropertiesService.getScriptProperties().getProperty('EXPORT_KEY');
  if (!real || String(key || '').trim() !== real) throw new Error('Mã xuất dữ liệu chưa đúng.');
  var all = readAll_();
  return { ok: true, entries: sortEntries_(all).map(public_), stats: computeStats_(all) };
}

/* ---------- Thống kê ---------- */

function clearCache_() {
  try { CacheService.getScriptCache().remove('stats'); } catch (e) {}
}

function cachedStats_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) {}
  if (cache) {
    var hit = cache.get('stats');
    if (hit) return JSON.parse(hit);
  }
  var st = computeStats_(readAll_());
  if (cache) { try { cache.put('stats', JSON.stringify(st), 60); } catch (e) {} }
  return st;
}

/**
 * Chỉ tính các lần lướt đã hoàn tất.
 * Mỗi ngày: chia cho số bạn có ít nhất một lần hoàn tất trong ngày đó (không chia cho 60).
 * Ngày không ai ghi: các giá trị trung bình là null (để biểu đồ để trống).
 */
function computeStats_(entries) {
  var done = entries.filter(function (e) {
    return isComplete_(e) && e.planned != null && DAYS.indexOf(e.date) >= 0;
  });
  var groupKeys = GROUPS.map(function (g) { return g.key; });
  var allCodes = {};
  var tot = { studentDays: 0, sessions: 0, neg: 0, planned: 0, actual: 0, shareSum: 0, over: 0, equal: 0, under: 0, answers: 0, groups: {} };
  groupKeys.forEach(function (k) { tot.groups[k] = 0; });

  var perDay = DAYS.map(function (d) {
    var es = done.filter(function (e) { return e.date === d; });
    var by = {};
    es.forEach(function (e) { (by[e.code] = by[e.code] || []).push(e); allCodes[e.code] = 1; });
    var codes = Object.keys(by);
    var n = codes.length;
    var row = { date: d, students: n, sessions: es.length, avgNeg: null, avgPlanned: null, avgActual: null, matchShare: null, over: 0, equal: 0, under: 0, answers: 0, groups: {} };
    groupKeys.forEach(function (k) { row.groups[k] = 0; });
    if (!n) return row;
    var sNeg = 0, sP = 0, sA = 0, sShare = 0;
    codes.forEach(function (c) {
      var p = 0, a = 0, neg = 0, ok = 0;
      by[c].forEach(function (e) {
        p += e.planned; a += e.actual; neg += e.negative;
        if (e.match === 'Đúng hết') ok++;
      });
      sNeg += neg; sP += p; sA += a; sShare += ok / by[c].length;
      var diff = a - p;
      if (diff > EQUAL_BAND) row.over++;
      else if (diff < -EQUAL_BAND) row.under++;
      else row.equal++;
    });
    row.avgNeg = sNeg / n;
    row.avgPlanned = sP / n;
    row.avgActual = sA / n;
    row.matchShare = sShare / n;
    es.forEach(function (e) {
      row.answers++;
      classify_(e.last5).forEach(function (k) { row.groups[k]++; });
    });
    tot.studentDays += n; tot.sessions += es.length;
    tot.neg += sNeg; tot.planned += sP; tot.actual += sA; tot.shareSum += sShare;
    tot.over += row.over; tot.equal += row.equal; tot.under += row.under;
    tot.answers += row.answers;
    groupKeys.forEach(function (k) { tot.groups[k] += row.groups[k]; });
    return row;
  });

  var sd = tot.studentDays;
  return {
    days: DAYS,
    equalBand: EQUAL_BAND,
    groups: GROUPS.map(function (g) { return { key: g.key, label: g.label, examples: g.kw.slice(0, 8) }; }),
    perDay: perDay,
    totals: {
      students: Object.keys(allCodes).length,
      studentDays: sd,
      sessions: tot.sessions,
      avgNeg: sd ? tot.neg / sd : null,
      avgPlanned: sd ? tot.planned / sd : null,
      avgActual: sd ? tot.actual / sd : null,
      matchShare: sd ? tot.shareSum / sd : null,
      over: tot.over, equal: tot.equal, under: tot.under,
      answers: tot.answers,
      groups: tot.groups
    },
    generatedAt: nowStr_()
  };
}
