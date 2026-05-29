import { useState } from "react";

// ── COLORS ────────────────────────────────────────────────────────
const C = {
  bg:"#f7f5f1", card:"#fff", border:"#e8e2d8",
  yellow:"#ffcc00", blue:"#1a4fa0", red:"#cc2200",
  text:"#1a1a1a", muted:"#888", green:"#1a7a3c",
  wa:"#25D366",
};

// ── CITIES ────────────────────────────────────────────────────────
const CITIES = [
  { id:"madrid",   name:"Madrid",   flag:"🇪🇸", pop:"280K venezolanos" },
  { id:"miami",    name:"Miami",    flag:"🇺🇸", pop:"180K venezolanos" },
  { id:"bogota",   name:"Bogotá",   flag:"🇨🇴", pop:"500K venezolanos" },
  { id:"santiago", name:"Santiago", flag:"🇨🇱", pop:"150K venezolanos" },
  { id:"lima",     name:"Lima",     flag:"🇵🇪", pop:"130K venezolanos" },
  { id:"caracas",  name:"Caracas",  flag:"🇻🇪", pop:"Capital" },
];

const city = (id) => CITIES.find(c=>c.id===id) || CITIES[0];

// ── POST TYPES ────────────────────────────────────────────────────
const TYPES = {
  post:    { label:"Post",     icon:"✏️", badgeBg:null },
  job:     { label:"Trabajo",  icon:"💼", badgeBg:"#ffcc00", badgeFg:"#1a1a1a" },
  housing: { label:"Vivienda", icon:"🏠", badgeBg:"#1a4fa0", badgeFg:"#fff" },
  service: { label:"Servicio", icon:"🔧", badgeBg:"#1a7a3c", badgeFg:"#fff" },
  help:    { label:"Ayuda",    icon:"🤝", badgeBg:"#cc2200",  badgeFg:"#fff" },
};

// ── SEEDED POSTS ─────────────────────────────────────────────────
const SEED = [
  // MADRID
  { id:1,  city:"madrid",   type:"job",     name:"Carlos Méndez",    av:"CM", content:"Restaurante venezolano en Lavapiés busca cocinero con experiencia. Contrato en regla, 1.200 euros/mes + propinas. Escribir al WhatsApp con experiencia previa.", likes:34,   comments:12,  time:"5 min" },
  { id:2,  city:"madrid",   type:"post",    name:"Andreína Soto",    av:"AS", content:"Tres años en Madrid y por fin siento que tengo un hogar aquí. No fue fácil pero tampoco imposible. Para los recién llegados: sí se puede.", likes:189,  comments:47,  time:"18 min" },
  { id:3,  city:"madrid",   type:"housing", name:"Luis Herrera",     av:"LH", content:"Alquilo habitación en piso compartido, zona Carabanchel. 400 euros/mes todo incluido. Ambiente venezolano, muy buen rollo. Solo venezolanos serios.", likes:21,   comments:18,  time:"32 min" },
  { id:4,  city:"madrid",   type:"post",    name:"Mariela Campos",   av:"MC", content:"Alguien sabe dónde consigo harina P.A.N. en Madrid que no cueste un ojo de la cara? Pregunto para un amigo (soy yo, yo soy el amigo).", likes:312,  comments:89,  time:"45 min" },
  { id:5,  city:"madrid",   type:"service", name:"Pedro Rivas",      av:"PR", content:"Abogado venezolano con 8 años en España. Trámites de extranjería, homologación de títulos, NIE, residencia. Primera consulta gratuita.", likes:56,   comments:23,  time:"1h" },
  { id:6,  city:"madrid",   type:"help",    name:"Yolanda Torres",   av:"YT", content:"Llevo dos semanas buscando trabajo en Madrid, tengo carrera en administración y 5 años de experiencia. Si alguien conoce alguna oportunidad se lo agradezco.", likes:67,   comments:34,  time:"1h 20min" },
  { id:7,  city:"madrid",   type:"post",    name:"Roberto Díaz",     av:"RD", content:"El frío de Madrid en invierno me recuerda por qué Venezuela siempre será mi paraíso. Pero este país me ha dado tanto que ya no puedo quejarme. Ambos son casa.", likes:445,  comments:112, time:"2h" },
  { id:8,  city:"madrid",   type:"job",     name:"Empresa VE-ES",    av:"EV", content:"Buscamos 3 repartidores con moto propia en Madrid. Horario flexible, pago semanal. Se valora experiencia pero no es requisito. Venezolanos bienvenidos.", likes:28,   comments:41,  time:"3h" },
  { id:9,  city:"madrid",   type:"service", name:"Génesis Mora",     av:"GM", content:"Servicio de limpieza del hogar y oficinas en Madrid. 4 años de experiencia, referencias disponibles, precios competitivos. Lunes a sábado.", likes:19,   comments:8,   time:"4h" },
  { id:10, city:"madrid",   type:"post",    name:"Freddy Castillo",  av:"FC", content:"Épale todos los venezolanos en Madrid! Vamos a organizar una rumba venezolana este sábado en Usera. Cachapas, caraotas, música de los 2000. Avísenme.", likes:567,  comments:203, time:"5h" },
  // MIAMI
  { id:11, city:"miami",    type:"job",     name:"Alejandra Núñez",  av:"AN", content:"Hair salon en Doral busca estilista venezolana con experiencia. Inglés básico requerido. Excelente comisión más clientela ya establecida.", likes:43,   comments:19,  time:"8 min" },
  { id:12, city:"miami",    type:"post",    name:"Miguel Ángel",     av:"MA", content:"Miami tiene algo que ninguna ciudad tiene: te hace sentir que todo es posible. Llegué con 200 dólares y hoy tengo mi propio negocio.", likes:892,  comments:234, time:"22 min" },
  { id:13, city:"miami",    type:"housing", name:"Carolina Pérez",   av:"CP", content:"Busco roommate venezolana en Doral o Kendall. Cuarto disponible, 750 dólares/mes utilities incluidas. Ambiente tranquilo, no fumadores.", likes:31,   comments:27,  time:"41 min" },
  { id:14, city:"miami",    type:"post",    name:"Daniel Romero",    av:"DR", content:"Doral ya debería llamarse Venezuela Norte. Aquí encuentras arepas, mandoca, chicha, queso de mano... lo único que falta es el calor venezolano de verdad.", likes:1204, comments:345, time:"1h" },
  { id:15, city:"miami",    type:"service", name:"Ing. Vargas",      av:"IV", content:"Ingeniero civil venezolano con licencia en Florida. Inspecciones, planos, permisos. Precios especiales para la comunidad venezolana. 10 años de experiencia.", likes:38,   comments:12,  time:"2h" },
  { id:16, city:"miami",    type:"help",    name:"Sophia Blanco",    av:"SB", content:"Alguien puede recomendarme un buen pediatra venezolano en Doral que acepte Medicaid? Mi niña necesita cita urgente y no sé a quién preguntar.", likes:12,   comments:56,  time:"3h" },
  { id:17, city:"miami",    type:"post",    name:"Valentina Ramos",  av:"VR", content:"5 años en Miami y todavía lloro con el Himno Nacional. La nostalgia nunca se va del todo. Pero hoy mi hija habla inglés y español perfecto. Eso es suficiente.", likes:2341, comments:567, time:"4h" },
  { id:18, city:"miami",    type:"job",     name:"TechVE Miami",     av:"TV", content:"Startup venezolana busca developer React Native. Trabajo remoto, pago en USD. Mínimo 2 años de experiencia. Excelente oportunidad.", likes:87,   comments:34,  time:"5h" },
  { id:19, city:"miami",    type:"post",    name:"Eduardo Suárez",   av:"ES", content:"El mejor consejo que me dieron en Miami: no compares tu capítulo 1 con el capítulo 20 de alguien más. Cada quien tiene su tiempo.", likes:3456, comments:789, time:"6h" },
  { id:20, city:"miami",    type:"service", name:"Contadora Vera",   av:"CV", content:"Contadora venezolana especializada en taxes para inmigrantes. ITIN, declaraciones, LLC para negocios. Hablo español e inglés. Consulta inicial gratis.", likes:67,   comments:28,  time:"7h" },
  // BOGOTÁ
  { id:21, city:"bogota",   type:"post",    name:"Valentina Cruz",   av:"VC", content:"Bogotá tiene 7 millones de personas y yo ya reconozco venezolanos en el metro con solo mirarlos. Algo en la postura, la sonrisa, la manera de saludar.", likes:567,  comments:145, time:"3 min" },
  { id:22, city:"bogota",   type:"job",     name:"Comercio Chapinero",av:"CC", content:"Tienda de ropa en Chapinero busca vendedor. Horario partido, sueldo mínimo más comisión. Venezolanos con documentos en regla. Presentarse en la tarde.", likes:34,   comments:28,  time:"19 min" },
  { id:23, city:"bogota",   type:"post",    name:"Adriana Lozano",   av:"AL", content:"Lo más lindo de Colombia: que la gente te llama mona y mi amor y lo dicen en serio. Venía con miedo y me encontré con calor humano. Gracias Colombia.", likes:3456, comments:890, time:"52 min" },
  { id:24, city:"bogota",   type:"housing", name:"Juan Castellanos",  av:"JC", content:"Subarriendo apartaestudio en Teusaquillo. 600 mil pesos mes, incluye internet. Para persona sola y seria. Venezolanos con carné bienvenidos.", likes:23,   comments:15,  time:"1h" },
  { id:25, city:"bogota",   type:"help",    name:"Familia García",   av:"FG", content:"Venezolana sola con dos niños en Bogotá busca apoyo para trámite de permiso de trabajo. Si alguien conoce abogado que ayude se lo agradezco.", likes:89,   comments:112, time:"2h" },
  { id:26, city:"bogota",   type:"post",    name:"Nelson Pérez",     av:"NP", content:"Somos 500 mil venezolanos en Colombia. La diáspora más grande de Venezuela en el mundo. Organizados somos una fuerza. Desorganizados somos ruido.", likes:4567, comments:1234,time:"3h" },
  { id:27, city:"bogota",   type:"service", name:"Mecánico Salazar", av:"MS", content:"Mecánico venezolano con 15 años de experiencia en taller de Suba. Autos y motos, diagnóstico electrónico, mantenimiento general. Precios justos.", likes:45,   comments:19,  time:"4h" },
  { id:28, city:"bogota",   type:"post",    name:"Diana Morales",    av:"DM", content:"Para los venezolanos que llegan solos a Bogotá: busquen su gente. Hay grupos, comunidad, personas que ya pasaron por lo que están viviendo. No están solos.", likes:6789, comments:1567,time:"5h" },
  // SANTIAGO
  { id:31, city:"santiago", type:"post",    name:"Nathaly Gómez",   av:"NG", content:"Santiago tiene las mejores montañas nevadas de fondo. Cada mañana pienso que Venezuela me dio el alma y Chile me está dando las alas.", likes:234,  comments:67,  time:"11 min" },
  { id:32, city:"santiago", type:"job",     name:"Restaurante Vzla", av:"RV", content:"Buscamos meseros venezolanos con ganas de trabajar en Providencia. Turno completo, propinas excelentes, buen ambiente. Presentarse directamente.", likes:45,   comments:23,  time:"28 min" },
  { id:33, city:"santiago", type:"post",    name:"Raúl Jiménez",    av:"RJ", content:"Hoy me dieron la ciudadanía chilena. Lloré. No porque deje de ser venezolano, sino porque después de tanto sacrificio alguien me dice: bienvenido.", likes:5678, comments:1234,time:"2h" },
  { id:34, city:"santiago", type:"housing", name:"Familia Medina",   av:"FM", content:"Arrendamos depto amoblado en Nunoa, 2 dormitorios. 450 mil pesos todo incluido. Ideal para pareja o dos amigos. Venezolanos tienen prioridad.", likes:34,   comments:19,  time:"3h" },
  { id:35, city:"santiago", type:"post",    name:"Carmen Ríos",     av:"CR", content:"Los chilenos me preguntaban por qué los venezolanos somos tan alegres a pesar de todo. Les dije: porque aprendimos que la felicidad no depende de las circunstancias.", likes:1890, comments:345, time:"4h" },
  // LIMA
  { id:41, city:"lima",     type:"post",    name:"Rafael Mora",     av:"RM", content:"Tres años en Lima. La ciudad que más me ha retado y más me ha hecho crecer. Los peruanos en el fondo son bien buenos.", likes:445,  comments:123, time:"7 min" },
  { id:42, city:"lima",     type:"job",     name:"Empresa Logística",av:"EL", content:"Empresa de logística busca conductores con licencia peruana o en trámite. Venezolanos bienvenidos. Pago puntual, 400 dólares/mes más bonos.", likes:67,   comments:34,  time:"24 min" },
  { id:43, city:"lima",     type:"post",    name:"Luisa Petit",     av:"LP", content:"Hoy le expliqué a una niña peruana qué son las arepas. Sus ojos cuando las probó... eso es lo que hacemos: llevar nuestra cultura con orgullo.", likes:1234, comments:289, time:"1h" },
  { id:44, city:"lima",     type:"housing", name:"Familia Bolivar",  av:"FB", content:"Cuarto disponible en Miraflores con familia venezolana. 250 dólares/mes incluye todo. Muy bien ubicado cerca del Ovalo Gutemberg.", likes:45,   comments:23,  time:"3h" },
  { id:45, city:"lima",     type:"post",    name:"Simón Pacheco",   av:"SP", content:"Cinco palabras para los venezolanos en Lima: ustedes ya son peruanos también. Esta ciudad los adoptó y los quiere aunque a veces no lo parezca.", likes:2345, comments:567, time:"6h" },
  // CARACAS
  { id:51, city:"caracas",  type:"post",    name:"Luis Miguel",     av:"LM", content:"Buenos días desde Caracas. El Ávila amaneció despejado hoy. Para los que están lejos: la ciudad sigue siendo bella aunque esté herida. Siempre lo será.", likes:8901, comments:2345,time:"2 min" },
  { id:52, city:"caracas",  type:"job",     name:"Empresa Digital",  av:"ED", content:"Startup venezolana busca diseñador UX/UI y desarrollador backend. Pago en divisas. Trabajo presencial Las Mercedes. Si quieres quedarte y construir aquí.", likes:234,  comments:89,  time:"25 min" },
  { id:53, city:"caracas",  type:"post",    name:"Gabriela Castro",  av:"GC", content:"Hoy hubo luz todo el día en mi barrio. Eso en Caracas es noticia. A veces la felicidad es corriente eléctrica continua y agua que llega.", likes:12345,comments:3456,time:"48 min" },
  { id:54, city:"caracas",  type:"post",    name:"Profesora Ana",   av:"PA", content:"Doy clases en una escuela pública de Petare. 28 alumnos, ningún libro, tres meses sin sueldo. Sigo yendo porque alguien tiene que ir.", likes:34567,comments:8901,time:"3h" },
  { id:55, city:"caracas",  type:"post",    name:"Juan Pablo",      av:"JP", content:"Para todos los venezolanos en el exterior: Venezuela los espera. No se sabe cuándo pero este país los va a necesitar para reconstruirse. Cuídense.", likes:45678,comments:12345,time:"6h" },
];

const GR = ["linear-gradient(135deg,#ffcc00,#1a4fa0)","linear-gradient(135deg,#1a4fa0,#cc2200)","linear-gradient(135deg,#cc2200,#ffcc00)","linear-gradient(135deg,#1a7a3c,#1a4fa0)","linear-gradient(135deg,#ffcc00,#cc2200)","linear-gradient(135deg,#1a4fa0,#1a7a3c)"];
const Av = ({t="?",i=0,s=40})=><div style={{width:s,height:s,borderRadius:"50%",background:GR[i%GR.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:s*.3,fontWeight:700,color:"#fff",flexShrink:0,fontFamily:"'DM Serif Display',serif"}}>{t}</div>;
const Stripe = ()=><div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>;

// ── WA HELPERS ────────────────────────────────────────────────────
const waSharePost = (post, cityObj) => {
  const txt = post.name + " en Epale " + cityObj.name + ": " + post.content.slice(0,100) + "... Unete: https://epaleapp.online/" + cityObj.id;
  return "https://wa.me/?text=" + encodeURIComponent(txt);
};
const waInviteCity = (cityObj) => {
  const txt = "Epale pana! Estoy en Epale, la red de venezolanos en " + cityObj.name + ". Hay trabajo, vivienda y comunidad. Unete: https://epaleapp.online/" + cityObj.id;
  return "https://wa.me/?text=" + encodeURIComponent(txt);
};
const waJoinGroup = (cityObj) => {
  const txt = "Quiero unirme a la comunidad venezolana de Epale en " + cityObj.name + ". Mi link: https://epaleapp.online/" + cityObj.id;
  return "https://wa.me/?text=" + encodeURIComponent(txt);
};

// ── DAILY HOOK ────────────────────────────────────────────────────
const DailyHook = ({ cityObj, posts }) => {
  const top = posts[0];
  return (
    <div style={{margin:"10px 14px 0",borderRadius:14,overflow:"hidden",border:"1px solid " + C.border}}>
      {/* Dollar */}
      <div style={{background:C.text,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:9,background:"rgba(255,204,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💵</div>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:3}}>DOLAR HOY EN VENEZUELA</div>
          <div style={{display:"flex",gap:14,alignItems:"baseline",flexWrap:"wrap"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.5)"}}>BCV <strong style={{fontSize:17,color:C.yellow,fontFamily:"'DM Serif Display',serif"}}>Bs 36.84</strong></span>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.5)"}}>Paralelo <strong style={{fontSize:17,color:"#7defa0",fontFamily:"'DM Serif Display',serif"}}>Bs 38.20</strong></span>
            <span style={{fontSize:12,color:"#7defa0",fontFamily:"'DM Mono',monospace",fontWeight:700}}>▲ +0.35</span>
          </div>
        </div>
      </div>
      {/* Trending */}
      {top && (
        <div style={{background:C.card,padding:"10px 14px",display:"flex",gap:10,alignItems:"center",borderTop:"1px solid " + C.border}}>
          <span style={{fontSize:16}}>🔥</span>
          <div style={{flex:1}}>
            <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:C.muted,marginRight:6}}>TRENDING EN {cityObj.name.toUpperCase()}:</span>
            <span style={{fontSize:12,color:C.text,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>{top.content.slice(0,60)}...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── VIRAL INVITE BLOCK ────────────────────────────────────────────
const ViralBlock = ({ cityObj, count, onTap }) => (
  <div style={{margin:"10px 14px 0",borderRadius:14,overflow:"hidden",border:"1.5px solid " + C.wa}}>
    <div style={{background:C.wa,padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:20}}>📱</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:"#fff",fontFamily:"'DM Mono',monospace"}}>Invita 3 venezolanos a {cityObj.name}</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontFamily:"'DM Sans',sans-serif"}}>Tu ciudad crece cuando traes a los tuyos</div>
      </div>
    </div>
    <div style={{background:C.card,padding:"12px 16px"}}>
      {/* Progress bar */}
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {[0,1,2].map(i=><div key={i} style={{flex:1,height:5,borderRadius:3,background:i<count?C.wa:C.border,transition:"background 0.3s"}}/>)}
      </div>
      <div style={{fontSize:11,color:C.muted,fontFamily:"'DM Mono',monospace",marginBottom:12,textAlign:"center"}}>
        {count===0&&"Aun no has invitado a nadie — empieza aqui"}
        {count===1&&"1 invitado — faltan 2 mas"}
        {count===2&&"2 invitados — falta 1 mas"}
        {count>=3&&"Meta cumplida! Gracias por hacer crecer Epale"}
      </div>
      {/* CTA 1 — Invite */}
      <a href={waInviteCity(cityObj)} target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",marginBottom:8}} onClick={onTap}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:C.wa,borderRadius:12,cursor:"pointer"}}>
          <span style={{fontSize:22}}>📱</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:"#fff",fontFamily:"'DM Mono',monospace",fontSize:13}}>Invitar por WhatsApp</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontFamily:"'DM Sans',sans-serif"}}>Envia tu link de {cityObj.name} a tus panas</div>
          </div>
          <span style={{color:"rgba(255,255,255,0.7)",fontSize:18}}>→</span>
        </div>
      </a>
      {/* CTA 2 — Join group */}
      <a href={waJoinGroup(cityObj)} target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",background:C.bg,border:"1px solid " + C.border,borderRadius:12,cursor:"pointer"}}>
          <span style={{fontSize:20}}>{cityObj.flag}</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:C.text,fontFamily:"'DM Mono',monospace",fontSize:12}}>Unirme al grupo de {cityObj.name}</div>
            <div style={{fontSize:11,color:C.muted,fontFamily:"'DM Sans',sans-serif"}}>Grupo WhatsApp venezolanos en {cityObj.name}</div>
          </div>
          <span style={{color:C.muted,fontSize:16}}>→</span>
        </div>
      </a>
      {/* Referral link */}
      <div style={{background:C.bg,borderRadius:10,padding:"9px 12px",border:"1px solid " + C.border,display:"flex",alignItems:"center",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:C.muted,letterSpacing:1,marginBottom:2}}>TU LINK DE {cityObj.name.toUpperCase()}</div>
          <div style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:C.blue}}>{"epaleapp.online/" + cityObj.id}</div>
        </div>
        <button onClick={()=>navigator.clipboard?.writeText("https://epaleapp.online/"+cityObj.id)} style={{background:C.yellow,border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:700,color:C.text}}>Copiar</button>
      </div>
    </div>
  </div>
);

// ── POST CARD ─────────────────────────────────────────────────────
const PostCard = ({ post, idx, cityObj }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const t = TYPES[post.type];

  return (
    <div style={{background:C.card,borderBottom:"1px solid " + C.border}}>
      <div style={{padding:"14px 14px 0"}}>
        {/* Badge */}
        {t.badgeBg && <div style={{display:"inline-flex",background:t.badgeBg,borderRadius:20,padding:"3px 10px",marginBottom:8}}><span style={{fontSize:11,fontWeight:700,color:t.badgeFg,fontFamily:"'DM Mono',monospace"}}>{t.icon} {t.label}</span></div>}
        {/* Header */}
        <div style={{display:"flex",gap:10,marginBottom:8}}>
          <Av t={post.av} i={idx} s={40}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontWeight:700,fontSize:14,fontFamily:"'DM Serif Display',serif",color:C.text}}>{post.name}</span>
              <span style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>hace {post.time}</span>
            </div>
            <div style={{fontSize:11,color:C.blue,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{cityObj.flag} {cityObj.name}</div>
          </div>
        </div>
        {/* Content */}
        <p style={{fontSize:14.5,lineHeight:1.65,color:C.text,margin:"0 0 10px",fontFamily:"'DM Sans',sans-serif"}}>{post.content}</p>
        {/* Like + Comment row */}
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          <button onClick={()=>{setLiked(l=>!l);setLikes(l=>liked?l-1:l+1);}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",background:liked?"#fff0f0":C.bg,border:"1px solid "+(liked?"#ffb3b3":C.border),borderRadius:20,cursor:"pointer",color:liked?C.red:C.muted,fontFamily:"'DM Mono',monospace",fontSize:12}}>
            {liked?"❤️":"🤍"} {likes.toLocaleString()}
          </button>
          <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",background:open?"#e8f0fc":C.bg,border:"1px solid "+(open?"#b3c8ff":C.border),borderRadius:20,cursor:"pointer",color:open?C.blue:C.muted,fontFamily:"'DM Mono',monospace",fontSize:12}}>
            💬 {(post.comments+comments.length).toLocaleString()}
          </button>
        </div>
        {/* WHATSAPP SHARE — always visible, full width */}
        <a href={waSharePost(post, cityObj)} target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:C.wa,borderRadius:12,cursor:"pointer",boxShadow:"0 2px 10px rgba(37,211,102,0.25)"}}>
            <span style={{fontSize:20}}>📱</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"#fff",fontFamily:"'DM Mono',monospace"}}>Compartir en WhatsApp</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontFamily:"'DM Sans',sans-serif"}}>Envia este post a tus panas en {cityObj.name}</div>
            </div>
            <span style={{color:"rgba(255,255,255,0.7)",fontSize:16}}>→</span>
          </div>
        </a>
      </div>
      {/* Comments */}
      {open && (
        <div style={{borderTop:"1px solid "+C.border,padding:"10px 14px"}}>
          {comments.map((c,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
              <Av t="Tu" i={0} s={26}/>
              <div style={{background:"#fffbea",borderRadius:10,padding:"5px 10px",flex:1}}>
                <div style={{fontSize:10,fontWeight:700,color:C.yellow,fontFamily:"'DM Mono',monospace"}}>@tu · ahora</div>
                <div style={{fontSize:13,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{c}</div>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:8}}>
            <input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&comment.trim()){setComments(cc=>[...cc,comment]);setComment("");}}} placeholder="Comenta..." style={{flex:1,padding:"8px 12px",background:C.bg,border:"1px solid "+C.border,borderRadius:20,fontFamily:"'DM Sans',sans-serif",fontSize:13,color:C.text,outline:"none"}}/>
            <button onClick={()=>{if(comment.trim()){setComments(cc=>[...cc,comment]);setComment("");}}} style={{background:C.blue,border:"none",borderRadius:"50%",width:34,height:34,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── COMPOSER ──────────────────────────────────────────────────────
const Composer = ({ cityObj, onPost, onClose }) => {
  const [type, setType] = useState("post");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = () => {
    if (!text.trim()) return;
    setLoading(true);
    setTimeout(()=>{
      onPost({ city:cityObj.id, type, name:"Tu", av:"Tu", content:text, likes:0, comments:0, time:"ahora" });
      setLoading(false); onClose();
    }, 600);
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,background:C.card,borderRadius:"22px 22px 0 0",padding:"0 0 36px",animation:"su 0.22s ease"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}><div style={{width:36,height:4,borderRadius:2,background:C.border}}/></div>
        <div style={{padding:"4px 20px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:15,fontFamily:"'DM Serif Display',serif",color:C.text}}>Nueva publicacion</span>
            <span style={{fontSize:12,color:C.blue,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{cityObj.flag} {cityObj.name}</span>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
            {Object.entries(TYPES).map(([id,m])=>(
              <button key={id} onClick={()=>setType(id)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(type===id?C.blue:C.border),background:type===id?C.blue:C.card,color:type===id?"#fff":C.muted,fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Que esta pasando en tu ciudad?" style={{width:"100%",background:C.bg,border:"1.5px solid "+(text?C.blue:C.border),borderRadius:12,padding:"12px 14px",color:C.text,fontFamily:"'DM Sans',sans-serif",fontSize:14,resize:"none",minHeight:100,outline:"none",boxSizing:"border-box",marginBottom:14}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=text?C.blue:C.border}/>
          <button onClick={submit} disabled={!text.trim()} style={{width:"100%",padding:"13px",background:text.trim()?C.yellow:C.border,color:text.trim()?C.text:C.muted,border:"none",borderRadius:14,cursor:text.trim()?"pointer":"not-allowed",fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700}}>
            {loading?"Publicando...":"Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── FEED ─────────────────────────────────────────────────────────
const Feed = ({ userCity, onProfile }) => {
  const [filter, setFilter] = useState("all");
  const [posts, setPosts] = useState(SEED);
  const [showComposer, setShowComposer] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);
  const cityObj = city(userCity);
  const filtered = posts.filter(p=>p.city===userCity&&(filter==="all"||p.type===filter));

  return (
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:C.bg}}>
      {showComposer && <Composer cityObj={cityObj} onPost={p=>setPosts(pp=>[{id:Date.now(),...p},...pp])} onClose={()=>setShowComposer(false)}/>}

      {/* Sticky header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:C.card,boxShadow:"0 1px 8px rgba(0,0,0,0.07)"}}>
        <Stripe/>
        <div style={{padding:"11px 16px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:22,fontFamily:"'DM Serif Display',serif",letterSpacing:-0.5}}>
              <span style={{color:C.yellow}}>E</span><span style={{color:C.blue}}>pa</span><span style={{color:C.red}}>le</span>
              <span style={{fontSize:14,color:C.muted,fontFamily:"'DM Mono',monospace",fontWeight:400,marginLeft:8}}>{cityObj.flag} {cityObj.name}</span>
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{cityObj.pop}</div>
          </div>
          <button onClick={onProfile} style={{background:"none",border:"none",cursor:"pointer"}}><Av t="Tu" i={0} s={34}/></button>
        </div>
        {/* Filter */}
        <div style={{display:"flex",gap:6,padding:"4px 12px 10px",overflowX:"auto"}}>
          <button onClick={()=>setFilter("all")} style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid "+(filter==="all"?C.blue:C.border),background:filter==="all"?C.blue:C.card,color:filter==="all"?"#fff":C.muted,fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Todos</button>
          {Object.entries(TYPES).map(([id,m])=>(
            <button key={id} onClick={()=>setFilter(id)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(filter===id?C.blue:C.border),background:filter===id?C.blue:C.card,color:filter===id?"#fff":C.muted,fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{m.icon} {m.label}</button>
          ))}
        </div>
      </div>

      <div style={{paddingBottom:90}}>
        {/* 1. DAILY HOOK */}
        <DailyHook cityObj={cityObj} posts={filtered}/>

        {/* 2. VIRAL INVITE BLOCK */}
        <ViralBlock cityObj={cityObj} count={inviteCount} onTap={()=>setInviteCount(c=>Math.min(c+1,3))}/>

        {/* City identity banner */}
        <div style={{margin:"10px 14px 0",background:"linear-gradient(135deg,"+C.blue+",#2563eb)",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:30}}>{cityObj.flag}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>Feed de {cityObj.name}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontFamily:"'DM Mono',monospace"}}>{cityObj.pop} · solo tu ciudad</div>
          </div>
          <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"4px 10px"}}>
            <span style={{fontSize:11,color:"#fff",fontFamily:"'DM Mono',monospace",fontWeight:700}}>{filtered.length} posts</span>
          </div>
        </div>

        {/* 3. POSTS — with WA share on every one */}
        <div style={{marginTop:10}}>
          {filtered.length===0
            ? <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}><div style={{fontSize:40,marginBottom:12}}>🌎</div><div style={{fontSize:15,fontFamily:"'DM Sans',sans-serif"}}>Se el primero en publicar</div></div>
            : filtered.map((p,i)=><PostCard key={p.id} post={p} idx={i} cityObj={cityObj}/>)
          }
        </div>
      </div>

      {/* FAB */}
      <button onClick={()=>setShowComposer(true)} style={{position:"fixed",bottom:24,right:"50%",transform:"translateX(50%) translateX(160px)",width:52,height:52,borderRadius:"50%",background:C.yellow,border:"none",cursor:"pointer",fontSize:22,boxShadow:"0 4px 18px rgba(255,204,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
        ✏️
      </button>
    </div>
  );
};

// ── AUTH ──────────────────────────────────────────────────────────
const Auth = ({ onDone }) => {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [chosenCity, setChosenCity] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const DEMO = "4782";

  const s = (p)=>{let x=0;if(p.length>=6)x++;if(p.length>=10)x++;if(/[A-Z]/.test(p))x++;if(/[0-9]/.test(p))x++;return x;};
  const str = s(password);
  const sColor = ["",C.red,C.red,C.yellow,C.green,C.green][str];
  const sLabel = ["","Muy debil","Debil","Regular","Buena","Fuerte"][str];

  const next = () => {
    setError("");
    if(step===1){
      if(!email||!password||!password2){setError("Completa todos los campos");return;}
      if(!/\S+@\S+\.\S+/.test(email)){setError("Correo no valido");return;}
      if(password.length<6){setError("Minimo 6 caracteres");return;}
      if(password!==password2){setError("Las contrasenas no coinciden");return;}
    }
    if(step===2){if(!name||!username){setError("Nombre y usuario requeridos");return;}}
    if(step===3){if(!chosenCity){setError("Selecciona tu ciudad");return;}if(!agreed){setError("Debes aceptar los terminos");return;}}
    setStep(x=>x+1);
  };

  const finish = () => {
    setError("");
    if(verifyCode!==DEMO){setError("Codigo incorrecto");return;}
    setLoading(true);
    setTimeout(()=>{setLoading(false);onDone(chosenCity);},800);
  };

  const loginGo = () => {
    setError("");
    if(!email||!password){setError("Completa todos los campos");return;}
    setLoading(true);
    setTimeout(()=>{setLoading(false);onDone("madrid");},800);
  };

  const inp = (val,set,ph,type="text",right=null) => (
    <div style={{position:"relative"}}>
      <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} type={type} style={{width:"100%",padding:"13px "+(right?"46px":"16px")+" 13px 16px",background:C.card,border:"1.5px solid "+(val?C.blue:C.border),borderRadius:12,color:C.text,fontFamily:"'DM Sans',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=val?C.blue:C.border}/>
      {right}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
      <style>{"@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}"}</style>
      {/* Hero */}
      <div style={{background:C.text,position:"relative",overflow:"hidden"}}>
        <Stripe/>
        <div style={{position:"absolute",top:-50,right:-50,width:200,height:200,borderRadius:"50%",background:"rgba(255,204,0,0.05)"}}/>
        <div style={{position:"relative",padding:"28px 24px 24px",textAlign:"center"}}>
          <div style={{fontSize:50,fontFamily:"'DM Serif Display',serif",letterSpacing:-1,marginBottom:4}}>
            <span style={{color:C.yellow}}>E</span><span style={{color:"#fff"}}>pa</span><span style={{color:C.red}}>le</span>
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace"}}>venezolanos del mundo</div>
          {mode==="register"&&(
            <div style={{marginTop:16,display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:3,borderRadius:2,background:"rgba(255,255,255,0.1)",overflow:"hidden"}}>
                <div style={{height:"100%",width:((step/4)*100)+"%",background:C.yellow,transition:"width 0.4s",borderRadius:2}}/>
              </div>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Mono',monospace"}}>Paso {step}/4</span>
            </div>
          )}
        </div>
      </div>

      {/* Toggle */}
      {(mode==="login"||step===1)&&(
        <div style={{display:"flex",margin:"18px 20px 0",background:C.card,borderRadius:14,padding:4,border:"1px solid "+C.border}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");setStep(1);}} style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",cursor:"pointer",background:mode===m?C.yellow:"transparent",color:mode===m?C.text:C.muted,fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:700,transition:"all 0.2s"}}>
              {m==="login"?"Iniciar sesion":"Crear cuenta"}
            </button>
          ))}
        </div>
      )}

      <div style={{flex:1,padding:"22px 20px 32px",animation:"fi 0.3s ease"}}>
        {/* LOGIN */}
        {mode==="login"&&(<>
          <div style={{fontSize:20,fontFamily:"'DM Serif Display',serif",color:C.text,marginBottom:4}}>Bienvenido de vuelta</div>
          <div style={{fontSize:13,color:C.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:22}}>Entra para conectarte con tu gente</div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:C.muted,marginBottom:7,letterSpacing:1}}>CORREO</div>
            {inp(email,setEmail,"tu@correo.com","email")}
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:C.muted,marginBottom:7,letterSpacing:1}}>CONTRASENA</div>
            {inp(password,setPassword,"Tu contrasena",showPass?"text":"password",
              <button onClick={()=>setShowPass(s=>!s)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>{showPass?"🙈":"👁️"}</button>
            )}
          </div>
          <div style={{textAlign:"right",marginBottom:20}}><button style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontFamily:"'DM Mono',monospace",fontSize:11}}>Olvidaste tu contrasena?</button></div>
          {error&&<div style={{background:"#fff0f0",border:"1px solid #ffb3b3",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:C.red,fontFamily:"'DM Sans',sans-serif"}}>{error}</div>}
          <button onClick={loginGo} style={{width:"100%",padding:"14px",background:C.yellow,color:C.text,border:"none",borderRadius:14,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700,boxShadow:"0 4px 16px rgba(255,204,0,0.4)",marginBottom:12}}>
            {loading?"Entrando...":"Entrar →"}
          </button>
          <button onClick={()=>setMode("register")} style={{width:"100%",padding:"13px",background:C.card,color:C.blue,border:"1.5px solid "+C.blue,borderRadius:14,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700}}>Crear cuenta nueva</button>
        </>)}

        {/* STEP 1 */}
        {mode==="register"&&step===1&&(<>
          <div style={{fontSize:20,fontFamily:"'DM Serif Display',serif",color:C.text,marginBottom:4}}>Crea tu cuenta</div>
          <div style={{fontSize:13,color:C.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:20}}>Tu correo y contrasena</div>
          <div style={{marginBottom:13}}>
            <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:C.muted,marginBottom:7,letterSpacing:1}}>CORREO</div>
            {inp(email,setEmail,"tu@correo.com","email")}
          </div>
          <div style={{marginBottom:13}}>
            <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:C.muted,marginBottom:7,letterSpacing:1}}>CONTRASENA</div>
            {inp(password,setPassword,"Minimo 6 caracteres",showPass?"text":"password",
              <button onClick={()=>setShowPass(s=>!s)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>{showPass?"🙈":"👁️"}</button>
            )}
            {password&&(<><div style={{display:"flex",gap:3,marginTop:7}}>{[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=str?sColor:C.border}}/>)}</div><div style={{fontSize:11,color:sColor,fontFamily:"'DM Mono',monospace",fontWeight:600,marginTop:3}}>{sLabel}</div></>)}
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:C.muted,marginBottom:7,letterSpacing:1}}>CONFIRMAR CONTRASENA</div>
            <div style={{position:"relative"}}>
              <input value={password2} onChange={e=>setPassword2(e.target.value)} type="password" placeholder="Repite tu contrasena" style={{width:"100%",padding:"13px 46px 13px 16px",background:C.card,border:"1.5px solid "+(password2?(password2===password?C.green:C.red):C.border),borderRadius:12,color:C.text,fontFamily:"'DM Sans',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
              {password2&&<span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:15}}>{password2===password?"✅":"❌"}</span>}
            </div>
          </div>
          {error&&<div style={{background:"#fff0f0",border:"1px solid #ffb3b3",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:C.red,fontFamily:"'DM Sans',sans-serif"}}>{error}</div>}
          <button onClick={next} style={{width:"100%",padding:"14px",background:C.yellow,color:C.text,border:"none",borderRadius:14,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700}}>Siguiente →</button>
        </>)}

        {/* STEP 2 */}
        {mode==="register"&&step===2&&(<>
          <div style={{fontSize:20,fontFamily:"'DM Serif Display',serif",color:C.text,marginBottom:4}}>Tu perfil</div>
          <div style={{fontSize:13,color:C.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:20}}>Como te veran otros venezolanos</div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
            <div style={{width:78,height:78,borderRadius:"50%",background:GR[0],display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"#fff",fontFamily:"'DM Serif Display',serif",fontWeight:700,border:"3px solid "+C.yellow}}>
              {name?name[0].toUpperCase():"?"}
            </div>
          </div>
          {[["NOMBRE COMPLETO","Maria Fernanda Garcia",name,setName],["USUARIO (sin espacios)","mariafernanda",username,v=>setUsername(v.toLowerCase().replace(/\s/g,""))]].map(([lbl,ph,val,set],i)=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:C.muted,marginBottom:7,letterSpacing:1}}>{lbl}</div>
              {inp(val,set,ph)}
            </div>
          ))}
          {error&&<div style={{background:"#fff0f0",border:"1px solid #ffb3b3",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:C.red,fontFamily:"'DM Sans',sans-serif"}}>{error}</div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(1)} style={{flex:1,padding:"13px",background:C.card,border:"1.5px solid "+C.border,borderRadius:14,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:13,color:C.muted}}>Atras</button>
            <button onClick={next} style={{flex:2,padding:"13px",background:C.yellow,color:C.text,border:"none",borderRadius:14,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700}}>Siguiente →</button>
          </div>
        </>)}

        {/* STEP 3 — CITY (locked in forever) */}
        {mode==="register"&&step===3&&(<>
          <div style={{fontSize:20,fontFamily:"'DM Serif Display',serif",color:C.text,marginBottom:4}}>Tu ciudad</div>
          <div style={{fontSize:13,color:C.muted,fontFamily:"'DM Sans',sans-serif",marginBottom:6}}>Veras el feed de esta ciudad cada vez que abres Epale</div>
          <div style={{fontSize:11,color:C.blue,fontFamily:"'DM Mono',monospace",marginBottom:16,fontWeight:600}}>Puedes cambiarla despues en configuracion</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {CITIES.map(c=>(
              <button key={c.id} onClick={()=>setChosenCity(c.id)} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:chosenCity===c.id?"#fffbea":C.card,border:"2px solid "+(chosenCity===c.id?C.yellow:C.border),borderRadius:12,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                <span style={{fontSize:26}}>{c.flag}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontFamily:"'DM Serif Display',serif",color:C.text}}>{c.name}</div>
                  <div style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{c.pop}</div>
                </div>
                {chosenCity===c.id&&<span style={{color:C.yellow,fontSize:20,fontWeight:700}}>✓</span>}
              </button>
            ))}
          </div>
          <div onClick={()=>setAgreed(a=>!a)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:C.card,borderRadius:12,border:"1.5px solid "+(agreed?C.green:C.border),cursor:"pointer",marginBottom:16}}>
            <div style={{width:22,height:22,borderRadius:6,border:"2px solid "+(agreed?C.green:C.border),background:agreed?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
              {agreed&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
            </div>
            <div style={{fontSize:12,color:C.muted,fontFamily:"'DM Sans',sans-serif",lineHeight:1.5}}>Acepto los <span style={{color:C.blue,fontWeight:700}}>Terminos</span> y la <span style={{color:C.blue,fontWeight:700}}>Privacidad</span> de Epale</div>
          </div>
          {error&&<div style={{background:"#fff0f0",border:"1px solid #ffb3b3",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:C.red,fontFamily:"'DM Sans',sans-serif"}}>{error}</div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(2)} style={{flex:1,padding:"13px",background:C.card,border:"1.5px solid "+C.border,borderRadius:14,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:13,color:C.muted}}>Atras</button>
            <button onClick={next} style={{flex:2,padding:"13px",background:chosenCity&&agreed?C.yellow:C.border,color:chosenCity&&agreed?C.text:C.muted,border:"none",borderRadius:14,cursor:chosenCity&&agreed?"pointer":"not-allowed",fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700}}>Siguiente →</button>
          </div>
        </>)}

        {/* STEP 4 — Verify */}
        {mode==="register"&&step===4&&(<>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:52,marginBottom:10}}>📧</div>
            <div style={{fontSize:20,fontFamily:"'DM Serif Display',serif",color:C.text,marginBottom:6}}>Verifica tu correo</div>
            <div style={{fontSize:13,color:C.muted,fontFamily:"'DM Sans',sans-serif"}}>Codigo enviado a <strong style={{color:C.text}}>{email}</strong></div>
          </div>
          <input value={verifyCode} onChange={e=>setVerifyCode(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="0000" maxLength={4} style={{width:"100%",padding:"18px",background:C.card,border:"2px solid "+(verifyCode.length===4?(verifyCode===DEMO?C.green:C.red):C.border),borderRadius:14,color:C.text,fontFamily:"'DM Mono',monospace",fontSize:32,fontWeight:700,outline:"none",boxSizing:"border-box",textAlign:"center",letterSpacing:14,marginBottom:10}}/>
          {verifyCode.length===4&&<div style={{textAlign:"center",marginBottom:14,fontSize:12,color:verifyCode===DEMO?C.green:C.red,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{verifyCode===DEMO?"Codigo correcto":"Codigo incorrecto"}</div>}
          <div style={{background:"#fffbea",border:"1px solid rgba(255,204,0,0.3)",borderRadius:12,padding:"9px 14px",marginBottom:18,textAlign:"center"}}>
            <span style={{fontSize:12,color:C.muted,fontFamily:"'DM Mono',monospace"}}>Codigo de prueba: </span>
            <span style={{fontSize:12,color:C.yellow,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{DEMO}</span>
          </div>
          {error&&<div style={{background:"#fff0f0",border:"1px solid #ffb3b3",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:C.red,fontFamily:"'DM Sans',sans-serif"}}>{error}</div>}
          <button onClick={finish} style={{width:"100%",padding:"14px",background:verifyCode.length===4?C.yellow:C.border,color:verifyCode.length===4?C.text:C.muted,border:"none",borderRadius:14,cursor:verifyCode.length===4?"pointer":"not-allowed",fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700,marginBottom:12}}>
            {loading?"Verificando...":"Entrar a Epale"}
          </button>
          <div style={{textAlign:"center",display:"flex",justifyContent:"center",gap:16}}>
            <button onClick={()=>setStep(3)} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600}}>Volver</button>
            <button style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600}}>Reenviar codigo</button>
          </div>
        </>)}
      </div>
    </div>
  );
};

// ── PROFILE ───────────────────────────────────────────────────────
const Profile = ({ userCity, onLogout, onClose }) => {
  const cityObj = city(userCity);
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <Stripe/>
      <div style={{background:C.card,borderBottom:"1px solid "+C.border,marginBottom:10}}>
        <div style={{height:80,background:"linear-gradient(135deg,"+C.yellow+","+C.blue+")"}}/>
        <div style={{padding:"0 20px 20px",position:"relative"}}>
          <div style={{position:"absolute",top:-28,left:20,padding:3,borderRadius:"50%",background:C.card}}>
            <Av t="Tu" i={0} s={60}/>
          </div>
          <div style={{paddingTop:38,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:20,fontFamily:"'DM Serif Display',serif",color:C.text}}>Tu perfil</div>
              <div style={{fontSize:12,color:C.blue,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{cityObj.flag} {cityObj.name}</div>
            </div>
            <button onClick={onClose} style={{padding:"7px 16px",background:C.bg,border:"1.5px solid "+C.border,borderRadius:20,color:C.muted,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11}}>Cerrar</button>
          </div>
        </div>
      </div>
      <div style={{background:C.card,marginBottom:10}}>
        {[["📝","Mis publicaciones"],["❤️","Guardados"],["🔔","Notificaciones"],["⚙️","Configuracion"]].map(([icon,label],i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderBottom:"1px solid "+C.border,cursor:"pointer"}}>
            <div style={{width:36,height:36,borderRadius:9,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{icon}</div>
            <span style={{fontSize:14,color:C.text,fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>{label}</span>
            <span style={{marginLeft:"auto",color:C.muted}}>›</span>
          </div>
        ))}
      </div>
      <div style={{margin:"0 14px 12px"}}>
        <a href={waInviteCity(cityObj)} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}>
          <div style={{background:C.wa,borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22}}>📱</span>
            <div>
              <div style={{fontWeight:700,color:"#fff",fontFamily:"'DM Mono',monospace",fontSize:13}}>Invitar venezolanos a Epale</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontFamily:"'DM Sans',sans-serif"}}>Comparte con tus panas en {cityObj.name}</div>
            </div>
          </div>
        </a>
      </div>
      <div style={{margin:"0 14px 32px"}}>
        <button onClick={onLogout} style={{width:"100%",padding:"13px",background:C.card,border:"1px solid "+C.border,borderRadius:14,color:C.red,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:600}}>Cerrar Sesion</button>
      </div>
    </div>
  );
};

// ── APP ROOT ──────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("auth");
  const [userCity, setUserCity] = useState("madrid");
  const [showProfile, setShowProfile] = useState(false);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;600;700&family=DM+Sans:wght@400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#f7f5f1;color:#1a1a1a;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#e8e2d8;border-radius:2px;}
        @keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      {screen==="auth" && <Auth onDone={(c)=>{setUserCity(c);setScreen("feed");}}/>}
      {screen==="feed" && (<>
        {showProfile && <Profile userCity={userCity} onLogout={()=>{setShowProfile(false);setScreen("auth");}} onClose={()=>setShowProfile(false)}/>}
        <Feed userCity={userCity} onProfile={()=>setShowProfile(true)}/>
      </>)}
    </>
  );
}
