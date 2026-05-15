import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const port = parseInt(process.env.PORT || '5000', 10);
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, port, turbopack: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`SKBOJ running on port ${port}`);
  });
});
