const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function findBrowserPath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function exportPdf(period = 'juni_2026', lang = 'id') {
  const browserPath = findBrowserPath();
  if (!browserPath) {
    console.error('Browser Chrome / Edge tidak ditemukan.');
    process.exit(1);
  }

  const exportDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const outFileName = `Laporan_Eksekutif_${period.toUpperCase()}_${lang.toUpperCase()}.pdf`;
  const outPath = path.join(exportDir, outFileName);

  const url = `http://localhost:3000/report/${period}_${lang}`;

  console.log(`Mengenerate PDF untuk ${period} (${lang}) menggunakan ${path.basename(browserPath)}...`);
  console.log(`Target URL: ${url}`);
  console.log(`Menyimpan ke: ${outPath}`);

  const args = [
    '--headless',
    '--disable-gpu',
    '--landscape',
    '--no-margins',
    '--no-pdf-header-footer',
    '--run-all-compositor-stages-before-draw',
    `--print-to-pdf=${outPath}`,
    url
  ];

  return new Promise((resolve, reject) => {
    execFile(browserPath, args, (error) => {
      if (error) {
        console.error('Gagal generate PDF:', error);
        reject(error);
      } else {
        if (fs.existsSync(outPath)) {
          const stats = fs.statSync(outPath);
          console.log(`✓ Berhasil! PDF tersimpan (${(stats.size / 1024).toFixed(1)} KB): ${outPath}`);
          resolve(outPath);
        } else {
          reject(new Error('File PDF tidak terbentuk.'));
        }
      }
    });
  });
}

// Support CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const period = args[0] || 'juni_2026';
  const lang = args[1] || 'id';

  exportPdf(period, lang).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { exportPdf };
