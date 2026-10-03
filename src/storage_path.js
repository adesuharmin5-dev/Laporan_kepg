const fs = require('fs');
const path = require('path');

const ORIGINAL_DATA_DIR = path.join(__dirname, '..', 'data');
const IS_VERCEL = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'hr_data') : ORIGINAL_DATA_DIR;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Seed /tmp from ORIGINAL_DATA_DIR on Vercel/Serverless
  if (IS_VERCEL && fs.existsSync(ORIGINAL_DATA_DIR)) {
    try {
      const files = fs.readdirSync(ORIGINAL_DATA_DIR);
      for (const f of files) {
        const src = path.join(ORIGINAL_DATA_DIR, f);
        const dest = path.join(DATA_DIR, f);
        if (!fs.existsSync(dest) && fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest);
        }
      }
    } catch (e) {
      console.warn('Seed /tmp error:', e.message);
    }
  }
}

module.exports = {
  DATA_DIR,
  ORIGINAL_DATA_DIR,
  ensureDataDir,
  IS_VERCEL
};
