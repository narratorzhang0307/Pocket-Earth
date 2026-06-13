// 音乐资产流水线（离线 Node 脚本）。
// 真实可用：writeback（OSS URL → audio.db）。外部阶段（resolve/download/normalize/upload）
// 需 yt-dlp/ffmpeg/ossutil + OSS 凭据，留作接入点；本仓库不含任何密钥。
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(HERE, '../../../../../resource-library/audio.db');

const STAGES = ['resolve', 'download', 'normalize', 'upload', 'writeback'];

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const cmd = process.argv[2];

if (cmd === 'plan') {
  const city = arg('city') || '<slug>';
  console.log(`音乐流水线 · ${city}`);
  STAGES.forEach((s, i) => {
    const impl = s === 'writeback' ? '✅ 已实现' : '接入点（需外部工具/凭据）';
    console.log(`  ${i + 1}. ${s.padEnd(10)} ${impl}`);
  });
  console.log('外部阶段：yt-dlp（解析/下载）、ffmpeg（转码/时长）、ossutil/OSS SDK（上传，需凭据）。');
  process.exit(0);
}

if (cmd === 'writeback') {
  const city = arg('city'), track = arg('track'), url = arg('url');
  if (!city || !track || !url) { console.error('用法: writeback --city <slug> --track <trackId> --url <oss_url>'); process.exit(1); }
  if (!url.startsWith('http')) { console.error('url 必须是 OSS 绝对地址'); process.exit(1); }
  const db = new DatabaseSync(DB_PATH);
  const r = db.prepare('UPDATE tracks SET audio_url=? WHERE city_slug=? AND track_id=?').run(url, city, track);
  db.close();
  console.log(r.changes ? `已写回 ${city}/${track} → ${url}` : `未找到曲目 ${city}/${track}`);
  console.log('接着运行: npm run radio:build');
  process.exit(r.changes ? 0 : 1);
}

console.error('用法: pipeline.mjs <plan|writeback> [...]\n  plan --city <slug>\n  writeback --city <slug> --track <trackId> --url <oss_url>');
process.exit(1);
