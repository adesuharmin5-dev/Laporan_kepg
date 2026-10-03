const fs = require('fs');
const path = require('path');
const { calculateMetrics } = require('./src/calculator');
const { renderReportHTML } = require('./src/html_renderer');

const periods = ['juni_2026', 'agustus_2026'];
const langs = ['id', 'en'];

periods.forEach(p => {
  const dataPath = path.join(__dirname, 'data', `${p}.json`);
  if (!fs.existsSync(dataPath)) return;
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const metrics = calculateMetrics(rawData);
  metrics.attendance = rawData.attendance;

  langs.forEach(l => {
    const html = renderReportHTML(metrics, l);
    const outName = `report_${p}_${l}.html`;
    fs.writeFileSync(path.join(__dirname, outName), html, 'utf8');
    console.log(`Generated: ${outName}`);
  });
});
