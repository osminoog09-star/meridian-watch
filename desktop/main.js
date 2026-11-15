// Mercury Response — настольная оболочка (Windows). Игра встроена и работает офлайн.
// Оболочка только отдаёт статические файлы игры по собственной схеме; игровой код не меняется.
const {app, BrowserWindow, Menu, protocol, shell, session} = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const GAME_DIR = path.join(__dirname, 'game');
const ORIGIN = 'mercury://game';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};

// Постоянный origin: сохранения (localStorage) переживают обновления сборки.
protocol.registerSchemesAsPrivileged([
  {scheme: 'mercury', privileges: {standard: true, secure: true, supportFetchAPI: true, stream: true}},
]);

if (!app.requestSingleInstanceLock()) app.quit();

async function serve(request) {
  const url = new URL(request.url);
  if (url.host !== 'game') return new Response('Not found', {status: 404});
  let relative;
  try { relative = decodeURIComponent(url.pathname); } catch { return new Response('Bad request', {status: 400}); }
  if (relative.endsWith('/')) relative += 'index.html';
  const file = path.resolve(GAME_DIR, '.' + relative);
  if (file !== GAME_DIR && !file.startsWith(GAME_DIR + path.sep)) return new Response('Forbidden', {status: 403});
  try {
    const body = await fs.readFile(file);
    return new Response(body, {headers: {
      'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    }});
  } catch { return new Response('Not found', {status: 404}); }
}

const isGameUrl = url => url.startsWith(ORIGIN + '/');
const isSafeExternal = url => { try { return new URL(url).protocol === 'https:'; } catch { return false; } };

function guard(contents) {
  contents.setWindowOpenHandler(({url}) => {
    if (isGameUrl(url)) return {action: 'allow', overrideBrowserWindowOptions: {
      width: 1280, height: 860, autoHideMenuBar: true, backgroundColor: '#111c23',
      webPreferences: {contextIsolation: true, sandbox: true, nodeIntegration: false},
    }};
    if (isSafeExternal(url)) shell.openExternal(url);
    return {action: 'deny'};
  });
  contents.on('will-navigate', (event, url) => {
    if (isGameUrl(url)) return;
    event.preventDefault();
    if (isSafeExternal(url)) shell.openExternal(url);
  });
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const win = BrowserWindow.fromWebContents(contents);
    if (!win) return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); event.preventDefault(); }
    else if (input.key === 'Escape' && win.isFullScreen() && !contents.isDevToolsOpened()) win.setFullScreen(false);
    else if (input.key === 'F12') { contents.toggleDevTools(); event.preventDefault(); }
    else if (input.key === 'F5') { contents.reload(); event.preventDefault(); }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 950, minWidth: 1024, minHeight: 640,
    title: 'Mercury Response', backgroundColor: '#111c23', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: true},
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.loadURL(ORIGIN + '/index.html');
  return win;
}

app.on('web-contents-created', (_event, contents) => guard(contents));
app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.on('window-all-closed', () => app.quit());

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('mercury', serve);
  // Игре не нужны камера, микрофон, геолокация и уведомления.
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === 'fullscreen'));
  createWindow();
});
