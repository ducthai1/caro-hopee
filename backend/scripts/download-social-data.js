const https = require('https');
const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '../src/data/sources/social_raw');
if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

const DATASETS = [
  {
    name: 'vihsd_train.csv',
    urls: [
      'https://raw.githubusercontent.com/sonlam1102/vihsd/main/data/train.csv',
      'https://raw.githubusercontent.com/sonlam1102/vihsd/master/data/train.csv',
      'https://huggingface.co/datasets/sonlam1102/vihsd/resolve/main/data/train.csv',
      'https://huggingface.co/datasets/sonlam1102/vihsd/resolve/main/train.csv',
      'https://raw.githubusercontent.com/tuananhphan/ViHSD/main/data/train.csv'
    ]
  },
  {
    name: 'uit_vsfc_sents.txt',
    urls: [
      'https://raw.githubusercontent.com/piti118/UIT-VSFC/master/data/train/sents.txt',
      'https://raw.githubusercontent.com/khanhnamle1994/sentiment-analysis-on-vietnamese-feedback/master/data/train_sent',
      'https://raw.githubusercontent.com/vnlp/vnlp/master/data/UIT-VSFC/train/sents.txt'
    ]
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        // Consume response data to free up memory
        res.resume();
        reject(new Error(`Status ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
            // Check size > 100B (avoid tiny HTML error pages)
            try {
                const stats = fs.statSync(dest);
                if(stats.size < 100) {
                     fs.unlinkSync(dest);
                     reject(new Error(`File too small (${stats.size} bytes), likely 404 page`));
                } else {
                     resolve();
                }
            } catch (e) {
                reject(e);
            }
        });
      });
    }).on('error', (err) => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
    });
  });
}

async function main() {
  for (const ds of DATASETS) {
    console.log(`Trying to download ${ds.name}...`);
    let downloaded = false;
    for (const url of ds.urls) {
      try {
        console.log(`  Checking ${url}...`);
        await download(url, path.join(TARGET_DIR, ds.name));
        console.log(`  ✅ Success: ${url}`);
        downloaded = true;
        break;
      } catch (err) {
        console.log(`  ❌ Failed: ${err.message}`);
      }
    }
    if (!downloaded) console.error(`  ⚠️ Could not download ${ds.name} from any source.`);
  }
}

main();
