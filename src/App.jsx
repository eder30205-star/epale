import { useState, useEffect } from "react";
import React from "react";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://zkydbsymcnnbepvmbchr.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4";

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, storage: window.localStorage }
});

var _onAuthExpired = null;
var _tokenReady = false;
var _tokenReadyCallbacks = [];

var onTokenReady = function(cb) {
  if(_tokenReady) { cb(); return; }
  _tokenReadyCallbacks.push(cb);
};

var resolveTokenReady = function() {
  if(_tokenReady) return;
  _tokenReady = true;
  _tokenReadyCallbacks.forEach(function(cb){ try{ cb(); }catch(e){} });
  _tokenReadyCallbacks = [];
};

var getToken = function(){
  if(window._supaToken && window._supaToken.length > 10) return window._supaToken;
  try {
    var s = localStorage.getItem("epale_session");
    var d = s ? JSON.parse(s) : null;
    if(d && d.token && d.token.length > 10) { window._supaToken = d.token; return d.token; }
  } catch(e){}
  return SUPA_KEY;
};

var fetchAuth = function(url, opts) {
  return fetch(url, opts).then(function(r) {
    if(r.status === 401) { if(_onAuthExpired) _onAuthExpired(); return Promise.reject(new Error("401")); }
    return r;
  });
};

// On startup, ask Supabase SDK for the current session (it auto-refreshes if needed)
supabase.auth.getSession().then(function(res) {
  var session = res.data && res.data.session;
  if(session && session.access_token) {
    window._supaToken = session.access_token;
    try {
      var s = localStorage.getItem("epale_session");
      var d = s ? JSON.parse(s) : {};
      d.token = session.access_token;
      if(session.refresh_token) d.refresh = session.refresh_token;
      localStorage.setItem("epale_session", JSON.stringify(d));
    } catch(e){}
  }
  resolveTokenReady();
}).catch(function() {
  resolveTokenReady();
});

var api = {
  signUp: function(email, password, name, city, username) { return supabase.auth.signUp({email:email,password:password,options:{data:{name:name,city:city,username:username}}}).then(function(res){ return res.data||res; }); },
  signIn: function(email, password) { return supabase.auth.signInWithPassword({email:email,password:password}).then(function(res){ return res.data||res; }); },
  signOut: function() { return supabase.auth.signOut(); },
  upsertProfile: function(id, name, city, username) { return fetchAuth(SUPA_URL+"/rest/v1/profiles",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken(),"Prefer":"resolution=merge-duplicates"},body:JSON.stringify({id:id,name:name,city:city,username:username})}).then(function(r){return r.json();}).catch(function(){}); },
  getProfile: function(id) { return fetchAuth(SUPA_URL+"/rest/v1/profiles?id=eq."+id+"&select=*",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();}); },
  getPosts: function(city) { return fetch(SUPA_URL+"/rest/v1/posts?city=eq."+city+"&select=*&order=created_at.desc&limit=50",{headers:{"apikey":SUPA_KEY}}).then(function(r){return r.json();}); },
  createPost: function(userId, city, type, content, name) { return fetchAuth(SUPA_URL+"/rest/v1/posts",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken(),"Prefer":"return=representation"},body:JSON.stringify({user_id:userId,city:city,type:type,content:content,name:name||"Anonimo"})}).then(function(r){return r.json();}).catch(function(){}); },
  uploadPhoto: function(uid, base64data) {
    var blob=(function(){ var parts=base64data.split(","); var mime=parts[0].match(/:(.*?);/)[1]; var raw=atob(parts[1]); var arr=new Uint8Array(raw.length); for(var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i); return new Blob([arr],{type:mime}); })();
    return fetchAuth(SUPA_URL+"/storage/v1/object/avatars/"+uid+".jpg",{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken(),"Content-Type":"image/jpeg","x-upsert":"true"},body:blob}).then(function(r){return r.json();}).then(function(res){ if(res.Key) return SUPA_URL+"/storage/v1/object/public/avatars/"+uid+".jpg"; return null; }).catch(function(){ return null; });
  },
  updateProfile: function(uid, name, city, username, photoUrl, bio) {
    var body={id:uid,name:name,city:city,username:username}; if(photoUrl) body.photo_url=photoUrl; if(bio) body.bio=bio;
    return fetchAuth(SUPA_URL+"/rest/v1/profiles?id=eq."+uid,{method:"PATCH",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken(),"Prefer":"return=representation"},body:JSON.stringify(body)}).then(function(r){return r.json();}).catch(function(){});
  },
  getFollowing: function(uid) { return fetchAuth(SUPA_URL+"/rest/v1/follows?follower_id=eq."+uid+"&select=following_name",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();}); },
  follow: function(uid, name) { return fetchAuth(SUPA_URL+"/rest/v1/follows",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken(),"Prefer":"resolution=merge-duplicates"},body:JSON.stringify({follower_id:uid,following_name:name})}).then(function(r){return r.json();}).catch(function(){}); },
  unfollow: function(uid, name) { return fetchAuth(SUPA_URL+"/rest/v1/follows?follower_id=eq."+uid+"&following_name=eq."+encodeURIComponent(name),{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();}).catch(function(){}); },
  getSaved: function(uid) { return fetchAuth(SUPA_URL+"/rest/v1/saved_posts?user_id=eq."+uid+"&select=post_id",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();}); },
  savePost: function(uid, postId) { return fetchAuth(SUPA_URL+"/rest/v1/saved_posts",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken(),"Prefer":"resolution=merge-duplicates"},body:JSON.stringify({user_id:uid,post_id:String(postId)})}).then(function(r){return r.json();}).catch(function(){}); },
  unsavePost: function(uid, postId) { return fetchAuth(SUPA_URL+"/rest/v1/saved_posts?user_id=eq."+uid+"&post_id=eq."+String(postId),{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();}).catch(function(){}); },
  getLikes: function(uid) { return fetchAuth(SUPA_URL+"/rest/v1/likes?user_id=eq."+uid+"&select=post_id",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();}); },
  likePost: function(uid, postId) { return fetchAuth(SUPA_URL+"/rest/v1/likes",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken(),"Prefer":"resolution=merge-duplicates"},body:JSON.stringify({user_id:uid,post_id:String(postId)})}).then(function(r){return r.json();}).catch(function(){}); },
  unlikePost: function(uid, postId) { return fetchAuth(SUPA_URL+"/rest/v1/likes?user_id=eq."+uid+"&post_id=eq."+String(postId),{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();}).catch(function(){}); },
  getUserPosts: function(uid) { return fetchAuth(SUPA_URL+"/rest/v1/posts?user_id=eq."+uid+"&select=*&order=created_at.desc",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();}); },
  addComment: function(postId, userId, userName, content) { return fetchAuth(SUPA_URL+"/rest/v1/comments",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken(),"Prefer":"return=representation"},body:JSON.stringify({post_id:String(postId),user_id:userId,user_name:userName,content:content})}).then(function(r){return r.json();}).catch(function(){}); },
  getNotifications: function(userId) { return fetchAuth(SUPA_URL+"/rest/v1/notifications?user_id=eq."+userId+"&select=*&order=created_at.desc&limit=20",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();}); },
  addNotification: function(userId, fromName, type, postId) { return fetchAuth(SUPA_URL+"/rest/v1/notifications",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()},body:JSON.stringify({user_id:userId,from_name:fromName,type:type,post_id:String(postId)})}).then(function(r){return r.json();}).catch(function(){}); },
  markNotifsRead: function(userId) { return fetchAuth(SUPA_URL+"/rest/v1/notifications?user_id=eq."+userId,{method:"PATCH",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()},body:JSON.stringify({read:true})}).then(function(r){return r.json();}).catch(function(){}); },
  searchPosts: function(query) { var q=encodeURIComponent(query); return fetch(SUPA_URL+"/rest/v1/posts?or=(content.ilike.*"+q+"*,name.ilike.*"+q+"*)&select=*&order=created_at.desc&limit=30",{headers:{"apikey":SUPA_KEY}}).then(function(r){return r.json();}); },
  changePassword: function(newPassword) { return fetchAuth(SUPA_URL+"/auth/v1/user",{method:"PUT",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()},body:JSON.stringify({password:newPassword})}).then(function(r){return r.json();}).catch(function(){ return {error:{message:"Error"}}; }); },
  resetPassword: function(email) { return fetch(SUPA_URL+"/auth/v1/recover",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY},body:JSON.stringify({email:email})}).then(function(r){return r.json();}); },
  getDollarRate: function() { return fetch("https://ve.dolarapi.com/v1/dolares",{headers:{"Accept":"application/json"}}).then(function(r){return r.json();}).catch(function(){ return null; }); },
  getProfileByName: function(name) {
    return fetch(SUPA_URL+"/rest/v1/profiles?name=eq."+encodeURIComponent(name)+"&select=*",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();});
  },
  getPostsByName: function(name) {
    return fetch(SUPA_URL+"/rest/v1/posts?name=eq."+encodeURIComponent(name)+"&select=*&order=created_at.desc&limit=30",{headers:{"apikey":SUPA_KEY}}).then(function(r){return r.json();});
  }
};

const LIGHT={bg:"#f5f5f7",card:"#ffffff",border:"#e8e8ed",yellow:"#ffcc00",blue:"#0066ff",red:"#ff2d2d",text:"#1a1a1a",muted:"#86868b",green:"#1a7a3c",wa:"#25D366"};
const DARK={bg:"#0d0d12",card:"#18181f",border:"#2a2a38",yellow:"#ffd60a",blue:"#60a5fa",red:"#f87171",text:"#ffffff",muted:"#a0a0b0",green:"#4ade80",wa:"#25D366"};
var T={es:{forYou:"Para ti",following:"Siguiendo",todos:"Todos",post:"Post",trabajo:"Trabajo",vivienda:"Vivienda",servicio:"Servicio",ayuda:"Ayuda",evento:"Evento",publicar:"+ Publicar",verPerfil:"Ver perfil",invitar:"Invitar por WhatsApp",invitaVene:"Invita venezolanos a",invitaTusP:"Invita a tus panas",trending:"Trending",venezolanos:"Venezolanos en",compartir:"Compartir en WhatsApp",enviaPost:"Envia este post a tus panas",guardar:"Guardar",guardado:"Guardado",seguir:"Seguir",siguiendo:"Siguiendo",misPubl:"Mis publicaciones",guardados:"Guardados",notifs:"Notificaciones",config:"Configuracion",proxEventos:"Proximos eventos",nueva:"Nueva publicacion",foto:"Foto",video:"Video",camara:"Camara",publicarBtn:"Publicar",publicando:"Publicando...",terminos:"Terminos",privacidad:"Privacidad",contacto:"Contacto",cerrarSesion:"Cerrar Sesion"},en:{forYou:"For you",following:"Following",todos:"All",post:"Post",trabajo:"Jobs",vivienda:"Housing",servicio:"Services",ayuda:"Help",evento:"Events",publicar:"+ Post",verPerfil:"View profile",invitar:"Invite via WhatsApp",invitaVene:"Invite Venezuelans to",invitaTusP:"Invite your friends",trending:"Trending",venezolanos:"Venezuelans in",compartir:"Share on WhatsApp",enviaPost:"Send this post to your friends",guardar:"Save",guardado:"Saved",seguir:"Follow",siguiendo:"Following",misPubl:"My posts",guardados:"Saved",notifs:"Notifications",config:"Settings",proxEventos:"Upcoming events",nueva:"New post",foto:"Photo",video:"Video",camara:"Camera",publicarBtn:"Post",publicando:"Posting...",terminos:"Terms",privacidad:"Privacy",contacto:"Contact",cerrarSesion:"Sign out"}};
var ICONS={heart:"\u2764\uFE0F",heartEmpty:"\uD83E\uDD0D",comment:"\uD83D\uDCAC",bookmark:"\uD83D\uDD16",phone:"\uD83D\uDCF1",dollar:"\uD83D\uDCB5",fire:"\uD83D\uDD25",pencil:"\u270F\uFE0F",briefcase:"\uD83D\uDCBC",house:"\uD83C\uDFE0",wrench:"\uD83D\uDD27",handshake:"\uD83E\uDD1D",bell:"\uD83D\uDD14",gear:"\u2699\uFE0F",eye:"\uD83D\uDC41\uFE0F",photo:"\uD83D\uDDBC\uFE0F",video:"\uD83C\uDFAC",camera:"\uD83D\uDCF7",notepad:"\uD83D\uDCDD",check:"\u2705",key:"\uD83D\uDD11",email:"\uD83D\uDCE7",group:"\uD83D\uDC65",flag_ve:"\uD83C\uDDFB\uD83C\uDDEA",share:"\u2197\uFE0F",like_on:"\u2764\uFE0F",like_off:"\uD83E\uDD0D"};
var _theme=LIGHT; var C=LIGHT;
const CITIES=[{id:"madrid",name:"Espana",flag:"ES",pop:"280K venezolanos"},{id:"miami",name:"USA",flag:"US",pop:"350K venezolanos"},{id:"bogota",name:"Colombia",flag:"CO",pop:"600K venezolanos"},{id:"santiago",name:"Chile",flag:"CL",pop:"150K venezolanos"},{id:"lima",name:"Peru",flag:"PE",pop:"130K venezolanos"},{id:"buenos",name:"Argentina",flag:"AR",pop:"90K venezolanos"},{id:"quito",name:"Ecuador",flag:"EC",pop:"70K venezolanos"},{id:"panama",name:"Panama",flag:"PA",pop:"55K venezolanos"},{id:"caracas",name:"Venezuela",flag:"VE",pop:"Capital"},{id:"portugal",name:"Portugal",flag:"PT",pop:"40K venezolanos"},{id:"italia",name:"Italia",flag:"IT",pop:"35K venezolanos"},{id:"canada",name:"Canada",flag:"CA",pop:"30K venezolanos"}];
const CITY_FLAGS={madrid:"ES",miami:"US",bogota:"CO",santiago:"CL",lima:"PE",buenos:"AR",quito:"EC",panama:"PA",caracas:"VE",portugal:"PT",italia:"IT",canada:"CA"};
const toFlag=function(code){ if(!code) return ""; var a=code.toUpperCase().charCodeAt(0)-65+127462; var b=code.toUpperCase().charCodeAt(1)-65+127462; return String.fromCodePoint(a)+String.fromCodePoint(b); };
const getCity=function(id){ return CITIES.find(function(c){ return c.id===id; })||CITIES[0]; };
const TYPES={post:{label:"Post",icon:ICONS.pencil,badgeBg:null},job:{label:"Trabajo",icon:ICONS.briefcase,badgeBg:"#ffcc00",badgeFg:"#1a1a1a"},housing:{label:"Vivienda",icon:ICONS.house,badgeBg:"#1a4fa0",badgeFg:"#fff"},service:{label:"Servicio",icon:ICONS.wrench,badgeBg:"#1a7a3c",badgeFg:"#fff"},help:{label:"Ayuda",icon:ICONS.handshake,badgeBg:"#cc2200",badgeFg:"#fff"},evento:{label:"Evento",icon:ICONS.bell,badgeBg:"#7b2d8b",badgeFg:"#fff"}};
const GR=["linear-gradient(135deg,#ffcc00,#1a4fa0)","linear-gradient(135deg,#1a4fa0,#cc2200)","linear-gradient(135deg,#cc2200,#ffcc00)","linear-gradient(135deg,#1a7a3c,#1a4fa0)","linear-gradient(135deg,#ffcc00,#cc2200)","linear-gradient(135deg,#1a4fa0,#1a7a3c)"];
const SEED=[
{id:1,city:"madrid",type:"job",name:"Carlos Mendez",av:"CM",content:"Restaurante venezolano en Lavapies busca cocinero con experiencia. Contrato en regla, 1.200 euros/mes. Escribir al WhatsApp.",likes:34,comments:12,time:"5 min"},
{id:2,city:"madrid",type:"post",name:"Andreina Soto",av:"AS",content:"Tres anos en Madrid y por fin siento que tengo un hogar aqui. No fue facil pero tampoco imposible. Para los recien llegados: si se puede.",likes:189,comments:47,time:"18 min"},
{id:3,city:"madrid",type:"housing",name:"Luis Herrera",av:"LH",content:"Alquilo habitacion en piso compartido, zona Carabanchel. 400 euros/mes todo incluido. Ambiente venezolano.",likes:21,comments:18,time:"32 min"},
{id:4,city:"madrid",type:"post",name:"Mariela Campos",av:"MC",content:"Alguien sabe donde consigo harina PAN en Madrid que no cueste un ojo de la cara? Pregunto para un amigo (soy yo).",likes:312,comments:89,time:"45 min"},
{id:5,city:"madrid",type:"service",name:"Pedro Rivas",av:"PR",content:"Abogado venezolano con 8 anos en Espana. Tramites de extranjeria, NIE, residencia. Primera consulta gratuita.",likes:56,comments:23,time:"1h"},
{id:6,city:"madrid",type:"help",name:"Yolanda Torres",av:"YT",content:"Llevo dos semanas buscando trabajo en Madrid, tengo carrera en administracion y 5 anos de experiencia. Agradezco cualquier oportunidad.",likes:67,comments:34,time:"2h"},
{id:7,city:"madrid",type:"post",name:"Roberto Diaz",av:"RD",content:"El frio de Madrid en invierno me recuerda por que Venezuela siempre sera mi paraiso. Pero este pais me ha dado tanto.",likes:445,comments:112,time:"3h"},
{id:8,city:"madrid",type:"post",name:"Freddy Castillo",av:"FC",content:"Vamos a organizar una rumba venezolana este sabado en Usera. Cachapas, caraotas, musica de los 2000. Avisense!",likes:567,comments:203,time:"4h"},
{id:9,city:"miami",type:"post",name:"Miguel Angel",av:"MA",content:"Miami tiene algo que ninguna ciudad tiene: te hace sentir que todo es posible. Llegue con poco y hoy tengo mi propio negocio.",likes:892,comments:234,time:"22 min"},
{id:10,city:"miami",type:"job",name:"Alejandra Nunez",av:"AN",content:"Hair salon en Doral busca estilista venezolana con experiencia. Excelente comision mas clientela establecida.",likes:43,comments:19,time:"41 min"},
{id:11,city:"miami",type:"housing",name:"Carolina Perez",av:"CP",content:"Busco roommate venezolana en Doral o Kendall. Cuarto disponible, 750 dolares/mes utilities incluidas.",likes:31,comments:27,time:"1h"},
{id:12,city:"miami",type:"post",name:"Daniel Romero",av:"DR",content:"Doral ya deberia llamarse Venezuela Norte. Aqui encuentras arepas, mandoca, chicha... lo unico que falta es el calor de verdad.",likes:1204,comments:345,time:"2h"},
{id:13,city:"miami",type:"post",name:"Valentina Ramos",av:"VR",content:"5 anos en Miami y todavia lloro con el Himno Nacional. La nostalgia nunca se va del todo. Pero hoy mi hija habla ingles y espanol perfecto.",likes:2341,comments:567,time:"4h"},
{id:14,city:"bogota",type:"post",name:"Valentina Cruz",av:"VC",content:"Bogota tiene 7 millones de personas y yo ya reconozco venezolanos en el metro con solo mirarlos. Algo en la sonrisa, la manera de saludar.",likes:567,comments:145,time:"3 min"},
{id:15,city:"bogota",type:"job",name:"Comercio Chapinero",av:"CC",content:"Tienda de ropa en Chapinero busca vendedor. Horario partido, sueldo minimo mas comision. Venezolanos bienvenidos.",likes:34,comments:28,time:"19 min"},
{id:16,city:"bogota",type:"post",name:"Nelson Perez",av:"NP",content:"Somos 500 mil venezolanos en Colombia. La diaspora mas grande. Organizados somos una fuerza. Desorganizados somos ruido.",likes:4567,comments:1234,time:"3h"},
{id:17,city:"bogota",type:"post",name:"Diana Morales",av:"DM",content:"Para los venezolanos que llegan solos a Bogota: busquen su gente. Hay grupos, comunidad, personas que ya pasaron por lo mismo.",likes:6789,comments:1567,time:"5h"},
{id:18,city:"santiago",type:"post",name:"Nathaly Gomez",av:"NG",content:"Santiago tiene las mejores montanas nevadas de fondo. Venezuela me dio el alma y Chile me esta dando las alas.",likes:234,comments:67,time:"11 min"},
{id:19,city:"santiago",type:"post",name:"Raul Jimenez",av:"RJ",content:"Hoy me dieron la ciudadania chilena. Llore. No porque deje de ser venezolano, sino porque despues de tanto sacrificio alguien dice: bienvenido.",likes:5678,comments:1234,time:"2h"},
{id:20,city:"lima",type:"post",name:"Rafael Mora",av:"RM",content:"Tres anos en Lima. La ciudad que mas me ha retado y mas me ha hecho crecer. Los peruanos en el fondo son bien buenos.",likes:445,comments:123,time:"7 min"},
{id:21,city:"lima",type:"post",name:"Simon Pacheco",av:"SP",content:"Cinco palabras para los venezolanos en Lima: ustedes ya son peruanos tambien. Esta ciudad los adopto.",likes:2345,comments:567,time:"5h"},
{id:80,city:"portugal",type:"post",name:"Carlos Vidal",av:"CV",content:"Lisboa me recibio con los brazos abiertos. Los portugueses tienen algo especial, una calidez que me recuerda a Venezuela. Ya van 2 anos aqui.",likes:345,comments:89,time:"1h"},
{id:81,city:"portugal",type:"job",name:"Tech Lisboa",av:"TL",content:"Empresa de tecnologia en Lisboa busca desarrolladores venezolanos. React, Python. Visa patrocinada. Excelente ambiente.",likes:67,comments:34,time:"3h"},
{id:82,city:"italia",type:"post",name:"Gabriela Funes",av:"GF",content:"Roma es una ciudad que te cambia para siempre. Llege sin saber italiano y hoy trabajo en un restaurante del centro historico.",likes:456,comments:123,time:"2h"},
{id:83,city:"italia",type:"service",name:"Abog. Milano",av:"AM",content:"Abogado venezolano en Milan. Permisos de residencia, ciudadania italiana por descendencia. Consulta gratuita.",likes:89,comments:45,time:"4h"},
{id:84,city:"canada",type:"post",name:"Pedro Montoya",av:"PM",content:"Toronto en invierno es otro nivel de frio. Pero la calidad de vida, las oportunidades y la seguridad hacen que valga cada grado bajo cero.",likes:567,comments:145,time:"1h"},
{id:85,city:"canada",type:"job",name:"Canada VE Jobs",av:"CJ",content:"Buscamos venezolanos con experiencia en construccion para trabajar en Calgary. Visa de trabajo disponible. Salario muy competitivo.",likes:123,comments:67,time:"2h"},
{id:90,city:"madrid",type:"evento",name:"Epale Madrid",av:"EM",content:"Gran Rumba Venezolana este sabado en Usera! Cachapas, caraotas, pepitos y musica venezolana de los 2000. Entrada libre. 8pm en adelante.",likes:234,comments:89,time:"1h"},
{id:91,city:"miami",type:"evento",name:"Venezuela Miami",av:"VM",content:"Festival Venezuela en Miami este domingo en Doral. Gastronomia, cultura, musica en vivo. Traigan a la familia. Entrada gratuita.",likes:567,comments:145,time:"2h"},
{id:92,city:"bogota",type:"evento",name:"VE Bogota",av:"VB",content:"Encuentro de venezolanos en Bogota este fin de semana. Arepas, empanadas y mucha nostalgia. Todos bienvenidos en el Parque El Virrey.",likes:389,comments:112,time:"3h"},
{id:93,city:"santiago",type:"evento",name:"Vzla Santiago",av:"VS",content:"Noche venezolana en Santiago! Este viernes en Barrio Italia. DJ, comida tipica y concurso de joropo. No se lo pierdan.",likes:445,comments:134,time:"4h"},
{id:94,city:"buenos",type:"evento",name:"VE Buenos Aires",av:"VA",content:"Primer festival venezolano en Buenos Aires. Palermo, sabado 3pm. Gaita, salsa, comida y mucho pabillon criollo.",likes:678,comments:201,time:"5h"},
{id:22,city:"caracas",type:"post",name:"Luis Miguel",av:"LM",content:"Buenos dias desde Caracas. El Avila amanecio despejado hoy. Para los que estan lejos: la ciudad sigue siendo bella aunque este herida.",likes:8901,comments:2345,time:"2 min"},
{id:23,city:"caracas",type:"post",name:"Gabriela Castro",av:"GC",content:"Hoy hubo luz todo el dia en mi barrio. Eso en Caracas es noticia. A veces la felicidad es corriente electrica continua.",likes:12345,comments:3456,time:"48 min"},
{id:24,city:"caracas",type:"post",name:"Profesora Ana",av:"PA",content:"Doy clases en escuela publica de Petare. 28 alumnos, ningun libro, tres meses sin sueldo. Sigo yendo porque alguien tiene que ir.",likes:34567,comments:8901,time:"3h"},
{id:25,city:"miami",type:"post",name:"Maria Garcia",av:"MG",content:"Orlando tiene algo especial para los venezolanos. La comunidad aqui es muy unida y siempre hay alguien que te ayuda cuando llegas.",likes:234,comments:67,time:"15 min"},
{id:26,city:"miami",type:"job",name:"Empresa VE-FL",av:"EV",content:"Buscamos repartidores en Orlando area. Horario flexible, pago semanal. Venezolanos bienvenidos, no requiere experiencia.",likes:45,comments:23,time:"1h"}
];
const SAMPLE_USERS=[{name:"Carlos Mendez",av:"CM",city:"madrid",bio:"Maracucho en Madrid"},{name:"Andreina Lopez",av:"AL",city:"miami",bio:"Caraquena en Miami"},{name:"Jose Rodriguez",av:"JR",city:"santiago",bio:"Del Zulia para el mundo"},{name:"Valentina Cruz",av:"VC",city:"bogota",bio:"Venezolana en Colombia"},{name:"Rafael Mora",av:"RM",city:"lima",bio:"Tres anos en Lima"}];
const waShare=function(post,cityId){ var txt=post.name+" en Epale "+cityId+": "+post.content.slice(0,100)+"... Unete: https://epaleapp.online/"+cityId; return "https://wa.me/?text="+encodeURIComponent(txt); };
const waInvite=function(cityId){ var txt="Epale pana! Estoy en Epale, la red de venezolanos en "+cityId+". Unete: https://epaleapp.online/"+cityId; return "https://wa.me/?text="+encodeURIComponent(txt); };
var formatTime=function(ts){ if(!ts) return ""; if(typeof ts==="string"&&!ts.includes("T")&&!ts.includes("-")) return ts; var tsFixed=(typeof ts==="string"&&ts.includes("T")&&!ts.includes("Z")&&!ts.includes("+"))?ts+"Z":ts; var d=new Date(tsFixed); if(isNaN(d.getTime())) return ts; var now=new Date(); var diff=Math.floor((now-d)/1000); if(diff<0) diff=0; if(diff<60) return "ahora"; if(diff<3600) return Math.floor(diff/60)+"min"; if(diff<86400) return Math.floor(diff/3600)+"h"; if(diff<604800) return Math.floor(diff/86400)+"d"; return d.getDate()+"/"+(d.getMonth()+1)+"/"+d.getFullYear(); };

function Av(props) {
  var t=props.t||"?",i=props.i||0,s=props.s||40,photo=props.photo;
  var letter=t?t[0].toUpperCase():"?";
  if(photo&&photo.length>5) return (<div style={{width:s,height:s,borderRadius:9999,overflow:"hidden",flexShrink:0,border:"2px solid "+C.border}}><img src={photo} alt="av" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={function(e){e.target.style.display="none";}}/></div>);
  return <div style={{width:s,height:s,borderRadius:9999,background:GR[i%GR.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:s*0.38,fontWeight:700,color:"#fff",flexShrink:0,fontFamily:"'Syne',sans-serif"}}>{letter}</div>;
}
function Stripe() { return <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>; }

function SessionExpiredBanner(props) {
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,background:"#ff2d2d",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
      <div>
        <div style={{color:"#fff",fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700}}>Sesion expirada</div>
        <div style={{color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif",fontSize:12,marginTop:2}}>Vuelve a iniciar sesion para continuar</div>
      </div>
      <button onClick={props.onLogin} style={{background:"#fff",border:"none",borderRadius:100,padding:"8px 18px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,color:"#ff2d2d",flexShrink:0}}>Entrar</button>
    </div>
  );
}

function PostCard(props) {
  var post=props.post,idx=props.idx,cityObj=props.cityObj,saved=props.saved,onSave=props.onSave,following=props.following||[],onFollow=props.onFollow,userName=props.userName||"",liked=props.liked||false,onLike=props.onLike||function(){},likedLoaded=props.likedLoaded||false;
  var TR=T[props.lang||"es"]||T.es;
  var [likeProcessing,setLikeProcessing]=useState(false);
  var [likedLocal,setLikedLocal]=useState(false);
  var [likes,setLikes]=useState(post.likes||0);
  var syncedRef=React.useRef(false);
  useEffect(function(){
    // Sync liked state from parent once after likedPosts loads
    // Don't touch likes count here — post.likes from DB already reflects reality
    if(!syncedRef.current) {
      syncedRef.current=true;
      setLikedLocal(liked);
    }
  },[liked]);
  var [open,setOpen]=useState(false);
  var [comment,setComment]=useState("");
  var [comments,setComments]=useState([]);
  var commentInputRef=React.useRef(null);
  var [showMenu,setShowMenu]=useState(false);
  var [blocked,setBlocked]=useState(false);
  var [showFlag,setShowFlag]=useState(false);
  var [flagDone,setFlagDone]=useState(false);
  var t=TYPES[post.type]||TYPES.post;
  var sendComment=function(){
    if(!comment.trim()) return;
    var newC={id:Date.now(),post_id:String(post.id),user_name:userName,content:comment,created_at:new Date().toISOString()};
    setComments(function(c){return c.concat([newC]);}); setComment("");
    var uid=props.userId||(function(){ try{var d=JSON.parse(localStorage.getItem("epale_session")); return d&&d.uid?d.uid:"";}catch(e){return "";} })();
    if(uid){ api.addComment(post.id,uid,userName,comment).catch(function(){}); if(post.user_id&&post.user_id!==uid) api.addNotification(post.user_id,userName||"Alguien","comment",post.id).catch(function(){}); }
  };
  return (
    <div style={{background:blocked?"#f9f9f9":C.card,borderBottom:"1px solid "+C.border,opacity:blocked?0.6:1}}>
      {blocked?(<div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Contenido oculto.</span><button onClick={function(){setBlocked(false);}} style={{background:"none",border:"1px solid "+C.border,borderRadius:100,padding:"5px 14px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:11,color:C.blue,fontWeight:600}}>Desbloquear</button></div>):(
        <div style={{padding:"14px 14px 0"}}>
          {t.badgeBg?<div style={{display:"inline-flex",background:t.badgeBg,borderRadius:20,padding:"3px 10px",marginBottom:8}}><span style={{fontSize:11,fontWeight:700,color:t.badgeFg,fontFamily:"'Inter',sans-serif"}}>{t.icon} {t.label}</span></div>:null}
          <div style={{display:"flex",gap:12,marginBottom:10}}>
            <Av t={post.av} i={idx} s={42}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span onClick={function(){ if(props.onOpenProfile) props.onOpenProfile(post.name); }} style={{fontWeight:700,fontSize:15,fontFamily:"'Syne',sans-serif",color:C.text,cursor:"pointer"}}>{post.name}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {post.name!=="Tu"&&post.name!==userName&&onFollow?(<button onClick={function(){onFollow(post.name);}} style={{padding:"8px 14px",minHeight:36,borderRadius:100,border:"1.5px solid "+(following.includes(post.name)?C.border:C.blue),background:"transparent",color:following.includes(post.name)?C.muted:C.blue,fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>{following.includes(post.name)?TR.siguiendo:TR.seguir}</button>):null}
                  <button onClick={function(){setShowMenu(function(m){return !m;});}} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:20,padding:"4px 10px",minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>...</button>
                </div>
              </div>
              <div style={{fontSize:11,color:C.blue,fontFamily:"'Inter',sans-serif",fontWeight:600,marginTop:1}}>{cityObj?cityObj.flag:""} {cityObj?cityObj.name:""}<span style={{color:C.muted,fontWeight:400}}> - {formatTime(post.time||post.created_at)}</span></div>
            </div>
          </div>
          {showMenu?(<div style={{background:C.bg,borderRadius:12,border:"1px solid "+C.border,marginBottom:10,overflow:"hidden"}}>
            {post.name!=="Tu"&&post.name!==userName&&onFollow?(<button onClick={function(){onFollow(post.name);setShowMenu(false);}} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:"1px solid "+C.border,cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",fontSize:14,color:C.text,display:"flex",alignItems:"center",gap:10}}><span>{following.includes(post.name)?"Dejar de seguir":TR.seguir}</span></button>):null}
            {post.name!=="Tu"&&post.name!==userName?(<button onClick={function(){setBlocked(true);setShowMenu(false);}} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:"1px solid "+C.border,cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",fontSize:14,color:C.red,display:"flex",alignItems:"center",gap:10}}><span>Bloquear usuario</span></button>):null}
            <button onClick={function(){setShowFlag(true);setShowMenu(false);}} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:"1px solid "+C.border,cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",fontSize:14,color:C.red,display:"flex",alignItems:"center",gap:10}}><span>Reportar publicacion</span></button>
            <button onClick={function(){setShowMenu(false);}} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",fontSize:14,color:C.muted}}>Cancelar</button>
          </div>):null}
          {showFlag?(<div style={{background:C.bg,borderRadius:12,border:"1px solid "+C.border,marginBottom:10,padding:"14px 16px"}}>
            {flagDone?(<div style={{textAlign:"center",padding:"10px 0"}}><div style={{fontSize:32,marginBottom:8}}>{ICONS.check}</div><div style={{fontSize:14,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:4}}>Reporte enviado</div><div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:12}}>Revisaremos en menos de 24 horas</div><button onClick={function(){setShowFlag(false);setFlagDone(false);}} style={{padding:"8px 20px",background:C.blue,color:"#fff",border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:700}}>Listo</button></div>):(
              <div><div style={{fontSize:14,fontWeight:700,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:12}}>Reportar publicacion</div>
                {["Contenido sexual o inapropiado","Acoso o bullying","Discurso de odio","Informacion falsa","Spam o publicidad","Otro motivo"].map(function(r,i){ return <button key={i} onClick={function(){setFlagDone(true);}} style={{width:"100%",padding:"10px 0",background:"none",border:"none",borderBottom:"1px solid "+C.border,cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",fontSize:13,color:C.text,display:"block",marginBottom:2}}>{r}</button>; })}
                <button onClick={function(){setShowFlag(false);}} style={{marginTop:8,padding:"6px 14px",background:"none",border:"1px solid "+C.border,borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,color:C.muted}}>Cancelar</button>
              </div>
            )}
          </div>):null}
          <p style={{fontSize:15,lineHeight:1.6,color:C.text,margin:"0 0 12px",fontFamily:"'Inter',sans-serif"}}>{post.content}</p>
          {post.media?(<div style={{borderRadius:12,overflow:"hidden",marginBottom:10,border:"1px solid "+C.border}}>{post.media.kind==="image"?<img src={post.media.src} alt="post" style={{width:"100%",maxHeight:280,objectFit:"cover",display:"block"}}/>:<video src={post.media.src} controls style={{width:"100%",maxHeight:280,display:"block"}}/>}</div>):null}
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <button onClick={function(){ if(likeProcessing) return; setLikeProcessing(true); var nl=!likedLocal; setLikedLocal(nl); setLikes(function(l){return nl?Math.max(0,l+1):Math.max(0,l-1);}); onLike(post.id); setTimeout(function(){setLikeProcessing(false);},1000); }} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",minHeight:44,background:likedLocal?"#fff0f0":C.bg,border:"1px solid "+(likedLocal?"#ffb3b3":C.border),borderRadius:100,cursor:likeProcessing?"not-allowed":"pointer",color:likedLocal?C.red:C.muted,fontFamily:"'Inter',sans-serif",fontSize:13,opacity:likeProcessing?0.5:1}}>
              {likedLocal?ICONS.like_on:ICONS.like_off} {likes.toLocaleString()}
            </button>
            <button onClick={function(){setOpen(function(o){return !o;});}} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",minHeight:44,background:open?"#e8f0fc":C.bg,border:"1px solid "+(open?"#b3c8ff":C.border),borderRadius:100,cursor:"pointer",color:open?C.blue:C.muted,fontFamily:"'Inter',sans-serif",fontSize:13}}>
              {ICONS.comment} {(post.comments+comments.length).toLocaleString()}
            </button>
            <button onClick={function(){if(onSave) onSave(post.id);}} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",minHeight:44,background:saved?C.card:C.bg,border:"1px solid "+(saved?C.yellow:C.border),borderRadius:100,cursor:"pointer",color:saved?C.yellow:C.muted,fontFamily:"'Inter',sans-serif",fontSize:13,marginLeft:"auto"}}>
              {saved?TR.guardado:TR.guardar}
            </button>
          </div>
          <a href={waShare(post,cityObj?cityObj.id:"ve")} target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:C.wa,borderRadius:12,cursor:"pointer"}}>
              <span style={{fontSize:20}}>{ICONS.phone}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif"}}>Compartir en WhatsApp</div><div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontFamily:"'Inter',sans-serif"}}>Envia este post a tus panas</div></div>
              <span style={{color:"rgba(255,255,255,0.7)",fontSize:16}}>{"->"}</span>
            </div>
          </a>
        </div>
      )}
      {open&&!blocked?(<div style={{borderTop:"1px solid "+C.border,padding:"10px 14px"}}>
        {comments.map(function(c,i){
          var cName=typeof c==="string"?userName:(c.user_name||"?");
          var cText=typeof c==="string"?c:c.content;
          var cTime=typeof c==="object"?formatTime(c.created_at):"";
          var isReply=cText&&cText.startsWith("@");
          return (
            <div key={i} style={{display:"flex",gap:8,marginBottom:8,marginLeft:isReply?28:0}}>
              <Av t={cName} i={i} s={isReply?22:26}/>
              <div style={{background:C.bg,borderRadius:10,padding:"5px 10px",flex:1,border:"1px solid "+C.border}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.blue,fontFamily:"'Inter',sans-serif"}}>{"@"+cName.toLowerCase().replace(/\s/g,"")}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    {cTime?<span style={{fontSize:9,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{cTime}</span>:null}
                    <button onClick={function(){ var handle="@"+cName.toLowerCase().replace(/\s/g,"")+" "; setComment(handle); setTimeout(function(){ if(commentInputRef.current){ commentInputRef.current.focus(); commentInputRef.current.setSelectionRange(handle.length,handle.length); } },50); }} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontFamily:"'Inter',sans-serif",fontSize:10,padding:0,fontWeight:600}}>↩ Responder</button>
                  </div>
                </div>
                <div style={{fontSize:13,color:C.text,fontFamily:"'Inter',sans-serif",marginTop:2}}>{cText}</div>
              </div>
            </div>
          );
        })}
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
          <input ref={commentInputRef} value={comment} onChange={function(e){setComment(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendComment();}}} placeholder="Comenta..." style={{flex:1,padding:"12px 14px",background:C.bg,border:"1px solid "+(comment.startsWith("@")?C.blue:C.border),borderRadius:20,fontFamily:"'Inter',sans-serif",fontSize:16,color:C.text,outline:"none"}}/>
          <button onClick={sendComment} style={{background:C.blue,border:"none",borderRadius:9999,width:44,height:44,cursor:"pointer",color:"#fff",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>&#8593;</button>
        </div>
      </div>):null}
    </div>
  );
}


function UserProfile(props) {
  var name=props.name, onClose=props.onClose, following=props.following||[], onFollow=props.onFollow, currentUserName=props.currentUserName||"";
  var TR=T["es"];
  var [profile,setProfile]=useState(null);
  var [posts,setPosts]=useState([]);
  var [loading,setLoading]=useState(true);

  useEffect(function(){
    api.getProfileByName(name).then(function(data){
      if(Array.isArray(data)&&data[0]) setProfile(data[0]);
    }).catch(function(){});
    api.getPostsByName(name).then(function(data){
      if(Array.isArray(data)) setPosts(data);
      setLoading(false);
    }).catch(function(){ setLoading(false); });
  },[name]);

  var isFollowing=following.includes(name);
  var cityObj=profile&&profile.city?getCity(profile.city):CITIES[0];

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,zIndex:10,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,minWidth:44,minHeight:44,width:44,height:44,cursor:"pointer",color:C.blue,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{"←"}</button>
        <div style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700,flex:1}}>{name}</div>
        {name!==currentUserName?<button onClick={function(){onFollow(name);}} style={{padding:"8px 20px",borderRadius:100,border:"1.5px solid "+(isFollowing?C.border:C.blue),background:isFollowing?"transparent":C.blue,color:isFollowing?C.muted:"#fff",fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>{isFollowing?TR.siguiendo:TR.seguir}</button>:null}
      </div>
      <div style={{background:C.card,borderBottom:"1px solid "+C.border,marginBottom:8}}>
        <div style={{height:80,background:"linear-gradient(135deg,#ffcc00,#0066ff,#ff2d2d)"}}/>
        <div style={{padding:"0 16px 16px",position:"relative"}}>
          <div style={{position:"absolute",top:-30,left:16,padding:2,borderRadius:9999,background:C.card}}>
            <Av t={name} i={0} s={60} photo={profile&&profile.photo_url?profile.photo_url:null}/>
          </div>
          <div style={{paddingTop:38}}>
            <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>{name}</div>
            <div style={{fontSize:11,color:C.blue,fontFamily:"'Inter',sans-serif",fontWeight:600,marginTop:2}}>{toFlag(CITY_FLAGS[cityObj.id])} {cityObj.name}</div>
            {profile&&profile.bio?<div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:6,lineHeight:1.5}}>{profile.bio}</div>:null}
          </div>
          <div style={{display:"flex",marginTop:12,borderTop:"1px solid "+C.border,paddingTop:12}}>
            <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,fontFamily:"'Syne',sans-serif",color:C.blue}}>{posts.length}</div><div style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:1}}>Posts</div></div>
          </div>
        </div>
      </div>
      <div style={{paddingBottom:40}}>
        {loading?<div style={{textAlign:"center",padding:"40px",color:C.muted,fontFamily:"'Inter',sans-serif"}}>Cargando...</div>
        :posts.length===0?<div style={{textAlign:"center",padding:"40px"}}><div style={{fontSize:40,marginBottom:8}}>{ICONS.notepad}</div><div style={{fontSize:14,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Sin publicaciones aun</div></div>
        :posts.map(function(p,i){
          var t2=TYPES[p.type]||TYPES.post;
          return (
            <div key={p.id} style={{background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 16px"}}>
              {t2.badgeBg?<div style={{display:"inline-flex",background:t2.badgeBg,borderRadius:20,padding:"3px 10px",marginBottom:6}}><span style={{fontSize:10,fontWeight:700,color:t2.badgeFg,fontFamily:"'Inter',sans-serif"}}>{t2.icon} {t2.label}</span></div>:null}
              <p style={{fontSize:14,lineHeight:1.6,color:C.text,fontFamily:"'Inter',sans-serif",margin:"0 0 8px"}}>{p.content}</p>
              <div style={{display:"flex",gap:12,fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",alignItems:"center"}}>
                <span style={{color:C.red}}>{ICONS.like_on} {p.likes||0}</span>
                <span>{ICONS.comment} {p.comments||0}</span>
                <span style={{marginLeft:"auto"}}>{formatTime(p.created_at||p.time)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function CountryFeed(props) {
  var cityId=props.cityId, onClose=props.onClose, savedPosts=props.savedPosts||[], onSave=props.onSave,
      likedPosts=props.likedPosts||[], onLike=props.onLike, following=props.following||[], onFollow=props.onFollow,
      userName=props.userName||"", userId=props.userId||"", lang=props.lang||"es",
      onOpenProfile=props.onOpenProfile||function(){};
  var TR=T[lang]||T.es;
  var cityObj=getCity(cityId);
  var [posts,setPosts]=useState(SEED.filter(function(p){return p.city===cityId;}));
  var [filter,setFilter]=useState("all");
  var [showComposer,setShowComposer]=useState(false);

  useEffect(function(){
    api.getPosts(cityId).then(function(data){
      if(Array.isArray(data)&&data.length>0){
        var mapped=data.map(function(p){ return {id:p.id,city:p.city,type:p.type||"post",name:p.name||"Anonimo",av:p.name||"?",content:p.content,likes:p.likes||0,comments:p.comments||0,time:p.created_at||"reciente"}; });
        var seedFiltered=SEED.filter(function(s){return s.city===cityId&&!mapped.find(function(m){return String(m.id)===String(s.id);});});
        setPosts(mapped.concat(seedFiltered));
      }
    }).catch(function(){});
    var channel=supabase.channel("cf:"+cityId)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"posts",filter:"city=eq."+cityId},function(payload){
        var p=payload.new; if(!p||!p.id) return;
        var np={id:p.id,city:p.city,type:p.type||"post",name:p.name||"Anonimo",av:p.name||"?",content:p.content,likes:p.likes||0,comments:p.comments||0,time:p.created_at||"reciente"};
        setPosts(function(cur){ if(cur.find(function(x){return String(x.id)===String(p.id);})) return cur; return [np].concat(cur); });
      }).subscribe();
    return function(){ supabase.removeChannel(channel); };
  },[cityId]);

  var addPost=function(p){
    var displayName=userName||"Tu"; var newPostId=String(Date.now());
    var newPost={id:newPostId,city:cityId,type:p.type,name:displayName,av:displayName,content:p.content,media:p.media,likes:0,comments:0,time:new Date().toISOString(),_local:true};
    setPosts(function(pp){ return [newPost].concat(pp); });
    if(userId) api.createPost(userId,cityId,p.type,p.content,displayName).catch(function(){});
  };

  var typeButtons=Object.entries(TYPES).map(function(entry){
    var id=entry[0],m=entry[1];
    return (
      <button key={id} onClick={function(){setFilter(id);}} style={{
        padding:"8px 14px",borderRadius:100,
        border:"1.5px solid "+(filter===id?C.blue:C.border),
        background:filter===id?C.blue:C.card,
        color:filter===id?"#fff":C.muted,
        fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,
        cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
        minHeight:36,display:"flex",alignItems:"center",gap:4
      }}>{m.icon} {m.label}</button>
    );
  });

  var filtered=posts.filter(function(p){ return filter==="all"||p.type===filter; });

  return (
    <div style={{
      position:"fixed",top:0,left:0,right:0,bottom:0,
      zIndex:250,background:C.bg,
      overflowY:"auto",WebkitOverflowScrolling:"touch"
    }}>
      {/* Color stripe */}
      <div style={{display:"flex",height:4,position:"sticky",top:0,zIndex:20}}>
        <div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/>
      </div>

      {/* Sticky header */}
      <div style={{position:"sticky",top:4,zIndex:19,background:C.card,borderBottom:"1px solid "+C.border,boxShadow:"0 1px 8px rgba(0,0,0,0.08)"}}>
        {/* Title row */}
        <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onClose} style={{
            background:C.bg,border:"none",borderRadius:9999,
            minWidth:44,minHeight:44,width:44,height:44,
            cursor:"pointer",color:C.blue,fontSize:20,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
          }}>{"←"}</button>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:10,minWidth:0}}>
            <span style={{fontSize:32,lineHeight:1}}>{toFlag(CITY_FLAGS[cityId])}</span>
            <div style={{minWidth:0}}>
              <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700,lineHeight:1.2}}>{cityObj.name}</div>
              <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:2}}>{cityObj.pop}</div>
            </div>
          </div>
          <button onClick={function(){setShowComposer(true);}} style={{
            background:C.yellow,border:"none",borderRadius:100,
            padding:"10px 18px",cursor:"pointer",
            fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:700,
            color:"#1a1a1a",flexShrink:0,minHeight:44,
            display:"flex",alignItems:"center"
          }}>+ Post</button>
        </div>
        {/* Filter chips */}
        <div style={{
          display:"flex",gap:8,padding:"0 12px 12px",
          overflowX:"auto",WebkitOverflowScrolling:"touch",
          scrollbarWidth:"none",msOverflowStyle:"none"
        }}>
          <button onClick={function(){setFilter("all");}} style={{
            padding:"8px 16px",borderRadius:100,minHeight:36,
            border:"1.5px solid "+(filter==="all"?C.blue:C.border),
            background:filter==="all"?C.blue:C.card,
            color:filter==="all"?"#fff":C.muted,
            fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,
            cursor:"pointer",whiteSpace:"nowrap",flexShrink:0
          }}>Todos</button>
          {typeButtons}
        </div>
      </div>

      {/* Posts list */}
      <div style={{paddingBottom:"calc(80px + env(safe-area-inset-bottom))"}}>
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"80px 24px",color:C.muted}}>
            <div style={{fontSize:56,marginBottom:16}}>{toFlag(CITY_FLAGS[cityId])}</div>
            <div style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:8}}>{cityObj.name}</div>
            <div style={{fontSize:14,fontFamily:"'Inter',sans-serif",lineHeight:1.6}}>Se el primero en publicar aqui</div>
            <button onClick={function(){setShowComposer(true);}} style={{marginTop:20,padding:"12px 28px",background:C.yellow,border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700,color:"#1a1a1a"}}>+ Publicar</button>
          </div>
        ):filtered.map(function(p,i){
          return <PostCard key={p.id} post={p} idx={i} cityObj={cityObj}
            saved={savedPosts.includes(p.id)} onSave={onSave}
            following={following} onFollow={onFollow} userName={userName}
            liked={likedPosts.includes(String(p.id))}
            onLike={function(id){onLike(id,p.user_id,p.name);}}
            userId={userId} likedLoaded={true}
            onOpenProfile={onOpenProfile} lang={lang}/>;
        })}
        {/* Invite banner at bottom of scroll */}
        {filtered.length>0&&<a href={waInvite(cityId)} target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",margin:"8px 14px 16px"}}>
          <div style={{background:C.wa,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22}}>{ICONS.phone}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:14}}>Invita venezolanos a {cityObj.name}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif",marginTop:2}}>Comparte con tus panas</div>
            </div>
            <span style={{color:"rgba(255,255,255,0.7)",fontSize:18}}>{"→"}</span>
          </div>
        </a>}
      </div>

      {showComposer?<Composer cityObj={cityObj} onPost={addPost} onClose={function(){setShowComposer(false);}}/>:null}
    </div>
  );
}

function Feed(props) {
  var userCity=props.userCity,onProfile=props.onProfile,userPhoto=props.userPhoto,userName=props.userName||"Tu",lang=props.lang||"es",userBio=props.userBio||"",likedLoaded=props.likedLoaded||false,onOpenProfile=props.onOpenProfile||function(){};
  var TR=T[lang]||T.es; var userId=props.userId||null;
  var [filter,setFilter]=useState("all"); var [posts,setPosts]=useState(SEED); var [showComposer,setShowComposer]=useState(false);
  var [inviteCount,setInviteCount]=useState(0); var activeCity=userCity;
  var savedPosts=props.savedPosts||[]; var likedPosts=props.likedPosts||[];
  var toggleLike=props.onLike||function(){}; var toggleSave=props.onSave||function(){};
  var [feedTab,setFeedTab]=useState("forYou"); var following=props.following||[]; var toggleFollow=props.onFollow||function(){};
  var [isMobile,setIsMobile]=useState(window.innerWidth<768);
  var [openCity,setOpenCity]=useState(null);
  useEffect(function(){
    var handler=function(){ setShowComposer(true); };
    document.addEventListener("epale:openComposer",handler);
    return function(){ document.removeEventListener("epale:openComposer",handler); };
  },[]);
  useEffect(function(){
    // Keep local posts, reset DB+SEED portion
    setPosts(function(current){
      return current.filter(function(p){ return p._local; }).concat(SEED);
    });
    api.getPosts(activeCity).then(function(data){
      if(Array.isArray(data)&&data.length>0){
        var mapped=data.map(function(p){ return {id:p.id,city:p.city,type:p.type||"post",name:p.name||"Anonimo",av:p.name||"?",content:p.content,likes:p.likes||0,comments:p.comments||0,time:p.created_at||"reciente"}; });
        setPosts(function(current){
          var localPosts=current.filter(function(p){ return p._local; });
          var seedFiltered=SEED.filter(function(s){ return !mapped.find(function(m){return String(m.id)===String(s.id);}); });
          return localPosts.concat(mapped).concat(seedFiltered);
        });
      }
    }).catch(function(){});

    // Real-time subscription: new posts appear instantly
    var channel=supabase.channel("posts:"+activeCity)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"posts",filter:"city=eq."+activeCity},function(payload){
        var p=payload.new;
        if(!p||!p.id) return;
        var newPost={id:p.id,city:p.city,type:p.type||"post",name:p.name||"Anonimo",av:p.name||"?",content:p.content,likes:p.likes||0,comments:p.comments||0,time:p.created_at||"reciente"};
        setPosts(function(current){
          if(current.find(function(x){ return String(x.id)===String(p.id); })) return current;
          return [newPost].concat(current);
        });
      })
      .subscribe();
    return function(){ supabase.removeChannel(channel); };
  },[activeCity]);
  useEffect(function(){ var handler=function(){ setIsMobile(window.innerWidth<768); }; window.addEventListener("resize",handler); return function(){ window.removeEventListener("resize",handler); }; },[]);
  var cityObj=getCity(activeCity);
  var cityButtons=CITIES.map(function(c){
    var isHome=c.id===userCity;
    return (<button key={c.id} onClick={function(){ if(isHome) return; setOpenCity(c.id); }} style={{padding:"5px 12px",borderRadius:100,border:"1.5px solid "+(isHome?C.yellow:C.border),background:isHome?C.yellow:C.card,color:isHome?"#1a1a1a":C.muted,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,cursor:isHome?"default":"pointer",whiteSpace:"nowrap",flexShrink:0}}>{toFlag(CITY_FLAGS[c.id])} {c.name}{isHome?" 🏠":""}</button>);
  });
  var typeButtons=Object.entries(TYPES).map(function(entry){ var id=entry[0],m=entry[1]; return (<button key={id} onClick={function(){setFilter(id);}} style={{padding:"5px 12px",borderRadius:100,border:"1.5px solid "+(filter===id?C.blue:C.border),background:filter===id?C.blue:C.card,color:filter===id?"#fff":C.muted,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{m.icon} {m.label}</button>); });
  var tabButtons=[["forYou",TR.forYou],["following",TR.siguiendo]].map(function(item){ var id=item[0],label=item[1]; return (<button key={id} onClick={function(){setFeedTab(id);}} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:feedTab===id?700:500,color:feedTab===id?C.text:C.muted,paddingBottom:2,borderBottom:feedTab===id?"2px solid "+C.text:"2px solid transparent"}}>{label}</button>); });
  var allFiltered=posts.filter(function(p){ return filter==="all"||p.type===filter; });
  var cityFiltered=allFiltered.filter(function(p){ return p.city===activeCity; });
  var followFiltered=allFiltered.filter(function(p){ return following.includes(p.name); });
  var filtered=feedTab==="following"?followFiltered:cityFiltered;
  var addPost=function(p){ var displayName=userName||"Tu"; var currentUserId=userId||""; var citiesToPost=p.city==="all"?CITIES.map(function(c){return c.id;}):[p.city]; var newPostId=String(Date.now()); citiesToPost.forEach(function(cityId){ var newPost={id:newPostId,city:cityId,type:p.type,name:displayName,av:displayName,content:p.content,media:p.media,likes:0,comments:0,time:new Date().toISOString(),_local:true}; setPosts(function(pp){ return [newPost].concat(pp); }); if(currentUserId) api.createPost(currentUserId,cityId,p.type,p.content,displayName).catch(function(){}); }); };
  var [dollarBCV,setDollarBCV]=useState("36.84"); var [dollarPar,setDollarPar]=useState("38.20");
  useEffect(function(){ api.getDollarRate().then(function(data){ if(Array.isArray(data)){ data.forEach(function(d){ if(d.fuente==="BCV"||d.nombre==="Oficial") setDollarBCV(parseFloat(d.promedio||d.price||36.84).toFixed(2)); if(d.fuente==="Paralelo"||d.nombre==="Paralelo") setDollarPar(parseFloat(d.promedio||d.price||38.20).toFixed(2)); }); } }).catch(function(){}); },[]);
  var dollarWidget=(<div style={{background:C.card,borderRadius:14,border:"1px solid "+C.border,overflow:"hidden",marginBottom:16}}><div style={{background:"#0d0d0d",padding:"9px 14px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>{ICONS.dollar}</span><div style={{flex:1,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}><span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,0.5)"}}>BCV <strong style={{fontSize:14,color:"#ffcc00"}}>{"Bs "+dollarBCV}</strong></span><span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,0.5)"}}>Paralelo <strong style={{fontSize:14,color:"#7defa0"}}>{"Bs "+dollarPar}</strong></span></div><span style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"'Inter',sans-serif"}}>hoy</span></div>{filtered[0]?(<div style={{padding:"8px 14px",display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:14}}>{ICONS.fire}</span><span style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Trending:</span><span style={{fontSize:12,color:C.text,fontFamily:"'Inter',sans-serif",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{filtered[0].content.slice(0,80)}...</span></div>):null}</div>);
  var postsList=filtered.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}><div style={{fontSize:40,marginBottom:12}}>{feedTab==="following"?"(siguiendo)":"(feed)"}</div><div style={{fontSize:15,fontFamily:"'Inter',sans-serif"}}>{feedTab==="following"?"Sigue a alguien para ver sus posts":"Se el primero en publicar"}</div></div>):filtered.map(function(p,i){ return <PostCard key={p.id} post={p} idx={i} cityObj={cityObj} saved={savedPosts.includes(p.id)} onSave={toggleSave} following={following} onFollow={toggleFollow} userName={userName} liked={likedPosts.includes(String(p.id))} onLike={function(id){ toggleLike(id,p.user_id,p.name); }} userId={userId} likedLoaded={likedLoaded} onOpenProfile={props.onOpenProfile} lang={lang}/>; });
  var inviteBanner=(<a href={waInvite(activeCity)} target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",marginBottom:16}} onClick={function(){setInviteCount(function(c){return Math.min(c+1,3);});}}><div style={{background:C.wa,borderRadius:16,padding:"16px"}}><div style={{fontSize:13,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",marginBottom:4}}>Invita venezolanos a {cityObj.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontFamily:"'Inter',sans-serif",marginBottom:10}}>{inviteCount>=3?"Meta cumplida!":inviteCount===0?TR.invitaTusP:inviteCount+" de 3 invitados"}</div><div style={{display:"flex",gap:6,marginBottom:10}}>{[0,1,2].map(function(j){ return <div key={j} style={{flex:1,height:4,borderRadius:2,background:j<inviteCount?"#fff":"rgba(255,255,255,0.3)"}}/>; })}</div><div style={{background:"rgba(255,255,255,0.2)",borderRadius:10,padding:"8px 12px",textAlign:"center",color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700}}>Invitar por WhatsApp</div></div></a>);
  var header=(<div style={{position:"sticky",top:0,zIndex:100,background:C.card,backdropFilter:"blur(20px)",boxShadow:"0 1px 0 rgba(0,0,0,0.1)"}}><div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>{isMobile?(<div><div style={{padding:"10px 16px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontSize:24,fontFamily:"'Syne',sans-serif",letterSpacing:-1,fontWeight:800}}><span style={{color:C.yellow}}>E</span><span style={{color:C.blue}}>pa</span><span style={{color:C.red}}>le</span></div><div style={{display:"flex",gap:20}}>{tabButtons}</div><button onClick={onProfile} style={{background:"none",border:"none",cursor:"pointer"}}><Av t={userName} i={0} s={34} photo={userPhoto}/></button></div><div style={{display:"flex",gap:6,padding:"0 12px 8px",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>{cityButtons}</div><div style={{display:"flex",gap:6,padding:"0 12px 8px",overflowX:"auto",borderTop:"1px solid "+C.border}}><button onClick={function(){setFilter("all");}} style={{padding:"5px 14px",borderRadius:100,border:"1.5px solid "+(filter==="all"?C.blue:C.border),background:filter==="all"?C.blue:C.card,color:filter==="all"?"#fff":C.muted,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Todos</button>{typeButtons}</div></div>):(<div><div style={{maxWidth:1200,margin:"0 auto",padding:"8px 20px 0",display:"flex",alignItems:"center",gap:20}}><div style={{fontSize:26,fontFamily:"'Syne',sans-serif",letterSpacing:-1,fontWeight:800,minWidth:120}}><span style={{color:C.yellow}}>E</span><span style={{color:C.blue}}>pa</span><span style={{color:C.red}}>le</span></div><div style={{flex:1,display:"flex",justifyContent:"center",gap:28}}>{tabButtons}</div><div style={{minWidth:120,display:"flex",justifyContent:"flex-end"}}><button onClick={onProfile} style={{background:"none",border:"none",cursor:"pointer"}}><Av t={userName} i={0} s={34} photo={userPhoto}/></button></div></div><div style={{maxWidth:1200,margin:"0 auto",padding:"6px 20px 8px",display:"flex",gap:6,overflowX:"auto"}}>{cityButtons}</div><div style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 8px",display:"flex",gap:6,overflowX:"auto",borderTop:"1px solid "+C.border}}><button onClick={function(){setFilter("all");}} style={{padding:"5px 14px",borderRadius:100,border:"1.5px solid "+(filter==="all"?C.blue:C.border),background:filter==="all"?C.blue:C.card,color:filter==="all"?"#fff":C.muted,fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Todos</button>{typeButtons}</div></div>)}</div>);
  if(isMobile){ return (<div style={{minHeight:"100vh",background:C.bg}}>
    {openCity?<CountryFeed cityId={openCity} onClose={function(){setOpenCity(null);}} savedPosts={savedPosts} onSave={toggleSave} likedPosts={likedPosts} onLike={toggleLike} following={following} onFollow={toggleFollow} userName={userName} userId={userId} lang={lang} onOpenProfile={props.onOpenProfile}/>:null}
    {showComposer?<Composer cityObj={cityObj} onPost={addPost} onClose={function(){setShowComposer(false);}}/>:null}{header}<div style={{paddingBottom:"calc(80px + env(safe-area-inset-bottom))"}}><div style={{margin:"10px 14px 0"}}>{dollarWidget}</div><div style={{marginTop:4}}>{postsList}</div><div style={{margin:"10px 14px 20px"}}>{inviteBanner}</div></div><button onClick={function(){setShowComposer(true);}} style={{position:"fixed",bottom:80,right:24,width:52,height:52,borderRadius:26,background:C.yellow,border:"none",cursor:"pointer",fontSize:30,boxShadow:"0 4px 18px rgba(255,204,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,lineHeight:1}}>{ICONS.pencil}</button></div>); }
  return (<div style={{minHeight:"100vh",background:C.bg}}>
    {openCity?<CountryFeed cityId={openCity} onClose={function(){setOpenCity(null);}} savedPosts={savedPosts} onSave={toggleSave} likedPosts={likedPosts} onLike={toggleLike} following={following} onFollow={toggleFollow} userName={userName} userId={userId} lang={lang} onOpenProfile={props.onOpenProfile}/>:null}
    {showComposer?<Composer cityObj={cityObj} onPost={addPost} onClose={function(){setShowComposer(false);}}/>:null}{header}<button onClick={function(){setShowComposer(true);}} style={{position:"fixed",bottom:32,right:32,width:56,height:56,borderRadius:28,background:C.yellow,border:"none",cursor:"pointer",fontSize:28,boxShadow:"0 4px 18px rgba(255,204,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,lineHeight:1}}>{ICONS.pencil}</button><div style={{maxWidth:1200,margin:"0 auto",padding:"20px",display:"flex",gap:24,alignItems:"flex-start"}}><div style={{width:240,flexShrink:0,position:"sticky",top:170}}><div style={{background:C.card,borderRadius:16,border:"1px solid "+C.border,overflow:"hidden",marginBottom:16}}><div style={{background:"linear-gradient(135deg,#ffcc00,#0066ff)",height:60}}/><div style={{padding:"0 16px 16px",marginTop:-28}}><Av t={userName} i={0} s={52} photo={userPhoto}/><div style={{marginTop:8,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:C.text}}>{userName}</div><div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:4}}>{"@"+userName.toLowerCase().replace(" ","")}</div>{userBio?<div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:12,lineHeight:1.4}}>{userBio}</div>:<div style={{marginBottom:12}}/>}<button onClick={onProfile} style={{width:"100%",padding:"8px",background:C.yellow,border:"none",borderRadius:10,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,color:C.text}}>Ver perfil</button></div></div><button onClick={function(){setShowComposer(true);}} style={{width:"100%",padding:"12px",background:C.yellow,border:"none",borderRadius:12,cursor:"pointer",fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:C.text,marginBottom:16}}>+ Publicar</button><div style={{background:C.card,borderRadius:16,border:"1px solid "+C.border,padding:"14px 16px"}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:C.text,marginBottom:12}}>Proximos eventos</div>{SEED.filter(function(p){ return p.type==="evento"&&p.city===activeCity; }).slice(0,3).map(function(ev,i){ return (<div key={ev.id} onClick={function(){setFilter("evento");}} style={{display:"flex",gap:10,marginBottom:12,cursor:"pointer",padding:"8px 10px",borderRadius:10,background:C.bg}}><div style={{width:36,height:36,borderRadius:10,background:"#7b2d8b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{ICONS.bell}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'Inter',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.name}</div><div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.content.slice(0,45)}...</div></div></div>); })}{SEED.filter(function(p){ return p.type==="evento"&&p.city===activeCity; }).length===0?(<div style={{textAlign:"center",padding:"10px 0"}}><div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif"}}>No hay eventos en este pais aun</div><button onClick={function(){setShowComposer(true);}} style={{marginTop:8,padding:"6px 14px",background:C.yellow,border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,color:C.text}}>Crear evento</button></div>):null}</div></div><div style={{flex:1,minWidth:0}}>{dollarWidget}{postsList}</div><div style={{width:280,flexShrink:0,position:"sticky",top:170}}>{inviteBanner}<div style={{background:C.card,borderRadius:16,border:"1px solid "+C.border,padding:"14px 16px",marginBottom:16}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:C.text,marginBottom:12}}>Venezolanos en {cityObj.name}</div>{SEED.filter(function(p){return p.city===activeCity;}).slice(0,4).map(function(p,i){ return (<div key={p.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><Av t={p.av} i={i} s={36}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',sans-serif"}}>{p.name}</div><div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{p.type}</div></div></div>); })}</div><div style={{background:C.card,borderRadius:16,border:"1px solid "+C.border,padding:"14px 16px"}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:C.text,marginBottom:10}}>Epale</div><div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",lineHeight:1.6}}>La red social de los venezolanos en el mundo. Conecta, comparte y crece con tu gente.</div><div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>{["Terminos","Privacidad","Contacto"].map(function(t){ return <span key={t} style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif",cursor:"pointer",textDecoration:"underline"}}>{t}</span>; })}</div></div></div></div></div>);
}

function Composer(props) {
  var cityObj=props.cityObj,onPost=props.onPost,onClose=props.onClose;
  var [type,setType]=useState("post"); var [text,setText]=useState(""); var [media,setMedia]=useState(null);
  var [loading,setLoading]=useState(false); var [selectedCity,setSelectedCity]=useState(cityObj.id); var [showCityPicker,setShowCityPicker]=useState(false);
  var handleFile=function(e,kind){ var file=e.target.files[0]; if(!file) return; var reader=new FileReader(); reader.onload=function(ev){ setMedia({src:ev.target.result,kind:kind}); }; reader.readAsDataURL(file); };
  var canPost=text.trim()||media;
  var submit=function(){ if(!canPost) return; setLoading(true); setTimeout(function(){ onPost({city:selectedCity,type:type,content:text,media:media}); setLoading(false); onClose(); },600); };
  var selectedCityObj=getCity(selectedCity);
  return (<div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}><div onClick={function(e){e.stopPropagation();}} style={{width:"100%",maxWidth:560,background:C.card,borderRadius:22,padding:"0 0 36px",maxHeight:"90vh",overflowY:"auto",margin:"0 16px"}}><div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}><div style={{width:36,height:4,borderRadius:2,background:C.border}}/></div><div style={{padding:"4px 20px 0"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:15,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>Nueva publicacion</span><button onClick={function(){setShowCityPicker(function(v){return !v;});}} style={{background:C.bg,border:"1.5px solid "+C.border,borderRadius:100,padding:"5px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>{selectedCity==="all"?ICONS.group:toFlag(CITY_FLAGS[selectedCity])}</span><span style={{fontSize:12,color:C.blue,fontFamily:"'Inter',sans-serif",fontWeight:700}}>{selectedCity==="all"?"Todos los paises":selectedCityObj.name}</span><span style={{fontSize:10,color:C.muted}}>{"v"}</span></button></div>{showCityPicker?(<div style={{background:C.bg,borderRadius:14,border:"1px solid "+C.border,padding:"8px",marginBottom:12,display:"flex",flexWrap:"wrap",gap:6}}><button onClick={function(){setSelectedCity("all");setShowCityPicker(false);}} style={{padding:"5px 10px",borderRadius:100,border:"1.5px solid "+(selectedCity==="all"?C.yellow:C.border),background:selectedCity==="all"?C.yellow:C.card,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer"}}>Todos los paises</button>{CITIES.map(function(c){ return (<button key={c.id} onClick={function(){setSelectedCity(c.id);setShowCityPicker(false);}} style={{padding:"5px 10px",borderRadius:100,border:"1.5px solid "+(selectedCity===c.id?C.blue:C.border),background:selectedCity===c.id?C.blue:C.card,color:selectedCity===c.id?"#fff":C.text,fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><span>{toFlag(CITY_FLAGS[c.id])}</span><span>{c.name}</span></button>); })}</div>):null}<div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>{Object.entries(TYPES).map(function(entry){ var id=entry[0],m=entry[1]; return <button key={id} onClick={function(){setType(id);}} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(type===id?C.blue:C.border),background:type===id?C.blue:C.card,color:type===id?"#fff":C.muted,fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{m.icon} {m.label}</button>; })}</div><textarea value={text} onChange={function(e){setText(e.target.value);}} placeholder="Que esta pasando en tu pais?" style={{width:"100%",background:C.bg,border:"1.5px solid "+(text?C.blue:C.border),borderRadius:12,padding:"12px 14px",color:C.text,fontFamily:"'Inter',sans-serif",fontSize:16,resize:"none",minHeight:90,outline:"none",boxSizing:"border-box",marginBottom:12}}/>{media?(<div style={{position:"relative",marginBottom:12,borderRadius:12,overflow:"hidden",border:"1.5px solid "+C.border}}>{media.kind==="image"?<img src={media.src} alt="preview" style={{width:"100%",maxHeight:220,objectFit:"cover",display:"block"}}/>:<video src={media.src} controls style={{width:"100%",maxHeight:220,display:"block"}}/>}<button onClick={function(){setMedia(null);}} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:9999,width:28,height:28,cursor:"pointer",color:"#fff",fontSize:14}}>X</button></div>):(<div style={{display:"flex",gap:8,marginBottom:14}}>{[[ICONS.photo,"Foto","image/*","image"],[ICONS.video,"Video","video/*","video"],[ICONS.camera,"Camara","image/*","image"]].map(function(item,idx){ return (<label key={idx} style={{flex:1}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",background:C.bg,border:"1.5px solid "+C.border,borderRadius:12,cursor:"pointer"}}><span style={{fontSize:18}}>{item[0]}</span><span style={{fontSize:11,fontFamily:"'Inter',sans-serif",color:C.muted,fontWeight:700}}>{item[1]}</span></div><input type="file" accept={item[2]} style={{display:"none"}} onChange={function(e){handleFile(e,item[3]);}}/></label>); })}</div>)}<button onClick={submit} disabled={!canPost} style={{width:"100%",padding:"13px",background:canPost?C.yellow:C.border,color:canPost?C.text:C.muted,border:"none",borderRadius:100,cursor:canPost?"pointer":"not-allowed",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>{loading?"Publicando...":"Publicar"}</button></div></div></div>);
}

function Search(props) {
  var onClose=props.onClose; var [query,setQuery]=useState(""); var [results,setResults]=useState([]); var [loading,setLoading]=useState(false);
  useEffect(function(){ if(query.length<2){ setResults([]); return; } setLoading(true); var timer=setTimeout(function(){ api.searchPosts(query).then(function(data){ if(Array.isArray(data)) setResults(data); setLoading(false); }).catch(function(){ setLoading(false); }); },400); return function(){ clearTimeout(timer); }; },[query]);
  return (<div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}><div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div><div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"12px 16px",display:"flex",gap:10,alignItems:"center"}}><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:18,flexShrink:0}}>{"<-"}</button><input autoFocus value={query} onChange={function(e){setQuery(e.target.value);}} placeholder="Buscar posts y personas..." style={{flex:1,padding:"10px 14px",background:C.bg,border:"1.5px solid "+C.border,borderRadius:100,fontFamily:"'Inter',sans-serif",fontSize:14,color:C.text,outline:"none"}}/></div><div style={{paddingBottom:40}}>{loading?(<div style={{textAlign:"center",padding:"40px 20px",color:C.muted,fontFamily:"'Inter',sans-serif"}}>Buscando...</div>):query.length<2?(<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:12}}>{ICONS.comment}</div><div style={{fontSize:15,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:6}}>Busca en Epale</div><div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Encuentra posts, trabajos, eventos y personas</div></div>):results.length===0?(<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:12}}>{ICONS.group}</div><div style={{fontSize:15,fontFamily:"'Syne',sans-serif",color:C.text}}>Sin resultados para "{query}"</div></div>):results.map(function(p,i){ return (<div key={p.id} style={{background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 16px"}}><div style={{display:"flex",gap:10,marginBottom:6}}><Av t={p.av||p.name} i={i} s={36}/><div><div style={{fontWeight:700,fontSize:13,fontFamily:"'Syne',sans-serif",color:C.text}}>{p.name}</div><div style={{fontSize:10,color:C.blue,fontFamily:"'Inter',sans-serif"}}>{toFlag(CITY_FLAGS[p.city])} {getCity(p.city).name} - {formatTime(p.time||p.created_at)}</div></div></div><p style={{fontSize:13,lineHeight:1.6,color:C.text,fontFamily:"'Inter',sans-serif",margin:0}}>{p.content}</p></div>); })}</div></div>);
}

function MisPublicaciones(props) {
  var onClose=props.onClose,userId=props.userId; var [myPosts,setMyPosts]=useState([]); var [loading,setLoading]=useState(true);
  useEffect(function(){ if(userId&&window._supaToken){ api.getUserPosts(userId).then(function(data){ if(Array.isArray(data)) setMyPosts(data); setLoading(false); }).catch(function(){ setLoading(false); }); } else { setLoading(false); } },[userId]);
  return (<div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}><Stripe/><div style={{position:"sticky",top:0,zIndex:10,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}><button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,minWidth:44,minHeight:44,width:44,height:44,cursor:"pointer",color:C.blue,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{"←"}</button><div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>Mis publicaciones</div></div><div style={{paddingBottom:40}}>{loading?<div style={{textAlign:"center",padding:"60px 20px",color:C.muted,fontFamily:"'Inter',sans-serif"}}>Cargando...</div>:myPosts.length===0?(<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:12}}>{ICONS.notepad}</div><div style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:8}}>Aun no has publicado nada</div><div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Tus publicaciones apareceran aqui</div></div>):myPosts.map(function(p,i){ return (<div key={p.id} style={{background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 16px"}}><p style={{fontSize:14,lineHeight:1.6,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:10}}>{p.content}</p><div style={{display:"flex",gap:12,fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",alignItems:"center"}}><span style={{color:C.red}}>{ICONS.heart} {p.likes||0}</span><span>{ICONS.comment} {p.comments||0}</span><span>{formatTime(p.created_at||p.time)}</span></div></div>); })}</div></div>);
}

function Guardados(props) {
  var saved=props.saved||[],onClose=props.onClose; var [savedPosts,setSavedPosts]=useState([]); var [loading,setLoading]=useState(true);
  useEffect(function(){ if(saved.length===0){ setLoading(false); return; } var ids=saved.join(","); fetchAuth(SUPA_URL+"/rest/v1/posts?id=in.("+ids+")&select=*",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(r){return r.json();}).then(function(data){ if(Array.isArray(data)) setSavedPosts(data); setLoading(false); }).catch(function(){ setLoading(false); }); },[]);
  var allPosts=savedPosts.concat(SEED.filter(function(p){ return saved.includes(p.id); }));
  return (<div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}><Stripe/><div style={{position:"sticky",top:0,zIndex:10,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}><button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,minWidth:44,minHeight:44,width:44,height:44,cursor:"pointer",color:C.blue,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{"←"}</button><div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>Guardados</div></div><div style={{paddingBottom:40}}>{loading?<div style={{textAlign:"center",padding:"60px 20px",color:C.muted,fontFamily:"'Inter',sans-serif"}}>Cargando...</div>:allPosts.length===0?(<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:12}}>{ICONS.heart}</div><div style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:8}}>No tienes posts guardados</div><div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Toca el icono guardar en cualquier post</div></div>):allPosts.map(function(p,i){ return (<div key={p.id} style={{background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 16px"}}><div style={{display:"flex",gap:10,marginBottom:8}}><Av t={p.av} i={i} s={36}/><div><div style={{fontWeight:700,fontSize:13,fontFamily:"'Syne',sans-serif",color:C.text}}>{p.name}</div><div style={{fontSize:10,color:C.blue,fontFamily:"'Inter',sans-serif"}}>{toFlag(CITY_FLAGS[p.city])} {getCity(p.city).name}</div></div></div><p style={{fontSize:14,lineHeight:1.6,color:C.text,fontFamily:"'Inter',sans-serif"}}>{p.content}</p></div>); })}</div></div>);
}

function FollowersList(props) {
  var title=props.title,users=props.users,following=props.following||[],onFollow=props.onFollow,onClose=props.onClose;
  var TR=T[props.lang||"es"]||T.es;
  return (<div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}><div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div><div style={{position:"sticky",top:0,zIndex:10,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}><button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,minWidth:44,minHeight:44,width:44,height:44,cursor:"pointer",color:C.blue,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{"←"}</button><div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700,flex:1}}>{title}</div><span style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{users.length}</span></div><div style={{paddingBottom:40}}>{users.length===0?(<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:12}}>{ICONS.group}</div><div style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text}}>Nadie aqui aun</div></div>):users.map(function(u,i){ return (<div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:"1px solid "+C.border,background:C.card}}><Av t={u.av||u.name} i={i} s={48}/><div style={{flex:1}}><div style={{fontWeight:700,fontSize:15,fontFamily:"'Syne',sans-serif",color:C.text}}>{u.name}</div>{u.city?<div style={{fontSize:11,color:C.blue,fontFamily:"'Inter',sans-serif",marginTop:1}}>{toFlag(CITY_FLAGS[u.city])} {getCity(u.city).name}</div>:null}{u.bio?<div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:2}}>{u.bio}</div>:null}</div><button onClick={function(){onFollow(u.name);}} style={{padding:"7px 16px",borderRadius:100,border:"1.5px solid "+(following.includes(u.name)?C.border:C.blue),background:"transparent",color:following.includes(u.name)?C.muted:C.blue,fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>{following.includes(u.name)?TR.siguiendo:TR.seguir}</button></div>); })}</div></div>);
}

var NOTIF_SEED=[{id:1,icon:ICONS.flag_ve,iconBg:"",text:"Bienvenido a Epale! Conecta con venezolanos en tu pais",time:"ahora",read:false}];

function Notificaciones(props) {
  var onClose=props.onClose,userId=props.userId||""; var [notifs,setNotifs]=useState(NOTIF_SEED); var [loading,setLoading]=useState(true);
  useEffect(function(){ if(userId){ api.getNotifications(userId).then(function(data){ if(Array.isArray(data)&&data.length>0){ var mapped=data.map(function(n){ var icon=n.type==="like"?ICONS.heart:n.type==="comment"?ICONS.comment:ICONS.flag_ve; var text=n.type==="like"?n.from_name+" le dio like a tu post":n.type==="comment"?n.from_name+" comento en tu post":n.from_name; return {id:n.id,icon:icon,iconBg:C.card,text:text,time:formatTime(n.created_at),read:n.read}; }); setNotifs(NOTIF_SEED.concat(mapped)); } setLoading(false); }).catch(function(){ setLoading(false); }); } else { setLoading(false); } },[userId]);
  var unread=notifs.filter(function(n){return !n.read;}).length;
  var markAll=function(){ setNotifs(function(ns){return ns.map(function(n){return Object.assign({},n,{read:true});});}); if(userId) api.markNotifsRead(userId).catch(function(){}); };
  var markOne=function(id){ setNotifs(function(ns){return ns.map(function(n){return n.id===id?Object.assign({},n,{read:true}):n;}); }); };
  return (<div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}><div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div><div style={{position:"sticky",top:0,zIndex:10,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}><button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,minWidth:44,minHeight:44,width:44,height:44,cursor:"pointer",color:C.blue,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{"←"}</button><div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700,flex:1}}>Notificaciones</div>{unread>0?<button onClick={markAll} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:600}}>Marcar todas</button>:null}</div>{unread>0?<div style={{padding:"8px 16px",background:C.card,borderBottom:"1px solid "+C.border}}><span style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{unread} sin leer</span></div>:null}<div style={{paddingBottom:40}}>{notifs.map(function(n){ return (<div key={n.id} onClick={function(){markOne(n.id);}} style={{display:"flex",gap:14,padding:"14px 16px",background:n.read?C.bg:C.card,borderBottom:"1px solid "+C.border,cursor:"pointer"}}><div style={{width:44,height:44,borderRadius:12,background:n.iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{n.icon}</div><div style={{flex:1}}><div style={{fontSize:13,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.4,marginBottom:4}}>{n.text}</div><div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{n.time}</div></div>{!n.read?<div style={{width:8,height:8,borderRadius:9999,background:C.blue,flexShrink:0,marginTop:6}}/>:null}</div>); })}</div></div>);
}

function Profile(props) {
  var userCity=props.userCity,onLogout=props.onLogout,onClose=props.onClose,onSetDark=props.onSetDark,onSetLang=props.onSetLang,isDark=props.isDark,currentLang=props.currentLang,following=props.following||[],onFollow=props.onFollow,userPhoto=props.userPhoto||null,userName=props.userName||"Tu",onPhotoChange=props.onPhotoChange||function(){},savedPosts=props.savedPosts||[],userBio=props.userBio||"",onBioChange=props.onBioChange||function(){};
  var TR=T[currentLang]||T.es; var [subScreen,setSubScreen]=useState(null); var cityObj=getCity(userCity);
  var [postCount,setPostCount]=useState(0);
  useEffect(function(){
    if(props.userId){
      api.getUserPosts(props.userId).then(function(data){ if(Array.isArray(data)) setPostCount(data.length); }).catch(function(){});
    }
  },[props.userId]);
  if(subScreen==="posts") return <MisPublicaciones userId={props.userId} userName={userName} onClose={function(){setSubScreen(null);}}/>;
  if(subScreen==="saved") return <Guardados saved={savedPosts} onClose={function(){setSubScreen(null);}}/>;
  if(subScreen==="seguidores") return <FollowersList title="Seguidores" users={SAMPLE_USERS} following={following} onFollow={onFollow||function(){}} onClose={function(){setSubScreen(null);}}/>;
  if(subScreen==="siguiendo") return <FollowersList title="Siguiendo" users={following.map(function(n){ return {name:n,av:n,city:userCity,bio:""}; })} following={following} onFollow={onFollow||function(){}} onClose={function(){setSubScreen(null);}}/>;
  if(subScreen==="notifs") return <Notificaciones onClose={function(){setSubScreen(null);}} userId={props.userId}/>;
  if(subScreen==="config") return <Configuracion userCity={userCity} onClose={function(){setSubScreen(null);}} onLogout={onLogout} onSetDark={onSetDark} onSetLang={onSetLang} isDark={isDark} currentLang={currentLang} userName={userName} userPhoto={userPhoto} userBio={userBio}/>;
  if(subScreen==="edit") return <EditProfile userCity={userCity} userPhoto={userPhoto} userName={userName} userBio={userBio} onPhotoChange={onPhotoChange} onBioChange={onBioChange} onClose={function(){setSubScreen(null);}}/>;
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{background:C.card,borderBottom:"1px solid "+C.border,marginBottom:10}}>
        <div style={{height:100,background:"linear-gradient(135deg,#ffcc00,#0066ff,#ff2d2d)",position:"relative"}}>
          <button onClick={onClose} style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.3)",border:"none",borderRadius:9999,width:32,height:32,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>X</button>
        </div>
        <div style={{padding:"0 20px 20px",position:"relative"}}>
          <div style={{position:"absolute",top:-36,left:20,padding:3,borderRadius:9999,background:C.card}}><Av t={userName} i={0} s={72}/></div>
          <div style={{paddingTop:46,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{fontSize:22,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>{userName||"Tu Perfil"}</div>{userBio?<div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:4}}>{userBio}</div>:null}<div style={{fontSize:12,color:C.blue,fontFamily:"'Inter',sans-serif",fontWeight:700,marginTop:2}}>{toFlag(CITY_FLAGS[userCity])} {cityObj.name}</div></div>
            <button onClick={function(){setSubScreen("edit");}} style={{padding:"7px 16px",background:C.blue,border:"none",borderRadius:100,color:"#fff",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700}}>Editar perfil</button>
          </div>
          <div style={{display:"flex",marginTop:16,borderTop:"1px solid "+C.border,paddingTop:14}}>
            {[{val:postCount,label:"Posts",color:C.blue,action:function(){setSubScreen("posts");}},{val:SAMPLE_USERS.length,label:"Seguidores",color:C.yellow,action:function(){setSubScreen("seguidores");}},{val:following.length,label:TR.siguiendo,color:C.red,action:function(){setSubScreen("siguiendo");}}].map(function(s,i){
              return (<div key={s.label} onClick={s.action} style={{flex:1,textAlign:"center",borderRight:i<2?"1px solid "+C.border:"none",cursor:s.action?"pointer":"default",padding:"4px 0"}}><div style={{fontSize:22,fontWeight:800,fontFamily:"'Syne',sans-serif",color:s.color}}>{s.val}</div><div style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:2}}>{s.label}</div></div>);
            })}
          </div>
        </div>
      </div>
      <div style={{background:C.card,marginBottom:10}}>
        {[{icon:ICONS.pencil,label:"Mis publicaciones",sub:"Posts que has compartido",action:function(){setSubScreen("posts");}},{icon:ICONS.heart,label:"Guardados",sub:"Posts que marcaste como favoritos",action:function(){setSubScreen("saved");}},{icon:ICONS.bell,label:"Notificaciones",sub:"Likes, comentarios, menciones",action:function(){setSubScreen("notifs");}},{icon:ICONS.gear,label:"Configuracion",sub:"Cuenta, privacidad, idioma",action:function(){setSubScreen("config");}}].map(function(item,i){
          return (<div key={i} onClick={item.action||function(){}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderBottom:i<3?"1px solid "+C.border:"none",cursor:"pointer"}}><div style={{width:42,height:42,borderRadius:12,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{item.icon}</div><div style={{flex:1}}><div style={{fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",fontWeight:600}}>{item.label}</div><div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:1}}>{item.sub}</div></div><span style={{color:C.muted,fontSize:18}}>{">"}</span></div>);
        })}
      </div>
      <div style={{margin:"0 14px 10px"}}><a href={waInvite(userCity)} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}><div style={{background:C.wa,borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:22}}>{ICONS.phone}</span><div style={{flex:1}}><div style={{fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:13}}>Invitar venezolanos a Epale</div><div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontFamily:"'Inter',sans-serif"}}>Comparte con tus panas en {cityObj.name}</div></div></div></a></div>
      <div style={{margin:"0 14px 40px"}}><button onClick={onLogout} style={{width:"100%",padding:"14px",background:C.card,border:"1px solid "+C.border,borderRadius:14,color:C.red,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:700}}>{currentLang==="en"?"Sign out":"Cerrar Sesion"}</button></div>
    </div>
  );
}

function EditProfile(props) {
  var userCity=props.userCity,onClose=props.onClose,onPhotoChange=props.onPhotoChange||function(){},onBioChange=props.onBioChange||function(){};
  var TR=T["es"];
  var [name,setName]=useState(props.userName||""); var [username,setUsername]=useState(props.userName?props.userName.toLowerCase().replace(/\s/g,""):"");
  var [bio,setBio]=useState(props.userBio||"Venezolano en "+getCity(userCity).name); var [photo,setPhoto]=useState(props.userPhoto||null);
  var [saved,setSaved]=useState(false); var [loading,setLoading]=useState(false);
  var handlePhoto=function(e){ var file=e.target.files&&e.target.files[0]; if(!file) return; var reader=new FileReader(); reader.onload=function(ev){ setPhoto(ev.target.result); }; reader.readAsDataURL(file); };
  var save=function(){
    setLoading(true);
    var uid=(function(){ try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.uid?d.uid:""; } catch(e){ return ""; } })();
    var finish=function(photoUrl){ var finalPhoto=photoUrl||photo; try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):{}; d.name=name; if(finalPhoto) d.photo=finalPhoto; d.bio=bio; localStorage.setItem("epale_session",JSON.stringify(d)); } catch(e){} setLoading(false); setSaved(true); onPhotoChange(finalPhoto); onBioChange(bio); setTimeout(onClose,1200); };
    if(uid){ if(photo&&photo.startsWith("data:")){ api.uploadPhoto(uid,photo).then(function(url){ api.updateProfile(uid,name,userCity,username,url||photo,bio).then(function(){ finish(url||photo); }).catch(function(){ finish(photo); }); }).catch(function(){ api.updateProfile(uid,name,userCity,username,photo,bio).then(function(){ finish(photo); }).catch(function(){ finish(photo); }); }); } else { api.updateProfile(uid,name,userCity,username,photo,bio).then(function(){ finish(photo); }).catch(function(){ finish(photo); }); } } else { finish(photo); }
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:600}}>Cancelar</button>
        <div style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>Editar perfil</div>
        <button onClick={save} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>{loading?"...":saved?"ok":TR.guardar}</button>
      </div>
      <div style={{padding:"24px 20px 60px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:28}}>
          <div style={{position:"relative",marginBottom:8}}>
            <div style={{width:90,height:90,borderRadius:9999,overflow:"hidden",background:"linear-gradient(135deg,#ffcc00,#0066ff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:800,border:"3px solid "+C.yellow}}>{photo?<img src={photo} alt="foto" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(name?name[0].toUpperCase():"?")}</div>
            <label style={{position:"absolute",bottom:0,right:0,width:28,height:28,borderRadius:9999,background:C.yellow,border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,fontWeight:700}}>+<input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/></label>
          </div>
          <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Toca para cambiar foto</div>
        </div>
        {[["NOMBRE","Tu nombre",name,setName,false],["USUARIO","tu_usuario",username,function(v){setUsername(v.toLowerCase());},true]].map(function(item,i){
          var label=item[0],ph=item[1],val=item[2],set=item[3],isUser=item[4];
          return (<div key={i} style={{marginBottom:18}}><div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>{label}</div><div style={{position:"relative"}}>{isUser?<span style={{position:"absolute",left:14,top:10,color:C.muted,fontFamily:"'Inter',sans-serif",fontSize:15}}>@</span>:null}<input value={val} onChange={function(e){set(e.target.value);}} placeholder={ph} style={{width:"100%",padding:"13px 16px 13px "+(isUser?"30px":"16px"),background:C.card,border:"1.5px solid "+(val?C.blue:C.border),borderRadius:14,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/></div></div>);
        })}
        <div style={{marginBottom:18}}><div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>BIO</div><textarea value={bio} onChange={function(e){setBio(e.target.value);}} placeholder="Cuentanos sobre ti..." maxLength={150} style={{width:"100%",padding:"13px 16px",background:C.card,border:"1.5px solid "+(bio?C.blue:C.border),borderRadius:14,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",resize:"none",minHeight:90,boxSizing:"border-box"}}/><div style={{fontSize:11,color:C.muted,textAlign:"right",marginTop:4}}>{bio.length}/150</div></div>
        <button onClick={save} style={{width:"100%",padding:"15px",background:C.yellow,color:C.text,border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:700}}>{loading?"Guardando...":saved?TR.guardado:"Guardar cambios"}</button>
      </div>
    </div>
  );
}

function PasswordChange(props) {
  var onBack=props.onBack; var [newPass,setNewPass]=useState(""); var [confirm,setConfirm]=useState(""); var [loading,setLoading]=useState(false); var [msg,setMsg]=useState(""); var [error,setError]=useState("");
  var save=function(){ if(!newPass||!confirm){setError("Completa todos los campos");return;} if(newPass!==confirm){setError("Las contrasenas no coinciden");return;} if(newPass.length<6){setError("Minimo 6 caracteres");return;} setLoading(true); setError(""); api.changePassword(newPass).then(function(res){ setLoading(false); if(res&&res.error) setError(res.error.message||"Error al cambiar contrasena"); else { setMsg("Contrasena cambiada exitosamente"); setTimeout(onBack,1500); } }).catch(function(){ setError("Error de conexion"); setLoading(false); }); };
  return (<div style={{padding:"24px 20px"}}>{msg?<div style={{background:"#e8f8ee",border:"1px solid #30d158",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:14,color:C.green,fontFamily:"'Inter',sans-serif",textAlign:"center"}}>{msg}</div>:null}{error?<div style={{background:C.card,border:"1px solid "+C.red,borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:14,color:C.red,fontFamily:"'Inter',sans-serif"}}>{error}</div>:null}{[["NUEVA CONTRASENA","Nueva contrasena",newPass,setNewPass],["CONFIRMAR","Repite la contrasena",confirm,setConfirm]].map(function(item,i){ return (<div key={i} style={{marginBottom:16}}><div style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:6,letterSpacing:1}}>{item[0]}</div><input type="password" value={item[2]} onChange={function(e){item[3](e.target.value);}} placeholder={item[1]} style={{width:"100%",padding:"13px 16px",background:C.card,border:"1.5px solid "+(item[2]?C.blue:C.border),borderRadius:14,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/></div>); })}<button onClick={save} style={{width:"100%",padding:"14px",background:C.yellow,color:C.text,border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:700}}>{loading?"Guardando...":"Cambiar contrasena"}</button></div>);
}

function Configuracion(props) {
  var userCity=props.userCity,onClose=props.onClose,onLogout=props.onLogout,onSetDark=props.onSetDark,onSetLang=props.onSetLang,isDark=props.isDark,currentLang=props.currentLang,userName=props.userName||"",userPhoto=props.userPhoto||null,userBio=props.userBio||"";
  var [notifOn,setNotifOn]=useState(true); var [darkMode,setDarkMode]=useState(isDark||false); var [subPage,setSubPage]=useState(null); var cityObj=getCity(userCity);
  var Toggle=function(tProps){ return (<div onClick={tProps.onToggle} style={{width:44,height:26,borderRadius:13,background:tProps.on?C.blue:C.border,cursor:"pointer",position:"relative",flexShrink:0}}><div style={{position:"absolute",top:3,left:tProps.on?20:3,width:20,height:20,borderRadius:9999,background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/></div>); };
  if(subPage==="password") return (<div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}><div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div><div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}><button onClick={function(){setSubPage(null);}} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18}}>{"<-"}</button><div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text}}>Cambiar contrasena</div></div><PasswordChange onBack={function(){setSubPage(null);}}/></div>);
  if(subPage==="terminos") return (<div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}><div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div><div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}><button onClick={function(){setSubPage(null);}} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18}}>{"<-"}</button><div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text}}>Terminos de Servicio</div></div><div style={{padding:"24px 20px 40px"}}>{[["1. Aceptacion","Al usar Epale aceptas estos terminos."],["2. Uso","Comprometete a usar la plataforma de manera respetuosa y legal."],["3. Contenido","Eres responsable del contenido que publicas."],["4. Privacidad","No vendemos tus datos a terceros."],["5. Contacto","legal@epaleapp.online"]].map(function(item,i){ return <div key={i} style={{marginBottom:20}}><div style={{fontSize:15,fontWeight:700,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:6}}>{item[0]}</div><div style={{fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.6}}>{item[1]}</div></div>; })}</div></div>);
  if(subPage==="privacidad") return (<div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}><div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div><div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}><button onClick={function(){setSubPage(null);}} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18}}>{"<-"}</button><div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text}}>Politica de Privacidad</div></div><div style={{padding:"24px 20px 40px"}}>{[["Datos que recopilamos","Nombre, correo, ciudad y contenido publicado."],["Como los usamos","Para mostrarte contenido relevante y mejorar la plataforma."],["Compartir","No vendemos ni compartimos datos personales."],["Tus derechos","Puedes eliminar tu cuenta escribiendo a privacidad@epaleapp.online."],["Contacto","privacidad@epaleapp.online"]].map(function(item,i){ return <div key={i} style={{marginBottom:20}}><div style={{fontSize:15,fontWeight:700,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:6}}>{item[0]}</div><div style={{fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.6}}>{item[1]}</div></div>; })}</div></div>);
  if(subPage==="lang") return (<div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}><div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div><div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}><button onClick={function(){setSubPage(null);}} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18}}>{"<-"}</button><div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text}}>Idioma</div></div><div style={{padding:"20px 16px"}}>{[{id:"es",flag:"VE",name:"Espanol"},{id:"en",flag:"",name:"English"}].map(function(l){ return (<button key={l.id} onClick={function(){if(onSetLang) onSetLang(l.id); setSubPage(null);}} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px",background:currentLang===l.id?C.bg:C.card,border:"2px solid "+(currentLang===l.id?C.yellow:C.border),borderRadius:14,cursor:"pointer",textAlign:"left",marginBottom:10}}><span style={{fontSize:28}}>{l.flag}</span><span style={{fontSize:16,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700,flex:1}}>{l.name}</span>{currentLang===l.id?<div style={{width:22,height:22,borderRadius:9999,background:C.yellow,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{ICONS.check}</div>:null}</button>); })}</div></div>);
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,maxWidth:480,margin:"0 auto",overflowY:"auto"}}>
      <div style={{display:"flex",height:4}}><div style={{flex:1,background:C.yellow}}/><div style={{flex:1,background:C.blue}}/><div style={{flex:1,background:C.red}}/></div>
      <div style={{position:"sticky",top:0,background:C.card,borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}><button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:9999,width:34,height:34,cursor:"pointer",color:C.blue,fontSize:18}}>{"<-"}</button><div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text}}>{currentLang==="en"?"Settings":"Configuracion"}</div></div>
      <div style={{background:C.card,margin:"16px",borderRadius:16,border:"1px solid "+C.border,padding:"20px",display:"flex",gap:16,alignItems:"center"}}><Av t={userName||"?"} i={0} s={64} photo={userPhoto}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:18,fontFamily:"'Syne',sans-serif",color:C.text,fontWeight:700}}>{userName||""}</div><div style={{fontSize:12,color:C.blue,fontFamily:"'Inter',sans-serif",marginTop:2}}>{"@"+userName.toLowerCase().replace(/\s/g,"")}</div>{userBio?<div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:4,lineHeight:1.4}}>{userBio}</div>:null}<div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:4}}>{(function(){ try{var d=JSON.parse(localStorage.getItem("epale_session")); if(d&&d.email) return d.email; if(d&&d.token){var payload=JSON.parse(atob(d.token.split(".")[1])); return payload.email||"";} return "";} catch(e){return "";} })()}</div></div></div>
      <div style={{paddingBottom:40}}>
        {[{title:currentLang==="en"?"ACCOUNT":"CUENTA",items:[{label:currentLang==="en"?"Country":"Pais",value:toFlag(CITY_FLAGS[userCity])+" "+cityObj.name,type:"info"},{label:currentLang==="en"?"Change password":"Cambiar contrasena",type:"action",onPress:function(){setSubPage("password");}},{label:currentLang==="en"?"Delete account":"Eliminar cuenta",type:"danger",onPress:function(){ if(window.confirm(currentLang==="en"?"Are you sure?":"Seguro que quieres eliminar tu cuenta?")){ fetchAuth(SUPA_URL+"/auth/v1/user",{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+getToken()}}).then(function(){ try{localStorage.removeItem("epale_session");}catch(e){} window._supaToken=null; onLogout(); }).catch(function(){ alert("Error al eliminar cuenta"); }); } }}]},{title:currentLang==="en"?"PREFERENCES":"PREFERENCIAS",items:[{label:currentLang==="en"?"Notifications":"Notificaciones",type:"toggle",val:notifOn,onToggle:function(){setNotifOn(function(v){return !v;});}},{label:currentLang==="en"?"Dark mode":"Modo oscuro",type:"toggle",val:darkMode,onToggle:function(){var v=!darkMode;setDarkMode(v);if(onSetDark)onSetDark(v);}},{label:currentLang==="en"?"Language":"Idioma",value:currentLang==="en"?"English":"Espanol",type:"action",onPress:function(){setSubPage("lang");}}]},{title:"LEGAL",items:[{label:currentLang==="en"?"Terms of service":"Terminos de servicio",type:"action",onPress:function(){setSubPage("terminos");}},{label:currentLang==="en"?"Privacy policy":"Politica de privacidad",type:"action",onPress:function(){setSubPage("privacidad");}},{label:"Version",value:"v1.0.0",type:"info"}]}].map(function(sec,si){
          return (<div key={si} style={{marginTop:20}}><div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,letterSpacing:1,padding:"0 16px",marginBottom:6}}>{sec.title}</div><div style={{background:C.card,borderTop:"1px solid "+C.border,borderBottom:"1px solid "+C.border}}>{sec.items.map(function(item,ii){ return (<div key={ii} onClick={item.onPress||function(){}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:ii<sec.items.length-1?"1px solid "+C.border:"none",cursor:item.type==="action"?"pointer":"default"}}><span style={{fontSize:14,color:item.type==="danger"?C.red:C.text,fontFamily:"'Inter',sans-serif",flex:1,fontWeight:500}}>{item.label}</span>{item.type==="toggle"?<Toggle on={item.val} onToggle={item.onToggle}/>:null}{item.type==="info"?<span style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{item.value}</span>:null}{item.type==="action"?<span style={{color:C.muted,fontSize:18}}>{">"}</span>:null}{item.type==="danger"?<span style={{color:C.red,fontSize:18}}>{">"}</span>:null}</div>); })}</div></div>);
        })}
        <div style={{margin:"20px 14px"}}><button onClick={onLogout} style={{width:"100%",padding:"14px",background:C.card,border:"1px solid "+C.border,borderRadius:14,color:C.red,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:700}}>{currentLang==="en"?"Sign out":"Cerrar Sesion"}</button></div>
      </div>
    </div>
  );
}

var sStr=function(p){ var s=0; if(p.length>=6)s++; if(p.length>=10)s++; if(/[A-Z]/.test(p))s++; if(/[0-9]/.test(p))s++; return s; };
var STR_COLORS=["","#ff2d2d","#ff2d2d","#ffcc00","#1a7a3c","#1a7a3c"];
var STR_LABELS=["","Muy debil","Debil","Regular","Buena","Fuerte"];

function AuthLogin(props) {
  var onDone=props.onDone; var [email,setEmail]=useState(""); var [password,setPassword]=useState(""); var [showPass,setShowPass]=useState(false); var [loading,setLoading]=useState(false); var [error,setError]=useState("");
  var go=function(){ if(!email||!password){setError("Completa todos los campos");return;} setLoading(true); setError(""); api.signIn(email,password).then(function(res){ var session=res.session||res; if(!session||!session.access_token){ setError("Correo o contrasena incorrectos"); setLoading(false); return; } var token=session.access_token||""; var uid=(session.user&&session.user.id)||""; var refresh=session.refresh_token||""; var email2=(session.user&&session.user.email)||""; window._supaToken=token; api.getProfile(uid).then(function(profiles){ var profile=Array.isArray(profiles)&&profiles[0]; setLoading(false); var city=profile?profile.city:"madrid"; var name=profile?profile.name:""; var photo=profile?profile.photo_url:null; try { localStorage.setItem("epale_session",JSON.stringify({city:city,name:name,photo:photo,token:token,uid:uid,refresh:refresh,email:email2,bio:profile?profile.bio||"":""})); } catch(e){} onDone(city,name,photo,token,uid); }).catch(function(){ setLoading(false); onDone("madrid","",null,token,uid); }); }).catch(function(){ setError("Error de conexion"); setLoading(false); }); };
  return (<div style={{flex:1,padding:"22px 20px 32px",background:C.bg}}><div style={{fontSize:20,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:4,fontWeight:700}}>Bienvenido de vuelta</div><div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:22}}>Entra para conectarte con tu gente</div><div style={{marginBottom:14}}><div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>CORREO</div><input value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="tu@correo.com" type="email" style={{width:"100%",padding:"13px 16px",background:C.card,border:"1.5px solid "+(email?C.blue:C.border),borderRadius:12,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/></div><div style={{marginBottom:8}}><div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>CONTRASENA</div><div style={{position:"relative"}}><input value={password} onChange={function(e){setPassword(e.target.value);}} type={showPass?"text":"password"} placeholder="Tu contrasena" style={{width:"100%",padding:"13px 46px 13px 16px",background:C.card,border:"1.5px solid "+(password?C.blue:C.border),borderRadius:12,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/><button onClick={function(){setShowPass(function(s){return !s;});}} style={{position:"absolute",right:14,top:10,background:"none",border:"none",cursor:"pointer",fontSize:18}}>{ICONS.eye}</button></div></div><div style={{textAlign:"right",marginBottom:20}}><button onClick={function(){ var em=email; if(!em){setError("Ingresa tu correo primero");return;} api.resetPassword(em).then(function(){setError("Correo de recuperacion enviado!");}).catch(function(){setError("Error al enviar correo");}); }} style={{background:"none",border:"none",cursor:"pointer",color:"#0066ff",fontFamily:"'Inter',sans-serif",fontSize:11}}>Olvidaste tu contrasena?</button></div>{error?<div style={{background:"#3a1a1a",border:"1px solid #ff6b6b",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:"#ff2d2d",fontFamily:"'Inter',sans-serif"}}>{error}</div>:null}<button onClick={go} style={{width:"100%",padding:"14px",background:"#ffcc00",color:C.text,border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>{loading?"Entrando...":"Entrar"}</button></div>);
}

function AuthStep1(props) {
  var onNext=props.onNext,email=props.email,setEmail=props.setEmail,password=props.password,setPassword=props.setPassword,password2=props.password2,setPassword2=props.setPassword2;
  var [showPass,setShowPass]=useState(false); var [error,setError]=useState(""); var str=sStr(password);
  var next=function(){ if(!email||!password||!password2){setError("Completa todos los campos");return;} if(password!==password2){setError("Las contrasenas no coinciden");return;} if(password.length<6){setError("Minimo 6 caracteres");return;} onNext(); };
  return (<div style={{flex:1,padding:"22px 20px 32px",background:C.bg}}><div style={{fontSize:20,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:16,fontWeight:700}}>Crea tu cuenta</div><div style={{marginBottom:14}}><div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>CORREO</div><input value={email} onChange={function(e){setEmail(e.target.value);}} type="email" placeholder="tu@correo.com" style={{width:"100%",padding:"13px 16px",background:C.card,border:"1.5px solid "+(email?C.blue:C.border),borderRadius:12,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/></div><div style={{marginBottom:14}}><div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>CONTRASENA</div><div style={{position:"relative"}}><input value={password} onChange={function(e){setPassword(e.target.value);}} type={showPass?"text":"password"} placeholder="Minimo 6 caracteres" style={{width:"100%",padding:"13px 46px 13px 16px",background:C.card,border:"1.5px solid "+(password?C.blue:C.border),borderRadius:12,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/><button onClick={function(){setShowPass(function(s){return !s;});}} style={{position:"absolute",right:14,top:10,background:"none",border:"none",cursor:"pointer",fontSize:18}}>{ICONS.eye}</button></div>{password?(<div><div style={{display:"flex",gap:3,marginTop:7}}>{[1,2,3,4,5].map(function(i){return <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=str?STR_COLORS[str]:C.border}}/>;})}</div><div style={{fontSize:11,color:STR_COLORS[str],fontFamily:"'Inter',sans-serif",marginTop:3}}>{STR_LABELS[str]}</div></div>):null}</div><div style={{marginBottom:20}}><div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>CONFIRMAR CONTRASENA</div><input value={password2} onChange={function(e){setPassword2(e.target.value);}} type="password" placeholder="Repite tu contrasena" style={{width:"100%",padding:"13px 16px",background:C.card,border:"1.5px solid "+(password2?(password2===password?"#1a7a3c":"#ff2d2d"):C.border),borderRadius:12,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/></div>{error?<div style={{background:"#3a1a1a",border:"1px solid #ff6b6b",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:"#ff2d2d",fontFamily:"'Inter',sans-serif"}}>{error}</div>:null}<button onClick={next} style={{width:"100%",padding:"14px",background:"#ffcc00",color:C.text,border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>Siguiente</button></div>);
}

function AuthStep2(props) {
  var onNext=props.onNext,onBack=props.onBack,name=props.name,setName=props.setName,username=props.username,setUsername=props.setUsername; var [error,setError]=useState("");
  var next=function(){ if(!name||!username){setError("Nombre y usuario requeridos");return;} onNext(); };
  return (<div style={{flex:1,padding:"22px 20px 32px",background:C.bg}}><div style={{fontSize:20,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:16,fontWeight:700}}>Tu perfil</div><div style={{marginBottom:14}}><div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>NOMBRE</div><input value={name} onChange={function(e){setName(e.target.value);}} placeholder="Maria Fernanda" style={{width:"100%",padding:"13px 16px",background:C.card,border:"1.5px solid "+(name?C.blue:C.border),borderRadius:12,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/></div><div style={{marginBottom:20}}><div style={{fontSize:10,fontFamily:"'Inter',sans-serif",color:C.muted,marginBottom:7,letterSpacing:1}}>USUARIO</div><input value={username} onChange={function(e){setUsername(e.target.value.toLowerCase());}} placeholder="mariafernanda" style={{width:"100%",padding:"13px 16px",background:C.card,border:"1.5px solid "+(username?C.blue:C.border),borderRadius:12,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:16,outline:"none",boxSizing:"border-box"}}/></div>{error?<div style={{background:"#3a1a1a",border:"1px solid #ff6b6b",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:"#ff2d2d",fontFamily:"'Inter',sans-serif"}}>{error}</div>:null}<div style={{display:"flex",gap:10}}><button onClick={onBack} style={{flex:1,padding:"13px",background:C.card,border:"1.5px solid "+C.border,borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,color:C.muted}}>Atras</button><button onClick={next} style={{flex:2,padding:"13px",background:"#ffcc00",color:C.text,border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>Siguiente</button></div></div>);
}

function AuthStep3(props) {
  var onNext=props.onNext,onBack=props.onBack,chosenCity=props.chosenCity,setChosenCity=props.setChosenCity,agreed=props.agreed,setAgreed=props.setAgreed; var [error,setError]=useState("");
  var next=function(){ if(!chosenCity){setError("Selecciona tu ciudad");return;} if(!agreed){setError("Debes aceptar los terminos");return;} onNext(); };
  return (<div style={{flex:1,padding:"22px 20px 32px",background:C.bg,overflowY:"auto"}}><div style={{fontSize:20,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:4,fontWeight:700}}>Tu ciudad</div><div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:16}}>Tu feed se organiza por pais</div><div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>{CITIES.map(function(c){ return (<button key={c.id} onClick={function(){setChosenCity(c.id);}} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:chosenCity===c.id?C.bg:C.card,border:"2px solid "+(chosenCity===c.id?C.yellow:C.border),borderRadius:12,cursor:"pointer",textAlign:"left"}}><span style={{fontSize:24}}>{toFlag(CITY_FLAGS[c.id])}</span><div style={{flex:1}}><div style={{fontSize:15,fontFamily:"'Syne',sans-serif",color:C.text}}>{c.name}</div><div style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{c.pop}</div></div>{chosenCity===c.id?<span style={{color:"#ffcc00",fontSize:20,fontWeight:700}}>{ICONS.check}</span>:null}</button>); })}</div><div onClick={function(){setAgreed(function(a){return !a;});}} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:C.card,borderRadius:12,border:"1.5px solid "+(agreed?C.green:C.border),cursor:"pointer",marginBottom:16}}><div style={{width:22,height:22,borderRadius:6,border:"2px solid "+(agreed?"#1a7a3c":C.border),background:agreed?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{agreed?<span style={{color:"#fff",fontSize:13,fontWeight:700}}>{ICONS.check}</span>:null}</div><div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",lineHeight:1.5}}>Acepto los <span style={{color:"#0066ff",fontWeight:700}}>Terminos</span> y la <span style={{color:"#0066ff",fontWeight:700}}>Privacidad</span> de Epale</div></div>{error?<div style={{background:"#3a1a1a",border:"1px solid #ff6b6b",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:"#ff2d2d",fontFamily:"'Inter',sans-serif"}}>{error}</div>:null}<div style={{display:"flex",gap:10}}><button onClick={onBack} style={{flex:1,padding:"13px",background:C.card,border:"1.5px solid "+C.border,borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,color:C.muted}}>Atras</button><button onClick={next} disabled={!chosenCity||!agreed} style={{flex:2,padding:"13px",background:chosenCity&&agreed?"#ffcc00":"#e8e8ed",color:chosenCity&&agreed?"#1a1a1a":"#86868b",border:"none",borderRadius:100,cursor:chosenCity&&agreed?"pointer":"not-allowed",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700}}>Siguiente</button></div></div>);
}

function AuthStep4(props) {
  var onDone=props.onDone,onBack=props.onBack,email=props.email,chosenCity=props.chosenCity,userName=props.userName||"",userPhoto=props.userPhoto,setUserPhoto=props.setUserPhoto||function(){},password=props.password||"";
  var [loading,setLoading]=useState(false); var [error,setError]=useState(""); var [sent,setSent]=useState(false);
  var handlePhoto=function(e){ var file=e.target.files&&e.target.files[0]; if(!file) return; var reader=new FileReader(); reader.onload=function(ev){ setUserPhoto(ev.target.result); }; reader.readAsDataURL(file); };
  var finish=function(){ setLoading(true); setError(""); api.signUp(email,password,userName,chosenCity,userName.toLowerCase().replace(/\s/g,"")).then(function(res){ if(res.error&&res.error!=="User already registered"){ setError(res.error_description||res.msg||res.error||"Error al crear cuenta"); setLoading(false); return; } var token=(res.session&&res.session.access_token)||res.access_token||""; var uid=(res.user&&res.user.id)||(res.session&&res.session.user&&res.session.user.id)||""; var refresh=(res.session&&res.session.refresh_token)||res.refresh_token||""; if(token){ window._supaToken=token; if(uid) api.upsertProfile(uid,userName,chosenCity,userName.toLowerCase().replace(/\s/g,"")); setLoading(false); try { localStorage.setItem("epale_session",JSON.stringify({city:chosenCity,name:userName,photo:userPhoto,token:token,uid:uid,refresh:refresh})); } catch(e){} onDone(chosenCity,userName,userPhoto,token,uid); } else { setLoading(false); setSent(true); } }).catch(function(){ setError("Error de conexion"); setLoading(false); }); };
  if(sent) return (<div style={{flex:1,padding:"40px 20px",textAlign:"center"}}><div style={{fontSize:64,marginBottom:16}}>{ICONS.email}</div><div style={{fontSize:22,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:10,fontWeight:700}}>Revisa tu correo</div><div style={{fontSize:14,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:8,lineHeight:1.6}}>Enviamos un enlace de confirmacion a</div><div style={{fontSize:15,color:"#0066ff",fontFamily:"'Inter',sans-serif",fontWeight:700,marginBottom:24}}>{email}</div><button onClick={function(){onBack();}} style={{background:"none",border:"none",cursor:"pointer",color:"#0066ff",fontFamily:"'Inter',sans-serif",fontSize:13}}>Volver al inicio</button></div>);
  return (<div style={{flex:1,padding:"22px 20px 32px",background:C.bg,textAlign:"center"}}><div style={{fontSize:52,marginBottom:10}}>{ICONS.email}</div><div style={{fontSize:20,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:6,fontWeight:700}}>Casi listo!</div><div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:20}}>Agrega tu foto y crea tu cuenta</div><div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:24}}><div style={{position:"relative",marginBottom:8}}><div style={{width:90,height:90,borderRadius:9999,overflow:"hidden",background:"linear-gradient(135deg,#ffcc00,#0066ff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:800}}>{userPhoto?<img src={userPhoto} alt="foto" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(userName?userName[0].toUpperCase():"?")}</div><label style={{position:"absolute",bottom:0,right:0,width:28,height:28,borderRadius:9999,background:"#ffcc00",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,fontWeight:700}}>+<input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/></label></div><div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Opcional - puedes agregar foto despues</div></div><div style={{background:C.card,borderRadius:12,padding:"10px 14px",marginBottom:18,textAlign:"left"}}><div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Se enviara un correo de confirmacion a:</div><div style={{fontSize:13,color:"#0066ff",fontFamily:"'Inter',sans-serif",fontWeight:700,marginTop:2}}>{email}</div></div>{error?<div style={{background:"#3a1a1a",border:"1px solid #ff6b6b",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:13,color:"#ff2d2d",fontFamily:"'Inter',sans-serif"}}>{error}</div>:null}<button onClick={finish} style={{width:"100%",padding:"14px",background:"#ffcc00",color:C.text,border:"none",borderRadius:100,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:700,marginBottom:12}}>{loading?"Creando cuenta...":"Crear cuenta y verificar correo"}</button><button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#0066ff",fontFamily:"'Inter',sans-serif",fontSize:11}}>Volver</button></div>);
}

function AuthHero(props) {
  var mode=props.mode,step=props.step;
  return (<div style={{background:"#0a0a0a",position:"relative",overflow:"hidden"}}><div style={{display:"flex",height:4}}><div style={{flex:1,background:"#ffcc00"}}/><div style={{flex:1,background:"#0066ff"}}/><div style={{flex:1,background:"#ff2d2d"}}/></div><div style={{position:"relative",padding:"36px 24px 28px",textAlign:"center"}}><div style={{fontSize:54,fontFamily:"'Syne',sans-serif",letterSpacing:-2,fontWeight:800,marginBottom:6}}><span style={{color:"#ffcc00"}}>E</span><span style={{color:"#0066ff"}}>pa</span><span style={{color:"#ff2d2d"}}>le</span></div><div style={{fontSize:22}}>{ICONS.flag_ve}</div><div style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontFamily:"'Inter',sans-serif",marginTop:6}}>venezolanos del mundo</div>{mode==="register"?(<div style={{marginTop:16,display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:3,borderRadius:2,background:"rgba(255,255,255,0.1)",overflow:"hidden"}}><div style={{height:"100%",width:((step/4)*100)+"%",background:"#ffcc00",borderRadius:2}}/></div><span style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontFamily:"'Inter',sans-serif"}}>Paso {step}/4</span></div>):null}</div></div>);
}

function Auth(props) {
  var onDone=props.onDone; var [mode,setMode]=useState("login"); var [step,setStep]=useState(1);
  var [email,setEmail]=useState(""); var [password,setPassword]=useState(""); var [password2,setPassword2]=useState("");
  var [name,setName]=useState(""); var [username,setUsername]=useState(""); var [chosenCity,setChosenCity]=useState(""); var [agreed,setAgreed]=useState(false); var [userPhoto,setUserPhoto]=useState(null);
  return (<div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}><AuthHero mode={mode} step={step}/>{mode==="login"||step===1?(<div style={{display:"flex",margin:"18px 20px 0",background:C.bg,borderRadius:100,padding:4,border:"1px solid "+C.border}}>{["login","register"].map(function(m){ return <button key={m} onClick={function(){setMode(m);setStep(1);}} style={{flex:1,padding:"10px 0",borderRadius:100,border:"none",cursor:"pointer",background:mode===m?C.card:"transparent",color:mode===m?C.text:C.muted,fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:mode===m?700:400,boxShadow:mode===m?"0 1px 6px rgba(0,0,0,0.1)":"none"}}>{m==="login"?"Iniciar sesion":"Crear cuenta"}</button>; })}</div>):null}{mode==="login"?<AuthLogin onDone={onDone}/>:null}{mode==="register"&&step===1?<AuthStep1 onNext={function(){setStep(2);}} email={email} setEmail={setEmail} password={password} setPassword={setPassword} password2={password2} setPassword2={setPassword2}/>:null}{mode==="register"&&step===2?<AuthStep2 onNext={function(){setStep(3);}} onBack={function(){setStep(1);}} name={name} setName={setName} username={username} setUsername={setUsername}/>:null}{mode==="register"&&step===3?<AuthStep3 onNext={function(){setStep(4);}} onBack={function(){setStep(2);}} chosenCity={chosenCity} setChosenCity={setChosenCity} agreed={agreed} setAgreed={setAgreed}/>:null}{mode==="register"&&step===4?<AuthStep4 onDone={onDone} onBack={function(){setStep(3);}} email={email} chosenCity={chosenCity} userName={name} userPhoto={userPhoto} setUserPhoto={setUserPhoto} password={password}/>:null}</div>);
}

export default function App() {
  var [dark,setDark]=useState(function(){ try{return localStorage.getItem("epale_dark")==="1";}catch(e){return false;} });
  var [lang,setLang]=useState(function(){ try{return localStorage.getItem("epale_lang")||"es";}catch(e){return "es";} });
  C=dark?DARK:LIGHT;
  var [screen,setScreen]=useState(function(){ try { var s=localStorage.getItem("sb-zkydbsymcnnbepvmbchr-auth-token"); if(s){ var d=JSON.parse(s); if(d&&d.access_token) return "feed"; } var s2=localStorage.getItem("epale_session"); var d2=s2?JSON.parse(s2):null; return d2&&d2.token&&d2.token.length>10?"feed":"auth"; } catch(e){ return "auth"; } });
  var [userCity,setUserCity]=useState(function(){ try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.city?d.city:"madrid"; } catch(e){ return "madrid"; } });
  var [userName,setUserName]=useState(function(){ try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.name?d.name:""; } catch(e){ return ""; } });
  var [userPhoto,setUserPhoto]=useState(function(){ try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.photo?d.photo:null; } catch(e){ return null; } });
  var [userBio,setUserBio]=useState(function(){ try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; return d&&d.bio?d.bio:""; } catch(e){ return ""; } });
  var [userId,setUserId]=useState(function(){ try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; if(d&&d.token&&d.token.length>10){ window._supaToken=d.token; } return d&&d.uid?d.uid:""; } catch(e){ return ""; } });
  var [showProfile,setShowProfile]=useState(false);
  var [following,setFollowing]=useState([]);
  var [savedPosts,setSavedPosts]=useState([]);
  var [likedPosts,setLikedPosts]=useState([]);
  var [likedLoaded,setLikedLoaded]=useState(true);
  var [activeTab,setActiveTab]=useState("feed");
  var [showSearch,setShowSearch]=useState(false);
  var [sessionExpired,setSessionExpired]=useState(false);
  var [viewingUser,setViewingUser]=useState(null);

  useEffect(function(){ _onAuthExpired=function(){ setSessionExpired(true); }; return function(){ _onAuthExpired=null; }; },[]);

  var handleExpiredLogin=function(){ try { localStorage.removeItem("epale_session"); } catch(e){} window._supaToken=null; setSessionExpired(false); setShowProfile(false); setScreen("auth"); };

  useEffect(function(){
    var doRefresh=function(){ try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):null; if(d&&d.refresh){ fetch(SUPA_URL+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY},body:JSON.stringify({refresh_token:d.refresh})}).then(function(r){return r.json();}).then(function(res){ if(res.access_token){ window._supaToken=res.access_token; d.token=res.access_token; if(res.refresh_token) d.refresh=res.refresh_token; localStorage.setItem("epale_session",JSON.stringify(d)); setSessionExpired(false); } }).catch(function(){}); } } catch(e){} };
    doRefresh(); var interval=setInterval(doRefresh,1800000);
    var authListener=supabase.auth.onAuthStateChange(function(event,session){ if(session&&session.access_token){ window._supaToken=session.access_token; setSessionExpired(false); try { var s=localStorage.getItem("epale_session"); var d=s?JSON.parse(s):{}; d.token=session.access_token; if(session.refresh_token) d.refresh=session.refresh_token; localStorage.setItem("epale_session",JSON.stringify(d)); } catch(e){} } else if(event==="SIGNED_OUT"){ window._supaToken=null; } });
    return function(){ clearInterval(interval); if(authListener&&authListener.data&&authListener.data.subscription) authListener.data.subscription.unsubscribe(); };
  },[]);

  useEffect(function(){
    if(!userId) return;
    onTokenReady(function(){
      if(!window._supaToken || window._supaToken === SUPA_KEY) {
        setLikedLoaded(true); return;
      }
      api.getFollowing(userId).then(function(data){ if(Array.isArray(data)){ var names=data.map(function(r){return r.following_name;}).filter(Boolean); if(names.length>0) setFollowing(names); } }).catch(function(){});
      api.getSaved(userId).then(function(data){ if(Array.isArray(data)){ var ids=data.map(function(r){return r.post_id;}).filter(Boolean); if(ids.length>0) setSavedPosts(ids); } }).catch(function(){});
      api.getLikes(userId).then(function(data){ if(Array.isArray(data)){ var ids=data.map(function(r){return r.post_id;}).filter(Boolean); setLikedPosts(ids); } setLikedLoaded(true); }).catch(function(){ setLikedLoaded(true); });
    });
  },[userId]);

  useEffect(function(){
    var hash=window.location.hash; if(!hash) return;
    var params={}; hash.replace("#","").split("&").forEach(function(pair){ var parts=pair.split("="); params[parts[0]]=decodeURIComponent(parts[1]||""); });
    var token=params["access_token"]; var uid=params["user_id"]||""; var type=params["type"]||"";
    if(token&&(type==="signup"||type==="magiclink"||type==="recovery"||token.length>10)){
      window._supaToken=token;
      api.getProfile(uid).then(function(profiles){ var prof=Array.isArray(profiles)&&profiles[0]; var city=prof&&prof.city?prof.city:"madrid"; var name=prof&&prof.name?prof.name:""; var photo=prof&&prof.photo_url?prof.photo_url:null; try { localStorage.setItem("epale_session",JSON.stringify({city:city,name:name,photo:photo,token:token,uid:uid})); } catch(e){} setUserCity(city); setUserName(name); setUserPhoto(photo); setUserId(uid); setScreen("feed"); window.history.replaceState(null,"","/"); }).catch(function(){ try { localStorage.setItem("epale_session",JSON.stringify({city:"madrid",name:"",photo:null,token:token,uid:uid})); } catch(e){} setUserId(uid); setScreen("feed"); window.history.replaceState(null,"","/"); });
    }
  },[]);

  var requireAuth=function(action){ if(!userId||!window._supaToken||window._supaToken===SUPA_KEY){ setSessionExpired(true); return false; } return true; };
  var toggleLike=function(postId,postOwnerId){ var pid=String(postId); if(!requireAuth()) return; setLikedPosts(function(s){ var isLiked=s.includes(pid); if(isLiked) api.unlikePost(userId,postId).catch(function(){}); else { api.likePost(userId,postId).catch(function(){}); if(postOwnerId&&postOwnerId!==userId) api.addNotification(postOwnerId,userName||"Alguien","like",postId).catch(function(){}); } return isLiked?s.filter(function(x){return x!==pid;}):[].concat(s,[pid]); }); };
  var toggleSave=function(postId){ if(!requireAuth()) return; setSavedPosts(function(s){ var isSaved=s.includes(postId); if(isSaved) api.unsavePost(userId,postId).catch(function(){}); else api.savePost(userId,postId).catch(function(){}); return isSaved?s.filter(function(x){return x!==postId;}):[].concat(s,[postId]); }); };
  var toggleFollow=function(name){ if(!requireAuth()) return; setFollowing(function(f){ var isFollowing=f.includes(name); if(isFollowing) api.unfollow(userId,name).catch(function(){}); else api.follow(userId,name).catch(function(){}); return isFollowing?f.filter(function(x){return x!==name;}):[].concat(f,[name]); }); };

  var handleDone=function(city,name,photo,token,uid){ try { var c=city||"madrid",n=name||"",p=photo||null,t=token||"",u=uid||""; setUserCity(c); if(n) setUserName(n); if(p) setUserPhoto(p); setUserId(u); if(t){ window._supaToken=t; } try { localStorage.setItem("epale_session",JSON.stringify({city:c,name:n,photo:p,token:t,uid:u})); } catch(e){} if(u&&t&&!n){ api.getProfile(u).then(function(profiles){ var prof=Array.isArray(profiles)&&profiles[0]; if(prof&&prof.name){ setUserName(prof.name); if(prof.city) setUserCity(prof.city); try { localStorage.setItem("epale_session",JSON.stringify({city:prof.city||c,name:prof.name,photo:prof.photo_url||p,token:t,uid:u})); } catch(e){} } }).catch(function(){}); } setScreen("feed"); } catch(e){} };
  var setDarkSaved=function(v){ setDark(v); try{localStorage.setItem("epale_dark",v?"1":"0");}catch(e){} };
  var setLangSaved=function(v){ setLang(v); try{localStorage.setItem("epale_lang",v);}catch(e){} };
  var handleLogout=function(){ try { localStorage.removeItem("epale_session"); } catch(e){} window._supaToken=null; setShowProfile(false); setSessionExpired(false); setScreen("auth"); };

  if(screen==="auth") return <Auth key={dark?"dark":"light"} onDone={handleDone}/>;

  if(screen==="feed") return (
    <div key={dark?"dark":"light"}>
      {sessionExpired?<SessionExpiredBanner onLogin={handleExpiredLogin}/>:null}
      {showProfile?<Profile key={dark?"dark":"light"} userCity={userCity} onLogout={handleLogout} onClose={function(){setShowProfile(false);}} onSetDark={setDarkSaved} onSetLang={setLangSaved} isDark={dark} currentLang={lang} following={following} onFollow={toggleFollow} userPhoto={userPhoto} userName={userName} onPhotoChange={setUserPhoto} userId={userId} savedPosts={savedPosts} likedPosts={likedPosts} userBio={userBio} onBioChange={setUserBio}/>:null}
      {showSearch?<Search onClose={function(){setShowSearch(false);}} posts={[]} />:null}
      {viewingUser?<UserProfile name={viewingUser} onClose={function(){setViewingUser(null);}} following={following} onFollow={toggleFollow} currentUserName={userName}/>:null}
      <Feed userCity={userCity} onProfile={function(){setShowProfile(true);}} following={following} onFollow={toggleFollow} userPhoto={userPhoto} userName={userName} userId={userId} savedPosts={savedPosts} onSave={toggleSave} likedPosts={likedPosts} onLike={toggleLike} lang={lang} userBio={userBio} likedLoaded={likedLoaded} onOpenProfile={function(n){ if(n!==userName) setViewingUser(n); else setShowProfile(true); }}/>
      <div style={{position:"fixed",bottom:0,left:0,right:0,minHeight:60,paddingBottom:"env(safe-area-inset-bottom)",background:C.card,borderTop:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:90,maxWidth:768,margin:"0 auto",visibility:window.innerWidth>=768?"hidden":"visible"}}>
        {[{id:"feed",icon:ICONS.fire,label:"Inicio"},{id:"search",icon:ICONS.comment,label:"Buscar"},{id:"post",icon:ICONS.pencil,label:"Publicar",action:true},{id:"notifs",icon:ICONS.bell,label:"Avisos"},{id:"me",icon:ICONS.group,label:"Yo"}].map(function(tab){
          var isActive=activeTab===tab.id;
          return (<button key={tab.id} onClick={function(){ if(tab.id==="me"){ setShowProfile(true); return; } if(tab.id==="search"){ setShowSearch(true); return; } if(tab.id==="post"){ document.dispatchEvent(new CustomEvent("epale:openComposer")); return; } setActiveTab(tab.id); }} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:tab.action?C.yellow:"none",border:"none",cursor:"pointer",padding:tab.action?"8px 16px":"6px 10px",borderRadius:tab.action?12:8,minWidth:48}}><span style={{fontSize:tab.action?20:18,color:tab.action?C.text:isActive?C.blue:C.muted}}>{tab.icon}</span><span style={{fontSize:9,fontFamily:"'Inter',sans-serif",color:tab.action?C.text:isActive?C.blue:C.muted,fontWeight:isActive?700:400}}>{tab.label}</span></button>);
        })}
      </div>
    </div>
  );

  return <div style={{padding:20}}>Cargando...</div>;
}
