import { fetchTrendingRepos } from '../lib/fetch-trending.mjs';
import { generateJSONReport, generateMarkdownReport, updateDashboardData } from '../lib/report.mjs';

const args = process.argv.slice(2);
const periodIdx = args.indexOf('--period');
const period = periodIdx >= 0 ? args[periodIdx + 1] : 'daily';

const validPeriods = ['daily', 'weekly', 'monthly'];
if (!validPeriods.includes(period)) {
  console.error(`❌ 无效的 period: ${period}，可选值: ${validPeriods.join(', ')}`);
  process.exit(1);
}

const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const periodText = { daily: '每日', weekly: '每周', monthly: '每月' }[period];

console.log(`\n🚀 GitHub Trending ${periodText}榜单分析`);
console.log(`📅 日期: ${date}`);
console.log(`⏳ 正在通过 GitHub Search API 获取热门项目 ...\n`);

try {
  const repos = await fetchTrendingRepos(period);
  console.log(`✅ 获取到 ${repos.length} 个项目\n`);

  if (repos.length === 0) {
    console.error('⚠️  未解析到任何项目，可能页面结构已变化');
    process.exit(1);
  }

  const { jsonPath, latestPath } = generateJSONReport(repos, period, date);
  console.log(`✅ JSON 报告: ${jsonPath}`);
  console.log(`✅ Latest 数据: ${latestPath}`);

  const mdPath = generateMarkdownReport(repos, period, date);
  console.log(`✅ 中文日报: ${mdPath}`);

  const dataJsPath = updateDashboardData(repos, period, date);
  console.log(`✅ Dashboard 数据: ${dataJsPath}`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 ${periodText}榜单 Top 10`);
  console.log(`${'═'.repeat(60)}\n`);

  repos.slice(0, 10).forEach((repo, i) => {
    const rank = String(i + 1).padStart(2, ' ');
    const stars = `⭐${repo.stars.toLocaleString()}`.padEnd(12, ' ');
    const lang = (repo.language || 'N/A').padEnd(12, ' ').slice(0, 12);
    const today = repo.starsToday ? `+${repo.starsToday}` : '';
    console.log(`${rank}. ${repo.fullName}`);
    console.log(`    ${stars}  ${lang}  ${today}`);
    if (repo.description) console.log(`    ${repo.description.slice(0, 80)}`);
    console.log('');
  });

  console.log(`${'═'.repeat(60)}`);
  console.log(`✨ 分析完成！共 ${repos.length} 个项目`);
  console.log(`📄 日报: ${mdPath}`);
  console.log(`🌐 Dashboard: dashboard/index.html`);
  console.log(`${'═'.repeat(60)}\n`);
} catch (error) {
  console.error(`\n❌ 分析失败: ${error.message}\n`);
  console.error(error.stack);
  process.exit(1);
}