import app from '../server';

export default function handler(req: any, res: any) {
  // Garantir que a URL recebida via Vercel Serverless Function preserve o caminho original esperado pelo Express
  if (req.headers) {
    if (req.headers['x-matched-path']) {
      req.url = req.headers['x-matched-path'];
    } else if (req.headers['x-now-route-matches']) {
      const parts = new URLSearchParams(req.headers['x-now-route-matches']);
      const subpath = parts.get('1');
      if (subpath) {
        req.url = `/api/${decodeURIComponent(subpath)}`;
      }
    }
  }

  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
