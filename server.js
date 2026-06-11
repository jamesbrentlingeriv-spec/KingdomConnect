const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Parse URL and default to index.html
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    
    // Resolve absolute path
    const filePath = path.join(__dirname, decodeURIComponent(reqPath));
    
    // Security check: prevent path traversal out of the workspace
    if (!filePath.startsWith(__dirname)) {
        res.statusCode = 403;
        res.end('Access Denied');
        return;
    }
    
    // Read and serve file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // If it's a directory try index.html inside it
                fs.stat(filePath, (statErr, stats) => {
                    if (!statErr && stats.isDirectory()) {
                        const indexFilePath = path.join(filePath, 'index.html');
                        fs.readFile(indexFilePath, (indexErr, indexContent) => {
                            if (indexErr) {
                                res.statusCode = 404;
                                res.end('Page Not Found');
                            } else {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(indexContent, 'utf-8');
                            }
                        });
                    } else {
                        res.statusCode = 404;
                        res.end('File Not Found');
                    }
                });
            } else {
                res.statusCode = 500;
                res.end(`Internal Server Error: ${err.code}`);
            }
        } else {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate' // Prevent stale cache during dev
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` Kingdom Connect Newcomer Database Dev Server      `);
    console.log(` Running locally at: http://localhost:${PORT}/      `);
    console.log(`===================================================`);
});
