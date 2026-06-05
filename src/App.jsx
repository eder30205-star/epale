import { useState, useEffect } from "react";
import React from "react";

const SUPA_URL = "https://zkydbsymcnnbepvmbchr.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4";

var getToken = function(){ return window._supaToken || SUPA_KEY; };

var api = {
  signUp: function(email, password, name, city, username) {
    return fetch(SUPA_URL+"/auth/v1/signup", {
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
      body:JSON.stringify({email:email, password:password, data:{name:name, city:city, username:username}})
    }).then(function(r){return r.json();}).then(function(res){
      if(res.access_token || (res.session && res.session.access_token)) return res;
      return fetch(SUPA_URL+"/auth/v1/token?grant_type=password", {
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
        body:JSON.stringify({email:email, password:password})
      }).then(function(r){return r.json();});
    });
  },
  signIn: function(email, password) {
    return fetch(SUPA_URL+"/auth/v1/token?grant_type=password", {
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
      body:JSON.stringify({email:email, password:password})
    }).then(function(r){return r.json();});
  },
  upsertProfile: function(id, name, city, username) {
    return fetch(SUPA_URL+"/rest/v1/profiles", {
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken(),"Prefer":"resolution=merge-duplicates"},
      body:JSON.stringify({id:id, name:name, city:city, username:username})
    }).then(function(r){return r.json();});
  },
  getProfile: function(id) {
    return fetch(SUPA_URL+"/rest/v1/profiles?id=eq."+id+"&select=*", {
      headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}
    }).then(function(r){return r.json();});
  },
  getPosts: function(city) {
    return fetch(SUPA_URL+"/rest/v1/posts?city=eq."+city+"&select=*,profiles(name,photo_url,username)&order=created_at.desc&limit=50", {
      headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}
    }).then(function(r){return r.json();});
  },
  createPost: function(userId, city, type, content) {
    return fetch(SUPA_URL+"/rest/v1/posts", {
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken(),"Prefer":"return=representation"},
      body:JSON.stringify({user_id:userId, city:city, type:type, content:content})
    }).then(function(r){return r.json();});
  }
};

const LIGHT = { bg:"#f5f5f7", card:"#ffffff", border:"#e8e8ed", yellow:"#ffcc00", blue:"#0066ff", red:"#ff2d2d", text:"#1a1a1a", muted:"#86868b", green:"#1a7a3c", wa:"#25D366" };
const DARK  = { bg:"#0d0d0d", card:"#1c1c1e", border:"#2c2c2e", yellow:"#ffcc00", blue:"#0a84ff", red:"#ff453a", text:"#f2f2f7", muted:"#636366", green:"#32d74b", wa:"#25D366" };

var ICONS = {
  heart: "\u2764\uFE0F",
  heartEmpty: "\uD83E\uDD0D",
  comment: "\uD83D\uDCAC",
  bookmark: "\uD83D\uDD16",
  phone: "\uD83D\uDCF1",
  dollar: "\uD83D\uDCB5",
  fire: "\uD83D\uDD25",
  pencil: "\u270F\uFE0F",
  briefcase: "\uD83D\uDCBC",
  house: "\uD83C\uDFE0",
  wrench: "\uD83D\uDD27",
  handshake: "\uD83E\uDD1D",
  bell: "\uD83D\uDD14",
  gear: "\u2699\uFE0F",
  eye: "\uD83D\uDC41\uFE0F",
  photo: "\uD83D\uDDBC\uFE0F",
  video: "\uD83C\uDFAC",
  camera: "\uD83D\uDCF7",
  notepad: "\uD83D\uDCDD",
  check: "\u2705",
  key: "\uD83D\uDD11",
  email: "\uD83D\uDCE7",
  group: "\uD83D\uDC65",
  flag_ve: "\uD83C\uDDFB\uD83C\uDDEA",
  share: "\u2197\uFE0F",
  like_on: "\u2764\uFE0F",
  like_off: "\uD83E\uDD0D",
};

var _theme = LIGHT;
var C = LIGHT;

const CITIES = [
  { id:"madrid",    name:"Madrid",     flag:"ES", pop:"280K venezolanos" },
  { id:"miami",     name:"Miami",      flag:"US", pop:"180K venezolanos" },
  { id:"orlando",   name:"Orlando",    flag:"US", pop:"45K venezolanos"  },
  { id:"houston",   name:"Houston",    flag:"US", pop:"60K venezolanos"  },
  { id:"bogota",    name:"Bogota",     flag:"CO", pop:"500K venezolanos" },
  { id:"medellin",  name:"Medellin",   flag:"CO", pop:"80K venezolanos"  },
  { id:"santiago",  name:"Santiago",   flag:"CL", pop:"150K venezolanos" },
  { id:"lima",      name:"Lima",       flag:"PE", pop:"130K venezolanos" },
  { id:"buenos",    name:"Bs. Aires",  flag:"AR", pop:"90K venezolanos"  },
  { id:"quito",     name:"Quito",      flag:"EC", pop:"70K venezolanos"  },
  { id:"panama",    name:"Panama",     flag:"PA", pop:"55K venezolanos"  },
  { id:"caracas",   name:"Caracas",    flag:"VE", pop:"Capital"          },
];
const CITY_FLAGS = { madrid:"ES", miami:"US", orlando:"US", houston:"US", bogota:"CO", medellin:"CO", santiago:"CL", lima:"PE", buenos:"AR", quito:"EC", panama:"PA", caracas:"VE" };
const toFlag = function(code) {
  if(!code) return "";
  var a = code.toUpperCase().charCodeAt(0) - 65 + 127462;
  var b = code.toUpperCase().charCodeAt(1) - 65 + 127462;
  return String.fromCodePoint(a) + String.fromCodePoint(b);
};
const getCity = function(id){ return CITIES.find(function(c){ return c.id===id; }) || CITIES[0]; };

const TYPES = {
  post:    { label:"Post",     icon:ICONS.pencil,  badgeBg:null },
  job:     { label:"Trabajo",  icon:ICONS.briefcase,  badgeBg:"#ffcc00", badgeFg:"#1a1a1a" },
  housing: { label:"Vivienda", icon:ICONS.house,  badgeBg:"#1a4fa0", badgeFg:"#fff" },
  service: { label:"Servicio", icon:ICONS.wrench,  badgeBg:"#1a7a3c", badgeFg:"#fff" },
  help:    { label:"Ayuda",    icon:ICONS.handshake,  badgeBg:"#cc2200", badgeFg:"#fff" },
};

const GR = ["linear-gradient(135deg,#ffcc00,#1a4fa0)","linear-gradient(135deg,#1a4fa0,#cc2200)","linear-gradient(135deg,#cc2200,#ffcc00)","linear-gradient(135deg,#1a7a3c,#1a4fa0)","linear-gradient(135deg,#ffcc00,#cc2200)","linear-gradient(135deg,#1a4fa0,#1a7a3c)"];

const SEED = [
  { id:1,  city:"madrid",   type:"job",     name:"Carlos Mendez",    av:"CM", content:"Restaurante venezolano en Lavapies busca cocinero con experiencia. Contrato en regla, 1.200 euros/mes. Escribir al WhatsApp.", likes:34,   comments:12, time:"5 min" },
  { id:2,  city:"madrid",   type:"post",    name:"Andreina Soto",    av:"AS", content:"Tres anos en Madrid y por fin siento que tengo un hogar aqui. No fue facil pero tampoco imposible. Para los recien llegados: si se puede.", likes:189,  comments:47, time:"18 min" },
  { id:3,  city:"madrid",   type:"housing", name:"Luis Herrera",     av:"LH", content:"Alquilo habitacion en piso compartido, zona Carabanchel. 400 euros/mes todo incluido. Ambiente venezolano.", likes:21,   comments:18, time:"32 min" },
  { id:4,  city:"madrid",   type:"post",    name:"Mariela Campos",   av:"MC", content:"Alguien sabe donde consigo harina PAN en Madrid que no cueste un ojo de la cara? Pregunto para un amigo (soy yo).", likes:312,  comments:89, time:"45 min" },
  { id:5,  city:"madrid",   type:"service", name:"Pedro Rivas",      av:"PR", content:"Abogado venezolano con 8 anos en Espana. Tramites de extranjeria, NIE, residencia. Primera consulta gratuita.", likes:56,   comments:23, time:"1h" },
  { id:6,  city:"madrid",   type:"help",    name:"Yolanda Torres",   av:"YT", content:"Llevo dos semanas buscando trabajo en Madrid, tengo carrera en administracion y 5 anos de experiencia. Agradezco cualquier oportunidad.", likes:67,   comments:34, time:"2h" },
  { id:7,  city:"madrid",   type:"post",    name:"Roberto Diaz",     av:"RD", content:"El frio de Madrid en invierno me recuerda por que Venezuela siempre sera mi paraiso. Pero este pais me ha dado tanto.", likes:445,  comments:112, time:"3h" },
  { id:8,  city:"madrid",   type:"post",    name:"Freddy Castillo",  av:"FC", content:"Vamos a organizar una rumba venezolana este sabado en Usera. Cachapas, caraotas, musica de los 2000. Avisense!", likes:567,  comments:203, time:"4h" },
  { id:9,  city:"miami",    type:"post",    name:"Miguel Angel",     av:"MA", content:"Miami tiene algo que ninguna ciudad tiene: te hace sentir que todo es posible. Llegue con poco y hoy tengo mi propio negocio.", likes:892,  comments:234, time:"22 min" },
  { id:10, city:"miami",    type:"job",     name:"Alejandra Nunez",  av:"AN", content:"Hair salon en Doral busca estilista venezolana con experiencia. Excelente comision mas clientela establecida.", likes:43,   comments:19, time:"41 min" },
  { id:11, city:"miami",    type:"housing", name:"Carolina Perez",   av:"CP", content:"Busco roommate venezolana en Doral o Kendall. Cuarto disponible, 750 dolares/mes utilities incluidas.", likes:31,   comments:27, time:"1h" },
  { id:12, city:"miami",    type:"post",    name:"Daniel Romero",    av:"DR", content:"Doral ya deberia llamarse Venezuela Norte. Aqui encuentras arepas, mandoca, chicha... lo unico que falta es el calor de verdad.", likes:1204, comments:345, time:"2h" },
  { id:13, city:"miami",    type:"post",    name:"Valentina Ramos",  av:"VR", content:"5 anos en Miami y todavia lloro con el Himno Nacional. La nostalgia nunca se va del todo. Pero hoy mi hija habla ingles y espanol perfecto.", likes:2341, comments:567, time:"4h" },
  { id:14, city:"bogota",   type:"post",    name:"Valentina Cruz",   av:"VC", content:"Bogota tiene 7 millones de personas y yo ya reconozco venezolanos en el metro con solo mirarlos. Algo en la sonrisa, la manera de saludar.", likes:567,  comments:145, time:"3 min" },
  { id:15, city:"bogota",   type:"job",     name:"Comercio Chapinero",av:"CC", content:"Tienda de ropa en Chapinero busca vendedor. Horario partido, sueldo minimo mas comision. Venezolanos bienvenidos.", likes:34,   comments:28, time:"19 min" },
  { id:16, city:"bogota",   type:"post",    name:"Nelson Perez",     av:"NP", content:"Somos 500 mil venezolanos en Colombia. La diaspora mas grande. Organizados somos una fuerza. Desorganizados somos ruido.", likes:4567, comments:1234, time:"3h" },
  { id:17, city:"bogota",   type:"post",    name:"Diana Morales",    av:"DM", content:"Para los venezolanos que llegan solos a Bogota: busquen su gente. Hay grupos, comunidad, personas que ya pasaron por lo mismo.", likes:6789, comments:1567, time:"5h" },
  { id:18, city:"santiago", type:"post",    name:"Nathaly Gomez",    av:"NG", content:"Santiago tiene las mejores montanas nevadas de fondo. Venezuela me dio el alma y Chile me esta dando las alas.", likes:234,  comments:67, time:"11 min" },
  { id:19, city:"santiago", type:"post",    name:"Raul Jimenez",     av:"RJ", content:"Hoy me dieron la ciudadania chilena. Llore. No porque deje de ser venezolano, sino porque despues de tanto sacrificio alguien dice: bienvenido.", likes:5678, comments:1234, time:"2h" },
  { id:20, city:"lima",     type:"post",    name:"Rafael Mora",      av:"RM", content:"Tres anos en Lima. La ciudad que mas me ha retado y mas me ha hecho crecer. Los peruanos en el fondo son bien buenos.", likes:445,  comments:123, time:"7 min" },
  { id:21, city:"lima",     type:"post",    name:"Simon Pacheco",    av:"SP", content:"Cinco palabras para los venezolanos en Lima: ustedes ya son peruanos tambien. Esta ciudad los adopto.", likes:2345, comments:567, time:"5h" },
  { id:22, city:"caracas",  type:"post",    name:"Luis Miguel",      av:"LM", content:"Buenos dias desde Caracas. El Avila amanecio despejado hoy. Para los que estan lejos: la ciudad sigue siendo bella aunque este herida.", likes:8901, comments:2345, time:"2 min" },
  { id:23, city:"caracas",  type:"post",    name:"Gabriela Castro",  av:"GC", content:"Hoy hubo luz todo el dia en mi barrio. Eso en Caracas es noticia. A veces la felicidad es corriente electrica continua.", likes:12345,comments:3456, time:"48 min" },
  { id:24, city:"caracas",  type:"post",    name:"Profesora Ana",    av:"PA", content:"Doy clases en escuela publica de Petare. 28 alumnos, ningun libro, tres meses sin sueldo. Sigo yendo porque alguien tiene que ir.", likes:34567,comments:8901, time:"3h" },
  { id:25, city:"orlando",  type:"post",    name:"Maria Garcia",     av:"MG", content:"Orlando tiene algo especial para los venezolanos. La comunidad aqui es muy unida y siempre hay alguien que te ayuda cuando llegas.", likes:234,  comments:67, time:"15 min" },
  { id:26, city:"orlando",  type:"job",     name:"Empresa VE-FL",    av:"EV", content:"Buscamos repartidores en Orlando area. Horario flexible, pago semanal. Venezolanos bienvenidos, no requiere experiencia.", likes:45,   comments:23, time:"1h" },
];

const SAMPLE_USERS = [
  { name:"Carlos Mendez",  av:"CM", city:"madrid",   bio:"Maracucho en Madrid" },
  { name:"Andreina Lopez", av:"AL", city:"miami",    bio:"Caraquena en Miami" },
  { name:"Jose Rodriguez", av:"JR", city:"santiago", bio:"Del Zulia para el mundo" },
  { name:"Valentina Cruz", av:"VC", city:"bogota",   bio:"Venezolana en Colombia" },
  { name:"Rafael Mora",    av:"RM", city:"lima",     bio:"Tres anos en Lima" },
];

const waShare = function(post, cityId) {
  var txt = post.name + " en Epale " + cityId + ": " + post.content.slice(0,100) + "... Unete: https://epaleapp.online/" + cityId;
  return "https://wa.me/?text=" + encodeURIComponent(txt);
};
const waInvite = function(cityId) {
  var txt = "Epale pana! Estoy en Epale, la red de venezolanos en " + cityId + ". Unete: https://epaleapp.online/" + cityId;
  return "https://wa.me/?text=" + encodeURIComponent(txt);
};


var formatTime = function(ts) {
  if(!ts) return "";
  if(typeof ts === "string" && !ts.includes("T")) return ts;
  var d = new Date(ts);
  if(isNaN(d.getTime())) return ts;
  var now = new Date();
  var diff = Math.floor((now - d) / 1000);
  if(diff < 60) return "ahora";
  if(diff < 3600) return Math.floor(diff/60)+"m";
  if(diff < 86400) return Math.floor(diff/3600)+"h";
  if(diff < 604800) return Math.floor(diff/86400)+"d";
  return d.getDate()+"/"+(d.getMonth()+1)+"/"+d.getFullYear();
};

function Av(props) {
  var t=props.t||"?", i=props.i||0, s=props.s||40, photo=props.photo;
  var letter = t ? t[0].toUpperCase() : "?";
  if(photo) return <div style={{width:s,height:s,borderRadius:9999,overflow:"hidden",flexShrink:0,border:"2px solid #fff"}}><img src={photo} alt="av" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>;
  return <div style={{width:s,height:s,borderRadius:9999,background:GR[i%GR.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:s*0.38,fontWeight:700,color:"#fff",flexShrink:0,fontFamily:"'Syne',sans-serif"}}>{letter}</div>;
}

function Stripe() {
  return <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>;
}

function PostCard(props) {
  var post=props.post, idx=props.idx, cityObj=props.cityObj, saved=props.saved, onSave=props.onSave, following=props.following||[], onFollow=props.onFollow, userName=props.userName||"";
  var [liked,setLiked]=useState(false);
  var [likes,setLikes]=useState(post.likes);
  var [open,setOpen]=useState(false);
  var [comment,setComment]=useState("");
  var [comments,setComments]=useState([]);
  var [showMenu,setShowMenu]=useState(false);
  var [blocked,setBlocked]=useState(false);
  var [showFlag,setShowFlag]=useState(false);
  var [flagDone,setFlagDone]=useState(false);
  var t = TYPES[post.type] || TYPES.post;

  var sendComment = function() {
    if(comment.trim()){ setComments(function(c){return c.concat([comment]);}); setComment(""); }
  };

  return (
    <div style={{background:blocked?"#f9f9f9":C.card,borderBottom:"1px solid "+C.border,opacity:blocked?0.6:1}}>
      {blocked ? (
        <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Contenido oculto.</span>
          <button onClick={function(){setBlocked(false);}} style={{background:"none",border:"1px solid "+C.border,borderRadius:100,padding:"5px 14px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:11,color:C.blue,fontWeight:600}}>Desbloquear</button>
        </div>
      ) : (
        <div style={{padding:"14px 14px 0"}}>
          {t.badgeBg ? <div style={{display:"inline-flex",background:t.badgeBg,borderRadius:20,padding:"3px 10px",marginBottom:8}}><span style={{fontSize:11,fontWeight:700,color:t.badgeFg,fontFamily:"'Inter',sans-serif"}}>{t.icon} {t.label}</span></div> : null}
          <div style={{display:"flex",gap:12,marginBottom:10}}>
            <Av t={post.av} i={idx} s={42}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:15,fontFamily:"'Syne',sans-serif",color:C.text}}>{post.name}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {post.name !== "Tu" && post.name !== userName && onFollow ? (
                    <button onClick={function(){onFollow(post.name);}} style={{padding:"4px 12px",borderRadius:100,border:"1.5px solid "+(following.includes(post.name)?C.border:C.blue),background:"transparent",color:following.includes(post.name)?C.muted:C.blue,fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                      {following.includes(post.name)?"Siguiendo":"Seguir"}
                    </button>
                  ) : null}
                  <button onClick={function(){setShowMenu(function(m){return !m;});}} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:18,padding:"0 4px"}}>...</button>
                </div>
              </div>
              <div style={{fontSize:11,color:C.blue,fontFamily:"'Inter',sans-serif",fontWeight:600,marginTop:1}}>{cityObj ? cityObj.flag : ""} {cityObj ? cityObj.name : ""} <span style={{color:C.muted,fontWeight:400}}>- {formatTime(post.time||post.created_at)}</span></div>
            </div>
          </div>

          {showMenu ? (
            <div style={{background:C.bg,borderRadius:12,border:"1px solid "+C.border,marginBottom:10,overflow:"hidden"}}>
              {post.name !== "Tu" && post.name !== userName && onFollow ? (
                <button onClick={function(){onFollow(post.name);setShowMenu(false);}} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:"1px solid "+C.border,cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",fontSize:14,color:C.text,display:"flex",alignItems:"center",gap:10}}>
                  <span>{following.includes(post.name)?"Dejar de seguir":"Seguir"}</span>
                </button>
              ) : null}
              {post.name !== "Tu" && post.name !== userName ? (
                <button onClick={function(){setBlocked(true);setShowMenu(false);}} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:"1px solid "+C.border,cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",fontSize:14,color:C.red,display:"flex",alignItems:"center",gap:10}}>
                  <span>Bloquear usuario</span>
                </button>
              ) : null}
              <button onClick={function(){setShowFlag(true);setShowMenu(false);}} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:"1px solid "+C.border,cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",fontSize:14,color:C.red,display:"flex",alignItems:"center",gap:10}}>
                <span>Reportar publicacion</span>
              </button>
              <button onClick={function(){setShowMenu(false);}} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",fontSize:14,color:C.muted}}>Cancelar</button>
            </div>
          ) : null}

          {showFlag ? (
            <div style={{background:C.bg,borderRadius:12,border:"1px solid "+C.border,marginBottom:10,padding:"14px 16px"}}>
              {flagDone ? (
                <div style={{textAlign:"center",padding:"10px 0"}}>
                  <div style={{fontSize:32,marginBottom:8}}>{ICONS.check}</div>
                  <div style={{fontSize:14,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:4}}>Reporte enviado</div>
                  <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:12}}>Revisaremos en menos de 24 horas</div>
                  <button onClick={function(){setShowFlag(false);setFlagDone(false);}} style={{padding:"8px 20px",background:C.blue,color:"#fff",border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:700}}>Listo</button>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:14,fontWeight:700,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:12}}>Reportar publicacion</div>
                  {["Contenido sexual o inapropiado","Acoso o bullying","Discurso de odio","Informacion falsa","Spam o publicidad","Otro motivo"].map(function(r,i){
                    return (
                      <button key={i} onClick={function(){setFlagDone(true);}} style={{width:"100%",padding:"10px 0",background:"none",border:"none",borderBottom:"1px solid "+C.border,cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",fontSize:13,color:C.text,display:"block",marginBottom:2}}>
                        {r}
                      </button>
                    );
                  })}
                  <button onClick={function(){setShowFlag(false);}} style={{marginTop:8,padding:"6px 14px",background:"none",border:"1px solid "+C.border,borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,color:C.muted}}>Cancelar</button>
                </div>
              )}
            </div>
          ) : null}

          <p style={{fontSize:15,lineHeight:1.6,color:C.text,margin:"0 0 12px",fontFamily:"'Inter',sans-serif"}}>{post.content}</p>

          {post.media ? (
            <div style={{borderRadius:12,overflow:"hidden",marginBottom:10,border:"1px solid "+C.border}}>
              {post.media.kind === "image" ? <img src={post.media.src} alt="post" style={{width:"100%",maxHeight:280,objectFit:"cover",display:"block"}}/> : <video src={post.media.src} controls style={{width:"100%",maxHeight:280,display:"block"}}/>}
            </div>
          ) : null}

          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <button onClick={function(){setLiked(function(l){return !l;}); setLikes(function(l){return liked?l-1:l+1;});}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",background:liked?"#fff0f0":C.bg,border:"1px solid "+(liked?"#ffb3b3":C.border),borderRadius:100,cursor:"pointer",color:liked?C.red:C.muted,fontFamily:"'Inter',sans-serif",fontSize:12}}>
              {liked?ICONS.like_on:ICONS.like_off} {likes.toLocaleString()}
            </button>
            <button onClick={function(){setOpen(function(o){return !o;});}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",background:open?"#e8f0fc":C.bg,border:"1px solid "+(open?"#b3c8ff":C.border),borderRadius:100,cursor:"pointer",color:open?C.blue:C.muted,fontFamily:"'Inter',sans-serif",fontSize:12}}>
               {ICONS.comment} {(post.comments+comments.length).toLocaleString()}
            </button>
            <button onClick={function(){if(onSave) onSave(post.id);}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",background:saved?"#fffbea":C.bg,border:"1px solid "+(saved?"#ffe066":C.border),borderRadius:100,cursor:"pointer",color:saved?C.yellow:C.muted,fontFamily:"'Inter',sans-serif",fontSize:12,marginLeft:"auto"}}>
               {saved?"Guardado":"Guardar"}
            </button>
          </div>

          <a href={waShare(post, cityObj ? cityObj.id : "ve")} target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:C.wa,borderRadius:12,cursor:"pointer"}}>
              <span style={{fontSize:20}}>{ICONS.phone}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif"}}>Compartir en WhatsApp</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontFamily:"'Inter',sans-serif"}}>Envia este post a tus panas</div>
              </div>
              <span style={{color:"rgba(255,255,255,0.7)",fontSize:16}}>{"->"}</span>
            </div>
          </a>
        </div>
      )}

      {open && !blocked ? (
        <div style={{borderTop:"1px solid "+C.border,padding:"10px 14px"}}>
          {comments.map(function(c,i){
            return (
              <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                <Av t="Tu" i={0} s={26}/>
                <div style={{background:"#fffbea",borderRadius:10,padding:"5px 10px",flex:1}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.yellow,fontFamily:"'Inter',sans-serif"}}>@tu</div>
                  <div style={{fontSize:13,color:C.text,fontFamily:"'Inter',sans-serif"}}>{c}</div>
                </div>
              </div>
            );
          })}
          <div style={{display:"flex",gap:8}}>
            <input value={comment} onChange={function(e){setComment(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter") sendComment();}} placeholder="Comenta..." style={{flex:1,padding:"8px 12px",background:C.bg,border:"1px solid "+C.border,borderRadius:20,fontFamily:"'Inter',sans-serif",fontSize:13,color:C.text,outline:"none"}}/>
            <button onClick={sendComment} style={{background:C.blue,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>^</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Feed(props) {
  var userCity=props.userCity, onProfile=props.onProfile, userPhoto=props.userPhoto, userName=props.userName||"Tu";
  var userId=props.userId||null;
  var [filter,setFilter]=useState("all");
  var [posts,setPosts]=useState(SEED);
  var [showComposer,setShowComposer]=useState(false);
  var [inviteCount,setInviteCount]=useState(0);
  var [activeCity,setActiveCity]=useState(userCity);
  var [savedPosts,setSavedPosts]=useState([]);
  var [feedTab,setFeedTab]=useState("forYou");
  var following=props.following||[];
  var toggleFollow=props.onFollow||function(){};
  var [copiedRef,setCopiedRef]=useState(false);
  var [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(function(){
    setPosts(SEED);
    if(window._supaToken) {
      api.getPosts(userCity).then(function(data) {
        if(Array.isArray(data) && data.length > 0) {
          var mapped = data.map(function(p) {
            return {id:p.id, city:p.city, type:p.type||"post", name:(p.profiles&&p.profiles.name)||"Anonimo", av:(p.profiles&&p.profiles.name)||"?", content:p.content, likes:p.likes||0, comments:p.comments||0, time:"reciente"};
          });
          setPosts(mapped.concat(SEED));
        }
      }).catch(function(){});
    }
  }, []);

  useEffect(function(){
    var handler = function(){ setIsMobile(window.innerWidth < 768); };
    window.addEventListener("resize", handler);
    return function(){ window.removeEventListener("resize", handler); };
  }, []);

  var cityObj = getCity(activeCity);
  var refLink = "https://epaleapp.online/"+activeCity;

  var cityButtons = CITIES.map(function(c){
    return (
      <button key={c.id} onClick={function(){setActiveCity(c.id);}} style={{padding:"5px 12px",borderRadius:100,border:"1.5px solid "+(activeCity===c.id?C.blue:C.border),background:activeCity===c.id?C.blue:C.card,color:activeCity===c.id?"#fff":C.muted,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
        {toFlag(CITY_FLAGS[c.id])} {c.name}
      </button>
    );
  });

  var typeButtons = Object.entries(TYPES).map(function(entry){
    var id=entry[0], m=entry[1];
    return (
      <button key={id} onClick={function(){setFilter(id);}} style={{padding:"5px 12px",borderRadius:100,border:"1.5px solid "+(filter===id?C.blue:C.border),background:filter===id?C.blue:C.card,color:filter===id?"#fff":C.muted,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
        {m.icon} {m.label}
      </button>
    );
  });

  var tabButtons = [["forYou","Para ti"],["following","Siguiendo"]].map(function(item){
    var id=item[0], label=item[1];
    return (
      <button key={id} onClick={function(){setFeedTab(id);}} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:feedTab===id?700:500,color:feedTab===id?C.text:C.muted,paddingBottom:2,borderBottom:feedTab===id?"2px solid "+C.text:"2px solid transparent"}}>
        {label}
      </button>
    );
  });

  var toggleSave = function(id){ setSavedPosts(function(s){ return s.includes(id)?s.filter(function(x){return x!==id;}):[].concat(s,[id]); }); };

  var allFiltered = posts.filter(function(p){ return filter==="all"||p.type===filter; });
  var cityFiltered = allFiltered.filter(function(p){ return p.city===activeCity; });
  var followFiltered = allFiltered.filter(function(p){ return following.includes(p.name); });
  var filtered = feedTab==="following" ? followFiltered : cityFiltered;

  var addPost = function(p){
    var displayName = userName || (function(){ try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.name?d.name:"Tu"; } catch(e){ return "Tu"; } })(); var newPost = {id:Date.now(),city:p.city,type:p.type,name:displayName,av:displayName,content:p.content,media:p.media,likes:0,comments:0,time:new Date().toISOString()};
    setPosts(function(pp){ return [newPost].concat(pp); });
    if(userId && window._supaToken) {
      api.createPost(userId, p.city, p.type, p.content).catch(function(){});
    }
  };

  var handleCopy = function(){ if(navigator.clipboard) navigator.clipboard.writeText(refLink); setCopiedRef(true); setTimeout(function(){setCopiedRef(false);},2000); };

  var dollarWidget = (
    <div style={{background:C.card,borderRadius:14,border:"1px solid "+C.border,overflow:"hidden",marginBottom:16}}>
      <div style={{background:"#0d0d0d",padding:"9px 14px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:16}}>{ICONS.dollar}</span>
        <div style={{flex:1,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,0.5)"}}>BCV <strong style={{fontSize:14,color:"#ffcc00"}}>Bs 36.84</strong></span>
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,0.5)"}}>Paralelo <strong style={{fontSize:14,color:"#7defa0"}}>Bs 38.20</strong></span>
          <span style={{fontSize:11,color:"#7defa0",fontFamily:"'Inter',sans-serif",fontWeight:700}}>{"+0.35"}</span>
        </div>
        <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"'Inter',sans-serif"}}>hoy</span>
      </div>
      {filtered[0] ? (
        <div style={{padding:"8px 14px",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:14}}>{ICONS.fire}</span>
          <span style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Trending:</span>
          <span style={{fontSize:12,color:C.text,fontFamily:"'Inter',sans-serif",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{filtered[0].content.slice(0,80)}...</span>
        </div>
      ) : null}
    </div>
  );

  var postsList = filtered.length===0 ? (
    <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>{feedTab==="following"?"(siguiendo)":"(feed)"}</div>
      <div style={{fontSize:15,fontFamily:"'Inter',sans-serif"}}>{feedTab==="following"?"Sigue a alguien para ver sus posts":"Se el primero en publicar"}</div>
    </div>
  ) : filtered.map(function(p,i){
    return <PostCard key={p.id} post={p} idx={i} cityObj={cityObj} saved={savedPosts.includes(p.id)} onSave={toggleSave} following={following} onFollow={toggleFollow} userName={userName}/>;
  });

  var inviteBanner = (
    <a href={waInvite(activeCity)} target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",marginBottom:16}} onClick={function(){setInviteCount(function(c){return Math.min(c+1,3);});}}>
      <div style={{background:C.wa,borderRadius:16,padding:"16px"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",marginBottom:4}}>Invita venezolanos a {cityObj.name}</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontFamily:"'Inter',sans-serif",marginBottom:10}}>{inviteCount>=3?"Meta cumplida!":inviteCount===0?"Invita a tus panas":inviteCount+" de 3 invitados"}</div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {[0,1,2].map(function(j){ return <div key={j} style={{flex:1,height:4,borderRadius:2,background:j<inviteCount?"#fff":"rgba(255,255,255,0.3)"}}/>; })}
        </div>
        <div style={{background:"rgba(255,255,255,0.2)",borderRadius:10,padding:"8px 12px",textAlign:"center",color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700}}>Invitar por WhatsApp</div>
      </div>
    </a>
  );

  var header = (
    <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(20px)",boxShadow:"0 1px 0 rgba(0,0,0,0.06)"}}>
      <div style={{display:"flex",height:4}}>
        <div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/>
      </div>
      {isMobile ? (
        <div>
          <div style={{padding:"10px 16px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:24,fontFamily:"'Syne',sans-serif",letterSpacing:-1,fontWeight:800}}>
              <span style={{color:C.yellow}}>E</span><span style={{color:C.blue}}>pa</span><span style={{color:C.red}}>le</span>
            </div>
            <div style={{display:"flex",gap:20}}>
              {tabButtons}
            </div>
            <button onClick={onProfile} style={{background:"none",border:"none",cursor:"pointer"}}>
              <Av t={userName} i={0} s={34} photo={userPhoto}/>
            </button>
          </div>
          <div style={{display:"flex",gap:6,padding:"0 12px 8px",overflowX:"auto"}}>
            {cityButtons}
          </div>
          <div style={{display:"flex",gap:6,padding:"0 12px 8px",overflowX:"auto",borderTop:"1px solid "+C.border}}>
            <button onClick={function(){setFilter("all");}} style={{padding:"5px 14px",borderRadius:100,border:"1.5px solid "+(filter==="all"?C.blue:C.border),background:filter==="all"?C.blue:C.card,color:filter==="all"?"#fff":C.muted,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Todos</button>
            {typeButtons}
          </div>
        </div>
      ) : (
        <div>
          <div style={{maxWidth:1200,margin:"0 auto",padding:"8px 20px 0",display:"flex",alignItems:"center",gap:20}}>
            <div style={{fontSize:26,fontFamily:"'Syne',sans-serif",letterSpacing:-1,fontWeight:800,minWidth:120}}>
              <span style={{color:C.yellow}}>E</span><span style={{color:C.blue}}>pa</span><span style={{color:C.red}}>le</span>
            </div>
            <div style={{flex:1,display:"flex",justifyContent:"center",gap:28}}>
              {tabButtons}
            </div>
            <div style={{minWidth:120,display:"flex",justifyContent:"flex-end"}}>
              <button onClick={onProfile} style={{background:"none",border:"none",cursor:"pointer"}}>
                <Av t={userName} i={0} s={34} photo={userPhoto}/>
              </button>
            </div>
          </div>
          <div style={{maxWidth:1200,margin:"0 auto",padding:"6px 20px 8px",display:"flex",gap:6,overflowX:"auto"}}>
            {cityButtons}
          </div>
          <div style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 8px",display:"flex",gap:6,overflowX:"auto",borderTop:"1px solid "+C.border}}>
            <button onClick={function(){setFilter("all");}} style={{padding:"5px 14px",borderRadius:100,border:"1.5px solid "+(filter==="all"?C.blue:C.border),background:filter==="all"?C.blue:C.card,color:filter==="all"?"#fff":C.muted,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Todos</button>
            {typeButtons}
          </div>
        </div>
      )}
    </div>
  );

  if(isMobile) {
    return (
      <div style={{minHeight:"100vh",background:C.bg}}>
        {showComposer ? <Composer cityObj={cityObj} onPost={addPost} onClose={function(){setShowComposer(false);}}/> : null}
        {header}
        <div style={{paddingBottom:80}}>
          <div style={{margin:"10px 14px 0"}}>{dollarWidget}</div>
          <div style={{marginTop:4}}>{postsList}</div>
          <div style={{margin:"10px 14px 20px"}}>{inviteBanner}</div>
        </div>
        <button onClick={function(){setShowComposer(true);}} style={{position:"fixed",bottom:24,right:24,width:52,height:52,borderRadius:26,background:C.yellow,border:"none",cursor:"pointer",fontSize:30,fontWeight:300,boxShadow:"0 4px 18px rgba(255,204,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,lineHeight:1}}>{ICONS.pencil}</button>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg}}>
      {showComposer ? <Composer cityObj={cityObj} onPost={addPost} onClose={function(){setShowComposer(false);}}/> : null}
      {header}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px",display:"flex",gap:24,alignItems:"flex-start"}}>
        <div style={{width:240,flexShrink:0,position:"sticky",top:170}}>
          <div style={{background:C.card,borderRadius:16,border:"1px solid "+C.border,overflow:"hidden",marginBottom:16}}>
            <div style={{background:"linear-gradient(135deg,#ffcc00,#0066ff)",height:60}}/>
            <div style={{padding:"0 16px 16px",marginTop:-28}}>
              <Av t={userName} i={0} s={52} photo={userPhoto}/>
              <div style={{marginTop:8,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:C.text}}>{userName}</div>
              <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:12}}>{"@"+userName.toLowerCase().replace(" ","")}</div>
              <button onClick={onProfile} style={{width:"100%",padding:"8px",background:C.yellow,border:"none",borderRadius:10,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,color:C.text}}>Ver perfil</button>
            </div>
          </div>
          <div style={{background:C.card,borderRadius:16,border:"1px solid "+C.border,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:C.text,marginBottom:12}}>Ciudades</div>
            {CITIES.slice(0,6).map(function(c){
              return (
                <div key={c.id} onClick={function(){setActiveCity(c.id);}} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:10,cursor:"pointer",background:activeCity===c.id?C.bg:"transparent",marginBottom:2}}>
                  <span style={{fontSize:16}}>{toFlag(CITY_FLAGS[c.id])}</span>
                  <span style={{fontFamily:"'Inter',sans-serif",fontSize:13,color:activeCity===c.id?C.blue:C.text,fontWeight:activeCity===c.id?700:400}}>{c.name}</span>
                </div>
              );
            })}
          </div>
          <button onClick={function(){setShowComposer(true);}} style={{width:"100%",padding:"12px",background:C.yellow,border:"none",borderRadius:12,cursor:"pointer",fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:C.text}}>+ Publicar</button>
        </div>
        <div style={{flex:1,minWidth:0}}>
          {dollarWidget}
          {postsList}
        </div>
        <div style={{width:280,flexShrink:0,position:"sticky",top:170}}>
          {inviteBanner}
          <div style={{background:C.card,borderRadius:16,border:"1px solid "+C.border,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:C.text,marginBottom:12}}>Venezolanos en {cityObj.name}</div>
            {SEED.filter(function(p){return p.city===activeCity;}).slice(0,4).map(function(p,i){
              return (
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <Av t={p.av} i={i} s={36}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',sans-serif"}}>{p.name}</div>
                    <div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{p.type}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{background:C.card,borderRadius:16,border:"1px solid "+C.border,padding:"14px 16px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:C.text,marginBottom:10}}>Epale</div>
            <div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",lineHeight:1.6}}>La red social de los venezolanos en el mundo. Conecta, comparte y crece con tu gente.</div>
            <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
              {["Terminos","Privacidad","Contacto"].map(function(t){
                return <span key={t} style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif",cursor:"pointer",textDecoration:"underline"}}>{t}</span>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Composer(props) {
  var cityObj=props.cityObj, onPost=props.onPost, onClose=props.onClose;
  var [type,setType]=useState("post");
  var [text,setText]=useState("");
  var [media,setMedia]=useState(null);
  var [loading,setLoading]=useState(false);

  var handleFile = function(e, kind) {
    var file = e.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){ setMedia({src:ev.target.result,kind:kind}); };
    reader.readAsDataURL(file);
  };

  var canPost = text.trim() || media;

  var submit = function() {
    if(!canPost) return;
    setLoading(true);
    setTimeout(function(){
      onPost({city:cityObj.id,type:type,content:text,media:media});
      setLoading(false); onClose();
    },600);
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={function(e){e.stopPropagation();}} style={{width:"100%",maxWidth:560,background:C.card,borderRadius:22,padding:"0 0 36px",maxHeight:"90vh",overflowY:"auto",margin:"0 16px"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}><div style={{width:36,height:4,borderRadius:2,background:C.border}}/></div>
        <div style={{padding:"4px 20px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:15,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>Nueva publicacion</span>
            <span style={{fontSize:12,color:C.blue,fontFamily:"'Inter',sans-serif",fontWeight:700}}>{toFlag(CITY_FLAGS[cityObj.id])} {cityObj.name}</span>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
            {Object.entries(TYPES).map(function(entry){
              var id=entry[0],m=entry[1];
              return <button key={id} onClick={function(){setType(id);}} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(type===id?C.blue:C.border),background:type===id?C.blue:C.card,color:type===id?"#fff":C.muted,fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{m.icon} {m.label}</button>;
            })}
          </div>
          <textarea value={text} onChange={function(e){setText(e.target.value);}} placeholder="Que esta pasando en tu ciudad?" style={{width:"100%",background:C.bg,border:"1.5px solid "+(text?C.blue:C.border),borderRadius:12,padding:"12px 14px",color:C.text,fontFamily:"'Inter',sans-serif",fontSize:14,resize:"none",minHeight:90,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
          {media ? (
            <div style={{position:"relative",marginBottom:12,borderRadius:12,overflow:"hidden",border:"1.5px solid "+C.border}}>
              {media.kind==="image" ? <img src={media.src} alt="preview" style={{width:"100%",maxHeight:220,objectFit:"cover",display:"block"}}/> : <video src={media.src} controls style={{width:"100%",maxHeight:220,display:"block"}}/>}
              <button onClick={function(){setMedia(null);}} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:9999,width:28,height:28,cursor:"pointer",color:"#fff",fontSize:14}}>X</button>
            </div>
          ) : (
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[[ICONS.photo,"Foto","image/*","image"],[ICONS.video,"Video","video/*","video"],[ICONS.camera,"Camara","image/*","image"]].map(function(item,idx){
                return (
                  <label key={idx} style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",background:C.bg,border:"1.5px solid "+C.border,borderRadius:12,cursor:"pointer"}}>
                      <span style={{fontSize:18}}>{item[0]}</span>
                      <span style={{fontSize:11,fontFamily:"'Inter',sans-serif",color:C.muted,fontWeight:700}}>{item[1]}</span>
                    </div>
                    <input type="file" accept={item[2]} style={{display:"none"}} onChange={function(e){handleFile(e,item[3]);}}/>
                  </label>
                );
              })}
            </div>
          )}
          <button onClick={submit} disabled={!canPost} style={{width:"100%",padding:"13px",background:canPost?C.yellow:C.border,color:canPost?C.text:C.muted,border:"none",borderRadius:100,cursor:canPost?"pointer":"not-allowed",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>
            {loading?"Publicando...":"Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MisPublicaciones(props) {
  var posts=props.posts||[], onClose=props.onClose;
  var myPosts = posts.filter(function(p){ return p.name==="Tu"; });
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <Stripe/>
      <div style={{position:"sticky",top:0,zIndex:10,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{"<-"}</button>
        <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>Mis publicaciones</div>
      </div>
      <div style={{paddingBottom:40}}>
        {myPosts.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:48,marginBottom:12}}>{ICONS.notepad}</div>
            <div style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:8}}>Aun no has publicado nada</div>
            <div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Tus publicaciones apareceran aqui</div>
          </div>
        ) : myPosts.map(function(p,i){
          return (
            <div key={p.id} style={{background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 16px"}}>
              <p style={{fontSize:14,lineHeight:1.6,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:10}}>{p.content}</p>
              <div style={{display:"flex",gap:14,fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif"}}>
                <span style={{color:C.red}}> {p.likes}</span>
                <span> {p.comments}</span>
                <span>hace {p.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Guardados(props) {
  var saved=props.saved||[], allPosts=props.allPosts||[], onClose=props.onClose;
  var savedPosts = allPosts.filter(function(p){ return saved.includes(p.id); });
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <Stripe/>
      <div style={{position:"sticky",top:0,zIndex:10,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{"<-"}</button>
        <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>Guardados</div>
      </div>
      <div style={{paddingBottom:40}}>
        {savedPosts.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:48,marginBottom:12}}>{ICONS.heart}</div>
            <div style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:8}}>No tienes posts guardados</div>
            <div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Toca el icono guardar en cualquier post</div>
          </div>
        ) : savedPosts.map(function(p,i){
          return (
            <div key={p.id} style={{background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 16px"}}>
              <div style={{display:"flex",gap:10,marginBottom:8}}>
                <Av t={p.av} i={i} s={36}/>
                <div>
                  <div style={{fontWeight:700,fontSize:13,fontFamily:"'Syne',sans-serif",color:C.text}}>{p.name}</div>
                  <div style={{fontSize:10,color:C.blue,fontFamily:"'Inter',sans-serif"}}>{toFlag(CITY_FLAGS[p.city])} {getCity(p.city).name}</div>
                </div>
              </div>
              <p style={{fontSize:14,lineHeight:1.6,color:C.text,fontFamily:"'Inter',sans-serif"}}>{p.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FollowersList(props) {
  var title=props.title, users=props.users, following=props.following||[], onFollow=props.onFollow, onClose=props.onClose;
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,zIndex:10,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{"<-"}</button>
        <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700,flex:1}}>{title}</div>
        <span style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{users.length}</span>
      </div>
      <div style={{paddingBottom:40}}>
        {users.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:48,marginBottom:12}}>{ICONS.group}</div>
            <div style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text}}>Nadie aqui aun</div>
          </div>
        ) : users.map(function(u,i){
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:"1px solid "+C.border,background:C.card}}>
              <Av t={u.av} i={i} s={48}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,fontFamily:"'Syne',sans-serif",color:C.text}}>{u.name}</div>
                <div style={{fontSize:11,color:C.blue,fontFamily:"'Inter',sans-serif",marginTop:1}}>{toFlag(CITY_FLAGS[u.city])} {getCity(u.city).name}</div>
                <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:2}}>{u.bio}</div>
              </div>
              <button onClick={function(){onFollow(u.name);}} style={{padding:"7px 16px",borderRadius:100,border:"1.5px solid "+(following.includes(u.name)?C.border:C.blue),background:"transparent",color:following.includes(u.name)?C.muted:C.blue,fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                {following.includes(u.name)?"Siguiendo":"Seguir"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


var NOTIF_SEED = [
  { id:1, icon:ICONS.heart, iconBg:"#fdecea", text:"Carlos Mendez le dio like a tu post", time:"hace 2 min", read:false },
  { id:2, icon:ICONS.comment, iconBg:"#e8f0fc", text:"Andreina Lopez comento: Que bueno esto!", time:"hace 15 min", read:false },
  { id:3, icon:ICONS.heart, iconBg:"#fdecea", text:"3 personas mas le dieron like a tu post", time:"hace 1h", read:false },
  { id:4, icon:ICONS.share, iconBg:"#e8f8ee", text:"Tu post fue compartido en WhatsApp 2 veces", time:"hace 2h", read:true },
  { id:5, icon:ICONS.comment, iconBg:"#e8f0fc", text:"Jose Rodriguez comento: Epale que buena info!", time:"hace 3h", read:true },
  { id:6, icon:ICONS.heart, iconBg:"#fdecea", text:"5 personas le dieron like a tu post", time:"hace 5h", read:true },
  { id:7, icon:ICONS.flag_ve, iconBg:"#fffbea", text:"Bienvenido a Epale! Conecta con venezolanos en tu ciudad", time:"hace 1 dia", read:true },
];

function Notificaciones(props) {
  var onClose=props.onClose;
  var [notifs,setNotifs]=useState(NOTIF_SEED);
  var unread = notifs.filter(function(n){return !n.read;}).length;
  var markAll = function(){ setNotifs(function(ns){return ns.map(function(n){return Object.assign({},n,{read:true});}); }); };
  var markOne = function(id){ setNotifs(function(ns){return ns.map(function(n){return n.id===id?Object.assign({},n,{read:true}):n;}); }); };
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,zIndex:10,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{"<-"}</button>
        <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700,flex:1}}>Notificaciones</div>
        {unread > 0 ? <button onClick={markAll} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:600}}>Marcar todas</button> : null}
      </div>
      {unread > 0 ? <div style={{padding:"8px 16px",background:"#fffbea",borderBottom:"1px solid "+C.border}}><span style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{unread} sin leer</span></div> : null}
      <div style={{paddingBottom:40}}>
        {notifs.map(function(n){
          return (
            <div key={n.id} onClick={function(){markOne(n.id);}} style={{display:"flex",gap:14,padding:"14px 16px",background:n.read?C.bg:C.card,borderBottom:"1px solid "+C.border,cursor:"pointer"}}>
              <div style={{width:44,height:44,borderRadius:12,background:n.iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{n.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.4,marginBottom:4}}>{n.text}</div>
                <div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{n.time}</div>
              </div>
              {!n.read ? <div style={{width:8,height:8,borderRadius:9999,background:C.blue,flexShrink:0,marginTop:6}}/> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Profile(props) {
  var userCity=props.userCity, onLogout=props.onLogout, onClose=props.onClose, onSetDark=props.onSetDark, onSetLang=props.onSetLang, isDark=props.isDark, currentLang=props.currentLang, following=props.following||[], onFollow=props.onFollow, userPhoto=props.userPhoto||null, userName=props.userName||"Tu", onPhotoChange=props.onPhotoChange||function(){};
  var [subScreen,setSubScreen]=useState(null);
  var cityObj = getCity(userCity);

  if(subScreen==="posts") return <MisPublicaciones posts={SEED} onClose={function(){setSubScreen(null);}}/>;
  if(subScreen==="saved") return <Guardados saved={[]} allPosts={SEED} onClose={function(){setSubScreen(null);}}/>;
  if(subScreen==="seguidores") return <FollowersList title="Seguidores" users={SAMPLE_USERS} following={following} onFollow={onFollow||function(){}} onClose={function(){setSubScreen(null);}}/>;
  if(subScreen==="siguiendo") return <FollowersList title="Siguiendo" users={SAMPLE_USERS.filter(function(u){return following.includes(u.name);})} following={following} onFollow={onFollow||function(){}} onClose={function(){setSubScreen(null);}}/>;
  if(subScreen==="notifs") return <Notificaciones onClose={function(){setSubScreen(null);}}/>;
  if(subScreen==="config") return <Configuracion userCity={userCity} onClose={function(){setSubScreen(null);}} onLogout={onLogout} onSetDark={onSetDark} onSetLang={onSetLang} isDark={isDark} currentLang={currentLang}/>;
  if(subScreen==="edit") return <EditProfile userCity={userCity} userPhoto={userPhoto} userName={userName} onPhotoChange={onPhotoChange} onClose={function(){setSubScreen(null);}}/>;

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{background:C.card,borderBottom:"1px solid "+C.border,marginBottom:10}}>
        <div style={{height:100,background:"linear-gradient(135deg,#ffcc00,#0066ff,#ff2d2d)",position:"relative"}}>
          <button onClick={onClose} style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.3)",border:"none",borderRadius:9999,width:32,height:32,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>X</button>
        </div>
        <div style={{padding:"0 20px 20px",position:"relative"}}>
          <div style={{position:"absolute",top:-36,left:20,padding:3,borderRadius:9999,background:C.card}}>
            <Av t={userName} i={0} s={72}/>
          </div>
          <div style={{paddingTop:46,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:22,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>Tu Perfil</div>
              <div style={{fontSize:12,color:C.blue,fontFamily:"'Inter',sans-serif",fontWeight:700,marginTop:2}}>{toFlag(CITY_FLAGS[userCity])} {cityObj.name}</div>
            </div>
            <button onClick={function(){setSubScreen("edit");}} style={{padding:"7px 16px",background:C.blue,border:"none",borderRadius:100,color:"#fff",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700}}>Editar perfil</button>
          </div>
          <div style={{display:"flex",marginTop:16,borderTop:"1px solid "+C.border,paddingTop:14}}>
            {[{val:0,label:"Posts",color:C.blue,action:null},{val:SAMPLE_USERS.length,label:"Seguidores",color:C.yellow,action:function(){setSubScreen("seguidores");}},{val:following.length,label:"Siguiendo",color:C.red,action:function(){setSubScreen("siguiendo");}}].map(function(s,i){
              return (
                <div key={s.label} onClick={s.action} style={{flex:1,textAlign:"center",borderRight:i<2?"1px solid "+C.border:"none",cursor:s.action?"pointer":"default",padding:"4px 0"}}>
                  <div style={{fontSize:22,fontWeight:800,fontFamily:"'Syne',sans-serif",color:s.color}}>{s.val}</div>
                  <div style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:2}}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{background:C.card,marginBottom:10}}>
        {[{icon:ICONS.pencil,label:"Mis publicaciones",sub:"Posts que has compartido",action:function(){setSubScreen("posts");}},{icon:ICONS.heart,label:"Guardados",sub:"Posts que marcaste como favoritos",action:function(){setSubScreen("saved");}},{icon:ICONS.bell,label:"Notificaciones",sub:"Likes, comentarios, menciones",action:function(){setSubScreen("notifs");}},{icon:ICONS.gear,label:"Configuracion",sub:"Cuenta, privacidad, idioma",action:function(){setSubScreen("config");}}].map(function(item,i){
          return (
            <div key={i} onClick={item.action||function(){}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderBottom:i<3?"1px solid "+C.border:"none",cursor:"pointer"}}>
              <div style={{width:42,height:42,borderRadius:12,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{item.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",fontWeight:600}}>{item.label}</div>
                <div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:1}}>{item.sub}</div>
              </div>
              <span style={{color:C.muted,fontSize:18}}>{">"}</span>
            </div>
          );
        })}
      </div>

      <div style={{margin:"0 14px 10px"}}>
        <a href={waInvite(userCity)} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}>
          <div style={{background:C.wa,borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22}}>{ICONS.phone}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:13}}>Invitar venezolanos a Epale</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontFamily:"'Inter',sans-serif"}}>Comparte con tus panas en {cityObj.name}</div>
            </div>
          </div>
        </a>
      </div>
      <div style={{margin:"0 14px 40px"}}>
        <button onClick={onLogout} style={{width:"100%",padding:"14px",background:C.card,border:"1px solid "+C.border,borderRadius:14,color:C.red,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:700}}>Cerrar Sesion</button>
      </div>
    </div>
  );
}

function EditProfile(props) {
  var userCity=props.userCity, onClose=props.onClose, onPhotoChange=props.onPhotoChange||function(){};
  var [name,setName]=useState(props.userName||"Maria Fernanda");
  var [username,setUsername]=useState("mariafernanda");
  var [bio,setBio]=useState("Venezolano en "+getCity(userCity).name);
  var [photo,setPhoto]=useState(props.userPhoto||null);
  var [saved,setSaved]=useState(false);
  var [loading,setLoading]=useState(false);

  var handlePhoto = function(e){
    var file = e.target.files && e.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){ setPhoto(ev.target.result); };
    reader.readAsDataURL(file);
  };

  var save = function() {
    setLoading(true);
    var uid = (function(){ try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.uid?d.uid:""; } catch(e){ return ""; } })();
    if(uid) {
      api.upsertProfile(uid, name, userCity, username).then(function(){
        try {
          var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):{};
          d.name=name; d.photo=photo||d.photo;
          localStorage.setItem("epale_session", JSON.stringify(d));
        } catch(e){}
        setLoading(false); setSaved(true);
        onPhotoChange(photo);
        setTimeout(onClose, 1200);
      }).catch(function(){
        setLoading(false); setSaved(true);
        onPhotoChange(photo);
        setTimeout(onClose, 1200);
      });
    } else {
      setTimeout(function(){
        try {
          var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):{};
          d.name=name; d.photo=photo||d.photo;
          localStorage.setItem("epale_session", JSON.stringify(d));
        } catch(e){}
        setLoading(false); setSaved(true);
        onPhotoChange(photo);
        setTimeout(onClose, 1200);
      }, 600);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:600}}>Cancelar</button>
        <div style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>Editar perfil</div>
        <button onClick={save} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>{loading?"...":saved?"ok":"Guardar"}</button>
      </div>
      <div style={{padding:"24px 20px 60px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28}}>
          <div style={{position:"relative",marginBottom:8}}>
            <div style={{width:90,height:90,borderRadius:9999,overflow:"hidden",background:"linear-gradient(135deg,#ffcc00,#0066ff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:800,border:"3px solid "+C.yellow}}>
              {photo ? <img src={photo} alt="foto" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (name?name[0].toUpperCase():"?")}
            </div>
            <label style={{position:"absolute",bottom:0,right:0,width:28,height:28,borderRadius:9999,background:C.yellow,border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,fontWeight:700}}>
              +<input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
            </label>
          </div>
          <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Toca para cambiar foto</div>
        </div>
        {[["NOMBRE","Tu nombre",name,setName,false],["USUARIO","tu_usuario",username,function(v){setUsername(v.toLowerCase());},true]].map(function(item,i){
          var label=item[0],ph=item[1],val=item[2],set=item[3],isUser=item[4];
          return (
            <div key={i} style={{marginBottom:18}}>
              <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>{label}</div>
              <div style={{position:"relative"}}>
                {isUser ? <span style={{position:"absolute",left:14,top:10,color:C.muted,fontFamily:"'Inter',sans-serif",fontSize:15}}>@</span> : null}
                <input value={val} onChange={function(e){set(e.target.value);}} placeholder={ph} style={{width:"100%",padding:"13px 16px 13px "+(isUser?"30px":"16px"),background:C.card,border:"1.5px solid "+(val?C.blue:C.border),borderRadius:14,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
          );
        })}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>BIO</div>
          <textarea value={bio} onChange={function(e){setBio(e.target.value);}} placeholder="Cuentanos sobre ti..." maxLength={150} style={{width:"100%",padding:"13px 16px",background:C.card,border:"1.5px solid "+(bio?C.blue:C.border),borderRadius:14,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",resize:"none",minHeight:90,boxSizing:"border-box"}}/>
          <div style={{fontSize:11,color:C.muted,textAlign:"right",marginTop:4}}>{bio.length}/150</div>
        </div>
        <button onClick={save} style={{width:"100%",padding:"15px",background:C.yellow,color:C.text,border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:700}}>
          {loading?"Guardando...":saved?"Guardado":"Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function Configuracion(props) {
  var userCity=props.userCity, onClose=props.onClose, onLogout=props.onLogout, onSetDark=props.onSetDark, onSetLang=props.onSetLang, isDark=props.isDark, currentLang=props.currentLang;
  var [notifOn,setNotifOn]=useState(true);
  var [darkMode,setDarkMode]=useState(isDark||false);
  var [subPage,setSubPage]=useState(null);
  var cityObj = getCity(userCity);

  var Toggle = function(tProps) {
    return (
      <div onClick={tProps.onToggle} style={{width:44,height:26,borderRadius:13,background:tProps.on?C.blue:C.border,cursor:"pointer",position:"relative",flexShrink:0}}>
        <div style={{position:"absolute",top:3,left:tProps.on?20:3,width:20,height:20,borderRadius:9999,background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
      </div>
    );
  };

  if(subPage==="password") return (
    <div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={function(){setSubPage(null);}} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18}}>{"<-"}</button>
        <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text}}>Cambiar contrasena</div>
      </div>
      <div style={{padding:"24px 20px",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>{ICONS.key}</div>
        <div style={{fontSize:15,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Funcionalidad disponible cuando conectes Supabase</div>
      </div>
    </div>
  );

  if(subPage==="terminos") return (
    <div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={function(){setSubPage(null);}} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18}}>{"<-"}</button>
        <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text}}>Terminos de Servicio</div>
      </div>
      <div style={{padding:"24px 20px 40px"}}>
        {[["1. Aceptacion","Al usar Epale aceptas estos terminos."],["2. Uso","Comprometete a usar la plataforma de manera respetuosa y legal."],["3. Contenido","Eres responsable del contenido que publicas."],["4. Privacidad","No vendemos tus datos a terceros."],["5. Contacto","legal@epaleapp.online"]].map(function(item,i){
          return <div key={i} style={{marginBottom:20}}><div style={{fontSize:15,fontWeight:700,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:6}}>{item[0]}</div><div style={{fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.6}}>{item[1]}</div></div>;
        })}
      </div>
    </div>
  );

  if(subPage==="privacidad") return (
    <div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={function(){setSubPage(null);}} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18}}>{"<-"}</button>
        <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text}}>Politica de Privacidad</div>
      </div>
      <div style={{padding:"24px 20px 40px"}}>
        {[["Datos que recopilamos","Nombre, correo, ciudad y contenido publicado."],["Como los usamos","Para mostrarte contenido relevante y mejorar la plataforma."],["Compartir","No vendemos ni compartimos datos personales."],["Tus derechos","Puedes eliminar tu cuenta escribiendo a privacidad@epaleapp.online."],["Contacto","privacidad@epaleapp.online"]].map(function(item,i){
          return <div key={i} style={{marginBottom:20}}><div style={{fontSize:15,fontWeight:700,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:6}}>{item[0]}</div><div style={{fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.6}}>{item[1]}</div></div>;
        })}
      </div>
    </div>
  );

  if(subPage==="lang") return (
    <div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={function(){setSubPage(null);}} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18}}>{"<-"}</button>
        <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text}}>Idioma</div>
      </div>
      <div style={{padding:"20px 16px"}}>
        {[{id:"es",flag:"VE",name:"Espanol"},{id:"en",flag:"",name:"English"}].map(function(l){
          return (
            <button key={l.id} onClick={function(){if(onSetLang) onSetLang(l.id); setSubPage(null);}} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px",background:currentLang===l.id?"#fffbea":C.card,border:"2px solid "+(currentLang===l.id?C.yellow:C.border),borderRadius:14,cursor:"pointer",textAlign:"left",marginBottom:10}}>
              <span style={{fontSize:28}}>{l.flag}</span>
              <span style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700,flex:1}}>{l.name}</span>
              {currentLang===l.id ? <div style={{width:22,height:22,borderRadius:9999,background:C.yellow,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{ICONS.check}</div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18}}>{"<-"}</button>
        <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text}}>Configuracion</div>
      </div>
      <div style={{paddingBottom:40}}>
        {[{title:"CUENTA",items:[{label:"Correo",value:"tu@correo.com",type:"info"},{label:"Ciudad",value:toFlag(CITY_FLAGS[userCity])+" "+cityObj.name,type:"info"},{label:"Cambiar contrasena",type:"action",onPress:function(){setSubPage("password");}}]},{title:"PREFERENCIAS",items:[{label:"Notificaciones",type:"toggle",val:notifOn,onToggle:function(){setNotifOn(function(v){return !v;});}},{label:"Modo oscuro",type:"toggle",val:darkMode,onToggle:function(){var v=!darkMode;setDarkMode(v);if(onSetDark)onSetDark(v);}},{label:"Idioma",value:currentLang==="en"?"English":"Espanol",type:"action",onPress:function(){setSubPage("lang");}}]},{title:"LEGAL",items:[{label:"Terminos de servicio",type:"action",onPress:function(){setSubPage("terminos");}},{label:"Politica de privacidad",type:"action",onPress:function(){setSubPage("privacidad");}},{label:"Version",value:"v1.0.0",type:"info"}]}].map(function(sec,si){
          return (
            <div key={si} style={{marginTop:20}}>
              <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,letterSpacing:1,padding:"0 16px",marginBottom:6}}>{sec.title}</div>
              <div style={{background:C.card,borderTop:"1px solid "+C.border,borderBottom:"1px solid "+C.border}}>
                {sec.items.map(function(item,ii){
                  return (
                    <div key={ii} onClick={item.onPress||function(){}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:ii<sec.items.length-1?"1px solid "+C.border:"none",cursor:item.type==="action"?"pointer":"default"}}>
                      <span style={{fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",flex:1,fontWeight:500}}>{item.label}</span>
                      {item.type==="toggle" ? <Toggle on={item.val} onToggle={item.onToggle}/> : null}
                      {item.type==="info" ? <span style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{item.value}</span> : null}
                      {item.type==="action" ? <span style={{color:C.muted,fontSize:18}}>{">"}</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div style={{margin:"20px 14px"}}>
          <button onClick={onLogout} style={{width:"100%",padding:"14px",background:C.card,border:"1px solid "+C.border,borderRadius:14,color:C.red,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:700}}>Cerrar Sesion</button>
        </div>
      </div>
    </div>
  );
}



var sStr = function(p){ var s=0; if(p.length>=6)s++; if(p.length>=10)s++; if(/[A-Z]/.test(p))s++; if(/[0-9]/.test(p))s++; return s; };
var STR_COLORS = ["","#ff2d2d","#ff2d2d","#ffcc00","#1a7a3c","#1a7a3c"];
var STR_LABELS = ["","Muy debil","Debil","Regular","Buena","Fuerte"];

function AuthLogin(props) {
  var onSwitch=props.onSwitch, onDone=props.onDone;
  var [email,setEmail]=useState("");
  var [password,setPassword]=useState("");
  var [showPass,setShowPass]=useState(false);
  var [loading,setLoading]=useState(false);
  var [error,setError]=useState("");
  var go = function() {
    if(!email||!password){setError("Completa todos los campos");return;}
    setLoading(true); setError("");
    api.signIn(email, password).then(function(res) {
      if(res.error || res.error_description) {
        setError(res.error_description || "Correo o contrasena incorrectos");
        setLoading(false); return;
      }
      var token = res.access_token || (res.session && res.session.access_token) || "";
      var uid = (res.user && res.user.id) || (res.session && res.session.user && res.session.user.id) || "";
      window._supaToken = token;
      api.getProfile(uid).then(function(profiles) {
        var profile = Array.isArray(profiles) && profiles[0];
        setLoading(false);
        onDone(profile ? profile.city : "madrid", profile ? profile.name : "", profile ? profile.photo_url : null, token, uid);
      }).catch(function(){
        setLoading(false);
        onDone("madrid", "", null, token, uid);
      });
    }).catch(function(e) {
      setError("Error de conexion"); setLoading(false);
    });
  };
  return (
    <div style={{flex:1,padding:"22px 20px 32px"}}>
      <div style={{fontSize:20,fontFamily:"'Syne',sans-serif",color:"#1a1a1a",marginBottom:4,fontWeight:700}}>Bienvenido de vuelta</div>
      <div style={{fontSize:13,color:"#86868b",fontFamily:"'Inter',sans-serif",marginBottom:22}}>Entra para conectarte con tu gente</div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:"#86868b",marginBottom:7,letterSpacing:1}}>CORREO</div>
        <input value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="tu@correo.com" type="email" style={{width:"100%",padding:"13px 16px",background:"#fff",border:"1.5px solid "+(email?"#0066ff":"#e8e8ed"),borderRadius:12,color:"#1a1a1a",fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{marginBottom:8}}>
        <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:"#86868b",marginBottom:7,letterSpacing:1}}>CONTRASENA</div>
        <div style={{position:"relative"}}>
          <input value={password} onChange={function(e){setPassword(e.target.value);}} type={showPass?"text":"password"} placeholder="Tu contrasena" style={{width:"100%",padding:"13px 46px 13px 16px",background:"#fff",border:"1.5px solid "+(password?"#0066ff":"#e8e8ed"),borderRadius:12,color:"#1a1a1a",fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
          <button onClick={function(){setShowPass(function(s){return !s;});}} style={{position:"absolute",right:14,top:10,background:"none",border:"none",cursor:"pointer",fontSize:18}}>{ICONS.eye}</button>
        </div>
      </div>
      <div style={{textAlign:"right",marginBottom:20}}><button style={{background:"none",border:"none",cursor:"pointer",color:"#0066ff",fontFamily:"'Inter',sans-serif",fontSize:11}}>Olvidaste tu contrasena?</button></div>
      {error ? <div style={{background:"#fff0f0",border:"1px solid #ffb3b3",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:"#ff2d2d",fontFamily:"'Inter',sans-serif"}}>{error}</div> : null}
      <button onClick={go} style={{width:"100%",padding:"14px",background:"#ffcc00",color:"#1a1a1a",border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>{loading?"Entrando...":"Entrar"}</button>
    </div>
  );
}

function AuthStep1(props) {
  var onNext=props.onNext, email=props.email, setEmail=props.setEmail, password=props.password, setPassword=props.setPassword, password2=props.password2, setPassword2=props.setPassword2;
  var [showPass,setShowPass]=useState(false);
  var [error,setError]=useState("");
  var str = sStr(password);
  var next = function() {
    if(!email||!password||!password2){setError("Completa todos los campos");return;}
    if(password!==password2){setError("Las contrasenas no coinciden");return;}
    if(password.length<6){setError("Minimo 6 caracteres");return;}
    onNext();
  };
  return (
    <div style={{flex:1,padding:"22px 20px 32px"}}>
      <div style={{fontSize:20,fontFamily:"'Syne',sans-serif",color:"#1a1a1a",marginBottom:16,fontWeight:700}}>Crea tu cuenta</div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:"#86868b",marginBottom:7,letterSpacing:1}}>CORREO</div>
        <input value={email} onChange={function(e){setEmail(e.target.value);}} type="email" placeholder="tu@correo.com" style={{width:"100%",padding:"13px 16px",background:"#fff",border:"1.5px solid "+(email?"#0066ff":"#e8e8ed"),borderRadius:12,color:"#1a1a1a",fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:"#86868b",marginBottom:7,letterSpacing:1}}>CONTRASENA</div>
        <div style={{position:"relative"}}>
          <input value={password} onChange={function(e){setPassword(e.target.value);}} type={showPass?"text":"password"} placeholder="Minimo 6 caracteres" style={{width:"100%",padding:"13px 46px 13px 16px",background:"#fff",border:"1.5px solid "+(password?"#0066ff":"#e8e8ed"),borderRadius:12,color:"#1a1a1a",fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
          <button onClick={function(){setShowPass(function(s){return !s;});}} style={{position:"absolute",right:14,top:10,background:"none",border:"none",cursor:"pointer",fontSize:18}}>{ICONS.eye}</button>
        </div>
        {password ? (
          <div>
            <div style={{display:"flex",gap:3,marginTop:7}}>{[1,2,3,4,5].map(function(i){return <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=str?STR_COLORS[str]:"#e8e8ed"}}/>;})}</div>
            <div style={{fontSize:11,color:STR_COLORS[str],fontFamily:"'Inter',sans-serif",marginTop:3}}>{STR_LABELS[str]}</div>
          </div>
        ) : null}
      </div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:"#86868b",marginBottom:7,letterSpacing:1}}>CONFIRMAR CONTRASENA</div>
        <input value={password2} onChange={function(e){setPassword2(e.target.value);}} type="password" placeholder="Repite tu contrasena" style={{width:"100%",padding:"13px 16px",background:"#fff",border:"1.5px solid "+(password2?(password2===password?"#1a7a3c":"#ff2d2d"):"#e8e8ed"),borderRadius:12,color:"#1a1a1a",fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      </div>
      {error ? <div style={{background:"#fff0f0",border:"1px solid #ffb3b3",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:"#ff2d2d",fontFamily:"'Inter',sans-serif"}}>{error}</div> : null}
      <button onClick={next} style={{width:"100%",padding:"14px",background:"#ffcc00",color:"#1a1a1a",border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>Siguiente</button>
    </div>
  );
}

function AuthStep2(props) {
  var onNext=props.onNext, onBack=props.onBack, name=props.name, setName=props.setName, username=props.username, setUsername=props.setUsername;
  var [error,setError]=useState("");
  var next = function() {
    if(!name||!username){setError("Nombre y usuario requeridos");return;}
    onNext();
  };
  return (
    <div style={{flex:1,padding:"22px 20px 32px"}}>
      <div style={{fontSize:20,fontFamily:"'Syne',sans-serif",color:"#1a1a1a",marginBottom:16,fontWeight:700}}>Tu perfil</div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:"#86868b",marginBottom:7,letterSpacing:1}}>NOMBRE</div>
        <input value={name} onChange={function(e){setName(e.target.value);}} placeholder="Maria Fernanda" style={{width:"100%",padding:"13px 16px",background:"#fff",border:"1.5px solid "+(name?"#0066ff":"#e8e8ed"),borderRadius:12,color:"#1a1a1a",fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:"#86868b",marginBottom:7,letterSpacing:1}}>USUARIO</div>
        <input value={username} onChange={function(e){setUsername(e.target.value.toLowerCase());}} placeholder="mariafernanda" style={{width:"100%",padding:"13px 16px",background:"#fff",border:"1.5px solid "+(username?"#0066ff":"#e8e8ed"),borderRadius:12,color:"#1a1a1a",fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      </div>
      {error ? <div style={{background:"#fff0f0",border:"1px solid #ffb3b3",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:"#ff2d2d",fontFamily:"'Inter',sans-serif"}}>{error}</div> : null}
      <div style={{display:"flex",gap:10}}>
        <button onClick={onBack} style={{flex:1,padding:"13px",background:"#fff",border:"1.5px solid #e8e8ed",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,color:"#86868b"}}>Atras</button>
        <button onClick={next} style={{flex:2,padding:"13px",background:"#ffcc00",color:"#1a1a1a",border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>Siguiente</button>
      </div>
    </div>
  );
}

function AuthStep3(props) {
  var onNext=props.onNext, onBack=props.onBack, chosenCity=props.chosenCity, setChosenCity=props.setChosenCity, agreed=props.agreed, setAgreed=props.setAgreed;
  var [error,setError]=useState("");
  var next = function() {
    if(!chosenCity){setError("Selecciona tu ciudad");return;}
    if(!agreed){setError("Debes aceptar los terminos");return;}
    onNext();
  };
  return (
    <div style={{flex:1,padding:"22px 20px 32px",overflowY:"auto"}}>
      <div style={{fontSize:20,fontFamily:"'Syne',sans-serif",color:"#1a1a1a",marginBottom:4,fontWeight:700}}>Tu ciudad</div>
      <div style={{fontSize:13,color:"#86868b",fontFamily:"'Inter',sans-serif",marginBottom:16}}>Tu feed se organiza por ciudad</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {CITIES.map(function(c){
          return (
            <button key={c.id} onClick={function(){setChosenCity(c.id);}} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:chosenCity===c.id?"#fffbea":"#fff",border:"2px solid "+(chosenCity===c.id?"#ffcc00":"#e8e8ed"),borderRadius:12,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:24}}>{toFlag(CITY_FLAGS[c.id])}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontFamily:"'Syne',sans-serif",color:"#1a1a1a"}}>{c.name}</div>
                <div style={{fontSize:10,color:"#86868b",fontFamily:"'Inter',sans-serif"}}>{c.pop}</div>
              </div>
              {chosenCity===c.id ? <span style={{color:"#ffcc00",fontSize:20,fontWeight:700}}>{ICONS.check}</span> : null}
            </button>
          );
        })}
      </div>
      <div onClick={function(){setAgreed(function(a){return !a;});}} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:"#fff",borderRadius:12,border:"1.5px solid "+(agreed?"#1a7a3c":"#e8e8ed"),cursor:"pointer",marginBottom:16}}>
        <div style={{width:22,height:22,borderRadius:6,border:"2px solid "+(agreed?"#1a7a3c":"#e8e8ed"),background:agreed?"#1a7a3c":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{agreed?<span style={{color:"#fff",fontSize:13,fontWeight:700}}>{ICONS.check}</span>:null}</div>
        <div style={{fontSize:12,color:"#86868b",fontFamily:"'Inter',sans-serif",lineHeight:1.5}}>Acepto los <span style={{color:"#0066ff",fontWeight:700}}>Terminos</span> y la <span style={{color:"#0066ff",fontWeight:700}}>Privacidad</span> de Epale</div>
      </div>
      {error ? <div style={{background:"#fff0f0",border:"1px solid #ffb3b3",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:"#ff2d2d",fontFamily:"'Inter',sans-serif"}}>{error}</div> : null}
      <div style={{display:"flex",gap:10}}>
        <button onClick={onBack} style={{flex:1,padding:"13px",background:"#fff",border:"1.5px solid #e8e8ed",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,color:"#86868b"}}>Atras</button>
        <button onClick={next} disabled={!chosenCity||!agreed} style={{flex:2,padding:"13px",background:chosenCity&&agreed?"#ffcc00":"#e8e8ed",color:chosenCity&&agreed?"#1a1a1a":"#86868b",border:"none",borderRadius:100,cursor:chosenCity&&agreed?"pointer":"not-allowed",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>Siguiente</button>
      </div>
    </div>
  );
}

function AuthStep4(props) {
  var onDone=props.onDone, onBack=props.onBack, email=props.email, chosenCity=props.chosenCity;
  var userName=props.userName||"", userPhoto=props.userPhoto, setUserPhoto=props.setUserPhoto||function(){}, password=props.password||"";
  var [verifyCode,setVerifyCode]=useState("");
  var [loading,setLoading]=useState(false);
  var [error,setError]=useState("");
  var DEMO="4782";
  var handlePhoto = function(e){
    var file = e.target.files && e.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){ setUserPhoto(ev.target.result); };
    reader.readAsDataURL(file);
  };
  var finish = function() {
    if(verifyCode!==DEMO){setError("Codigo incorrecto");return;}
    setLoading(true); setError("");
    api.signUp(email, password, userName, chosenCity, userName.toLowerCase().replace(/\s/g,"")).then(function(res) {
      if(res.error && res.error !== "User already registered") {
        setError(res.error_description || res.msg || res.error || "Error al crear cuenta");
        setLoading(false); return;
      }
      var token = (res.session && res.session.access_token) || res.access_token || "";
      var uid = (res.user && res.user.id) || (res.session && res.session.user && res.session.user.id) || "";
      if(token) {
        window._supaToken = token;
        if(uid) api.upsertProfile(uid, userName, chosenCity, userName.toLowerCase().replace(/\s/g,""));
        setLoading(false);
        onDone(chosenCity, userName, userPhoto, token, uid);
      } else {
        api.signIn(email, password).then(function(r2) {
          var t2 = r2.access_token || (r2.session && r2.session.access_token) || "";
          var u2 = (r2.user && r2.user.id) || (r2.session && r2.session.user && r2.session.user.id) || "";
          if(t2) window._supaToken = t2;
          if(u2) api.upsertProfile(u2, userName, chosenCity, userName.toLowerCase().replace(/\s/g,""));
          setLoading(false);
          onDone(chosenCity, userName, userPhoto, t2, u2);
        }).catch(function(){ setLoading(false); onDone(chosenCity, userName, userPhoto, "", ""); });
      }
    }).catch(function(e) {
      setError("Error de conexion"); setLoading(false);
    });
  };
  return (
    <div style={{flex:1,padding:"22px 20px 32px",textAlign:"center"}}>
      <div style={{fontSize:52,marginBottom:10}}>{ICONS.email}</div>
      <div style={{fontSize:20,fontFamily:"'Syne',sans-serif",color:"#1a1a1a",marginBottom:6,fontWeight:700}}>Verifica tu correo</div>
      <div style={{fontSize:13,color:"#86868b",fontFamily:"'Inter',sans-serif",marginBottom:20}}>Codigo enviado a <strong>{email}</strong></div>
      <input value={verifyCode} onChange={function(e){setVerifyCode(e.target.value.replace(/\D/g,"").slice(0,4));}} placeholder="0000" maxLength={4} style={{width:"100%",padding:"18px",background:"#fff",border:"2px solid "+(verifyCode.length===4?(verifyCode===DEMO?"#1a7a3c":"#ff2d2d"):"#e8e8ed"),borderRadius:14,color:"#1a1a1a",fontFamily:"'Inter',sans-serif",fontSize:32,fontWeight:700,outline:"none",boxSizing:"border-box",textAlign:"center",marginBottom:10}}/>
      <div style={{background:"#fffbea",borderRadius:12,padding:"9px 14px",marginBottom:18}}>
        <span style={{fontSize:12,color:"#86868b",fontFamily:"'Inter',sans-serif"}}>Codigo de prueba: </span>
        <span style={{fontSize:12,color:"#ffcc00",fontFamily:"'Inter',sans-serif",fontWeight:700}}>{DEMO}</span>
      </div>
      {error ? <div style={{background:"#fff0f0",border:"1px solid #ffb3b3",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:"#ff2d2d",fontFamily:"'Inter',sans-serif"}}>{error}</div> : null}
      <button onClick={finish} disabled={verifyCode.length!==4} style={{width:"100%",padding:"14px",background:verifyCode.length===4?"#ffcc00":"#e8e8ed",color:verifyCode.length===4?"#1a1a1a":"#86868b",border:"none",borderRadius:100,cursor:verifyCode.length===4?"pointer":"not-allowed",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700,marginBottom:12}}>
        {loading?"Verificando...":"Entrar a Epale"}
      </button>
      <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#0066ff",fontFamily:"'Inter',sans-serif",fontSize:11}}>Volver</button>
    </div>
  );
}

function AuthHero(props) {
  var mode=props.mode, step=props.step;
  return (
    <div style={{background:"#0a0a0a",position:"relative",overflow:"hidden"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:"#ffcc00"}}/><div style={{flex:1,background:"#0066ff"}}/><div style={{flex:1,background:"#ff2d2d"}}/></div>
      <div style={{position:"relative",padding:"36px 24px 28px",textAlign:"center"}}>
        <div style={{fontSize:54,fontFamily:"'Syne',sans-serif",letterSpacing:-2,fontWeight:800,marginBottom:6}}>
          <span style={{color:"#ffcc00"}}>E</span><span style={{color:"#0066ff"}}>pa</span><span style={{color:"#ff2d2d"}}>le</span>
        </div>
        <div style={{fontSize:22}}>{ICONS.flag_ve}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontFamily:"'Inter',sans-serif",marginTop:6}}>venezolanos del mundo</div>
        {mode==="register" ? (
          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1,height:3,borderRadius:2,background:"rgba(255,255,255,0.1)",overflow:"hidden"}}>
              <div style={{height:"100%",width:((step/4)*100)+"%",background:"#ffcc00",borderRadius:2}}/>
            </div>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontFamily:"'Inter',sans-serif"}}>Paso {step}/4</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Auth(props) {
  var onDone=props.onDone;
  var [mode,setMode]=useState("login");
  var [step,setStep]=useState(1);
  var [email,setEmail]=useState("");
  var [password,setPassword]=useState("");
  var [password2,setPassword2]=useState("");
  var [name,setName]=useState("");
  var [username,setUsername]=useState("");
  var [chosenCity,setChosenCity]=useState("");
  var [agreed,setAgreed]=useState(false);
  var [userPhoto,setUserPhoto]=useState(null);
  return (
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
      <AuthHero mode={mode} step={step}/>
      {mode==="login"||step===1 ? (
        <div style={{display:"flex",margin:"18px 20px 0",background:"#fff",borderRadius:100,padding:4,border:"1px solid #e8e8ed"}}>
          {["login","register"].map(function(m){
            return <button key={m} onClick={function(){setMode(m);setStep(1);}} style={{flex:1,padding:"10px 0",borderRadius:100,border:"none",cursor:"pointer",background:mode===m?"#fff":"transparent",color:mode===m?"#1a1a1a":"#86868b",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:mode===m?700:400,boxShadow:mode===m?"0 1px 6px rgba(0,0,0,0.1)":"none"}}>{m==="login"?"Iniciar sesion":"Crear cuenta"}</button>;
          })}
        </div>
      ) : null}
      {mode==="login" ? <AuthLogin onSwitch={function(){setMode("register");}} onDone={onDone}/> : null}
      {mode==="register"&&step===1 ? <AuthStep1 onNext={function(){setStep(2);}} email={email} setEmail={setEmail} password={password} setPassword={setPassword} password2={password2} setPassword2={setPassword2}/> : null}
      {mode==="register"&&step===2 ? <AuthStep2 onNext={function(){setStep(3);}} onBack={function(){setStep(1);}} name={name} setName={setName} username={username} setUsername={setUsername}/> : null}
      {mode==="register"&&step===3 ? <AuthStep3 onNext={function(){setStep(4);}} onBack={function(){setStep(2);}} chosenCity={chosenCity} setChosenCity={setChosenCity} agreed={agreed} setAgreed={setAgreed}/> : null}
      {mode==="register"&&step===4 ? <AuthStep4 onDone={onDone} onBack={function(){setStep(3);}} email={email} chosenCity={chosenCity} userName={name} userPhoto={userPhoto} setUserPhoto={setUserPhoto} password={password}/> : null}
    </div>
  );
}

export default function App() {
  var [dark,setDark]=useState(false);
  var [lang,setLang]=useState("es");
  var [screen,setScreen]=useState(function(){
    try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.token?"feed":"auth"; } catch(e){ return "auth"; }
  });
  var [userCity,setUserCity]=useState(function(){
    try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.city?d.city:"madrid"; } catch(e){ return "madrid"; }
  });
  var [userName,setUserName]=useState(function(){
    try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.name?d.name:""; } catch(e){ return ""; }
  });
  var [userPhoto,setUserPhoto]=useState(function(){
    try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.photo?d.photo:null; } catch(e){ return null; }
  });
  var [userId,setUserId]=useState(function(){
    try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; if(d&&d.token) window._supaToken=d.token; return d&&d.uid?d.uid:""; } catch(e){ return ""; }
  });
  var [showProfile,setShowProfile]=useState(false);
  var [following,setFollowing]=useState([]);
  var [crashMsg,setCrashMsg]=useState("");
  var [activeTab,setActiveTab]=useState("feed");

  var toggleFollow = function(name){ setFollowing(function(f){ return f.includes(name)?f.filter(function(x){return x!==name;}):[].concat(f,[name]); }); };

  var handleDone = function(city, name, photo, token, uid) {
    try {
      var c=city||"madrid", n=name||"", p=photo||null, t=token||"", u=uid||"";
      setUserCity(c); if(n) setUserName(n); if(p) setUserPhoto(p); setUserId(u);
      if(t) { window._supaToken = t; }
      try { localStorage.setItem("epale_session", JSON.stringify({city:c,name:n,photo:p,token:t,uid:u})); } catch(e){}
      if(u && t && !n) {
        api.getProfile(u).then(function(profiles){
          var prof = Array.isArray(profiles) && profiles[0];
          if(prof && prof.name) {
            setUserName(prof.name);
            if(prof.city) setUserCity(prof.city);
            try { localStorage.setItem("epale_session", JSON.stringify({city:prof.city||c,name:prof.name,photo:prof.photo_url||p,token:t,uid:u})); } catch(e){}
          }
        }).catch(function(){});
      }
      setScreen("feed");
    } catch(e) { setCrashMsg("handleDone error: "+e.message); }
  };

  var handleLogout = function() {
    try { localStorage.removeItem("epale_session"); } catch(e){}
    window._supaToken = null;
    setShowProfile(false);
    setScreen("auth");
  };

  if(crashMsg) return (
    <div style={{padding:20,color:"red",fontFamily:"monospace",fontSize:13}}>
      <div style={{fontWeight:700,marginBottom:8}}>Error:</div>
      <div>{crashMsg}</div>
      <button onClick={function(){setCrashMsg("");setScreen("auth");}} style={{marginTop:16,padding:"8px 16px",background:"#ffcc00",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700}}>Reintentar</button>
    </div>
  );

  if(screen==="auth") return <Auth onDone={handleDone}/>;

  if(screen==="feed") return (
    <div>
      {showProfile ? <Profile userCity={userCity} onLogout={handleLogout} onClose={function(){setShowProfile(false);}} onSetDark={setDark} onSetLang={setLang} isDark={dark} currentLang={lang} following={following} onFollow={toggleFollow} userPhoto={userPhoto} userName={userName} onPhotoChange={setUserPhoto} userId={userId}/> : null}
      <Feed userCity={userCity} onProfile={function(){setShowProfile(true);}} following={following} onFollow={toggleFollow} userPhoto={userPhoto} userName={userName} userId={userId}/>
      <div style={{position:"fixed",bottom:0,left:0,right:0,height:60,background:C.card,borderTop:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:90,maxWidth:768,margin:"0 auto",visibility:window.innerWidth>=768?"hidden":"visible"}}>
        {[
          {id:"feed",  icon:ICONS.fire,    label:"Inicio"},
          {id:"search",icon:ICONS.comment, label:"Buscar"},
          {id:"post",  icon:ICONS.pencil,  label:"Publicar", action:true},
          {id:"notifs",icon:ICONS.bell,    label:"Avisos"},
          {id:"me",    icon:ICONS.group,   label:"Yo"}
        ].map(function(tab){
          var isActive = activeTab===tab.id;
          return (
            <button key={tab.id} onClick={function(){
              if(tab.id==="me"){ setShowProfile(true); return; }
              if(tab.id==="post"){ setShowProfile(false); return; }
              setActiveTab(tab.id);
            }} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:tab.action?C.yellow:"none",border:"none",cursor:"pointer",padding:tab.action?"8px 16px":"6px 10px",borderRadius:tab.action?12:8,minWidth:48}}>
              <span style={{fontSize:tab.action?20:18,color:tab.action?C.text:isActive?C.blue:C.muted}}>{tab.icon}</span>
              <span style={{fontSize:9,fontFamily:"'Inter',sans-serif",color:tab.action?C.text:isActive?C.blue:C.muted,fontWeight:isActive?700:400}}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return <div style={{padding:20}}>Cargando...</div>;
}
