const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8090;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''; // 留空=不校验密码
const BASE = __dirname;
const CONTENT = path.join(BASE, 'content.json');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

function send(res, code, data, type='text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/content' && req.method === 'GET') {
    const raw = fs.readFileSync(CONTENT, 'utf8');
    return send(res, 200, raw, mime['.json']);
  }

  if (url.pathname === '/api/content' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      if (ADMIN_PASSWORD) {
        if (body.password !== ADMIN_PASSWORD) return send(res, 401, JSON.stringify({ ok:false, error:'密码错误' }), mime['.json']);
      }
      delete body.password;
      fs.writeFileSync(CONTENT, JSON.stringify(body, null, 2), 'utf8');
      return send(res, 200, JSON.stringify({ ok:true }), mime['.json']);
    } catch (e) {
      return send(res, 400, JSON.stringify({ ok:false, error:'请求格式错误' }), mime['.json']);
    }
  }

  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.join(BASE, file);
  if (!filePath.startsWith(BASE)) return send(res, 403, 'Forbidden');
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return send(res, 404, 'Not Found');
  const ext = path.extname(filePath).toLowerCase();
  send(res, 200, fs.readFileSync(filePath), mime[ext] || 'application/octet-stream');
});

server.listen(PORT, () => {
  console.log(`Site: http://127.0.0.1:${PORT}`);
  console.log(`Admin: http://127.0.0.1:${PORT}/admin.html`);
  console.log(`Password check: ${ADMIN_PASSWORD ? 'ON' : 'OFF'}`);
});