// epaleapp.online/chile, /espana, /usa… → página pública por país, para Google y para la gente.
// Muestra los avisos recientes de venezolanos en ese país (sin los posts automáticos de Pana IA)
// y se actualiza sola cada pocos minutos. Es la misma página para robots y personas.
import { supa, enviar, recortar, SITE, TIPOS, PAGINAS } from "./_comun.js";


const BOT = "Pana IA";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function hace(ts) {
  const d = new Date(ts); if (isNaN(d)) return "";
  const s = Math.max(0, (Date.now() - d) / 1000);
  if (s < 3600) return `hace ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `hace ${Math.floor(s / 86400)} días`;
  return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export default async function handler(req, res) {
  const slug = String(req.query.pais ?? "").toLowerCase();
  const P = PAGINAS[slug];
  if (!P) { res.statusCode = 302; res.setHeader("Location", SITE); return res.end(); }

  const url = `${SITE}/${slug}`;
  const rows = await supa(`posts?city=eq.${P.city}&name=neq.${encodeURIComponent(BOT)}&select=id,name,type,content,created_at&order=created_at.desc&limit=40`);
  const posts = (Array.isArray(rows) ? rows : []).filter((p) => p.content && String(p.content).trim().length > 15);

  const cuenta = {};
  for (const p of posts) if (TIPOS[p.type]) cuenta[p.type] = (cuenta[p.type] ?? 0) + 1;

  const titulo = `Venezolanos ${P.en}: trabajo, cuartos y comunidad | Épale`;
  const descripcion = `Avisos de trabajo, cuartos en alquiler, servicios y eventos publicados por venezolanos ${P.en} (${P.ciudades.split(", ").slice(0, 3).join(", ")}). Chat privado y el dólar del día. Gratis en Épale.`;

  const lista = posts.length
    ? posts.map((p) => `
      <article class="post">
        <div class="meta">${TIPOS[p.type] ? `<span class="tipo">${esc(TIPOS[p.type])}</span>` : ""}<b>${esc(p.name || "Un pana")}</b> · ${esc(hace(p.created_at))}</div>
        <p>${esc(recortar(p.content, 320))}</p>
        <a href="${SITE}/p/${esc(p.id)}">Ver y responder en Épale →</a>
      </article>`).join("")
    : `<p class="vacio">Todavía no hay avisos publicados ${esc(P.en)}. Sé el primero: publicar es gratis y lo ve toda la comunidad venezolana ${esc(P.en)}.</p>`;

  const otros = Object.entries(PAGINAS).filter(([s]) => s !== slug)
    .map(([s, o]) => `<a href="${SITE}/${s}">Venezolanos ${esc(o.en)}</a>`).join(" · ");

  const faq = [
    [`¿Cómo consigo trabajo ${P.en} siendo venezolano?`, `En Épale hay una pestaña para ${P.pais} donde venezolanos y empresas publican ofertas de trabajo. Puedes filtrar por "Trabajo", escribirle directo a quien publicó por chat privado y pedirle a Pana, el asistente con IA de Épale, que te avise cuando salga algo nuevo.`],
    [`¿Cómo busco cuarto o apartamento ${P.en}?`, `Filtra los avisos de "Vivienda" en la pestaña de ${P.pais}. Antes de pagar, nunca deposites sin ver el lugar: puedes pegarle el aviso a Pana y te dice si tiene señales de estafa.`],
    [`¿Épale es gratis?`, `Sí. Registrarte, publicar avisos, chatear y hablar con Pana es gratis. Entras con Google o con tu correo.`],
    [`¿En qué ciudades de ${P.pais} funciona?`, `En todo ${P.pais}: ${P.ciudades} y cualquier otra ciudad. Los avisos indican la zona en el texto.`],
  ];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: titulo, url, description: descripcion, inLanguage: "es",
        isPartOf: { "@type": "WebSite", name: "Épale", url: SITE } },
      { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Épale", item: SITE },
        { "@type": "ListItem", position: 2, name: `Venezolanos ${P.en}`, item: url } ] },
    ],
  };

  const chips = Object.entries(cuenta).map(([t, n]) => `<span>${esc(TIPOS[t])}: ${n}</span>`).join("");

  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Épale">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og-epale.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icon-192.png">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#f4f4f7;color:#15151c;line-height:1.55}
.fr{height:8px;display:flex}.fr i{flex:1}
header{background:#0d0d12;color:#fff;padding:28px 20px 34px}
.wrap{max-width:760px;margin:0 auto}
.logo{font-weight:900;font-size:26px;color:#fff;text-decoration:none;letter-spacing:-.5px}.logo b{color:#ffcc00}
h1{font-size:34px;line-height:1.1;margin:22px 0 10px;letter-spacing:-1px}
header p{opacity:.85;margin:0 0 20px;font-size:17px}
.btn{display:inline-block;background:#ffcc00;color:#15151c;font-weight:800;padding:14px 22px;border-radius:999px;text-decoration:none}
main{padding:24px 20px 40px}
h2{font-size:22px;margin:30px 0 12px;letter-spacing:-.4px}
.chips span{display:inline-block;background:#fff;border:1px solid #e2e2ea;border-radius:999px;padding:5px 12px;margin:0 6px 6px 0;font-size:14px;font-weight:600}
.post{background:#fff;border-radius:16px;padding:16px 18px;margin:0 0 12px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.post p{margin:8px 0;white-space:pre-wrap}.post a{color:#0055dd;font-weight:700;text-decoration:none;font-size:14px}
.meta{font-size:14px;color:#555}.tipo{background:#ffcc00;color:#15151c;font-weight:700;border-radius:6px;padding:1px 7px;margin-right:8px;font-size:12px}
.vacio{background:#fff;border-radius:16px;padding:18px}
ul.feat{padding-left:20px}ul.feat li{margin:6px 0}
details{background:#fff;border-radius:12px;padding:12px 16px;margin:0 0 8px}summary{font-weight:700;cursor:pointer}
.otros{font-size:14px;line-height:2}.otros a{color:#0055dd;text-decoration:none}
footer{text-align:center;font-size:13px;color:#777;padding:0 20px 40px}
</style></head><body>
<div class="fr"><i style="background:#ffcc00"></i><i style="background:#0033a0"></i><i style="background:#cf0a0a"></i></div>
<header><div class="wrap">
  <a class="logo" href="${SITE}">Épale<b>.</b></a>
  <h1>Venezolanos ${esc(P.en)}: trabajo, cuartos y comunidad</h1>
  <p>Los avisos que publican venezolanos ${esc(P.en)} en Épale, la red social gratuita de la diáspora venezolana. ${esc(P.ciudades)} y más.</p>
  <a class="btn" href="${SITE}/">Entrar gratis a Épale →</a>
</div></header>
<main class="wrap">
  <h2>Avisos recientes ${esc(P.en)}</h2>
  ${chips ? `<div class="chips">${chips}</div>` : ""}
  ${lista}
  <h2>Qué encuentras en Épale ${esc(P.en)}</h2>
  <ul class="feat">
    <li><b>Trabajo:</b> ofertas y gente que ofrece sus servicios ${esc(P.en)}.</li>
    <li><b>Vivienda:</b> cuartos y apartamentos publicados por la comunidad.</li>
    <li><b>Chat privado:</b> le escribes a quien publicó sin dar tu número.</li>
    <li><b>Pana, asistente con IA:</b> te busca avisos, te ayuda a escribir el tuyo y revisa si un aviso tiene señales de estafa.</li>
    <li><b>El dólar del día:</b> oficial y paralelo, todas las mañanas.</li>
  </ul>
  <h2>Preguntas frecuentes</h2>
  ${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
  <h2>Venezolanos en otros países</h2>
  <p class="otros">${otros}</p>
  <p style="margin-top:28px"><a class="btn" href="${SITE}/">Publicar un aviso gratis →</a></p>
</main>
<footer>Épale · La red social de los venezolanos en el mundo · <a href="${SITE}">epaleapp.online</a></footer>
</body></html>`;

  enviar(res, html);
}
