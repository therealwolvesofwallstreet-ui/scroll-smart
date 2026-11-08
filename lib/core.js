// Luật nghiệp vụ dùng chung: kiểm tra dữ liệu, phân nhóm "5 phút cuối", tính thống kê nhóm.
'use strict';

const DAYS = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
const PURPOSES = ['Giải trí', 'Học tập', 'Nhắn tin/liên lạc', 'Xem tin tức', 'Giết thời gian', 'Khác'];
const MATCHES = ['Đúng hết', 'Một phần', 'Lệch hẳn'];
const DONE = 'Hoàn tất';
const TODO = 'Chưa hoàn tất';
const EQUAL_BAND = 5; // chênh tối đa ±5 phút thì tính là "bằng dự kiến"
const MAX_MIN = 1440;
const MAX_NEG = 500;
const CODES = Array.from({ length: 60 }, (_, i) => 'HS' + String(i + 1).padStart(3, '0'));

// Từ khoá viết có dấu cho dễ đọc; khi so khớp sẽ bỏ dấu cả hai phía để bắt cả câu gõ không dấu.
const GROUPS = [
  { key: 'news', label: 'Tin tức, xã hội & môi trường', kw: ['tin tức', 'thời sự', 'tin bão', 'cơn bão', 'mưa bão', 'bão lũ', 'lũ lụt', 'ngập', 'thiên tai', 'động đất', 'sạt lở', 'báo chí', 'đọc báo', 'báo mới', 'vnexpress', 'tuổi trẻ', 'dân trí', 'thanh niên', 'news', 'chính trị', 'xã hội', 'môi trường', 'ô nhiễm', 'khí hậu', 'rác thải', 'tai nạn', 'cháy', 'vụ án', 'công an', 'cảnh sát', 'giá vàng', 'giá xăng', 'kinh tế', 'chứng khoán', 'thế giới', 'chiến tranh', 'bầu cử', 'tổng thống', 'tin buồn', 'tin nóng', 'sự kiện', 'thời tiết', 'dịch bệnh', 'luật', 'nghị định'] },
  { key: 'fun', label: 'Giải trí, âm nhạc & phim', kw: ['phim', 'nhạc', 'nghe nhạc', 'bài hát', 'ca sĩ', 'mv', 'idol', 'kpop', 'vpop', 'rap', 'concert', 'show', 'gameshow', 'talkshow', 'hài hước', 'clip hài', 'video hài', 'hài kịch', 'meme', 'giải trí', 'drama', 'anime', 'manga', 'truyện', 'netflix', 'vlog', 'podcast', 'livestream', 'diễn viên', 'nghệ sĩ', 'tiktoker', 'youtuber', 'streamer', 'trend', 'nhảy', 'dance', 'cover', 'spotify', 'reels', 'shorts', 'fan', 'fandom', 'người nổi tiếng', 'thần tượng'] },
  { key: 'study', label: 'Học tập & trường lớp', kw: ['học', 'bài tập', 'btvn', 'ôn thi', 'đề thi', 'kỳ thi', 'kì thi', 'thi thử', 'kiểm tra', 'giáo viên', 'thầy cô', 'cô giáo', 'thầy giáo', 'lớp', 'trường', 'tài liệu', 'kiến thức', 'ielts', 'toefl', 'tiếng anh', 'từ vựng', 'ngữ pháp', 'môn toán', 'bài toán', 'toán học', 'vật lý', 'vật lí', 'hoá học', 'hóa học', 'sinh học', 'lịch sử', 'địa lý', 'địa lí', 'ngữ văn', 'môn văn', 'văn học', 'tin học', 'lập trình', 'bài giảng', 'deadline', 'dự án', 'nghiên cứu', 'học bổng', 'du học', 'đại học', 'tuyển sinh', 'khkt'] },
  { key: 'sport', label: 'Thể thao & trò chơi', kw: ['bóng đá', 'đá bóng', 'thể thao', 'game', 'games', 'trò chơi', 'chơi game', 'liên quân', 'lmht', 'liên minh', 'free fire', 'ff', 'pubg', 'valorant', 'minecraft', 'roblox', 'genshin', 'fifa', 'fc online', 'esport', 'esports', 'cầu thủ', 'trận đấu', 'bàn thắng', 'world cup', 'ngoại hạng', 'champions league', 'c1', 'messi', 'ronaldo', 'cầu lông', 'pickleball', 'bóng rổ', 'bóng chuyền', 'tennis', 'gym', 'tập gym', 'thể dục', 'chạy bộ', 'bơi lội', 'võ thuật', 'highlight', 'highlights', 'tập luyện'] },
  { key: 'life', label: 'Đời sống, sở thích & tiêu dùng', kw: ['ăn uống', 'món ăn', 'đồ ăn', 'nấu ăn', 'ăn vặt', 'quán ăn', 'ẩm thực', 'công thức', 'mukbang', 'mua sắm', 'mua đồ', 'shopee', 'lazada', 'tiki', 'tiktok shop', 'sale', 'giảm giá', 'voucher', 'quần áo', 'thời trang', 'outfit', 'mỹ phẩm', 'mĩ phẩm', 'skincare', 'makeup', 'làm đẹp', 'kiểu tóc', 'du lịch', 'phượt', 'thú cưng', 'mèo', 'con chó', 'cún', 'decor', 'nhà cửa', 'trang trí', 'cây cảnh', 'sức khoẻ', 'sức khỏe', 'mẹo', 'lifestyle', 'đời sống', 'sở thích', 'vẽ tranh', 'chụp ảnh', 'nhiếp ảnh', 'handmade', 'cà phê', 'cafe', 'trà sữa', 'review'] },
  { key: 'social', label: 'Bạn bè, giao tiếp & bình luận', kw: ['nhắn tin', 'tin nhắn', 'chat', 'nhóm chat', 'box chat', 'bạn bè', 'bạn thân', 'bình luận', 'comment', 'cmt', 'story', 'stories', 'đăng bài', 'thả tim', 'like', 'react', 'gọi điện', 'call', 'video call', 'messenger', 'zalo', 'inbox', 'rep', 'trả lời', 'người yêu', 'crush', 'gia đình', 'nhóm lớp'] },
  { key: 'other', label: 'Khác / chưa đủ thông tin', kw: [] },
  { key: 'none', label: 'Không sử dụng mạng xã hội', kw: ['không dùng mạng xã hội', 'không dùng mxh', 'không sử dụng', 'không lướt', 'không vào mạng', 'không vào mxh', 'không xài', 'không mở mạng', 'ko dùng', 'ko lướt', 'k dùng', 'k lướt', 'kh dùng', 'kh lướt', 'nghỉ mxh', 'nghỉ mạng xã hội'] }
];

function fold(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
const FOLDED = GROUPS.map(g => ({ key: g.key, kw: g.kw.map(fold).filter(Boolean) }));

/** Trả về danh sách key nhóm của một câu trả lời. Một câu có thể thuộc nhiều nhóm. */
function classify(text) {
  const t = ' ' + fold(text) + ' ';
  if (t.trim().length < 2) return ['other'];
  const none = FOLDED.find(g => g.key === 'none');
  if (none.kw.some(k => t.includes(' ' + k + ' '))) return ['none'];
  const hits = FOLDED.filter(g => g.key !== 'none' && g.key !== 'other' && g.kw.some(k => t.includes(' ' + k + ' '))).map(g => g.key);
  return hits.length ? hits : ['other'];
}

class UserError extends Error {}

function checkCode(code) {
  if (!CODES.includes(code)) throw new UserError('Mã học sinh không hợp lệ.');
}
function text(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
}
function intIn(v, max, label, required) {
  if (v === '' || v == null) {
    if (required) throw new UserError('Thiếu ' + label + '.');
    return null;
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new UserError(label + ' phải là số nguyên từ 0 đến ' + max + '.');
  return n;
}
function validate(x) {
  x = x || {};
  const e = {};
  e.id = text(x.id, 64).replace(/[^A-Za-z0-9-]/g, '');
  e.code = text(x.code, 10);
  checkCode(e.code);
  e.date = text(x.date, 10);
  if (!DAYS.includes(e.date)) throw new UserError('Ngày phải nằm trong 28/9 – 4/10/2026.');
  e.purpose = text(x.purpose, 40);
  if (!PURPOSES.includes(e.purpose)) throw new UserError('Chưa chọn mục đích.');
  e.purposeOther = e.purpose === 'Khác' ? text(x.purposeOther, 80) : '';
  e.planned = intIn(x.planned, MAX_MIN, 'Thời gian dự kiến', true);
  e.actual = intIn(x.actual, MAX_MIN, 'Thời gian thực tế', false);
  e.negative = intIn(x.negative, MAX_NEG, 'Số bài tiêu cực', false);
  e.match = text(x.match, 20);
  if (e.match && !MATCHES.includes(e.match)) throw new UserError('Mức đúng mục đích không hợp lệ.');
  e.last5 = text(x.last5, 300);
  e.status = isComplete(e) ? DONE : TODO;
  return e;
}
function isComplete(e) {
  return e.actual != null && e.negative != null && !!e.match && !!e.last5;
}

/**
 * Chỉ tính các lần lướt đã hoàn tất.
 * Mỗi ngày: chia cho số bạn có ít nhất một lần hoàn tất trong ngày đó (không chia cho 60).
 * Ngày không ai ghi: các giá trị trung bình là null (để biểu đồ để trống).
 */
function computeStats(entries, generatedAt) {
  const done = entries.filter(e => isComplete(e) && e.planned != null && DAYS.includes(e.date));
  const keys = GROUPS.map(g => g.key);
  const zero = () => Object.fromEntries(keys.map(k => [k, 0]));
  const allCodes = new Set();
  const tot = { studentDays: 0, sessions: 0, neg: 0, planned: 0, actual: 0, shareSum: 0, over: 0, equal: 0, under: 0, answers: 0, groups: zero() };

  const perDay = DAYS.map(d => {
    const es = done.filter(e => e.date === d);
    const by = {};
    es.forEach(e => { (by[e.code] = by[e.code] || []).push(e); allCodes.add(e.code); });
    const codes = Object.keys(by);
    const n = codes.length;
    const row = { date: d, students: n, sessions: es.length, avgNeg: null, avgPlanned: null, avgActual: null, matchShare: null, over: 0, equal: 0, under: 0, answers: 0, groups: zero() };
    if (!n) return row;
    let sNeg = 0, sP = 0, sA = 0, sShare = 0;
    codes.forEach(c => {
      let p = 0, a = 0, neg = 0, ok = 0;
      by[c].forEach(e => { p += e.planned; a += e.actual; neg += e.negative; if (e.match === 'Đúng hết') ok++; });
      sNeg += neg; sP += p; sA += a; sShare += ok / by[c].length;
      const diff = a - p;
      if (diff > EQUAL_BAND) row.over++;
      else if (diff < -EQUAL_BAND) row.under++;
      else row.equal++;
    });
    row.avgNeg = sNeg / n;
    row.avgPlanned = sP / n;
    row.avgActual = sA / n;
    row.matchShare = sShare / n;
    es.forEach(e => { row.answers++; classify(e.last5).forEach(k => { row.groups[k]++; }); });
    tot.studentDays += n; tot.sessions += es.length;
    tot.neg += sNeg; tot.planned += sP; tot.actual += sA; tot.shareSum += sShare;
    tot.over += row.over; tot.equal += row.equal; tot.under += row.under;
    tot.answers += row.answers;
    keys.forEach(k => { tot.groups[k] += row.groups[k]; });
    return row;
  });

  const sd = tot.studentDays;
  return {
    days: DAYS,
    equalBand: EQUAL_BAND,
    groups: GROUPS.map(g => ({ key: g.key, label: g.label, examples: g.kw.slice(0, 8) })),
    perDay,
    totals: {
      students: allCodes.size,
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
    generatedAt: generatedAt || null
  };
}

module.exports = { DAYS, PURPOSES, MATCHES, DONE, TODO, CODES, GROUPS, UserError, classify, checkCode, validate, isComplete, computeStats, fold };
