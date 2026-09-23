// Vercel / Node entrypoint handler
const path = require('path');
const fs = require('fs');

module.exports = (req, res) => {
  const url = (req.url || '/').split('?')[0];
  const targetFile = url === '/' ? 'index.html' : url.slice(1);
  const filePath = path.join(__dirname, 'dist', targetFile);

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    if (res && res.setHeader) {
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  const fallback = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(fallback) && res && res.setHeader) {
    res.setHeader('Content-Type', 'text/html');
    return fs.createReadStream(fallback).pipe(res);
  }

  if (res && res.status) {
    res.status(404).send('Not Found');
  } else if (res && res.end) {
    res.statusCode = 404;
    res.end('Not Found');
  }
};
