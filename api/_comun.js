// Utilidades para las páginas de vista previa (WhatsApp, Facebook, Telegram…).
// Estas funciones corren en Vercel. Los robots de WhatsApp no ejecutan JavaScript,
// así que aquí se arma un HTML con las etiquetas og:* y luego se manda a la persona a la app.
export const SUPA_URL = "https://zkydbsymcnnbepvmbchr.supabase.co";
// Clave pública (anon): es la misma que usa la app en el navegador.
export const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4";
export const SITE = "https://epaleapp.online";

export const PAISES = {
  madrid: "España", miami: "USA", bogota: "Colombia", santiago: "Chile", lima: "Perú",
  buenos: "Argentina", quito: "Ecuador", panama: "Panamá", caracas: "Venezuela",
  portugal: "Portugal", italia: "Italia", canada: "Canadá",
};
// Páginas públicas por país: epaleapp.online/<slug>
export const PAGINAS = {
  chile:     { city: "santiago", pais: "Chile",          en: "en Chile",          ciudades: "Santiago, Valparaíso, Concepción, Antofagasta" },
  peru:      { city: "lima",     pais: "Perú",           en: "en Perú",           ciudades: "Lima, Arequipa, Trujillo, Cusco" },
  colombia:  { city: "bogota",   pais: "Colombia",       en: "en Colombia",       ciudades: "Bogotá, Medellín, Cúcuta, Barranquilla, Cali" },
  espana:    { city: "madrid",   pais: "España",         en: "en España",         ciudades: "Madrid, Barcelona, Valencia, Tenerife, Málaga" },
  usa:       { city: "miami",    pais: "Estados Unidos", en: "en Estados Unidos", ciudades: "Miami, Orlando, Houston, Nueva York" },
  argentina: { city: "buenos",   pais: "Argentina",      en: "en Argentina",      ciudades: "Buenos Aires, Córdoba, Mendoza, Rosario" },
  ecuador:   { city: "quito",    pais: "Ecuador",        en: "en Ecuador",        ciudades: "Quito, Guayaquil, Cuenca" },
  panama:    { city: "panama",   pais: "Panamá",         en: "en Panamá",         ciudades: "Ciudad de Panamá, Colón, David" },
  venezuela: { city: "caracas",  pais: "Venezuela",      en: "en Venezuela",      ciudades: "Caracas, Maracaibo, Valencia, Barquisimeto" },
  portugal:  { city: "portugal", pais: "Portugal",       en: "en Portugal",       ciudades: "Lisboa, Oporto, Madeira" },
  italia:    { city: "italia",   pais: "Italia",         en: "en Italia",         ciudades: "Roma, Milán, Turín" },
  canada:    { city: "canada",   pais: "Canadá",         en: "en Canadá",         ciudades: "Toronto, Montreal, Calgary, Vancouver" },
};

export const TIPOS = {
  job: "Trabajo", housing: "Vivienda", service: "Servicio", help: "Ayuda", evento: "Evento",
};

export async function supa(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function recortar(s, n) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

// HTML mínimo: etiquetas para la vista previa + redirección inmediata a la app
// Buscadores y apps que leen la vista previa (no ejecutan la app de Épale)
export const esRobot = (req) =>
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|linkedin|discord|googlebot|google-inspectiontool|googleother|adsbot|bingbot|yandex|duckduck/i
    .test(String(req.headers?.["user-agent"] ?? ""));

// robot = true → página completa con el texto (para Google), sin redirigir.
// robot = false → la persona va directo a la app.
export function pagina({ titulo, descripcion, url, destino, cuerpo = "", robot = false }) {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Épale">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITE}/og-epale.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(descripcion)}">
<meta name="twitter:image" content="${SITE}/og-epale.png">
<link rel="canonical" href="${esc(url)}">
${robot ? "" : `<meta http-equiv="refresh" content="0;url=${esc(destino)}">`}
<style>body{font-family:system-ui,sans-serif;background:#0d0d12;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#ffcc00}</style>
</head><body>
${robot
  ? `<main style="max-width:640px;padding:24px;line-height:1.6"><h1 style="font-size:22px">${esc(titulo)}</h1>${cuerpo ? `<p style="white-space:pre-wrap">${esc(cuerpo)}</p>` : `<p>${esc(descripcion)}</p>`}<p><a href="${esc(destino)}">Ver en Épale</a> · <a href="${SITE}">Épale: la red de los venezolanos en el mundo</a></p></main>`
  : `<p>Abriendo Épale… <a href="${esc(destino)}">toca aquí si no abre</a></p>
<script>location.replace(${JSON.stringify(destino)});</script>`}
</body></html>`;
}

export function enviar(res, html) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
  res.status(200).send(html);
}
