import https from 'node:https';

const API_HOST = 'api.github.com';
const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 30 };

export async function fetchTrendingRepos(period) {
  const days = PERIOD_DAYS[period] || 1;
  const since = new Date(Date.now() - days * 86400000)
    .toISOString().slice(0, 10);

  const path = `/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=25`;
  const json = await fetchAPI(path);

  return (json.items || []).map(itemToRepo);
}

function fetchAPI(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: '127.0.0.1',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'Host': API_HOST,
        'User-Agent': 'github-trending-analyzer',
        'Accept': 'application/vnd.github+json',
      },
      servername: API_HOST,
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Request timeout (30s)')));
    req.end();
  });
}

function itemToRepo(item) {
  const [owner, repo] = item.full_name.split('/');
  return {
    fullName: item.full_name,
    owner,
    repo,
    description: item.description || '',
    language: item.language || '',
    stars: item.stargazers_count || 0,
    forks: item.forks_count || 0,
    starsToday: item.watchers_count || 0,
    url: item.html_url,
    topics: item.topics || [],
    openIssues: item.open_issues_count || 0,
    license: item.license ? item.license.spdx_id : '',
    createdAt: item.created_at,
  };
}