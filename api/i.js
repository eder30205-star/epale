// epaleapp.online/i/<usuario> → "Fulano te invita a Épale" y abre Épale guardando quién invitó.
import { supa, pagina, enviar, SITE } from "./_comun.js";

export default async function handler(req, res) {
  const code = String(req.query.code ?? "").replace(/[^0-9a-zA-Z_.-]/g, "").slice(0, 40);
  const destino = code ? `${SITE}/?ref=${encodeURIComponent(code)}` : SITE;
  const url = `${SITE}/i/${code}`;

  let nombre = null;
  if (code) {
    const rows = await supa(`profiles?username=ilike.${encodeURIComponent(code)}&select=name&limit=1`);
    nombre = Array.isArray(rows) && rows[0]?.name ? rows[0].name : null;
  }
  const titulo = nombre ? `${nombre} te invita a Épale 🇻🇪` : "Te invitaron a Épale 🇻🇪";
  const descripcion = "La red de los venezolanos en el mundo: trabajo, vivienda, el dólar del día y tu gente en tu país. Gratis.";
  enviar(res, pagina({ titulo, descripcion, url, destino }));
}
