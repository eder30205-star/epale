// epaleapp.online/sitemap.xml → lista para Google: inicio, países y los posts recientes.
import { supa, SITE, PAGINAS } from "./_comun.js";

export default async function handler(req, res) {
  const rows = await supa("posts?select=id,created_at&order=created_at.desc&limit=2000");
  const posts = Array.isArray(rows) ? rows : [];
  const urls = [
    `<url><loc>${SITE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...Object.keys(PAGINAS).map((c) => `<url><loc>${SITE}/${c}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`),
    ...posts.map((p) => `<url><loc>${SITE}/p/${p.id}</loc>${p.created_at ? `<lastmod>${String(p.created_at).slice(0, 10)}</lastmod>` : ""}<priority>0.6</priority></url>`),
  ];
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
}
