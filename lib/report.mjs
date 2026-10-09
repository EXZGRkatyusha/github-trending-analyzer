import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PERIOD_TEXT = { daily: '每日', weekly: '每周', monthly: '每月' };

export function generateJSONReport(repos, period, date) {
  const report = buildReport(repos, period, date);
  const dir = join(ROOT, 'data', 'reports', period);
  mkdirSync(dir, { recursive: true });

  const jsonPath = join(dir, `${date}.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  const latestPath = join(ROOT, 'data', `latest-${period}.json`);
  writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf-8');

  return { jsonPath, latestPath };
}

export function generateMarkdownReport(repos, period, date) {
  const pt = PERIOD_TEXT[period] || period;
  let md = `# GitHub Trending ${pt}榜单中文日报\n\n`;
  md += `> 日期：${date}  |  共 ${repos.length} 个项目\n\n`;

  const langStats = getLanguageStats(repos);
  md += `## 📊 语言分布\n\n| 语言 | 项目数 | 占比 |\n|------|--------|------|\n`;
  for (const { language, count } of langStats.slice(0, 10)) {
    md += `| ${language || '未标注'} | ${count} | ${(count / repos.length * 100).toFixed(1)}% |\n`;
  }
  md += '\n';

  md += `## 🔥 热门项目\n\n`;
  repos.forEach((repo, i) => {
    md += `### ${i + 1}. [${repo.fullName}](${repo.url})\n\n`;
    if (repo.description) md += `${repo.description}\n\n`;
    const meta = [];
    if (repo.language) meta.push(`🏷️ ${repo.language}`);
    meta.push(`⭐ ${repo.stars.toLocaleString()}`);
    meta.push(`⑂ ${repo.forks.toLocaleString()}`);
    if (repo.starsToday) meta.push(`📈 +${repo.starsToday} stars ${pt.replace('榜', '')}`);
    md += `- ${meta.join('  |  ')}\n\n`;
  });

  md += `---\n*由 GitHub Trending 分析工具自动生成*\n`;

  const dir = join(ROOT, 'data', 'reports', period);
  mkdirSync(dir, { recursive: true });
  const mdPath = join(dir, `${date}.md`);
  writeFileSync(mdPath, md, 'utf-8');
  return mdPath;
}

export function updateDashboardData(repos, period, date) {
  const report = buildReport(repos, period, date);
  const dashboardDir = join(ROOT, 'dashboard');
  mkdirSync(dashboardDir, { recursive: true });

  const dataJsPath = join(dashboardDir, 'data.js');
  writeFileSync(dataJsPath, `window.__TRENDING_DATA__ = ${JSON.stringify(report, null, 2)};`, 'utf-8');
  return dataJsPath;
}

function buildReport(repos, period, date) {
  return {
    date,
    period,
    generatedAt: new Date().toISOString(),
    totalRepos: repos.length,
    languages: getLanguageStats(repos),
    repos,
  };
}

function getLanguageStats(repos) {
  const map = new Map();
  for (const repo of repos) {
    const lang = repo.language || '未标注';
    map.set(lang, (map.get(lang) || 0) + 1);
  }
  return [...map.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);
}