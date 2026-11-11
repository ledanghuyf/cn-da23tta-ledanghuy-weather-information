// Máy chủ phát triển: tự chọn cổng trống, không dừng tiến trình của ứng dụng khác.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '../dist');
const rawPort = process.env.PORT?.trim();
let port = rawPort ? Number(rawPort) : 5500, attempts = 0;
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.log('PORT không hợp lệ. Ứng dụng sẽ tự chọn từ cổng 5500.'); port = 5500;
}
if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('Không tìm thấy dist/index.html. Hãy giải nén toàn bộ dự án rồi chạy lại.'); process.exit(1);
}
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(data);
  });
});
server.on('error', error => {
  if (['EADDRINUSE','EACCES'].includes(error.code) && attempts++ < 20 && port > 0 && port < 65535) {
    console.log(`Cổng ${port} đang bận hoặc không khả dụng, đang chọn cổng khác…`);
    port++; server.listen(port, '0.0.0.0'); return;
  }
  console.error('Chưa mở được máy chủ cục bộ. Hãy đóng cửa sổ chạy ứng dụng cũ hoặc kiểm tra quyền truy cập mạng cục bộ.');
  process.exitCode = 1;
});
server.on('listening', () => {
  const activePort = server.address().port;
  const url = `http://localhost:${activePort}/`;
  const lanAddresses = Object.values(os.networkInterfaces()).flatMap(interfaces =>
    (interfaces || []).filter(item => item.family === 'IPv4' && !item.internal).map(item => item.address)
  );
  if (lanAddresses.length) console.log(`\nDien thoai (cung Wi-Fi):\n${lanAddresses.map(address => `http://${address}:${activePort}/`).join('\n')}\n`);
  console.log('Luu y: URL HTTP trong mang Wi-Fi chi xem duoc website; GPS tren dien thoai can dia chi HTTPS. Tra cuu bang ten van dung duoc.');
  console.log(`\nTHỜI TIẾT ĐÃ SẴN SÀNG\n${url}\nThư mục: ${path.dirname(root)}\nGiữ cửa sổ này mở. Nhấn Ctrl+C để dừng.\n`);
  if (process.argv.includes('--open')) {
    const command = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows','explorer.exe') : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const child = spawn(command, [url], {stdio:'ignore',detached:true,windowsHide:true});
    child.on('error', () => console.log(`Hãy mở trình duyệt và truy cập ${url}`)); child.unref();
  }
});
server.listen(port, '0.0.0.0');
