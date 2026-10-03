const XLSX = require('xlsx');

function parseSpreadsheet(buffer, filename = '') {
  let attendance = [];
  let demographics = null;
  let detectedPeriod = '';

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;

  // Find attendance sheet
  const attendanceSheetName = sheetNames.find(n => /kehadiran|attendance|absensi|presensi/i.test(n)) || sheetNames[0];
  const ws = workbook.Sheets[attendanceSheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  attendance = rows.map((r, idx) => {
    // Find name key
    const nameKey = Object.keys(r).find(k => /nama|employee|pegawai|karyawan/i.test(k));
    const name = nameKey ? String(r[nameKey]).trim() : `Pegawai ${idx+1}`;

    // Find minutes current
    const mntCurrKey = Object.keys(r).find(k => /(mnt|menit).*(curr|ini|juni|ags|agustus|sekarang)|^(menit|mnt)$/i.test(k)) ||
                       Object.keys(r).find(k => /menit/i.test(k));
    const mntCurrent = mntCurrKey ? parseNum(r[mntCurrKey]) : 0;

    // Find minutes last
    const mntLastKey = Object.keys(r).find(k => /(mnt|menit).*(lalu|last|prev)|^(bulan lalu)$/i.test(k));
    const mntLast = mntLastKey ? parseNum(r[mntLastKey]) : 0;

    // Find days current
    const hariCurrKey = Object.keys(r).find(k => /(hari|telat).*(curr|ini|juni|ags|sekarang)|^(hari|telat)$/i.test(k)) ||
                        Object.keys(r).find(k => /hari/i.test(k));
    const hariCurrent = hariCurrKey ? parseNum(r[hariCurrKey]) : 0;

    // Find days last
    const hariLastKey = Object.keys(r).find(k => /(hari|telat).*(lalu|last|prev)/i.test(k));
    const hariLast = hariLastKey ? parseNum(r[hariLastKey]) : 0;

    // Delta
    const deltaMntKey = Object.keys(r).find(k => /\(\+\/\-\)|delta.*m/i.test(k));
    const deltaMnt = deltaMntKey ? parseNum(r[deltaMntKey]) : (mntLast - mntCurrent);

    const deltaHariKey = Object.keys(r).find(k => /delta.*h/i.test(k));
    const deltaHari = deltaHariKey ? parseNum(r[deltaHariKey]) : (hariLast - hariCurrent);

    // Leaves
    const izinKey = Object.keys(r).find(k => /^izin|^permit/i.test(k));
    const sakitKey = Object.keys(r).find(k => /^sakit$|^sick$/i.test(k));
    const sakitTSKey = Object.keys(r).find(k => /tanpa|t\.?s\.?/i.test(k));
    const alfaKey = Object.keys(r).find(k => /alfa|alpha/i.test(k));
    const cutiKey = Object.keys(r).find(k => /cuti|leave/i.test(k));
    const wfhKey = Object.keys(r).find(k => /wfh/i.test(k));
    const skorKey = Object.keys(r).find(k => /skor|score|nilai/i.test(k));

    return {
      no: idx + 1,
      name,
      mntCurrent,
      mntLast,
      deltaMnt,
      hariCurrent,
      hariLast,
      deltaHari,
      izin: izinKey ? parseNum(r[izinKey]) : 0,
      sakit: sakitKey ? parseNum(r[sakitKey]) : 0,
      sakitTS: sakitTSKey ? parseNum(r[sakitTSKey]) : 0,
      alfa: alfaKey ? parseNum(r[alfaKey]) : 0,
      cuti: cutiKey ? parseNum(r[cutiKey]) : 0,
      wfh: wfhKey ? parseNum(r[wfhKey]) : 0,
      skor: skorKey ? parseNum(r[skorKey]) : 100
    };
  }).filter(e => e.name && e.name.length > 1);

  // Check if demographics sheet exists
  const demoSheetName = sheetNames.find(n => /demo|profil|profile/i.test(n));
  if (demoSheetName) {
    const wsDemo = workbook.Sheets[demoSheetName];
    const demoRows = XLSX.utils.sheet_to_json(wsDemo, { defval: "" });
    demographics = { status: [], gender: [], education: [], position: [] };

    demoRows.forEach(row => {
      const katKey = Object.keys(row).find(k => /kategori|category/i.test(k));
      const lblKey = Object.keys(row).find(k => /label|nama|status/i.test(k));
      const jmlKey = Object.keys(row).find(k => /jumlah|count|total/i.test(k));
      const pctKey = Object.keys(row).find(k => /persen|pct|percent/i.test(k));

      const kat = katKey ? String(row[katKey]).toLowerCase() : '';
      const label = lblKey ? String(row[lblKey]).trim() : '';
      const count = jmlKey ? parseNum(row[jmlKey]) : 0;
      const pct = pctKey ? parseNum(row[pctKey]) : 0;

      if (!label) return;

      if (/status/i.test(kat)) demographics.status.push({ label, count, pct });
      else if (/gender|kelamin/i.test(kat)) demographics.gender.push({ label, count, pct });
      else if (/pendidikan|edu/i.test(kat)) demographics.education.push({ label, count, pct });
      else if (/jabatan|position|role/i.test(kat)) demographics.position.push({ label, count, pct });
    });
  }

  return {
    attendance,
    demographics,
    totalRecords: attendance.length
  };
}

function parseNum(val) {
  if (val === null || val === undefined || val === "" || val === "-") return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

const { parsePdfBuffer } = require('./pdf_ai_parser');

async function parseUploadedBuffer(buffer, filename = '') {
  const isPdf = (filename && filename.toLowerCase().endsWith('.pdf')) || 
                (buffer && buffer.length > 4 && buffer.slice(0, 4).toString() === '%PDF');
  if (isPdf) {
    return await parsePdfBuffer(buffer);
  }

  if (filename && filename.toLowerCase().endsWith('.json')) {
    const text = buffer.toString('utf-8');
    const parsed = JSON.parse(text);
    const attendance = parsed.attendance || (Array.isArray(parsed) ? parsed : []);
    return {
      success: true,
      period: parsed.periode || 'Periode Baru',
      totalRecords: attendance.length,
      autoGeneratedTotalEmployees: attendance.length,
      headerTotalPegawai: parsed.totalPegawaiHeader || attendance.length,
      demographics: parsed.demographics || null,
      attendance,
      sourceType: 'json'
    };
  }

  const sheetData = parseSpreadsheet(buffer, filename);
  return {
    success: true,
    period: 'Periode Baru',
    totalRecords: sheetData.totalRecords,
    autoGeneratedTotalEmployees: sheetData.totalRecords,
    headerTotalPegawai: sheetData.totalRecords,
    demographics: sheetData.demographics,
    attendance: sheetData.attendance,
    sourceType: 'spreadsheet'
  };
}

module.exports = { parseSpreadsheet, parseUploadedBuffer, parseNum };
