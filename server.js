const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { calculateMetrics } = require('./src/calculator');
const { renderReportHTML } = require('./src/html_renderer');
const { parseSpreadsheet, parseUploadedBuffer } = require('./src/parser');
const { getLockedPeriods, getPeriodData, lockAndSavePeriod } = require('./src/period_manager');
const { syncDatabaseToSpreadsheet, getDatabaseStats, loadDatabaseFromSpreadsheet, DB_FILE } = require('./src/spreadsheet_db');
const { checkConnection, listTabs, pullDataFromTab, pushPeriodToGoogleSheet, PRESET_SPREADSHEETS } = require('./src/google_sheets');

const PORT = process.env.PORT || 3000;

async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Static Templates Download
  if (pathname === '/template_kehadiran_karyawan.xlsx') {
    const fPath = path.join(__dirname, 'public', 'template_kehadiran_karyawan.xlsx');
    if (fs.existsSync(fPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_kehadiran_karyawan.xlsx"'
      });
      fs.createReadStream(fPath).pipe(res);
      return;
    }
  }

  if (pathname === '/template_kehadiran_karyawan.csv') {
    const fPath = path.join(__dirname, 'public', 'template_kehadiran_karyawan.csv');
    if (fs.existsSync(fPath)) {
      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="template_kehadiran_karyawan.csv"'
      });
      fs.createReadStream(fPath).pipe(res);
      return;
    }
  }

  // Download Database Spreadsheet
  if (pathname === '/database_kepegawaian.xlsx' || pathname === '/api/db/download') {
    if (!fs.existsSync(DB_FILE)) {
      syncDatabaseToSpreadsheet();
    }
    if (fs.existsSync(DB_FILE)) {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="database_kepegawaian.xlsx"'
      });
      fs.createReadStream(DB_FILE).pipe(res);
      return;
    }
  }

  // Download generated PDFs
  if (pathname.startsWith('/exports/')) {
    const fileName = path.basename(pathname);
    const fPath = path.join(__dirname, 'exports', fileName);
    if (fs.existsSync(fPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`
      });
      fs.createReadStream(fPath).pipe(res);
      return;
    }
  }

  // Serve static UI
  if (pathname === '/' || pathname === '/index.html') {
    const filePath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading index.html');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  if (pathname === '/client.js') {
    const filePath = path.join(__dirname, 'public', 'client.js');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // API: Get List of Locked Periods
  if (pathname === '/api/locked-periods') {
    const periods = getLockedPeriods();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(periods));
    return;
  }

  // API: Get Dataset JSON
  if (pathname === '/api/data') {
    const period = parsedUrl.query.period || 'juni_2026';
    const data = getPeriodData(period);
    if (!data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Period not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // API: Get Spreadsheet Database Stats
  if (pathname === '/api/db/stats') {
    try {
      const stats = getDatabaseStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...stats }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Sync Local Spreadsheet Database
  if (pathname === '/api/db/sync' && req.method === 'POST') {
    try {
      const result = syncDatabaseToSpreadsheet();
      const stats = getDatabaseStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Database spreadsheet berhasil disinkronkan.', ...stats, ...result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Upload & Restore Database Spreadsheet (.xlsx)
  if (pathname === '/api/db/upload' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const rawBuffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        let fileBuffer = rawBuffer;

        if (contentType.includes('multipart/form-data')) {
          const boundary = contentType.split('boundary=')[1];
          if (boundary) {
            const extracted = extractFileFromMultipart(rawBuffer, boundary.trim());
            fileBuffer = extracted.buffer;
          }
        }

        const result = loadDatabaseFromSpreadsheet(fileBuffer);
        const stats = getDatabaseStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result, stats }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Google Sheets Status
  if (pathname === '/api/gsheets/status') {
    try {
      const status = await checkConnection();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: false, error: err.message }));
    }
    return;
  }

  // API: Google Sheets Presets
  if (pathname === '/api/gsheets/presets') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, presets: PRESET_SPREADSHEETS }));
    return;
  }

  // API: Google Sheets List Tabs
  if (pathname === '/api/gsheets/tabs') {
    const sId = parsedUrl.query.spreadsheetId || PRESET_SPREADSHEETS[0].id;
    try {
      const tabsInfo = await listTabs(sId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...tabsInfo }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Google Sheets Pull Data from Tab
  if (pathname === '/api/gsheets/pull' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (!payload.spreadsheetId || !payload.tabName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'spreadsheetId dan tabName wajib diisi.' }));
          return;
        }

        const pulledData = await pullDataFromTab(payload.spreadsheetId, payload.tabName);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...pulledData }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Google Sheets Push Period Report to Sheet
  if (pathname === '/api/gsheets/push' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const periodId = payload.periodId;
        const spreadsheetId = payload.spreadsheetId || PRESET_SPREADSHEETS[0].id;

        const periodData = getPeriodData(periodId);
        if (!periodData) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Periode ${periodId} tidak ditemukan.` }));
          return;
        }

        const pushRes = await pushPeriodToGoogleSheet(spreadsheetId, periodData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(pushRes));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Upload Raw File (PDF, Excel, CSV, JSON)
  if (pathname === '/api/upload' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const rawBuffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        let fileName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : '';
        let fileBuffer = rawBuffer;

        if (contentType.includes('multipart/form-data')) {
          const boundary = contentType.split('boundary=')[1];
          if (boundary) {
            const extracted = extractFileFromMultipart(rawBuffer, boundary.trim());
            fileBuffer = extracted.buffer;
            if (extracted.filename) fileName = extracted.filename;
          }
        }

        const parsedResult = await parseUploadedBuffer(fileBuffer, fileName);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...parsedResult }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Lock & Save Period
  if (pathname === '/api/lock-period' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.periode || !payload.attendance || !payload.attendance.length) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Data kehadiran dan nama periode wajib diisi.' }));
          return;
        }

        const savedData = lockAndSavePeriod(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, period: savedData.id, data: savedData }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve full 6-page reports directly
  if (pathname.startsWith('/report/')) {
    const reportKey = pathname.replace('/report/', '');
    const parts = reportKey.split('_');
    const lang = (parts[parts.length - 1] === 'en') ? 'en' : 'id';
    const periodId = parts.slice(0, parts.length - 1).join('_') || reportKey;

    let data = getPeriodData(periodId);
    if (!data) {
      // Fallback check
      if (periodId.startsWith('juni')) data = getPeriodData('juni_2026');
      else if (periodId.startsWith('agustus')) data = getPeriodData('agustus_2026');
    }

    if (data) {
      const metrics = calculateMetrics(data);
      metrics.attendance = data.attendance;
      const html = renderReportHTML(metrics, lang);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
}

function extractFileFromMultipart(buffer, boundary) {
  const boundaryBuffer = Buffer.from('--' + boundary);
  let start = buffer.indexOf(boundaryBuffer);
  if (start === -1) return { buffer, filename: '' };

  const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), start);
  if (headerEnd === -1) return { buffer, filename: '' };

  const headerText = buffer.slice(start, headerEnd).toString('utf-8');
  let filename = '';
  const fnMatch = headerText.match(/filename="([^"]+)"/i);
  if (fnMatch) filename = fnMatch[1];

  const fileStart = headerEnd + 4;
  const nextBoundary = buffer.indexOf(boundaryBuffer, fileStart);
  if (nextBoundary === -1) return { buffer: buffer.slice(fileStart), filename };

  return { buffer: buffer.slice(fileStart, nextBoundary - 2), filename };
}

const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`HR Executive Report Generator running on:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = handleRequest;
module.exports.server = server;
