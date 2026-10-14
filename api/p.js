// epaleapp.online/p/<id> → vista previa del post en WhatsApp y luego abre el post en Épale.
import { supa, pagina, enviar, recortar, PAISES, TIPOS, SITE } from "./_comun.js";

export default async function handler(req, res) {
  const id = String(req.query.id ?? "").replace(/[^0-9a-zA-Z-]/g, "").slice(0, 64);
  const destino = id ? `${SITE}/?post=${encodeURIComponent(id)}` : SITE;
  const url = `${SITE}/p/${id}`;

  let titulo = "Épale — la red de los venezolanos en el mundo 🇻🇪";
  let descripcion = "Avisos de trabajo, vivienda y servicios de venezolanos en tu país. Gratis.";

  const rows = id ? await supa(`posts?id=eq.${encodeURIComponent(id)}&select=name,city,type,content&limit=1`) : null;
  const post = Array.isArray(rows) ? rows[0] : null;
  if (post) {
    const pais = PAISES[post.city] ?? "";
    const tipo = TIPOS[post.type];
    titulo = tipo
      ? `${tipo}${pais ? " en " + pais : ""} · ${post.name || "Épale"}`
      : `${post.name || "Un pana"}${pais ? " desde " + pais : ""} en Épale 🇻🇪`;
    descripcion = recortar(post.content, 190);
  }
  enviar(res, pagina({ titulo, descripcion, url, destino }));
}
