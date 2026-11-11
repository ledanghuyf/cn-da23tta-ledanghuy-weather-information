"""Fallback nếu máy có Python nhưng chưa có Node.js."""
import functools
import http.server
import os
from pathlib import Path
import socket
import sys
import webbrowser

root = Path(__file__).resolve().parent.parent / 'dist'
if not (root / 'index.html').is_file():
    sys.exit('Khong tim thay dist/index.html. Hay giai nen toan bo du an.')
try:
    port = int(os.environ.get('PORT', '5500'))
    if not 0 <= port <= 65535:
        raise ValueError()
except ValueError:
    port = 5500

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def list_directory(self, path):
        self.send_error(403)

handler = functools.partial(Handler, directory=str(root))
for attempt in range(21):
    try:
        server = http.server.ThreadingHTTPServer(('0.0.0.0', port), handler)
        break
    except OSError as error:
        if error.errno not in (13, 48, 98, 10013, 10048) or port >= 65535 or attempt == 20:
            sys.exit('Chua mo duoc may chu. Hay dong cua so chay cu roi thu lai.')
        print(f'Cong {port} dang ban. Dang chon cong khac...', flush=True)
        port += 1
url = f'http://localhost:{server.server_port}/'
try:
    host_ip = socket.gethostbyname(socket.gethostname())
except OSError:
    host_ip = ''
if host_ip and not host_ip.startswith('127.'):
    print(f'Dien thoai (cung Wi-Fi): http://{host_ip}:{server.server_port}/', flush=True)
print('Luu y: URL HTTP trong mang Wi-Fi chi xem duoc website; GPS tren dien thoai can dia chi HTTPS. Tra cuu bang ten van dung duoc.', flush=True)
print(f'THOI TIET DA SAN SANG\n{url}\nGiu cua so nay mo. Ctrl+C de dung.', flush=True)
if '--open' in sys.argv:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
