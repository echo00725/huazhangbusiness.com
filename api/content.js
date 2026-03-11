const fs = require('fs');
const path = require('path');

const CONTENT_PATH = path.join(process.cwd(), 'content.json');

function json(res, code, data) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function readLocalContent() {
  const raw = fs.readFileSync(CONTENT_PATH, 'utf8');
  return JSON.parse(raw);
}

async function readGithubContent() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const filePath = process.env.GITHUB_CONTENT_PATH || 'content.json';

  if (!token || !owner || !repo) return null;

  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'huazhangbusiness-site'
    }
  });

  if (!r.ok) throw new Error(`github-read-failed:${r.status}`);
  const data = await r.json();
  const raw = Buffer.from((data.content || '').replace(/\n/g, ''), 'base64').toString('utf8');
  return { content: JSON.parse(raw), sha: data.sha, filePath, branch, owner, repo, token };
}

async function writeGithubContent(payload) {
  const current = await readGithubContent();
  if (!current) throw new Error('github-not-configured');

  const message = `chore: update content (${new Date().toISOString()})`;
  const body = {
    message,
    content: Buffer.from(JSON.stringify(payload, null, 2), 'utf8').toString('base64'),
    sha: current.sha,
    branch: current.branch
  };

  const r = await fetch(`https://api.github.com/repos/${current.owner}/${current.repo}/contents/${encodeURIComponent(current.filePath)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${current.token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'huazhangbusiness-site'
    },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`github-write-failed:${r.status}:${text.slice(0, 200)}`);
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      try {
        const g = await readGithubContent();
        if (g?.content) return json(res, 200, g.content);
      } catch (_) {}
      return json(res, 200, readLocalContent());
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      const adminPassword = process.env.ADMIN_PASSWORD || '';
      if (adminPassword) {
        if (body.password !== adminPassword) return json(res, 401, { ok: false, error: '密码错误' });
      }
      delete body.password;

      await writeGithubContent(body);
      return json(res, 200, { ok: true, storage: 'github' });
    }

    return json(res, 405, { ok: false, error: 'Method Not Allowed' });
  } catch (e) {
    return json(res, 500, { ok: false, error: '保存失败', detail: String(e.message || e) });
  }
};
