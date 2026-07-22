console.log('Football Legacy script carregado v3.8.03 syntax safe emergency');
const API_URL = window.FOOTBALL_LEGACY_API || "/api/football-legacy";
const CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET || "";

let db = {};
let activeBallonSeason = localStorage.getItem("fl_active_ballon_season") || "";
let active = {
  usuario_id: localStorage.getItem("fl_active_usuario_id") || "",
  carreira_id: localStorage.getItem("fl_active_carreira_id") || "",
  protagonista_id: localStorage.getItem("fl_active_protagonista_id") || "",
  temporada: localStorage.getItem("fl_active_temporada") || ""
};

const tableMap = {usuario:"USUARIOS",universo:"UNIVERSOS",carreira:"CARREIRAS",personagem:"PERSONAGENS",clube:"CLUBES",temporada:"TEMPORADAS",competicao:"COMPETICOES",campeao:"CAMPEOES",estatistica:"ESTATISTICAS",bolaouro:"BOLA_DE_OURO_CARREIRA",bolaourobase:"BOLA_DE_OURO_BASE",top11:"TOP11",midia:"MIDIAS"};

const schemas = {
  personagem:[["carreira_id","ID da carreira","number"],["tipo","Tipo","select",["protagonista","coadjuvante","real"]],["nome","Nome","text"],["foto","Foto URL","fileurl"],["posicao","Posição","text"],["nacionalidade","Nacionalidade","text"],["data_nascimento","Data de nascimento","date"]],
  clube:[["nome","Nome","text"],["pais","País","text"],["escudo","Escudo URL","fileurl"],["estadio","Estádio","text"]],
  competicao:[["nome","Nome","text"]],
  campeao:[["competicao_id","ID da competição","number"],["temporada","Temporada","text"],["clube","Clube campeão","text"],["artilheiro","Artilheiro","text"],["lider_assistencias","Líder assistências","text"],["melhor_jogador","Melhor jogador","text"]],
  estatistica:[["personagem_id","ID do personagem","number"],["competicao_id","ID da competição","number"],["temporada","Temporada","text"],["jogos","Jogos","number"],["gols","Gols","number"],["assistencias","Assistências","number"],["cartoes","Cartões","number"],["media_geral","Nota geral","text"]],
  top11:[["temporada","Temporada","text"],["posicao","Posição","text"],["jogador","Jogador","text"],["overall","Overall","number"]],
  bolaouro:[["temporada","Temporada","text"],["posicao","Posição","number"],["jogador","Jogador","text"],["idade","Idade","number"],["valor_mercado","Valor de mercado","text"],["nacionalidade","Nacionalidade / Bandeira","text"],["overall","Overall","number"],["imagem_destaque_url","Imagem destaque do vencedor","fileurl"]],
  bolaourobase:[["temporada_base_id","ID temporada base","number"],["temporada","Temporada","text"],["ano","Ano","number"],["posicao","Posição","number"],["jogador","Jogador","text"],["pais","País","text"],["clube","Clube","text"],["idade_na_premiacao","Idade","number"],["valor_mercado","Valor de mercado","text"],["imagem_url","Imagem URL","fileurl"]],
  midia:[["carreira_id","ID da carreira","number"],["temporada","Temporada","text"],["tipo","Tipo","select",["imagem","video"]],["titulo","Título","text"],["descricao","Descrição","textarea"],["url","URL","fileurl"]]
};

const pageTitles = {dashboard:"Resumo",personagens:"Personagens",estatisticas:"Estatísticas",trofeus:"Troféus",top11:"Top 11",bolaouro:"Bola de Ouro",clubes:"Clubes",museu:"Museu",selecaobrasileira:"Seleção Brasileira"};

var $ = function $(id){return document.getElementById(id)}

var jsonpRequest = function jsonpRequest(url, timeoutMs = 20000){
  return new Promise((resolve, reject)=>{
    const callbackName = "__fl_jsonp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const separator = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    const timeout = setTimeout(()=>{
      cleanup();
      reject(new Error("Tempo esgotado carregando Apps Script via JSONP"));
    }, timeoutMs);

    var cleanup = function cleanup(){
      clearTimeout(timeout);
      if(script.parentNode) script.parentNode.removeChild(script);
      try{ delete window[callbackName]; }catch(e){ window[callbackName] = undefined; }
    }

    window[callbackName] = data=>{
      cleanup();
      resolve(data);
    };

    script.onerror = ()=>{
      cleanup();
      reject(new Error("Falha ao carregar Apps Script via JSONP"));
    };

    script.src = url + separator + "callback=" + encodeURIComponent(callbackName) + "&jsonpCache=" + Date.now();
    document.head.appendChild(script);
  });
}
var bind = function bind(id,event,handler){
  const el = $(id);
  if(el) el.addEventListener(event, handler);
}
var setClick = function setClick(id,handler){
  bind(id,"click",handler);
}
var setStatus = function setStatus(msg,type=""){const el=$("statusBar"); if(el){el.textContent=msg; el.className="status-bar "+type}}
var setText = function setText(id,v){const el=$(id); if(el) el.textContent=v}
var num = function num(v){const n=Number(String(v||"").replace(",", ".")); return isNaN(n)?0:n}
var getTable = function getTable(name){return db[name]||[]}
var byId = function byId(table,id){return getTable(table).find(x=>String(x.id)===String(id))}
var initials = function initials(name){return String(name||"FL").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}
var compName = function compName(id){const c=byId("COMPETICOES",id); return c?c.nome:(id||"-")}
var personagemName = function personagemName(id){const p=byId("PERSONAGENS",id); return p?p.nome:(id||"-")}
var getUserUniverses = function getUserUniverses(uid){return getTable("UNIVERSOS").filter(u=>String(u.usuario_id)===String(uid))}
var getCareersForUser = function getCareersForUser(uid){const ids=getUserUniverses(uid).map(u=>String(u.id)); return getTable("CARREIRAS").filter(c=>ids.includes(String(c.universo_id)))}
var getActiveUser = function getActiveUser(){return byId("USUARIOS",active.usuario_id)||getTable("USUARIOS")[0]}
var getActiveCareer = function getActiveCareer(){return byId("CARREIRAS",active.carreira_id)||getCareersForUser(active.usuario_id)[0]||getTable("CARREIRAS")[0]}
var getCareerCharacters = function getCareerCharacters(){const c=getActiveCareer(); return c?getTable("PERSONAGENS").filter(p=>String(p.carreira_id)===String(c.id)):[]}
var getActiveProtagonist = function getActiveProtagonist(){return byId("PERSONAGENS",active.protagonista_id)||getCareerCharacters().find(p=>p.tipo==="protagonista")||getCareerCharacters()[0]}
var getCareerSeasons = function getCareerSeasons(){const c=getActiveCareer(); return c?getTable("TEMPORADAS").filter(t=>String(t.carreira_id)===String(c.id)):[]}
var getCareerMedia = function getCareerMedia(){const c=getActiveCareer(); return c?getTable("MIDIAS").filter(m=>String(m.carreira_id)===String(c.id)):[]}
var getProtagonistStats = function getProtagonistStats(){const p=getActiveProtagonist(); return p?getTable("ESTATISTICAS").filter(s=>String(s.personagem_id)===String(p.id)):[]}
var saveActive = function saveActive(){Object.entries(active).forEach(([k,v])=>localStorage.setItem("fl_active_"+k, v||""))}

var ensureActive = function ensureActive(){
  const users=getTable("USUARIOS"); if(!active.usuario_id&&users[0]) active.usuario_id=String(users[0].id);
  let careers=getCareersForUser(active.usuario_id); if(!careers.length) careers=getTable("CARREIRAS");
  if(!active.carreira_id&&careers[0]) active.carreira_id=String(careers[0].id);
  const chars=getCareerCharacters(); if(!active.protagonista_id&&chars[0]) active.protagonista_id=String(chars[0].id);
  saveActive();
}

var escapeAttr = function escapeAttr(value){
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

var escapeHtml = function escapeHtml(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


var seasonKey = function seasonKey(value){const m=String(value||"").match(/\d{4}/g); return m?Number(m[m.length-1]):0}
var compareSeasonsDesc = function compareSeasonsDesc(a,b){return seasonKey(b)-seasonKey(a)}
var getAvailableSeasonsForActivePlayer = function getAvailableSeasonsForActivePlayer(){
  const stats=getProtagonistStats().map(s=>s.temporada).filter(Boolean);
  const seasons=getCareerSeasons().map(s=>s.temporada).filter(Boolean);
  return [...new Set([...stats,...seasons])].sort(compareSeasonsDesc);
}
var getCurrentSeason = function getCurrentSeason(stats=getProtagonistStats()){
  const all=[...new Set([...stats.map(s=>s.temporada).filter(Boolean),...getCareerSeasons().map(s=>s.temporada).filter(Boolean)])].sort(compareSeasonsDesc);
  if(active.temporada&&all.includes(active.temporada)) return active.temporada;
  active.temporada=all[0]||""; saveActive(); return active.temporada;
}


// ===== V3.7.7 SUMMARY FIRST — SEM LOCALSTORAGE =====
const SUMMARY_TABLES = [
  "USUARIOS",
  "UNIVERSOS",
  "CARREIRAS",
  "PERSONAGENS",
  "CLUBES",
  "CARREIRA_TEMPORADAS",
  "ESTATISTICAS_CARREIRA",
  "ESTATISTICAS",
  "CAMPEOES_CARREIRA",
  "CAMPEOES"
];

var normalizeDbAfterLoad = function normalizeDbAfterLoad(){
  if(!db || typeof db !== "object") db = {};
  Object.keys(db).forEach(k=>{
    if(!Array.isArray(db[k])) db[k] = [];
  });
}

var fetchApiAction = async function fetchApiAction(action){
  const base = API_URL;
  const url = `${base}${base.includes("?") ? "&" : "?"}action=${encodeURIComponent(action)}&cache=${Date.now()}`;
  console.log("Football Legacy API:", url);

  let data;

  if(API_URL.startsWith("/api/")){
    const res = await fetch(url, {cache:"no-store"});
    data = await res.json();
  }else{
    try{
      data = await fetchJsonp(`${API_URL}?action=${encodeURIComponent(action)}`);
    }catch(jsonpErr){
      console.warn("JSONP falhou, tentando fetch:", jsonpErr);
      const res = await fetch(url, {cache:"no-store"});
      data = await res.json();
    }
  }

  if(!data || !data.ok){
    throw new Error(data?.error || "Erro ao carregar action=" + action);
  }

  return data.data || {};
}

var mergeDb = function mergeDb(partial){
  if(!db || typeof db !== "object") db = {};
  Object.keys(partial || {}).forEach(k=>{
    db[k] = Array.isArray(partial[k]) ? partial[k] : [];
  });
  normalizeDbAfterLoad();
}

var renderOnlyResumoAfterSummary = function renderOnlyResumoAfterSummary(){
  try{
    renderGlobalSelectorsOnly ? renderGlobalSelectorsOnly() : renderSelectors();
  }catch(err){
    console.error("Erro selectors summary", err);
  }

  try{
    if(typeof renderPageById === "function"){
      renderPageById("dashboard", true);
    }else if(typeof renderDashboardJourney === "function"){
      renderDashboardJourney();
      if(typeof renderPlayedSeasons === "function") renderPlayedSeasons();
    }else{
      renderAll();
    }
  }catch(err){
    console.error("Erro render resumo summary", err);
  }
}

var loadData = async function loadData(options={}){
  setStatus("Carregando Resumo rápido...");

  let summaryLoaded = false;

  try{
    const summary = await fetchApiAction("summary");
    mergeDb(summary);
    summaryLoaded = true;

    console.log("Football Legacy resumo carregado:", {
      usuarios:getTable("USUARIOS").length,
      carreiras:getTable("CARREIRAS").length,
      personagens:getTable("PERSONAGENS").length,
      temporadas:getTable("CARREIRA_TEMPORADAS").length,
      stats:getTable("ESTATISTICAS_CARREIRA").length
    });

    renderOnlyResumoAfterSummary();
    setStatus("Resumo carregado. Carregando dados completos em segundo plano...", "ok");
  }catch(err){
    console.warn("Resumo rápido falhou, carregando banco completo:", err);
    setStatus("Resumo rápido falhou. Carregando banco completo...");
  }

  try{
    const full = await fetchApiAction("all");
    db = full;
    normalizeDbAfterLoad();

    console.log("Football Legacy banco completo carregado:", {
      usuarios:getTable("USUARIOS").length,
      carreiras:getTable("CARREIRAS").length,
      personagens:getTable("PERSONAGENS").length,
      temporadas:getTable("CARREIRA_TEMPORADAS").length,
      stats:getTable("ESTATISTICAS_CARREIRA").length,
      bolaBase:getTable("BOLA_DE_OURO_BASE").length,
      recordsBase:getTable("RECORDS_BASE").length
    });

    // Mantém o Resumo e só renderiza a página atual depois do banco completo.
    if(summaryLoaded && typeof renderPageById === "function"){
      renderGlobalSelectorsOnly();
      renderPageById(getCurrentPageId ? getCurrentPageId() : "dashboard", true);
    }else{
      renderAll();
    }

    setStatus("Dados completos carregados do Google Sheets.", "ok");
  }catch(err){
    console.error("Erro ao carregar banco completo:", err);
    if(summaryLoaded){
      setStatus("Resumo carregado, mas falhou ao carregar dados completos: " + err.message, "warn");
    }else{
      setStatus("Erro ao carregar Google Sheets: " + err.message, "error");
    }
  }
}

var forceRefreshData = async function forceRefreshData(){
  await loadData({force:true});
}

window.forceRefreshData = forceRefreshData;


var apiPost = async function apiPost(payload){
  const res = await fetch(API_URL, {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify(payload)
  });

  if(!res.ok){
    throw new Error("HTTP " + res.status + " ao salvar via proxy Vercel");
  }

  return await res.json();
}


// ===== V3.6.3 LAZY RENDER: RESUMO PRIMEIRO =====
let renderedPages = {};
let currentPageId = "resumo";

var getCurrentPageId = function getCurrentPageId(){
  const activePage = document.querySelector(".page.active");
  return activePage ? activePage.id : (currentPageId || "resumo");
}

var renderGlobalSelectorsOnly = function renderGlobalSelectorsOnly(){
  try{
    renderSelectors();
  }catch(err){
    console.error("Erro em renderSelectors", err);
  }

  try{
    renderSidebar();
  }catch(err){
    console.error("Erro em renderSidebar", err);
  }

  // FIX V3.8.13: renderPrimaryButton existia mas nunca era chamada em lugar
  // nenhum, então o botão "+ Criar Carreira" nunca recebia onclick nem
  // atualizava seu texto para "+ Criar Personagem" quando já havia carreira ativa.
  try{
    renderPrimaryButton();
  }catch(err){
    console.error("Erro em renderPrimaryButton", err);
  }
}

var renderResumoFast = function renderResumoFast(){
  const tasks = [
    ["renderHero", ()=>renderHero()],
    ["renderSummaryCards", ()=>renderSummaryCards()],
    ["renderPlayedSeasons", ()=>renderPlayedSeasons()]
  ];

  tasks.forEach(([name,fn])=>{
    try{ fn(); }
    catch(err){ console.error("Erro em " + name, err); }
  });
}

var renderPageById = function renderPageById(pageId, force=false){
  const page = pageId || getCurrentPageId() || "resumo";

  if(!force && renderedPages[page]) return;

  if(page === "resumo"){
    renderResumoFast();
  }else if(page === "personagens"){
    try{ renderPersonagens(); }catch(err){ console.error("Erro em renderPersonagens", err); }
  }else if(page === "estatisticas"){
    try{ renderEstatisticas(); }catch(err){ console.error("Erro em renderEstatisticas", err); }
  }else if(page === "trofeus"){
    try{ renderTrofeus(); }catch(err){ console.error("Erro em renderTrofeus", err); }
  }else if(page === "top11"){
    try{ renderTop11(); }catch(err){ console.error("Erro em renderTop11", err); }
  }else if(page === "bolaouro"){
    // Bola de Ouro é a página mais pesada; só renderiza quando abrir.
    try{ renderBolaOuro(); }catch(err){ console.error("Erro em renderBolaOuro", err); }
  }else if(page === "records"){
    try{ renderRecords(); }catch(err){ console.error("Erro em renderRecords", err); }
  }else if(page === "clubes"){
    try{ renderClubes(); }catch(err){ console.error("Erro em renderClubes", err); }
  }else if(page === "museu"){
    try{ renderMuseu(); }catch(err){ console.error("Erro em renderMuseu", err); }
  }

  renderedPages[page] = true;
}

var renderAll = function renderAll(){
  renderedPages = {};
  renderGlobalSelectorsOnly();

  // Renderiza imediatamente só o Resumo.
  renderPageById("resumo", true);

  // Se o usuário estiver em outra página por algum motivo, renderiza ela depois.
  const active = getCurrentPageId();
  if(active && active !== "resumo"){
    setTimeout(()=>renderPageById(active, true), 80);
  }
}



var renderSelectors = function renderSelectors(){
  const users=getTable("USUARIOS");
  if($("userSelect")) $("userSelect").innerHTML=users.map(u=>`<option value="${u.id}" ${String(u.id)===String(active.usuario_id)?"selected":""}>${u.nome||"Usuário "+u.id}</option>`).join("")||`<option>Nenhum usuário</option>`;
  let careers=getCareersForUser(active.usuario_id); if(!careers.length) careers=getTable("CARREIRAS");
  if($("careerSelect")) $("careerSelect").innerHTML=careers.map(c=>`<option value="${c.id}" ${String(c.id)===String(active.carreira_id)?"selected":""}>${c.nome||"Carreira "+c.id}</option>`).join("")||`<option>Nenhuma carreira</option>`;
  const chars=getCareerCharacters();
  if($("protagonistSelect")) $("protagonistSelect").innerHTML=chars.map(p=>`<option value="${p.id}" ${String(p.id)===String(active.protagonista_id)?"selected":""}>${p.nome||"Personagem "+p.id}</option>`).join("")||`<option>Nenhum personagem</option>`;
}

var renderSeasonSelector = function renderSeasonSelector(){
  const select=$("seasonSelect"); if(!select) return;
  const seasons=getAvailableSeasonsForActivePlayer();
  const current=getCurrentSeason();
  select.innerHTML=seasons.length?seasons.map(s=>`<option value="${s}" ${s===current?"selected":""}>${s}</option>`).join(""):`<option value="">-</option>`;
  select.value=current||"";
  select.onchange=e=>{active.temporada=e.target.value;saveActive();renderDashboard();renderPlayedSeasons();renderStats()};
}

var renderDashboard = function renderDashboard(){
  const user=getActiveUser(), career=getActiveCareer(), protagonist=getActiveProtagonist(), stats=getProtagonistStats();
  const season=getCurrentSeason(stats);
  const currentStats=season?stats.filter(s=>String(s.temporada)===String(season)):stats;
  const games=currentStats.reduce((a,b)=>a+num(b.jogos),0), goals=currentStats.reduce((a,b)=>a+num(b.gols),0), assists=currentStats.reduce((a,b)=>a+num(b.assistencias),0);
  setText("careerNameSide",career?career.nome:"Football Legacy"); setText("careerMetaSide",user?user.nome:"Google Sheets");
  setText("currentSeason",season||"Banco conectado"); setText("mainCharacterTitle",protagonist?protagonist.nome:"Protagonista");
  setText("mainCharacterDesc",career?career.descricao||"Resumo da carreira do jogador selecionado.":"Crie uma carreira.");
  setText("activePosition",protagonist?protagonist.posicao||"-":"-"); setText("currentGamesHero",games); setText("currentGoalsHero",goals); setText("currentAssistsHero",assists);
  setText("currentAvgGoalsHero",games?(goals/games).toFixed(2):"0.00"); setText("currentAvgAssistsHero",games?(assists/games).toFixed(2):"0.00");
  setText("mainCharacter",protagonist?protagonist.nome:"Sem personagem"); setText("mainCharacterSub",protagonist?`${protagonist.posicao||"-"} • ${protagonist.nacionalidade||"-"}`:"Cadastre um personagem");
  setPlayerPhoto(protagonist); renderSeasonSelector();
}

var setPlayerPhoto = function setPlayerPhoto(p){
  const img=$("mainPlayerPhoto"), fallback=$("mainInitials"); if(!img||!fallback)return;
  const url=p&&p.foto?String(p.foto).trim():"";
  img.onload=()=>{img.classList.add("visible");fallback.classList.add("hidden")};
  img.onerror=()=>{img.classList.remove("visible");fallback.classList.remove("hidden");fallback.textContent=initials(p?p.nome:"FL")};
  if(url){img.src=url}else{img.removeAttribute("src");img.classList.remove("visible");fallback.classList.remove("hidden");fallback.textContent=initials(p?p.nome:"FL")}
}



var setButtonSaving = function setButtonSaving(btn, label="Salvando..."){
  if(!btn) return;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.disabled = true;
  btn.classList.add("saving");
  btn.textContent = label;
}

var clearButtonSaving = function clearButtonSaving(btn){
  if(!btn) return;
  btn.disabled = false;
  btn.classList.remove("saving");
  if(btn.dataset.originalText){
    btn.textContent = btn.dataset.originalText;
    delete btn.dataset.originalText;
  }
}

// ===== V3.6 SEASON STINTS / PASSAGENS POR TIME =====
var monthYearToSeason = function monthYearToSeason(value){
  const v = String(value || "").trim();
  if(!v) return "";

  let year = "";
  let month = "";

  // aceita YYYY-MM
  let m = v.match(/^(\d{4})-(\d{1,2})$/);
  if(m){
    year = Number(m[1]);
    month = Number(m[2]);
  }else{
    // aceita MM/YYYY
    m = v.match(/^(\d{1,2})\/(\d{4})$/);
    if(m){
      month = Number(m[1]);
      year = Number(m[2]);
    }else{
      // aceita só YYYY
      m = v.match(/^(\d{4})$/);
      if(m){
        year = Number(m[1]);
        month = 7;
      }
    }
  }

  if(!year || !month) return "";

  // Temporada europeia/sul-americana estilo modo carreira:
  // julho a dezembro -> ano/ano+1
  // janeiro a junho -> ano-1/ano
  const start = month >= 7 ? year : year - 1;
  return `${start}/${start+1}`;
}

var getCareerSeasonRecords = function getCareerSeasonRecords(){
  const carreira = getActiveCareer();
  if(!carreira) return [];

  const nova = getTable("CARREIRA_TEMPORADAS")
    .filter(t=>String(t.carreira_id)===String(carreira.id));

  if(nova.length) return nova;

  return getTable("TEMPORADAS")
    .filter(t=>String(t.carreira_id)===String(carreira.id));
}

var getSeasonRecordLabel = function getSeasonRecordLabel(row){
  const inicio = row.data_inicio || row.periodo_inicio || "";
  const fim = row.data_fim || row.periodo_fim || "";
  const periodo = inicio || fim ? ` • ${inicio || "?"} até ${fim || "?"}` : "";
  return `${row.temporada || "-"} • ${row.clube_nome || row.time || "-"}${periodo}`;
}

var getCompetitionsFromSeasonRecord = function getCompetitionsFromSeasonRecord(row){
  return String(row.competicoes || "")
    .split(",")
    .map(x=>x.trim())
    .filter(Boolean);
}

var findCompetitionIdByName = function findCompetitionIdByName(name){
  const all = [...getTable("COMPETICOES"), ...getTable("COMPETICOES_BASE")];
  const n = String(name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const found = all.find(c=>{
    const a = String(c.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const b = String(c.nome_curto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    return a === n || b === n;
  });
  return found ? found.id : "";
}

var getSeasonStatsForRecord = function getSeasonStatsForRecord(seasonRecord){
  const p = getActiveProtagonist();
  if(!p || !seasonRecord) return [];

  const tableNew = getTable("ESTATISTICAS_CARREIRA")
    .filter(s=>String(s.carreira_temporada_id)===String(seasonRecord.id) && String(s.personagem_id)===String(p.id));

  if(tableNew.length) return tableNew;

  return getTable("ESTATISTICAS")
    .filter(s=>
      String(s.personagem_id)===String(p.id) &&
      String(s.temporada)===String(seasonRecord.temporada) &&
      (!seasonRecord.clube_nome || String(s.clube_nome || "").toLowerCase()===String(seasonRecord.clube_nome || "").toLowerCase())
    );
}


var renderPlayedSeasons = function renderPlayedSeasons(){
  const container = $("playedSeasonsCards") || $("playedSeasonsTable");
  if(!container) return;

  const p = getActiveProtagonist();
  const rows = getCareerSeasonRecords()
    .sort((a,b)=>compareSeasonsDesc(a.temporada,b.temporada) || num(a.ordem_na_carreira)-num(b.ordem_na_carreira));

  if(!rows.length){
    container.innerHTML = `<div class="season-empty">Nenhuma passagem de temporada cadastrada ainda.</div>`;
    return;
  }

  container.innerHTML = rows.map(r=>{
    const stats = getSeasonStatsForRecord(r);
    const jogos = stats.reduce((acc,s)=>acc+num(s.jogos),0);
    const gols = stats.reduce((acc,s)=>acc+num(s.gols),0);
    const assistencias = stats.reduce((acc,s)=>acc+num(s.assistencias),0);
    const cartoes = stats.reduce((acc,s)=>acc+num(s.cartoes),0);
    const notas = stats.map(s=>num(s.nota_geral || s.media_geral)).filter(x=>x);
    const avgGoals = jogos ? (gols/jogos).toFixed(2) : "0.00";
    const avgAssists = jogos ? (assistencias/jogos).toFixed(2) : "0.00";
    const avgRating = notas.length ? (notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(2) : "-";
    const periodo = (r.data_inicio || r.data_fim) ? `${r.data_inicio || "?"} até ${r.data_fim || "?"}` : "Período não definido";

    const titles = getTable("CAMPEOES_CARREIRA")
      .filter(t=>String(t.carreira_temporada_id)===String(r.id))
      .map(t=>`<span class="title-badge" title="${escapeHtml(t.competicao || "")}">${trophyIcon(t.competicao)}</span>`).join("") ||
      `<span class="title-badge empty" title="Sem títulos">–</span>`;

    return `
      <article class="season-card">
        <div class="season-card-main">
          <div class="season-club-crest">
            ${r.escudo ? `<img src="${r.escudo}" onerror="this.parentElement.innerHTML='<span>⚽</span>'">` : `<span>⚽</span>`}
          </div>
          <div>
            <strong>${escapeHtml(r.temporada || "-")}</strong>
            <h4>${escapeHtml(r.clube_nome || r.time || "-")}</h4>
            <small>${escapeHtml(periodo)} • ${escapeHtml(r.competicoes || "Sem competições")}</small>
          </div>
        </div>

        <div class="season-stat"><small>Jogos</small><strong>${jogos}</strong></div>
        <div class="season-stat"><small>Gols</small><strong>${gols}</strong></div>
        <div class="season-stat"><small>Assist.</small><strong>${assistencias}</strong></div>
        <div class="season-stat"><small>G/J</small><strong>${avgGoals}</strong></div>
        <div class="season-stat"><small>A/J</small><strong>${avgAssists}</strong></div>
        <div class="season-stat"><small>Cartões</small><strong>${cartoes}</strong></div>
        <div class="season-stat"><small>Nota média</small><strong>${avgRating}</strong></div>
        <div class="season-titles">${titles}</div>
        <div class="season-actions"><button onclick="editSeasonRecord('${r.id}')">Editar</button></div>
      </article>
    `;
  }).join("");
}


var trophyIcon = function trophyIcon(name){
  const n = String(name||"").toLowerCase();
  if(n.includes("champions")) return "🏆";
  if(n.includes("mundo") || n.includes("world")) return "🌍";
  if(n.includes("liga") || n.includes("league")) return "🥇";
  if(n.includes("copa") || n.includes("cup")) return "🏅";
  if(n.includes("libertadores")) return "🏆";
  if(n.includes("super")) return "⭐";
  return "🏆";
}

var renderPersonagens = function renderPersonagens(){
  const el=$("personagens-list"); if(!el)return;
  const chars=getCareerCharacters();
  el.innerHTML=chars.map(p=>`<article class="entity-card"><div class="entity-top"><div class="entity-avatar" style="${p.foto?`background-image:url('${p.foto}')`:''}">${p.foto?'':initials(p.nome)}</div><div><h3><button class="clickable-player-name" onclick="openForm('personagem','${p.id}')">${p.nome||"-"}</button></h3><small>${p.tipo||"-"} • ${p.posicao||"-"}</small></div></div><small>Nacionalidade: ${p.nacionalidade||"-"}</small><div class="entity-actions"><button onclick="setActiveProtagonist('${p.id}')">Selecionar</button><button onclick="openForm('personagem','${p.id}')">Editar</button><button class="delete" onclick="removeRecord('personagem','${p.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhum personagem nesta carreira.");
}

var renderStats = function renderStats(){
  const el=$("stats-table"); if(!el)return;
  const season=getCurrentSeason(); const rows=getProtagonistStats().filter(s=>!season||String(s.temporada)===String(season));
  el.innerHTML=`<div class="table-row header"><div>Temporada</div><div>Competição</div><div>Jogos</div><div>Gols</div><div>Assist.</div><div>G/J</div><div>A/J</div><div>Ações</div></div>`+
  rows.map(s=>{const g=num(s.jogos),go=num(s.gols),a=num(s.assistencias);return`<div class="table-row"><div>${s.temporada}</div><div>${compName(s.competicao_id)}</div><div>${g}</div><div>${go}</div><div>${a}</div><div>${g?(go/g).toFixed(2):"0.00"}</div><div>${g?(a/g).toFixed(2):"0.00"}</div><div><button onclick="openForm('estatistica','${s.id}')">Editar</button></div></div>`}).join("");
}

var renderTrofeus = function renderTrofeus(){
  const el=$("trophy-grid"); if(!el)return;
  const rows=getTable("CAMPEOES");
  el.innerHTML=rows.map(t=>`<article class="trophy-card"><h3>${compName(t.competicao_id)}</h3><div style="font-size:36px;margin:12px 0">🏆</div><span>${t.temporada||"-"} • ${t.clube||"-"}</span><div class="entity-actions"><button onclick="openForm('campeao','${t.id}')">Editar</button><button class="delete" onclick="removeRecord('campeao','${t.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhum título cadastrado.");
}

var renderTop11 = function renderTop11(){
  // FIX V3.8.13: esta função lia da aba legada "TOP11", que nunca teve
  // coluna carreira_id — comparava só pelo nome da temporada, então
  // carreiras diferentes com a mesma temporada (ex: "2034/2035") vazavam
  // dados uma na outra. O Top 11 de verdade agora é só o mapa novo
  // (FL_renderTop11MapV3781 / TOP11_CARREIRA), que já filtra por carreira_id.
  const el=$("top11Pitch"); if(!el)return;
  el.innerHTML="";
}


var uniqueBallonRows = function uniqueBallonRows(rows){
  const map = new Map();

  rows
    .slice()
    .sort((a,b)=>num(a.posicao)-num(b.posicao) || num(b.id)-num(a.id))
    .forEach(row=>{
      const pos = String(row.posicao || "").trim();
      if(!pos) return;

      // Mantém apenas uma linha por posição. Se tiver duplicada na planilha, some do dashboard.
      if(!map.has(pos)){
        map.set(pos,row);
      }
    });

  return [...map.values()].sort((a,b)=>num(a.posicao)-num(b.posicao));
}


var getBallonSeasons = function getBallonSeasons(){
  return [...new Set(getTable("BOLA_DE_OURO").map(x=>x.temporada).filter(Boolean))]
    .sort(compareSeasonsDesc);
}

var getActiveBallonSeason = function getActiveBallonSeason(){
  const seasons = getBallonSeasons();

  if(activeBallonSeason && seasons.includes(activeBallonSeason)){
    return activeBallonSeason;
  }

  const current = getCurrentSeason();
  if(current && seasons.includes(current)){
    activeBallonSeason = current;
    localStorage.setItem("fl_active_ballon_season", activeBallonSeason);
    return activeBallonSeason;
  }

  activeBallonSeason = seasons[0] || "";
  localStorage.setItem("fl_active_ballon_season", activeBallonSeason);
  return activeBallonSeason;
}

var renderBallonSeasonSelector = function renderBallonSeasonSelector(){
  const select = $("ballonSeasonSelect");
  if(!select) return;

  const seasons = getBallonSeasons();
  const selected = getActiveBallonSeason();

  select.innerHTML = seasons.length
    ? seasons.map(s=>`<option value="${s}" ${String(s)===String(selected)?"selected":""}>${s}</option>`).join("")
    : `<option value="">Sem rankings</option>`;

  select.value = selected || "";

  select.onchange = e => {
    activeBallonSeason = e.target.value;
    localStorage.setItem("fl_active_ballon_season", activeBallonSeason);
    renderBolaOuro();
  };
}

var renderBolaOuro = function renderBolaOuro(){
  renderBallonSeasonSelector();

  const all=getTable("BOLA_DE_OURO");
  const season=getActiveBallonSeason();

  const rawRows=all
    .filter(r=>!season||String(r.temporada)===String(season))
    .sort((a,b)=>num(a.posicao)-num(b.posicao));

  const rows=uniqueBallonRows(rawRows).slice(0,10);
  const winner=rows.find(r=>String(r.posicao)==="1")||rows[0];

  setText("ballonSeasonLabel", season?`1º ao 10º colocado • ${season}`:"1º ao 10º colocado");

  const poster=$("ballon-poster");
  if(poster){
    const url=winner&&(winner.imagem_destaque_url||winner.url||"");
    if(url){
      poster.classList.add("has-image");
      poster.style.backgroundImage=`url("${url}")`;
    }else{
      poster.classList.remove("has-image");
      poster.style.backgroundImage="";
    }
  }

  const list=$("ballon-ranking-list");
  if(!list)return;

  list.innerHTML=`<div class="ballon-head"><div>#</div><div>Jogador</div><div>Idade</div><div>Valor</div><div></div></div>`+
  rows.map(r=>`<div class="ballon-row ${String(r.posicao)==="1"?"first":""}">
    <div>${r.posicao||"-"}</div>
    <div class="ballon-player-cell">
      <span class="flag-dot">${flagFrom(r.nacionalidade)}</span>
      <button onclick="openPlayerByName('${escapeAttr(r.jogador||"")}')">${escapeHtml(r.jogador||"-")}</button>
    </div>
    <div>${r.idade||"-"}</div>
    <div>${r.valor_mercado||"-"}</div>
    <div class="ballon-actions"><button onclick="openBallonRankingForm('${r.id}')">Editar</button></div>
  </div>`).join("")+
  (!rows.length?`<div class="ballon-row"><div>-</div><div>Nenhum ranking cadastrado para esta temporada.</div><div>-</div><div>-</div><div></div></div>`:"");
}

var renderClubes = function renderClubes(){
  const el=$("clubes-list"); if(!el)return;
  const rows=getTable("CLUBES");
  el.innerHTML=rows.map(c=>`<article class="entity-card"><div class="entity-top"><div class="entity-avatar">${c.escudo?`<img src="${c.escudo}">`:"🏟"}</div><div><h3>${c.nome||"-"}</h3><small>${c.pais||"-"}</small></div></div><small>Estádio: ${c.estadio||"-"}</small><div class="entity-actions"><button onclick="openForm('clube','${c.id}')">Editar</button><button class="delete" onclick="removeRecord('clube','${c.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhum clube.");
}

var renderMuseu = function renderMuseu(){
  const el=$("media-grid"); if(!el)return;
  const rows=getCareerMedia();
  el.innerHTML=rows.map(m=>`<article class="media-card"><div style="font-size:34px">${m.tipo==="video"?"🎥":"📸"}</div><strong>${m.titulo||"-"}</strong><span>${m.temporada||"-"} • ${m.descricao||""}</span>${m.url?`<a href="${m.url}" target="_blank">Abrir mídia</a>`:""}<div class="entity-actions"><button onclick="openForm('midia','${m.id}')">Editar</button><button class="delete" onclick="removeRecord('midia','${m.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhuma mídia.");
}

var renderPrimaryButton = function renderPrimaryButton(){
  const btn=$("primaryCreateBtn"); if(!btn)return;
  const career=getActiveCareer();
  btn.textContent=career?"+ Criar Personagem":"+ Criar Carreira";
  btn.onclick=()=>career?openForm("personagem"):openQuickCareerForm();
}

var emptyCard = function emptyCard(text){return `<article class="entity-card"><small>${text}</small></article>`}
var flagFrom = function flagFrom(v){
  const raw = String(v || "").trim();
  if(!raw) return "🌐";

  // Se já vier emoji, usa emoji.
  if(raw.length <= 4 && /[\uD83C][\uDDE6-\uDDFF]/.test(raw)) return raw;

  const key = raw.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[.]/g,"")
    .replace(/\s+/g,"")
    .replace(/-/g,"");

  const map = {
    // Americas
    br:"br", bra:"br", brasil:"br", brazil:"br", brasileiro:"br", brasileira:"br",
    ar:"ar", arg:"ar", argentina:"ar", argentino:"ar",
    uy:"uy", uru:"uy", uruguai:"uy", uruguay:"uy",
    cl:"cl", chile:"cl",
    co:"co", colombia:"co",
    us:"us", usa:"us", eua:"us", estadosunidos:"us", unitedstates:"us",
    ca:"ca", canada:"ca",

    // Europe
    es:"es", esp:"es", espanha:"es", spain:"es", espanhol:"es", espanhola:"es",
    fr:"fr", fra:"fr", franca:"fr", france:"fr", frances:"fr", francesa:"fr",
    pt:"pt", por:"pt", portugal:"pt", portugues:"pt", portuguesa:"pt",
    it:"it", ita:"it", italia:"it", italy:"it", italiano:"it", italiana:"it",
    de:"de", ger:"de", alemanha:"de", germany:"de", alemao:"de", alema:"de",
    nl:"nl", holanda:"nl", netherlands:"nl", dutch:"nl", neerlandes:"nl",
    be:"be", belgica:"be", belgium:"be",
    gb:"gb", uk:"gb", unitedkingdom:"gb", inglaterra:"gb", england:"gb", ingles:"gb",
    scotland:"gb", escocia:"gb", northernireland:"gb", irlandadonorte:"gb", wales:"gb", gales:"gb",
    ie:"ie", ireland:"ie", irlanda:"ie",
    dk:"dk", denmark:"dk", dinamarca:"dk",
    no:"no", norway:"no", noruega:"no",
    se:"se", sweden:"se", suecia:"se",
    hr:"hr", croatia:"hr", croacia:"hr",
    rs:"rs", serbia:"rs", servia:"rs",
    ch:"ch", switzerland:"ch", suica:"ch",
    at:"at", austria:"at",
    hu:"hu", hungary:"hu", hungria:"hu",
    bg:"bg", bulgaria:"bg",
    cz:"cz", czechrepublic:"cz", tcheca:"cz", republicatcheca:"cz",
    sk:"sk", slovakia:"sk", eslovaquia:"sk",
    pl:"pl", poland:"pl", polonia:"pl",
    ro:"ro", romania:"ro",
    ua:"ua", ukraine:"ua", ucrania:"ua",
    ru:"ru", russia:"ru", sovietunion:"ru", uniaosovietica:"ru",
    liberia:"lr", lr:"lr",

    // Africa
    eg:"eg", egypt:"eg", egito:"eg",
    ma:"ma", morocco:"ma", marrocos:"ma",
    cm:"cm", cameroon:"cm", camaroes:"cm",
    sn:"sn", senegal:"sn",
    ci:"ci", ivorycoast:"ci", costadomarfim:"ci",
    dz:"dz", algeria:"dz", argelia:"dz",
    ng:"ng", nigeria:"ng",

    // Asia/Oceania
    jp:"jp", japan:"jp", japao:"jp",
    kr:"kr", southkorea:"kr", coreiadosul:"kr",
    au:"au", australia:"au"
  };

  const code = map[key];

  if(!code) return "🌐";

  return `<img class="country-flag" loading="lazy" src="https://flagcdn.com/w40/${code}.png" alt="${escapeHtml(raw)}" title="${escapeHtml(raw)}">`;
}


// ===== V3.4 UI RESTORE =====
// Estas referências precisam existir antes de openForm/navegação.
const modal = $("modal");
const modalBox = $("modalBox") || document.querySelector(".modal-box");
const form = $("dynamic-form");
const modalTitle = $("modal-title");

var closeModal = function closeModal(){
  if(modal) modal.classList.remove("active");
  if(modalBox) modalBox.classList.remove("wide");
  if(form) form.innerHTML = "";
}


var navigate = function navigate(pageId){
  if(!pageId) return;

  currentPageId = pageId;

  document.querySelectorAll(".page").forEach(page=>{
    page.classList.remove("active");
  });

  document.querySelectorAll(".menu-item").forEach(item=>{
    item.classList.remove("active");
  });

  const page = $(pageId);
  if(page) page.classList.add("active");

  const item = document.querySelector(`.menu-item[data-page="${pageId}"]`);
  if(item) item.classList.add("active");

  if(typeof pageTitles !== "undefined"){
    setText("page-title", pageTitles[pageId] || "Football Legacy");
  }

  // Renderiza a aba somente quando abrir.
  setTimeout(()=>renderPageById(pageId, true), 0);
}


if($("close-modal")){
  $("close-modal").onclick = closeModal;
}

if(modal){
  modal.onclick = e => {
    if(e.target === modal) closeModal();
  };
}



// ===== V3.6.1 OVERRIDE: GENERIC FORM SAVE FIX =====
var openForm = function openForm(kind,id=null){
  if(!modal || !form || !modalTitle){
    alert("Modal do dashboard não encontrado no HTML.");
    return;
  }

  const schema = schemas[kind];
  const table = tableMap[kind];

  if(!schema || !table){
    alert("Formulário não configurado: " + kind);
    return;
  }

  modalTitle.textContent = id ? "Editar registro" : "Novo registro";
  modalBox.classList.remove("wide");
  form.className = "form-grid";

  const existing = id ? getTable(table).find(x=>String(x.id)===String(id)) : null;

  form.innerHTML = schema.map(([field,label,type])=>{
    const value = existing ? (existing[field] ?? "") : "";
    if(type==="textarea"){
      return `<div class="form-field full"><label>${escapeHtml(label)}</label><textarea name="${escapeAttr(field)}">${escapeHtml(value)}</textarea></div>`;
    }
    if(type==="select"){
      return `<div class="form-field"><label>${escapeHtml(label)}</label><select name="${escapeAttr(field)}"></select></div>`;
    }
    if(type==="fileurl"){
      return `<div class="form-field full">
        <label>${escapeHtml(label)}</label>
        <div class="file-row">
          <input name="${escapeAttr(field)}" value="${escapeAttr(value)}" placeholder="URL gerada automaticamente">
          <button type="button" class="upload-btn" onclick="triggerUpload('${escapeAttr(field)}')">Importar</button>
        </div>
        <input type="file" id="file_${escapeAttr(field)}" accept="image/png,image/jpeg,image/webp,video/mp4" style="display:none" onchange="uploadToCloudinary(event,'${escapeAttr(field)}')">
      </div>`;
    }
    return `<div class="form-field">
      <label>${escapeHtml(label)}</label>
      <input name="${escapeAttr(field)}" type="${type||"text"}" value="${escapeAttr(value)}">
    </div>`;
  }).join("") + `
    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">Salvar</button>
    </div>`;

  form.onsubmit = async e=>{
    e.preventDefault();

    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    setButtonSaving(btn);

    try{
      const record = Object.fromEntries(new FormData(form).entries());

      const payload = existing
        ? {action:"update", table, id:existing.id, record}
        : {action:"create", table, record};

      const res = await apiPost(payload);

      if(!res.ok){
        throw new Error(res.error || "Erro ao salvar.");
      }

      closeModal();
      await loadData();
      setStatus("Registro salvo com sucesso.","ok");
    }catch(err){
      clearButtonSaving(btn);
      setStatus("Erro ao salvar: " + err.message, "error");
      console.error(err);
    }
  };

  modal.classList.add("active");
}


var openQuickCareerForm = function openQuickCareerForm(){
  modalTitle.textContent="Criar carreira";form.className="form-grid";
  form.innerHTML=`<div class="form-field"><label>Nome da carreira</label><input name="nome" placeholder="Ex: MILTON V7.0"></div><div class="form-field"><label>Jogo / Universo</label><input name="jogo" value="EA FC"></div><div class="form-field"><label>Descrição</label><textarea name="descricao"></textarea></div><div class="form-actions"><button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button><button class="gold-btn" id="saveBtn">Salvar</button></div>`;
  form.onsubmit=async e=>{
    e.preventDefault();
    const btn=$("saveBtn");
    if(btn && btn.disabled) return;
    setButtonSaving(btn);
    try{
      const data=Object.fromEntries(new FormData(form).entries());
      if(!data.nome || !data.nome.trim()) throw new Error("Informe o nome da carreira.");

      let u=getUserUniverses(active.usuario_id)[0];
      if(!u){
        const ru=await apiPost({action:"create",table:"UNIVERSOS",record:{usuario_id:active.usuario_id,nome:data.jogo,jogo:data.jogo}});
        if(!ru || !ru.ok) throw new Error((ru && ru.error) || "Erro ao criar universo.");
        u=ru.data;
      }

      const r=await apiPost({action:"create",table:"CARREIRAS",record:{universo_id:u.id,nome:data.nome,descricao:data.descricao,status:"ativa"}});
      if(!r || !r.ok) throw new Error((r && r.error) || "Erro ao criar carreira.");

      active.carreira_id=String(r.data.id);
      active.protagonista_id="";
      saveActive();
      clearButtonSaving(btn);
      closeModal();
      await loadData();
      setStatus("Carreira criada com sucesso.","ok");
    }catch(err){
      clearButtonSaving(btn);
      setStatus("Erro ao criar carreira: "+err.message,"error");
      console.error(err);
    }
  };
  modal.classList.add("active");
}


var openTop11BatchForm = function openTop11BatchForm(){
  modalTitle.textContent="Novo Top 11";modalBox.classList.add("wide");form.className="form-grid top11-batch";
  const season=getCurrentSeason();
  const rows=Array.from({length:11},(_,i)=>i+1).map(i=>`<div class="batch-row"><strong>${i}</strong><input name="posicao_${i}" placeholder="POS"><input name="jogador_${i}" placeholder="Jogador"><input name="overall_${i}" type="number" placeholder="OVR"></div>`).join("");
  form.innerHTML=`<div class="form-field"><label>Temporada</label><select name="temporada">${getAvailableSeasonsForActivePlayer().map(s=>`<option value="${s}" ${s===season?"selected":""}>${s}</option>`).join("")}</select></div><div class="batch-grid"><div class="batch-head"><div>#</div><div>Posição</div><div>Jogador</div><div>Overall</div></div>${rows}</div><div class="form-actions"><button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button><button class="gold-btn" id="saveBtn">Salvar Top 11</button></div>`;
  form.onsubmit=async e=>{
    e.preventDefault();
    const btn=$("saveBtn");
    if(btn && btn.disabled) return;
    setButtonSaving(btn);

    try{
      const data=Object.fromEntries(new FormData(form).entries());
      const season=data.temporada;
      const seasonRecord = getCareerSeasonRecords().find(s=>String(s.temporada)===String(season));

      // FIX V3.8.13: gravar em TOP11_CARREIRA (com carreira_id/carreira_temporada_id),
      // não mais na aba antiga "TOP11" que não separava por carreira e vazava
      // jogadores entre carreiras diferentes com a mesma temporada.
      const existentes = getTable("TOP11_CARREIRA").filter(r=>
        String(r.carreira_id)===String(active.carreira_id) &&
        (seasonRecord ? String(r.carreira_temporada_id)===String(seasonRecord.id) : String(r.temporada)===String(season))
      );

      for(const old of existentes){
        await apiPost({action:"delete",table:"TOP11_CARREIRA",id:old.id});
      }

      for(let i=1;i<=11;i++){
        if(!data[`jogador_${i}`]) continue;
        await apiPost({
          action:"create",
          table:"TOP11_CARREIRA",
          record:{
            carreira_id: active.carreira_id,
            carreira_temporada_id: seasonRecord ? seasonRecord.id : "",
            temporada: season,
            posicao_tatica: data[`posicao_${i}`] || i,
            jogador: data[`jogador_${i}`],
            overall: data[`overall_${i}`] || "",
            x: "",
            y: ""
          }
        });
      }

      clearButtonSaving(btn);
      closeModal();
      await loadData();
      setStatus("Top 11 salvo.","ok");
    }catch(err){
      clearButtonSaving(btn);
      setStatus("Erro ao salvar Top 11: "+err.message,"error");
      console.error(err);
    }
  };
  modal.classList.add("active");
}

var openBallonBatchForm = function openBallonBatchForm(){
  modalTitle.textContent="Novo ranking Bola de Ouro";
  modalBox.classList.add("wide");
  form.className="form-grid ballon-batch";

  const selectedSeason = getActiveBallonSeason() || getCurrentSeason();
  const seasons=[...new Set([...getAvailableSeasonsForActivePlayer(),...getBallonSeasons()])].sort(compareSeasonsDesc);
  const seasonOptions=seasons.length
    ? seasons.map(s=>`<option value="${s}" ${s===selectedSeason?"selected":""}>${s}</option>`).join("")
    : `<option value="${selectedSeason||""}">${selectedSeason||"Sem temporada"}</option>`;

  const existingRows=uniqueBallonRows(getTable("BOLA_DE_OURO").filter(r=>String(r.temporada)===String(selectedSeason)));

  var existing = function existing(pos,field){
    const row=existingRows.find(r=>String(r.posicao)===String(pos));
    return row ? String(row[field] || "").replace(/"/g,"&quot;") : "";
  }

  const rows=Array.from({length:10},(_,i)=>i+1).map(i=>`<div class="batch-row">
    <strong>${i}</strong>
    <input name="jogador_${i}" value="${existing(i,'jogador')}" placeholder="Jogador">
    <input name="nacionalidade_${i}" value="${existing(i,'nacionalidade')}" placeholder="País, código ou emoji">
    <input name="idade_${i}" value="${existing(i,'idade')}" type="number" placeholder="Idade">
    <input name="valor_${i}" value="${existing(i,'valor_mercado')}" placeholder="Ex: €90M">
  </div>`).join("");

  form.innerHTML=`<div class="form-field">
      <label>Temporada</label>
      <select name="temporada">${seasonOptions}</select>
    </div>
    <div class="form-field">
      <label>Imagem do vencedor</label>
      <div class="file-row"><input name="imagem" value="${existing(1,'imagem_destaque_url')}" placeholder="URL gerada automaticamente"><button type="button" class="upload-btn" onclick="triggerUpload('imagem')">Importar</button></div>
      <input type="file" id="file_imagem" accept="image/png,image/jpeg,image/webp,video/mp4" style="display:none" onchange="uploadToCloudinary(event,'imagem')">
    </div>
    <div class="batch-grid">
      <div class="batch-head"><div>#</div><div>Jogador</div><div>País</div><div>Idade</div><div>Valor</div></div>
      ${rows}
    </div>
    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">Salvar Ranking</button>
    </div>`;

  form.onsubmit=async e=>{
    e.preventDefault();
    const btn=$("saveBtn");
    if(btn.disabled) return;
    setButtonSaving(btn);

    try{
      const data=Object.fromEntries(new FormData(form).entries());
      const season=data.temporada;
      if(!season) throw new Error("Selecione uma temporada.");

      const seasonExisting=uniqueBallonRows(getTable("BOLA_DE_OURO").filter(r=>String(r.temporada)===String(season)));

      for(let i=1;i<=10;i++){
        if(!data[`jogador_${i}`]) continue;

        const record={
          temporada:season,
          posicao:i,
          jogador:data[`jogador_${i}`],
          nacionalidade:data[`nacionalidade_${i}`]||"",
          idade:data[`idade_${i}`]||"",
          valor_mercado:data[`valor_${i}`]||"",
          imagem_destaque_url:i===1?(data.imagem||""):""
        };

        const existingRow=seasonExisting.find(r=>String(r.posicao)===String(i));

        const payload=existingRow
          ? {action:"update", table:"BOLA_DE_OURO", id:existingRow.id, record}
          : {action:"create", table:"BOLA_DE_OURO", record};

        const res=await apiPost(payload);
        if(!res.ok) throw new Error(res.error || "Erro ao salvar posição " + i);
      }

      activeBallonSeason=season;
      localStorage.setItem("fl_active_ballon_season", activeBallonSeason);

      closeModal();
      await loadData();
    }catch(err){
      btn.disabled=false;
      btn.textContent="Salvar Ranking";
      setStatus("Erro ao salvar ranking: "+err.message,"error");
      console.error(err);
    }
  };

  modal.classList.add("active");
}

var openSeasonFlow = function openSeasonFlow(){
  modalTitle.textContent="Nova temporada";form.className="form-grid";modalBox.classList.add("wide");
  form.innerHTML=`<div class="form-field"><label>Temporada</label><input name="temporada" placeholder="2025/2026"></div><div class="form-field"><label>Ano</label><input name="ano" placeholder="2026"></div><div class="form-actions"><button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button><button class="gold-btn" id="saveBtn">Salvar temporada</button></div>`;
  form.onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());const r=await apiPost({action:"create",table:"TEMPORADAS",record:{carreira_id:active.carreira_id,temporada:data.temporada,ano:data.ano,status:"ativa"}});active.temporada=data.temporada;saveActive();closeModal();await loadData()};
  modal.classList.add("active");
}

var triggerUpload = function triggerUpload(key){const input=$("file_"+key); if(input)input.click()}
var uploadToCloudinary = async function uploadToCloudinary(event,key){const file=event.target.files[0]; if(!file)return; const target=form.querySelector(`[name="${key}"]`); const fd=new FormData();fd.append("file",file);fd.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);setStatus("Enviando mídia...");const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,{method:"POST",body:fd});const json=await res.json();if(!json.secure_url)throw new Error(json.error?.message||"Erro Cloudinary");target.value=json.secure_url;setStatus("Mídia enviada.","ok")}

if(typeof openForm !== "undefined") window.openForm = openForm;
if(typeof removeRecord !== "undefined") window.removeRecord = removeRecord;
if(typeof setActiveProtagonist !== "undefined") window.setActiveProtagonist = setActiveProtagonist;
if(typeof openPlayerByName !== "undefined") window.openPlayerByName = openPlayerByName;
if(typeof triggerUpload !== "undefined") window.triggerUpload = triggerUpload;
if(typeof uploadToCloudinary !== "undefined") window.uploadToCloudinary = uploadToCloudinary;

window.addEventListener('error', function(event){
  console.error("Football Legacy error:", event.error || event.message);
  setStatus("Erro no dashboard: " + (event.message || "erro desconhecido"), "error");
});

window.addEventListener('unhandledrejection', function(event){
  console.error("Football Legacy promise error:", event.reason);
  const msg = event.reason && event.reason.message ? event.reason.message : String(event.reason || "erro desconhecido");
  setStatus("Erro no dashboard: " + msg, "error");
});




// ===== V3.5 BALLON GLOBAL + CAREER OVERRIDES =====
var normalizeSeasonValue = function normalizeSeasonValue(value){
  return String(value || "").trim();
}

var getBallonBaseRows = function getBallonBaseRows(){
  return getTable("BOLA_DE_OURO_BASE").map(row=>Object.assign({__source:"base"}, row));
}

var getBallonCareerRows = function getBallonCareerRows(){
  const carreira = getActiveCareer();
  if(!carreira) return [];

  const careerRows = getTable("BOLA_DE_OURO_CARREIRA")
    .filter(row=>String(row.carreira_id)===String(carreira.id))
    .map(row=>Object.assign({__source:"carreira"}, row));

  // Mantém compatibilidade com a aba legada enquanto existir.
  const legacyRows = getTable("BOLA_DE_OURO")
    .map(row=>Object.assign({__source:"legado"}, row));

  return [...careerRows, ...legacyRows];
}

var getBallonAllRowsForCurrentView = function getBallonAllRowsForCurrentView(){
  return [...getBallonBaseRows(), ...getBallonCareerRows()];
}

var getBallonSeasons = function getBallonSeasons(){
  return [...new Set(getBallonAllRowsForCurrentView().map(x=>normalizeSeasonValue(x.temporada)).filter(Boolean))]
    .sort((a,b)=>{
      const ay = Number(String(a).match(/\d{4}/)?.[0] || 0);
      const by = Number(String(b).match(/\d{4}/)?.[0] || 0);
      return by - ay;
    });
}

var getActiveBallonSeason = function getActiveBallonSeason(){
  const seasons = getBallonSeasons();

  if(activeBallonSeason && seasons.includes(activeBallonSeason)){
    return activeBallonSeason;
  }

  const current = getCurrentSeason();
  if(current && seasons.includes(current)){
    activeBallonSeason = current;
    localStorage.setItem("fl_active_ballon_season", activeBallonSeason);
    return activeBallonSeason;
  }

  activeBallonSeason = seasons[0] || "";
  localStorage.setItem("fl_active_ballon_season", activeBallonSeason);
  return activeBallonSeason;
}

var renderBallonSeasonSelector = function renderBallonSeasonSelector(){
  const select = $("ballonSeasonSelect");
  if(!select) return;

  const seasons = getBallonSeasons();
  const selected = getActiveBallonSeason();

  select.innerHTML = seasons.length
    ? seasons.map(s=>`<option value="${s}" ${String(s)===String(selected)?"selected":""}>${s}</option>`).join("")
    : `<option value="">Sem rankings</option>`;

  select.value = selected || "";

  select.onchange = e => {
    activeBallonSeason = e.target.value;
    localStorage.setItem("fl_active_ballon_season", activeBallonSeason);
    renderBolaOuro();
  };
}

var uniqueBallonRows = function uniqueBallonRows(rows){
  const map = new Map();

  rows
    .slice()
    .sort((a,b)=>{
      // Prioridade: carreira > legado > base em caso de mesma temporada/posição.
      const weight = {carreira:3, legado:2, base:1};
      return (num(a.posicao)-num(b.posicao)) || ((weight[b.__source]||0)-(weight[a.__source]||0)) || num(b.id)-num(a.id);
    })
    .forEach(row=>{
      const pos = String(row.posicao || "").trim();
      if(!pos) return;
      if(!map.has(pos)) map.set(pos,row);
    });

  return [...map.values()].sort((a,b)=>num(a.posicao)-num(b.posicao));
}

var renderBolaOuro = function renderBolaOuro(){
  renderBallonSeasonSelector();

  const all = getBallonAllRowsForCurrentView();
  const season = getActiveBallonSeason();

  const rawRows = all
    .filter(r=>!season || String(r.temporada)===String(season))
    .sort((a,b)=>num(a.posicao)-num(b.posicao));

  const rows = uniqueBallonRows(rawRows).slice(0,10);
  const winner = rows.find(r=>String(r.posicao)==="1") || rows[0];

  setText("ballonSeasonLabel", season?`1º ao 10º colocado • ${season}`:"1º ao 10º colocado");

  const poster = $("ballon-poster");
  if(poster){
    const url = winner && (winner.imagem_destaque_url || winner.imagem_url || winner.url || "");
    if(url){
      poster.classList.add("has-image");
      poster.style.backgroundImage = `url("${url}")`;
    }else{
      poster.classList.remove("has-image");
      poster.style.backgroundImage = "";
    }
  }

  const list = $("ballon-ranking-list");
  if(!list) return;

  list.innerHTML = `<div class="ballon-head"><div>#</div><div>Jogador</div><div>Idade</div><div>Valor</div><div></div></div>`+
  rows.map(r=>{
    const sourceLabel = r.__source === "base" ? "Real" : (r.__source === "carreira" ? "Carreira" : "Legado");
    return `<div class="ballon-row ${String(r.posicao)==="1"?"first":""}">
      <div>${r.posicao||"-"}</div>
      <div class="ballon-player-cell">
        <span class="flag-dot">${flagFrom(r.nacionalidade || r.pais)}</span>
        <button onclick="openPlayerByName('${escapeAttr(r.jogador||"")}')">${escapeHtml(r.jogador||"-")}</button>
        <span class="ballon-source-pill">${escapeHtml(sourceLabel)}</span>
      </div>
      <div>${escapeHtml(r.idade || r.idade_na_premiacao || "-")}</div>
      <div>${escapeHtml(r.valor_mercado || "-")}</div>
      <div class="ballon-actions"><button onclick="openForm('${r.__source==="base" ? "bolaourobase" : "bolaouro"}','${r.id}')">Editar</button></div>
    </div>`;
  }).join("")+
  (!rows.length?`<div class="ballon-row"><div>-</div><div>Nenhum ranking cadastrado para esta temporada.</div><div>-</div><div>-</div><div></div></div>`:"");
}

var getBallonWinnersRanking = function getBallonWinnersRanking(){
  const rows = getBallonAllRowsForCurrentView()
    .filter(r=>String(r.posicao)==="1" && r.jogador && String(r.jogador).toLowerCase() !== "não concedido");

  const grouped = new Map();

  rows.forEach(row=>{
    const name = String(row.jogador || "").trim();
    const key = name.toLowerCase();

    if(!grouped.has(key)){
      grouped.set(key,{
        jogador:name,
        pais:row.nacionalidade || row.pais || "",
        count:0,
        temporadas:[],
        fontes:new Set()
      });
    }

    const item = grouped.get(key);
    item.count += 1;
    if(row.temporada) item.temporadas.push(row.temporada);
    item.fontes.add(row.__source === "base" ? "Real" : (row.__source === "carreira" ? "Carreira" : "Legado"));
  });

  return [...grouped.values()]
    .sort((a,b)=>b.count-a.count || a.jogador.localeCompare(b.jogador))
    .slice(0,25)
    .map((item,index)=>Object.assign(item,{rank:index+1, fontes:[...item.fontes]}));
}

var openBestBallonModal = function openBestBallonModal(){
  const modal = $("bestBallonModal");
  const list = $("bestBallonList");
  if(!modal || !list) return;

  const ranking = getBallonWinnersRanking();

  list.innerHTML = ranking.length
    ? ranking.map(item=>`
      <article class="best-ballon-row">
        <div class="best-ballon-rank">${item.rank}</div>
        <div class="best-ballon-player">
          <strong>${flagFrom(item.pais)} ${escapeHtml(item.jogador)}</strong>
          <small>${escapeHtml(item.fontes.join(" + "))}</small>
        </div>
        <div class="best-ballon-count">${item.count}x</div>
        <div class="best-ballon-seasons">${item.temporadas.sort((a,b)=>{
          const ay = Number(String(a).match(/\d{4}/)?.[0] || 0);
          const by = Number(String(b).match(/\d{4}/)?.[0] || 0);
          return ay - by;
        }).join(" • ")}</div>
      </article>
    `).join("")
    : `<div class="season-empty">Nenhum vencedor cadastrado ainda.</div>`;

  modal.classList.add("active");
}

var closeBestBallonModal = function closeBestBallonModal(){
  const modal = $("bestBallonModal");
  if(modal) modal.classList.remove("active");
}

var openBallonBatchForm = function openBallonBatchForm(){
  modalTitle.textContent="Novo ranking Bola de Ouro";
  modalBox.classList.add("wide");
  form.className="form-grid ballon-batch";

  const carreira = getActiveCareer();
  const selectedSeason = getActiveBallonSeason() || getCurrentSeason();
  const seasons=[...new Set([...getAvailableSeasonsForActivePlayer(),...getBallonSeasons()])].sort(compareSeasonsDesc);
  const seasonOptions=seasons.length
    ? seasons.map(s=>`<option value="${s}" ${s===selectedSeason?"selected":""}>${s}</option>`).join("")
    : `<option value="${selectedSeason||""}">${selectedSeason||"Sem temporada"}</option>`;

  const existingRows=uniqueBallonRows(getTable("BOLA_DE_OURO_CARREIRA").filter(r=>String(r.carreira_id)===String(carreira?.id || "") && String(r.temporada)===String(selectedSeason)));

  var existing = function existing(pos,field){
    const row=existingRows.find(r=>String(r.posicao)===String(pos));
    return row ? String(row[field] || "").replace(/"/g,"&quot;") : "";
  }

  const rows=Array.from({length:10},(_,i)=>i+1).map(i=>`<div class="batch-row">
    <strong>${i}</strong>
    <input name="jogador_${i}" value="${existing(i,'jogador')}" placeholder="Jogador">
    <input name="nacionalidade_${i}" value="${existing(i,'nacionalidade')}" placeholder="País, código ou emoji">
    <input name="idade_${i}" value="${existing(i,'idade')}" type="number" placeholder="Idade">
    <input name="valor_${i}" value="${existing(i,'valor_mercado')}" placeholder="Ex: €90M">
  </div>`).join("");

  form.innerHTML=`<div class="form-field">
      <label>Temporada</label>
      <select name="temporada">${seasonOptions}</select>
    </div>
    <div class="form-field">
      <label>Imagem do vencedor</label>
      <div class="file-row"><input name="imagem" value="${existing(1,'imagem_destaque_url')}" placeholder="URL gerada automaticamente"><button type="button" class="upload-btn" onclick="triggerUpload('imagem')">Importar</button></div>
      <input type="file" id="file_imagem" accept="image/png,image/jpeg,image/webp,video/mp4" style="display:none" onchange="uploadToCloudinary(event,'imagem')">
    </div>
    <div class="batch-grid">
      <div class="batch-head"><div>#</div><div>Jogador</div><div>País</div><div>Idade</div><div>Valor</div></div>
      ${rows}
    </div>
    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">Salvar Ranking da Carreira</button>
    </div>`;

  form.onsubmit=async e=>{
    e.preventDefault();
    const btn=$("saveBtn");
    if(btn.disabled) return;
    setButtonSaving(btn);

    try{
      const data=Object.fromEntries(new FormData(form).entries());
      const season=data.temporada;
      if(!season) throw new Error("Selecione uma temporada.");
      if(!carreira) throw new Error("Nenhuma carreira selecionada.");

      const seasonExisting=getTable("BOLA_DE_OURO_CARREIRA").filter(r=>String(r.carreira_id)===String(carreira.id) && String(r.temporada)===String(season));

      for(let i=1;i<=10;i++){
        if(!data[`jogador_${i}`]) continue;

        const record={
          carreira_id:carreira.id,
          carreira_temporada_id:"",
          temporada:season,
          posicao:i,
          jogador:data[`jogador_${i}`],
          nacionalidade:data[`nacionalidade_${i}`]||"",
          idade:data[`idade_${i}`]||"",
          valor_mercado:data[`valor_${i}`]||"",
          overall:"",
          imagem_destaque_url:i===1?(data.imagem||""):""
        };

        const existingRow=seasonExisting.find(r=>String(r.posicao)===String(i));

        const payload=existingRow
          ? {action:"update", table:"BOLA_DE_OURO_CARREIRA", id:existingRow.id, record}
          : {action:"create", table:"BOLA_DE_OURO_CARREIRA", record};

        const res=await apiPost(payload);
        if(!res.ok) throw new Error(res.error || "Erro ao salvar posição " + i);
      }

      activeBallonSeason=season;
      localStorage.setItem("fl_active_ballon_season", activeBallonSeason);

      closeModal();
      await loadData();
    }catch(err){
      clearButtonSaving(btn);
      setStatus("Erro ao salvar ranking: "+err.message,"error");
      console.error(err);
    }
  };

  modal.classList.add("active");
}


// ===== V3.6 OVERRIDE: CRIAR/EDITAR TEMPORADA COMO PASSAGEM =====
var openSeasonFlow = function openSeasonFlow(existingId=null){
  const carreira = getActiveCareer();
  const protagonista = getActiveProtagonist();

  if(!carreira){
    alert("Crie ou selecione uma carreira antes.");
    return;
  }

  modalTitle.textContent = existingId ? "Editar passagem na temporada" : "Adicionar passagem na temporada";
  modalBox.classList.add("wide");
  form.className = "form-grid season-flow-form";

  const existing = existingId
    ? getCareerSeasonRecords().find(t=>String(t.id)===String(existingId))
    : null;

  const clubes = getTable("CLUBES");
  const competicoes = [...getTable("COMPETICOES_BASE"), ...getTable("COMPETICOES")];

  const clubOptions = clubes.length
    ? clubes.map(c=>`<option value="${c.id}" ${String(existing?.clube_id||"")===String(c.id)?"selected":""}>${escapeHtml(c.nome || "-")}</option>`).join("")
    : `<option value="">Nenhum clube cadastrado</option>`;

  const selectedCompetitions = getCompetitionsFromSeasonRecord(existing || {});
  const compCheckboxes = competicoes.map(c=>{
    const name = c.nome || "";
    const checked = selectedCompetitions.includes(name) ? "checked" : "";
    return `<label class="check-card"><input type="checkbox" name="competicoes" value="${escapeAttr(name)}" ${checked}> <span>${escapeHtml(name)}</span></label>`;
  }).join("");

  form.innerHTML = `
    <div class="form-field">
      <label>Início no time</label>
      <input name="data_inicio" type="month" value="${escapeAttr(existing?.data_inicio || existing?.periodo_inicio || "")}">
    </div>

    <div class="form-field">
      <label>Fim no time</label>
      <input name="data_fim" type="month" value="${escapeAttr(existing?.data_fim || existing?.periodo_fim || "")}">
    </div>

    <div class="form-field">
      <label>Temporada reconhecida</label>
      <input name="temporada" value="${escapeAttr(existing?.temporada || "")}" placeholder="Calculada pelo início, ex: 2025/2026">
    </div>

    <div class="form-field">
      <label>Time</label>
      <select name="clube_id">${clubOptions}</select>
    </div>

    <div class="form-field">
      <label>Status</label>
      <select name="status">
        <option value="em andamento" ${existing?.status==="em andamento"?"selected":""}>Em andamento</option>
        <option value="finalizada" ${existing?.status==="finalizada"?"selected":""}>Finalizada</option>
        <option value="transferido" ${existing?.status==="transferido"?"selected":""}>Transferido</option>
      </select>
    </div>

    <div class="form-field">
      <label>Ordem na carreira</label>
      <input name="ordem_na_carreira" type="number" value="${escapeAttr(existing?.ordem_na_carreira || "")}" placeholder="1, 2, 3...">
    </div>

    <div class="form-field full">
      <label>Competições jogadas nesse time/período</label>
      <div class="check-grid">${compCheckboxes || "<p>Nenhuma competição cadastrada.</p>"}</div>
    </div>

    <div class="form-field full">
      <label>Estatísticas por competição</label>
      <div id="seasonStatsEditor" class="season-stats-editor"></div>
    </div>

    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">Salvar passagem</button>
    </div>
  `;

  const inicioInput = form.querySelector("[name='data_inicio']");
  const temporadaInput = form.querySelector("[name='temporada']");
  const clubeSelect = form.querySelector("[name='clube_id']");

  var updateSeasonFromDate = function updateSeasonFromDate(){
    if(!temporadaInput.value && inicioInput.value){
      temporadaInput.value = monthYearToSeason(inicioInput.value);
    }
  }

  inicioInput.addEventListener("change", ()=>{
    temporadaInput.value = monthYearToSeason(inicioInput.value);
  });

  form.querySelectorAll("input[name='competicoes']").forEach(cb=>{
    cb.addEventListener("change", ()=>renderSeasonStatsEditor(existing));
  });

  renderSeasonStatsEditor(existing);

  var renderSeasonStatsEditor = function renderSeasonStatsEditor(seasonRecord){
    const wrap = $("seasonStatsEditor");
    if(!wrap) return;

    const selected = [...form.querySelectorAll("input[name='competicoes']:checked")].map(x=>x.value);
    const stats = seasonRecord ? getSeasonStatsForRecord(seasonRecord) : [];

    if(!selected.length){
      wrap.innerHTML = `<div class="season-empty">Selecione as competições jogadas para preencher os números.</div>`;
      return;
    }

    wrap.innerHTML = selected.map(comp=>{
      const s = stats.find(x=>String(x.competicao || compName(x.competicao_id) || "").toLowerCase()===String(comp).toLowerCase()) || {};
      return `<div class="season-stat-edit" data-comp="${escapeAttr(comp)}">
        <strong>${escapeHtml(comp)}</strong>
        <input name="jogos_${escapeAttr(comp)}" type="number" placeholder="Jogos" value="${escapeAttr(s.jogos || "")}">
        <input name="gols_${escapeAttr(comp)}" type="number" placeholder="Gols" value="${escapeAttr(s.gols || "")}">
        <input name="assistencias_${escapeAttr(comp)}" type="number" placeholder="Assist." value="${escapeAttr(s.assistencias || "")}">
        <input name="cartoes_${escapeAttr(comp)}" type="number" placeholder="Cartões" value="${escapeAttr(s.cartoes || "")}">
        <input name="nota_${escapeAttr(comp)}" type="number" step="0.1" placeholder="Nota" value="${escapeAttr(s.nota_geral || s.media_geral || "")}">
      </div>`;
    }).join("");
  }

  form.onsubmit = async e=>{
    e.preventDefault();

    const btn = $("saveBtn");
    if(btn.disabled) return;
    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      const selectedComps = [...form.querySelectorAll("input[name='competicoes']:checked")].map(x=>x.value);

      const clube = clubes.find(c=>String(c.id)===String(data.clube_id)) || {};
      const temporada = data.temporada || monthYearToSeason(data.data_inicio);

      if(!temporada) throw new Error("Informe o início ou a temporada.");
      if(!data.clube_id) throw new Error("Selecione um time.");

      const seasonRecord = {
        carreira_id: carreira.id,
        temporada_base_id: "",
        temporada,
        ordem_na_carreira: data.ordem_na_carreira || "",
        clube_id: data.clube_id,
        clube_nome: clube.nome || "",
        escudo: clube.escudo || "",
        liga: clube.liga || "",
        competicoes: selectedComps.join(", "),
        status: data.status || "em andamento",
        data_inicio: data.data_inicio || "",
        data_fim: data.data_fim || ""
      };

      const payload = existing
        ? {action:"update", table:"CARREIRA_TEMPORADAS", id:existing.id, record:seasonRecord}
        : {action:"create", table:"CARREIRA_TEMPORADAS", record:seasonRecord};

      const res = await apiPost(payload);
      if(!res.ok) throw new Error(res.error || "Erro ao salvar temporada.");

      const savedSeason = res.data || Object.assign({}, seasonRecord, {id: existing?.id});
      const seasonId = savedSeason.id || existing?.id;

      if(protagonista && seasonId){
        const oldStats = getTable("ESTATISTICAS_CARREIRA")
          .filter(s=>String(s.carreira_temporada_id)===String(seasonId) && String(s.personagem_id)===String(protagonista.id));

        for(const comp of selectedComps){
          const compKey = comp;
          const statRecord = {
            carreira_id: carreira.id,
            carreira_temporada_id: seasonId,
            personagem_id: protagonista.id,
            competicao_id: findCompetitionIdByName(comp),
            competicao: comp,
            jogos: data[`jogos_${compKey}`] || "",
            gols: data[`gols_${compKey}`] || "",
            assistencias: data[`assistencias_${compKey}`] || "",
            cartoes: data[`cartoes_${compKey}`] || "",
            nota_geral: data[`nota_${compKey}`] || "",
            clube_id: data.clube_id,
            clube_nome: clube.nome || ""
          };

          const old = oldStats.find(s=>String(s.competicao || compName(s.competicao_id) || "").toLowerCase()===String(comp).toLowerCase());

          const statPayload = old
            ? {action:"update", table:"ESTATISTICAS_CARREIRA", id:old.id, record:statRecord}
            : {action:"create", table:"ESTATISTICAS_CARREIRA", record:statRecord};

          const statRes = await apiPost(statPayload);
          if(!statRes.ok) throw new Error(statRes.error || "Erro ao salvar estatística de " + comp);
        }
      }

      active.temporada = temporada;
      saveActive();

      closeModal();
      await loadData();
      setStatus("Passagem da temporada salva com sucesso.","ok");
    }catch(err){
      clearButtonSaving(btn);
      setStatus("Erro ao salvar passagem: " + err.message, "error");
      console.error(err);
    }
  };

  modal.classList.add("active");
}

var editSeasonRecord = function editSeasonRecord(id){
  openSeasonFlow(id);
}


// ===== V3.6.2 RESTORE API SEASON FLOW =====
let selectedSeasonTeam = null;
let selectedCompetitionsForSeason = [];

var escapeName = function escapeName(value){
  return String(value || "").replace(/[^a-zA-Z0-9]/g,"_");
}

var unescapeCompKey = function unescapeCompKey(key){
  return String(key || "").replace(/_/g," ");
}

var competitionSuggestions = function competitionSuggestions(team){
  const list = [];

  if(team.league) list.push(team.league);

  const country = String(team.country || "").toLowerCase();

  if(country.includes("england")){
    list.push("FA Cup","Carabao Cup","Community Shield");
  }else if(country.includes("spain")){
    list.push("Copa del Rey","Supercopa de España");
  }else if(country.includes("italy")){
    list.push("Coppa Italia","Supercoppa Italiana");
  }else if(country.includes("germany")){
    list.push("DFB-Pokal","DFL-Supercup");
  }else if(country.includes("france")){
    list.push("Coupe de France","Trophée des Champions");
  }else if(country.includes("brazil")){
    list.push("Copa do Brasil","Libertadores","Sul-Americana");
  }else if(country.includes("portugal")){
    list.push("Taça de Portugal","Taça da Liga","Supertaça");
  }else if(country.includes("netherlands")){
    list.push("KNVB Cup","Johan Cruyff Shield");
  }

  list.push("Champions League","Europa League","Conference League","Mundial de Clubes","Intercontinental de Clubes");

  return [...new Set(list.filter(Boolean))];
}

var searchTeamsForSeason = async function searchTeamsForSeason(){
  const query = $("seasonTeamSearch")?.value?.trim();
  const results = $("seasonTeamResults");

  if(!query || !results) return;

  results.innerHTML = `<div class="entity-card"><small>Buscando time...</small></div>`;

  try{
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const json = await res.json();
    const teams = (json.teams || []).filter(t => String(t.strSport || "").toLowerCase().includes("soccer"));

    if(!teams.length){
      results.innerHTML = `<div class="entity-card"><small>Nenhum time encontrado. Digite outro nome.</small></div>`;
      return;
    }

    results.innerHTML = teams.slice(0,10).map(t=>{
      const team = {
        name:t.strTeam || "",
        league:t.strLeague || "",
        country:t.strCountry || "",
        badge:t.strBadge || "",
        api_id:t.idTeam || ""
      };

      return `
        <div class="team-result">
          <img src="${team.badge}" onerror="this.style.display='none'">
          <div>
            <strong>${escapeHtml(team.name)}</strong>
            <small>${escapeHtml(team.league || "-")} • ${escapeHtml(team.country || "-")}</small>
          </div>
          <button type="button" onclick='selectSeasonTeam(${JSON.stringify(team).replace(/'/g,"&apos;")})'>Selecionar</button>
        </div>
      `;
    }).join("");
  }catch(err){
    console.error(err);
    results.innerHTML = `<div class="entity-card"><small>Erro ao buscar time na API.</small></div>`;
  }
}

var selectSeasonTeam = function selectSeasonTeam(team){
  selectedSeasonTeam = team;

  const box = $("selectedTeamBox");

  if(box){
    box.classList.add("active");
    box.innerHTML = `
      <img src="${team.badge || ""}" onerror="this.style.display='none'">
      <div>
        <strong>${escapeHtml(team.name || "-")}</strong>
        <small>${escapeHtml(team.league || "-")} • ${escapeHtml(team.country || "-")}</small>
      </div>
    `;
  }

  renderCompetitionSuggestions(team);
}

var renderCompetitionSuggestions = function renderCompetitionSuggestions(team, existingComps=[]){
  const wrap = $("seasonCompetitionChecks");

  if(!wrap) return;

  const comps = [...new Set([...competitionSuggestions(team), ...existingComps].filter(Boolean))];

  wrap.innerHTML = comps.map((c,i)=>{
    const checked = existingComps.length ? existingComps.includes(c) : i===0;
    return `
      <label class="comp-check">
        <input type="checkbox" value="${escapeAttr(c)}" ${checked ? "checked" : ""} onchange="renderSeasonStatsRows()">
        ${escapeHtml(c)}
      </label>
    `;
  }).join("");

  renderSeasonStatsRows();
}

var getSelectedSeasonCompetitions = function getSelectedSeasonCompetitions(){
  return [...document.querySelectorAll("#seasonCompetitionChecks input:checked")].map(i=>i.value);
}

var renderSeasonStatsRows = function renderSeasonStatsRows(existingStats=null){
  const wrap = $("seasonStatsRows");

  if(!wrap) return;

  const comps = getSelectedSeasonCompetitions();
  selectedCompetitionsForSeason = comps;

  if(!comps.length){
    wrap.innerHTML = `<div class="entity-card"><small>Selecione pelo menos uma competição.</small></div>`;
    return;
  }

  const stats = existingStats || window.__editingSeasonStats || [];

  wrap.innerHTML = comps.map(comp=>{
    const old = stats.find(s=>String(s.competicao || compName(s.competicao_id) || "").toLowerCase() === String(comp).toLowerCase()) || {};
    const key = escapeName(comp);

    return `
      <div class="season-stats-row">
        <strong>${escapeHtml(comp)}</strong>
        <input name="jogos_${key}" type="number" placeholder="Jogos" value="${escapeAttr(old.jogos || "")}">
        <input name="gols_${key}" type="number" placeholder="Gols" value="${escapeAttr(old.gols || "")}">
        <input name="assistencias_${key}" type="number" placeholder="Assist." value="${escapeAttr(old.assistencias || "")}">
        <input name="cartoes_${key}" type="number" placeholder="Cartões" value="${escapeAttr(old.cartoes || "")}">
        <input name="media_geral_${key}" type="number" step="0.1" placeholder="Nota" value="${escapeAttr(old.nota_geral || old.media_geral || "")}">
      </div>
    `;
  }).join("");
}

var openSeasonFlow = function openSeasonFlow(existingId=null){
  const carreira = getActiveCareer();
  const protagonista = getActiveProtagonist();

  if(!carreira){
    alert("Selecione ou crie uma carreira antes.");
    return;
  }

  if(!protagonista){
    alert("Selecione ou crie um protagonista antes.");
    return;
  }

  const existing = existingId
    ? getCareerSeasonRecords().find(t=>String(t.id)===String(existingId))
    : null;

  selectedSeasonTeam = existing ? {
    name: existing.clube_nome || "",
    league: existing.liga || "",
    country: "",
    badge: existing.escudo || "",
    api_id: ""
  } : null;

  selectedCompetitionsForSeason = existing ? getCompetitionsFromSeasonRecord(existing) : [];
  window.__editingSeasonStats = existing ? getSeasonStatsForRecord(existing) : [];

  modalTitle.textContent = existing ? "Editar passagem da temporada" : "Nova passagem de temporada";
  modalBox.classList.add("wide");
  modalBox.classList.add("ballon-modal");
  form.className = "season-flow-form";

  const defaultSeason = existing?.temporada || (active.temporada || "");
  const defaultInicio = existing?.data_inicio || "";
  const defaultFim = existing?.data_fim || "";

  form.innerHTML = `
    <div class="season-flow">
      <div class="season-flow-grid">
        <div class="form-field">
          <label>Início no time</label>
          <input name="data_inicio" type="month" value="${escapeAttr(defaultInicio)}">
        </div>
        <div class="form-field">
          <label>Fim no time</label>
          <input name="data_fim" type="month" value="${escapeAttr(defaultFim)}">
        </div>
        <div class="form-field">
          <label>Temporada reconhecida</label>
          <input name="temporada" placeholder="Ex: 2025/2026" value="${escapeAttr(defaultSeason)}">
        </div>
        <div class="form-field">
          <label>Ano final</label>
          <input name="ano" placeholder="Ex: 2026" value="${escapeAttr(existing?.ano || "")}">
        </div>
      </div>

      <div class="team-search-row">
        <div class="form-field">
          <label>Selecionar time pela API</label>
          <input id="seasonTeamSearch" placeholder="Ex: Newcastle, Milan, Real Madrid" value="${escapeAttr(existing?.clube_nome || "")}">
        </div>
        <button type="button" class="upload-btn" onclick="searchTeamsForSeason()">Buscar time</button>
      </div>

      <div class="selected-team ${selectedSeasonTeam ? "active" : ""}" id="selectedTeamBox">
        ${selectedSeasonTeam ? `
          <img src="${selectedSeasonTeam.badge || ""}" onerror="this.style.display='none'">
          <div>
            <strong>${escapeHtml(selectedSeasonTeam.name || "-")}</strong>
            <small>${escapeHtml(selectedSeasonTeam.league || "-")}</small>
          </div>
        ` : ""}
      </div>

      <div class="team-results" id="seasonTeamResults"></div>

      <div class="form-field">
        <label>Competições do time/período</label>
        <div class="competition-checks" id="seasonCompetitionChecks">
          <small>Busque e selecione um time para listar competições.</small>
        </div>
      </div>

      <div class="form-field">
        <label>Relatório por competição</label>
        <div class="season-stats-grid" id="seasonStatsRows">
          <small>As competições selecionadas aparecerão aqui.</small>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="gold-btn" id="saveBtn">${existing ? "Salvar edição" : "Salvar temporada"}</button>
      </div>
    </div>
  `;

  const inicio = form.querySelector("[name='data_inicio']");
  const temp = form.querySelector("[name='temporada']");

  if(inicio && temp){
    inicio.addEventListener("change", ()=>{
      temp.value = monthYearToSeason(inicio.value);
    });
  }

  if(selectedSeasonTeam){
    renderCompetitionSuggestions(selectedSeasonTeam, selectedCompetitionsForSeason);
  }

  form.onsubmit = async e=>{
    e.preventDefault();

    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      await saveSeasonFlow(data, btn, existing);
      closeModal();
      await loadData();
      setStatus("Temporada salva com sucesso.","ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar temporada: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

var saveSeasonFlow = async function saveSeasonFlow(data, button, existing=null){
  if(!active.carreira_id) throw new Error("Selecione ou crie uma carreira antes.");
  if(!active.protagonista_id) throw new Error("Selecione ou crie um protagonista antes.");
  if(!selectedSeasonTeam) throw new Error("Selecione um time pela busca da API.");

  const temporada = data.temporada || monthYearToSeason(data.data_inicio);

  if(!temporada) throw new Error("Informe o início no time ou a temporada.");

  const comps = selectedCompetitionsForSeason.length ? selectedCompetitionsForSeason : getSelectedSeasonCompetitions();

  if(!comps.length) throw new Error("Selecione pelo menos uma competição.");

  setButtonSaving(button);
  setStatus("Salvando temporada...");

  let clube = getTable("CLUBES").find(c => String(c.nome || "").toLowerCase() === String(selectedSeasonTeam.name || "").toLowerCase());

  if(!clube){
    const clubeJson = await apiPost({
      action:"create",
      table:"CLUBES",
      record:{
        nome:selectedSeasonTeam.name,
        pais:selectedSeasonTeam.country,
        escudo:selectedSeasonTeam.badge,
        estadio:""
      }
    });

    if(!clubeJson.ok) throw new Error(clubeJson.error || "Erro ao criar clube.");

    clube = clubeJson.data;
  }

  const seasonRecord = {
    carreira_id:active.carreira_id,
    temporada_base_id:"",
    temporada,
    ordem_na_carreira: existing?.ordem_na_carreira || "",
    clube_id:clube.id,
    clube_nome:selectedSeasonTeam.name,
    escudo:selectedSeasonTeam.badge || clube.escudo || "",
    liga:selectedSeasonTeam.league || "",
    competicoes:comps.join(", "),
    status: existing?.status || "em andamento",
    data_inicio:data.data_inicio || "",
    data_fim:data.data_fim || ""
  };

  const seasonPayload = existing
    ? {action:"update", table:"CARREIRA_TEMPORADAS", id:existing.id, record:seasonRecord}
    : {action:"create", table:"CARREIRA_TEMPORADAS", record:seasonRecord};

  const tempJson = await apiPost(seasonPayload);

  if(!tempJson.ok) throw new Error(tempJson.error || "Erro ao salvar passagem.");

  const savedSeason = tempJson.data || existing || {};
  const carreiraTemporadaId = savedSeason.id || existing?.id;

  for(const compNameText of comps){
    let comp = getTable("COMPETICOES").find(c => String(c.nome || "").toLowerCase() === String(compNameText).toLowerCase());

    if(!comp){
      const compJson = await apiPost({
        action:"create",
        table:"COMPETICOES",
        record:{nome:compNameText}
      });

      if(!compJson.ok) throw new Error(compJson.error || "Erro ao criar competição.");

      comp = compJson.data;
    }

    const key = escapeName(compNameText);
    const oldStats = getTable("ESTATISTICAS_CARREIRA").find(s =>
      String(s.carreira_temporada_id) === String(carreiraTemporadaId) &&
      String(s.personagem_id) === String(active.protagonista_id) &&
      String(s.competicao || "").toLowerCase() === String(compNameText).toLowerCase()
    );

    const statRecord = {
      carreira_id:active.carreira_id,
      carreira_temporada_id:carreiraTemporadaId,
      personagem_id:active.protagonista_id,
      competicao_id:comp.id,
      competicao:compNameText,
      jogos:data[`jogos_${key}`] || "",
      gols:data[`gols_${key}`] || "",
      assistencias:data[`assistencias_${key}`] || "",
      cartoes:data[`cartoes_${key}`] || "",
      nota_geral:data[`media_geral_${key}`] || "",
      clube_id:clube.id,
      clube_nome:selectedSeasonTeam.name
    };

    const statPayload = oldStats
      ? {action:"update", table:"ESTATISTICAS_CARREIRA", id:oldStats.id, record:statRecord}
      : {action:"create", table:"ESTATISTICAS_CARREIRA", record:statRecord};

    const statJson = await apiPost(statPayload);

    if(!statJson.ok) throw new Error(statJson.error || "Erro ao salvar estatística.");
  }

  active.temporada = temporada;
  saveActive();
}

var editSeasonRecord = function editSeasonRecord(id){
  openSeasonFlow(id);
}

var renderPlayedSeasons = function renderPlayedSeasons(){
  const container = $("playedSeasonsCards") || $("playedSeasonsTable");
  if(!container) return;

  const rows = getCareerSeasonRecords()
    .sort((a,b)=>compareSeasonsDesc(a.temporada,b.temporada) || num(a.ordem_na_carreira)-num(b.ordem_na_carreira));

  if(!rows.length){
    container.innerHTML = `<div class="season-empty">Nenhuma temporada cadastrada ainda.</div>`;
    return;
  }

  container.innerHTML = rows.map(r=>{
    const stats = getSeasonStatsForRecord(r);
    const jogos = stats.reduce((acc,s)=>acc+num(s.jogos),0);
    const gols = stats.reduce((acc,s)=>acc+num(s.gols),0);
    const assistencias = stats.reduce((acc,s)=>acc+num(s.assistencias),0);
    const cartoes = stats.reduce((acc,s)=>acc+num(s.cartoes),0);
    const notas = stats.map(s=>num(s.nota_geral || s.media_geral)).filter(Boolean);
    const avgGoals = jogos ? (gols/jogos).toFixed(2) : "0.00";
    const avgAssists = jogos ? (assistencias/jogos).toFixed(2) : "0.00";
    const avgRating = notas.length ? (notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(2) : "-";
    const periodo = (r.data_inicio || r.data_fim) ? `${r.data_inicio || "?"} até ${r.data_fim || "?"}` : "Período não definido";

    return `
      <article class="season-card restored-season-card">
        <div class="season-card-main">
          <div class="season-club-crest">
            ${r.escudo ? `<img src="${escapeAttr(r.escudo)}" onerror="this.parentElement.innerHTML='<span>⚽</span>'">` : `<span>⚽</span>`}
          </div>
          <div>
            <strong>${escapeHtml(r.temporada || "-")}</strong>
            <h4>${escapeHtml(r.clube_nome || "-")}</h4>
            <small>${escapeHtml(periodo)} • ${escapeHtml(r.competicoes || "Sem competições")}</small>
          </div>
        </div>

        <div class="season-stat"><small>Jogos</small><strong>${jogos}</strong></div>
        <div class="season-stat"><small>Gols</small><strong>${gols}</strong></div>
        <div class="season-stat"><small>Assist.</small><strong>${assistencias}</strong></div>
        <div class="season-stat"><small>G/J</small><strong>${avgGoals}</strong></div>
        <div class="season-stat"><small>A/J</small><strong>${avgAssists}</strong></div>
        <div class="season-stat"><small>Cartões</small><strong>${cartoes}</strong></div>
        <div class="season-stat"><small>Nota média</small><strong>${avgRating}</strong></div>
        <div class="season-actions"><button onclick="editSeasonRecord('${r.id}')">Editar</button></div>
      </article>
    `;
  }).join("");
}


// ===== V3.6.4 RESUMO: JORNADA POR CLUBES =====
var getActivePlayerSeasonRows = function getActivePlayerSeasonRows(){
  const p = getActiveProtagonist();
  if(!p) return [];

  return getCareerSeasonRecords()
    .sort((a,b)=>{
      const ai = String(a.data_inicio || "");
      const bi = String(b.data_inicio || "");
      if(ai && bi) return ai.localeCompare(bi);
      return compareSeasonsAsc(a.temporada,b.temporada);
    });
}

var compareSeasonsAsc = function compareSeasonsAsc(a,b){
  const ay = Number(String(a||"").match(/\d{4}/)?.[0] || 0);
  const by = Number(String(b||"").match(/\d{4}/)?.[0] || 0);
  return ay - by;
}

var buildClubJourney = function buildClubJourney(){
  const rows = getActivePlayerSeasonRows();
  const groups = [];
  const map = new Map();

  rows.forEach(row=>{
    const key = String(row.clube_id || row.clube_nome || "").trim() || "sem_clube";
    const stats = getSeasonStatsForRecord(row);
    const jogos = stats.reduce((a,s)=>a+num(s.jogos),0);
    const gols = stats.reduce((a,s)=>a+num(s.gols),0);
    const assistencias = stats.reduce((a,s)=>a+num(s.assistencias),0);
    const cartoes = stats.reduce((a,s)=>a+num(s.cartoes),0);

    if(!map.has(key)){
      const obj = {
        key,
        clube_id: row.clube_id || "",
        clube_nome: row.clube_nome || "Sem clube",
        escudo: row.escudo || "",
        firstSeason: row.temporada || "",
        lastSeason: row.temporada || "",
        jogos:0,
        gols:0,
        assistencias:0,
        cartoes:0,
        rows:[]
      };
      map.set(key,obj);
      groups.push(obj);
    }

    const g = map.get(key);
    g.lastSeason = row.temporada || g.lastSeason;
    g.jogos += jogos;
    g.gols += gols;
    g.assistencias += assistencias;
    g.cartoes += cartoes;
    g.rows.push({season:row,stats,jogos,gols,assistencias,cartoes});
  });

  return groups;
}

var renderHero = function renderHero(){
  const p = getActiveProtagonist();
  const season = getCurrentSeason();
  const currentStats = getCurrentSeasonStats();
  const journey = buildClubJourney();

  setText("heroName", p ? p.nome : "Protagonista");
  setText("heroSubtitle", p ? "Resumo da carreira do jogador selecionado." : "Selecione um protagonista.");

  const img = $("protagonistImage");
  if(img){
    if(p && p.foto){
      img.src = p.foto;
      img.style.display = "block";
    }else{
      img.removeAttribute("src");
      img.style.display = "none";
    }
  }

  setText("protagonistCardName", p ? p.nome : "Football Legacy");
  setText("protagonistCardMeta", p ? `${p.posicao || "-"} • ${p.nacionalidade || "-"}` : "SELECIONE UM PROTAGONISTA");
  setText("heroSeasonPill", season || "-");

  const cards = $("summaryCards") || $("heroStats") || document.querySelector(".hero-stats") || document.querySelector(".summary-cards");

  if(cards){
    cards.innerHTML = `
      <div class="club-journey-head">
        <span>Clubes da carreira</span>
        <small>Clique no escudo para ver o detalhe</small>
      </div>
      <div class="club-journey-strip">
        ${journey.length ? journey.map(c=>`
          <button class="club-journey-item" onclick="openClubJourney('${escapeAttr(c.key)}')" title="${escapeAttr(c.clube_nome)}">
            <span class="club-crest-wrap">
              ${c.escudo ? `<img src="${escapeAttr(c.escudo)}" onerror="this.parentElement.innerHTML='<b>⚽</b>'">` : `<b>⚽</b>`}
            </span>
            <strong>${escapeHtml(c.clube_nome)}</strong>
            <small>${escapeHtml(c.firstSeason)}${c.lastSeason && c.lastSeason!==c.firstSeason ? " - " + escapeHtml(c.lastSeason) : ""}</small>
            <span class="club-mini-stats">
              <b>${c.jogos}</b> J
              <b>${c.gols}</b> G
              <b>${c.assistencias}</b> A
            </span>
          </button>
        `).join("") : `<div class="season-empty">Nenhum clube jogado ainda.</div>`}
      </div>
    `;
  }
}

var renderPlayedSeasons = function renderPlayedSeasons(){
  const container = $("playedSeasonsCards") || $("playedSeasonsTable");
  if(!container) return;

  const rows = getCareerSeasonRecords()
    .sort((a,b)=>compareSeasonsDesc(a.temporada,b.temporada) || String(b.data_inicio||"").localeCompare(String(a.data_inicio||"")));

  if(!rows.length){
    container.innerHTML = `<div class="season-empty">Nenhuma temporada cadastrada ainda.</div>`;
    return;
  }

  container.innerHTML = rows.map(r=>{
    const stats = getSeasonStatsForRecord(r);
    const jogos = stats.reduce((acc,s)=>acc+num(s.jogos),0);
    const gols = stats.reduce((acc,s)=>acc+num(s.gols),0);
    const assistencias = stats.reduce((acc,s)=>acc+num(s.assistencias),0);
    const cartoes = stats.reduce((acc,s)=>acc+num(s.cartoes),0);
    const notas = stats.map(s=>num(s.nota_geral || s.media_geral)).filter(Boolean);
    const avgGoals = jogos ? (gols/jogos).toFixed(2) : "0.00";
    const avgAssists = jogos ? (assistencias/jogos).toFixed(2) : "0.00";
    const avgRating = notas.length ? (notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(2) : "-";
    const periodo = (r.data_inicio || r.data_fim) ? `${r.data_inicio || "?"} até ${r.data_fim || "?"}` : "Período não definido";

    return `
      <article class="season-card clean-season-card">
        <div class="season-card-main">
          <div class="season-club-crest">
            ${r.escudo ? `<img src="${escapeAttr(r.escudo)}" onerror="this.parentElement.innerHTML='<span>⚽</span>'">` : `<span>⚽</span>`}
          </div>
          <div>
            <strong>${escapeHtml(r.temporada || "-")}</strong>
            <h4>${escapeHtml(r.clube_nome || "-")}</h4>
            <small>${escapeHtml(periodo)}</small>
          </div>
        </div>

        <div class="season-stat"><small>Jogos</small><strong>${jogos}</strong></div>
        <div class="season-stat"><small>Gols</small><strong>${gols}</strong></div>
        <div class="season-stat"><small>Assist.</small><strong>${assistencias}</strong></div>
        <div class="season-stat"><small>G/J</small><strong>${avgGoals}</strong></div>
        <div class="season-stat"><small>A/J</small><strong>${avgAssists}</strong></div>
        <div class="season-stat"><small>Cartões</small><strong>${cartoes}</strong></div>
        <div class="season-stat"><small>Nota média</small><strong>${avgRating}</strong></div>
        <div class="season-actions"><button onclick="editSeasonRecord('${r.id}')">Editar</button></div>
      </article>
    `;
  }).join("");
}

var openClubJourney = function openClubJourney(key){
  const journey = buildClubJourney();
  const club = journey.find(c=>String(c.key)===String(key));

  if(!club) return;

  const modal = $("clubJourneyModal");
  const title = $("clubJourneyTitle");
  const content = $("clubJourneyContent");

  if(!modal || !title || !content) return;

  title.textContent = club.clube_nome;

  const byCompetition = new Map();

  club.rows.forEach(item=>{
    item.stats.forEach(s=>{
      const comp = s.competicao || compName(s.competicao_id) || "Competição";
      if(!byCompetition.has(comp)){
        byCompetition.set(comp,{jogos:0,gols:0,assistencias:0,cartoes:0,temporadas:[]});
      }
      const c = byCompetition.get(comp);
      c.jogos += num(s.jogos);
      c.gols += num(s.gols);
      c.assistencias += num(s.assistencias);
      c.cartoes += num(s.cartoes);
      c.temporadas.push(item.season.temporada);
    });
  });

  content.innerHTML = `
    <div class="club-detail-hero">
      <div class="club-detail-crest">
        ${club.escudo ? `<img src="${escapeAttr(club.escudo)}">` : `<span>⚽</span>`}
      </div>
      <div>
        <h2>${escapeHtml(club.clube_nome)}</h2>
        <p>${escapeHtml(club.firstSeason)}${club.lastSeason && club.lastSeason!==club.firstSeason ? " até " + escapeHtml(club.lastSeason) : ""}</p>
      </div>
      <div class="club-detail-totals">
        <div><strong>${club.jogos}</strong><small>Jogos</small></div>
        <div><strong>${club.gols}</strong><small>Gols</small></div>
        <div><strong>${club.assistencias}</strong><small>Assist.</small></div>
      </div>
    </div>

    <h4 class="club-detail-section-title">Temporadas nesse clube</h4>
    <div class="club-detail-season-list">
      ${club.rows.map(item=>`
        <div class="club-detail-season-row">
          <strong>${escapeHtml(item.season.temporada || "-")}</strong>
          <span>${escapeHtml((item.season.data_inicio || "?") + " até " + (item.season.data_fim || "?"))}</span>
          <b>${item.jogos} J</b>
          <b>${item.gols} G</b>
          <b>${item.assistencias} A</b>
        </div>
      `).join("")}
    </div>

    <h4 class="club-detail-section-title">Por competição</h4>
    <div class="club-detail-comp-list">
      ${[...byCompetition.entries()].map(([comp,s])=>`
        <div class="club-detail-comp-row">
          <strong>${escapeHtml(comp)}</strong>
          <span>${[...new Set(s.temporadas)].join(" • ")}</span>
          <b>${s.jogos} J</b>
          <b>${s.gols} G</b>
          <b>${s.assistencias} A</b>
          <b>${s.cartoes} C</b>
        </div>
      `).join("") || `<div class="season-empty">Sem estatísticas por competição.</div>`}
    </div>
  `;

  modal.classList.add("active");
}

var closeClubJourney = function closeClubJourney(){
  const modal = $("clubJourneyModal");
  if(modal) modal.classList.remove("active");
}

if($("closeClubJourney")) $("closeClubJourney").onclick = closeClubJourney;
if($("clubJourneyModal")) $("clubJourneyModal").onclick = e => { if(e.target === $("clubJourneyModal")) closeClubJourney(); };


// ===== V3.6.5 FIX RESUMO + TITULOS =====
currentPageId = "dashboard";

var renderResumoFast = function renderResumoFast(){
  try{ renderDashboardJourney(); }catch(err){ console.error("Erro em renderDashboardJourney", err); }
  try{ renderSeasonSelector(); }catch(err){ console.error("Erro em renderSeasonSelector", err); }
  try{ renderPlayedSeasons(); }catch(err){ console.error("Erro em renderPlayedSeasons", err); }
}

var renderPageById = function renderPageById(pageId, force=false){
  const page = pageId || getCurrentPageId() || "dashboard";

  if(!force && renderedPages[page]) return;

  if(page === "dashboard" || page === "resumo"){
    renderResumoFast();
  }else if(page === "personagens"){
    try{ renderPersonagens(); }catch(err){ console.error("Erro em renderPersonagens", err); }
  }else if(page === "estatisticas"){
    try{ renderEstatisticas(); }catch(err){ console.error("Erro em renderEstatisticas", err); }
  }else if(page === "trofeus"){
    try{ renderTrofeus(); }catch(err){ console.error("Erro em renderTrofeus", err); }
  }else if(page === "top11"){
    try{ renderTop11(); }catch(err){ console.error("Erro em renderTop11", err); }
  }else if(page === "bolaouro"){
    try{ renderBolaOuro(); }catch(err){ console.error("Erro em renderBolaOuro", err); }
  }else if(page === "records"){
    try{ renderRecords(); }catch(err){ console.error("Erro em renderRecords", err); }
  }else if(page === "clubes"){
    try{ renderClubes(); }catch(err){ console.error("Erro em renderClubes", err); }
  }else if(page === "museu"){
    try{ renderMuseu(); }catch(err){ console.error("Erro em renderMuseu", err); }
  }else if(page === "selecaobrasileira"){
    try{ renderSelecaoBrasileira(); }catch(err){ console.error("Erro em renderSelecaoBrasileira", err); }
  }else if(page === "selecaoconvocacoes"){
    try{ renderSelecaoConvocacoesPage(); }catch(err){ console.error("Erro em renderSelecaoConvocacoesPage", err); }
  }

  renderedPages[page] = true;
}

var renderAll = function renderAll(){
  renderedPages = {};
  renderGlobalSelectorsOnly();
  renderPageById("dashboard", true);
}

var renderDashboardJourney = function renderDashboardJourney(){
  const user = getActiveUser();
  const career = getActiveCareer();
  const protagonist = getActiveProtagonist();
  const stats = getProtagonistStats();
  const season = getCurrentSeason(stats);
  const currentStats = season ? stats.filter(s=>String(s.temporada)===String(season)) : stats;

  const games = currentStats.reduce((a,b)=>a+num(b.jogos),0);
  const goals = currentStats.reduce((a,b)=>a+num(b.gols),0);
  const assists = currentStats.reduce((a,b)=>a+num(b.assistencias),0);

  setText("careerNameSide", career ? career.nome : "Football Legacy");
  setText("careerMetaSide", user ? user.nome : "Google Sheets");

  setText("currentSeason", season || "Banco conectado");
  setText("mainCharacterTitle", protagonist ? protagonist.nome : "Protagonista");
  setText("mainCharacterDesc", career ? (career.descricao || "Resumo da carreira do jogador selecionado.") : "Crie uma carreira.");
  setText("mainCharacter", protagonist ? protagonist.nome : "Sem personagem");
  setText("mainCharacterSub", protagonist ? `${protagonist.posicao || "-"} • ${protagonist.nacionalidade || "-"}` : "Cadastre um personagem");

  setPlayerPhoto(protagonist);

  // A área antiga de cards vira a trilha de clubes.
  const meta = document.querySelector(".hero-meta");
  const journey = buildClubJourney();

  if(meta){
    meta.classList.add("club-journey-hero");
    meta.innerHTML = `
      <div class="club-journey-head">
        <span>Clubes da carreira</span>
        <small>Clique no escudo para ver o detalhe</small>
      </div>
      <div class="club-journey-strip">
        ${journey.length ? journey.map(c=>`
          <button class="club-journey-item" onclick="openClubJourney('${escapeAttr(c.key)}')" title="${escapeAttr(c.clube_nome)}">
            <span class="club-crest-wrap">
              ${c.escudo ? `<img src="${escapeAttr(c.escudo)}" onerror="this.parentElement.innerHTML='<b>⚽</b>'">` : `<b>⚽</b>`}
            </span>
            <strong>${escapeHtml(c.clube_nome)}</strong>
            <small>${escapeHtml(c.firstSeason)}${c.lastSeason && c.lastSeason!==c.firstSeason ? " - " + escapeHtml(c.lastSeason) : ""}</small>
            <span class="club-mini-stats">
              <b>${c.jogos}</b> J
              <b>${c.gols}</b> G
              <b>${c.assistencias}</b> A
            </span>
          </button>
        `).join("") : `<div class="season-empty">Nenhum clube jogado ainda.</div>`}
      </div>
    `;
  }
}

var getExistingChampionRecord = function getExistingChampionRecord(seasonId, comp){
  return getTable("CAMPEOES_CARREIRA").find(c =>
    String(c.carreira_temporada_id) === String(seasonId) &&
    String(c.competicao || "").toLowerCase() === String(comp || "").toLowerCase()
  );
}

var renderSeasonTitlesRows = function renderSeasonTitlesRows(existing=null){
  const wrap = $("seasonTitlesRows");
  if(!wrap) return;

  const comps = getSelectedSeasonCompetitions();
  const seasonId = existing ? existing.id : "";

  if(!comps.length){
    wrap.innerHTML = `<div class="entity-card"><small>Selecione competições para preencher títulos e campeões.</small></div>`;
    return;
  }

  wrap.innerHTML = comps.map(comp=>{
    const key = escapeName(comp);
    const old = seasonId ? getExistingChampionRecord(seasonId, comp) : null;
    const won = old && String(old.status || "").includes("titulo");

    return `
      <div class="season-title-row">
        <div>
          <strong>${escapeHtml(comp)}</strong>
          <label class="tiny-check"><input type="checkbox" name="titulo_${key}" ${won ? "checked" : ""}> Ganhei o título</label>
        </div>
        <input name="campeao_${key}" placeholder="Time campeão" value="${escapeAttr(old?.clube || "")}">
        <input name="artilheiro_${key}" placeholder="Artilheiro" value="${escapeAttr(old?.artilheiro || "")}">
        <input name="assist_${key}" placeholder="Líder assist." value="${escapeAttr(old?.lider_assistencias || "")}">
        <input name="melhor_${key}" placeholder="Melhor jogador" value="${escapeAttr(old?.melhor_jogador || "")}">
      </div>
    `;
  }).join("");
}

// Recria apenas o formulário de temporada, restaurando API + adicionando títulos.
var openSeasonFlow = function openSeasonFlow(existingId=null){
  const carreira = getActiveCareer();
  const protagonista = getActiveProtagonist();

  if(!carreira){
    alert("Selecione ou crie uma carreira antes.");
    return;
  }

  if(!protagonista){
    alert("Selecione ou crie um protagonista antes.");
    return;
  }

  const existing = existingId
    ? getCareerSeasonRecords().find(t=>String(t.id)===String(existingId))
    : null;

  selectedSeasonTeam = existing ? {
    name: existing.clube_nome || "",
    league: existing.liga || "",
    country: "",
    badge: existing.escudo || "",
    api_id: ""
  } : null;

  selectedCompetitionsForSeason = existing ? getCompetitionsFromSeasonRecord(existing) : [];
  window.__editingSeasonStats = existing ? getSeasonStatsForRecord(existing) : [];

  modalTitle.textContent = existing ? "Editar temporada" : "Nova temporada";
  modalBox.classList.add("wide");
  form.className = "season-flow-form";

  const defaultSeason = existing?.temporada || (active.temporada || "");
  const defaultInicio = existing?.data_inicio || "";
  const defaultFim = existing?.data_fim || "";

  form.innerHTML = `
    <div class="season-flow">
      <div class="season-flow-grid">
        <div class="form-field">
          <label>Início no time</label>
          <input name="data_inicio" type="month" value="${escapeAttr(defaultInicio)}">
        </div>
        <div class="form-field">
          <label>Fim no time</label>
          <input name="data_fim" type="month" value="${escapeAttr(defaultFim)}">
        </div>
        <div class="form-field">
          <label>Temporada reconhecida</label>
          <input name="temporada" placeholder="Ex: 2025/2026" value="${escapeAttr(defaultSeason)}">
        </div>
        <div class="form-field">
          <label>Status</label>
          <select name="status">
            <option value="em andamento" ${existing?.status==="em andamento"?"selected":""}>Em andamento</option>
            <option value="finalizada" ${existing?.status==="finalizada"?"selected":""}>Finalizada</option>
            <option value="transferido" ${existing?.status==="transferido"?"selected":""}>Transferido</option>
          </select>
        </div>
      </div>

      <div class="team-search-row">
        <div class="form-field">
          <label>Selecionar time pela API</label>
          <input id="seasonTeamSearch" placeholder="Ex: Newcastle, Milan, Real Madrid" value="${escapeAttr(existing?.clube_nome || "")}">
        </div>
        <button type="button" class="upload-btn" onclick="searchTeamsForSeason()">Buscar time</button>
      </div>

      <div class="selected-team ${selectedSeasonTeam ? "active" : ""}" id="selectedTeamBox">
        ${selectedSeasonTeam ? `
          <img src="${selectedSeasonTeam.badge || ""}" onerror="this.style.display='none'">
          <div>
            <strong>${escapeHtml(selectedSeasonTeam.name || "-")}</strong>
            <small>${escapeHtml(selectedSeasonTeam.league || "-")}</small>
          </div>
        ` : ""}
      </div>

      <div class="team-results" id="seasonTeamResults"></div>

      <div class="form-field">
        <label>Competições jogadas nesse clube/período</label>
        <div class="competition-checks" id="seasonCompetitionChecks">
          <small>Busque e selecione um time para listar competições.</small>
        </div>
      </div>

      <div class="form-field">
        <label>Relatório por competição</label>
        <div class="season-stats-grid" id="seasonStatsRows">
          <small>As competições selecionadas aparecerão aqui.</small>
        </div>
      </div>

      <div class="form-field">
        <label>Títulos e campeões gerais</label>
        <div class="season-titles-grid" id="seasonTitlesRows">
          <small>Marque títulos ganhos e preencha campeão, artilheiro, líder de assistência e melhor jogador.</small>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="gold-btn" id="saveBtn">${existing ? "Salvar edição" : "Salvar temporada"}</button>
      </div>
    </div>
  `;

  const inicio = form.querySelector("[name='data_inicio']");
  const temp = form.querySelector("[name='temporada']");

  if(inicio && temp){
    inicio.addEventListener("change", ()=>{
      temp.value = monthYearToSeason(inicio.value);
    });
  }

  if(selectedSeasonTeam){
    renderCompetitionSuggestions(selectedSeasonTeam, selectedCompetitionsForSeason);
    renderSeasonTitlesRows(existing);
  }

  const originalRenderStats = renderSeasonStatsRows;
  window.renderSeasonStatsRows = function(existingStats=null){
    originalRenderStats(existingStats);
    renderSeasonTitlesRows(existing);
  };

  form.onsubmit = async e=>{
    e.preventDefault();

    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      await saveSeasonFlow(data, btn, existing);
      await saveSeasonTitlesFlow(data, existing);
      closeModal();
      await loadData();
      setStatus("Temporada salva com sucesso.","ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar temporada: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

var saveSeasonTitlesFlow = async function saveSeasonTitlesFlow(data, existing=null){
  const comps = selectedCompetitionsForSeason.length ? selectedCompetitionsForSeason : getSelectedSeasonCompetitions();
  if(!comps.length) return;

  const temporada = data.temporada || monthYearToSeason(data.data_inicio);
  const seasonRecord = getCareerSeasonRecords()
    .filter(s=>String(s.carreira_id)===String(active.carreira_id))
    .sort((a,b)=>num(b.id)-num(a.id))
    .find(s =>
      String(s.temporada)===String(temporada) &&
      String(s.clube_nome || "").toLowerCase() === String(selectedSeasonTeam?.name || "").toLowerCase()
    );

  const carreiraTemporadaId = existing?.id || seasonRecord?.id || "";
  if(!carreiraTemporadaId) return;

  for(const comp of comps){
    const key = escapeName(comp);
    const won = !!data[`titulo_${key}`];

    const campeao = data[`campeao_${key}`] || (won ? selectedSeasonTeam.name : "");
    const artilheiro = data[`artilheiro_${key}`] || "";
    const assist = data[`assist_${key}`] || "";
    const melhor = data[`melhor_${key}`] || "";

    if(!won && !campeao && !artilheiro && !assist && !melhor) continue;

    let compObj = getTable("COMPETICOES").find(c=>String(c.nome || "").toLowerCase()===String(comp).toLowerCase());

    if(!compObj){
      const compJson = await apiPost({action:"create", table:"COMPETICOES", record:{nome:comp}});
      if(compJson.ok) compObj = compJson.data;
    }

    const old = getExistingChampionRecord(carreiraTemporadaId, comp);

    const record = {
      carreira_id: active.carreira_id,
      carreira_temporada_id: carreiraTemporadaId,
      temporada,
      competicao_id: compObj?.id || "",
      competicao: comp,
      clube: campeao,
      artilheiro,
      lider_assistencias: assist,
      melhor_jogador: melhor,
      status: won ? "titulo_ganho" : "registro_geral"
    };

    const payload = old
      ? {action:"update", table:"CAMPEOES_CARREIRA", id:old.id, record}
      : {action:"create", table:"CAMPEOES_CARREIRA", record};

    const res = await apiPost(payload);
    if(!res.ok) throw new Error(res.error || "Erro ao salvar título/campeão de " + comp);
  }
}

var closeClubJourney = function closeClubJourney(){
  const modal = $("clubJourneyModal");
  if(modal) modal.classList.remove("active");
}

setTimeout(()=>{
  const close = $("closeClubJourney");
  const modal = $("clubJourneyModal");
  if(close) close.onclick = closeClubJourney;
  if(modal) modal.onclick = e => { if(e.target === modal) closeClubJourney(); };
},0);


// ===== V3.6.6 TITULOS PRINCIPAIS + VISUAL DE CLUBES =====
const MAIN_SEASON_TITLES = [
  "Champions League",
  "Europa League",
  "Conference League",
  "Libertadores",
  "Sul-Americana",
  "Mundial de Clubes",
  "Intercontinental de Clubes",
  "Copa do Mundo",
  "Eurocopa",
  "Copa América",
  "Premier League",
  "La Liga",
  "Serie A Italiana",
  "Bundesliga",
  "Ligue 1",
  "Brasileirão",
  "Liga Portuguesa",
  "Eredivisie"
];

var getSeasonTitleCompetitions = function getSeasonTitleCompetitions(){
  const selected = getSelectedSeasonCompetitions ? getSelectedSeasonCompetitions() : [];
  return [...new Set([...selected, ...MAIN_SEASON_TITLES].filter(Boolean))];
}

var renderSeasonTitlesRows = function renderSeasonTitlesRows(existing=null){
  const wrap = $("seasonTitlesRows");
  if(!wrap) return;

  const comps = getSeasonTitleCompetitions();
  const seasonId = existing ? existing.id : "";

  if(!comps.length){
    wrap.innerHTML = `<div class="entity-card"><small>Nenhuma competição disponível.</small></div>`;
    return;
  }

  const selectedSet = new Set((getSelectedSeasonCompetitions ? getSelectedSeasonCompetitions() : []).map(x=>String(x).toLowerCase()));

  wrap.innerHTML = `
    <div class="title-section-label">Competições jogadas nessa passagem</div>
    ${comps.map((comp, idx)=>{
      const key = escapeName(comp);
      const old = seasonId ? getExistingChampionRecord(seasonId, comp) : null;
      const won = old && String(old.status || "").includes("titulo");
      const isPlayed = selectedSet.has(String(comp).toLowerCase());
      const divider = idx === (getSelectedSeasonCompetitions ? getSelectedSeasonCompetitions().length : 0) && idx > 0 ? `<div class="title-section-label">Histórico geral da temporada</div>` : "";

      return `
        ${divider}
        <div class="season-title-row ${isPlayed ? "played-title" : "global-title"}">
          <div class="title-name-block">
            <strong>${escapeHtml(comp)}</strong>
            <span>${isPlayed ? "Competição jogada" : "Competição geral"}</span>
          </div>
          <label class="title-toggle">
            <input type="checkbox" name="titulo_${key}" ${won ? "checked" : ""}>
            <span>Ganhei</span>
          </label>
          <input name="campeao_${key}" placeholder="Time campeão" value="${escapeAttr(old?.clube || "")}">
          <input name="artilheiro_${key}" placeholder="Artilheiro" value="${escapeAttr(old?.artilheiro || "")}">
          <input name="assist_${key}" placeholder="Líder de assistências" value="${escapeAttr(old?.lider_assistencias || "")}">
          <input name="melhor_${key}" placeholder="Melhor jogador" value="${escapeAttr(old?.melhor_jogador || "")}">
        </div>
      `;
    }).join("")}
  `;
}

var saveSeasonTitlesFlow = async function saveSeasonTitlesFlow(data, existing=null){
  const comps = getSeasonTitleCompetitions();
  if(!comps.length) return;

  const temporada = data.temporada || monthYearToSeason(data.data_inicio);
  const seasonRecord = getCareerSeasonRecords()
    .filter(s=>String(s.carreira_id)===String(active.carreira_id))
    .sort((a,b)=>num(b.id)-num(a.id))
    .find(s =>
      String(s.temporada)===String(temporada) &&
      String(s.clube_nome || "").toLowerCase() === String(selectedSeasonTeam?.name || "").toLowerCase()
    );

  const carreiraTemporadaId = existing?.id || seasonRecord?.id || "";
  if(!carreiraTemporadaId) return;

  for(const comp of comps){
    const key = escapeName(comp);
    const won = !!data[`titulo_${key}`];

    const campeao = data[`campeao_${key}`] || (won ? selectedSeasonTeam.name : "");
    const artilheiro = data[`artilheiro_${key}`] || "";
    const assist = data[`assist_${key}`] || "";
    const melhor = data[`melhor_${key}`] || "";

    if(!won && !campeao && !artilheiro && !assist && !melhor) continue;

    let compObj = getTable("COMPETICOES").find(c=>String(c.nome || "").toLowerCase()===String(comp).toLowerCase());

    if(!compObj){
      const compJson = await apiPost({action:"create", table:"COMPETICOES", record:{nome:comp}});
      if(compJson.ok) compObj = compJson.data;
    }

    const old = getExistingChampionRecord(carreiraTemporadaId, comp);

    const record = {
      carreira_id: active.carreira_id,
      carreira_temporada_id: carreiraTemporadaId,
      temporada,
      competicao_id: compObj?.id || "",
      competicao: comp,
      clube: campeao,
      artilheiro,
      lider_assistencias: assist,
      melhor_jogador: melhor,
      status: won ? "titulo_ganho" : "registro_geral"
    };

    const payload = old
      ? {action:"update", table:"CAMPEOES_CARREIRA", id:old.id, record}
      : {action:"create", table:"CAMPEOES_CARREIRA", record};

    const res = await apiPost(payload);
    if(!res.ok) throw new Error(res.error || "Erro ao salvar título/campeão de " + comp);
  }
}

var renderDashboardJourney = function renderDashboardJourney(){
  const user = getActiveUser();
  const career = getActiveCareer();
  const protagonist = getActiveProtagonist();
  const stats = getProtagonistStats();
  const season = getCurrentSeason(stats);
  const journey = buildClubJourney();

  setText("careerNameSide", career ? career.nome : "Football Legacy");
  setText("careerMetaSide", user ? user.nome : "Google Sheets");

  setText("currentSeason", season || "Banco conectado");
  setText("mainCharacterTitle", protagonist ? protagonist.nome : "Protagonista");
  setText("mainCharacterDesc", career ? (career.descricao || "Resumo da carreira do jogador selecionado.") : "Crie uma carreira.");
  setText("mainCharacter", protagonist ? protagonist.nome : "Sem personagem");
  setText("mainCharacterSub", protagonist ? `${protagonist.posicao || "-"} • ${protagonist.nacionalidade || "-"}` : "Cadastre um personagem");

  setPlayerPhoto(protagonist);

  const meta = document.querySelector(".hero-meta");

  if(meta){
    meta.classList.add("club-journey-hero");
    meta.innerHTML = `
      <div class="club-journey-head">
        <span>Clubes da carreira</span>
        <small>Clique no escudo para ver o detalhe</small>
      </div>
      <div class="club-journey-strip clean-club-strip">
        ${journey.length ? journey.map(c=>`
          <button class="club-journey-item clean-club-item" onclick="openClubJourney('${escapeAttr(c.key)}')" title="${escapeAttr(c.clube_nome)}">
            <span class="club-crest-wrap clean-club-crest">
              ${c.escudo ? `<img src="${escapeAttr(c.escudo)}" onerror="this.parentElement.innerHTML='<b>⚽</b>'">` : `<b>⚽</b>`}
            </span>
            <strong>${escapeHtml(c.clube_nome)}</strong>
            <small>${escapeHtml(c.firstSeason)}${c.lastSeason && c.lastSeason!==c.firstSeason ? " - " + escapeHtml(c.lastSeason) : ""}</small>
            <span class="club-full-stats">
              <span><b>${c.jogos}</b> Jogos</span>
              <span><b>${c.gols}</b> Gols</span>
              <span><b>${c.assistencias}</b> Assistências</span>
            </span>
          </button>
        `).join("") : `<div class="season-empty">Nenhum clube jogado ainda.</div>`}
      </div>
    `;
  }
}


// ===== V3.7 RECORDS TAB =====
const MAIN_RECORD_COMPETITIONS = [
  "Champions League",
  "Europa League",
  "Conference League",
  "Libertadores",
  "Sul-Americana",
  "Mundial de Clubes",
  "Intercontinental de Clubes",
  "Copa do Mundo",
  "Eurocopa",
  "Copa América",
  "Premier League",
  "La Liga",
  "Serie A Italiana",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Brasileirão",
  "Brazilian Serie A",
  "Liga Portuguesa",
  "Eredivisie"
];

var getRecordsBaseRows = function getRecordsBaseRows(){
  const personagem = getActiveProtagonist();
  if(!personagem) return [];

  const carreira = getActiveCareer();

  const careerStats = getTable("ESTATISTICAS_CARREIRA")
    .filter(s=>String(s.personagem_id)===String(personagem.id) && (!carreira || String(s.carreira_id)===String(carreira.id)))
    .map(s=>Object.assign({__source:"career"}, s));

  const legacyStats = getTable("ESTATISTICAS")
    .filter(s=>String(s.personagem_id)===String(personagem.id))
    .map(s=>Object.assign({__source:"legacy"}, s));

  return [...careerStats, ...legacyStats];
}

var getRecordsSeasonForStat = function getRecordsSeasonForStat(stat){
  if(stat.temporada) return stat.temporada;

  const season = getTable("CARREIRA_TEMPORADAS").find(t=>String(t.id)===String(stat.carreira_temporada_id));
  return season ? season.temporada : "";
}

var getRecordsClubForStat = function getRecordsClubForStat(stat){
  if(stat.clube_nome) return stat.clube_nome;

  const season = getTable("CARREIRA_TEMPORADAS").find(t=>String(t.id)===String(stat.carreira_temporada_id));
  return season ? season.clube_nome : "";
}

var getRecordsCompetitionForStat = function getRecordsCompetitionForStat(stat){
  return stat.competicao || compName(stat.competicao_id) || "";
}

var getRecordsScopeOptions = function getRecordsScopeOptions(){
  const stats = getRecordsBaseRows();

  const clubOptions = [...new Set(stats.map(getRecordsClubForStat).filter(Boolean))]
    .map(name=>({type:"club", value:name, label:`Clube: ${name}`}));

  const playedCompOptions = [...new Set(stats.map(getRecordsCompetitionForStat).filter(Boolean))]
    .map(name=>({type:"competition", value:name, label:`Competição: ${name}`}));

  const mainCompOptions = MAIN_RECORD_COMPETITIONS
    .filter(c=>!playedCompOptions.some(o=>String(o.value).toLowerCase()===String(c).toLowerCase()))
    .map(name=>({type:"competition", value:name, label:`Competição: ${name}`}));

  return [
    {type:"all", value:"all", label:"Geral da carreira"},
    ...clubOptions,
    ...playedCompOptions,
    ...mainCompOptions
  ];
}

var renderRecordsFilters = function renderRecordsFilters(){
  const select = $("recordsScopeSelect");
  if(!select) return;

  const options = getRecordsScopeOptions();
  const current = localStorage.getItem("fl_records_scope") || "all";

  select.innerHTML = options.map(o=>`
    <option value="${escapeAttr(o.type + "|" + o.value)}" ${current===o.type+"|"+o.value || (current==="all" && o.value==="all") ? "selected" : ""}>
      ${escapeHtml(o.label)}
    </option>
  `).join("");

  if(!select.value && options.length) select.value = "all|all";

  select.onchange = ()=>{
    localStorage.setItem("fl_records_scope", select.value);
    renderRecords();
  };
}

var getSelectedRecordScope = function getSelectedRecordScope(){
  const select = $("recordsScopeSelect");
  const value = select?.value || localStorage.getItem("fl_records_scope") || "all|all";
  const [type, ...rest] = String(value).split("|");
  return {type:type || "all", value:rest.join("|") || "all"};
}

var filterRecordsStatsByScope = function filterRecordsStatsByScope(stats, scope){
  if(!scope || scope.type === "all") return stats;

  if(scope.type === "club"){
    return stats.filter(s=>String(getRecordsClubForStat(s)).toLowerCase()===String(scope.value).toLowerCase());
  }

  if(scope.type === "competition"){
    return stats.filter(s=>String(getRecordsCompetitionForStat(s)).toLowerCase()===String(scope.value).toLowerCase());
  }

  return stats;
}

var aggregateRecordsByPlayer = function aggregateRecordsByPlayer(stats){
  const personagem = getActiveProtagonist();
  const name = personagem ? personagem.nome : "Protagonista";
  const map = new Map();

  stats.forEach(s=>{
    const player = name;
    if(!map.has(player)){
      map.set(player,{
        jogador:player,
        jogos:0,
        gols:0,
        assistencias:0,
        cartoes:0,
        temporadas:new Set(),
        clubes:new Set(),
        competicoes:new Set(),
        isProtagonist:true
      });
    }

    const item = map.get(player);
    item.jogos += num(s.jogos);
    item.gols += num(s.gols);
    item.assistencias += num(s.assistencias);
    item.cartoes += num(s.cartoes);

    const season = getRecordsSeasonForStat(s);
    const club = getRecordsClubForStat(s);
    const comp = getRecordsCompetitionForStat(s);

    if(season) item.temporadas.add(season);
    if(club) item.clubes.add(club);
    if(comp) item.competicoes.add(comp);
  });

  return [...map.values()];
}

var buildSingleSeasonGoalRecords = function buildSingleSeasonGoalRecords(stats){
  const personagem = getActiveProtagonist();
  const name = personagem ? personagem.nome : "Protagonista";
  const map = new Map();

  stats.forEach(s=>{
    const season = getRecordsSeasonForStat(s) || "-";
    const club = getRecordsClubForStat(s) || "-";
    const comp = getRecordsCompetitionForStat(s) || "-";
    const key = `${name}|${season}|${club}`;

    if(!map.has(key)){
      map.set(key,{
        jogador:name,
        temporada:season,
        clube:club,
        gols:0,
        jogos:0,
        assistencias:0,
        competicoes:new Set(),
        isProtagonist:true
      });
    }

    const item = map.get(key);
    item.gols += num(s.gols);
    item.jogos += num(s.jogos);
    item.assistencias += num(s.assistencias);
    item.competicoes.add(comp);
  });

  return [...map.values()]
    .sort((a,b)=>b.gols-a.gols || b.assistencias-a.assistencias || b.jogos-a.jogos)
    .slice(0,3);
}

var renderRecordList = function renderRecordList(containerId, rows, metric, label){
  const el = $(containerId);
  if(!el) return;

  const sorted = rows
    .slice()
    .sort((a,b)=>num(b[metric])-num(a[metric]) || String(a.jogador).localeCompare(String(b.jogador)))
    .slice(0,3);

  if(!sorted.length || sorted.every(r=>!num(r[metric]))){
    el.innerHTML = `<div class="record-empty">Sem dados suficientes.</div>`;
    return;
  }

  el.innerHTML = sorted.map((r,i)=>`
    <article class="record-row ${r.isProtagonist ? "is-player-record" : ""}">
      <div class="record-rank">${i+1}</div>
      <div class="record-main">
        <strong>${escapeHtml(r.jogador)}</strong>
        <small>${[...r.clubes || []].slice(0,3).join(" • ") || [...r.competicoes || []].slice(0,3).join(" • ") || "Carreira"}</small>
      </div>
      <div class="record-value">
        <strong>${num(r[metric])}</strong>
        <small>${label}</small>
      </div>
    </article>
  `).join("");
}

var renderSingleSeasonGoalRecords = function renderSingleSeasonGoalRecords(rows){
  const el = $("recordsSeasonGoals");
  if(!el) return;

  if(!rows.length || rows.every(r=>!num(r.gols))){
    el.innerHTML = `<div class="record-empty">Sem dados suficientes.</div>`;
    return;
  }

  el.innerHTML = rows.map((r,i)=>`
    <article class="record-row ${r.isProtagonist ? "is-player-record" : ""}">
      <div class="record-rank">${i+1}</div>
      <div class="record-main">
        <strong>${escapeHtml(r.jogador)}</strong>
        <small>${escapeHtml(r.temporada)} • ${escapeHtml(r.clube)}</small>
      </div>
      <div class="record-value">
        <strong>${num(r.gols)}</strong>
        <small>Gols</small>
      </div>
    </article>
  `).join("");
}

var renderRecords = function renderRecords(){
  renderRecordsFilters();

  const scope = getSelectedRecordScope();
  const allStats = getRecordsBaseRows();
  const filtered = filterRecordsStatsByScope(allStats, scope);
  const grouped = aggregateRecordsByPlayer(filtered);
  const seasonGoals = buildSingleSeasonGoalRecords(filtered);

  const scopeLabel = scope.type === "all"
    ? "Records da carreira"
    : scope.type === "club"
      ? `Records do clube: ${scope.value}`
      : `Records da competição: ${scope.value}`;

  setText("recordsScopeTitle", scopeLabel);

  const desc = scope.type === "all"
    ? "Ranking baseado nos dados cadastrados para a carreira selecionada."
    : "Ranking baseado no filtro selecionado e nos dados da carreira atual.";

  setText("recordsScopeDescription", desc);

  renderRecordList("recordsGoals", grouped, "gols", "Gols");
  renderRecordList("recordsAssists", grouped, "assistencias", "Assistências");
  renderRecordList("recordsGames", grouped, "jogos", "Jogos");
  renderSingleSeasonGoalRecords(seasonGoals);
}


// ===== V3.7.1 TROFEUS FIX =====
var normalizeTextKey = function normalizeTextKey(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]/g,"");
}

var trophyImageForCompetition = function trophyImageForCompetition(name){
  const key = normalizeTextKey(name);

  const map = [
    ["championsleague", "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/UEFA_Champions_League_logo_2.svg/512px-UEFA_Champions_League_logo_2.svg.png"],
    ["europaleague", "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/UEFA_Europa_League_logo.svg/512px-UEFA_Europa_League_logo.svg.png"],
    ["conferenceleague", "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/UEFA_Conference_League_logo.svg/512px-UEFA_Conference_League_logo.svg.png"],
    ["libertadores", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Copa_Libertadores_logo.svg/512px-Copa_Libertadores_logo.svg.png"],
    ["sulamericana", "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Copa_Sudamericana_logo.svg/512px-Copa_Sudamericana_logo.svg.png"],
    ["copadomundo", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/FIFA_World_Cup_Trophy.svg/512px-FIFA_World_Cup_Trophy.svg.png"],
    ["worldcup", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/FIFA_World_Cup_Trophy.svg/512px-FIFA_World_Cup_Trophy.svg.png"],
    ["mundialdeclubes", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/FIFA_Club_World_Cup_logo.svg/512px-FIFA_Club_World_Cup_logo.svg.png"],
    ["intercontinentaldeclubes", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Intercontinental_Cup.svg/512px-Intercontinental_Cup.svg.png"],
    ["premierleague", "https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/512px-Premier_League_Logo.svg.png"],
    ["laliga", "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/LaLiga.svg/512px-LaLiga.svg.png"],
    ["serieaitaliana", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Serie_A_logo_%282019%29.svg/512px-Serie_A_logo_%282019%29.svg.png"],
    ["seriea", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Serie_A_logo_%282019%29.svg/512px-Serie_A_logo_%282019%29.svg.png"],
    ["bundesliga", "https://upload.wikimedia.org/wikipedia/en/thumb/d/df/Bundesliga_logo_%282017%29.svg/512px-Bundesliga_logo_%282017%29.svg.png"],
    ["ligue1", "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Ligue_1_Uber_Eats_logo.svg/512px-Ligue_1_Uber_Eats_logo.svg.png"],
    ["brasileirao", "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Brasileir%C3%A3o_Assa%C3%AD_logo.png/512px-Brasileir%C3%A3o_Assa%C3%AD_logo.png"],
    ["brazilianseriea", "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Brasileir%C3%A3o_Assa%C3%AD_logo.png/512px-Brasileir%C3%A3o_Assa%C3%AD_logo.png"],
    ["copadobrasil", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Copa_do_Brasil_logo.svg/512px-Copa_do_Brasil_logo.svg.png"],
    ["copadelrey", "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Copa_del_Rey_logo.svg/512px-Copa_del_Rey_logo.svg.png"],
    ["facup", "https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Emirates_FA_Cup_logo.svg/512px-Emirates_FA_Cup_logo.svg.png"],
    ["eurocopa", "https://upload.wikimedia.org/wikipedia/en/thumb/4/4b/UEFA_Euro_2024_Logo.svg/512px-UEFA_Euro_2024_Logo.svg.png"],
    ["copaamerica", "https://upload.wikimedia.org/wikipedia/en/thumb/2/2e/Copa_America_2024_logo.svg/512px-Copa_America_2024_logo.svg.png"]
  ];

  const found = map.find(([k]) => key.includes(k) || k.includes(key));
  return found ? found[1] : "";
}

var trophyFallbackIcon = function trophyFallbackIcon(name){
  const key = normalizeTextKey(name);
  if(key.includes("champions")) return "🏆";
  if(key.includes("copa") || key.includes("cup")) return "🏆";
  if(key.includes("liga") || key.includes("league") || key.includes("serie") || key.includes("bundesliga") || key.includes("ligue")) return "🥇";
  if(key.includes("mundial") || key.includes("world")) return "🌍";
  return "🏆";
}

var getCareerTrophyRows = function getCareerTrophyRows(){
  const carreira = getActiveCareer();
  const rows = getTable("CAMPEOES_CARREIRA")
    .filter(t=>!carreira || String(t.carreira_id)===String(carreira.id))
    .filter(t=>String(t.status || "").includes("titulo") || String(t.clube || "").trim());

  const legacy = getTable("CAMPEOES")
    .filter(t=>!carreira || !t.carreira_id || String(t.carreira_id)===String(carreira.id));

  return [...rows, ...legacy];
}

var getSeasonByCareerSeasonId = function getSeasonByCareerSeasonId(id){
  return getTable("CARREIRA_TEMPORADAS").find(t=>String(t.id)===String(id)) || {};
}

var renderTrofeus = function renderTrofeus(){
  const wrap = $("trofeus-list") || $("trofeusGrid") || document.querySelector("#trofeus .cards-grid") || document.querySelector("#trofeus .content-card");

  if(!wrap) return;

  const p = getActiveProtagonist();
  const trophies = getCareerTrophyRows()
    .filter(t=>{
      // Mostra títulos ganhos pelo jogador/time na carreira.
      if(String(t.status || "").includes("titulo")) return Trueish(t.status);
      return String(t.clube || "").trim();
    })
    .sort((a,b)=>{
      const sa = a.temporada || getSeasonByCareerSeasonId(a.carreira_temporada_id).temporada || "";
      const sb = b.temporada || getSeasonByCareerSeasonId(b.carreira_temporada_id).temporada || "";
      return compareSeasonsDesc(sa,sb);
    });

  if(!trophies.length){
    wrap.innerHTML = `
      <div class="trophy-empty">
        <div>🏆</div>
        <h3>Nenhum troféu cadastrado ainda</h3>
        <p>Marque “Ganhei” no editor de temporada para os títulos aparecerem aqui.</p>
      </div>
    `;
    return;
  }

  const total = trophies.length;
  const byComp = new Map();

  trophies.forEach(t=>{
    const comp = t.competicao || compName(t.competicao_id) || "Título";
    byComp.set(comp, (byComp.get(comp) || 0) + 1);
  });

  wrap.innerHTML = `
    <div class="trophy-summary">
      <div>
        <span>Total de títulos</span>
        <strong>${total}</strong>
      </div>
      <div>
        <span>Competições vencidas</span>
        <strong>${byComp.size}</strong>
      </div>
      <div>
        <span>Maior coleção</span>
        <strong>${[...byComp.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] || "-"}</strong>
      </div>
    </div>

    <div class="trophy-grid-real">
      ${trophies.map(t=>{
        const season = t.temporada || getSeasonByCareerSeasonId(t.carreira_temporada_id).temporada || "-";
        const clubSeason = getSeasonByCareerSeasonId(t.carreira_temporada_id);
        const comp = t.competicao || compName(t.competicao_id) || "Título";
        const img = trophyImageForCompetition(comp);
        const fallback = trophyFallbackIcon(comp);

        return `
          <article class="real-trophy-card">
            <div class="real-trophy-img">
              ${img ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(comp)}" onerror="this.outerHTML='<span>${fallback}</span>'">` : `<span>${fallback}</span>`}
            </div>
            <div>
              <strong>${escapeHtml(comp)}</strong>
              <small>${escapeHtml(season)} • ${escapeHtml(clubSeason.clube_nome || t.clube || "-")}</small>
            </div>
            <div class="real-trophy-meta">
              ${t.artilheiro ? `<span>Artilheiro: ${escapeHtml(t.artilheiro)}</span>` : ""}
              ${t.lider_assistencias ? `<span>Assistências: ${escapeHtml(t.lider_assistencias)}</span>` : ""}
              ${t.melhor_jogador ? `<span>Melhor: ${escapeHtml(t.melhor_jogador)}</span>` : ""}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

var Trueish = function Trueish(v){ return true; }

var renderDashboardJourney = function renderDashboardJourney(){
  const user = getActiveUser();
  const career = getActiveCareer();
  const protagonist = getActiveProtagonist();
  const stats = getProtagonistStats();
  const season = getCurrentSeason(stats);
  const journey = buildClubJourney();

  setText("careerNameSide", career ? career.nome : "Football Legacy");
  setText("careerMetaSide", user ? user.nome : "Google Sheets");

  setText("currentSeason", season || "Banco conectado");
  setText("mainCharacterTitle", protagonist ? protagonist.nome : "Protagonista");
  setText("mainCharacterDesc", career ? (career.descricao || "Resumo da carreira do jogador selecionado.") : "Crie uma carreira.");
  setText("mainCharacter", protagonist ? protagonist.nome : "Sem personagem");
  setText("mainCharacterSub", protagonist ? `${protagonist.posicao || "-"} • ${protagonist.nacionalidade || "-"}` : "Cadastre um personagem");

  setPlayerPhoto(protagonist);

  const meta = document.querySelector(".hero-meta");

  if(meta){
    meta.classList.add("club-journey-hero");
    meta.innerHTML = `
      <div class="club-journey-head">
        <span>Clubes da carreira</span>
      </div>
      <div class="club-journey-strip clean-club-strip">
        ${journey.length ? journey.map(c=>`
          <button class="club-journey-item clean-club-item" onclick="openClubJourney('${escapeAttr(c.key)}')" title="${escapeAttr(c.clube_nome)}">
            <span class="club-crest-wrap clean-club-crest">
              ${c.escudo ? `<img src="${escapeAttr(c.escudo)}" onerror="this.parentElement.innerHTML='<b>⚽</b>'">` : `<b>⚽</b>`}
            </span>
            <strong>${escapeHtml(c.clube_nome)}</strong>
            <small>${escapeHtml(c.firstSeason)}${c.lastSeason && c.lastSeason!==c.firstSeason ? " - " + escapeHtml(c.lastSeason) : ""}</small>
            <span class="club-full-stats">
              <span><b>${c.jogos}</b> Jogos</span>
              <span><b>${c.gols}</b> Gols</span>
              <span><b>${c.assistencias}</b> Assistências</span>
            </span>
          </button>
        `).join("") : `<div class="season-empty">Nenhum clube jogado ainda.</div>`}
      </div>
    `;
  }
}


// ===== V3.7.2 RECORDS_BASE + CARREIRA =====
var normalizeRecordCategory = function normalizeRecordCategory(cat){
  const key = normalizeTextKey(cat);
  if(key.includes("artilheiro")) return "maior_artilheiro";
  if(key.includes("assist")) return "mais_assistencias";
  if(key.includes("jogos")) return "mais_jogos";
  if(key.includes("gols") && key.includes("temporada")) return "gols_em_uma_temporada";
  return cat || "";
}

var getRecordsBaseStaticRows = function getRecordsBaseStaticRows(){
  return getTable("RECORDS_BASE")
    .filter(r=>r && r.categoria)
    .map(r=>({
      jogador:r.jogador || "-",
      pais:r.pais || "",
      clube:r.clube || "",
      competicao:r.competicao || r.escopo_nome || "",
      temporada:r.temporada || "",
      categoria:normalizeRecordCategory(r.categoria),
      valor:num(r.valor),
      unidade:r.unidade || "",
      observacao:r.observacao || "",
      escopo_tipo:r.escopo_tipo || "competicao",
      escopo_nome:r.escopo_nome || r.competicao || "",
      isProtagonist:false,
      isBase:true
    }));
}

var buildCareerRecordRows = function buildCareerRecordRows(){
  const personagem = getActiveProtagonist();
  if(!personagem) return [];

  const stats = getRecordsBaseRows();
  const grouped = aggregateRecordsByPlayer(stats);
  const rows = [];

  grouped.forEach(g=>{
    rows.push({
      jogador:g.jogador,
      pais:personagem.nacionalidade || "",
      clube:[...g.clubes || []].join(" / "),
      competicao:[...g.competicoes || []].join(" / "),
      temporada:"carreira",
      categoria:"maior_artilheiro",
      valor:num(g.gols),
      unidade:"gols",
      isProtagonist:true,
      isBase:false
    });

    rows.push({
      jogador:g.jogador,
      pais:personagem.nacionalidade || "",
      clube:[...g.clubes || []].join(" / "),
      competicao:[...g.competicoes || []].join(" / "),
      temporada:"carreira",
      categoria:"mais_assistencias",
      valor:num(g.assistencias),
      unidade:"assistencias",
      isProtagonist:true,
      isBase:false
    });

    rows.push({
      jogador:g.jogador,
      pais:personagem.nacionalidade || "",
      clube:[...g.clubes || []].join(" / "),
      competicao:[...g.competicoes || []].join(" / "),
      temporada:"carreira",
      categoria:"mais_jogos",
      valor:num(g.jogos),
      unidade:"jogos",
      isProtagonist:true,
      isBase:false
    });
  });

  buildSingleSeasonGoalRecords(stats).forEach(s=>{
    rows.push({
      jogador:s.jogador,
      pais:personagem.nacionalidade || "",
      clube:s.clube || "",
      competicao:[...s.competicoes || []].join(" / "),
      temporada:s.temporada || "",
      categoria:"gols_em_uma_temporada",
      valor:num(s.gols),
      unidade:"gols",
      isProtagonist:true,
      isBase:false
    });
  });

  return rows.filter(r=>r.valor);
}

var getRecordsScopeOptions = function getRecordsScopeOptions(){
  const base = getRecordsBaseStaticRows();
  const stats = getRecordsBaseRows();

  const clubOptions = [...new Set([
    ...stats.map(getRecordsClubForStat),
    ...base.filter(r=>r.escopo_tipo==="clube").map(r=>r.escopo_nome)
  ].filter(Boolean))]
    .map(name=>({type:"club", value:name, label:`Clube: ${name}`}));

  const compOptions = [...new Set([
    ...stats.map(getRecordsCompetitionForStat),
    ...base.filter(r=>r.escopo_tipo==="competicao").map(r=>r.escopo_nome || r.competicao)
  ].filter(Boolean))]
    .map(name=>({type:"competition", value:name, label:`Competição: ${name}`}));

  return [
    {type:"all", value:"all", label:"Geral da carreira + base real"},
    ...clubOptions,
    ...compOptions
  ];
}

var filterRecordRowsByScope = function filterRecordRowsByScope(rows, scope){
  if(!scope || scope.type==="all") return rows;

  if(scope.type==="club"){
    return rows.filter(r=>
      String(r.clube || "").toLowerCase().includes(String(scope.value).toLowerCase()) ||
      String(r.escopo_nome || "").toLowerCase() === String(scope.value).toLowerCase()
    );
  }

  if(scope.type==="competition"){
    return rows.filter(r=>
      String(r.competicao || "").toLowerCase().includes(String(scope.value).toLowerCase()) ||
      String(r.escopo_nome || "").toLowerCase() === String(scope.value).toLowerCase()
    );
  }

  return rows;
}

var renderRecordRowsList = function renderRecordRowsList(containerId, allRows, category, label){
  const el = $(containerId);
  if(!el) return;

  const sorted = allRows
    .filter(r=>r.categoria===category)
    .sort((a,b)=>num(b.valor)-num(a.valor) || String(a.jogador).localeCompare(String(b.jogador)))
    .slice(0,3);

  if(!sorted.length){
    el.innerHTML = `<div class="record-empty">Sem dados suficientes.</div>`;
    return;
  }

  el.innerHTML = sorted.map((r,i)=>`
    <article class="record-row ${r.isProtagonist ? "is-player-record" : ""}">
      <div class="record-rank">${i+1}</div>
      <div class="record-main">
        <strong>${escapeHtml(r.jogador)}</strong>
        <small>${escapeHtml(r.clube || r.competicao || r.escopo_nome || "Base real")}${r.temporada ? " • " + escapeHtml(r.temporada) : ""}</small>
      </div>
      <div class="record-value">
        <strong>${num(r.valor)}</strong>
        <small>${escapeHtml(label)}</small>
      </div>
    </article>
  `).join("");
}

var renderRecords = function renderRecords(){
  renderRecordsFilters();

  const scope = getSelectedRecordScope();

  const baseRows = getRecordsBaseStaticRows();
  const careerRows = buildCareerRecordRows();
  const allRows = filterRecordRowsByScope([...baseRows, ...careerRows], scope);

  const scopeLabel = scope.type === "all"
    ? "Records da carreira + base real"
    : scope.type === "club"
      ? `Records do clube: ${scope.value}`
      : `Records da competição: ${scope.value}`;

  setText("recordsScopeTitle", scopeLabel);

  const desc = `Comparando RECORDS_BASE com os dados da carreira selecionada. Base real: ${baseRows.length} registros.`;
  setText("recordsScopeDescription", desc);

  renderRecordRowsList("recordsGoals", allRows, "maior_artilheiro", "Gols");
  renderRecordRowsList("recordsAssists", allRows, "mais_assistencias", "Assistências");
  renderRecordRowsList("recordsGames", allRows, "mais_jogos", "Jogos");
  renderRecordRowsList("recordsSeasonGoals", allRows, "gols_em_uma_temporada", "Gols");
}


// ===== V3.7.3 RECORDS POR COMPETIÇÃO + TROFÉUS + TOTAIS NO RESUMO =====
var normalizeScopeName = function normalizeScopeName(value){
  return normalizeTextKey(value)
    .replace("uefachampionsleague","championsleague")
    .replace("ucl","championsleague")
    .replace("brazilianseriea","brasileirao")
    .replace("campeonatobrasileiroseriea","brasileirao")
    .replace("serieaitaliana","seriea")
    .replace("italianseriea","seriea")
    .replace("laligaea","laliga");
}

var sameScope = function sameScope(a,b){
  const aa = normalizeScopeName(a);
  const bb = normalizeScopeName(b);
  if(!aa || !bb) return false;
  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

var getStatCompetitionName = function getStatCompetitionName(stat){
  return stat.competicao || compName(stat.competicao_id) || "";
}

var getStatClubName = function getStatClubName(stat){
  return stat.clube_nome || getRecordsClubForStat(stat) || "";
}

var getCareerRowsForScope = function getCareerRowsForScope(scope){
  const personagem = getActiveProtagonist();
  if(!personagem) return [];

  const rawStats = getRecordsBaseRows();

  return rawStats.filter(s=>{
    if(!scope || scope.type === "all") return true;

    if(scope.type === "competition"){
      return sameScope(getStatCompetitionName(s), scope.value);
    }

    if(scope.type === "club"){
      return sameScope(getStatClubName(s), scope.value);
    }

    return true;
  });
}

var buildCareerRecordRowsForScope = function buildCareerRecordRowsForScope(scope){
  const personagem = getActiveProtagonist();
  if(!personagem) return [];

  const stats = getCareerRowsForScope(scope);
  const rows = [];

  if(!stats.length) return rows;

  // Para maior artilheiro, assistências e jogos:
  // SOMA somente dentro do filtro atual.
  const total = stats.reduce((acc,s)=>{
    acc.jogos += num(s.jogos);
    acc.gols += num(s.gols);
    acc.assistencias += num(s.assistencias);
    acc.cartoes += num(s.cartoes);
    if(getRecordsSeasonForStat(s)) acc.temporadas.add(getRecordsSeasonForStat(s));
    if(getStatClubName(s)) acc.clubes.add(getStatClubName(s));
    if(getStatCompetitionName(s)) acc.competicoes.add(getStatCompetitionName(s));
    return acc;
  },{jogos:0,gols:0,assistencias:0,cartoes:0,temporadas:new Set(),clubes:new Set(),competicoes:new Set()});

  const scopeCompetition = scope?.type === "competition" ? scope.value : [...total.competicoes].join(" / ");
  const scopeClub = scope?.type === "club" ? scope.value : [...total.clubes].join(" / ");

  rows.push({
    jogador: personagem.nome,
    pais: personagem.nacionalidade || "",
    clube: scopeClub,
    competicao: scopeCompetition,
    temporada: "carreira",
    categoria: "maior_artilheiro",
    valor: total.gols,
    unidade: "gols",
    isProtagonist: true,
    isBase: false
  });

  rows.push({
    jogador: personagem.nome,
    pais: personagem.nacionalidade || "",
    clube: scopeClub,
    competicao: scopeCompetition,
    temporada: "carreira",
    categoria: "mais_assistencias",
    valor: total.assistencias,
    unidade: "assistencias",
    isProtagonist: true,
    isBase: false
  });

  rows.push({
    jogador: personagem.nome,
    pais: personagem.nacionalidade || "",
    clube: scopeClub,
    competicao: scopeCompetition,
    temporada: "carreira",
    categoria: "mais_jogos",
    valor: total.jogos,
    unidade: "jogos",
    isProtagonist: true,
    isBase: false
  });

  // Para maior goleador em uma temporada:
  // agrupa por temporada + competição + clube, não por carreira inteira.
  const seasonMap = new Map();

  stats.forEach(s=>{
    const season = getRecordsSeasonForStat(s) || "-";
    const club = getStatClubName(s) || "-";
    const comp = getStatCompetitionName(s) || scopeCompetition || "-";
    const key = `${season}|${club}|${comp}`;

    if(!seasonMap.has(key)){
      seasonMap.set(key,{
        jogador: personagem.nome,
        pais: personagem.nacionalidade || "",
        clube: club,
        competicao: comp,
        temporada: season,
        categoria: "gols_em_uma_temporada",
        valor: 0,
        unidade: "gols",
        isProtagonist: true,
        isBase: false
      });
    }

    const item = seasonMap.get(key);
    item.valor += num(s.gols);
  });

  rows.push(...[...seasonMap.values()].filter(r=>r.valor));

  return rows.filter(r=>num(r.valor));
}

var filterRecordRowsByScope = function filterRecordRowsByScope(rows, scope){
  if(!scope || scope.type==="all") return rows;

  if(scope.type==="club"){
    return rows.filter(r=>
      sameScope(r.clube, scope.value) ||
      sameScope(r.escopo_nome, scope.value)
    );
  }

  if(scope.type==="competition"){
    return rows.filter(r=>
      sameScope(r.competicao, scope.value) ||
      sameScope(r.escopo_nome, scope.value)
    );
  }

  return rows;
}

var renderRecords = function renderRecords(){
  renderRecordsFilters();

  const scope = getSelectedRecordScope();

  const baseRows = filterRecordRowsByScope(getRecordsBaseStaticRows(), scope);
  const careerRows = buildCareerRecordRowsForScope(scope);
  const allRows = [...baseRows, ...careerRows];

  const scopeLabel = scope.type === "all"
    ? "Records da carreira + base real"
    : scope.type === "club"
      ? `Records do clube: ${scope.value}`
      : `Records da competição: ${scope.value}`;

  setText("recordsScopeTitle", scopeLabel);

  const desc = scope.type === "competition"
    ? "Comparação filtrada por competição: os totais do jogador são somados apenas nessa competição."
    : scope.type === "club"
      ? "Comparação filtrada por clube: os totais do jogador são somados apenas nesse clube."
      : "Comparando base real com os dados da carreira selecionada.";

  setText("recordsScopeDescription", `${desc} Base real carregada: ${getRecordsBaseStaticRows().length} registros.`);

  renderRecordRowsList("recordsGoals", allRows, "maior_artilheiro", "Gols");
  renderRecordRowsList("recordsAssists", allRows, "mais_assistencias", "Assistências");
  renderRecordRowsList("recordsGames", allRows, "mais_jogos", "Jogos");
  renderRecordRowsList("recordsSeasonGoals", allRows, "gols_em_uma_temporada", "Gols");
}

var getCareerTotals = function getCareerTotals(){
  const stats = getRecordsBaseRows();
  return stats.reduce((acc,s)=>{
    acc.jogos += num(s.jogos);
    acc.gols += num(s.gols);
    acc.assistencias += num(s.assistencias);
    acc.cartoes += num(s.cartoes);
    return acc;
  },{jogos:0,gols:0,assistencias:0,cartoes:0});
}

var renderDashboardJourney = function renderDashboardJourney(){
  const user = getActiveUser();
  const career = getActiveCareer();
  const protagonist = getActiveProtagonist();
  const stats = getProtagonistStats();
  const season = getCurrentSeason(stats);
  const journey = buildClubJourney();
  const totals = getCareerTotals();

  setText("careerNameSide", career ? career.nome : "Football Legacy");
  setText("careerMetaSide", user ? user.nome : "Google Sheets");

  setText("currentSeason", season || "Banco conectado");
  setText("mainCharacterTitle", protagonist ? protagonist.nome : "Protagonista");
  setText("mainCharacterDesc", career ? (career.descricao || "Resumo da carreira do jogador selecionado.") : "Crie uma carreira.");
  setText("mainCharacter", protagonist ? protagonist.nome : "Sem personagem");
  setText("mainCharacterSub", protagonist ? `${protagonist.posicao || "-"} • ${protagonist.nacionalidade || "-"}` : "Cadastre um personagem");

  setPlayerPhoto(protagonist);

  const meta = document.querySelector(".hero-meta");

  if(meta){
    meta.classList.add("club-journey-hero");
    meta.innerHTML = `
      <div class="career-total-strip">
        <div><strong>${totals.jogos}</strong><span>Jogos</span></div>
        <div><strong>${totals.gols}</strong><span>Gols</span></div>
        <div><strong>${totals.assistencias}</strong><span>Assistências</span></div>
      </div>

      <div class="club-journey-head">
        <span>Clubes da carreira</span>
      </div>
      <div class="club-journey-strip clean-club-strip">
        ${journey.length ? journey.map(c=>`
          <button class="club-journey-item clean-club-item" onclick="openClubJourney('${escapeAttr(c.key)}')" title="${escapeAttr(c.clube_nome)}">
            <span class="club-crest-wrap clean-club-crest">
              ${c.escudo ? `<img src="${escapeAttr(c.escudo)}" onerror="this.parentElement.innerHTML='<b>⚽</b>'">` : `<b>⚽</b>`}
            </span>
            <strong>${escapeHtml(c.clube_nome)}</strong>
            <small>${escapeHtml(c.firstSeason)}${c.lastSeason && c.lastSeason!==c.firstSeason ? " - " + escapeHtml(c.lastSeason) : ""}</small>
            <span class="club-full-stats">
              <span><b>${c.jogos}</b> Jogos</span>
              <span><b>${c.gols}</b> Gols</span>
              <span><b>${c.assistencias}</b> Assistências</span>
            </span>
          </button>
        `).join("") : `<div class="season-empty">Nenhum clube jogado ainda.</div>`}
      </div>
    `;
  }
}

// Troféus: leitura mais tolerante da CAMPEOES_CARREIRA.
var isWonTrophy = function isWonTrophy(row){
  const status = String(row.status || "").toLowerCase();
  if(status.includes("titulo")) return true;
  if(status.includes("ganho")) return true;
  if(status === "true" || status === "sim" || status === "x") return true;

  // Se existe campeão igual ao clube da passagem e essa passagem é do jogador, considerar título.
  const season = getSeasonByCareerSeasonId(row.carreira_temporada_id);
  const champion = row.campeao || row.clube || row.time_campeao || "";
  if(champion && season && sameScope(champion, season.clube_nome)) return true;

  return false;
}

var getCareerTrophyRows = function getCareerTrophyRows(){
  const carreira = getActiveCareer();

  const rows = getTable("CAMPEOES_CARREIRA")
    .filter(t=>!carreira || String(t.carreira_id)===String(carreira.id))
    .filter(t=>isWonTrophy(t));

  const legacy = getTable("CAMPEOES")
    .filter(t=>!carreira || !t.carreira_id || String(t.carreira_id)===String(carreira.id))
    .filter(t=>isWonTrophy(t) || String(t.titulo || "").toLowerCase().includes("sim"));

  return [...rows, ...legacy];
}

var renderTrofeus = function renderTrofeus(){
  const wrap = $("trofeus-list") || $("trofeusGrid") || document.querySelector("#trofeus .cards-grid") || document.querySelector("#trofeus .content-card") || document.querySelector("#trofeus");

  if(!wrap) return;

  const trophies = getCareerTrophyRows()
    .sort((a,b)=>{
      const sa = a.temporada || getSeasonByCareerSeasonId(a.carreira_temporada_id).temporada || "";
      const sb = b.temporada || getSeasonByCareerSeasonId(b.carreira_temporada_id).temporada || "";
      return compareSeasonsDesc(sa,sb);
    });

  if(!trophies.length){
    wrap.innerHTML = `
      <div class="trophy-empty">
        <div>🏆</div>
        <h3>Nenhum troféu reconhecido ainda</h3>
        <p>Edite a temporada, marque “Ganhei” e salve para o título aparecer aqui.</p>
      </div>
    `;
    return;
  }

  const total = trophies.length;
  const byComp = new Map();

  trophies.forEach(t=>{
    const comp = t.competicao || compName(t.competicao_id) || "Título";
    byComp.set(comp, (byComp.get(comp) || 0) + 1);
  });

  wrap.innerHTML = `
    <div class="trophy-summary">
      <div>
        <span>Total de títulos</span>
        <strong>${total}</strong>
      </div>
      <div>
        <span>Competições vencidas</span>
        <strong>${byComp.size}</strong>
      </div>
      <div>
        <span>Maior coleção</span>
        <strong>${[...byComp.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] || "-"}</strong>
      </div>
    </div>

    <div class="trophy-grid-real">
      ${trophies.map(t=>{
        const seasonObj = getSeasonByCareerSeasonId(t.carreira_temporada_id);
        const season = t.temporada || seasonObj.temporada || "-";
        const comp = t.competicao || compName(t.competicao_id) || "Título";
        const champion = t.campeao || t.clube || seasonObj.clube_nome || "-";
        const img = trophyImageForCompetition(comp);
        const fallback = trophyFallbackIcon(comp);

        return `
          <article class="real-trophy-card">
            <div class="real-trophy-img">
              ${img ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(comp)}" onerror="this.outerHTML='<span>${fallback}</span>'">` : `<span>${fallback}</span>`}
            </div>
            <div>
              <strong>${escapeHtml(comp)}</strong>
              <small>${escapeHtml(season)} • ${escapeHtml(champion)}</small>
            </div>
            <div class="real-trophy-meta">
              ${t.artilheiro ? `<span>Artilheiro: ${escapeHtml(t.artilheiro)}</span>` : ""}
              ${t.lider_assistencias ? `<span>Assistências: ${escapeHtml(t.lider_assistencias)}</span>` : ""}
              ${t.melhor_jogador ? `<span>Melhor: ${escapeHtml(t.melhor_jogador)}</span>` : ""}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}


// ===== V3.7.9 PLAYER CARD DOM FIX =====
var findPlayerCardShell = function findPlayerCardShell(){
  const nameEl = $("mainCharacter") || $("protagonistCardName") || document.querySelector("[id*='Character']");
  if(!nameEl) return null;

  let el = nameEl;

  for(let i=0; i<8 && el; i++){
    const hasImg = !!el.querySelector("img, #playerPhoto, #protagonistImage");
    const text = (el.textContent || "").toLowerCase();
    const looksLikeCard = hasImg || text.includes("atacante") || text.includes("selecione um protagonista");

    if(looksLikeCard && el.offsetWidth > 120 && el.offsetHeight > 120){
      return el;
    }

    el = el.parentElement;
  }

  return nameEl.parentElement;
}

var applyPlayerCardOverlay = function applyPlayerCardOverlay(protagonist){
  const shell = findPlayerCardShell();
  if(!shell) return;

  const name = protagonist?.nome || "Football Legacy";
  const meta = protagonist ? `${protagonist.posicao || "-"} • ${protagonist.nacionalidade || "-"}` : "SELECIONE UM PROTAGONISTA";
  const photo = protagonist?.foto || "";

  shell.classList.add("player-card-shell-fixed");
  shell.innerHTML = `
    <div class="player-card-onepiece ${photo ? "has-photo" : ""}">
      ${photo ? `<img src="${escapeAttr(photo)}" alt="${escapeAttr(name)}">` : `<div class="player-card-fl">FL</div>`}
      <div class="player-card-shade"></div>
      <div class="player-card-overlay-name">
        <strong id="mainCharacter">${escapeHtml(name)}</strong>
        <span id="mainCharacterSub">${escapeHtml(meta)}</span>
      </div>
    </div>
  `;
}

var renderDashboardJourney = function renderDashboardJourney(){
  const user = getActiveUser();
  const career = getActiveCareer();
  const protagonist = getActiveProtagonist();
  const stats = getProtagonistStats();
  const season = getCurrentSeason(stats);
  const journey = buildClubJourney();
  const totals = typeof getCareerTotals === "function" ? getCareerTotals() : stats.reduce((acc,s)=>{
    acc.jogos += num(s.jogos);
    acc.gols += num(s.gols);
    acc.assistencias += num(s.assistencias);
    return acc;
  },{jogos:0,gols:0,assistencias:0});

  setText("careerNameSide", career ? career.nome : "Football Legacy");
  setText("careerMetaSide", user ? user.nome : "Google Sheets");

  setText("currentSeason", season || "Banco conectado");
  setText("mainCharacterTitle", protagonist ? protagonist.nome : "Protagonista");
  setText("mainCharacterDesc", career ? (career.descricao || "Resumo da carreira do jogador selecionado.") : "Crie uma carreira.");

  applyPlayerCardOverlay(protagonist);

  const meta = document.querySelector(".hero-meta");

  if(meta){
    meta.classList.add("club-journey-hero");
    meta.innerHTML = `
      <div class="career-total-strip">
        <div><strong>${totals.jogos}</strong><span>Jogos</span></div>
        <div><strong>${totals.gols}</strong><span>Gols</span></div>
        <div><strong>${totals.assistencias}</strong><span>Assistências</span></div>
      </div>

      <div class="club-journey-head">
        <span>Clubes da carreira</span>
      </div>
      <div class="club-journey-strip clean-club-strip">
        ${journey.length ? journey.map(c=>`
          <button class="club-journey-item clean-club-item" onclick="openClubJourney('${escapeAttr(c.key)}')" title="${escapeAttr(c.clube_nome)}">
            <span class="club-crest-wrap clean-club-crest">
              ${c.escudo ? `<img src="${escapeAttr(c.escudo)}" onerror="this.parentElement.innerHTML='<b>⚽</b>'">` : `<b>⚽</b>`}
            </span>
            <strong>${escapeHtml(c.clube_nome)}</strong>
            <small>${escapeHtml(c.firstSeason)}${c.lastSeason && c.lastSeason!==c.firstSeason ? " - " + escapeHtml(c.lastSeason) : ""}</small>
            <span class="club-full-stats">
              <span><b>${c.jogos}</b> Jogos</span>
              <span><b>${c.gols}</b> Gols</span>
              <span><b>${c.assistencias}</b> Assistências</span>
            </span>
          </button>
        `).join("") : `<div class="season-empty">Nenhum clube jogado ainda.</div>`}
      </div>
    `;
  }
}


// ===== V3.7.11 BOLA DE OURO ESCUDO DO CLUBE + SUPERCOPA UEFA =====
var normalizeClubKey = function normalizeClubKey(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/football club|fc|cf|sc|ac|afc|calcio|club de futbol/g,"")
    .replace(/[^a-z0-9]/g,"");
}

var clubBadgeStatic = function clubBadgeStatic(name){
  const key = normalizeClubKey(name);

  const map = [
    ["parissaintgermain","https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png"],
    ["psg","https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png"],
    ["realmadrid","https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png"],
    ["barcelona","https://r2.thesportsdb.com/images/media/team/badge/kkk3w61558409356.png"],
    ["manchestercity","https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png"],
    ["manchesterunited","https://r2.thesportsdb.com/images/media/team/badge/xzqdr11517660252.png"],
    ["liverpool","https://r2.thesportsdb.com/images/media/team/badge/spqlmo1583434991.png"],
    ["bayernmunich","https://r2.thesportsdb.com/images/media/team/badge/2m8psv1686848407.png"],
    ["bayernmunchen","https://r2.thesportsdb.com/images/media/team/badge/2m8psv1686848407.png"],
    ["borussiadortmund","https://r2.thesportsdb.com/images/media/team/badge/yqppxq1473504813.png"],
    ["chelsea","https://r2.thesportsdb.com/images/media/team/badge/yvwvtu1448813215.png"],
    ["arsenal","https://r2.thesportsdb.com/images/media/team/badge/uyhbfe1612467038.png"],
    ["tottenhamhotspur","https://r2.thesportsdb.com/images/media/team/badge/6l4m9v1547616546.png"],
    ["tottenham","https://r2.thesportsdb.com/images/media/team/badge/6l4m9v1547616546.png"],
    ["juventus","https://r2.thesportsdb.com/images/media/team/badge/83jffy1687276118.png"],
    ["acmilan","https://r2.thesportsdb.com/images/media/team/badge/0i78xi1629706488.png"],
    ["milan","https://r2.thesportsdb.com/images/media/team/badge/0i78xi1629706488.png"],
    ["intermilan","https://r2.thesportsdb.com/images/media/team/badge/1dwuox1687866515.png"],
    ["internazionale","https://r2.thesportsdb.com/images/media/team/badge/1dwuox1687866515.png"],
    ["napoli","https://r2.thesportsdb.com/images/media/team/badge/xqk4oz1630590102.png"],
    ["atleticomadrid","https://r2.thesportsdb.com/images/media/team/badge/83meck1670837138.png"],
    ["benfica","https://r2.thesportsdb.com/images/media/team/badge/vwuqur1466189654.png"],
    ["porto","https://r2.thesportsdb.com/images/media/team/badge/yxstss1466189652.png"],
    ["sportingcp","https://r2.thesportsdb.com/images/media/team/badge/uxyxxp1466189590.png"],
    ["ajax","https://r2.thesportsdb.com/images/media/team/badge/gtqurq1466026297.png"],
    ["newcastleunited","https://r2.thesportsdb.com/images/media/team/badge/2j5uli1590251329.png"],
    ["newcastle","https://r2.thesportsdb.com/images/media/team/badge/2j5uli1590251329.png"],
    ["corinthians","https://r2.thesportsdb.com/images/media/team/badge/vvuvps1473538042.png"],
    ["santos","https://r2.thesportsdb.com/images/media/team/badge/h5e5a81613513628.png"],
    ["flamengo","https://r2.thesportsdb.com/images/media/team/badge/uzqoqt1473452887.png"],
    ["palmeiras","https://r2.thesportsdb.com/images/media/team/badge/1vxxu21613513711.png"],
    ["saopaulo","https://r2.thesportsdb.com/images/media/team/badge/1k42ae1613514162.png"],
    ["alhilal","https://r2.thesportsdb.com/images/media/team/badge/x7i8pi1591512874.png"],
    ["intermiami","https://r2.thesportsdb.com/images/media/team/badge/0w7ywq1591511372.png"]
  ];

  const found = map.find(([k]) => key === k || key.includes(k) || k.includes(key));
  return found ? found[1] : "";
}

var clubBadgeForBallon = function clubBadgeForBallon(row){
  const raw = row.clube || row.club || row.time || "";
  if(!raw) return "";

  const firstClub = String(raw).split("/")[0].split(",")[0].trim();
  const allClubs = getTable("CLUBES");

  const fromDb = allClubs.find(c =>
    sameScope(c.nome, firstClub) ||
    sameScope(c.nome, raw) ||
    sameScope(firstClub, c.nome)
  );

  return (fromDb && fromDb.escudo) ? fromDb.escudo : clubBadgeStatic(firstClub || raw);
}

var renderBallonPlayerCell = function renderBallonPlayerCell(row, sourceLabel=""){
  const badge = clubBadgeForBallon(row);
  const name = row.jogador || row.player || "-";
  return `
    <span class="ballon-player-cell">
      <span class="ballon-player-name">${escapeHtml(name)}</span>
      ${badge ? `<img class="ballon-club-badge" src="${escapeAttr(badge)}" title="${escapeAttr(row.clube || row.club || "")}" onerror="this.remove()">` : ""}
      ${sourceLabel ? `<em class="source-pill">${escapeHtml(sourceLabel)}</em>` : ""}
    </span>
  `;
}

// Reforço: times europeus sempre sugerem Supercopa da UEFA.
var competitionSuggestions = function competitionSuggestions(team){
  const list = [];

  if(team.league) list.push(team.league);

  const country = String(team.country || "").toLowerCase();

  const europeCountries = [
    "england","spain","italy","germany","france","portugal","netherlands",
    "belgium","scotland","turkey","austria","switzerland","ukraine",
    "russia","greece","denmark","sweden","norway","croatia","serbia",
    "czech","poland"
  ];

  const isEuropean = europeCountries.some(c=>country.includes(c));

  if(country.includes("england")){
    list.push("FA Cup","Carabao Cup","Community Shield");
  }else if(country.includes("spain")){
    list.push("Copa del Rey","Supercopa de España");
  }else if(country.includes("italy")){
    list.push("Coppa Italia","Supercoppa Italiana");
  }else if(country.includes("germany")){
    list.push("DFB-Pokal","DFL-Supercup");
  }else if(country.includes("france")){
    list.push("Coupe de France","Trophée des Champions");
  }else if(country.includes("brazil")){
    list.push("Copa do Brasil","Libertadores","Sul-Americana");
  }else if(country.includes("portugal")){
    list.push("Taça de Portugal","Taça da Liga","Supertaça");
  }else if(country.includes("netherlands")){
    list.push("KNVB Cup","Johan Cruyff Shield");
  }

  if(isEuropean){
    list.push("Champions League","Europa League","Conference League","Supercopa da UEFA","Mundial de Clubes","Intercontinental de Clubes");
  }else{
    list.push("Champions League","Europa League","Conference League","Mundial de Clubes","Intercontinental de Clubes");
  }

  return [...new Set(list.filter(Boolean))];
}


// ===== V3.7.13 COMPETITION SUGGESTIONS SAFE =====
var competitionSuggestions = function competitionSuggestions(team){
  const list = [];

  if(team && team.league) list.push(team.league);

  const country = String(team?.country || "").toLowerCase();

  const europeCountries = [
    "england","spain","italy","germany","france","portugal","netherlands",
    "belgium","scotland","turkey","austria","switzerland","ukraine",
    "russia","greece","denmark","sweden","norway","croatia","serbia",
    "czech","poland"
  ];

  const isEuropean = europeCountries.some(c=>country.includes(c));

  if(country.includes("england")){
    list.push("FA Cup","Carabao Cup","Community Shield");
  }else if(country.includes("spain")){
    list.push("Copa del Rey","Supercopa de España");
  }else if(country.includes("italy")){
    list.push("Coppa Italia","Supercoppa Italiana");
  }else if(country.includes("germany")){
    list.push("DFB-Pokal","DFL-Supercup");
  }else if(country.includes("france")){
    list.push("Coupe de France","Trophée des Champions");
  }else if(country.includes("brazil")){
    list.push("Copa do Brasil","Libertadores","Sul-Americana");
  }else if(country.includes("portugal")){
    list.push("Taça de Portugal","Taça da Liga","Supertaça");
  }else if(country.includes("netherlands")){
    list.push("KNVB Cup","Johan Cruyff Shield");
  }

  if(isEuropean){
    list.push(
      "Champions League",
      "Europa League",
      "Conference League",
      "Supercopa da UEFA",
      "Mundial de Clubes",
      "Intercontinental de Clubes"
    );
  }else{
    list.push(
      "Champions League",
      "Europa League",
      "Conference League",
      "Mundial de Clubes",
      "Intercontinental de Clubes"
    );
  }

  return [...new Set(list.filter(Boolean))];
}

var startFootballLegacy = function startFootballLegacy(){
  try{
    console.log("Football Legacy iniciando...");
    console.log("API configurada:", API_URL);

    // bindings principais com proteção
    document.querySelectorAll(".menu-item").forEach(b=>{
      if(!b.dataset.bound){
        b.dataset.bound = "1";
        b.addEventListener("click",()=>navigate(b.dataset.page));
      }
    });

    document.querySelectorAll("[data-form]").forEach(b=>{
      if(!b.dataset.bound){
        b.dataset.bound = "1";
        b.addEventListener("click",()=>openForm(b.dataset.form));
      }
    });

    if($("syncBtn")) $("syncBtn").onclick = loadData;
    if($("seasonCreateBtn")) $("seasonCreateBtn").onclick = openSeasonFlow;
    if($("newCareerBtn")) $("newCareerBtn").onclick = openQuickCareerForm;
    if($("openSeasonBtn")) $("openSeasonBtn").onclick = openSeasonFlow;
    if($("top11BatchBtn")) $("top11BatchBtn").onclick = openTop11BatchForm;
    if($("ballonBatchBtn")) $("ballonBatchBtn").onclick = openBallonBatchForm;
    if($("ballonBestBtn")) $("ballonBestBtn").onclick = openBestBallonModal;
    if($("closeBestBallon")) $("closeBestBallon").onclick = closeBestBallonModal;

    if($("bestBallonModal")) $("bestBallonModal").onclick = e => { if(e.target === $("bestBallonModal")) closeBestBallonModal(); };

    if($("protagonistEditCard")){
      $("protagonistEditCard").onclick = ()=>{
        const p = getActiveProtagonist();
        p ? openForm("personagem", p.id) : openForm("personagem");
      };
    }

    if($("userSelect")){
      $("userSelect").onchange = e=>{
        active.usuario_id = e.target.value;
        const c = getCareersForUser(active.usuario_id);
        active.carreira_id = c[0] ? String(c[0].id) : "";
        active.protagonista_id = "";
        active.temporada = "";
        saveActive();
        renderAll();
      };
    }

    if($("careerSelect")){
      $("careerSelect").onchange = e=>{
        active.carreira_id = e.target.value;
        active.protagonista_id = "";
        active.temporada = "";
        const ch = getCareerCharacters();
        if(ch[0]) active.protagonista_id = String(ch[0].id);
        saveActive();
        renderAll();
      };
    }

    if($("protagonistSelect")){
      $("protagonistSelect").onchange = e=>{
        active.protagonista_id = e.target.value;
        active.temporada = "";
        saveActive();
        renderAll();
      };
    }

    loadData();
  }catch(err){
    console.error("Erro ao iniciar Football Legacy:", err);
    setStatus("Erro ao iniciar dashboard: " + err.message, "error");
  }
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", startFootballLegacy);
}else{
  startFootballLegacy();
}



var removeRecord = async function removeRecord(kind,id){
  if(!id && id !== 0){
    alert("ID não encontrado para excluir.");
    return;
  }

  if(!confirm("Excluir este registro?")){
    return;
  }

  const table = tableMap[kind];

  if(!table){
    alert("Tabela não configurada para: " + kind);
    return;
  }

  try{
    setStatus("Excluindo registro...");
    const res = await apiPost({
      action:"delete",
      table,
      id
    });

    if(!res.ok){
      throw new Error(res.error || "Erro ao excluir registro.");
    }

    await loadData();
    setStatus("Registro excluído com sucesso.","ok");
  }catch(err){
    console.error(err);
    setStatus("Erro ao excluir: " + err.message, "error");
  }
}


if(typeof closeModal !== "undefined") window.closeModal = closeModal;
if(typeof navigate !== "undefined") window.navigate = navigate;
console.log('Funções UI restauradas v3.4');

if(typeof openBestBallonModal !== "undefined") window.openBestBallonModal = openBestBallonModal;
if(typeof closeBestBallonModal !== "undefined") window.closeBestBallonModal = closeBestBallonModal;
if(typeof editSeasonRecord !== "undefined") window.editSeasonRecord = editSeasonRecord;
if(typeof setButtonSaving !== "undefined") window.setButtonSaving = setButtonSaving;
if(typeof clearButtonSaving !== "undefined") window.clearButtonSaving = clearButtonSaving;
if(typeof searchTeamsForSeason !== "undefined") window.searchTeamsForSeason = searchTeamsForSeason;
if(typeof selectSeasonTeam !== "undefined") window.selectSeasonTeam = selectSeasonTeam;
if(typeof renderSeasonStatsRows !== "undefined") window.renderSeasonStatsRows = renderSeasonStatsRows;
if(typeof openSeasonFlow !== "undefined") window.openSeasonFlow = openSeasonFlow;
if(typeof openClubJourney !== "undefined") window.openClubJourney = openClubJourney;
if(typeof closeClubJourney !== "undefined") window.closeClubJourney = closeClubJourney;
if(typeof renderDashboardJourney !== "undefined") window.renderDashboardJourney = renderDashboardJourney;
if(typeof saveSeasonTitlesFlow !== "undefined") window.saveSeasonTitlesFlow = saveSeasonTitlesFlow;
if(typeof renderSeasonTitlesRows !== "undefined") window.renderSeasonTitlesRows = renderSeasonTitlesRows;
if(typeof renderRecords !== "undefined") window.renderRecords = renderRecords;
if(typeof renderTrofeus !== "undefined") window.renderTrofeus = renderTrofeus;
if(typeof getCareerTrophyRows !== "undefined") window.getCareerTrophyRows = getCareerTrophyRows;
if(typeof getRecordsBaseStaticRows !== "undefined") window.getRecordsBaseStaticRows = getRecordsBaseStaticRows;

// ===== V3.7.14 FORCE SUPERCOPA UEFA FOR EUROPEAN CLUBS =====
var isEuropeanTeamForCompetitions = function isEuropeanTeamForCompetitions(team){
  const country = String(team?.country || "").toLowerCase();
  const league = String(team?.league || "").toLowerCase();
  const name = String(team?.name || "").toLowerCase();

  const europeCountries = [
    "england","spain","italy","germany","france","portugal","netherlands",
    "belgium","scotland","turkey","austria","switzerland","ukraine",
    "russia","greece","denmark","sweden","norway","croatia","serbia",
    "czech","poland"
  ];

  const europeanLeagues = [
    "premier league","la liga","spanish la liga","serie a","italian serie a",
    "bundesliga","ligue 1","eredivisie","primeira liga","liga portugal",
    "scottish premiership","super lig","süper lig","austrian bundesliga",
    "swiss super league","belgian pro league","jupiler pro league"
  ];

  const knownEuropeanClubs = [
    "milan","inter","juventus","roma","napoli","barcelona","real madrid",
    "atletico","manchester","liverpool","chelsea","arsenal","tottenham",
    "bayern","dortmund","psg","paris saint-germain","benfica","porto",
    "sporting","ajax","psv","feyenoord","newcastle"
  ];

  return europeCountries.some(c=>country.includes(c)) ||
    europeanLeagues.some(l=>league.includes(l)) ||
    knownEuropeanClubs.some(c=>name.includes(c));
}

// Esta função fica no fim do arquivo de propósito para vencer versões anteriores.
var competitionSuggestions = function competitionSuggestions(team){
  const list = [];

  if(team && team.league) list.push(team.league);

  const country = String(team?.country || "").toLowerCase();

  if(country.includes("england")){
    list.push("FA Cup","Carabao Cup","Community Shield");
  }else if(country.includes("spain")){
    list.push("Copa del Rey","Supercopa de España");
  }else if(country.includes("italy")){
    list.push("Coppa Italia","Supercoppa Italiana");
  }else if(country.includes("germany")){
    list.push("DFB-Pokal","DFL-Supercup");
  }else if(country.includes("france")){
    list.push("Coupe de France","Trophée des Champions");
  }else if(country.includes("brazil")){
    list.push("Copa do Brasil","Libertadores","Sul-Americana");
  }else if(country.includes("portugal")){
    list.push("Taça de Portugal","Taça da Liga","Supertaça");
  }else if(country.includes("netherlands")){
    list.push("KNVB Cup","Johan Cruyff Shield");
  }

  const european = isEuropeanTeamForCompetitions(team);

  if(european){
    list.push(
      "Champions League",
      "Europa League",
      "Conference League",
      "Supercopa da UEFA",
      "Mundial de Clubes",
      "Intercontinental de Clubes"
    );
  }else{
    list.push(
      "Champions League",
      "Europa League",
      "Conference League",
      "Mundial de Clubes",
      "Intercontinental de Clubes"
    );
  }

  return [...new Set(list.filter(Boolean))];
}

// Garante que se a tela já renderizou sem Supercopa, selecionar time reinsere.
const __oldSelectSeasonTeamV3714 = typeof selectSeasonTeam === "function" ? selectSeasonTeam : null;
var selectSeasonTeam = function selectSeasonTeam(team){
  selectedSeasonTeam = team;

  const box = $("selectedTeamBox");

  if(box){
    box.classList.add("active");
    box.innerHTML = `
      <img src="${team.badge || ""}" onerror="this.style.display='none'">
      <div>
        <strong>${escapeHtml(team.name || "-")}</strong>
        <small>${escapeHtml(team.league || "-")}</small>
      </div>
    `;
  }

  renderCompetitionSuggestions(team);
}



// ===== V3.7.15 FIX SALVAR EDIÇÃO DE TEMPORADA =====
var getCurrentSelectedCompetitionsFromModal = function getCurrentSelectedCompetitionsFromModal(){
  const checked = getSelectedSeasonCompetitions ? getSelectedSeasonCompetitions() : [];
  return [...new Set(checked.filter(Boolean))];
}

var saveSeasonFlow = async function saveSeasonFlow(data, button, existing=null){
  if(!active.carreira_id) throw new Error("Selecione ou crie uma carreira antes.");
  if(!active.protagonista_id) throw new Error("Selecione ou crie um protagonista antes.");
  if(!selectedSeasonTeam) throw new Error("Selecione um time pela busca da API.");

  const temporada = data.temporada || monthYearToSeason(data.data_inicio);

  if(!temporada) throw new Error("Informe o início no time ou a temporada.");

  // CORREÇÃO: sempre pega o que está marcado AGORA no modal.
  const comps = getCurrentSelectedCompetitionsFromModal();

  if(!comps.length) throw new Error("Selecione pelo menos uma competição.");

  setButtonSaving(button);
  setStatus("Salvando edição da temporada...");

  let clube = getTable("CLUBES").find(c =>
    sameScope(c.nome, selectedSeasonTeam.name) ||
    String(c.nome || "").toLowerCase() === String(selectedSeasonTeam.name || "").toLowerCase()
  );

  if(!clube){
    const clubeJson = await apiPost({
      action:"create",
      table:"CLUBES",
      record:{
        nome:selectedSeasonTeam.name,
        pais:selectedSeasonTeam.country || "",
        escudo:selectedSeasonTeam.badge || "",
        estadio:""
      }
    });

    if(!clubeJson.ok) throw new Error(clubeJson.error || "Erro ao criar clube.");
    clube = clubeJson.data;
  }

  const seasonRecord = {
    carreira_id:active.carreira_id,
    temporada_base_id: existing?.temporada_base_id || "",
    temporada,
    ordem_na_carreira: existing?.ordem_na_carreira || "",
    clube_id:clube.id,
    clube_nome:selectedSeasonTeam.name,
    escudo:selectedSeasonTeam.badge || clube.escudo || "",
    liga:selectedSeasonTeam.league || existing?.liga || "",
    competicoes:comps.join(", "),
    status:data.status || existing?.status || "em andamento",
    data_inicio:data.data_inicio || "",
    data_fim:data.data_fim || ""
  };

  const seasonPayload = existing
    ? {action:"update", table:"CARREIRA_TEMPORADAS", id:existing.id, record:seasonRecord}
    : {action:"create", table:"CARREIRA_TEMPORADAS", record:seasonRecord};

  const tempJson = await apiPost(seasonPayload);
  if(!tempJson.ok) throw new Error(tempJson.error || "Erro ao salvar passagem.");

  const savedSeason = tempJson.data || existing || {};
  const carreiraTemporadaId = savedSeason.id || existing?.id;
  if(!carreiraTemporadaId) throw new Error("Não consegui identificar o ID da temporada salva.");

  const oldStatsAll = getTable("ESTATISTICAS_CARREIRA").filter(s =>
    String(s.carreira_temporada_id) === String(carreiraTemporadaId) &&
    String(s.personagem_id) === String(active.protagonista_id)
  );

  // Remove estatísticas de competições desmarcadas.
  for(const old of oldStatsAll){
    const oldComp = old.competicao || compName(old.competicao_id) || "";
    if(oldComp && !comps.some(c=>sameScope(c, oldComp))){
      try{
        await apiPost({action:"delete", table:"ESTATISTICAS_CARREIRA", id:old.id});
      }catch(err){
        console.warn("Não consegui apagar estatística removida:", oldComp, err);
      }
    }
  }

  for(const compNameText of comps){
    let comp = getTable("COMPETICOES").find(c => sameScope(c.nome, compNameText));

    if(!comp){
      const compJson = await apiPost({
        action:"create",
        table:"COMPETICOES",
        record:{nome:compNameText}
      });

      if(!compJson.ok) throw new Error(compJson.error || "Erro ao criar competição.");
      comp = compJson.data;
    }

    const key = escapeName(compNameText);
    const oldStats = oldStatsAll.find(s => sameScope(s.competicao || compName(s.competicao_id), compNameText));

    const statRecord = {
      carreira_id:active.carreira_id,
      carreira_temporada_id:carreiraTemporadaId,
      personagem_id:active.protagonista_id,
      competicao_id:comp.id,
      competicao:compNameText,
      jogos:data[`jogos_${key}`] || "",
      gols:data[`gols_${key}`] || "",
      assistencias:data[`assistencias_${key}`] || "",
      cartoes:data[`cartoes_${key}`] || "",
      nota_geral:data[`media_geral_${key}`] || "",
      clube_id:clube.id,
      clube_nome:selectedSeasonTeam.name
    };

    const statPayload = oldStats
      ? {action:"update", table:"ESTATISTICAS_CARREIRA", id:oldStats.id, record:statRecord}
      : {action:"create", table:"ESTATISTICAS_CARREIRA", record:statRecord};

    const statJson = await apiPost(statPayload);
    if(!statJson.ok) throw new Error(statJson.error || "Erro ao salvar estatística de " + compNameText);
  }

  active.temporada = temporada;
  saveActive();

  return {id:carreiraTemporadaId, temporada, competicoes:comps};
}

var saveSeasonTitlesFlow = async function saveSeasonTitlesFlow(data, existing=null){
  // CORREÇÃO: sempre usa os checks atuais, não o estado antigo do modal.
  const comps = getCurrentSelectedCompetitionsFromModal();
  if(!comps.length) return;

  const temporada = data.temporada || monthYearToSeason(data.data_inicio);

  const seasonRecord = existing || getCareerSeasonRecords()
    .filter(s=>String(s.carreira_id)===String(active.carreira_id))
    .sort((a,b)=>num(b.id)-num(a.id))
    .find(s =>
      String(s.temporada)===String(temporada) &&
      sameScope(s.clube_nome, selectedSeasonTeam?.name)
    );

  const carreiraTemporadaId = existing?.id || seasonRecord?.id || "";
  if(!carreiraTemporadaId) return;

  const oldTitlesAll = getTable("CAMPEOES_CARREIRA").filter(t =>
    String(t.carreira_temporada_id) === String(carreiraTemporadaId)
  );

  // Apaga registros de título de competições que foram desmarcadas.
  for(const old of oldTitlesAll){
    const oldComp = old.competicao || compName(old.competicao_id) || "";
    if(oldComp && !comps.some(c=>sameScope(c, oldComp))){
      try{
        await apiPost({action:"delete", table:"CAMPEOES_CARREIRA", id:old.id});
      }catch(err){
        console.warn("Não consegui apagar título removido:", oldComp, err);
      }
    }
  }

  for(const comp of comps){
    const key = escapeName(comp);
    const won = !!data[`titulo_${key}`];

    const campeao = data[`campeao_${key}`] || (won ? selectedSeasonTeam.name : "");
    const artilheiro = data[`artilheiro_${key}`] || "";
    const assist = data[`assist_${key}`] || "";
    const melhor = data[`melhor_${key}`] || "";

    const old = oldTitlesAll.find(t => sameScope(t.competicao || compName(t.competicao_id), comp));

    // Se existe registro antigo e agora está tudo vazio, remove.
    if(old && !won && !campeao && !artilheiro && !assist && !melhor){
      await apiPost({action:"delete", table:"CAMPEOES_CARREIRA", id:old.id});
      continue;
    }

    if(!won && !campeao && !artilheiro && !assist && !melhor) continue;

    let compObj = getTable("COMPETICOES").find(c=>sameScope(c.nome, comp));

    if(!compObj){
      const compJson = await apiPost({action:"create", table:"COMPETICOES", record:{nome:comp}});
      if(compJson.ok) compObj = compJson.data;
    }

    const record = {
      carreira_id: active.carreira_id,
      carreira_temporada_id: carreiraTemporadaId,
      temporada,
      competicao_id: compObj?.id || "",
      competicao: comp,
      clube: campeao,
      campeao: campeao,
      artilheiro,
      lider_assistencias: assist,
      melhor_jogador: melhor,
      status: won ? "titulo_ganho" : "registro_geral"
    };

    const payload = old
      ? {action:"update", table:"CAMPEOES_CARREIRA", id:old.id, record}
      : {action:"create", table:"CAMPEOES_CARREIRA", record};

    const res = await apiPost(payload);
    if(!res.ok) throw new Error(res.error || "Erro ao salvar título/campeão de " + comp);
  }
}



// ===== V3.7.16 BOLA DE OURO: CLUBE DO JOGADOR =====
var getBallonRowClub = function getBallonRowClub(row){
  return row.clube || row.club || row.time || row.equipe || "";
}

var getClubOptionsForSelect = function getClubOptionsForSelect(selected=""){
  const clubs = getTable("CLUBES");
  const unique = [];
  const seen = new Set();

  clubs.forEach(c=>{
    const name = c.nome || "";
    if(!name) return;
    const key = normalizeClubKey(name);
    if(seen.has(key)) return;
    seen.add(key);
    unique.push({nome:name, escudo:c.escudo || ""});
  });

  return `
    <option value="">Selecione ou digite manualmente</option>
    ${unique.map(c=>`<option value="${escapeAttr(c.nome)}" ${sameScope(c.nome, selected) ? "selected" : ""}>${escapeHtml(c.nome)}</option>`).join("")}
  `;
}

var syncClubManualFromSelect = function syncClubManualFromSelect(){
  const sel = $("ballonClubSelect");
  const input = $("ballonClubManual");
  if(sel && input && sel.value){
    input.value = sel.value;
  }
}

var getBallonClubFromForm = function getBallonClubFromForm(data){
  return data.clube || data.club || data.time || "";
}

var renderBallonPlayerCell = function renderBallonPlayerCell(row, sourceLabel=""){
  const badge = clubBadgeForBallon(row);
  const name = row.jogador || row.player || "-";
  const club = getBallonRowClub(row);
  return `
    <span class="ballon-player-cell">
      <span class="ballon-player-name">${escapeHtml(name)}</span>
      ${badge ? `<img class="ballon-club-badge" src="${escapeAttr(badge)}" title="${escapeAttr(club)}" onerror="this.remove()">` : ""}
      ${sourceLabel ? `<em class="source-pill">${escapeHtml(sourceLabel)}</em>` : ""}
    </span>
  `;
}

// Reforça badge: usa coluna H/clube da base e campo clube dos rankings criados.
var clubBadgeForBallon = function clubBadgeForBallon(row){
  const raw = getBallonRowClub(row);
  if(!raw) return "";

  const firstClub = String(raw).split("/")[0].split(",")[0].trim();
  const allClubs = getTable("CLUBES");

  const fromDb = allClubs.find(c =>
    sameScope(c.nome, firstClub) ||
    sameScope(c.nome, raw) ||
    sameScope(firstClub, c.nome)
  );

  return (fromDb && fromDb.escudo) ? fromDb.escudo : clubBadgeStatic(firstClub || raw);
}

// Abre/edita ranking da carreira com campo clube.
var openBallonRankingForm = function openBallonRankingForm(existingId=null){
  const carreira = getActiveCareer();
  if(!carreira){
    alert("Selecione uma carreira antes.");
    return;
  }

  const existing = existingId
    ? getTable("BOLA_DE_OURO_CARREIRA").find(r=>String(r.id)===String(existingId))
    : null;

  const temporadaAtual = active.temporada || getCurrentSeason(getProtagonistStats()) || "";
  const selectedClub = getBallonRowClub(existing || {});

  modalTitle.textContent = existing ? "Editar ranking Bola de Ouro" : "Adicionar ranking Bola de Ouro";
  modalBox.classList.add("wide");
  form.className = "form-grid";

  form.innerHTML = `
    <div class="form-field">
      <label>Temporada</label>
      <input name="temporada" value="${escapeAttr(existing?.temporada || temporadaAtual)}" placeholder="Ex: 2027/2028">
    </div>

    <div class="form-field">
      <label>Ano</label>
      <input name="ano" type="number" value="${escapeAttr(existing?.ano || extractYearFromSeason(existing?.temporada || temporadaAtual))}" placeholder="Ex: 2028">
    </div>

    <div class="form-field">
      <label>Posição</label>
      <input name="posicao" type="number" min="1" max="10" value="${escapeAttr(existing?.posicao || "")}" placeholder="1 a 10">
    </div>

    <div class="form-field">
      <label>Jogador</label>
      <input name="jogador" value="${escapeAttr(existing?.jogador || "")}" placeholder="Nome do jogador">
    </div>

    <div class="form-field">
      <label>País</label>
      <input name="pais" value="${escapeAttr(existing?.pais || "")}" placeholder="Ex: Brasil">
    </div>

    <div class="form-field">
      <label>Clube</label>
      <select id="ballonClubSelect" onchange="syncClubManualFromSelect()">
        ${getClubOptionsForSelect(selectedClub)}
      </select>
    </div>

    <div class="form-field">
      <label>Clube manual</label>
      <input id="ballonClubManual" name="clube" value="${escapeAttr(selectedClub)}" placeholder="Ex: AC Milan">
    </div>

    <div class="form-field">
      <label>Idade</label>
      <input name="idade_na_premiacao" type="number" value="${escapeAttr(existing?.idade_na_premiacao || existing?.idade || "")}">
    </div>

    <div class="form-field">
      <label>Valor de mercado</label>
      <input name="valor_mercado" value="${escapeAttr(existing?.valor_mercado || existing?.valor || "")}" placeholder="Ex: €90M">
    </div>

    <div class="form-field full">
      <label>Imagem URL</label>
      <input name="imagem_url" value="${escapeAttr(existing?.imagem_url || "")}" placeholder="URL de imagem de fundo">
    </div>

    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">${existing ? "Salvar edição" : "Salvar ranking"}</button>
    </div>
  `;

  form.onsubmit = async e=>{
    e.preventDefault();

    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      const record = {
        carreira_id: active.carreira_id,
        temporada: data.temporada || "",
        ano: data.ano || extractYearFromSeason(data.temporada || ""),
        posicao: data.posicao || "",
        jogador: data.jogador || "",
        pais: data.pais || "",
        clube: data.clube || "",
        idade_na_premiacao: data.idade_na_premiacao || "",
        valor_mercado: data.valor_mercado || "",
        imagem_url: data.imagem_url || ""
      };

      const payload = existing
        ? {action:"update", table:"BOLA_DE_OURO_CARREIRA", id:existing.id, record}
        : {action:"create", table:"BOLA_DE_OURO_CARREIRA", record};

      const res = await apiPost(payload);
      if(!res.ok) throw new Error(res.error || "Erro ao salvar ranking.");

      closeModal();
      await loadData();
      setStatus("Ranking salvo com clube do jogador.","ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar ranking: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

var extractYearFromSeason = function extractYearFromSeason(season){
  const nums = String(season || "").match(/\d{4}/g);
  if(!nums || !nums.length) return "";
  return nums.length > 1 ? nums[1] : nums[0];
}

// Compatibilidade com nomes antigos de função/botão.
var openBallonForm = function openBallonForm(id=null){ openBallonRankingForm(id); }
var openBolaOuroForm = function openBolaOuroForm(id=null){ openBallonRankingForm(id); }
var editBallonRanking = function editBallonRanking(id){ openBallonRankingForm(id); }
var editBolaOuroRanking = function editBolaOuroRanking(id){ openBallonRankingForm(id); }

window.openBallonRankingForm = openBallonRankingForm;
window.openBallonForm = openBallonForm;
window.openBolaOuroForm = openBolaOuroForm;
window.editBallonRanking = editBallonRanking;
window.editBolaOuroRanking = editBolaOuroRanking;
window.syncClubManualFromSelect = syncClubManualFromSelect;



// ===== V3.7.17 BOLA DE OURO: NOVO RANKING LIMPO + CLUBE EM LOTE =====
var getBallonAvailableSeasons = function getBallonAvailableSeasons(){
  const base = getTable("TEMPORADAS_BASE").map(t=>t.temporada).filter(Boolean);
  const career = getTable("CARREIRA_TEMPORADAS")
    .filter(t=>!active.carreira_id || String(t.carreira_id)===String(active.carreira_id))
    .map(t=>t.temporada)
    .filter(Boolean);

  const careerBallon = getTable("BOLA_DE_OURO_CARREIRA")
    .filter(r=>!active.carreira_id || String(r.carreira_id)===String(active.carreira_id))
    .map(r=>r.temporada)
    .filter(Boolean);

  return [...new Set([...career, ...careerBallon, ...base])]
    .sort((a,b)=>compareSeasonsDesc(a,b));
}

var openBallonBatchForm = function openBallonBatchForm(options={}){
  const carreira = getActiveCareer();

  if(!carreira){
    alert("Selecione uma carreira antes.");
    return;
  }

  const editSeason = options.editSeason || "";
  const isEdit = !!options.editExisting;

  // CORREÇÃO PRINCIPAL:
  // +Ranking abre limpo. Só carrega ranking antigo quando chamar explicitamente como edição.
  const initialSeason = editSeason || active.temporada || getCurrentSeason(getProtagonistStats()) || "";
  const existingRows = isEdit && initialSeason
    ? getTable("BOLA_DE_OURO_CARREIRA")
        .filter(r=>String(r.carreira_id)===String(active.carreira_id) && String(r.temporada)===String(initialSeason))
    : [];

  const byPos = {};
  existingRows.forEach(r=>{
    byPos[String(r.posicao)] = r;
  });

  const seasons = getBallonAvailableSeasons();
  if(initialSeason && !seasons.includes(initialSeason)) seasons.unshift(initialSeason);

  modalTitle.textContent = isEdit ? "Editar ranking Bola de Ouro" : "Novo ranking Bola de Ouro";
  modalBox.classList.add("wide");
  modalBox.classList.add("ballon-rank-modal");
  form.className = "ballon-batch-form";

  const imageUrl = existingRows.find(r=>r.imagem_url)?.imagem_url || "";

  form.innerHTML = `
    <div class="form-field full">
      <label>Temporada</label>
      <select name="temporada" id="ballonBatchSeason">
        ${seasons.map(s=>`<option value="${escapeAttr(s)}" ${s===initialSeason?"selected":""}>${escapeHtml(s)}</option>`).join("")}
      </select>
    </div>

    <div class="form-field full">
      <label>Imagem do vencedor</label>
      <div class="file-row">
        <input name="imagem_url" value="${escapeAttr(imageUrl)}" placeholder="URL da imagem de fundo do vencedor">
        <button type="button" class="upload-btn" onclick="triggerUpload('imagem_url')">Importar</button>
      </div>
      <input type="file" id="file_imagem_url" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadToCloudinary(event,'imagem_url')">
    </div>

    <div class="ballon-rank-grid ballon-rank-grid-with-club">
      <div class="ballon-rank-head">#</div>
      <div class="ballon-rank-head">Jogador</div>
      <div class="ballon-rank-head">País</div>
      <div class="ballon-rank-head">Clube</div>
      <div class="ballon-rank-head">Idade</div>
      <div class="ballon-rank-head">Valor</div>

      ${Array.from({length:10},(_,i)=>{
        const pos = i+1;
        const old = byPos[String(pos)] || {};
        return `
          <div class="ballon-rank-pos">${pos}</div>
          <input name="jogador_${pos}" value="${escapeAttr(old.jogador || "")}" placeholder="Jogador">
          <input name="pais_${pos}" value="${escapeAttr(old.pais || "")}" placeholder="País, código ou emoji">
          <input name="clube_${pos}" value="${escapeAttr(old.clube || old.club || old.time || "")}" placeholder="Clube">
          <input name="idade_${pos}" type="number" value="${escapeAttr(old.idade_na_premiacao || old.idade || "")}" placeholder="Idade">
          <input name="valor_${pos}" value="${escapeAttr(old.valor_mercado || old.valor || "")}" placeholder="Ex: €90M">
        `;
      }).join("")}
    </div>

    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">${isEdit ? "Salvar edição" : "Salvar novo ranking"}</button>
    </div>
  `;

  form.onsubmit = async e=>{
    e.preventDefault();

    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      const temporada = data.temporada || "";
      const ano = extractYearFromSeason(temporada);

      if(!temporada) throw new Error("Selecione uma temporada.");

      // Se for edição explícita, atualiza linhas antigas daquela temporada.
      // Se for novo, NÃO apaga nem sobrescreve ranking antigo.
      const oldRows = isEdit
        ? getTable("BOLA_DE_OURO_CARREIRA").filter(r=>String(r.carreira_id)===String(active.carreira_id) && String(r.temporada)===String(temporada))
        : [];

      for(let pos=1; pos<=10; pos++){
        const jogador = data[`jogador_${pos}`] || "";
        const pais = data[`pais_${pos}`] || "";
        const clube = data[`clube_${pos}`] || "";
        const idade = data[`idade_${pos}`] || "";
        const valor = data[`valor_${pos}`] || "";

        if(!jogador && !pais && !clube && !idade && !valor) continue;

        const existing = oldRows.find(r=>String(r.posicao)===String(pos));

        const record = {
          carreira_id: active.carreira_id,
          temporada,
          ano,
          posicao: pos,
          jogador,
          pais,
          clube,
          idade_na_premiacao: idade,
          valor_mercado: valor,
          imagem_url: pos === 1 ? (data.imagem_url || "") : ""
        };

        const payload = existing
          ? {action:"update", table:"BOLA_DE_OURO_CARREIRA", id:existing.id, record}
          : {action:"create", table:"BOLA_DE_OURO_CARREIRA", record};

        const res = await apiPost(payload);
        if(!res.ok) throw new Error(res.error || "Erro ao salvar posição " + pos);
      }

      closeModal();
      await loadData();
      setStatus(isEdit ? "Ranking atualizado com sucesso." : "Novo ranking criado com sucesso.", "ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar ranking: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

var openNewBallonRanking = function openNewBallonRanking(){
  openBallonBatchForm({editExisting:false});
}

var openEditBallonRankingSeason = function openEditBallonRankingSeason(season){
  openBallonBatchForm({editExisting:true, editSeason:season});
}

// Compatibilidade com botões antigos.
var openBallonRankingForm = function openBallonRankingForm(id=null){
  if(id){
    return openBallonFormSingle(id);
  }
  return openNewBallonRanking();
}

var openBolaOuroRankingForm = function openBolaOuroRankingForm(id=null){
  return openBallonRankingForm(id);
}

// Formulário individual antigo preservado como fallback para botão editar de uma linha.
var openBallonFormSingle = function openBallonFormSingle(existingId=null){
  const existing = existingId
    ? getTable("BOLA_DE_OURO_CARREIRA").find(r=>String(r.id)===String(existingId))
    : null;

  if(!existing){
    return openNewBallonRanking();
  }

  modalTitle.textContent = "Editar jogador do ranking";
  modalBox.classList.add("wide");
  form.className = "form-grid";

  const selectedClub = getBallonRowClub(existing || {});

  form.innerHTML = `
    <div class="form-field">
      <label>Temporada</label>
      <input name="temporada" value="${escapeAttr(existing.temporada || "")}">
    </div>

    <div class="form-field">
      <label>Posição</label>
      <input name="posicao" type="number" min="1" max="10" value="${escapeAttr(existing.posicao || "")}">
    </div>

    <div class="form-field">
      <label>Jogador</label>
      <input name="jogador" value="${escapeAttr(existing.jogador || "")}">
    </div>

    <div class="form-field">
      <label>País</label>
      <input name="pais" value="${escapeAttr(existing.pais || "")}">
    </div>

    <div class="form-field">
      <label>Clube</label>
      <input name="clube" value="${escapeAttr(selectedClub)}" placeholder="Ex: Barcelona">
    </div>

    <div class="form-field">
      <label>Idade</label>
      <input name="idade_na_premiacao" type="number" value="${escapeAttr(existing.idade_na_premiacao || existing.idade || "")}">
    </div>

    <div class="form-field">
      <label>Valor de mercado</label>
      <input name="valor_mercado" value="${escapeAttr(existing.valor_mercado || existing.valor || "")}">
    </div>

    <div class="form-field full">
      <label>Imagem URL</label>
      <input name="imagem_url" value="${escapeAttr(existing.imagem_url || "")}">
    </div>

    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">Salvar edição</button>
    </div>
  `;

  form.onsubmit = async e=>{
    e.preventDefault();
    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      const record = {
        carreira_id: active.carreira_id,
        temporada: data.temporada || "",
        ano: extractYearFromSeason(data.temporada || ""),
        posicao: data.posicao || "",
        jogador: data.jogador || "",
        pais: data.pais || "",
        clube: data.clube || "",
        idade_na_premiacao: data.idade_na_premiacao || "",
        valor_mercado: data.valor_mercado || "",
        imagem_url: data.imagem_url || ""
      };

      const res = await apiPost({action:"update", table:"BOLA_DE_OURO_CARREIRA", id:existing.id, record});
      if(!res.ok) throw new Error(res.error || "Erro ao salvar.");

      closeModal();
      await loadData();
      setStatus("Jogador do ranking atualizado.", "ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar jogador: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

window.openBallonBatchForm = openBallonBatchForm;
window.openNewBallonRanking = openNewBallonRanking;
window.openEditBallonRankingSeason = openEditBallonRankingSeason;
window.openBallonRankingForm = openBallonRankingForm;
window.openBolaOuroRankingForm = openBolaOuroRankingForm;
window.openBallonFormSingle = openBallonFormSingle;



// ===== V3.7.18 BOLA_DE_OURO_CARREIRA CLUBE COLUNA L =====
// A ordem da aba é:
// id, carreira_id, temporada, ano, posicao, jogador, pais,
// idade_na_premiacao, valor_mercado, imagem_url, observacao, clube

var normalizeBallonCareerRecord = function normalizeBallonCareerRecord(record){
  return {
    carreira_id: record.carreira_id || active.carreira_id || "",
    temporada: record.temporada || "",
    ano: record.ano || extractYearFromSeason(record.temporada || ""),
    posicao: record.posicao || "",
    jogador: record.jogador || "",
    pais: record.pais || "",
    idade_na_premiacao: record.idade_na_premiacao || record.idade || "",
    valor_mercado: record.valor_mercado || record.valor || "",
    imagem_url: record.imagem_url || "",
    observacao: record.observacao || "",
    clube: record.clube || record.club || record.time || ""
  };
}

var getBallonRowClub = function getBallonRowClub(row){
  return row.clube || row.club || row.time || row.equipe || "";
}

// Reaplica salvamento em lote com clube na propriedade final `clube`.
var openBallonBatchForm = function openBallonBatchForm(options={}){
  const carreira = getActiveCareer();

  if(!carreira){
    alert("Selecione uma carreira antes.");
    return;
  }

  const editSeason = options.editSeason || "";
  const isEdit = !!options.editExisting;

  const initialSeason = editSeason || active.temporada || getCurrentSeason(getProtagonistStats()) || "";
  const existingRows = isEdit && initialSeason
    ? getTable("BOLA_DE_OURO_CARREIRA")
        .filter(r=>String(r.carreira_id)===String(active.carreira_id) && String(r.temporada)===String(initialSeason))
    : [];

  const byPos = {};
  existingRows.forEach(r=>{
    byPos[String(r.posicao)] = r;
  });

  const seasons = getBallonAvailableSeasons();
  if(initialSeason && !seasons.includes(initialSeason)) seasons.unshift(initialSeason);

  modalTitle.textContent = isEdit ? "Editar ranking Bola de Ouro" : "Novo ranking Bola de Ouro";
  modalBox.classList.add("wide");
  modalBox.classList.add("ballon-rank-modal");
  form.className = "ballon-batch-form";

  const imageUrl = existingRows.find(r=>r.imagem_url)?.imagem_url || "";

  form.innerHTML = `
    <div class="form-field full">
      <label>Temporada</label>
      <select name="temporada" id="ballonBatchSeason">
        ${seasons.map(s=>`<option value="${escapeAttr(s)}" ${s===initialSeason?"selected":""}>${escapeHtml(s)}</option>`).join("")}
      </select>
    </div>

    <div class="form-field full">
      <label>Imagem do vencedor</label>
      <div class="file-row">
        <input name="imagem_url" value="${escapeAttr(imageUrl)}" placeholder="URL da imagem de fundo do vencedor">
        <button type="button" class="upload-btn" onclick="triggerUpload('imagem_url')">Importar</button>
      </div>
      <input type="file" id="file_imagem_url" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadToCloudinary(event,'imagem_url')">
    </div>

    <div class="ballon-rank-grid ballon-rank-grid-with-club">
      <div class="ballon-rank-head">#</div>
      <div class="ballon-rank-head">Jogador</div>
      <div class="ballon-rank-head">País</div>
      <div class="ballon-rank-head">Clube</div>
      <div class="ballon-rank-head">Idade</div>
      <div class="ballon-rank-head">Valor</div>

      ${Array.from({length:10},(_,i)=>{
        const pos = i+1;
        const old = byPos[String(pos)] || {};
        return `
          <div class="ballon-rank-pos">${pos}</div>
          <input name="jogador_${pos}" value="${escapeAttr(old.jogador || "")}" placeholder="Jogador">
          <input name="pais_${pos}" value="${escapeAttr(old.pais || "")}" placeholder="País, código ou emoji">
          <input name="clube_${pos}" value="${escapeAttr(getBallonRowClub(old))}" placeholder="Clube">
          <input name="idade_${pos}" type="number" value="${escapeAttr(old.idade_na_premiacao || old.idade || "")}" placeholder="Idade">
          <input name="valor_${pos}" value="${escapeAttr(old.valor_mercado || old.valor || "")}" placeholder="Ex: €90M">
        `;
      }).join("")}
    </div>

    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">${isEdit ? "Salvar edição" : "Salvar novo ranking"}</button>
    </div>
  `;

  form.onsubmit = async e=>{
    e.preventDefault();

    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      const temporada = data.temporada || "";
      const ano = extractYearFromSeason(temporada);

      if(!temporada) throw new Error("Selecione uma temporada.");

      const oldRows = isEdit
        ? getTable("BOLA_DE_OURO_CARREIRA").filter(r=>String(r.carreira_id)===String(active.carreira_id) && String(r.temporada)===String(temporada))
        : [];

      for(let pos=1; pos<=10; pos++){
        const raw = {
          carreira_id: active.carreira_id,
          temporada,
          ano,
          posicao: pos,
          jogador: data[`jogador_${pos}`] || "",
          pais: data[`pais_${pos}`] || "",
          idade_na_premiacao: data[`idade_${pos}`] || "",
          valor_mercado: data[`valor_${pos}`] || "",
          imagem_url: pos === 1 ? (data.imagem_url || "") : "",
          observacao: "",
          clube: data[`clube_${pos}`] || ""
        };

        if(!raw.jogador && !raw.pais && !raw.clube && !raw.idade_na_premiacao && !raw.valor_mercado) continue;

        const record = normalizeBallonCareerRecord(raw);
        const existing = oldRows.find(r=>String(r.posicao)===String(pos));

        const payload = existing
          ? {action:"update", table:"BOLA_DE_OURO_CARREIRA", id:existing.id, record}
          : {action:"create", table:"BOLA_DE_OURO_CARREIRA", record};

        const res = await apiPost(payload);
        if(!res.ok) throw new Error(res.error || "Erro ao salvar posição " + pos);
      }

      closeModal();
      await loadData();
      setStatus(isEdit ? "Ranking atualizado com clube na coluna L." : "Novo ranking criado com clube na coluna L.", "ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar ranking: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

var openBallonFormSingle = function openBallonFormSingle(existingId=null){
  const existing = existingId
    ? getTable("BOLA_DE_OURO_CARREIRA").find(r=>String(r.id)===String(existingId))
    : null;

  if(!existing){
    return openNewBallonRanking();
  }

  modalTitle.textContent = "Editar jogador do ranking";
  modalBox.classList.add("wide");
  form.className = "form-grid";

  form.innerHTML = `
    <div class="form-field">
      <label>Temporada</label>
      <input name="temporada" value="${escapeAttr(existing.temporada || "")}">
    </div>

    <div class="form-field">
      <label>Posição</label>
      <input name="posicao" type="number" min="1" max="10" value="${escapeAttr(existing.posicao || "")}">
    </div>

    <div class="form-field">
      <label>Jogador</label>
      <input name="jogador" value="${escapeAttr(existing.jogador || "")}">
    </div>

    <div class="form-field">
      <label>País</label>
      <input name="pais" value="${escapeAttr(existing.pais || "")}">
    </div>

    <div class="form-field">
      <label>Idade</label>
      <input name="idade_na_premiacao" type="number" value="${escapeAttr(existing.idade_na_premiacao || existing.idade || "")}">
    </div>

    <div class="form-field">
      <label>Valor de mercado</label>
      <input name="valor_mercado" value="${escapeAttr(existing.valor_mercado || existing.valor || "")}">
    </div>

    <div class="form-field">
      <label>Clube</label>
      <input name="clube" value="${escapeAttr(getBallonRowClub(existing))}" placeholder="Ex: Barcelona">
    </div>

    <div class="form-field full">
      <label>Imagem URL</label>
      <input name="imagem_url" value="${escapeAttr(existing.imagem_url || "")}">
    </div>

    <div class="form-field full">
      <label>Observação</label>
      <input name="observacao" value="${escapeAttr(existing.observacao || "")}">
    </div>

    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">Salvar edição</button>
    </div>
  `;

  form.onsubmit = async e=>{
    e.preventDefault();
    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      const record = normalizeBallonCareerRecord({
        carreira_id: active.carreira_id,
        temporada: data.temporada || "",
        ano: extractYearFromSeason(data.temporada || ""),
        posicao: data.posicao || "",
        jogador: data.jogador || "",
        pais: data.pais || "",
        idade_na_premiacao: data.idade_na_premiacao || "",
        valor_mercado: data.valor_mercado || "",
        imagem_url: data.imagem_url || "",
        observacao: data.observacao || "",
        clube: data.clube || ""
      });

      const res = await apiPost({action:"update", table:"BOLA_DE_OURO_CARREIRA", id:existing.id, record});
      if(!res.ok) throw new Error(res.error || "Erro ao salvar.");

      closeModal();
      await loadData();
      setStatus("Jogador do ranking atualizado.", "ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar jogador: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}



// ===== V3.7.31 CLEAN NO RECURSION =====
// Versão de limpeza: sem summary, sem lazy load, sem wrapper em navigate/renderPageById/openSeasonFlow.
// Carrega action=all direto para eliminar Maximum call stack size exceeded.

var normalizeDbAfterLoad = function normalizeDbAfterLoad(){
  if(!db || typeof db !== "object") db = {};
  Object.keys(db).forEach(k=>{
    if(!Array.isArray(db[k])) db[k] = [];
  });
}

var fetchAllFromSheetsClean = async function fetchAllFromSheetsClean(){
  const base = API_URL;
  const url = `${base}${base.includes("?") ? "&" : "?"}action=all&cache=${Date.now()}`;
  console.log("Football Legacy API action=all clean:", url);

  let data;

  if(API_URL.startsWith("/api/")){
    const res = await fetch(url, {cache:"no-store"});
    data = await res.json();
  }else{
    try{
      data = await fetchJsonp(`${API_URL}?action=all`);
    }catch(jsonpErr){
      console.warn("JSONP falhou, tentando fetch direto:", jsonpErr);
      const res = await fetch(url, {cache:"no-store"});
      data = await res.json();
    }
  }

  if(!data || !data.ok){
    throw new Error(data?.error || "Apps Script não retornou ok=true.");
  }

  return data.data || {};
}

var loadData = async function loadData(){
  setStatus("Carregando dados do Google Sheets...");

  try{
    const fresh = await fetchAllFromSheetsClean();
    db = fresh;
    normalizeDbAfterLoad();

    console.log("Football Legacy DB carregado clean:", {
      CARREIRA_TEMPORADAS:getTable("CARREIRA_TEMPORADAS").length,
      ESTATISTICAS_CARREIRA:getTable("ESTATISTICAS_CARREIRA").length,
      BOLA_DE_OURO_CARREIRA:getTable("BOLA_DE_OURO_CARREIRA").length,
      BOLA_DE_OURO_BASE:getTable("BOLA_DE_OURO_BASE").length,
      RECORDS_BASE:getTable("RECORDS_BASE").length
    });

    renderAll();
    setStatus("Dados carregados do Google Sheets com sucesso.", "ok");
  }catch(err){
    console.error("Erro ao carregar Google Sheets:", err);
    setStatus("Erro ao carregar Google Sheets: " + err.message, "error");
  }
}

var forceRefreshData = async function forceRefreshData(){
  await loadData();
}

// Bola de Ouro: usa ano inicial da temporada.
// 2025/2026 -> 2025.
var getAwardYearFromSeason = function getAwardYearFromSeason(value){
  const text = String(value || "");
  const years = text.match(/\d{4}/g);
  if(!years || !years.length) return "";
  return years[0];
}

var getCareerSeasonBallonOptions = function getCareerSeasonBallonOptions(){
  const rows = [];

  getTable("CARREIRA_TEMPORADAS")
    .filter(t=>!active.carreira_id || String(t.carreira_id)===String(active.carreira_id))
    .forEach(t=>{
      const season = t.temporada || "";
      const year = getAwardYearFromSeason(season);
      if(!year) return;
      rows.push({value:year, label:`${season} - ${year}`, season, year});
    });

  getTable("BOLA_DE_OURO_CARREIRA")
    .filter(r=>!active.carreira_id || String(r.carreira_id)===String(active.carreira_id))
    .forEach(r=>{
      const year = getAwardYearFromSeason(r.ano || r.temporada);
      if(!year) return;
      rows.push({value:year, label:`${year}`, season:String(r.temporada || year), year});
    });

  getTable("BOLA_DE_OURO_BASE").forEach(r=>{
    const year = getAwardYearFromSeason(r.ano || r.temporada);
    if(!year) return;
    rows.push({value:year, label:`${year}`, season:String(r.temporada || year), year});
  });

  const map = new Map();
  rows.forEach(o=>{
    if(!map.has(o.value) || o.label.includes("/")) map.set(o.value, o);
  });

  return [...map.values()].sort((a,b)=>Number(b.year)-Number(a.year));
}

var normalizeBallonCareerRecord = function normalizeBallonCareerRecord(record){
  const year = getAwardYearFromSeason(record.ano || record.temporada || "");
  return {
    carreira_id: record.carreira_id || active.carreira_id || "",
    temporada: year,
    ano: year,
    posicao: record.posicao || "",
    jogador: record.jogador || "",
    pais: record.pais || "",
    idade_na_premiacao: record.idade_na_premiacao || record.idade || "",
    valor_mercado: record.valor_mercado || record.valor || "",
    imagem_url: record.imagem_url || "",
    observacao: record.observacao || "",
    clube: record.clube || record.club || record.time || ""
  };
}

var syncLocalTableAfterSave = function syncLocalTableAfterSave(payload, res){
  try{
    if(!payload || !payload.table || !db) return;
    const table = payload.table;
    if(!Array.isArray(db[table])) db[table] = [];

    if(payload.action === "create"){
      const created = Object.assign({}, payload.record || {}, res?.data || {});
      if(!created.id) created.id = res?.data?.id || res?.id || ("local_" + Date.now() + "_" + Math.floor(Math.random()*9999));
      db[table].push(created);
    }

    if(payload.action === "update"){
      const id = String(payload.id || res?.data?.id || "");
      const updated = Object.assign({}, payload.record || {}, res?.data || {});
      if(id) updated.id = id;

      const idx = db[table].findIndex(r=>String(r.id)===String(updated.id));
      if(idx >= 0) db[table][idx] = Object.assign({}, db[table][idx], updated);
      else db[table].push(updated);
    }

    if(payload.action === "delete"){
      const id = String(payload.id || "");
      db[table] = db[table].filter(r=>String(r.id)!==id);
    }
  }catch(err){
    console.warn("Falha ao sincronizar local:", err);
  }
}

const __apiPostOriginalV3731 = typeof apiPost === "function" ? apiPost : null;
if(__apiPostOriginalV3731 && !window.__apiPostWrappedV3731){
  window.__apiPostWrappedV3731 = true;
  apiPost = async function(payload){
    const res = await __apiPostOriginalV3731(payload);
    if(res && res.ok) syncLocalTableAfterSave(payload, res);
    return res;
  };
}

var getBallonRowClub = function getBallonRowClub(row){
  return row.clube || row.club || row.time || row.equipe || "";
}

var openBallonBatchForm = function openBallonBatchForm(options={}){
  const carreira = getActiveCareer();

  if(!carreira){
    alert("Selecione uma carreira antes.");
    return;
  }

  const editYear = getAwardYearFromSeason(options.editSeason || options.editYear || "");
  const isEdit = !!options.editExisting;
  const activeYear = getAwardYearFromSeason(active.temporada || getCurrentSeason(getProtagonistStats()) || "");
  const initialYear = editYear || activeYear || String(new Date().getFullYear());

  const existingRows = isEdit && initialYear
    ? getTable("BOLA_DE_OURO_CARREIRA")
        .filter(r=>String(r.carreira_id)===String(active.carreira_id) && String(getAwardYearFromSeason(r.ano || r.temporada))===String(initialYear))
    : [];

  const byPos = {};
  existingRows.forEach(r=>{ byPos[String(r.posicao)] = r; });

  let optionsList = getCareerSeasonBallonOptions();
  if(initialYear && !optionsList.some(o=>String(o.value)===String(initialYear))){
    optionsList.unshift({value:initialYear,label:String(initialYear),year:initialYear});
  }

  modalTitle.textContent = isEdit ? "Editar ranking Bola de Ouro" : "Novo ranking Bola de Ouro";
  modalBox.classList.add("wide");
  modalBox.classList.add("ballon-rank-modal");
  form.className = "ballon-batch-form";

  const imageUrl = existingRows.find(r=>r.imagem_url)?.imagem_url || "";

  form.innerHTML = `
    <div class="form-field full">
      <label>Temporada / Ano da Bola de Ouro</label>
      <select name="ano_premiacao" id="ballonBatchSeason">
        ${optionsList.map(o=>`<option value="${escapeAttr(o.value)}" ${String(o.value)===String(initialYear)?"selected":""}>${escapeHtml(o.label)}</option>`).join("")}
      </select>
      <small class="field-help">Exemplo: 2025/2026 - 2025. Na planilha salva como 2025 para misturar com a base real.</small>
    </div>

    <div class="form-field full">
      <label>Imagem do vencedor</label>
      <div class="file-row">
        <input name="imagem_url" value="${escapeAttr(imageUrl)}" placeholder="URL da imagem de fundo do vencedor">
        <button type="button" class="upload-btn" onclick="triggerUpload('imagem_url')">Importar</button>
      </div>
      <input type="file" id="file_imagem_url" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadToCloudinary(event,'imagem_url')">
    </div>

    <div class="ballon-rank-grid ballon-rank-grid-with-club">
      <div class="ballon-rank-head">#</div>
      <div class="ballon-rank-head">Jogador</div>
      <div class="ballon-rank-head">País</div>
      <div class="ballon-rank-head">Clube</div>
      <div class="ballon-rank-head">Idade</div>
      <div class="ballon-rank-head">Valor</div>

      ${Array.from({length:10},(_,i)=>{
        const pos = i+1;
        const old = byPos[String(pos)] || {};
        return `
          <div class="ballon-rank-pos">${pos}</div>
          <input name="jogador_${pos}" value="${escapeAttr(old.jogador || "")}" placeholder="Jogador">
          <input name="pais_${pos}" value="${escapeAttr(old.pais || "")}" placeholder="País, código ou emoji">
          <input name="clube_${pos}" value="${escapeAttr(getBallonRowClub(old))}" placeholder="Clube">
          <input name="idade_${pos}" type="number" value="${escapeAttr(old.idade_na_premiacao || old.idade || "")}" placeholder="Idade">
          <input name="valor_${pos}" value="${escapeAttr(old.valor_mercado || old.valor || "")}" placeholder="Ex: €90M">
        `;
      }).join("")}
    </div>

    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">${isEdit ? "Salvar edição" : "Salvar novo ranking"}</button>
    </div>
  `;

  form.onsubmit = async e=>{
    e.preventDefault();
    const btn = $("saveBtn");
    if(btn && btn.disabled) return;
    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      const year = getAwardYearFromSeason(data.ano_premiacao);

      if(!year) throw new Error("Selecione o ano da Bola de Ouro.");

      const oldRows = isEdit
        ? getTable("BOLA_DE_OURO_CARREIRA").filter(r=>String(r.carreira_id)===String(active.carreira_id) && String(getAwardYearFromSeason(r.ano || r.temporada))===String(year))
        : [];

      for(let pos=1; pos<=10; pos++){
        const raw = {
          carreira_id: active.carreira_id,
          temporada: year,
          ano: year,
          posicao: pos,
          jogador: data[`jogador_${pos}`] || "",
          pais: data[`pais_${pos}`] || "",
          idade_na_premiacao: data[`idade_${pos}`] || "",
          valor_mercado: data[`valor_${pos}`] || "",
          imagem_url: pos === 1 ? (data.imagem_url || "") : "",
          observacao: "",
          clube: data[`clube_${pos}`] || ""
        };

        if(!raw.jogador && !raw.pais && !raw.clube && !raw.idade_na_premiacao && !raw.valor_mercado) continue;

        const record = normalizeBallonCareerRecord(raw);
        const existing = oldRows.find(r=>String(r.posicao)===String(pos));

        const payload = existing
          ? {action:"update", table:"BOLA_DE_OURO_CARREIRA", id:existing.id, record}
          : {action:"create", table:"BOLA_DE_OURO_CARREIRA", record};

        const res = await apiPost(payload);
        if(!res.ok) throw new Error(res.error || "Erro ao salvar posição " + pos);
      }

      clearButtonSaving(btn);
      closeModal();

      if(typeof renderBolaOuro === "function") renderBolaOuro();
      setStatus(`Ranking da Bola de Ouro ${year} salvo e exibido.`, "ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar ranking: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

var openNewBallonRanking = function openNewBallonRanking(){ openBallonBatchForm({editExisting:false}); }
var openEditBallonRankingSeason = function openEditBallonRankingSeason(season){ openBallonBatchForm({editExisting:true, editSeason:getAwardYearFromSeason(season)}); }

window.forceRefreshData = forceRefreshData;
window.getAwardYearFromSeason = getAwardYearFromSeason;
window.getCareerSeasonBallonOptions = getCareerSeasonBallonOptions;
window.openBallonBatchForm = openBallonBatchForm;
window.openNewBallonRanking = openNewBallonRanking;
window.openEditBallonRankingSeason = openEditBallonRankingSeason;

window.addEventListener("error", function(e){
  console.error("Football Legacy error:", e.error || e.message);
});

window.addEventListener("unhandledrejection", function(e){
  console.error("Football Legacy promise error:", e.reason);
});



// ===== V3.7.33 FIX TEMPORADA: SEM RECURSÃO E SEM SALVAR INFINITO =====
// Não mexe em Bola de Ouro, carregamento geral ou Apps Script.
// Corrige o fluxo de Adicionar/Editar Temporada.

var renderSeasonStatsRows = function renderSeasonStatsRows(existingStats=null){
  const wrap = $("seasonStatsRows");
  if(!wrap) return;

  const comps = getSelectedSeasonCompetitions();
  selectedCompetitionsForSeason = comps;

  if(!comps.length){
    wrap.innerHTML = `<div class="entity-card"><small>Selecione pelo menos uma competição.</small></div>`;
    if(typeof renderSeasonTitlesRows === "function") renderSeasonTitlesRows(window.__editingSeasonRecord || null);
    return;
  }

  const stats = existingStats || window.__editingSeasonStats || [];

  wrap.innerHTML = comps.map(comp=>{
    const old = stats.find(s=>
      String(s.competicao || compName(s.competicao_id) || "").toLowerCase() === String(comp).toLowerCase()
    ) || {};

    const key = escapeName(comp);

    return `
      <div class="season-stats-row">
        <strong>${escapeHtml(comp)}</strong>
        <input name="jogos_${key}" type="number" placeholder="Jogos" value="${escapeAttr(old.jogos || "")}">
        <input name="gols_${key}" type="number" placeholder="Gols" value="${escapeAttr(old.gols || "")}">
        <input name="assistencias_${key}" type="number" placeholder="Assist." value="${escapeAttr(old.assistencias || "")}">
        <input name="cartoes_${key}" type="number" placeholder="Cartões" value="${escapeAttr(old.cartoes || "")}">
        <input name="media_geral_${key}" type="number" step="0.1" placeholder="Nota" value="${escapeAttr(old.nota_geral || old.media_geral || "")}">
      </div>
    `;
  }).join("");

  // Atualiza títulos sem monkey patch/sem recursão.
  if(typeof renderSeasonTitlesRows === "function") renderSeasonTitlesRows(window.__editingSeasonRecord || null);
}

var renderCompetitionSuggestions = function renderCompetitionSuggestions(team, existingComps=[]){
  const wrap = $("seasonCompetitionChecks");
  if(!wrap) return;

  const suggested = typeof competitionSuggestions === "function" ? competitionSuggestions(team) : [];
  const comps = [...new Set([...suggested, ...existingComps].filter(Boolean))];

  wrap.innerHTML = comps.map((c,i)=>{
    const checked = existingComps.length ? existingComps.includes(c) : i===0;
    return `
      <label class="comp-check">
        <input type="checkbox" value="${escapeAttr(c)}" ${checked ? "checked" : ""} onchange="renderSeasonStatsRows()">
        ${escapeHtml(c)}
      </label>
    `;
  }).join("");

  renderSeasonStatsRows(window.__editingSeasonStats || null);
}

var unlockSeasonSaveButton = function unlockSeasonSaveButton(btn){
  try{
    if(!btn) btn = $("saveBtn");
    if(!btn) return;

    if(typeof clearButtonSaving === "function"){
      clearButtonSaving(btn);
    }else{
      btn.disabled = false;
      if(btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
      else btn.textContent = "Salvar";
    }
  }catch(err){}
}

var refreshAfterSeasonSaveInBackground = function refreshAfterSeasonSaveInBackground(){
  setTimeout(async ()=>{
    try{
      await loadData();
    }catch(err){
      console.warn("Temporada salva, mas atualização automática falhou:", err);
      setStatus("Temporada salva na planilha. Clique em Atualizar se ainda não aparecer.", "warn");
    }
  }, 100);
}

var openSeasonFlow = function openSeasonFlow(existingId=null){
  const carreira = getActiveCareer();
  const protagonista = getActiveProtagonist();

  if(!carreira){
    alert("Selecione ou crie uma carreira antes.");
    return;
  }

  if(!protagonista){
    alert("Selecione ou crie um protagonista antes.");
    return;
  }

  const existing = existingId
    ? getCareerSeasonRecords().find(t=>String(t.id)===String(existingId))
    : null;

  window.__editingSeasonRecord = existing || null;

  selectedSeasonTeam = existing ? {
    name: existing.clube_nome || "",
    league: existing.liga || "",
    country: "",
    badge: existing.escudo || "",
    api_id: ""
  } : null;

  selectedCompetitionsForSeason = existing ? getCompetitionsFromSeasonRecord(existing) : [];
  window.__editingSeasonStats = existing ? getSeasonStatsForRecord(existing) : [];

  modalTitle.textContent = existing ? "Editar temporada" : "Nova temporada";
  modalBox.classList.add("wide");
  form.className = "season-flow-form";

  const defaultSeason = existing?.temporada || (active.temporada || "");
  const defaultInicio = existing?.data_inicio || "";
  const defaultFim = existing?.data_fim || "";

  form.innerHTML = `
    <div class="season-flow">
      <div class="season-flow-grid">
        <div class="form-field">
          <label>Início no time</label>
          <input name="data_inicio" type="month" value="${escapeAttr(defaultInicio)}">
        </div>
        <div class="form-field">
          <label>Fim no time</label>
          <input name="data_fim" type="month" value="${escapeAttr(defaultFim)}">
        </div>
        <div class="form-field">
          <label>Temporada reconhecida</label>
          <input name="temporada" placeholder="Ex: 2025/2026" value="${escapeAttr(defaultSeason)}">
        </div>
        <div class="form-field">
          <label>Status</label>
          <select name="status">
            <option value="em andamento" ${existing?.status==="em andamento"?"selected":""}>Em andamento</option>
            <option value="finalizada" ${existing?.status==="finalizada"?"selected":""}>Finalizada</option>
            <option value="transferido" ${existing?.status==="transferido"?"selected":""}>Transferido</option>
          </select>
        </div>
      </div>

      <div class="team-search-row">
        <div class="form-field">
          <label>Selecionar time pela API</label>
          <input id="seasonTeamSearch" placeholder="Ex: Newcastle, Milan, Real Madrid" value="${escapeAttr(existing?.clube_nome || "")}">
        </div>
        <button type="button" class="upload-btn" onclick="searchTeamsForSeason()">Buscar time</button>
      </div>

      <div class="selected-team ${selectedSeasonTeam ? "active" : ""}" id="selectedTeamBox">
        ${selectedSeasonTeam ? `
          <img src="${selectedSeasonTeam.badge || ""}" onerror="this.style.display='none'">
          <div>
            <strong>${escapeHtml(selectedSeasonTeam.name || "-")}</strong>
            <small>${escapeHtml(selectedSeasonTeam.league || "-")}</small>
          </div>
        ` : ""}
      </div>

      <div class="team-results" id="seasonTeamResults"></div>

      <div class="form-field">
        <label>Competições jogadas nesse clube/período</label>
        <div class="competition-checks" id="seasonCompetitionChecks">
          <small>Busque e selecione um time para listar competições.</small>
        </div>
      </div>

      <div class="form-field">
        <label>Relatório por competição</label>
        <div class="season-stats-grid" id="seasonStatsRows">
          <small>As competições selecionadas aparecerão aqui.</small>
        </div>
      </div>

      <div class="form-field">
        <label>Títulos e campeões gerais</label>
        <div class="season-titles-grid" id="seasonTitlesRows">
          <small>Marque títulos ganhos e preencha campeão, artilheiro, líder de assistência e melhor jogador.</small>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="gold-btn" id="saveBtn">${existing ? "Salvar edição" : "Salvar temporada"}</button>
      </div>
    </div>
  `;

  const inicio = form.querySelector("[name='data_inicio']");
  const temp = form.querySelector("[name='temporada']");

  if(inicio && temp){
    inicio.addEventListener("change", ()=>{
      temp.value = monthYearToSeason(inicio.value);
    });
  }

  if(selectedSeasonTeam){
    renderCompetitionSuggestions(selectedSeasonTeam, selectedCompetitionsForSeason);
    renderSeasonTitlesRows(existing);
  }

  form.onsubmit = async e=>{
    e.preventDefault();

    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    try{
      const data = Object.fromEntries(new FormData(form).entries());

      await saveSeasonFlow(data, btn, existing);

      // Fecha e libera agora. Não espera reload completo.
      unlockSeasonSaveButton(btn);
      closeModal();
      setStatus("Temporada salva na planilha. Atualizando em segundo plano...", "ok");

      // Títulos/campeões em segundo plano para não prender o botão.
      setTimeout(async ()=>{
        try{
          await saveSeasonTitlesFlow(data, existing);
        }catch(err){
          console.warn("Temporada salva, mas títulos/campeões falharam:", err);
        }

        refreshAfterSeasonSaveInBackground();
      }, 50);

    }catch(err){
      unlockSeasonSaveButton(btn);
      console.error(err);
      setStatus("Erro ao salvar temporada: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

window.openSeasonFlow = openSeasonFlow;
window.renderSeasonStatsRows = renderSeasonStatsRows;
window.renderCompetitionSuggestions = renderCompetitionSuggestions;

window.addEventListener("error", function(){
  setTimeout(()=>unlockSeasonSaveButton(), 100);
});

window.addEventListener("unhandledrejection", function(){
  setTimeout(()=>unlockSeasonSaveButton(), 100);
});



// ===== V3.7.34 BOLA DE OURO = ANO FINAL DA TEMPORADA =====
// Regra correta:
// 2024/2025 -> 2025
// 2025/2026 -> 2026
// 2026/2027 -> 2027

var getAwardYearFromSeason = function getAwardYearFromSeason(value){
  const text = String(value || "");
  const years = text.match(/\d{4}/g);
  if(!years || !years.length) return "";
  return years.length > 1 ? years[years.length - 1] : years[0];
}

var getCareerSeasonBallonOptions = function getCareerSeasonBallonOptions(){
  const rows = [];

  getTable("CARREIRA_TEMPORADAS")
    .filter(t=>!active.carreira_id || String(t.carreira_id)===String(active.carreira_id))
    .forEach(t=>{
      const season = t.temporada || "";
      const year = getAwardYearFromSeason(season);
      if(!year) return;
      rows.push({
        value:year,
        label:`${season} - ${year}`,
        season,
        year
      });
    });

  getTable("BOLA_DE_OURO_CARREIRA")
    .filter(r=>!active.carreira_id || String(r.carreira_id)===String(active.carreira_id))
    .forEach(r=>{
      const year = getAwardYearFromSeason(r.ano || r.temporada);
      if(!year) return;
      rows.push({
        value:year,
        label:`${year}`,
        season:String(r.temporada || year),
        year
      });
    });

  getTable("BOLA_DE_OURO_BASE").forEach(r=>{
    const year = getAwardYearFromSeason(r.ano || r.temporada);
    if(!year) return;
    rows.push({
      value:year,
      label:`${year}`,
      season:String(r.temporada || year),
      year
    });
  });

  const map = new Map();

  rows.forEach(o=>{
    // Prioriza label com temporada completa: 2024/2025 - 2025.
    if(!map.has(o.value) || o.label.includes("/")){
      map.set(o.value, o);
    }
  });

  return [...map.values()].sort((a,b)=>Number(b.year)-Number(a.year));
}

var normalizeBallonCareerRecord = function normalizeBallonCareerRecord(record){
  const year = getAwardYearFromSeason(record.ano || record.temporada || "");
  return {
    carreira_id: record.carreira_id || active.carreira_id || "",
    temporada: year,
    ano: year,
    posicao: record.posicao || "",
    jogador: record.jogador || "",
    pais: record.pais || "",
    idade_na_premiacao: record.idade_na_premiacao || record.idade || "",
    valor_mercado: record.valor_mercado || record.valor || "",
    imagem_url: record.imagem_url || "",
    observacao: record.observacao || "",
    clube: record.clube || record.club || record.time || ""
  };
}

window.getAwardYearFromSeason = getAwardYearFromSeason;
window.getCareerSeasonBallonOptions = getCareerSeasonBallonOptions;



// ===== V3.7.35 BOLA DE OURO SALVAMENTO EM LOTE =====
// Antes: 1 jogador = 1 request.
// Agora: ranking inteiro = 1 request.
// Requer Apps Script v3.5.7 com action=batch.

var apiBatchPost = async function apiBatchPost(operations){
  const payload = {
    action:"batch",
    operations
  };

  return await apiPost(payload);
}

var getAwardYearFromSeason = function getAwardYearFromSeason(value){
  const text = String(value || "");
  const years = text.match(/\d{4}/g);
  if(!years || !years.length) return "";
  return years.length > 1 ? years[years.length - 1] : years[0];
}

var getCareerSeasonBallonOptions = function getCareerSeasonBallonOptions(){
  const rows = [];

  getTable("CARREIRA_TEMPORADAS")
    .filter(t=>!active.carreira_id || String(t.carreira_id)===String(active.carreira_id))
    .forEach(t=>{
      const season = t.temporada || "";
      const year = getAwardYearFromSeason(season);
      if(!year) return;
      rows.push({
        value:year,
        label:`${season} - ${year}`,
        season,
        year
      });
    });

  getTable("BOLA_DE_OURO_CARREIRA")
    .filter(r=>!active.carreira_id || String(r.carreira_id)===String(active.carreira_id))
    .forEach(r=>{
      const year = getAwardYearFromSeason(r.ano || r.temporada);
      if(!year) return;
      rows.push({
        value:year,
        label:`${year}`,
        season:String(r.temporada || year),
        year
      });
    });

  getTable("BOLA_DE_OURO_BASE").forEach(r=>{
    const year = getAwardYearFromSeason(r.ano || r.temporada);
    if(!year) return;
    rows.push({
      value:year,
      label:`${year}`,
      season:String(r.temporada || year),
      year
    });
  });

  const map = new Map();
  rows.forEach(o=>{
    if(!map.has(o.value) || o.label.includes("/")){
      map.set(o.value, o);
    }
  });

  return [...map.values()].sort((a,b)=>Number(b.year)-Number(a.year));
}

var normalizeBallonCareerRecord = function normalizeBallonCareerRecord(record){
  const year = getAwardYearFromSeason(record.ano || record.temporada || "");
  return {
    carreira_id: record.carreira_id || active.carreira_id || "",
    temporada: year,
    ano: year,
    posicao: record.posicao || "",
    jogador: record.jogador || "",
    pais: record.pais || "",
    idade_na_premiacao: record.idade_na_premiacao || record.idade || "",
    valor_mercado: record.valor_mercado || record.valor || "",
    imagem_url: record.imagem_url || "",
    observacao: record.observacao || "",
    clube: record.clube || record.club || record.time || ""
  };
}

var getBallonRowClub = function getBallonRowClub(row){
  return row.clube || row.club || row.time || row.equipe || "";
}

var syncBatchResultsLocal = function syncBatchResultsLocal(operations, response){
  try{
    const results = response?.results || response?.data?.results || [];

    operations.forEach((op, index)=>{
      const res = results[index] || {};
      const table = op.table;
      if(!table) return;
      if(!Array.isArray(db[table])) db[table] = [];

      if(op.action === "create"){
        const created = Object.assign({}, op.record || {}, res.data || {});
        if(!created.id) created.id = res.id || created.id || ("local_" + Date.now() + "_" + index);
        db[table].push(created);
      }

      if(op.action === "update"){
        const id = String(op.id || res.data?.id || "");
        const updated = Object.assign({}, op.record || {}, res.data || {});
        if(id) updated.id = id;

        const idx = db[table].findIndex(r=>String(r.id)===String(updated.id));
        if(idx >= 0) db[table][idx] = Object.assign({}, db[table][idx], updated);
        else db[table].push(updated);
      }
    });
  }catch(err){
    console.warn("Falha ao sincronizar batch local:", err);
  }
}

var openBallonBatchForm = function openBallonBatchForm(options={}){
  const carreira = getActiveCareer();

  if(!carreira){
    alert("Selecione uma carreira antes.");
    return;
  }

  const editYear = getAwardYearFromSeason(options.editSeason || options.editYear || "");
  const isEdit = !!options.editExisting;
  const activeYear = getAwardYearFromSeason(active.temporada || getCurrentSeason(getProtagonistStats()) || "");
  const initialYear = editYear || activeYear || String(new Date().getFullYear());

  const existingRows = isEdit && initialYear
    ? getTable("BOLA_DE_OURO_CARREIRA")
        .filter(r=>String(r.carreira_id)===String(active.carreira_id) && String(getAwardYearFromSeason(r.ano || r.temporada))===String(initialYear))
    : [];

  const byPos = {};
  existingRows.forEach(r=>{ byPos[String(r.posicao)] = r; });

  let optionsList = getCareerSeasonBallonOptions();
  if(initialYear && !optionsList.some(o=>String(o.value)===String(initialYear))){
    optionsList.unshift({value:initialYear,label:String(initialYear),year:initialYear});
  }

  modalTitle.textContent = isEdit ? "Editar ranking Bola de Ouro" : "Novo ranking Bola de Ouro";
  modalBox.classList.add("wide");
  modalBox.classList.add("ballon-rank-modal");
  form.className = "ballon-batch-form";

  const imageUrl = existingRows.find(r=>r.imagem_url)?.imagem_url || "";

  form.innerHTML = `
    <div class="form-field full">
      <label>Temporada / Ano da Bola de Ouro</label>
      <select name="ano_premiacao" id="ballonBatchSeason">
        ${optionsList.map(o=>`<option value="${escapeAttr(o.value)}" ${String(o.value)===String(initialYear)?"selected":""}>${escapeHtml(o.label)}</option>`).join("")}
      </select>
      <small class="field-help">Exemplo: 2024/2025 - 2025. Na planilha salva como 2025.</small>
    </div>

    <div class="form-field full">
      <label>Imagem do vencedor</label>
      <div class="file-row">
        <input name="imagem_url" value="${escapeAttr(imageUrl)}" placeholder="URL da imagem de fundo do vencedor">
        <button type="button" class="upload-btn" onclick="triggerUpload('imagem_url')">Importar</button>
      </div>
      <input type="file" id="file_imagem_url" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadToCloudinary(event,'imagem_url')">
    </div>

    <div class="ballon-rank-grid ballon-rank-grid-with-club">
      <div class="ballon-rank-head">#</div>
      <div class="ballon-rank-head">Jogador</div>
      <div class="ballon-rank-head">País</div>
      <div class="ballon-rank-head">Clube</div>
      <div class="ballon-rank-head">Idade</div>
      <div class="ballon-rank-head">Valor</div>

      ${Array.from({length:10},(_,i)=>{
        const pos = i+1;
        const old = byPos[String(pos)] || {};
        return `
          <div class="ballon-rank-pos">${pos}</div>
          <input name="jogador_${pos}" value="${escapeAttr(old.jogador || "")}" placeholder="Jogador">
          <input name="pais_${pos}" value="${escapeAttr(old.pais || "")}" placeholder="País, código ou emoji">
          <input name="clube_${pos}" value="${escapeAttr(getBallonRowClub(old))}" placeholder="Clube">
          <input name="idade_${pos}" type="number" value="${escapeAttr(old.idade_na_premiacao || old.idade || "")}" placeholder="Idade">
          <input name="valor_${pos}" value="${escapeAttr(old.valor_mercado || old.valor || "")}" placeholder="Ex: €90M">
        `;
      }).join("")}
    </div>

    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">${isEdit ? "Salvar edição" : "Salvar novo ranking"}</button>
    </div>
  `;

  form.onsubmit = async e=>{
    e.preventDefault();

    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      const year = getAwardYearFromSeason(data.ano_premiacao);

      if(!year) throw new Error("Selecione o ano da Bola de Ouro.");

      const oldRows = isEdit
        ? getTable("BOLA_DE_OURO_CARREIRA").filter(r=>String(r.carreira_id)===String(active.carreira_id) && String(getAwardYearFromSeason(r.ano || r.temporada))===String(year))
        : [];

      const operations = [];

      for(let pos=1; pos<=10; pos++){
        const raw = {
          carreira_id: active.carreira_id,
          temporada: year,
          ano: year,
          posicao: pos,
          jogador: data[`jogador_${pos}`] || "",
          pais: data[`pais_${pos}`] || "",
          idade_na_premiacao: data[`idade_${pos}`] || "",
          valor_mercado: data[`valor_${pos}`] || "",
          imagem_url: pos === 1 ? (data.imagem_url || "") : "",
          observacao: "",
          clube: data[`clube_${pos}`] || ""
        };

        if(!raw.jogador && !raw.pais && !raw.clube && !raw.idade_na_premiacao && !raw.valor_mercado) continue;

        const record = normalizeBallonCareerRecord(raw);
        const existing = oldRows.find(r=>String(r.posicao)===String(pos));

        operations.push(existing
          ? {action:"update", table:"BOLA_DE_OURO_CARREIRA", id:existing.id, record}
          : {action:"create", table:"BOLA_DE_OURO_CARREIRA", record}
        );
      }

      if(!operations.length) throw new Error("Preencha pelo menos um jogador.");

      const result = await apiBatchPost(operations);
      if(!result.ok) throw new Error(result.error || "Erro ao salvar ranking em lote.");

      syncBatchResultsLocal(operations, result);

      clearButtonSaving(btn);
      closeModal();

      if(typeof renderBolaOuro === "function") renderBolaOuro();

      setStatus(`Ranking da Bola de Ouro ${year} salvo em lote.`, "ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar ranking: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

var openNewBallonRanking = function openNewBallonRanking(){ openBallonBatchForm({editExisting:false}); }
var openEditBallonRankingSeason = function openEditBallonRankingSeason(season){ openBallonBatchForm({editExisting:true, editSeason:getAwardYearFromSeason(season)}); }

window.openBallonBatchForm = openBallonBatchForm;
window.openNewBallonRanking = openNewBallonRanking;
window.openEditBallonRankingSeason = openEditBallonRankingSeason;
window.getAwardYearFromSeason = getAwardYearFromSeason;



// ===== V3.7.36 TEMPORADA SALVAMENTO EM LOTE =====
// Temporada inteira = 1 chamada ao Apps Script.
// Requer Apps Script v3.5.8 com action=saveSeasonFull.

var normalizeCompetitionLabelV3736 = function normalizeCompetitionLabelV3736(name){
  const raw = String(name || "").trim();

  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");

  const aliases = {
    "supercopa_da_uefa":"Supercopa da UEFA",
    "uefa_super_cup":"Supercopa da UEFA",
    "supercopa_uefa":"Supercopa da UEFA",
    "intercontinental_de_clubes":"Intercontinental de Clubes",
    "intercontinental_cup":"Intercontinental de Clubes",
    "mundial_de_clubes":"Mundial de Clubes",
    "fifa_club_world_cup":"Mundial de Clubes"
  };

  return aliases[key] || raw;
}

var compKeyV3736 = function compKeyV3736(name){
  return String(normalizeCompetitionLabelV3736(name) || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
}

var getSelectedSeasonCompetitionsV3736 = function getSelectedSeasonCompetitionsV3736(){
  const checks = [...document.querySelectorAll("#seasonCompetitionChecks input[type='checkbox']:checked")];
  const values = checks.map(ch=>normalizeCompetitionLabelV3736(ch.value || ch.dataset.competition || ch.name || ""));
  return [...new Set(values.filter(Boolean))];
}

var buildSeasonFullPayloadV3736 = function buildSeasonFullPayloadV3736(data, existing=null){
  if(!active.carreira_id) throw new Error("Selecione ou crie uma carreira antes.");
  if(!active.protagonista_id) throw new Error("Selecione ou crie um protagonista antes.");
  if(!selectedSeasonTeam) throw new Error("Selecione um time pela busca da API.");

  const temporada = data.temporada || monthYearToSeason(data.data_inicio);
  if(!temporada) throw new Error("Informe o início no time ou a temporada.");

  const comps = getSelectedSeasonCompetitionsV3736();
  if(!comps.length) throw new Error("Selecione pelo menos uma competição.");

  const stats = comps.map(comp=>{
    const key = compKeyV3736(comp);
    return {
      competicao: comp,
      jogos: data[`jogos_${key}`] || "",
      gols: data[`gols_${key}`] || "",
      assistencias: data[`assistencias_${key}`] || "",
      cartoes: data[`cartoes_${key}`] || "",
      nota_geral: data[`media_geral_${key}`] || ""
    };
  });

  const titles = comps.map(comp=>{
    const key = compKeyV3736(comp);
    const won = !!data[`titulo_${key}`];

    return {
      competicao: comp,
      ganhou: won,
      campeao: data[`campeao_${key}`] || (won ? selectedSeasonTeam.name : ""),
      artilheiro: data[`artilheiro_${key}`] || "",
      lider_assistencias: data[`assist_${key}`] || data[`lider_assistencias_${key}`] || "",
      melhor_jogador: data[`melhor_${key}`] || data[`melhor_jogador_${key}`] || ""
    };
  });

  return {
    action: "saveSeasonFull",
    existingSeasonId: existing?.id || "",
    carreira_id: active.carreira_id,
    personagem_id: active.protagonista_id,
    temporada,
    status: data.status || existing?.status || "em andamento",
    data_inicio: data.data_inicio || "",
    data_fim: data.data_fim || "",
    team: {
      name: selectedSeasonTeam.name || "",
      country: selectedSeasonTeam.country || "",
      badge: selectedSeasonTeam.badge || "",
      league: selectedSeasonTeam.league || ""
    },
    competitions: comps,
    stats,
    titles
  };
}

var syncSeasonFullLocalV3736 = function syncSeasonFullLocalV3736(result){
  try{
    const data = result?.data || result || {};
    if(!data) return;

    if(data.clube){
      if(!Array.isArray(db.CLUBES)) db.CLUBES = [];
      const idx = db.CLUBES.findIndex(c=>String(c.id)===String(data.clube.id));
      if(idx >= 0) db.CLUBES[idx] = Object.assign({}, db.CLUBES[idx], data.clube);
      else db.CLUBES.push(data.clube);
    }

    if(data.season){
      if(!Array.isArray(db.CARREIRA_TEMPORADAS)) db.CARREIRA_TEMPORADAS = [];
      const idx = db.CARREIRA_TEMPORADAS.findIndex(s=>String(s.id)===String(data.season.id));
      if(idx >= 0) db.CARREIRA_TEMPORADAS[idx] = Object.assign({}, db.CARREIRA_TEMPORADAS[idx], data.season);
      else db.CARREIRA_TEMPORADAS.push(data.season);
    }

    if(Array.isArray(data.competicoes)){
      if(!Array.isArray(db.COMPETICOES)) db.COMPETICOES = [];
      data.competicoes.forEach(c=>{
        const idx = db.COMPETICOES.findIndex(x=>String(x.id)===String(c.id));
        if(idx >= 0) db.COMPETICOES[idx] = Object.assign({}, db.COMPETICOES[idx], c);
        else db.COMPETICOES.push(c);
      });
    }

    if(Array.isArray(data.stats)){
      if(!Array.isArray(db.ESTATISTICAS_CARREIRA)) db.ESTATISTICAS_CARREIRA = [];
      data.stats.forEach(s=>{
        const idx = db.ESTATISTICAS_CARREIRA.findIndex(x=>String(x.id)===String(s.id));
        if(idx >= 0) db.ESTATISTICAS_CARREIRA[idx] = Object.assign({}, db.ESTATISTICAS_CARREIRA[idx], s);
        else db.ESTATISTICAS_CARREIRA.push(s);
      });
    }

    if(Array.isArray(data.deletedStats)){
      const ids = new Set(data.deletedStats.map(String));
      db.ESTATISTICAS_CARREIRA = getTable("ESTATISTICAS_CARREIRA").filter(s=>!ids.has(String(s.id)));
    }

    if(Array.isArray(data.titles)){
      if(!Array.isArray(db.CAMPEOES_CARREIRA)) db.CAMPEOES_CARREIRA = [];
      data.titles.forEach(t=>{
        const idx = db.CAMPEOES_CARREIRA.findIndex(x=>String(x.id)===String(t.id));
        if(idx >= 0) db.CAMPEOES_CARREIRA[idx] = Object.assign({}, db.CAMPEOES_CARREIRA[idx], t);
        else db.CAMPEOES_CARREIRA.push(t);
      });
    }

    if(Array.isArray(data.deletedTitles)){
      const ids = new Set(data.deletedTitles.map(String));
      db.CAMPEOES_CARREIRA = getTable("CAMPEOES_CARREIRA").filter(t=>!ids.has(String(t.id)));
    }
  }catch(err){
    console.warn("Falha ao sincronizar temporada local:", err);
  }
}

var saveSeasonFullV3736 = async function saveSeasonFullV3736(data, existing=null){
  const payload = buildSeasonFullPayloadV3736(data, existing);
  const res = await apiPost(payload);
  if(!res.ok) throw new Error(res.error || "Erro ao salvar temporada em lote.");
  syncSeasonFullLocalV3736(res);
  return res.data || res;
}

var openSeasonFlow = function openSeasonFlow(existingId=null){
  const carreira = getActiveCareer();
  const protagonista = getActiveProtagonist();

  if(!carreira){
    alert("Selecione ou crie uma carreira antes.");
    return;
  }

  if(!protagonista){
    alert("Selecione ou crie um protagonista antes.");
    return;
  }

  const existing = existingId
    ? getCareerSeasonRecords().find(t=>String(t.id)===String(existingId))
    : null;

  window.__editingSeasonRecord = existing || null;

  selectedSeasonTeam = existing ? {
    name: existing.clube_nome || "",
    league: existing.liga || "",
    country: "",
    badge: existing.escudo || "",
    api_id: ""
  } : null;

  selectedCompetitionsForSeason = existing ? getCompetitionsFromSeasonRecord(existing) : [];
  window.__editingSeasonStats = existing ? getSeasonStatsForRecord(existing) : [];

  modalTitle.textContent = existing ? "Editar temporada" : "Nova temporada";
  modalBox.classList.add("wide");
  form.className = "season-flow-form";

  const defaultSeason = existing?.temporada || (active.temporada || "");
  const defaultInicio = existing?.data_inicio || "";
  const defaultFim = existing?.data_fim || "";

  form.innerHTML = `
    <div class="season-flow">
      <div class="season-flow-grid">
        <div class="form-field">
          <label>Início no time</label>
          <input name="data_inicio" type="month" value="${escapeAttr(defaultInicio)}">
        </div>
        <div class="form-field">
          <label>Fim no time</label>
          <input name="data_fim" type="month" value="${escapeAttr(defaultFim)}">
        </div>
        <div class="form-field">
          <label>Temporada reconhecida</label>
          <input name="temporada" placeholder="Ex: 2025/2026" value="${escapeAttr(defaultSeason)}">
        </div>
        <div class="form-field">
          <label>Status</label>
          <select name="status">
            <option value="em andamento" ${existing?.status==="em andamento"?"selected":""}>Em andamento</option>
            <option value="finalizada" ${existing?.status==="finalizada"?"selected":""}>Finalizada</option>
            <option value="transferido" ${existing?.status==="transferido"?"selected":""}>Transferido</option>
          </select>
        </div>
      </div>

      <div class="team-search-row">
        <div class="form-field">
          <label>Selecionar time pela API</label>
          <input id="seasonTeamSearch" placeholder="Ex: Newcastle, Milan, Real Madrid" value="${escapeAttr(existing?.clube_nome || "")}">
        </div>
        <button type="button" class="upload-btn" onclick="searchTeamsForSeason()">Buscar time</button>
      </div>

      <div class="selected-team ${selectedSeasonTeam ? "active" : ""}" id="selectedTeamBox">
        ${selectedSeasonTeam ? `
          <img src="${selectedSeasonTeam.badge || ""}" onerror="this.style.display='none'">
          <div>
            <strong>${escapeHtml(selectedSeasonTeam.name || "-")}</strong>
            <small>${escapeHtml(selectedSeasonTeam.league || "-")}</small>
          </div>
        ` : ""}
      </div>

      <div class="team-results" id="seasonTeamResults"></div>

      <div class="form-field">
        <label>Competições jogadas nesse clube/período</label>
        <div class="competition-checks" id="seasonCompetitionChecks">
          <small>Busque e selecione um time para listar competições.</small>
        </div>
      </div>

      <div class="form-field">
        <label>Relatório por competição</label>
        <div class="season-stats-grid" id="seasonStatsRows">
          <small>As competições selecionadas aparecerão aqui.</small>
        </div>
      </div>

      <div class="form-field">
        <label>Títulos e campeões gerais</label>
        <div class="season-titles-grid" id="seasonTitlesRows">
          <small>Marque títulos ganhos e preencha campeão, artilheiro, líder de assistência e melhor jogador.</small>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="gold-btn" id="saveBtn">${existing ? "Salvar edição" : "Salvar temporada"}</button>
      </div>
    </div>
  `;

  const inicio = form.querySelector("[name='data_inicio']");
  const temp = form.querySelector("[name='temporada']");
  if(inicio && temp){
    inicio.addEventListener("change", ()=>{
      temp.value = monthYearToSeason(inicio.value);
    });
  }

  if(selectedSeasonTeam){
    renderCompetitionSuggestions(selectedSeasonTeam, selectedCompetitionsForSeason);
    if(typeof renderSeasonTitlesRows === "function") renderSeasonTitlesRows(existing);
  }

  form.onsubmit = async e=>{
    e.preventDefault();

    const btn = $("saveBtn");
    if(btn && btn.disabled) return;

    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      const result = await saveSeasonFullV3736(data, existing);

      clearButtonSaving(btn);
      closeModal();

      active.temporada = result?.season?.temporada || data.temporada || active.temporada;
      saveActive();

      if(typeof renderAll === "function") renderAll();

      setStatus("Temporada salva em lote.", "ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar temporada: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

window.openSeasonFlow = openSeasonFlow;
window.saveSeasonFullV3736 = saveSeasonFullV3736;



// ===== V3.7.37 FIX EDIÇÃO TEMPORADA: CHAVES DOS INPUTS =====
// Corrige caso competição marcada apareça no modal, mas não gere linha em ESTATISTICAS_CARREIRA.
// Exemplo: Coppa Italia marcada e preenchida, mas não salva.

var normalizeCompetitionLabelV3737 = function normalizeCompetitionLabelV3737(name){
  const raw = String(name || "").trim();

  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");

  const aliases = {
    "supercopa_da_uefa":"Supercopa da UEFA",
    "uefa_super_cup":"Supercopa da UEFA",
    "supercopa_uefa":"Supercopa da UEFA",
    "intercontinental_de_clubes":"Intercontinental de Clubes",
    "intercontinental_cup":"Intercontinental de Clubes",
    "mundial_de_clubes":"Mundial de Clubes",
    "fifa_club_world_cup":"Mundial de Clubes"
  };

  return aliases[key] || raw;
}

var compKeyV3737 = function compKeyV3737(name){
  return String(normalizeCompetitionLabelV3737(name) || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
}

var getCheckboxCompetitionNameV3737 = function getCheckboxCompetitionNameV3737(ch){
  if(!ch) return "";

  let value = ch.dataset?.competition || ch.value || ch.name || "";

  // Quando checkbox não tem value, browser manda "on".
  if(!value || value === "on" || value === "true"){
    const label = ch.closest("label");
    if(label){
      value = (label.innerText || label.textContent || "")
        .replace(/\s+/g," ")
        .trim();
    }
  }

  return normalizeCompetitionLabelV3737(value);
}

var getSelectedSeasonCompetitionsV3736 = function getSelectedSeasonCompetitionsV3736(){
  const checks = [...document.querySelectorAll("#seasonCompetitionChecks input[type='checkbox']:checked")];

  const values = checks.map(getCheckboxCompetitionNameV3737)
    .map(normalizeCompetitionLabelV3737)
    .filter(Boolean);

  return [...new Set(values)];
}

// Compatibilidade caso outra função use esse nome.
var getSelectedSeasonCompetitions = function getSelectedSeasonCompetitions(){
  return getSelectedSeasonCompetitionsV3736();
}

var getPossibleKeysForCompV3737 = function getPossibleKeysForCompV3737(comp){
  const raw = String(comp || "");
  const keys = new Set();

  keys.add(compKeyV3737(raw));

  try{
    if(typeof escapeName === "function") keys.add(escapeName(raw));
  }catch(err){}

  keys.add(raw);
  keys.add(raw.replace(/\s+/g,"_"));
  keys.add(raw.replace(/\s+/g,""));
  keys.add(raw.toLowerCase().replace(/\s+/g,"_"));
  keys.add(raw.toLowerCase().replace(/\s+/g,""));

  const noAccent = raw.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  keys.add(noAccent);
  keys.add(noAccent.replace(/\s+/g,"_"));
  keys.add(noAccent.replace(/\s+/g,""));
  keys.add(noAccent.toLowerCase().replace(/\s+/g,"_"));
  keys.add(noAccent.toLowerCase().replace(/\s+/g,""));

  return [...keys].filter(Boolean);
}

var getDataByCompFieldV3737 = function getDataByCompFieldV3737(data, field, comp){
  const keys = getPossibleKeysForCompV3737(comp);

  for(const key of keys){
    const name = `${field}_${key}`;
    if(Object.prototype.hasOwnProperty.call(data, name)){
      return data[name];
    }
  }

  // Fallback: varre todas as chaves do FormData tentando bater normalizado.
  const targetCompKey = compKeyV3737(comp);

  for(const [k,v] of Object.entries(data)){
    if(!k.startsWith(field + "_")) continue;

    const suffix = k.slice(field.length + 1);
    if(compKeyV3737(suffix) === targetCompKey){
      return v;
    }
  }

  return "";
}

var buildSeasonFullPayloadV3736 = function buildSeasonFullPayloadV3736(data, existing=null){
  if(!active.carreira_id) throw new Error("Selecione ou crie uma carreira antes.");
  if(!active.protagonista_id) throw new Error("Selecione ou crie um protagonista antes.");
  if(!selectedSeasonTeam) throw new Error("Selecione um time pela busca da API.");

  const temporada = data.temporada || monthYearToSeason(data.data_inicio);
  if(!temporada) throw new Error("Informe o início no time ou a temporada.");

  const comps = getSelectedSeasonCompetitionsV3736();
  if(!comps.length) throw new Error("Selecione pelo menos uma competição.");

  const stats = comps.map(comp=>{
    const compName = normalizeCompetitionLabelV3737(comp);
    return {
      competicao: compName,
      jogos: getDataByCompFieldV3737(data, "jogos", compName),
      gols: getDataByCompFieldV3737(data, "gols", compName),
      assistencias: getDataByCompFieldV3737(data, "assistencias", compName),
      cartoes: getDataByCompFieldV3737(data, "cartoes", compName),
      nota_geral: getDataByCompFieldV3737(data, "media_geral", compName)
    };
  });

  const titles = comps.map(comp=>{
    const compName = normalizeCompetitionLabelV3737(comp);
    const ganhouRaw = getDataByCompFieldV3737(data, "titulo", compName);
    const won = !!ganhouRaw;

    return {
      competicao: compName,
      ganhou: won,
      campeao: getDataByCompFieldV3737(data, "campeao", compName) || (won ? selectedSeasonTeam.name : ""),
      artilheiro: getDataByCompFieldV3737(data, "artilheiro", compName),
      lider_assistencias:
        getDataByCompFieldV3737(data, "assist", compName) ||
        getDataByCompFieldV3737(data, "lider_assistencias", compName),
      melhor_jogador:
        getDataByCompFieldV3737(data, "melhor", compName) ||
        getDataByCompFieldV3737(data, "melhor_jogador", compName)
    };
  });

  console.log("SaveSeasonFull payload competições:", comps);
  console.log("SaveSeasonFull payload stats:", stats);

  return {
    action: "saveSeasonFull",
    existingSeasonId: existing?.id || "",
    carreira_id: active.carreira_id,
    personagem_id: active.protagonista_id,
    temporada,
    status: data.status || existing?.status || "em andamento",
    data_inicio: data.data_inicio || "",
    data_fim: data.data_fim || "",
    team: {
      name: selectedSeasonTeam.name || "",
      country: selectedSeasonTeam.country || "",
      badge: selectedSeasonTeam.badge || "",
      league: selectedSeasonTeam.league || ""
    },
    competitions: comps,
    stats,
    titles
  };
}

window.getSelectedSeasonCompetitionsV3736 = getSelectedSeasonCompetitionsV3736;
window.getSelectedSeasonCompetitions = getSelectedSeasonCompetitions;
window.buildSeasonFullPayloadV3736 = buildSeasonFullPayloadV3736;



// ===== V3.7.38 TEMPORADA: LER LINHAS VISUAIS DO MODAL =====
// Corrige Coppa Italia / Supercoppa Italiana / qualquer competição que aparece no modal
// mas não salva ou volta em branco. Agora o payload lê a linha visual, não o name do input.

var normalizeCompetitionLabelV3738 = function normalizeCompetitionLabelV3738(name){
  const raw = String(name || "").trim();

  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");

  const aliases = {
    "copa_italia":"Coppa Italia",
    "coppa_italia":"Coppa Italia",
    "supercopa_italiana":"Supercoppa Italiana",
    "supercoppa_italiana":"Supercoppa Italiana",
    "supercopa_da_uefa":"Supercopa da UEFA",
    "uefa_super_cup":"Supercopa da UEFA",
    "supercopa_uefa":"Supercopa da UEFA",
    "intercontinental_de_clubes":"Intercontinental de Clubes",
    "intercontinental_cup":"Intercontinental de Clubes",
    "mundial_de_clubes":"Mundial de Clubes",
    "fifa_club_world_cup":"Mundial de Clubes"
  };

  return aliases[key] || raw;
}

var compKeyV3738 = function compKeyV3738(name){
  return String(normalizeCompetitionLabelV3738(name) || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
}

var sameCompetitionV3738 = function sameCompetitionV3738(a,b){
  return compKeyV3738(a) === compKeyV3738(b);
}

var getSelectedSeasonCompetitionsV3736 = function getSelectedSeasonCompetitionsV3736(){
  const checks = [...document.querySelectorAll("#seasonCompetitionChecks input[type='checkbox']:checked")];

  const values = checks.map(ch=>{
    let value = ch.dataset?.competition || ch.value || ch.name || "";
    if(!value || value === "on" || value === "true"){
      const label = ch.closest("label");
      if(label){
        value = (label.innerText || label.textContent || "").replace(/\s+/g," ").trim();
      }
    }
    return normalizeCompetitionLabelV3738(value);
  }).filter(Boolean);

  // Também inclui o que já está renderizado nas linhas visuais.
  document.querySelectorAll("#seasonStatsRows .season-stats-row, #seasonStatsRows .season-stat-row").forEach(row=>{
    const title = row.querySelector("strong")?.textContent?.trim();
    if(title) values.push(normalizeCompetitionLabelV3738(title));
  });

  return [...new Set(values)];
}

var getExistingStatForCompV3738 = function getExistingStatForCompV3738(stats, comp){
  return (stats || []).find(s=>{
    const name = s.competicao || compName(s.competicao_id) || "";
    return sameCompetitionV3738(name, comp);
  }) || {};
}

var renderSeasonStatsRows = function renderSeasonStatsRows(existingStats=null){
  const wrap = $("seasonStatsRows");
  if(!wrap) return;

  const comps = getSelectedSeasonCompetitionsV3736();
  selectedCompetitionsForSeason = comps;

  if(existingStats) window.__editingSeasonStats = existingStats;
  const stats = existingStats || window.__editingSeasonStats || [];

  if(!comps.length){
    wrap.innerHTML = `<div class="entity-card"><small>Selecione pelo menos uma competição.</small></div>`;
    if(typeof renderSeasonTitlesRows === "function") renderSeasonTitlesRows(window.__editingSeasonRecord || null);
    return;
  }

  wrap.innerHTML = comps.map(comp=>{
    const label = normalizeCompetitionLabelV3738(comp);
    const old = getExistingStatForCompV3738(stats, label);
    const key = compKeyV3738(label);

    return `
      <div class="season-stats-row" data-competition="${escapeAttr(label)}">
        <strong>${escapeHtml(label)}</strong>
        <input data-field="jogos" name="jogos_${key}" type="number" placeholder="Jogos" value="${escapeAttr(old.jogos || "")}">
        <input data-field="gols" name="gols_${key}" type="number" placeholder="Gols" value="${escapeAttr(old.gols || "")}">
        <input data-field="assistencias" name="assistencias_${key}" type="number" placeholder="Assist." value="${escapeAttr(old.assistencias || "")}">
        <input data-field="cartoes" name="cartoes_${key}" type="number" placeholder="Cartões" value="${escapeAttr(old.cartoes || "")}">
        <input data-field="nota_geral" name="media_geral_${key}" type="number" step="0.1" placeholder="Nota" value="${escapeAttr(old.nota_geral || old.media_geral || "")}">
      </div>
    `;
  }).join("");

  if(typeof renderSeasonTitlesRows === "function") renderSeasonTitlesRows(window.__editingSeasonRecord || null);
}

var readSeasonStatsRowsFromDomV3738 = function readSeasonStatsRowsFromDomV3738(){
  const rows = [...document.querySelectorAll("#seasonStatsRows .season-stats-row, #seasonStatsRows .season-stat-row")];

  return rows.map(row=>{
    const comp =
      row.dataset?.competition ||
      row.querySelector("strong")?.textContent?.trim() ||
      "";

    const inputs = [...row.querySelectorAll("input")];

    const byField = {};
    inputs.forEach((input, index)=>{
      const field = input.dataset?.field;
      if(field) byField[field] = input.value;
      else {
        // fallback por ordem visual
        if(index === 0) byField.jogos = input.value;
        if(index === 1) byField.gols = input.value;
        if(index === 2) byField.assistencias = input.value;
        if(index === 3) byField.cartoes = input.value;
        if(index === 4) byField.nota_geral = input.value;
      }
    });

    return {
      competicao: normalizeCompetitionLabelV3738(comp),
      jogos: byField.jogos || "",
      gols: byField.gols || "",
      assistencias: byField.assistencias || "",
      cartoes: byField.cartoes || "",
      nota_geral: byField.nota_geral || ""
    };
  }).filter(s=>s.competicao);
}

var readSeasonTitlesRowsFromDomV3738 = function readSeasonTitlesRowsFromDomV3738(){
  const rows = [...document.querySelectorAll("#seasonTitlesRows .season-title-row, #seasonTitlesRows .title-row, #seasonTitlesRows > div")];

  return rows.map(row=>{
    const comp =
      row.dataset?.competition ||
      row.querySelector("strong")?.textContent?.trim() ||
      row.querySelector("b")?.textContent?.trim() ||
      "";

    if(!comp) return null;

    const inputs = [...row.querySelectorAll("input")];
    const checkbox = inputs.find(i=>i.type === "checkbox");
    const textInputs = inputs.filter(i=>i.type !== "checkbox");

    return {
      competicao: normalizeCompetitionLabelV3738(comp),
      ganhou: checkbox ? checkbox.checked : false,
      campeao: textInputs[0]?.value || "",
      artilheiro: textInputs[1]?.value || "",
      lider_assistencias: textInputs[2]?.value || "",
      melhor_jogador: textInputs[3]?.value || ""
    };
  }).filter(Boolean);
}

var buildSeasonFullPayloadV3736 = function buildSeasonFullPayloadV3736(data, existing=null){
  if(!active.carreira_id) throw new Error("Selecione ou crie uma carreira antes.");
  if(!active.protagonista_id) throw new Error("Selecione ou crie um protagonista antes.");

  // FIX V3.8.11: não bloquear o salvamento caso a busca de time pela API
  // externa (TheSportsDB) falhe, esteja fora do ar ou não retorne resultado.
  // Se o usuário digitou um nome de time no campo de busca mas não selecionou
  // um resultado da API, usamos o texto digitado como time manual.
  if(!selectedSeasonTeam){
    const typedTeamName = ($("seasonTeamSearch")?.value || "").trim();
    if(typedTeamName){
      selectedSeasonTeam = {
        name: typedTeamName,
        league: "",
        country: "",
        badge: "",
        api_id: ""
      };
    }
  }
  if(!selectedSeasonTeam) throw new Error("Informe o nome do time (busque pela API ou digite manualmente).");

  const temporada = data.temporada || monthYearToSeason(data.data_inicio);
  if(!temporada) throw new Error("Informe o início no time ou a temporada.");

  const stats = readSeasonStatsRowsFromDomV3738();
  let comps = [...new Set([
    ...getSelectedSeasonCompetitionsV3736(),
    ...stats.map(s=>s.competicao)
  ].map(normalizeCompetitionLabelV3738).filter(Boolean))];

  // FIX V3.8.11: se nenhuma competição foi marcada (ex: sugestões não carregaram
  // porque a API de times falhou), não travar o salvamento — usar "Geral" como
  // competição padrão, que pode ser editada depois.
  if(!comps.length) comps = ["Geral"];

  const statMap = new Map();
  stats.forEach(s=>statMap.set(compKeyV3738(s.competicao), s));

  const finalStats = comps.map(comp=>{
    const saved = statMap.get(compKeyV3738(comp)) || {};
    return {
      competicao: normalizeCompetitionLabelV3738(comp),
      jogos: saved.jogos || "",
      gols: saved.gols || "",
      assistencias: saved.assistencias || "",
      cartoes: saved.cartoes || "",
      nota_geral: saved.nota_geral || ""
    };
  });

  let titles = readSeasonTitlesRowsFromDomV3738();

  // Garante que toda competição exista também em titles, mesmo vazio.
  const titleKeys = new Set(titles.map(t=>compKeyV3738(t.competicao)));
  comps.forEach(comp=>{
    if(!titleKeys.has(compKeyV3738(comp))){
      titles.push({
        competicao: normalizeCompetitionLabelV3738(comp),
        ganhou:false,
        campeao:"",
        artilheiro:"",
        lider_assistencias:"",
        melhor_jogador:""
      });
    }
  });

  console.log("V3.7.38 saveSeason comps:", comps);
  console.log("V3.7.38 saveSeason stats DOM:", finalStats);

  return {
    action: "saveSeasonFull",
    existingSeasonId: existing?.id || "",
    carreira_id: active.carreira_id,
    personagem_id: active.protagonista_id,
    temporada,
    status: data.status || existing?.status || "em andamento",
    data_inicio: data.data_inicio || "",
    data_fim: data.data_fim || "",
    team: {
      name: selectedSeasonTeam.name || "",
      country: selectedSeasonTeam.country || "",
      badge: selectedSeasonTeam.badge || "",
      league: selectedSeasonTeam.league || ""
    },
    competitions: comps,
    stats: finalStats,
    titles
  };
}

window.renderSeasonStatsRows = renderSeasonStatsRows;
window.getSelectedSeasonCompetitionsV3736 = getSelectedSeasonCompetitionsV3736;
window.getSelectedSeasonCompetitions = getSelectedSeasonCompetitionsV3736;
window.buildSeasonFullPayloadV3736 = buildSeasonFullPayloadV3736;
window.readSeasonStatsRowsFromDomV3738 = readSeasonStatsRowsFromDomV3738;



// ===== V3.7.40 SAFE ROLLBACK BUTTONS =====
// Recuperação dos botões após erro Maximum call stack size exceeded.
// Não sobrescreve navigate/renderPageById/openSeasonFlow/renderCompetitionSuggestions.
// Só adiciona segurança para botão travado e garante que a versão correta está carregada.

window.addEventListener("error", function(e){
  console.error("Football Legacy error:", e.error || e.message);
  try{
    const btn = document.querySelector("#saveBtn, button[disabled].gold-btn, .gold-btn[disabled]");
    if(btn){
      if(typeof clearButtonSaving === "function") clearButtonSaving(btn);
      else{
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        if(btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
      }
    }
  }catch(err){}
});

window.addEventListener("unhandledrejection", function(e){
  console.error("Football Legacy promise error:", e.reason);
  try{
    const btn = document.querySelector("#saveBtn, button[disabled].gold-btn, .gold-btn[disabled]");
    if(btn){
      if(typeof clearButtonSaving === "function") clearButtonSaving(btn);
      else{
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        if(btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
      }
    }
  }catch(err){}
});



// ===== V3.7.41 FIX getSelectedSeasonCompetitionsV3736 RECURSION =====
// Corrige erro no console:
// at getSelectedSeasonCompetitionsV3736 (...)
// Maximum call stack size exceeded
//
// Esta função agora lê diretamente os checkboxes do modal.
// Não chama getSelectedSeasonCompetitions, não chama getSelectedSeasonCompetitionsV3736,
// não chama renderSeasonStatsRows. Logo, não tem recursão.

var normalizeCompetitionNameSafeV3741 = function normalizeCompetitionNameSafeV3741(value){
  const raw = String(value || "").trim();

  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");

  const aliases = {
    "copa_italia":"Coppa Italia",
    "coppa_italia":"Coppa Italia",
    "supercopa_italiana":"Supercoppa Italiana",
    "supercoppa_italiana":"Supercoppa Italiana",
    "supercopa_da_uefa":"Supercopa da UEFA",
    "supercopa_uefa":"Supercopa da UEFA",
    "uefa_super_cup":"Supercopa da UEFA",
    "intercontinental_de_clubes":"Intercontinental de Clubes",
    "intercontinental_cup":"Intercontinental de Clubes",
    "mundial_de_clubes":"Mundial de Clubes",
    "fifa_club_world_cup":"Mundial de Clubes"
  };

  return aliases[key] || raw;
}

var getSelectedSeasonCompetitionsV3736 = function getSelectedSeasonCompetitionsV3736(){
  const checks = Array.from(document.querySelectorAll("#seasonCompetitionChecks input[type='checkbox']:checked"));

  const values = checks.map(ch=>{
    let value = "";

    if(ch.dataset){
      value = ch.dataset.competition || ch.dataset.name || "";
    }

    if(!value) value = ch.value || ch.name || "";

    // Checkbox sem value normalmente vira "on".
    if(!value || value === "on" || value === "true"){
      const label = ch.closest("label");
      if(label){
        value = (label.innerText || label.textContent || "")
          .replace(/\s+/g," ")
          .trim();
      }
    }

    return normalizeCompetitionNameSafeV3741(value);
  }).filter(Boolean);

  return Array.from(new Set(values));
}

var getSelectedSeasonCompetitions = function getSelectedSeasonCompetitions(){
  return getSelectedSeasonCompetitionsV3736();
}

window.getSelectedSeasonCompetitionsV3736 = getSelectedSeasonCompetitionsV3736;
window.getSelectedSeasonCompetitions = getSelectedSeasonCompetitions;



// ===== V3.7.42 FAST SUMMARY STABLE =====
// Versão focada em velocidade, baseada na v3.7.41.
// Não mexe em openSeasonFlow, renderSeasonStatsRows nem nos botões.
// Só troca a estratégia de carregamento:
// - abre com action=summary
// - carrega action=all só quando necessário ou no botão Atualizar.

let FL_FULL_DB_LOADED = false;
let FL_FULL_DB_LOADING = false;

var normalizeDbAfterLoadV3742 = function normalizeDbAfterLoadV3742(){
  if(!db || typeof db !== "object") db = {};
  Object.keys(db).forEach(k=>{
    if(!Array.isArray(db[k])) db[k] = [];
  });
}

var fetchActionV3742 = async function fetchActionV3742(action){
  const base = API_URL;
  const url = `${base}${base.includes("?") ? "&" : "?"}action=${encodeURIComponent(action)}&cache=${Date.now()}`;
  console.log("Football Legacy API v3.7.42:", url);

  let data;

  if(API_URL.startsWith("/api/")){
    const res = await fetch(url, {cache:"no-store"});
    data = await res.json();
  }else{
    try{
      data = await fetchJsonp(`${API_URL}?action=${encodeURIComponent(action)}`);
    }catch(err){
      const res = await fetch(url, {cache:"no-store"});
      data = await res.json();
    }
  }

  if(!data || !data.ok){
    throw new Error(data?.error || `action=${action} indisponível`);
  }

  return data.data || {};
}

var mergeDbV3742 = function mergeDbV3742(partial){
  if(!db || typeof db !== "object") db = {};
  Object.keys(partial || {}).forEach(k=>{
    db[k] = Array.isArray(partial[k]) ? partial[k] : [];
  });
  normalizeDbAfterLoadV3742();
}

var loadData = async function loadData(){
  setStatus("Carregando resumo...");

  try{
    const summary = await fetchActionV3742("summary");
    db = {};
    mergeDbV3742(summary);
    FL_FULL_DB_LOADED = false;

    console.log("Football Legacy SUMMARY carregado:", {
      CARREIRA_TEMPORADAS:getTable("CARREIRA_TEMPORADAS").length,
      ESTATISTICAS_CARREIRA:getTable("ESTATISTICAS_CARREIRA").length,
      BOLA_DE_OURO_CARREIRA:getTable("BOLA_DE_OURO_CARREIRA").length,
      COMPETICOES:getTable("COMPETICOES").length
    });

    renderAll();
    setStatus("Resumo carregado.", "ok");
  }catch(err){
    console.warn("Summary falhou, carregando all:", err);

    try{
      setStatus("Resumo indisponível. Carregando banco completo...");
      const full = await fetchActionV3742("all");
      db = full;
      normalizeDbAfterLoadV3742();
      FL_FULL_DB_LOADED = true;

      renderAll();
      setStatus("Dados carregados.", "ok");
    }catch(fullErr){
      console.error(fullErr);
      setStatus("Erro ao carregar Google Sheets: " + fullErr.message, "error");
    }
  }
}

var loadFullDbV3742 = async function loadFullDbV3742(reason=""){
  if(FL_FULL_DB_LOADED || FL_FULL_DB_LOADING) return;

  FL_FULL_DB_LOADING = true;
  setStatus(`Carregando base completa${reason ? " para " + reason : ""}...`);

  try{
    const full = await fetchActionV3742("all");
    db = full;
    normalizeDbAfterLoadV3742();
    FL_FULL_DB_LOADED = true;
    renderAll();
    setStatus("Base completa carregada.", "ok");
  }catch(err){
    console.error(err);
    setStatus("Erro ao carregar base completa: " + err.message, "error");
  }finally{
    FL_FULL_DB_LOADING = false;
  }
}

var forceRefreshData = async function forceRefreshData(){
  FL_FULL_DB_LOADED = false;
  await loadFullDbV3742("atualização manual");
}

window.forceRefreshData = forceRefreshData;
window.loadFullDbV3742 = loadFullDbV3742;

// Carrega base completa apenas quando clicar em abas pesadas.
// Sem sobrescrever navigate; usa captura de clique em botões/links existentes.
document.addEventListener("click", function(e){
  const el = e.target.closest("[data-page], .nav-btn, .sidebar button, .tab-btn");
  if(!el) return;

  const txt = (el.dataset?.page || el.textContent || "").toLowerCase();

  const heavy =
    txt.includes("bola") ||
    txt.includes("records") ||
    txt.includes("recordes") ||
    txt.includes("trofé") ||
    txt.includes("trofe") ||
    txt.includes("museu");

  if(heavy && !FL_FULL_DB_LOADED){
    setTimeout(()=>loadFullDbV3742("aba pesada"), 100);
  }
}, true);



// ===== V3.7.43 SUMMARY THEN BACKGROUND FULL =====
// Fluxo:
// 1. summary carrega e renderiza o Resumo rápido.
// 2. depois de 800ms, action=all carrega em segundo plano.
// 3. se o usuário clicar em aba pesada antes de terminar, não duplica request.

let FL_BG_FULL_TIMER = null;

var loadData = async function loadData(){
  setStatus("Carregando resumo...");

  try{
    const summary = await fetchActionV3742("summary");
    db = {};
    mergeDbV3742(summary);
    FL_FULL_DB_LOADED = false;

    console.log("Football Legacy SUMMARY carregado:", {
      CARREIRA_TEMPORADAS:getTable("CARREIRA_TEMPORADAS").length,
      ESTATISTICAS_CARREIRA:getTable("ESTATISTICAS_CARREIRA").length,
      BOLA_DE_OURO_CARREIRA:getTable("BOLA_DE_OURO_CARREIRA").length,
      COMPETICOES:getTable("COMPETICOES").length
    });

    renderAll();
    setStatus("Resumo carregado. Carregando base completa em segundo plano...", "ok");

    if(FL_BG_FULL_TIMER) clearTimeout(FL_BG_FULL_TIMER);

    FL_BG_FULL_TIMER = setTimeout(()=>{
      loadFullDbV3743Background();
    }, 800);

  }catch(err){
    console.warn("Summary falhou, carregando all:", err);

    try{
      setStatus("Resumo indisponível. Carregando banco completo...");
      const full = await fetchActionV3742("all");
      db = full;
      normalizeDbAfterLoadV3742();
      FL_FULL_DB_LOADED = true;

      renderAll();
      setStatus("Dados carregados.", "ok");
    }catch(fullErr){
      console.error(fullErr);
      setStatus("Erro ao carregar Google Sheets: " + fullErr.message, "error");
    }
  }
}

var loadFullDbV3743Background = async function loadFullDbV3743Background(){
  if(FL_FULL_DB_LOADED || FL_FULL_DB_LOADING) return;

  FL_FULL_DB_LOADING = true;

  try{
    const full = await fetchActionV3742("all");

    // Guarda página atual para não jogar o usuário para outro lugar.
    const activePage =
      document.querySelector(".page.active")?.id ||
      document.querySelector("section.active")?.id ||
      "";

    db = full;
    normalizeDbAfterLoadV3742();
    FL_FULL_DB_LOADED = true;

    console.log("Football Legacy FULL carregado em segundo plano:", {
      CARREIRA_TEMPORADAS:getTable("CARREIRA_TEMPORADAS").length,
      ESTATISTICAS_CARREIRA:getTable("ESTATISTICAS_CARREIRA").length,
      BOLA_DE_OURO_BASE:getTable("BOLA_DE_OURO_BASE").length,
      RECORDS_BASE:getTable("RECORDS_BASE").length
    });

    renderAll();

    // Tenta preservar a aba atual se o renderAll mexer no estado.
    if(activePage && typeof navigate === "function"){
      try{ navigate(activePage); }catch(err){}
    }

    setStatus("Base completa carregada em segundo plano.", "ok");
  }catch(err){
    console.warn("Base completa em segundo plano falhou:", err);
    setStatus("Resumo carregado. Base completa falhou; use Atualizar se precisar.", "warn");
  }finally{
    FL_FULL_DB_LOADING = false;
  }
}

var loadFullDbV3742 = async function loadFullDbV3742(reason=""){
  if(FL_FULL_DB_LOADED || FL_FULL_DB_LOADING) return;

  FL_FULL_DB_LOADING = true;
  setStatus(`Carregando base completa${reason ? " para " + reason : ""}...`);

  try{
    const full = await fetchActionV3742("all");
    db = full;
    normalizeDbAfterLoadV3742();
    FL_FULL_DB_LOADED = true;
    renderAll();
    setStatus("Base completa carregada.", "ok");
  }catch(err){
    console.error(err);
    setStatus("Erro ao carregar base completa: " + err.message, "error");
  }finally{
    FL_FULL_DB_LOADING = false;
  }
}

var forceRefreshData = async function forceRefreshData(){
  FL_FULL_DB_LOADED = false;
  if(FL_BG_FULL_TIMER) clearTimeout(FL_BG_FULL_TIMER);
  await loadFullDbV3742("atualização manual");
}

window.forceRefreshData = forceRefreshData;
window.loadFullDbV3742 = loadFullDbV3742;
window.loadFullDbV3743Background = loadFullDbV3743Background;



// ===== V3.7.44 BOLA DE OURO ESCUDO + RECORDS MEU NÚMERO =====
// Não mexe em temporada.
// Não mexe em saveSeason.
// Não mexe em Apps Script.

const clubBadgeCacheV3744 = {};

var normalizeClubKeyV3744 = function normalizeClubKeyV3744(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/football club|futebol clube|sociedade esportiva|fc|cf|ac|sc|afc|calcio|club de futbol/g,"")
    .replace(/[^a-z0-9]/g,"");
}

var getBallonClubNameV3744 = function getBallonClubNameV3744(row){
  return row.clube || row.club || row.time || row.equipe || "";
}

var getClubBadgeFromDbV3744 = function getClubBadgeFromDbV3744(clubName){
  if(!clubName) return "";

  const first = String(clubName).split("/")[0].split(",")[0].trim();
  const clubs = getTable("CLUBES");

  const found = clubs.find(c=>{
    const a = normalizeClubKeyV3744(c.nome);
    const b = normalizeClubKeyV3744(first);
    return a && b && (a === b || a.includes(b) || b.includes(a));
  });

  return found?.escudo || "";
}

var getClubBadgeStaticV3744 = function getClubBadgeStaticV3744(clubName){
  const key = normalizeClubKeyV3744(clubName);

  const map = {
    realmadrid:"https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png",
    barcelona:"https://r2.thesportsdb.com/images/media/team/badge/kkk3w61558409356.png",
    manchestercity:"https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png",
    manchesterunited:"https://r2.thesportsdb.com/images/media/team/badge/xzqdr11517660252.png",
    liverpool:"https://r2.thesportsdb.com/images/media/team/badge/spqlmo1583434991.png",
    bayernmunich:"https://r2.thesportsdb.com/images/media/team/badge/2m8psv1686848407.png",
    bayernmunchen:"https://r2.thesportsdb.com/images/media/team/badge/2m8psv1686848407.png",
    borussiadortmund:"https://r2.thesportsdb.com/images/media/team/badge/yqppxq1473504813.png",
    psg:"https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png",
    parissaintgermain:"https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png",
    chelsea:"https://r2.thesportsdb.com/images/media/team/badge/yvwvtu1448813215.png",
    arsenal:"https://r2.thesportsdb.com/images/media/team/badge/uyhbfe1612467038.png",
    juventus:"https://r2.thesportsdb.com/images/media/team/badge/83jffy1687276118.png",
    milan:"https://r2.thesportsdb.com/images/media/team/badge/0i78xi1629706488.png",
    acmilan:"https://r2.thesportsdb.com/images/media/team/badge/0i78xi1629706488.png",
    intermilan:"https://r2.thesportsdb.com/images/media/team/badge/1dwuox1687866515.png",
    internazionale:"https://r2.thesportsdb.com/images/media/team/badge/1dwuox1687866515.png",
    napoli:"https://r2.thesportsdb.com/images/media/team/badge/xqk4oz1630590102.png",
    atleticomadrid:"https://r2.thesportsdb.com/images/media/team/badge/83meck1670837138.png",
    benfica:"https://r2.thesportsdb.com/images/media/team/badge/vwuqur1466189654.png",
    porto:"https://r2.thesportsdb.com/images/media/team/badge/yxstss1466189652.png",
    ajax:"https://r2.thesportsdb.com/images/media/team/badge/gtqurq1466026297.png",
    newcastle:"https://r2.thesportsdb.com/images/media/team/badge/2j5uli1590251329.png",
    newcastleunited:"https://r2.thesportsdb.com/images/media/team/badge/2j5uli1590251329.png",
    corinthians:"https://r2.thesportsdb.com/images/media/team/badge/vvuvps1473538042.png",
    flamengo:"https://r2.thesportsdb.com/images/media/team/badge/uzqoqt1473452887.png",
    palmeiras:"https://r2.thesportsdb.com/images/media/team/badge/1vxxu21613513711.png",
    saopaulo:"https://r2.thesportsdb.com/images/media/team/badge/1k42ae1613514162.png",
    intermiami:"https://r2.thesportsdb.com/images/media/team/badge/0w7ywq1591511372.png"
  };

  return map[key] || "";
}

var getClubBadgeInitialV3744 = function getClubBadgeInitialV3744(clubName){
  if(!clubName) return "";
  return getClubBadgeFromDbV3744(clubName) || getClubBadgeStaticV3744(clubName) || "";
}

var fetchClubBadgeApiV3744 = async function fetchClubBadgeApiV3744(clubName){
  const first = String(clubName || "").split("/")[0].split(",")[0].trim();
  const key = normalizeClubKeyV3744(first);

  if(!first || !key) return "";
  if(clubBadgeCacheV3744[key] !== undefined) return clubBadgeCacheV3744[key];

  const initial = getClubBadgeInitialV3744(first);
  if(initial){
    clubBadgeCacheV3744[key] = initial;
    return initial;
  }

  try{
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(first)}`;
    const res = await fetch(url);
    const data = await res.json();
    const teams = data?.teams || [];

    const exact = teams.find(t=>normalizeClubKeyV3744(t.strTeam) === key) || teams[0];
    const badge = exact?.strBadge || "";

    clubBadgeCacheV3744[key] = badge || "";
    return badge || "";
  }catch(err){
    console.warn("Não consegui buscar escudo via API:", first, err);
    clubBadgeCacheV3744[key] = "";
    return "";
  }
}

var ballonClubBadgeHtmlV3744 = function ballonClubBadgeHtmlV3744(row){
  const club = getBallonClubNameV3744(row);
  if(!club) return "";

  const badge = getClubBadgeInitialV3744(club);
  const safeClub = escapeAttr(club);

  if(badge){
    return `<img class="ballon-club-badge-v3744" src="${escapeAttr(badge)}" title="${safeClub}" onerror="this.remove()">`;
  }

  return `<span class="ballon-club-badge-placeholder-v3744" data-club="${safeClub}" title="${safeClub}"></span>`;
}

var enrichBallonClubBadgesV3744 = async function enrichBallonClubBadgesV3744(){
  const placeholders = [...document.querySelectorAll(".ballon-club-badge-placeholder-v3744[data-club]")];

  for(const ph of placeholders){
    const club = ph.dataset.club || "";
    const badge = await fetchClubBadgeApiV3744(club);

    if(badge && ph.isConnected){
      const img = document.createElement("img");
      img.className = "ballon-club-badge-v3744";
      img.src = badge;
      img.title = club;
      img.onerror = () => img.remove();
      ph.replaceWith(img);
    }
  }
}

var renderBolaOuro = function renderBolaOuro(){
  renderBallonSeasonSelector();

  const all = getBallonAllRowsForCurrentView();
  const season = getActiveBallonSeason();

  const rawRows = all
    .filter(r=>!season || String(r.temporada)===String(season))
    .sort((a,b)=>num(a.posicao)-num(b.posicao));

  const rows = uniqueBallonRows(rawRows).slice(0,10);
  const winner = rows.find(r=>String(r.posicao)==="1") || rows[0];

  setText("ballonSeasonLabel", season?`1º ao 10º colocado • ${season}`:"1º ao 10º colocado");

  const poster = $("ballon-poster");
  if(poster){
    const url = winner && (winner.imagem_destaque_url || winner.imagem_url || winner.url || "");
    if(url){
      poster.classList.add("has-image");
      poster.style.backgroundImage = `url("${url}")`;
    }else{
      poster.classList.remove("has-image");
      poster.style.backgroundImage = "";
    }
  }

  const list = $("ballon-ranking-list");
  if(!list) return;

  list.innerHTML = `<div class="ballon-head"><div>#</div><div>Jogador</div><div>Idade</div><div>Valor</div><div></div></div>`+
  rows.map(r=>{
    return `<div class="ballon-row ${String(r.posicao)==="1"?"first":""}">
      <div>${r.posicao||"-"}</div>
      <div class="ballon-player-cell ballon-player-cell-v3744">
        <span class="flag-dot">${flagFrom(r.nacionalidade || r.pais)}</span>
        <button onclick="openPlayerByName('${escapeAttr(r.jogador||"")}')">${escapeHtml(r.jogador||"-")}</button>
        ${ballonClubBadgeHtmlV3744(r)}
      </div>
      <div>${escapeHtml(r.idade || r.idade_na_premiacao || "-")}</div>
      <div>${escapeHtml(r.valor_mercado || "-")}</div>
      <div class="ballon-actions"><button onclick="openForm('${r.__source==="base" ? "bolaourobase" : "bolaouro"}','${r.id}')">Editar</button></div>
    </div>`;
  }).join("")+
  (!rows.length?`<div class="ballon-row"><div>-</div><div>Nenhum ranking cadastrado para esta temporada.</div><div>-</div><div>-</div><div></div></div>`:"");

  enrichBallonClubBadgesV3744();
}

var renderRecordRowsList = function renderRecordRowsList(containerId, allRows, category, label){
  const el = $(containerId);
  if(!el) return;

  const sortedAll = allRows
    .filter(r=>r.categoria===category)
    .sort((a,b)=>num(b.valor)-num(a.valor) || String(a.jogador).localeCompare(String(b.jogador)));

  const top3 = sortedAll.slice(0,3);
  const protagonist = sortedAll.find(r=>r.isProtagonist);
  const protagonistInTop3 = protagonist && top3.some(r=>r === protagonist);

  if(!sortedAll.length){
    el.innerHTML = `<div class="record-empty">Sem dados suficientes.</div>`;
    return;
  }

  const rowsToRender = [...top3];

  if(protagonist && !protagonistInTop3){
    rowsToRender.push(Object.assign({}, protagonist, {
      __myNumber: true,
      __realRank: sortedAll.indexOf(protagonist) + 1
    }));
  }

  el.innerHTML = rowsToRender.map((r,i)=>`
    <article class="record-row ${r.isProtagonist ? "is-player-record" : ""} ${r.__myNumber ? "my-record-outside-top" : ""}">
      <div class="record-rank">${r.__myNumber ? "Meu" : i+1}</div>
      <div class="record-main">
        <strong>${escapeHtml(r.jogador)}</strong>
        <small>
          ${r.__myNumber ? `Meu número no filtro • posição ${r.__realRank}` : escapeHtml(r.clube || r.competicao || r.escopo_nome || "Base real")}
          ${!r.__myNumber && r.temporada ? " • " + escapeHtml(r.temporada) : ""}
          ${r.__myNumber && r.temporada ? " • " + escapeHtml(r.temporada) : ""}
        </small>
      </div>
      <div class="record-value">
        <strong>${num(r.valor)}</strong>
        <small>${escapeHtml(label)}</small>
      </div>
    </article>
  `).join("");
}

window.renderBolaOuro = renderBolaOuro;
window.renderRecordRowsList = renderRecordRowsList;



// ===== V3.7.59 HARD RESET STABLE TABS =====
// Objetivo: impedir sobras de DOM/patcheamento ao trocar de aba.
// Não injeta seleção, previsão ou idade. Apenas limpa resíduos e restaura navegação estável.

var flCleanInjectedGarbageV3759 = function flCleanInjectedGarbageV3759(){
  try{
    document.querySelectorAll([
      ".selection-season-cell-v3756",
      ".career-selection-card-v3756",
      ".career-selection-card-v3757",
      ".career-projection-v3747",
      ".career-projection-v3750",
      ".career-projection-v3751",
      ".career-projection-v3752",
      ".career-projection-v3755",
      ".career-projection-v3757",
      ".season-age-badge-v3745",
      ".season-age-badge-v3746",
      ".season-age-badge-v3747",
      ".season-age-badge-v3750",
      ".season-age-badge-v3751",
      ".season-age-pill-v3757"
    ].join(",")).forEach(el=>el.remove());

    document.querySelectorAll("*").forEach(el=>{
      el.classList.remove(
        "season-row-with-selection-v3756",
        "season-row-pretty-v3757",
        "summary-metrics-row-v3757",
        "summary-stats-row-v3755",
        "summary-stats-with-projection-v3754",
        "summary-stats-with-projection-v3753",
        "player-photo-box-v3751",
        "season-emblem-wrap-v3757",
        "season-emblem-box-fixed-v3751",
        "season-emblem-box-clean-v3750",
        "season-emblem-box-fixed-v3747"
      );
    });
  }catch(err){
    console.warn("Limpeza v3.7.59 falhou:", err);
  }
}

// Limpa resíduos antes e depois da troca de página, sem sobrescrever a lógica de navegação.
document.addEventListener("click", function(e){
  const nav = e.target.closest("[data-page], .nav-btn, .sidebar button, nav button, aside button");
  if(nav){
    flCleanInjectedGarbageV3759();
    setTimeout(flCleanInjectedGarbageV3759, 80);
    setTimeout(flCleanInjectedGarbageV3759, 400);
  }
}, true);

const __renderAllOriginalV3759 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3759 && !window.__renderAllHardResetWrappedV3759){
  window.__renderAllHardResetWrappedV3759 = true;
  renderAll = function(){
    flCleanInjectedGarbageV3759();
    const result = __renderAllOriginalV3759.apply(this, arguments);
    setTimeout(flCleanInjectedGarbageV3759, 120);
    return result;
  };
}

window.flCleanInjectedGarbageV3759 = flCleanInjectedGarbageV3759;


// ===== V3.7.60 SELEÇÕES ESTRUTURAL LIMPO =====
// Esta versão NÃO injeta seleção por cima do layout antigo.
// Ela sobrescreve renderDashboardJourney e renderPlayedSeasons com HTML próprio e estável.

const NATIONAL_TEAM_BADGES_V3760 = {
  brasil:"https://r2.thesportsdb.com/images/media/team/badge/8phz9z1678283124.png",
  brazil:"https://r2.thesportsdb.com/images/media/team/badge/8phz9z1678283124.png",
  argentina:"https://r2.thesportsdb.com/images/media/team/badge/2xxo8u1678283348.png",
  franca:"https://r2.thesportsdb.com/images/media/team/badge/r57asx1678283296.png",
  france:"https://r2.thesportsdb.com/images/media/team/badge/r57asx1678283296.png",
  espanha:"https://r2.thesportsdb.com/images/media/team/badge/okzv471678283240.png",
  spain:"https://r2.thesportsdb.com/images/media/team/badge/okzv471678283240.png",
  portugal:"https://r2.thesportsdb.com/images/media/team/badge/9qd9bp1678283232.png",
  inglaterra:"https://r2.thesportsdb.com/images/media/team/badge/xqprrv1678283151.png",
  england:"https://r2.thesportsdb.com/images/media/team/badge/xqprrv1678283151.png",
  alemanha:"https://r2.thesportsdb.com/images/media/team/badge/x9i0ms1678283200.png",
  germany:"https://r2.thesportsdb.com/images/media/team/badge/x9i0ms1678283200.png",
  italia:"https://r2.thesportsdb.com/images/media/team/badge/6av5u51678283175.png",
  italy:"https://r2.thesportsdb.com/images/media/team/badge/6av5u51678283175.png",
  holanda:"https://r2.thesportsdb.com/images/media/team/badge/3c12ss1678283263.png",
  netherlands:"https://r2.thesportsdb.com/images/media/team/badge/3c12ss1678283263.png",
  uruguai:"https://r2.thesportsdb.com/images/media/team/badge/xqgw8j1678283317.png",
  uruguay:"https://r2.thesportsdb.com/images/media/team/badge/xqgw8j1678283317.png"
};

var flKeyV3760 = function flKeyV3760(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var normalizeSelectionNameV3760 = function normalizeSelectionNameV3760(value){
  const raw = String(value || "").trim();
  const key = flKeyV3760(raw);
  const aliases = {
    brasileiro:"Brasil", brasileira:"Brasil", brasil:"Brasil", brazil:"Brasil",
    argentino:"Argentina", argentina:"Argentina",
    frances:"França", francesa:"França", franca:"França", france:"França",
    espanhol:"Espanha", espanhola:"Espanha", espanha:"Espanha", spain:"Espanha",
    portugues:"Portugal", portuguesa:"Portugal", portugal:"Portugal",
    ingles:"Inglaterra", inglesa:"Inglaterra", inglaterra:"Inglaterra", england:"Inglaterra",
    alemao:"Alemanha", alema:"Alemanha", alemanha:"Alemanha", germany:"Alemanha",
    italiano:"Itália", italiana:"Itália", italia:"Itália", italy:"Itália",
    holandes:"Holanda", holandesa:"Holanda", holanda:"Holanda", netherlands:"Holanda",
    uruguaio:"Uruguai", uruguaia:"Uruguai", uruguai:"Uruguai", uruguay:"Uruguai"
  };
  return aliases[key] || raw;
}

var getSelectionBadgeV3760 = function getSelectionBadgeV3760(name){
  const norm = normalizeSelectionNameV3760(name);
  return NATIONAL_TEAM_BADGES_V3760[flKeyV3760(norm)] || "";
}

var getPlayerImageV3760 = function getPlayerImageV3760(p){
  if(!p) return "";
  return (
    p.foto ||
    p.imagem_url ||
    p.foto_url ||
    p.image_url ||
    p.avatar_url ||
    p.avatar ||
    p.url_imagem ||
    ""
  );
}

var getActivePlayerSelectionV3760 = function getActivePlayerSelectionV3760(){
  const p = typeof getActiveProtagonist === "function" ? getActiveProtagonist() : null;
  if(!p) return "";
  return normalizeSelectionNameV3760(
    p.selecao || p.seleção || p.selecao_nacional || p.national_team || p.nacionalidade || ""
  );
}

var getSelectionRowsV3760 = function getSelectionRowsV3760(){
  const carreiraId = active?.carreira_id || "";
  const personagemId = active?.protagonista_id || "";
  return getTable("SELECOES_CARREIRA").filter(r =>
    (!carreiraId || String(r.carreira_id) === String(carreiraId)) &&
    (!personagemId || String(r.personagem_id) === String(personagemId))
  );
}

var getSelectionRowForSeasonV3760 = function getSelectionRowForSeasonV3760(season){
  if(!season) return null;
  return getSelectionRowsV3760().find(r =>
    String(r.carreira_temporada_id || "") === String(season.id || "") ||
    String(r.temporada || "") === String(season.temporada || "")
  ) || null;
}

var getSelectionTotalsV3760 = function getSelectionTotalsV3760(){
  return getSelectionRowsV3760().reduce((acc,r)=>{
    acc.selecao = normalizeSelectionNameV3760(r.selecao || acc.selecao);
    acc.jogos += Number(r.jogos || 0);
    acc.gols += Number(r.gols || 0);
    acc.assistencias += Number(r.assistencias || 0);
    if(String(r.titulos || "").trim()) acc.titulos.push(String(r.titulos).trim());
    return acc;
  },{
    selecao:getActivePlayerSelectionV3760(),
    jogos:0,
    gols:0,
    assistencias:0,
    titulos:[]
  });
}

var parseBirthV3760 = function parseBirthV3760(value){
  const raw = String(value || "").trim();
  if(!raw) return null;
  if(/^\d{1,3}$/.test(raw)) return {ageFixed:Number(raw)};

  let m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m) return {year:Number(m[3]), month:Number(m[2]), day:Number(m[1])};

  m = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m) return {year:Number(m[1]), month:Number(m[2]), day:Number(m[3])};

  const d = new Date(raw);
  if(!Number.isNaN(d.getTime()) && d.getFullYear() > 1900){
    return {year:d.getFullYear(), month:d.getMonth()+1, day:d.getDate()};
  }
  return null;
}

var getBirthValueV3760 = function getBirthValueV3760(){
  const p = typeof getActiveProtagonist === "function" ? getActiveProtagonist() : null;
  if(!p) return "";
  return p.data_nascimento || p.idade || p.nascimento || p.aniversario || "";
}

var getSeasonStartV3760 = function getSeasonStartV3760(season){
  const raw = String(season?.data_inicio || "").trim();
  let m = raw.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if(m) return {year:Number(m[1]), month:Number(m[2]), day:Number(m[3] || 1)};

  const temp = String(season?.temporada || "");
  m = temp.match(/(\d{4})\s*\/\s*(\d{4})/);
  if(m) return {year:Number(m[1]), month:8, day:1};

  m = temp.match(/(\d{4})/);
  if(m) return {year:Number(m[1]), month:1, day:1};

  return null;
}

var calcAgeAtSeasonV3760 = function calcAgeAtSeasonV3760(season){
  const birth = parseBirthV3760(getBirthValueV3760());
  const start = getSeasonStartV3760(season);
  if(!birth) return "";
  if(birth.ageFixed !== undefined) return birth.ageFixed;
  if(!start) return "";

  let age = start.year - birth.year;
  if(start.month < birth.month || (start.month === birth.month && start.day < birth.day)) age--;
  if(!Number.isFinite(age) || age < 0 || age > 80) return "";
  return age;
}

// FIX V3.8.12: idade também no fim da temporada, para exibir em faixa
// (ex: "25 a 26 anos") quando o aniversário do jogador cai durante a temporada.
var getSeasonEndV3760 = function getSeasonEndV3760(season){
  const raw = String(season?.data_fim || "").trim();
  let m = raw.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if(m) return {year:Number(m[1]), month:Number(m[2]), day:Number(m[3] || 1)};

  const temp = String(season?.temporada || "");
  m = temp.match(/(\d{4})\s*\/\s*(\d{4})/);
  if(m) return {year:Number(m[2]), month:6, day:30};

  m = temp.match(/(\d{4})/);
  if(m) return {year:Number(m[1]), month:12, day:31};

  return null;
}

var calcAgeAtDateV3760 = function calcAgeAtDateV3760(birth, dateObj){
  if(!birth) return "";
  if(birth.ageFixed !== undefined) return birth.ageFixed;
  if(!dateObj) return "";

  let age = dateObj.year - birth.year;
  if(dateObj.month < birth.month || (dateObj.month === birth.month && dateObj.day < birth.day)) age--;
  if(!Number.isFinite(age) || age < 0 || age > 80) return "";
  return age;
}

var calcAgeRangeAtSeasonV3760 = function calcAgeRangeAtSeasonV3760(season){
  const birth = parseBirthV3760(getBirthValueV3760());
  const start = getSeasonStartV3760(season);
  const end = getSeasonEndV3760(season);

  return {
    start: calcAgeAtDateV3760(birth, start),
    end: calcAgeAtDateV3760(birth, end)
  };
}

var getSeasonAggregatesV3760 = function getSeasonAggregatesV3760(){
  const rows = getCareerSeasonRecords();
  return rows.map(season=>{
    const stats = getSeasonStatsForRecord(season);
    return {
      season,
      age: calcAgeAtSeasonV3760(season),
      jogos: stats.reduce((a,s)=>a+num(s.jogos),0),
      gols: stats.reduce((a,s)=>a+num(s.gols),0),
      assistencias: stats.reduce((a,s)=>a+num(s.assistencias),0)
    };
  }).filter(x=>x.jogos || x.gols || x.assistencias);
}

var getCareerTotalsV3760 = function getCareerTotalsV3760(){
  const rows = getSeasonAggregatesV3760();
  return rows.reduce((acc,r)=>{
    acc.jogos += r.jogos;
    acc.gols += r.gols;
    acc.assistencias += r.assistencias;
    return acc;
  },{jogos:0,gols:0,assistencias:0});
}

var buildProjectionV3760 = function buildProjectionV3760(){
  const rows = getSeasonAggregatesV3760();
  const totals = getCareerTotalsV3760();
  const seasonCount = Math.max(1, rows.length || 1);

  const avg = {
    jogos: totals.jogos / seasonCount,
    gols: totals.gols / seasonCount,
    assistencias: totals.assistencias / seasonCount
  };

  let currentAge = "";
  const ages = rows.map(r=>Number(r.age)).filter(Number.isFinite);
  if(ages.length) currentAge = Math.max(...ages);

  if(currentAge === ""){
    const birth = parseBirthV3760(getBirthValueV3760());
    if(birth?.ageFixed) currentAge = birth.ageFixed;
    else currentAge = 17 + Math.max(0, seasonCount - 1);
  }

  const seasonsLeft = Math.max(0, 38 - Number(currentAge));

  const future = {
    jogos: avg.jogos * seasonsLeft,
    gols: avg.gols * seasonsLeft,
    assistencias: avg.assistencias * seasonsLeft
  };

  return {
    currentAge,
    seasonsLeft,
    totals,
    avg,
    future,
    final:{
      jogos: totals.jogos + future.jogos,
      gols: totals.gols + future.gols,
      assistencias: totals.assistencias + future.assistencias
    }
  };
}

var applyPlayerCardOverlay = function applyPlayerCardOverlay(protagonist){
  const shell = findPlayerCardShell ? findPlayerCardShell() : null;
  if(!shell) return;

  const name = protagonist?.nome || "Football Legacy";
  const meta = protagonist ? `${protagonist.posicao || "-"} • ${protagonist.nacionalidade || "-"}` : "SELECIONE UM PROTAGONISTA";
  const photo = getPlayerImageV3760(protagonist);

  shell.classList.add("player-card-shell-fixed");
  shell.innerHTML = `
    <div class="player-card-onepiece ${photo ? "has-photo" : ""}">
      ${photo ? `<img src="${escapeAttr(photo)}" alt="${escapeAttr(name)}">` : `<div class="player-card-fl">FL</div>`}
      <div class="player-card-shade"></div>
      <div class="player-card-overlay-name">
        <strong id="mainCharacter">${escapeHtml(name)}</strong>
        <span id="mainCharacterSub">${escapeHtml(meta)}</span>
      </div>
    </div>
  `;
}

var renderMetricGroupV3760 = function renderMetricGroupV3760(title, data, extra=""){
  return `
    <div class="metric-group-v3760">
      <div class="metric-group-title-v3760">${escapeHtml(title)}${extra ? `<span>${escapeHtml(extra)}</span>` : ""}</div>
      <div class="career-total-strip career-total-strip-v3760">
        <div><strong>${Math.round(data.jogos)}</strong><span>Jogos</span></div>
        <div><strong>${Math.round(data.gols)}</strong><span>Gols</span></div>
        <div><strong>${Math.round(data.assistencias)}</strong><span>Assistências</span></div>
      </div>
    </div>
  `;
}

var renderDashboardJourney = function renderDashboardJourney(){
  const user = getActiveUser();
  const career = getActiveCareer();
  const protagonist = getActiveProtagonist();
  const stats = getProtagonistStats();
  const season = getCurrentSeason(stats);
  const journey = buildClubJourney();
  const totals = getCareerTotalsV3760();
  const projection = buildProjectionV3760();
  const selectionTotals = getSelectionTotalsV3760();
  const selectionBadge = getSelectionBadgeV3760(selectionTotals.selecao);

  setText("careerNameSide", career ? career.nome : "Football Legacy");
  setText("careerMetaSide", user ? user.nome : "Google Sheets");

  setText("currentSeason", season || "Banco conectado");
  setText("mainCharacterTitle", protagonist ? protagonist.nome : "Protagonista");
  setText("mainCharacterDesc", career ? (career.descricao || "Resumo da carreira do jogador selecionado.") : "Crie uma carreira.");

  applyPlayerCardOverlay(protagonist);

  const meta = document.querySelector(".hero-meta");
  if(meta){
    meta.classList.add("club-journey-hero");
    meta.innerHTML = `
      <div class="career-metrics-area-v3760">
        ${renderMetricGroupV3760("Atual", totals)}
        ${renderMetricGroupV3760("Previsto até 38 anos", projection.final, `${projection.currentAge} anos • ${projection.seasonsLeft} temp.`)}
      </div>

      <div class="club-journey-head">
        <span>Clubes da carreira</span>
      </div>
      <div class="club-journey-strip clean-club-strip club-strip-with-selection-v3760">
        ${journey.length ? journey.map(c=>`
          <button class="club-journey-item clean-club-item" onclick="openClubJourney('${escapeAttr(c.key)}')" title="${escapeAttr(c.clube_nome)}">
            <span class="club-crest-wrap clean-club-crest">
              ${c.escudo ? `<img src="${escapeAttr(c.escudo)}" onerror="this.parentElement.innerHTML='<b>⚽</b>'">` : `<b>⚽</b>`}
            </span>
            <strong>${escapeHtml(c.clube_nome)}</strong>
            <small>${escapeHtml(c.firstSeason)}${c.lastSeason && c.lastSeason!==c.firstSeason ? " - " + escapeHtml(c.lastSeason) : ""}</small>
            <span class="club-full-stats">
              <span><b>${c.jogos}</b> Jogos</span>
              <span><b>${c.gols}</b> Gols</span>
              <span><b>${c.assistencias}</b> Assistências</span>
            </span>
          </button>
        `).join("") : `<div class="season-empty">Nenhum clube jogado ainda.</div>`}

        <div class="club-journey-item clean-club-item selection-career-card-v3760" title="${escapeAttr(selectionTotals.selecao || "Seleção")}">
          <span class="club-crest-wrap clean-club-crest">
            ${selectionBadge ? `<img src="${escapeAttr(selectionBadge)}" onerror="this.parentElement.innerHTML='<b>🌎</b>'">` : `<b>🌎</b>`}
          </span>
          <strong>${escapeHtml(selectionTotals.selecao || "Seleção")}</strong>
          <small>Seleção</small>
          <span class="club-full-stats">
            <span><b>${selectionTotals.jogos}</b> Jogos</span>
            <span><b>${selectionTotals.gols}</b> Gols</span>
            <span><b>${selectionTotals.assistencias}</b> Assistências</span>
          </span>
        </div>
      </div>
    `;
  }
}

var renderSelectionCellV3760 = function renderSelectionCellV3760(season){
  const row = getSelectionRowForSeasonV3760(season);
  const selecao = normalizeSelectionNameV3760(row?.selecao || getActivePlayerSelectionV3760());
  const badge = getSelectionBadgeV3760(selecao);

  return `
    <div class="season-selection-card-v3760">
      <div class="season-selection-main-v3760">
        <span class="season-selection-badge-v3760">
          ${badge ? `<img src="${escapeAttr(badge)}" onerror="this.parentElement.innerHTML='🌎'">` : `🌎`}
        </span>
        <div>
          <strong>${escapeHtml(selecao || "Seleção")}</strong>
          <small>${row ? `${Number(row.jogos||0)} jogos • ${Number(row.gols||0)} gols • ${Number(row.assistencias||0)} assist.` : "Sem dados"}</small>
          ${row?.titulos ? `<small class="season-selection-title-v3760">${escapeHtml(row.titulos)}</small>` : ""}
        </div>
      </div>
      <button onclick="openSelectionSeasonModalV3760('${escapeAttr(season.id)}')">Editar seleção</button>
    </div>
  `;
}

var renderPlayedSeasons = function renderPlayedSeasons(){
  const container = $("playedSeasonsCards") || $("playedSeasonsTable");
  if(!container) return;

  const rows = getCareerSeasonRecords()
    .sort((a,b)=>compareSeasonsDesc(a.temporada,b.temporada) || String(b.data_inicio||"").localeCompare(String(a.data_inicio||"")));

  if(!rows.length){
    container.innerHTML = `<div class="season-empty">Nenhuma temporada cadastrada ainda.</div>`;
    return;
  }

  container.innerHTML = rows.map(r=>{
    const stats = getSeasonStatsForRecord(r);
    const jogos = stats.reduce((acc,s)=>acc+num(s.jogos),0);
    const gols = stats.reduce((acc,s)=>acc+num(s.gols),0);
    const assistencias = stats.reduce((acc,s)=>acc+num(s.assistencias),0);
    const avgGoals = jogos ? (gols/jogos).toFixed(2) : "0.00";
    const avgAssists = jogos ? (assistencias/jogos).toFixed(2) : "0.00";
    const ageRange = calcAgeRangeAtSeasonV3760(r);
    const ageLabel = ageRange.start !== "" && ageRange.end !== "" && ageRange.end !== ageRange.start
      ? `${ageRange.start} a ${ageRange.end} anos`
      : (ageRange.start !== "" ? `${ageRange.start} anos` : "");
    const periodo = (r.data_inicio || r.data_fim) ? `${r.data_inicio || "?"} até ${r.data_fim || "?"}` : "";

    return `
      <article class="season-card season-card-v3760">
        <div class="season-club-side-v3760">
          <div class="season-club-crest season-club-crest-v3760">
            ${r.escudo ? `<img src="${escapeAttr(r.escudo)}" onerror="this.parentElement.innerHTML='<span>⚽</span>'">` : `<span>⚽</span>`}
          </div>
          ${ageLabel ? `<span class="season-age-v3760">${ageLabel}</span>` : ""}
          <div class="season-club-info-v3760">
            <strong>${escapeHtml(r.temporada || "-")}</strong>
            <h4>${escapeHtml(r.clube_nome || r.time || "-")}</h4>
            ${periodo ? `<small>${escapeHtml(periodo)}</small>` : ""}
          </div>
        </div>

        <div class="season-stats-grid-v3760">
          <div class="season-stat"><small>Jogos</small><strong>${jogos}</strong></div>
          <div class="season-stat"><small>Gols</small><strong>${gols}</strong></div>
          <div class="season-stat"><small>Assistências</small><strong>${assistencias}</strong></div>
          <div class="season-stat"><small>Gols por jogo</small><strong>${avgGoals}</strong></div>
          <div class="season-stat"><small>Assistências por jogo</small><strong>${avgAssists}</strong></div>
        </div>

        ${renderSelectionCellV3760(r)}

        <div class="season-actions season-actions-v3760">
          <button onclick="editSeasonRecord('${escapeAttr(r.id)}')">Editar temporada</button>
        </div>
      </article>
    `;
  }).join("");
}

var openSelectionSeasonModalV3760 = function openSelectionSeasonModalV3760(seasonId){
  const season = getCareerSeasonRecords().find(s=>String(s.id)===String(seasonId));
  if(!season){
    alert("Temporada não encontrada.");
    return;
  }

  const old = getSelectionRowForSeasonV3760(season) || {};
  const selecao = normalizeSelectionNameV3760(old.selecao || getActivePlayerSelectionV3760());
  const badge = getSelectionBadgeV3760(selecao);

  modalTitle.textContent = `Editar seleção • ${season.temporada}`;
  modalBox.classList.add("wide");
  form.className = "selection-season-form-v3760";

  form.innerHTML = `
    <div class="selection-season-modal-v3760">
      <div class="selected-team active">
        ${badge ? `<img src="${escapeAttr(badge)}" onerror="this.style.display='none'">` : ""}
        <div>
          <strong>${escapeHtml(selecao || "Seleção")}</strong>
          <small>${escapeHtml(season.temporada || "")}</small>
        </div>
      </div>

      <div class="season-flow-grid">
        <div class="form-field">
          <label>Seleção</label>
          <input name="selecao" value="${escapeAttr(selecao)}" placeholder="Ex: Brasil">
        </div>
        <div class="form-field">
          <label>Jogos</label>
          <input name="jogos" type="number" value="${escapeAttr(old.jogos || "")}">
        </div>
        <div class="form-field">
          <label>Gols</label>
          <input name="gols" type="number" value="${escapeAttr(old.gols || "")}">
        </div>
        <div class="form-field">
          <label>Assistências</label>
          <input name="assistencias" type="number" value="${escapeAttr(old.assistencias || "")}">
        </div>
      </div>

      <div class="form-field full">
        <label>Títulos pela seleção nessa temporada</label>
        <input name="titulos" value="${escapeAttr(old.titulos || "")}" placeholder="Ex: Copa América, Copa do Mundo">
      </div>

      <div class="form-field full">
        <label>Observação</label>
        <input name="observacao" value="${escapeAttr(old.observacao || "")}">
      </div>

      <div class="form-actions">
        <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
        <button class="gold-btn" id="saveBtn">Salvar seleção</button>
      </div>
    </div>
  `;

  form.onsubmit = async e=>{
    e.preventDefault();
    const btn = $("saveBtn");
    if(btn && btn.disabled) return;
    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      const record = {
        carreira_id: active.carreira_id || "",
        personagem_id: active.protagonista_id || "",
        carreira_temporada_id: season.id || "",
        temporada: season.temporada || "",
        selecao: normalizeSelectionNameV3760(data.selecao || selecao),
        jogos: data.jogos || "",
        gols: data.gols || "",
        assistencias: data.assistencias || "",
        titulos: data.titulos || "",
        observacao: data.observacao || ""
      };

      const payload = old.id
        ? {action:"update", table:"SELECOES_CARREIRA", id:old.id, record}
        : {action:"create", table:"SELECOES_CARREIRA", record};

      const result = await apiPost(payload);
      if(!result.ok) throw new Error(result.error || "Erro ao salvar seleção.");

      if(!Array.isArray(db.SELECOES_CARREIRA)) db.SELECOES_CARREIRA = [];

      if(old.id){
        const idx = db.SELECOES_CARREIRA.findIndex(r=>String(r.id)===String(old.id));
        if(idx >= 0) db.SELECOES_CARREIRA[idx] = Object.assign({}, db.SELECOES_CARREIRA[idx], record);
      }else{
        db.SELECOES_CARREIRA.push(Object.assign({}, record, result?.data || {}, {id:result?.data?.id || result?.id || ("local_"+Date.now())}));
      }

      clearButtonSaving(btn);
      closeModal();
      renderAll();
      setStatus("Seleção salva.", "ok");
    }catch(err){
      clearButtonSaving(btn);
      console.error(err);
      setStatus("Erro ao salvar seleção: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

var injectSelectionFieldOnPersonagemFormV3760 = function injectSelectionFieldOnPersonagemFormV3760(){
  try{
    if(!form || !modal?.classList?.contains("active")) return;
    const names = [...form.querySelectorAll("input,select,textarea")]
      .map(i=>String(i.name || "").toLowerCase());

    const isPersonagem = names.includes("carreira_id") && names.includes("nome") && names.includes("posicao") && names.includes("nacionalidade");
    if(!isPersonagem || form.querySelector("[name='selecao']")) return;

    const id = form.querySelector("[name='id']")?.value || "";
    const p = id ? getTable("PERSONAGENS").find(x=>String(x.id)===String(id)) : getActiveProtagonist();
    const value = normalizeSelectionNameV3760(p?.selecao || p?.selecao_nacional || p?.nacionalidade || "");

    const html = `
      <div class="form-field personagem-selection-field-v3760">
        <label>Seleção</label>
        <input name="selecao" value="${escapeAttr(value)}" placeholder="Ex: Brasil, Argentina, Portugal">
        <small>A seleção será usada no Resumo e nas estatísticas por temporada.</small>
      </div>
    `;
    const nac = form.querySelector("[name='nacionalidade']");
    const field = nac?.closest(".form-field");
    if(field) field.insertAdjacentHTML("afterend", html);
    else form.insertAdjacentHTML("beforeend", html);
  }catch(err){
    console.warn("Falha campo seleção:", err);
  }
}

const __apiPostOriginalV3760 = typeof apiPost === "function" ? apiPost : null;
if(__apiPostOriginalV3760 && !window.__apiPostSelectionWrappedV3760){
  window.__apiPostSelectionWrappedV3760 = true;
  apiPost = async function(payload){
    try{
      if(payload && payload.table === "PERSONAGENS" && payload.record){
        const input = form?.querySelector("[name='selecao']");
        if(input){
          payload.record.selecao = normalizeSelectionNameV3760(input.value || "");
          payload.record.selecao_nacional = payload.record.selecao;
        }
      }
    }catch(err){}
    return await __apiPostOriginalV3760(payload);
  };
}

const __openFormOriginalV3760 = typeof openForm === "function" ? openForm : null;
if(__openFormOriginalV3760 && !window.__openFormSelectionWrappedV3760){
  window.__openFormSelectionWrappedV3760 = true;
  openForm = function(){
    const result = __openFormOriginalV3760.apply(this, arguments);
    setTimeout(injectSelectionFieldOnPersonagemFormV3760, 120);
    setTimeout(injectSelectionFieldOnPersonagemFormV3760, 450);
    return result;
  };
}

window.openSelectionSeasonModalV3760 = openSelectionSeasonModalV3760;








// ===== V3.7.66 BOLA DE OURO HEADER FIX =====
// Correção focada:
// - não usa valor de input file, para nunca salvar C:\fakepath;
// - lê o modal por linha real de ranking;
// - monta payload com nomes exatos das colunas atuais da planilha;
// - usa action direta saveBallonCareerRankingV2;
// - não altera formatação.

var FL_normText_3766 = function FL_normText_3766(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_cleanUrl_3766 = function FL_cleanUrl_3766(value){
  const raw = String(value || "").trim();
  if(!raw) return "";
  if(raw.toLowerCase().includes("fakepath")) return "";
  if(raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return "";
}

var FL_normalizeBallonSeason_3766 = function FL_normalizeBallonSeason_3766(value){
  const raw = String(value || "").trim();
  let m = raw.match(/-\s*(\d{4})$/);
  if(m) return m[1];

  m = raw.match(/(\d{4})\s*\/\s*(\d{4})/);
  if(m) return m[2];

  m = raw.match(/(\d{4})/);
  if(m) return m[1];

  return raw;
}

var FL_getBallonSeason_3766 = function FL_getBallonSeason_3766(){
  const root = form || document;
  const candidates = [
    root.querySelector("[name='temporada']"),
    root.querySelector("[name='ano']"),
    root.querySelector("#ballonSeason"),
    root.querySelector("select")
  ].filter(Boolean);

  for(const el of candidates){
    const v = FL_normalizeBallonSeason_3766(el.value);
    if(v) return v;
  }

  return "";
}

var FL_getBallonWinnerImage_3766 = function FL_getBallonWinnerImage_3766(){
  const root = form || document;

  const candidates = [
    root.querySelector("[name='imagem_destaque_url']"),
    root.querySelector("[name='imagem_url']"),
    root.querySelector("#ballonWinnerImage"),
    ...root.querySelectorAll("input[type='url']"),
    ...root.querySelectorAll("input:not([type='file'])")
  ].filter(Boolean);

  for(const el of candidates){
    const name = FL_normText_3766(el.name || el.id || el.placeholder || "");
    const value = FL_cleanUrl_3766(el.value);
    if(!value) continue;

    if(
      name.includes("imagem") ||
      name.includes("image") ||
      name.includes("url") ||
      value.includes("cloudinary.com") ||
      value.match(/\.(png|jpe?g|webp|gif)(\?|$)/i)
    ){
      return value;
    }
  }

  return "";
}

var FL_getInputsByMeaning_3766 = function FL_getInputsByMeaning_3766(row){
  const inputs = [...row.querySelectorAll("input,select,textarea")]
    .filter(i => i.type !== "file");

  const byName = (patterns) => {
    for(const input of inputs){
      const key = FL_normText_3766([
        input.name,
        input.id,
        input.dataset?.field,
        input.placeholder,
        input.getAttribute("aria-label")
      ].join(" "));
      if(patterns.some(p => key.includes(p))) return input.value || "";
    }
    return "";
  };

  return {
    jogador: byName(["jogador","player","nome"]),
    pais: byName(["pais","nacionalidade","country"]),
    clube: byName(["clube","club","time","team"]),
    idade: byName(["idade","age"]),
    valor_mercado: byName(["valor","mercado","market","euro"])
  };
}

var FL_isBallonRankingRow_3766 = function FL_isBallonRankingRow_3766(row){
  const inputs = [...row.querySelectorAll("input,select,textarea")]
    .filter(i => i.type !== "file");

  if(inputs.length < 3) return false;

  const txt = FL_normText_3766(row.textContent || "");
  const joined = inputs.map(i => FL_normText_3766([
    i.name, i.id, i.placeholder, i.dataset?.field, i.getAttribute("aria-label")
  ].join(" "))).join(" ");

  return (
    txt.includes("jogador") ||
    joined.includes("jogador") ||
    joined.includes("player") ||
    inputs.length >= 5
  );
}

var FL_getBallonRows_3766 = function FL_getBallonRows_3766(){
  const root = form || document;

  let rowEls = [
    ...root.querySelectorAll("tr"),
    ...root.querySelectorAll(".ballon-form-row,.ballon-row-form,.ranking-row,.form-ranking-row,.ballon-player-row,.ranking-player-row")
  ];

  rowEls = rowEls
    .filter(FL_isBallonRankingRow_3766)
    .filter((el, idx, arr) => !arr.some(other => other !== el && other.contains(el)));

  const rows = [];

  rowEls.forEach((rowEl, idx) => {
    const inputs = [...rowEl.querySelectorAll("input,select,textarea")]
      .filter(i => i.type !== "file");

    let mapped = FL_getInputsByMeaning_3766(rowEl);

    // Fallback pela ordem visual do modal:
    // jogador | pais | clube | idade | valor
    if(!mapped.jogador && inputs[0]) mapped.jogador = inputs[0].value || "";
    if(!mapped.pais && inputs[1]) mapped.pais = inputs[1].value || "";
    if(!mapped.clube && inputs[2]) mapped.clube = inputs[2].value || "";
    if(!mapped.idade && inputs[3]) mapped.idade = inputs[3].value || "";
    if(!mapped.valor_mercado && inputs[4]) mapped.valor_mercado = inputs[4].value || "";

    if(!String(mapped.jogador || "").trim()) return;

    rows.push({
      posicao: idx + 1,
      jogador: String(mapped.jogador || "").trim(),
      pais: String(mapped.pais || "").trim(),
      nacionalidade: String(mapped.pais || "").trim(),
      clube: String(mapped.clube || "").trim(),
      idade: String(mapped.idade || "").trim(),
      idade_na_premiacao: String(mapped.idade || "").trim(),
      valor_mercado: String(mapped.valor_mercado || "").trim(),
      observacao: "",
      overall: "",
      carreira_temporada_id: ""
    });
  });

  // Último fallback: procura inputs pelos placeholders conhecidos do print.
  if(!rows.length){
    const playerInputs = [...root.querySelectorAll("input,select,textarea")]
      .filter(i => i.type !== "file")
      .filter(i => {
        const k = FL_normText_3766([i.name,i.id,i.placeholder,i.dataset?.field].join(" "));
        return k.includes("jogador");
      });

    playerInputs.forEach((playerInput, idx) => {
      const row = playerInput.closest("tr,.ballon-form-row,.ballon-row-form,.ranking-row,.form-ranking-row,.ballon-player-row,div");
      if(!row) return;

      const inputs = [...row.querySelectorAll("input,select,textarea")].filter(i => i.type !== "file");
      const mapped = FL_getInputsByMeaning_3766(row);

      rows.push({
        posicao: idx + 1,
        jogador: String(mapped.jogador || playerInput.value || "").trim(),
        pais: String(mapped.pais || inputs[1]?.value || "").trim(),
        nacionalidade: String(mapped.pais || inputs[1]?.value || "").trim(),
        clube: String(mapped.clube || inputs[2]?.value || "").trim(),
        idade: String(mapped.idade || inputs[3]?.value || "").trim(),
        idade_na_premiacao: String(mapped.idade || inputs[3]?.value || "").trim(),
        valor_mercado: String(mapped.valor_mercado || inputs[4]?.value || "").trim(),
        observacao: "",
        overall: "",
        carreira_temporada_id: ""
      });
    });
  }

  return rows.slice(0,10);
}

var FL_saveBallonRanking_3766 = async function FL_saveBallonRanking_3766(){
  const btn = $("saveBtn") || document.querySelector(".gold-btn") || document.querySelector("button[type='submit']");
  if(btn && btn.disabled) return;

  const temporada = FL_getBallonSeason_3766();
  const imagem = FL_getBallonWinnerImage_3766();
  const rows = FL_getBallonRows_3766();

  console.log("Bola de Ouro v3.7.66 payload:", { temporada, imagem, rows });

  if(!temporada){
    setStatus("Erro ao salvar Bola de Ouro: temporada vazia.", "error");
    return;
  }

  if(!rows.length){
    setStatus("Erro ao salvar Bola de Ouro: nenhum jogador encontrado no formulário.", "error");
    return;
  }

  setButtonSaving(btn);

  try{
    const result = await apiPost({
      action: "saveBallonCareerRankingV2",
      carreira_id: active?.carreira_id || "",
      temporada,
      imagem_destaque_url: imagem,
      rows
    });

    if(!result || !result.ok){
      throw new Error(result?.error || "Apps Script não confirmou o salvamento.");
    }

    if(!Array.isArray(db.BOLA_DE_OURO_CARREIRA)) db.BOLA_DE_OURO_CARREIRA = [];
    db.BOLA_DE_OURO_CARREIRA = db.BOLA_DE_OURO_CARREIRA.filter(r => String(r.temporada) !== String(temporada));

    const saved = result.data?.rows || [];
    saved.forEach(r => db.BOLA_DE_OURO_CARREIRA.push(Object.assign({}, r, {__source:"career"})));

    clearButtonSaving(btn);
    closeModal();
    renderAll();
    setStatus("Ranking Bola de Ouro salvo corretamente na planilha.", "ok");
  }catch(err){
    clearButtonSaving(btn);
    console.error(err);
    setStatus("Erro ao salvar Bola de Ouro: " + err.message, "error");
  }
}

window.saveBallonRankingCareerV3761 = FL_saveBallonRanking_3766;
window.saveBallonRankingCareerV3762 = FL_saveBallonRanking_3766;
window.saveBallonRankingCareerV3764 = FL_saveBallonRanking_3766;
window.FL_saveBallonRanking_3766 = FL_saveBallonRanking_3766;

document.addEventListener("submit", function(e){
  const title = (modalTitle?.textContent || "").toLowerCase();
  const txt = (form?.textContent || "").toLowerCase();
  const isBallon = title.includes("bola de ouro") || txt.includes("ranking bola de ouro");

  if(isBallon){
    e.preventDefault();
    e.stopImmediatePropagation();
    FL_saveBallonRanking_3766();
  }
}, true);


// ===== V3.7.67 EXCLUIR TEMPORADA JOGADA =====
// Adiciona um X discreto em cada card de Temporadas jogadas.
// Ao confirmar, apaga a temporada e dados vinculados da planilha.

var deleteCareerSeasonFullV3767 = async function deleteCareerSeasonFullV3767(seasonId){
  const season = (typeof getCareerSeasonRecords === "function" ? getCareerSeasonRecords() : getTable("CARREIRA_TEMPORADAS"))
    .find(s => String(s.id) === String(seasonId));

  if(!season){
    setStatus("Temporada não encontrada para excluir.", "error");
    return;
  }

  const label = `${season.temporada || ""} - ${season.clube_nome || season.time || ""}`.trim();

  const ok = confirm(
    `Excluir esta temporada?\n\n${label}\n\nIsso apaga somente a temporada e as estatísticas dessa temporada.`
  );

  if(!ok) return;

  try{
    setStatus("Excluindo temporada...", "loading");

    const result = await apiPost({
      action: "deleteSeasonFull",
      id: season.id,
      carreira_temporada_id: season.id
    });

    if(!result || !result.ok){
      throw new Error(result?.error || "Apps Script não confirmou a exclusão.");
    }

    // Atualiza banco local.
    if(Array.isArray(db.CARREIRA_TEMPORADAS)){
      db.CARREIRA_TEMPORADAS = db.CARREIRA_TEMPORADAS.filter(r => String(r.id) !== String(season.id));
    }

    // Apaga localmente apenas estatísticas da temporada.
    // Não apaga CAMPEOES_CARREIRA, SELECOES_CARREIRA, TOP11_CARREIRA ou BOLA_DE_OURO_CARREIRA.
    if(Array.isArray(db.ESTATISTICAS_CARREIRA)){
      db.ESTATISTICAS_CARREIRA = db.ESTATISTICAS_CARREIRA.filter(r => String(r.carreira_temporada_id || "") !== String(season.id));
    }

    if(typeof renderAll === "function") renderAll();

    setStatus("Temporada excluída da planilha.", "ok");
  }catch(err){
    console.error(err);
    setStatus("Erro ao excluir temporada: " + err.message, "error");
  }
}

var injectDeleteSeasonButtonsV3767 = function injectDeleteSeasonButtonsV3767(){
  try{
    const seasons = typeof getCareerSeasonRecords === "function" ? getCareerSeasonRecords() : [];
    if(!seasons.length) return;

    const candidates = [...document.querySelectorAll("article, .season-card, .played-season-card, .career-season-card, .season-row-card, .temporada-card, div")]
      .filter(card=>{
        if(card.querySelector(".delete-season-x-v3767")) return false;

        const txt = card.textContent || "";
        const rect = card.getBoundingClientRect();

        if(rect.width < 500 || rect.height < 60) return false;
        if(!/editar/i.test(txt)) return false;
        if(!/jogos|gols|assist/i.test(txt)) return false;

        return seasons.some(s =>
          txt.includes(String(s.temporada || "")) &&
          txt.includes(String(s.clube_nome || s.time || ""))
        );
      });

    const finalCards = candidates.filter(card=>!candidates.some(other=>other !== card && other.contains(card)));

    finalCards.forEach(card=>{
      const txt = card.textContent || "";
      const season = seasons.find(s =>
        txt.includes(String(s.temporada || "")) &&
        txt.includes(String(s.clube_nome || s.time || ""))
      );

      if(!season) return;

      card.classList.add("season-card-delete-ready-v3767");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "delete-season-x-v3767";
      btn.title = "Excluir temporada";
      btn.innerHTML = "×";
      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        deleteCareerSeasonFullV3767(season.id);
      });

      card.appendChild(btn);
    });
  }catch(err){
    console.warn("Falha ao inserir botões de excluir temporada:", err);
  }
}

const __renderAllOriginalV3767 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3767 && !window.__renderAllDeleteSeasonWrappedV3767){
  window.__renderAllDeleteSeasonWrappedV3767 = true;

  renderAll = function(){
    const result = __renderAllOriginalV3767.apply(this, arguments);
    setTimeout(injectDeleteSeasonButtonsV3767, 120);
    setTimeout(injectDeleteSeasonButtonsV3767, 800);
    return result;
  };
}

document.addEventListener("click", function(){
  setTimeout(injectDeleteSeasonButtonsV3767, 250);
}, true);

window.deleteCareerSeasonFullV3767 = deleteCareerSeasonFullV3767;
window.injectDeleteSeasonButtonsV3767 = injectDeleteSeasonButtonsV3767;


// ===== V3.7.70 FIX X TEMPORADA VINCULADO AO CARD CERTO =====
// Corrige bug do X de excluir temporada pegando ID de outra temporada.
// Agora o ID vem diretamente do botão Editar temporada do mesmo card:
// editSeasonRecord('ID')

var getSeasonIdFromCardEditButtonV3770 = function getSeasonIdFromCardEditButtonV3770(card){
  if(!card) return "";

  const buttons = [...card.querySelectorAll("button, a")]
    .filter(el => /editar temporada/i.test(el.textContent || "") || String(el.getAttribute("onclick") || "").includes("editSeasonRecord"));

  for(const btn of buttons){
    const onclick = String(btn.getAttribute("onclick") || "");
    const m = onclick.match(/editSeasonRecord\(['"]([^'"]+)['"]\)/);
    if(m && m[1]) return m[1];
  }

  return "";
}

var findSeasonCardByEditButtonV3770 = function findSeasonCardByEditButtonV3770(btn){
  let el = btn.parentElement;

  for(let i=0; i<8 && el; i++){
    const txt = el.textContent || "";
    const rect = el.getBoundingClientRect();

    if(
      rect.width > 400 &&
      rect.height > 50 &&
      /editar temporada/i.test(txt) &&
      /jogos|gols|assist/i.test(txt)
    ){
      return el;
    }

    el = el.parentElement;
  }

  return btn.closest("article, .season-card, .played-season-card, .career-season-card, .season-row-card, .temporada-card") || btn.parentElement;
}

var injectDeleteSeasonButtonsV3770 = function injectDeleteSeasonButtonsV3770(){
  try{
    // Remove botões antigos que foram criados por heurística errada.
    document.querySelectorAll(".delete-season-x-v3767").forEach(btn => btn.remove());

    const editButtons = [...document.querySelectorAll("button, a")]
      .filter(el => {
        const onclick = String(el.getAttribute("onclick") || "");
        return /editar temporada/i.test(el.textContent || "") || onclick.includes("editSeasonRecord");
      });

    editButtons.forEach(editBtn=>{
      const onclick = String(editBtn.getAttribute("onclick") || "");
      const m = onclick.match(/editSeasonRecord\(['"]([^'"]+)['"]\)/);

      if(!m || !m[1]) return;

      const seasonId = m[1];
      const card = findSeasonCardByEditButtonV3770(editBtn);

      if(!card) return;
      if(card.querySelector(`.delete-season-x-v3770[data-season-id="${CSS.escape(String(seasonId))}"]`)) return;

      card.classList.add("season-card-delete-ready-v3767", "season-card-delete-ready-v3770");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "delete-season-x-v3770";
      btn.dataset.seasonId = String(seasonId);
      btn.title = "Excluir esta temporada";
      btn.innerHTML = "×";

      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        deleteCareerSeasonFullV3767(seasonId);
      });

      card.appendChild(btn);
    });
  }catch(err){
    console.warn("Falha ao corrigir X de temporada v3.7.70:", err);
  }
}

const __renderAllOriginalV3770 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3770 && !window.__renderAllDeleteSeasonV3770Wrapped){
  window.__renderAllDeleteSeasonV3770Wrapped = true;

  renderAll = function(){
    const result = __renderAllOriginalV3770.apply(this, arguments);
    setTimeout(injectDeleteSeasonButtonsV3770, 120);
    setTimeout(injectDeleteSeasonButtonsV3770, 800);
    return result;
  };
}

document.addEventListener("click", function(){
  setTimeout(injectDeleteSeasonButtonsV3770, 250);
}, true);

window.injectDeleteSeasonButtonsV3770 = injectDeleteSeasonButtonsV3770;


// ===== V3.7.71 REMOVE X ESPALHADOS =====
// Remove/desativa X genéricos das outras seções.
// Mantém apenas o X correto de temporada jogada, criado pela v3.7.70.

var removeScatteredCareerDeleteXV3771 = function removeScatteredCareerDeleteXV3771(){
  try{
    document.querySelectorAll(".delete-career-item-x-v3769").forEach(el => el.remove());

    document.querySelectorAll(".career-delete-ready-v3769").forEach(el=>{
      el.classList.remove("career-delete-ready-v3769");
    });
  }catch(err){
    console.warn("Falha ao remover X espalhados:", err);
  }
}

// Neutraliza as funções antigas, caso tenham ficado no arquivo/cache.
window.injectSeparatedDeleteButtonsV3769 = function(){
  removeScatteredCareerDeleteXV3771();
};

window.deleteCareerItemV3769 = function(){
  alert("Exclusão separada desativada nesta versão. Use apenas o X de temporada por enquanto.");
};

const __renderAllOriginalV3771 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3771 && !window.__renderAllRemoveScatteredXWrappedV3771){
  window.__renderAllRemoveScatteredXWrappedV3771 = true;

  renderAll = function(){
    const result = __renderAllOriginalV3771.apply(this, arguments);
    setTimeout(removeScatteredCareerDeleteXV3771, 80);
    setTimeout(removeScatteredCareerDeleteXV3771, 500);

    if(typeof injectDeleteSeasonButtonsV3770 === "function"){
      setTimeout(injectDeleteSeasonButtonsV3770, 140);
      setTimeout(injectDeleteSeasonButtonsV3770, 800);
    }

    return result;
  };
}

document.addEventListener("click", function(){
  setTimeout(removeScatteredCareerDeleteXV3771, 120);
  if(typeof injectDeleteSeasonButtonsV3770 === "function"){
    setTimeout(injectDeleteSeasonButtonsV3770, 220);
  }
}, true);

window.removeScatteredCareerDeleteXV3771 = removeScatteredCareerDeleteXV3771;


// ===== V3.7.72 FINAL STABLE TABS + SEASON X ONLY =====
// Pacote final desta rodada.
// Objetivos:
// 1) manter somente o X correto da temporada;
// 2) remover X espalhados;
// 3) evitar bug ao trocar de aba onde fica só o card do jogador;
// 4) não mexer na formatação visual boa;
// 5) manter compatibilidade com Apps Script v3.5.29.

var flSafeNoopV3772 = function flSafeNoopV3772(){}

// Alguns builds antigos chamam funções que podem não existir depois da limpeza.
// Isso quebrava a troca de abas e deixava só o card do jogador na tela.
if(typeof renderSidebar !== "function") window.renderSidebar = flSafeNoopV3772;
if(typeof renderEstatisticas !== "function" && typeof renderStats === "function") window.renderEstatisticas = renderStats;
if(typeof renderEstatisticas !== "function") window.renderEstatisticas = flSafeNoopV3772;
if(typeof renderTrofeus !== "function" && typeof renderTrophies === "function") window.renderTrofeus = renderTrophies;
if(typeof renderTrofeus !== "function") window.renderTrofeus = flSafeNoopV3772;
if(typeof renderTop11 !== "function") window.renderTop11 = flSafeNoopV3772;
if(typeof renderMuseu !== "function") window.renderMuseu = flSafeNoopV3772;
if(typeof renderClubes !== "function" && typeof renderClubs === "function") window.renderClubes = renderClubs;
if(typeof renderClubes !== "function") window.renderClubes = flSafeNoopV3772;

var removeScatteredCareerDeleteXV3772 = function removeScatteredCareerDeleteXV3772(){
  try{
    // Remove de vez X genéricos espalhados de CAMPEOES/SELECOES/TOP11/BOLA.
    document.querySelectorAll(".delete-career-item-x-v3769").forEach(el => el.remove());
    document.querySelectorAll(".career-delete-ready-v3769").forEach(el => el.classList.remove("career-delete-ready-v3769"));
  }catch(err){
    console.warn("Falha ao remover X espalhados v3.7.72:", err);
  }
}

var cleanupWrongSeasonXV3772 = function cleanupWrongSeasonXV3772(){
  try{
    // Remove os X antigos que usavam heurística por texto e podiam apontar para outra temporada.
    document.querySelectorAll(".delete-season-x-v3767").forEach(el => el.remove());
  }catch(err){}
}

var getSeasonIdFromCardEditButtonV3772 = function getSeasonIdFromCardEditButtonV3772(card){
  if(!card) return "";

  const buttons = [...card.querySelectorAll("button, a")]
    .filter(el => /editar temporada/i.test(el.textContent || "") || String(el.getAttribute("onclick") || "").includes("editSeasonRecord"));

  for(const btn of buttons){
    const onclick = String(btn.getAttribute("onclick") || "");
    const m = onclick.match(/editSeasonRecord\(['"]([^'"]+)['"]\)/);
    if(m && m[1]) return m[1];
  }

  return "";
}

var findSeasonCardByEditButtonV3772 = function findSeasonCardByEditButtonV3772(btn){
  let el = btn.parentElement;

  for(let i=0; i<10 && el; i++){
    const txt = el.textContent || "";
    const rect = el.getBoundingClientRect();

    if(
      rect.width > 400 &&
      rect.height > 50 &&
      /editar temporada/i.test(txt) &&
      /jogos|gols|assist/i.test(txt)
    ){
      return el;
    }

    el = el.parentElement;
  }

  return btn.closest("article, .season-card, .played-season-card, .career-season-card, .season-row-card, .temporada-card") || btn.parentElement;
}

var injectDeleteSeasonButtonsV3772 = function injectDeleteSeasonButtonsV3772(){
  try{
    cleanupWrongSeasonXV3772();

    const editButtons = [...document.querySelectorAll("button, a")]
      .filter(el => {
        const onclick = String(el.getAttribute("onclick") || "");
        return /editar temporada/i.test(el.textContent || "") || onclick.includes("editSeasonRecord");
      });

    editButtons.forEach(editBtn=>{
      const onclick = String(editBtn.getAttribute("onclick") || "");
      const m = onclick.match(/editSeasonRecord\(['"]([^'"]+)['"]\)/);
      if(!m || !m[1]) return;

      const seasonId = String(m[1]);
      const card = findSeasonCardByEditButtonV3772(editBtn);
      if(!card) return;

      // Evita duplicar.
      if(card.querySelector(`.delete-season-x-v3772[data-season-id="${CSS.escape(seasonId)}"]`)) return;

      // Se ainda existir o v3770, deixa só um botão final.
      card.querySelectorAll(".delete-season-x-v3770").forEach(old => old.remove());

      card.classList.add("season-card-delete-ready-v3772");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "delete-season-x-v3772";
      btn.dataset.seasonId = seasonId;
      btn.title = "Excluir esta temporada";
      btn.innerHTML = "×";

      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();

        if(typeof deleteCareerSeasonFullV3767 === "function"){
          deleteCareerSeasonFullV3767(seasonId);
        }else{
          alert("Função de excluir temporada não encontrada.");
        }
      });

      card.appendChild(btn);
    });
  }catch(err){
    console.warn("Falha ao inserir X correto de temporada v3.7.72:", err);
  }
}

// Corrige tela quebrada ao trocar de aba.
// O bug acontecia quando uma renderização falhava e sobrava apenas card do jogador.
var cleanupOrphanPlayerCardOnNonResumoV3772 = function cleanupOrphanPlayerCardOnNonResumoV3772(){
  try{
    const activeNav = [...document.querySelectorAll(".active, .selected, [aria-current='page']")]
      .map(el => (el.textContent || "").toLowerCase())
      .join(" ");

    const isResumo =
      activeNav.includes("resumo") ||
      document.body.dataset.page === "resumo" ||
      location.hash.toLowerCase().includes("resumo");

    if(isResumo) return;

    // Em páginas que não são resumo, remove card grande do jogador se ele ficar órfão.
    const bigCards = [...document.querySelectorAll(".player-card-onepiece, .player-card-shell-fixed, .main-player-card, .player-card")]
      .filter(el=>{
        const rect = el.getBoundingClientRect();
        return rect.width > 180 && rect.height > 220;
      });

    bigCards.forEach(card=>{
      const parentText = (card.parentElement?.textContent || "").toLowerCase();
      const pageLooksEmpty = document.body.innerText.length < 2500;

      if(pageLooksEmpty || !parentText.includes("resumo da carreira")){
        const shell = card.closest(".player-card-shell-fixed, .hero-card, .content-card") || card;
        shell.remove();
      }
    });
  }catch(err){
    console.warn("Falha cleanup card órfão v3.7.72:", err);
  }
}

var stableTabsAfterRenderV3772 = function stableTabsAfterRenderV3772(){
  removeScatteredCareerDeleteXV3772();
  cleanupWrongSeasonXV3772();

  if(typeof injectDeleteSeasonButtonsV3770 === "function"){
    try{ injectDeleteSeasonButtonsV3770(); }catch(err){}
  }

  injectDeleteSeasonButtonsV3772();
  cleanupOrphanPlayerCardOnNonResumoV3772();
}

const __renderAllOriginalV3772 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3772 && !window.__renderAllStableTabsWrappedV3772){
  window.__renderAllStableTabsWrappedV3772 = true;

  renderAll = function(){
    const result = __renderAllOriginalV3772.apply(this, arguments);
    setTimeout(stableTabsAfterRenderV3772, 80);
    setTimeout(stableTabsAfterRenderV3772, 500);
    setTimeout(stableTabsAfterRenderV3772, 1400);
    return result;
  };
}

// Também aplica em troca de aba.
document.addEventListener("click", function(e){
  const navClick = e.target.closest("button, a, [data-page], .nav-item, .sidebar *");
  if(navClick){
    setTimeout(stableTabsAfterRenderV3772, 120);
    setTimeout(stableTabsAfterRenderV3772, 600);
  }
}, true);

window.injectDeleteSeasonButtonsV3772 = injectDeleteSeasonButtonsV3772;
window.removeScatteredCareerDeleteXV3772 = removeScatteredCareerDeleteXV3772;
window.stableTabsAfterRenderV3772 = stableTabsAfterRenderV3772;


// ===== V3.7.73 BOLA DE OURO PREFILL + ESTABILIDADE =====
// Não mexe em formatação.
// 1) Ao selecionar temporada já existente no Bola de Ouro, preenche o ranking.
// 2) Remove limpeza agressiva de card do jogador que causava tela vazia/piscada.

var FL_normV3773 = function FL_normV3773(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_normalizeSeasonV3773 = function FL_normalizeSeasonV3773(value){
  const raw = String(value || "").trim();

  let m = raw.match(/-\s*(\d{4})$/);
  if(m) return m[1];

  m = raw.match(/(\d{4})\s*\/\s*(\d{4})/);
  if(m) return m[2];

  m = raw.match(/(\d{4})/);
  if(m) return m[1];

  return raw;
}

var FL_isBallonModalV3773 = function FL_isBallonModalV3773(){
  const title = (typeof modalTitle !== "undefined" && modalTitle ? modalTitle.textContent : "").toLowerCase();
  const txt = (typeof form !== "undefined" && form ? form.textContent : "").toLowerCase();

  return title.includes("bola de ouro") || txt.includes("ranking bola de ouro") || txt.includes("jogador") && txt.includes("valor");
}

var FL_getBallonSeasonInputV3773 = function FL_getBallonSeasonInputV3773(){
  const root = form || document;

  return (
    root.querySelector("[name='temporada']") ||
    root.querySelector("[name='ano']") ||
    root.querySelector("#ballonSeason") ||
    root.querySelector("select")
  );
}

var FL_getBallonSeasonCurrentV3773 = function FL_getBallonSeasonCurrentV3773(){
  const input = FL_getBallonSeasonInputV3773();
  return FL_normalizeSeasonV3773(input?.value || "");
}

var FL_getExistingBallonRowsV3773 = function FL_getExistingBallonRowsV3773(season){
  const normalized = FL_normalizeSeasonV3773(season);

  const rows = (db.BOLA_DE_OURO_CARREIRA || [])
    .filter(r => {
      const a = FL_normalizeSeasonV3773(r.temporada);
      const b = FL_normalizeSeasonV3773(r.ano);
      return String(a) === String(normalized) || String(b) === String(normalized);
    })
    .sort((a,b) => Number(a.posicao || 999) - Number(b.posicao || 999));

  return rows;
}

var FL_findAncestorWithInputsV3773 = function FL_findAncestorWithInputsV3773(input){
  let el = input;

  for(let i=0; i<8 && el; i++){
    const count = el.querySelectorAll ? el.querySelectorAll("input,select,textarea").length : 0;

    if(count >= 4){
      const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : {height:0,width:0};
      if(rect.width > 300 || count >= 5) return el;
    }

    el = el.parentElement;
  }

  return input.closest("tr,.ballon-form-row,.ballon-row-form,.ranking-row,.form-ranking-row,.ballon-player-row,.ranking-player-row,div");
}

var FL_getBallonInputRowsV3773 = function FL_getBallonInputRowsV3773(){
  const root = form || document;

  let rowEls = [
    ...root.querySelectorAll("tr"),
    ...root.querySelectorAll(".ballon-form-row,.ballon-row-form,.ranking-row,.form-ranking-row,.ballon-player-row,.ranking-player-row")
  ].filter(el => {
    const inputs = [...el.querySelectorAll("input,select,textarea")].filter(i => i.type !== "file");
    if(inputs.length < 4) return false;

    const combined = FL_normV3773(
      inputs.map(i => [i.name,i.id,i.placeholder,i.dataset?.field,i.getAttribute("aria-label")].join(" ")).join(" ")
    );

    return inputs.length >= 5 || combined.includes("jogador") || combined.includes("player");
  });

  // Se não tiver classes de linha, usa cada input "Jogador" como âncora.
  if(!rowEls.length){
    const playerInputs = [...root.querySelectorAll("input,select,textarea")]
      .filter(i => i.type !== "file")
      .filter(i => {
        const key = FL_normV3773([i.name,i.id,i.placeholder,i.dataset?.field,i.getAttribute("aria-label")].join(" "));
        return key.includes("jogador") || key.includes("player");
      });

    rowEls = playerInputs.map(FL_findAncestorWithInputsV3773).filter(Boolean);
  }

  // Remove duplicados e pais que contêm filhos.
  rowEls = [...new Set(rowEls)];
  rowEls = rowEls.filter(el => !rowEls.some(other => other !== el && other.contains(el)));

  return rowEls.slice(0, 10);
}

var FL_inputByMeaningV3773 = function FL_inputByMeaningV3773(row, patterns, fallbackIndex){
  const inputs = [...row.querySelectorAll("input,select,textarea")].filter(i => i.type !== "file");

  for(const input of inputs){
    const key = FL_normV3773([input.name,input.id,input.placeholder,input.dataset?.field,input.getAttribute("aria-label")].join(" "));

    if(patterns.some(p => key.includes(p))) return input;
  }

  return inputs[fallbackIndex] || null;
}

var FL_setInputValueV3773 = function FL_setInputValueV3773(input, value){
  if(!input) return;

  input.value = value || "";
  input.dispatchEvent(new Event("input", {bubbles:true}));
  input.dispatchEvent(new Event("change", {bubbles:true}));
}

var FL_getBallonImageInputV3773 = function FL_getBallonImageInputV3773(){
  const root = form || document;

  const candidates = [
    root.querySelector("[name='imagem_destaque_url']"),
    root.querySelector("[name='imagem_url']"),
    root.querySelector("#ballonWinnerImage"),
    ...root.querySelectorAll("input[type='url']"),
    ...root.querySelectorAll("input:not([type='file'])")
  ].filter(Boolean);

  for(const input of candidates){
    const key = FL_normV3773([input.name,input.id,input.placeholder,input.dataset?.field,input.getAttribute("aria-label")].join(" "));

    if(
      key.includes("imagem") ||
      key.includes("image") ||
      key.includes("url") ||
      String(input.placeholder || "").toLowerCase().includes("url")
    ){
      return input;
    }
  }

  return null;
}

var FL_prefillBallonFromExistingV3773 = function FL_prefillBallonFromExistingV3773(){
  try{
    if(!FL_isBallonModalV3773()) return;

    const season = FL_getBallonSeasonCurrentV3773();
    if(!season) return;

    const rows = FL_getExistingBallonRowsV3773(season);
    const inputRows = FL_getBallonInputRowsV3773();

    if(!rows.length){
      return;
    }

    console.log("Preenchendo Bola de Ouro existente v3.7.73:", season, rows);

    const image =
      rows.find(r => r.imagem_destaque_url || r.imagem_url)?.imagem_destaque_url ||
      rows.find(r => r.imagem_destaque_url || r.imagem_url)?.imagem_url ||
      "";

    const imageInput = FL_getBallonImageInputV3773();
    if(imageInput && image && !String(image).toLowerCase().includes("fakepath")){
      FL_setInputValueV3773(imageInput, image);
    }

    rows.slice(0, 10).forEach((record, index) => {
      const rowEl = inputRows[index];
      if(!rowEl) return;

      FL_setInputValueV3773(
        FL_inputByMeaningV3773(rowEl, ["jogador","player","nome"], 0),
        record.jogador || ""
      );

      FL_setInputValueV3773(
        FL_inputByMeaningV3773(rowEl, ["pais","país","nacionalidade","country"], 1),
        record.pais || record.nacionalidade || ""
      );

      FL_setInputValueV3773(
        FL_inputByMeaningV3773(rowEl, ["clube","club","time","team"], 2),
        record.clube || ""
      );

      FL_setInputValueV3773(
        FL_inputByMeaningV3773(rowEl, ["idade","age"], 3),
        record.idade_na_premiacao || record.idade || ""
      );

      FL_setInputValueV3773(
        FL_inputByMeaningV3773(rowEl, ["valor","mercado","market","euro"], 4),
        record.valor_mercado || ""
      );
    });

    setStatus(`Ranking ${season} carregado para edição.`, "ok");
  }catch(err){
    console.warn("Falha ao preencher Bola de Ouro existente v3.7.73:", err);
  }
}

var FL_attachBallonPrefillListenersV3773 = function FL_attachBallonPrefillListenersV3773(){
  try{
    if(!FL_isBallonModalV3773()) return;

    const seasonInput = FL_getBallonSeasonInputV3773();
    if(seasonInput && !seasonInput.dataset.prefillBallonV3773){
      seasonInput.dataset.prefillBallonV3773 = "1";

      seasonInput.addEventListener("change", () => setTimeout(FL_prefillBallonFromExistingV3773, 120));
      seasonInput.addEventListener("input", () => setTimeout(FL_prefillBallonFromExistingV3773, 220));
    }

    // Preenche ao abrir se já veio com uma temporada selecionada.
    setTimeout(FL_prefillBallonFromExistingV3773, 250);
    setTimeout(FL_prefillBallonFromExistingV3773, 900);
  }catch(err){
    console.warn("Falha listeners Bola de Ouro v3.7.73:", err);
  }
}

// Desativa a limpeza agressiva do v3.7.72 que podia remover card/tela em troca de aba.
window.cleanupOrphanPlayerCardOnNonResumoV3772 = function(){};
window.stableTabsAfterRenderV3772 = function(){
  try{
    if(typeof removeScatteredCareerDeleteXV3772 === "function") removeScatteredCareerDeleteXV3772();
    if(typeof cleanupWrongSeasonXV3772 === "function") cleanupWrongSeasonXV3772();
    if(typeof injectDeleteSeasonButtonsV3772 === "function") injectDeleteSeasonButtonsV3772();
  }catch(err){
    console.warn("stableTabs v3.7.73 falhou:", err);
  }
};

const __renderAllOriginalV3773 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3773 && !window.__renderAllBallonPrefillWrappedV3773){
  window.__renderAllBallonPrefillWrappedV3773 = true;

  renderAll = function(){
    const result = __renderAllOriginalV3773.apply(this, arguments);
    setTimeout(FL_attachBallonPrefillListenersV3773, 150);
    setTimeout(FL_attachBallonPrefillListenersV3773, 900);
    return result;
  };
}

document.addEventListener("click", function(){
  setTimeout(FL_attachBallonPrefillListenersV3773, 250);
}, true);

document.addEventListener("change", function(e){
  if(FL_isBallonModalV3773() && e.target === FL_getBallonSeasonInputV3773()){
    setTimeout(FL_prefillBallonFromExistingV3773, 150);
  }
}, true);

window.FL_prefillBallonFromExistingV3773 = FL_prefillBallonFromExistingV3773;
window.FL_attachBallonPrefillListenersV3773 = FL_attachBallonPrefillListenersV3773;


// ===== V3.7.76 BOLA DE OURO SELECTOR STABLE =====
// Corrige travamento do seletor do Bola de Ouro.
// Não usa listener de input global.
// Não dispara change nos campos preenchidos.
// Só atualiza depois que a temporada realmente muda.

let FL_BALLON_FILLING_V3776 = false;
let FL_BALLON_LAST_SEASON_V3776 = "";

var FL_keyV3776 = function FL_keyV3776(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_isBallonModalV3776 = function FL_isBallonModalV3776(){
  const title = (typeof modalTitle !== "undefined" && modalTitle ? modalTitle.textContent : "").toLowerCase();
  const txt = (typeof form !== "undefined" && form ? form.textContent : "").toLowerCase();
  return title.includes("bola de ouro") || txt.includes("ranking bola de ouro") || (txt.includes("jogador") && txt.includes("valor"));
}

var FL_normalizeSeasonV3776 = function FL_normalizeSeasonV3776(value){
  const raw = String(value || "").trim();

  let m = raw.match(/-\s*(\d{4})$/);
  if(m) return m[1];

  m = raw.match(/(\d{4})\s*\/\s*(\d{4})/);
  if(m) return m[2];

  m = raw.match(/(\d{4})/);
  if(m) return m[1];

  return raw;
}

var FL_getSeasonInputV3776 = function FL_getSeasonInputV3776(){
  const root = form || document;

  return (
    root.querySelector("[name='temporada']") ||
    root.querySelector("[name='ano']") ||
    root.querySelector("#ballonSeason") ||
    root.querySelector("select")
  );
}

var FL_getSeasonV3776 = function FL_getSeasonV3776(){
  const input = FL_getSeasonInputV3776();
  return FL_normalizeSeasonV3776(input?.value || "");
}

var FL_getSavedBallonRowsV3776 = function FL_getSavedBallonRowsV3776(season){
  const normalized = FL_normalizeSeasonV3776(season);

  return (db.BOLA_DE_OURO_CARREIRA || [])
    .filter(r => {
      const a = FL_normalizeSeasonV3776(r.temporada);
      const b = FL_normalizeSeasonV3776(r.ano);
      return String(a) === String(normalized) || String(b) === String(normalized);
    })
    .sort((a,b) => Number(a.posicao || 999) - Number(b.posicao || 999));
}

var FL_typeV3776 = function FL_typeV3776(input){
  const key = FL_keyV3776([
    input.name,
    input.id,
    input.placeholder,
    input.dataset?.field,
    input.getAttribute("aria-label")
  ].join(" "));

  if(input.type === "file") return "file";
  if(key.includes("temporada") || key === "ano" || key.includes("anoboladeouro")) return "season";
  if(key.includes("imagem") || key.includes("image") || key.includes("url")) return "image";
  if(key.includes("jogador") || key.includes("player") || key === "nome") return "jogador";
  if(key.includes("pais") || key.includes("nacionalidade") || key.includes("country")) return "pais";
  if(key.includes("clube") || key.includes("club") || key.includes("time") || key.includes("team")) return "clube";
  if(key.includes("idade") || key.includes("age")) return "idade";
  if(key.includes("valor") || key.includes("mercado") || key.includes("market") || key.includes("euro") || key.includes("90m")) return "valor";
  return "";
}

var FL_getBallonColumnsV3776 = function FL_getBallonColumnsV3776(){
  const root = form || document;
  const result = { jogador: [], pais: [], clube: [], idade: [], valor: [] };

  const inputs = [...root.querySelectorAll("input,select,textarea")]
    .filter(input => input.type !== "file");

  inputs.forEach(input=>{
    const type = FL_typeV3776(input);
    if(result[type]) result[type].push(input);
  });

  const needsFallback = Object.values(result).some(arr => arr.length < 10);

  if(needsFallback){
    const dataInputs = inputs.filter(input=>{
      const type = FL_typeV3776(input);
      return type !== "season" && type !== "image" && type !== "file";
    });

    const fallback = { jogador: [], pais: [], clube: [], idade: [], valor: [] };

    for(let i=0;i<10;i++){
      const base = i * 5;
      if(dataInputs[base]) fallback.jogador.push(dataInputs[base]);
      if(dataInputs[base+1]) fallback.pais.push(dataInputs[base+1]);
      if(dataInputs[base+2]) fallback.clube.push(dataInputs[base+2]);
      if(dataInputs[base+3]) fallback.idade.push(dataInputs[base+3]);
      if(dataInputs[base+4]) fallback.valor.push(dataInputs[base+4]);
    }

    Object.keys(result).forEach(k=>{
      if(fallback[k].length > result[k].length) result[k] = fallback[k];
    });
  }

  return result;
}

var FL_setSilentV3776 = function FL_setSilentV3776(input, value){
  if(!input) return;
  input.value = value || "";
}

var FL_clearRowsV3776 = function FL_clearRowsV3776(){
  const c = FL_getBallonColumnsV3776();

  for(let i=0;i<10;i++){
    FL_setSilentV3776(c.jogador[i], "");
    FL_setSilentV3776(c.pais[i], "");
    FL_setSilentV3776(c.clube[i], "");
    FL_setSilentV3776(c.idade[i], "");
    FL_setSilentV3776(c.valor[i], "");
  }
}

var FL_getImageInputV3776 = function FL_getImageInputV3776(){
  const root = form || document;
  const inputs = [...root.querySelectorAll("input,select,textarea")]
    .filter(input => input.type !== "file");

  return inputs.find(input => FL_typeV3776(input) === "image") || null;
}

var FL_setImageV3776 = function FL_setImageV3776(value){
  const input = FL_getImageInputV3776();
  if(!input) return;

  const clean = String(value || "").toLowerCase().includes("fakepath") ? "" : value;
  FL_setSilentV3776(input, clean || "");
}

var FL_loadBallonSeasonV3776 = function FL_loadBallonSeasonV3776(force=false){
  try{
    if(!FL_isBallonModalV3776()) return;

    const season = FL_getSeasonV3776();
    if(!season) return;

    if(!force && FL_BALLON_LAST_SEASON_V3776 === season) return;

    FL_BALLON_LAST_SEASON_V3776 = season;
    FL_BALLON_FILLING_V3776 = true;

    const rows = FL_getSavedBallonRowsV3776(season);

    // Só limpa depois de saber que a temporada mudou.
    FL_clearRowsV3776();
    FL_setImageV3776("");

    if(!rows.length){
      FL_BALLON_FILLING_V3776 = false;
      setStatus(`Nenhum ranking salvo encontrado para ${season}.`, "ok");
      return;
    }

    const c = FL_getBallonColumnsV3776();

    const image =
      rows.find(r => r.imagem_destaque_url || r.imagem_url)?.imagem_destaque_url ||
      rows.find(r => r.imagem_destaque_url || r.imagem_url)?.imagem_url ||
      "";

    if(image) FL_setImageV3776(image);

    rows.slice(0,10).forEach((record,index)=>{
      FL_setSilentV3776(c.jogador[index], record.jogador || "");
      FL_setSilentV3776(c.pais[index], record.pais || record.nacionalidade || "");
      FL_setSilentV3776(c.clube[index], record.clube || "");
      FL_setSilentV3776(c.idade[index], record.idade_na_premiacao || record.idade || "");
      FL_setSilentV3776(c.valor[index], record.valor_mercado || "");
    });

    FL_BALLON_FILLING_V3776 = false;
    setStatus(`Ranking ${season} carregado para edição.`, "ok");
  }catch(err){
    FL_BALLON_FILLING_V3776 = false;
    console.warn("Falha ao carregar Bola de Ouro v3.7.76:", err);
  }
}

var FL_attachBallonStableSelectorV3776 = function FL_attachBallonStableSelectorV3776(){
  try{
    if(!FL_isBallonModalV3776()) return;

    const input = FL_getSeasonInputV3776();
    if(!input) return;

    if(!input.dataset.stableBallonV3776){
      input.dataset.stableBallonV3776 = "1";

      // Só change. Nada de input, para não travar o dropdown.
      input.addEventListener("change", ()=>{
        if(FL_BALLON_FILLING_V3776) return;

        setTimeout(()=>FL_loadBallonSeasonV3776(true), 120);
      });

      // Blur ajuda quando o navegador não dispara change no datalist em alguns casos.
      input.addEventListener("blur", ()=>{
        if(FL_BALLON_FILLING_V3776) return;

        setTimeout(()=>FL_loadBallonSeasonV3776(true), 180);
      });
    }

    // Ao abrir o modal, carrega uma vez.
    setTimeout(()=>FL_loadBallonSeasonV3776(true), 350);
  }catch(err){
    console.warn("Falha attach seletor estável v3.7.76:", err);
  }
}

// Neutraliza listeners antigos problemáticos.
window.FL_prefillBallonFromExistingV3773 = function(){ FL_loadBallonSeasonV3776(true); };
window.FL_prefillBallonAllPositionsV3774 = function(){ FL_loadBallonSeasonV3776(true); };
window.FL_prefillBallonSelectedSeasonV3775 = function(){ FL_loadBallonSeasonV3776(true); };
window.FL_attachBallonPrefillV3774 = FL_attachBallonStableSelectorV3776;
window.FL_attachBallonSelectorRefreshV3775 = FL_attachBallonStableSelectorV3776;

const __renderAllOriginalV3776 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3776 && !window.__renderAllBallonStableWrappedV3776){
  window.__renderAllBallonStableWrappedV3776 = true;
  renderAll = function(){
    const result = __renderAllOriginalV3776.apply(this, arguments);
    setTimeout(FL_attachBallonStableSelectorV3776, 180);
    return result;
  };
}

document.addEventListener("click", function(){
  setTimeout(FL_attachBallonStableSelectorV3776, 250);
}, true);

window.FL_loadBallonSeasonV3776 = FL_loadBallonSeasonV3776;
window.FL_attachBallonStableSelectorV3776 = FL_attachBallonStableSelectorV3776;


// ===== V3.7.77 BOLA DE OURO NÃO SOBRESCREVE EDIÇÃO =====
// Corrige o problema de preencher certo e depois "voltar atrás" enquanto o usuário edita.
// Regra:
// - troca de temporada => carrega o ranking salvo daquela temporada;
// - qualquer edição em jogador/país/clube/idade/valor/imagem => marca como edição manual;
// - enquanto há edição manual, nenhum auto-preenchimento roda de novo;
// - só libera novo auto-preenchimento se a temporada mudar.

let FL_BALLON_ACTIVE_SEASON_V3777 = "";
let FL_BALLON_USER_DIRTY_V3777 = false;
let FL_BALLON_PROGRAMMATIC_FILL_V3777 = false;
let FL_BALLON_ATTACH_DONE_V3777 = false;

var FL_keyV3777 = function FL_keyV3777(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_isBallonModalV3777 = function FL_isBallonModalV3777(){
  const title = (typeof modalTitle !== "undefined" && modalTitle ? modalTitle.textContent : "").toLowerCase();
  const txt = (typeof form !== "undefined" && form ? form.textContent : "").toLowerCase();
  return title.includes("bola de ouro") || txt.includes("ranking bola de ouro") || (txt.includes("jogador") && txt.includes("valor"));
}

var FL_normalizeSeasonV3777 = function FL_normalizeSeasonV3777(value){
  const raw = String(value || "").trim();

  let m = raw.match(/-\s*(\d{4})$/);
  if(m) return m[1];

  m = raw.match(/(\d{4})\s*\/\s*(\d{4})/);
  if(m) return m[2];

  m = raw.match(/(\d{4})/);
  if(m) return m[1];

  return raw;
}

var FL_getSeasonInputV3777 = function FL_getSeasonInputV3777(){
  const root = form || document;
  return (
    root.querySelector("[name='temporada']") ||
    root.querySelector("[name='ano']") ||
    root.querySelector("#ballonSeason") ||
    root.querySelector("select")
  );
}

var FL_getSeasonV3777 = function FL_getSeasonV3777(){
  const input = FL_getSeasonInputV3777();
  return FL_normalizeSeasonV3777(input?.value || "");
}

var FL_getSavedRowsV3777 = function FL_getSavedRowsV3777(season){
  const normalized = FL_normalizeSeasonV3777(season);

  return (db.BOLA_DE_OURO_CARREIRA || [])
    .filter(r => {
      const a = FL_normalizeSeasonV3777(r.temporada);
      const b = FL_normalizeSeasonV3777(r.ano);
      return String(a) === String(normalized) || String(b) === String(normalized);
    })
    .sort((a,b) => Number(a.posicao || 999) - Number(b.posicao || 999));
}

var FL_fieldTypeV3777 = function FL_fieldTypeV3777(input){
  const key = FL_keyV3777([
    input.name,
    input.id,
    input.placeholder,
    input.dataset?.field,
    input.getAttribute("aria-label")
  ].join(" "));

  if(input.type === "file") return "file";
  if(key.includes("temporada") || key === "ano" || key.includes("anoboladeouro")) return "season";
  if(key.includes("imagem") || key.includes("image") || key.includes("url")) return "image";
  if(key.includes("jogador") || key.includes("player") || key === "nome") return "jogador";
  if(key.includes("pais") || key.includes("nacionalidade") || key.includes("country")) return "pais";
  if(key.includes("clube") || key.includes("club") || key.includes("time") || key.includes("team")) return "clube";
  if(key.includes("idade") || key.includes("age")) return "idade";
  if(key.includes("valor") || key.includes("mercado") || key.includes("market") || key.includes("euro") || key.includes("90m")) return "valor";
  return "";
}

var FL_columnsV3777 = function FL_columnsV3777(){
  const root = form || document;
  const result = { jogador: [], pais: [], clube: [], idade: [], valor: [] };

  const inputs = [...root.querySelectorAll("input,select,textarea")]
    .filter(input => input.type !== "file");

  inputs.forEach(input=>{
    const type = FL_fieldTypeV3777(input);
    if(result[type]) result[type].push(input);
  });

  const needsFallback = Object.values(result).some(arr => arr.length < 10);

  if(needsFallback){
    const dataInputs = inputs.filter(input=>{
      const type = FL_fieldTypeV3777(input);
      return type !== "season" && type !== "image" && type !== "file";
    });

    const fallback = { jogador: [], pais: [], clube: [], idade: [], valor: [] };

    for(let i=0;i<10;i++){
      const base = i * 5;
      if(dataInputs[base]) fallback.jogador.push(dataInputs[base]);
      if(dataInputs[base+1]) fallback.pais.push(dataInputs[base+1]);
      if(dataInputs[base+2]) fallback.clube.push(dataInputs[base+2]);
      if(dataInputs[base+3]) fallback.idade.push(dataInputs[base+3]);
      if(dataInputs[base+4]) fallback.valor.push(dataInputs[base+4]);
    }

    Object.keys(result).forEach(k=>{
      if(fallback[k].length > result[k].length) result[k] = fallback[k];
    });
  }

  return result;
}

var FL_setSilentV3777 = function FL_setSilentV3777(input, value){
  if(!input) return;
  input.value = value || "";
}

var FL_getImageInputV3777 = function FL_getImageInputV3777(){
  const root = form || document;
  const inputs = [...root.querySelectorAll("input,select,textarea")]
    .filter(input => input.type !== "file");
  return inputs.find(input => FL_fieldTypeV3777(input) === "image") || null;
}

var FL_clearRowsV3777 = function FL_clearRowsV3777(){
  const c = FL_columnsV3777();

  for(let i=0;i<10;i++){
    FL_setSilentV3777(c.jogador[i], "");
    FL_setSilentV3777(c.pais[i], "");
    FL_setSilentV3777(c.clube[i], "");
    FL_setSilentV3777(c.idade[i], "");
    FL_setSilentV3777(c.valor[i], "");
  }

  FL_setSilentV3777(FL_getImageInputV3777(), "");
}

var FL_fillSeasonV3777 = function FL_fillSeasonV3777(season){
  try{
    if(!FL_isBallonModalV3777()) return;

    const normalized = FL_normalizeSeasonV3777(season);
    if(!normalized) return;

    // Se o usuário já editou essa mesma temporada, não sobrescreve.
    if(FL_BALLON_USER_DIRTY_V3777 && FL_BALLON_ACTIVE_SEASON_V3777 === normalized){
      return;
    }

    const rows = FL_getSavedRowsV3777(normalized);

    FL_BALLON_PROGRAMMATIC_FILL_V3777 = true;

    FL_clearRowsV3777();

    if(!rows.length){
      FL_BALLON_ACTIVE_SEASON_V3777 = normalized;
      FL_BALLON_USER_DIRTY_V3777 = false;
      FL_BALLON_PROGRAMMATIC_FILL_V3777 = false;
      setStatus(`Nenhum ranking salvo encontrado para ${normalized}.`, "ok");
      return;
    }

    const c = FL_columnsV3777();

    const image =
      rows.find(r => r.imagem_destaque_url || r.imagem_url)?.imagem_destaque_url ||
      rows.find(r => r.imagem_destaque_url || r.imagem_url)?.imagem_url ||
      "";

    if(image && !String(image).toLowerCase().includes("fakepath")){
      FL_setSilentV3777(FL_getImageInputV3777(), image);
    }

    rows.slice(0,10).forEach((record,index)=>{
      FL_setSilentV3777(c.jogador[index], record.jogador || "");
      FL_setSilentV3777(c.pais[index], record.pais || record.nacionalidade || "");
      FL_setSilentV3777(c.clube[index], record.clube || "");
      FL_setSilentV3777(c.idade[index], record.idade_na_premiacao || record.idade || "");
      FL_setSilentV3777(c.valor[index], record.valor_mercado || "");
    });

    FL_BALLON_ACTIVE_SEASON_V3777 = normalized;
    FL_BALLON_USER_DIRTY_V3777 = false;
    FL_BALLON_PROGRAMMATIC_FILL_V3777 = false;

    setStatus(`Ranking ${normalized} carregado para edição.`, "ok");
  }catch(err){
    FL_BALLON_PROGRAMMATIC_FILL_V3777 = false;
    console.warn("Falha fill Bola de Ouro v3.7.77:", err);
  }
}

var FL_handleSeasonChangedV3777 = function FL_handleSeasonChangedV3777(){
  if(!FL_isBallonModalV3777()) return;

  const season = FL_getSeasonV3777();
  const normalized = FL_normalizeSeasonV3777(season);

  if(!normalized) return;

  // Se mudou de temporada, libera preenchimento.
  if(normalized !== FL_BALLON_ACTIVE_SEASON_V3777){
    FL_BALLON_USER_DIRTY_V3777 = false;
    FL_fillSeasonV3777(normalized);
  }
}

var FL_markDirtyIfUserEditV3777 = function FL_markDirtyIfUserEditV3777(e){
  if(!FL_isBallonModalV3777()) return;
  if(FL_BALLON_PROGRAMMATIC_FILL_V3777) return;

  const input = e.target;
  if(!input || !input.matches || !input.matches("input,select,textarea")) return;

  const type = FL_fieldTypeV3777(input);

  if(type === "season"){
    setTimeout(FL_handleSeasonChangedV3777, 80);
    return;
  }

  if(["jogador","pais","clube","idade","valor","image"].includes(type)){
    FL_BALLON_USER_DIRTY_V3777 = true;
  }
}

var FL_attachBallonNoOverwriteV3777 = function FL_attachBallonNoOverwriteV3777(){
  try{
    if(!FL_isBallonModalV3777()) return;

    const season = FL_getSeasonV3777();

    // Ao abrir o modal, carrega uma vez.
    if(!FL_BALLON_ATTACH_DONE_V3777){
      FL_BALLON_ATTACH_DONE_V3777 = true;
      FL_BALLON_ACTIVE_SEASON_V3777 = "";
      FL_BALLON_USER_DIRTY_V3777 = false;
      setTimeout(()=>FL_fillSeasonV3777(season), 250);
    }

    const seasonInput = FL_getSeasonInputV3777();
    if(seasonInput && !seasonInput.dataset.noOverwriteV3777){
      seasonInput.dataset.noOverwriteV3777 = "1";
      seasonInput.addEventListener("change", () => setTimeout(FL_handleSeasonChangedV3777, 80));
      seasonInput.addEventListener("blur", () => setTimeout(FL_handleSeasonChangedV3777, 120));
    }

    if(form && !form.dataset.noOverwriteEditWatchV3777){
      form.dataset.noOverwriteEditWatchV3777 = "1";
      form.addEventListener("input", FL_markDirtyIfUserEditV3777, true);
      form.addEventListener("change", FL_markDirtyIfUserEditV3777, true);
    }
  }catch(err){
    console.warn("Falha attach no-overwrite v3.7.77:", err);
  }
}

// Neutraliza as funções antigas que recarregavam e sobrescreviam edição.
window.FL_loadBallonSeasonV3776 = function(force){
  if(force){
    const season = FL_getSeasonV3777();
    if(season !== FL_BALLON_ACTIVE_SEASON_V3777){
      FL_fillSeasonV3777(season);
    }
  }
};

window.FL_attachBallonStableSelectorV3776 = FL_attachBallonNoOverwriteV3777;
window.FL_prefillBallonFromExistingV3773 = function(){};
window.FL_prefillBallonAllPositionsV3774 = function(){};
window.FL_prefillBallonSelectedSeasonV3775 = function(){};

const __renderAllOriginalV3777 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3777 && !window.__renderAllNoOverwriteWrappedV3777){
  window.__renderAllNoOverwriteWrappedV3777 = true;
  renderAll = function(){
    const result = __renderAllOriginalV3777.apply(this, arguments);
    setTimeout(FL_attachBallonNoOverwriteV3777, 180);
    return result;
  };
}

document.addEventListener("click", function(){
  // Só anexa. Não recarrega.
  setTimeout(FL_attachBallonNoOverwriteV3777, 180);
}, true);

window.FL_fillSeasonV3777 = FL_fillSeasonV3777;
window.FL_attachBallonNoOverwriteV3777 = FL_attachBallonNoOverwriteV3777;


// ===== V3.7.78 BOLA DE OURO SALVAR POR ÍNDICE DE COLUNA =====
// Corrige bug onde o salvamento copiava a primeira linha em todas as posições.
// Agora o payload usa:
// jogador[i], país[i], clube[i], idade[i], valor[i]

var FL_keyV3778 = function FL_keyV3778(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_isBallonModalV3778 = function FL_isBallonModalV3778(){
  const title = (typeof modalTitle !== "undefined" && modalTitle ? modalTitle.textContent : "").toLowerCase();
  const txt = (typeof form !== "undefined" && form ? form.textContent : "").toLowerCase();
  // FIX V3.8.14: removido o critério genérico "contém jogador E valor em algum
  // lugar do texto" — todo formulário real da Bola de Ouro já define o título
  // com "Bola de Ouro" explicitamente, então esse fallback só causava falsos
  // positivos sequestrando o submit de QUALQUER outro formulário do site que
  // por coincidência mencionasse as duas palavras (ex: Seleção Brasileira).
  return title.includes("bola de ouro") || txt.includes("ranking bola de ouro");
}

var FL_fieldTypeV3778 = function FL_fieldTypeV3778(input){
  const key = FL_keyV3778([
    input.name,
    input.id,
    input.placeholder,
    input.dataset?.field,
    input.getAttribute("aria-label")
  ].join(" "));

  if(input.type === "file") return "file";
  if(key.includes("temporada") || key === "ano" || key.includes("anoboladeouro")) return "season";
  if(key.includes("imagem") || key.includes("image") || key.includes("url")) return "image";

  if(key.includes("jogador") || key.includes("player") || key === "nome") return "jogador";
  if(key.includes("pais") || key.includes("nacionalidade") || key.includes("country")) return "pais";
  if(key.includes("clube") || key.includes("club") || key.includes("time") || key.includes("team")) return "clube";
  if(key.includes("idade") || key.includes("age")) return "idade";
  if(key.includes("valor") || key.includes("mercado") || key.includes("market") || key.includes("euro") || key.includes("90m")) return "valor";

  return "";
}

var FL_columnsV3778 = function FL_columnsV3778(){
  const root = form || document;
  const result = { jogador: [], pais: [], clube: [], idade: [], valor: [] };

  const inputs = [...root.querySelectorAll("input,select,textarea")]
    .filter(input => input.type !== "file");

  inputs.forEach(input=>{
    const type = FL_fieldTypeV3778(input);
    if(result[type]) result[type].push(input);
  });

  // O modal atual tem ordem visual fixa:
  // temporada + imagem, depois 10 blocos de 5 campos:
  // jogador, país, clube, idade, valor.
  // Usamos fallback se a detecção por placeholder não pegou 10 campos.
  const needsFallback = Object.values(result).some(arr => arr.length < 10);

  if(needsFallback){
    const dataInputs = inputs.filter(input=>{
      const type = FL_fieldTypeV3778(input);
      return type !== "season" && type !== "image" && type !== "file";
    });

    const fallback = { jogador: [], pais: [], clube: [], idade: [], valor: [] };

    for(let i=0;i<10;i++){
      const base = i * 5;
      if(dataInputs[base]) fallback.jogador.push(dataInputs[base]);
      if(dataInputs[base+1]) fallback.pais.push(dataInputs[base+1]);
      if(dataInputs[base+2]) fallback.clube.push(dataInputs[base+2]);
      if(dataInputs[base+3]) fallback.idade.push(dataInputs[base+3]);
      if(dataInputs[base+4]) fallback.valor.push(dataInputs[base+4]);
    }

    Object.keys(result).forEach(k=>{
      if(fallback[k].length > result[k].length) result[k] = fallback[k];
    });
  }

  return result;
}

var FL_cleanUrlV3778 = function FL_cleanUrlV3778(value){
  const raw = String(value || "").trim();
  if(!raw) return "";
  if(raw.toLowerCase().includes("fakepath")) return "";
  if(raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return "";
}

var FL_getBallonImageV3778 = function FL_getBallonImageV3778(){
  const root = form || document;

  const candidates = [...root.querySelectorAll("input,select,textarea")]
    .filter(input => input.type !== "file")
    .filter(input => FL_fieldTypeV3778(input) === "image");

  for(const input of candidates){
    const url = FL_cleanUrlV3778(input.value);
    if(url) return url;
  }

  return "";
}

var FL_normalizeSeasonV3778 = function FL_normalizeSeasonV3778(value){
  const raw = String(value || "").trim();

  let m = raw.match(/-\s*(\d{4})$/);
  if(m) return m[1];

  m = raw.match(/(\d{4})\s*\/\s*(\d{4})/);
  if(m) return m[2];

  m = raw.match(/(\d{4})/);
  if(m) return m[1];

  return raw;
}

var FL_getBallonSeasonV3778 = function FL_getBallonSeasonV3778(){
  const root = form || document;
  const input =
    root.querySelector("[name='temporada']") ||
    root.querySelector("[name='ano']") ||
    root.querySelector("#ballonSeason") ||
    root.querySelector("select");

  return FL_normalizeSeasonV3778(input?.value || "");
}

var FL_getBallonRowsForSaveV3778 = function FL_getBallonRowsForSaveV3778(){
  const c = FL_columnsV3778();
  const rows = [];

  for(let i=0;i<10;i++){
    const jogador = String(c.jogador[i]?.value || "").trim();
    const pais = String(c.pais[i]?.value || "").trim();
    const clube = String(c.clube[i]?.value || "").trim();
    const idade = String(c.idade[i]?.value || "").trim();
    const valor = String(c.valor[i]?.value || "").trim();

    if(!jogador) continue;

    rows.push({
      posicao: i + 1,
      jogador,
      pais,
      nacionalidade: pais,
      clube,
      idade,
      idade_na_premiacao: idade,
      valor_mercado: valor,
      observacao: "",
      overall: "",
      carreira_temporada_id: ""
    });
  }

  console.log("Bola de Ouro rows para salvar v3.7.78:", rows);

  return rows;
}

var FL_saveBallonRankingV3778 = async function FL_saveBallonRankingV3778(){
  const btn = $("saveBtn") || document.querySelector(".gold-btn") || document.querySelector("button[type='submit']");
  if(btn && btn.disabled) return;

  const temporada = FL_getBallonSeasonV3778();
  const imagem = FL_getBallonImageV3778();
  const rows = FL_getBallonRowsForSaveV3778();

  if(!temporada){
    setStatus("Erro ao salvar Bola de Ouro: temporada vazia.", "error");
    return;
  }

  if(!rows.length){
    setStatus("Erro ao salvar Bola de Ouro: nenhum jogador preenchido.", "error");
    return;
  }

  setButtonSaving(btn);

  try{
    const result = await apiPost({
      action: "saveBallonCareerRankingV2",
      carreira_id: active?.carreira_id || "",
      temporada,
      imagem_destaque_url: imagem,
      rows
    });

    if(!result || !result.ok){
      throw new Error(result?.error || "Apps Script não confirmou o salvamento.");
    }

    if(!Array.isArray(db.BOLA_DE_OURO_CARREIRA)) db.BOLA_DE_OURO_CARREIRA = [];
    db.BOLA_DE_OURO_CARREIRA = db.BOLA_DE_OURO_CARREIRA.filter(r => String(r.temporada) !== String(temporada));

    const saved = result.data?.rows || [];
    saved.forEach(r => db.BOLA_DE_OURO_CARREIRA.push(Object.assign({}, r, {__source:"career"})));

    clearButtonSaving(btn);
    closeModal();
    renderAll();
    setStatus("Ranking Bola de Ouro salvo corretamente.", "ok");
  }catch(err){
    clearButtonSaving(btn);
    console.error(err);
    setStatus("Erro ao salvar Bola de Ouro: " + err.message, "error");
  }
}

// Força todas as versões antigas do save a usarem a coleta correta por índice.
window.saveBallonRankingCareerV3761 = FL_saveBallonRankingV3778;
window.saveBallonRankingCareerV3762 = FL_saveBallonRankingV3778;
window.saveBallonRankingCareerV3764 = FL_saveBallonRankingV3778;
window.FL_saveBallonRanking_3766 = FL_saveBallonRankingV3778;
window.FL_saveBallonRankingV3778 = FL_saveBallonRankingV3778;

document.addEventListener("submit", function(e){
  if(!FL_isBallonModalV3778()) return;

  e.preventDefault();
  e.stopImmediatePropagation();
  FL_saveBallonRankingV3778();
}, true);


// ===== V3.7.79 NAVEGAÇÃO ESTÁVEL POR ABA ATUAL =====
// Corrige bug de trocar de aba e aparecer só o card/imagem do jogador.
// Causa: renderAll antigo renderizava o Resumo mesmo quando a aba ativa era Bola de Ouro.
// Agora renderAll renderiza a aba atual.

var FL_getCurrentPageV3779 = function FL_getCurrentPageV3779(){
  try{
    if(typeof currentPageId !== "undefined" && currentPageId) return currentPageId;

    const activeMenu = document.querySelector(".menu-item.active[data-page]");
    if(activeMenu?.dataset?.page) return activeMenu.dataset.page;

    const activePage = document.querySelector(".page.active");
    if(activePage?.id) return activePage.id;

    return "dashboard";
  }catch(err){
    return "dashboard";
  }
}

var FL_setActivePageV3779 = function FL_setActivePageV3779(pageId){
  const page = pageId || "dashboard";

  try{
    currentPageId = page;
  }catch(err){}

  document.body.dataset.currentPage = page;

  document.querySelectorAll(".page").forEach(el=>{
    el.classList.remove("active");
    el.style.display = "none";
  });

  const target = document.getElementById(page);
  if(target){
    target.classList.add("active");
    target.style.display = "block";
  }

  document.querySelectorAll(".menu-item").forEach(item=>{
    item.classList.toggle("active", item.dataset.page === page);
  });

  if(typeof pageTitles !== "undefined"){
    try{
      setText("page-title", pageTitles[page] || "Football Legacy");
    }catch(err){}
  }
}

var FL_afterPageRenderV3779 = function FL_afterPageRenderV3779(pageId){
  const page = pageId || FL_getCurrentPageV3779();

  document.body.dataset.currentPage = page;

  // Garante que dashboard nunca fique visível por engano fora do Resumo.
  const dashboard = document.getElementById("dashboard");
  if(dashboard && page !== "dashboard" && page !== "resumo"){
    dashboard.classList.remove("active");
    dashboard.style.display = "none";
  }

  const target = document.getElementById(page);
  if(target){
    target.classList.add("active");
    target.style.display = "block";
  }

  // Mantém apenas o X correto da temporada, se a função existir.
  try{
    if(typeof removeScatteredCareerDeleteXV3772 === "function") removeScatteredCareerDeleteXV3772();
    if(typeof injectDeleteSeasonButtonsV3772 === "function") injectDeleteSeasonButtonsV3772();
  }catch(err){}

  // Reanexa lógica do Bola de Ouro sem forçar preenchimento infinito.
  try{
    if(typeof FL_attachBallonNoOverwriteV3777 === "function") FL_attachBallonNoOverwriteV3777();
    if(typeof FL_attachBallonStableSelectorV3776 === "function") FL_attachBallonStableSelectorV3776();
  }catch(err){}
}

// Sobrescreve navegação final de forma segura.
window.navigate = function(pageId){
  if(!pageId) return;

  FL_setActivePageV3779(pageId);

  setTimeout(()=>{
    try{
      if(typeof renderPageById === "function"){
        renderPageById(pageId, true);
      }
    }catch(err){
      console.error("Erro ao renderizar aba " + pageId, err);
    }

    FL_afterPageRenderV3779(pageId);
  }, 0);
};

// Sobrescreve renderAll para não renderizar sempre o dashboard.
window.renderAll = function(){
  try{
    if(typeof renderedPages !== "undefined") renderedPages = {};
  }catch(err){}

  const page = FL_getCurrentPageV3779() || "dashboard";

  try{
    if(typeof renderGlobalSelectorsOnly === "function"){
      renderGlobalSelectorsOnly();
    }
  }catch(err){
    console.error("Erro em renderGlobalSelectorsOnly", err);
  }

  FL_setActivePageV3779(page);

  try{
    if(typeof renderPageById === "function"){
      renderPageById(page, true);
    }
  }catch(err){
    console.error("Erro em renderPageById final v3.7.79", err);
  }

  FL_afterPageRenderV3779(page);
};

// Captura cliques no menu lateral para garantir a página correta.
document.addEventListener("click", function(e){
  const menu = e.target.closest(".menu-item[data-page]");
  if(menu?.dataset?.page){
    e.preventDefault();
    e.stopPropagation();
    window.navigate(menu.dataset.page);
  }
}, true);

// Reforço após carregamento inicial.
setTimeout(()=>{
  const page = FL_getCurrentPageV3779() || "dashboard";
  FL_setActivePageV3779(page);
  FL_afterPageRenderV3779(page);
}, 600);

window.FL_setActivePageV3779 = FL_setActivePageV3779;
window.FL_afterPageRenderV3779 = FL_afterPageRenderV3779;


// ===== V3.7.80 SELEÇÃO + HALL DE TÍTULOS + BOLA DE OURO MELHORES =====
// Ajustes:
// - Seleção com escudo/flag mais forte.
// - Totais de seleção sem dobrar registros.
// - Títulos de seleção alimentam Hall de Títulos.
// - Hall usa imagens de troféus da internet em vez de ícone genérico.
// - Bola de Ouro ganha visualizações: jogador, 2º, 3º, time, país e qualquer posição.

let FL_BALLON_BEST_MODE_V3780 = "player";
const FL_BADGE_CACHE_V3780 = {};

var FL_normV3780 = function FL_normV3780(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3780 = function FL_escapeV3780(value){
  return escapeHtml ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3780 = function FL_escapeAttrV3780(value){
  return escapeAttr ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

var FL_normalizeSelectionNameV3780 = function FL_normalizeSelectionNameV3780(value){
  const raw = String(value || "").trim();
  const k = FL_normV3780(raw);
  const aliases = {
    brasileiro:"Brasil", brasileira:"Brasil", brasil:"Brasil", brazil:"Brasil",
    argentino:"Argentina", argentina:"Argentina",
    francesa:"França", frances:"França", franca:"França", france:"França",
    espanhol:"Espanha", espanhola:"Espanha", espanha:"Espanha", spain:"Espanha",
    portugues:"Portugal", portuguesa:"Portugal", portugal:"Portugal",
    ingles:"Inglaterra", inglesa:"Inglaterra", inglaterra:"Inglaterra", england:"Inglaterra",
    alemao:"Alemanha", alema:"Alemanha", alemanha:"Alemanha", germany:"Alemanha",
    italiano:"Itália", italiana:"Itália", italia:"Itália", italy:"Itália",
    holandes:"Holanda", holandesa:"Holanda", holanda:"Holanda", netherlands:"Holanda",
    uruguaio:"Uruguai", uruguaia:"Uruguai", uruguai:"Uruguai", uruguay:"Uruguai",
    belga:"Bélgica", belgica:"Bélgica", belgium:"Bélgica",
    croata:"Croácia", croacia:"Croácia", croatia:"Croácia",
    mexicano:"México", mexicana:"México", mexico:"México",
    americano:"Estados Unidos", estadunidense:"Estados Unidos", estadosunidos:"Estados Unidos", usa:"Estados Unidos",
    japones:"Japão", japonesa:"Japão", japao:"Japão", japan:"Japão"
  };
  return aliases[k] || raw;
}

var FL_countryCodeV3780 = function FL_countryCodeV3780(name){
  const k = FL_normV3780(FL_normalizeSelectionNameV3780(name));
  const map = {
    brasil:"br", argentina:"ar", franca:"fr", espanha:"es", portugal:"pt",
    inglaterra:"gb-eng", alemanha:"de", italia:"it", holanda:"nl", uruguai:"uy",
    belgica:"be", croacia:"hr", mexico:"mx", estadosunidos:"us", japao:"jp",
    colombia:"co", chile:"cl", paraguai:"py", equador:"ec", peru:"pe",
    marrocos:"ma", senegal:"sn", nigeria:"ng", egito:"eg", camaroes:"cm",
    coreiadosul:"kr", australia:"au", canadá:"ca", canada:"ca"
  };
  return map[k] || "";
}

var FL_flagEmojiV3780 = function FL_flagEmojiV3780(name){
  const code = FL_countryCodeV3780(name);
  if(!code || code.includes("-")) return "🌐";
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

var FL_badgeFallbackV3780 = function FL_badgeFallbackV3780(name){
  const norm = FL_normalizeSelectionNameV3780(name);
  const k = FL_normV3780(norm);
  const direct = {
    brasil:"https://r2.thesportsdb.com/images/media/team/badge/8phz9z1678283124.png",
    argentina:"https://r2.thesportsdb.com/images/media/team/badge/2xxo8u1678283348.png",
    franca:"https://r2.thesportsdb.com/images/media/team/badge/r57asx1678283296.png",
    espanha:"https://r2.thesportsdb.com/images/media/team/badge/okzv471678283240.png",
    portugal:"https://r2.thesportsdb.com/images/media/team/badge/9qd9bp1678283232.png",
    inglaterra:"https://r2.thesportsdb.com/images/media/team/badge/xqprrv1678283151.png",
    alemanha:"https://r2.thesportsdb.com/images/media/team/badge/x9i0ms1678283200.png",
    italia:"https://r2.thesportsdb.com/images/media/team/badge/6av5u51678283175.png",
    holanda:"https://r2.thesportsdb.com/images/media/team/badge/3c12ss1678283263.png",
    uruguai:"https://r2.thesportsdb.com/images/media/team/badge/xqgw8j1678283317.png"
  };
  if(direct[k]) return direct[k];

  const code = FL_countryCodeV3780(norm);
  if(code && !code.includes("-")){
    return `https://flagcdn.com/w160/${code}.png`;
  }

  return "";
}

// Override antigo de escudo de seleção.
window.normalizeSelectionNameV3760 = FL_normalizeSelectionNameV3780;
window.getSelectionBadgeV3760 = FL_badgeFallbackV3780;

var FL_fetchNationalBadgeV3780 = async function FL_fetchNationalBadgeV3780(name){
  const norm = FL_normalizeSelectionNameV3780(name);
  const k = FL_normV3780(norm);
  if(!k) return "";

  if(FL_BADGE_CACHE_V3780[k] !== undefined) return FL_BADGE_CACHE_V3780[k];

  const fallback = FL_badgeFallbackV3780(norm);

  try{
    const queries = [
      `${norm} national football team`,
      `${norm} national soccer team`,
      norm
    ];

    for(const q of queries){
      const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(q)}`;
      const res = await fetch(url, {cache:"force-cache"});
      const data = await res.json();
      const teams = data?.teams || [];
      const found = teams.find(t => {
        const tName = FL_normV3780(t.strTeam || "");
        const tType = FL_normV3780(t.strTeamType || "");
        const sport = FL_normV3780(t.strSport || "");
        return sport.includes("soccer") && (tType.includes("national") || tName.includes(k) || k.includes(tName));
      }) || teams.find(t => FL_normV3780(t.strSport || "").includes("soccer")) || teams[0];

      if(found?.strBadge){
        FL_BADGE_CACHE_V3780[k] = found.strBadge;
        return found.strBadge;
      }
    }
  }catch(err){
    console.warn("Falha API escudo seleção:", norm, err);
  }

  FL_BADGE_CACHE_V3780[k] = fallback;
  return fallback;
}

var FL_injectNationalBadgesV3780 = function FL_injectNationalBadgesV3780(){
  const nodes = [...document.querySelectorAll("[data-national-team-v3780]")];

  nodes.forEach(async node=>{
    const name = node.dataset.nationalTeamV3780 || "";
    const badge = await FL_fetchNationalBadgeV3780(name);
    if(!node.isConnected) return;
    if(badge){
      node.innerHTML = `<img src="${FL_escapeAttrV3780(badge)}" onerror="this.parentElement.innerHTML='${FL_flagEmojiV3780(name)}'">`;
    }else{
      node.innerHTML = FL_flagEmojiV3780(name);
    }
  });
}

// ---------- Seleção: dedupe para não somar dobrado ----------
var FL_selectionRowsV3780 = function FL_selectionRowsV3780(){
  const carreiraId = active?.carreira_id || "";
  const personagemId = active?.protagonista_id || "";

  const rows = (getTable("SELECOES_CARREIRA") || []).filter(r =>
    (!carreiraId || String(r.carreira_id || "") === String(carreiraId)) &&
    (!personagemId || String(r.personagem_id || "") === String(personagemId))
  );

  const map = new Map();

  rows.forEach(r=>{
    const key = r.id
      ? `id:${r.id}`
      : `season:${r.carreira_temporada_id || r.temporada || ""}|sel:${FL_normV3780(r.selecao || "")}`;

    // Se tiver duplicado, mantém o último id/registro mais novo.
    map.set(key, r);
  });

  return [...map.values()];
}

window.getSelectionRowsV3760 = FL_selectionRowsV3780;

var FL_selectionTotalsV3780 = function FL_selectionTotalsV3780(){
  const rows = FL_selectionRowsV3780();
  return rows.reduce((acc,r)=>{
    acc.selecao = FL_normalizeSelectionNameV3780(r.selecao || acc.selecao);
    acc.jogos += num(r.jogos || 0);
    acc.gols += num(r.gols || 0);
    acc.assistencias += num(r.assistencias || 0);

    const titulos = String(r.titulos || "")
      .split(/[;,|]/)
      .map(x=>x.trim())
      .filter(Boolean);

    titulos.forEach(t=>{
      acc.titulos.push({
        temporada:r.temporada || "",
        competicao:t,
        selecao:r.selecao || acc.selecao,
        carreira_temporada_id:r.carreira_temporada_id || ""
      });
    });

    return acc;
  },{
    selecao: FL_normalizeSelectionNameV3780(
      (typeof getActivePlayerSelectionV3760 === "function" ? getActivePlayerSelectionV3760() : "") || ""
    ),
    jogos:0,
    gols:0,
    assistencias:0,
    titulos:[]
  });
}

window.getSelectionTotalsV3760 = FL_selectionTotalsV3780;

// ---------- Modal seleção mais forte ----------
const FL_SELECTION_COMPS_V3780 = [
  "Copa do Mundo",
  "Copa América",
  "Eurocopa",
  "UEFA Nations League",
  "Finalíssima",
  "Copa das Confederações",
  "Gold Cup",
  "Copa Africana de Nações",
  "Copa Asiática",
  "Eliminatórias da Copa",
  "Jogos Olímpicos"
];

const __openSelectionSeasonModalV3760_v3780 = typeof openSelectionSeasonModalV3760 === "function" ? openSelectionSeasonModalV3760 : null;
if(__openSelectionSeasonModalV3760_v3780 && !window.__selectionModalV3780Wrapped){
  window.__selectionModalV3780Wrapped = true;

  openSelectionSeasonModalV3760 = function(seasonId){
    __openSelectionSeasonModalV3760_v3780(seasonId);

    setTimeout(()=>{
      try{
        if(!form || !/seleção|selecao/i.test(modalTitle?.textContent || "")) return;

        const titleInput = form.querySelector("[name='titulos']");
        if(!titleInput || form.querySelector(".selection-title-grid-v3780")) return;

        const oldTitles = String(titleInput.value || "")
          .split(/[;,|]/)
          .map(x=>x.trim())
          .filter(Boolean);

        const checked = new Set(oldTitles.map(FL_normV3780));

        const box = document.createElement("div");
        box.className = "selection-title-grid-v3780";
        box.innerHTML = `
          <label class="selection-title-label-v3780">Competições/títulos da seleção</label>
          <div class="selection-title-options-v3780">
            ${FL_SELECTION_COMPS_V3780.map(comp=>`
              <label>
                <input type="checkbox" value="${FL_escapeAttrV3780(comp)}" ${checked.has(FL_normV3780(comp)) ? "checked" : ""}>
                <span>${FL_escapeV3780(comp)}</span>
              </label>
            `).join("")}
          </div>
          <small>Marque títulos conquistados pela seleção nessa temporada. Isso alimenta o Hall de Títulos.</small>
        `;

        titleInput.closest(".form-field")?.insertAdjacentElement("afterend", box);

        box.addEventListener("change", ()=>{
          const selected = [...box.querySelectorAll("input:checked")].map(i=>i.value);
          const manual = String(titleInput.value || "")
            .split(/[;,|]/)
            .map(x=>x.trim())
            .filter(x=>x && !FL_SELECTION_COMPS_V3780.map(FL_normV3780).includes(FL_normV3780(x)));
          titleInput.value = [...new Set([...selected, ...manual])].join("; ");
        });

        const badgeNode = form.querySelector(".selected-team img")?.parentElement || form.querySelector(".selected-team");
        const selInput = form.querySelector("[name='selecao']");
        if(selInput && badgeNode){
          const refresh = async()=>{
            const badge = await FL_fetchNationalBadgeV3780(selInput.value);
            if(badge){
              const img = badgeNode.querySelector("img") || document.createElement("img");
              img.src = badge;
              img.onerror = () => { img.style.display = "none"; };
              if(!img.parentElement) badgeNode.prepend(img);
            }
          };
          selInput.addEventListener("change", refresh);
          selInput.addEventListener("blur", refresh);
          refresh();
        }
      }catch(err){
        console.warn("Falha seleção modal v3.7.80:", err);
      }
    }, 180);
  };

  window.openSelectionSeasonModalV3760 = openSelectionSeasonModalV3760;
}

// ---------- Troféus com imagem ----------
var FL_trophyImageV3780 = function FL_trophyImageV3780(name){
  const n = FL_normV3780(name);

  const file = (filename) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=240`;

  if(n.includes("copa") && n.includes("mundo")) return file("FIFA_World_Cup_Trophy.jpg");
  if(n.includes("champions")) return file("UEFA_Champions_League_trophy.jpg");
  if(n.includes("europa") && n.includes("league")) return file("UEFA_Europa_League_Trophy.jpg");
  if(n.includes("libertadores")) return file("Copa_Libertadores_trophy.jpg");
  if(n.includes("eurocopa") || n.includes("euro")) return file("UEFA_Euro_Trophy.jpg");
  if(n.includes("copa") && n.includes("america")) return file("Copa_Am%C3%A9rica_trophy.jpg");
  if(n.includes("nations")) return file("UEFA_Nations_League_Trophy.jpg");
  if(n.includes("ballon") || n.includes("bola")) return file("Ballon_d%27Or_trophy.jpg");
  if(n.includes("premier")) return file("Premier_League_Trophy.jpg");
  if(n.includes("laliga") || n.includes("la liga")) return file("LaLiga_trophy.jpg");
  if(n.includes("serie a") || n.includes("italian")) return file("Scudetto.svg");
  if(n.includes("bundesliga")) return file("Bundesliga_logo_(2017).svg");
  if(n.includes("super")) return file("Supercoppa_Italiana_trophy.jpg");
  if(n.includes("copa") || n.includes("cup")) return file("Association_football_trophy.jpg");

  return file("Association_football_trophy.jpg");
}

var FL_titleRowsV3780 = function FL_titleRowsV3780(){
  const clubTitles = (getTable("CAMPEOES_CARREIRA") || []).map(t=>({
    id:`club-${t.id || `${t.temporada}-${t.competicao}`}`,
    tipo:"clube",
    temporada:t.temporada || "",
    competicao:t.competicao || compName(t.competicao_id) || "",
    vencedor:t.clube || "",
    extra:[t.artilheiro && `Artilheiro: ${t.artilheiro}`, t.lider_assistencias && `Assist.: ${t.lider_assistencias}`, t.melhor_jogador && `Melhor: ${t.melhor_jogador}`].filter(Boolean).join(" • ")
  }));

  const selectionTitles = [];
  FL_selectionRowsV3780().forEach(r=>{
    String(r.titulos || "")
      .split(/[;,|]/)
      .map(x=>x.trim())
      .filter(Boolean)
      .forEach((title,idx)=>{
        selectionTitles.push({
          id:`sel-${r.id || r.carreira_temporada_id || r.temporada}-${idx}`,
          tipo:"seleção",
          temporada:r.temporada || "",
          competicao:title,
          vencedor:FL_normalizeSelectionNameV3780(r.selecao || ""),
          extra:`${num(r.jogos)} jogos • ${num(r.gols)} gols • ${num(r.assistencias)} assist.`
        });
      });
  });

  return [...clubTitles, ...selectionTitles]
    .filter(t=>t.competicao || t.vencedor)
    .sort((a,b)=>compareSeasonsDesc(a.temporada,b.temporada));
}

var renderTrofeus = function renderTrofeus(){
  const el = $("trophy-grid");
  if(!el) return;

  const rows = FL_titleRowsV3780();

  el.innerHTML = rows.map(t=>`
    <article class="trophy-card trophy-card-v3780">
      <div class="trophy-img-v3780">
        <img src="${FL_escapeAttrV3780(FL_trophyImageV3780(t.competicao))}" onerror="this.parentElement.innerHTML='🏆'">
      </div>
      <div class="trophy-type-v3780">${FL_escapeV3780(t.tipo)}</div>
      <h3>${FL_escapeV3780(t.competicao || "Título")}</h3>
      <strong>${FL_escapeV3780(t.vencedor || "-")}</strong>
      <span>${FL_escapeV3780(t.temporada || "-")}</span>
      ${t.extra ? `<small>${FL_escapeV3780(t.extra)}</small>` : ""}
    </article>
  `).join("") || emptyCard("Nenhum título cadastrado.");
}

// ---------- Bola de Ouro melhores ----------
var FL_ballonRowsAllV3780 = function FL_ballonRowsAllV3780(){
  const rows = getTable("BOLA_DE_OURO") || [];
  const map = new Map();

  rows.forEach(r=>{
    const key = r.id
      ? `id:${r.id}`
      : `${r.temporada || r.ano || ""}|${r.posicao || ""}|${FL_normV3780(r.jogador || "")}|${FL_normV3780(r.clube || "")}`;

    map.set(key, r);
  });

  return [...map.values()].filter(r=>r.jogador || r.clube || r.pais || r.nacionalidade);
}

var FL_groupBallonV3780 = function FL_groupBallonV3780(mode){
  const rows = FL_ballonRowsAllV3780();
  const map = new Map();

  rows.forEach(r=>{
    const pos = Number(r.posicao || 0);

    let include = false;
    let key = "";
    let label = "";
    let sub = "";

    if(mode === "player"){
      include = pos === 1;
      key = FL_normV3780(r.jogador);
      label = r.jogador || "-";
      sub = "Bolas de Ouro";
    }else if(mode === "second"){
      include = pos === 2;
      key = FL_normV3780(r.jogador);
      label = r.jogador || "-";
      sub = "2º lugares";
    }else if(mode === "third"){
      include = pos === 3;
      key = FL_normV3780(r.jogador);
      label = r.jogador || "-";
      sub = "3º lugares";
    }else if(mode === "club"){
      include = pos === 1;
      key = FL_normV3780(r.clube || "Sem clube");
      label = r.clube || "Sem clube";
      sub = "Bolas de Ouro por clube";
    }else if(mode === "country"){
      include = pos === 1;
      key = FL_normV3780(r.pais || r.nacionalidade || "Sem país");
      label = r.pais || r.nacionalidade || "Sem país";
      sub = "Bolas de Ouro por país";
    }else if(mode === "appearances"){
      include = !!pos;
      key = FL_normV3780(r.jogador);
      label = r.jogador || "-";
      sub = "Aparições no Top 10";
    }

    if(!include || !key) return;

    if(!map.has(key)){
      map.set(key,{label,sub,count:0,details:[],wins:0,seconds:0,thirds:0});
    }

    const item = map.get(key);
    item.count++;
    if(pos === 1) item.wins++;
    if(pos === 2) item.seconds++;
    if(pos === 3) item.thirds++;
    item.details.push(`${r.temporada || r.ano || "-"} #${pos}`);
  });

  return [...map.values()].sort((a,b)=>
    b.count - a.count ||
    b.wins - a.wins ||
    a.label.localeCompare(b.label)
  ).slice(0,10);
}

var FL_renderBallonBestViewsV3780 = function FL_renderBallonBestViewsV3780(){
  const host = $("ballon-best-v3780") || document.createElement("section");
  host.id = "ballon-best-v3780";
  host.className = "ballon-best-v3780";

  const list = $("ballon-ranking-list");
  if(list && !host.parentElement){
    list.insertAdjacentElement("afterend", host);
  }

  const modes = [
    ["player","Por jogador"],
    ["second","Mais 2º lugar"],
    ["third","Mais 3º lugar"],
    ["club","Por time"],
    ["country","Por país"],
    ["appearances","Qualquer posição"]
  ];

  const rows = FL_groupBallonV3780(FL_BALLON_BEST_MODE_V3780);

  host.innerHTML = `
    <div class="ballon-best-head-v3780">
      <div>
        <h3>Melhores no Bola de Ouro</h3>
        <small>Visualizações históricas da carreira</small>
      </div>
      <div class="ballon-best-tabs-v3780">
        ${modes.map(([id,label])=>`
          <button class="${id===FL_BALLON_BEST_MODE_V3780 ? "active" : ""}" onclick="FL_BALLON_BEST_MODE_V3780='${id}'; FL_renderBallonBestViewsV3780();">${label}</button>
        `).join("")}
      </div>
    </div>
    <div class="ballon-best-list-v3780">
      ${rows.map((r,idx)=>`
        <article class="ballon-best-card-v3780">
          <span class="rank-v3780">${idx+1}</span>
          <div>
            <strong>${FL_escapeV3780(r.label)}</strong>
            <small>${FL_escapeV3780(r.sub)} • ${FL_escapeV3780(r.details.slice(0,4).join(" • "))}${r.details.length>4 ? "..." : ""}</small>
          </div>
          <b>${r.count}</b>
        </article>
      `).join("") || `<div class="season-empty">Sem dados para esta visualização.</div>`}
    </div>
  `;
}

const __renderBolaOuroOriginalV3780 = typeof renderBolaOuro === "function" ? renderBolaOuro : null;
if(__renderBolaOuroOriginalV3780 && !window.__renderBolaOuroV3780Wrapped){
  window.__renderBolaOuroV3780Wrapped = true;
  renderBolaOuro = function(){
    __renderBolaOuroOriginalV3780();
    FL_renderBallonBestViewsV3780();
  };
}

// Pós-render: badges assíncronos.
const __renderAllOriginalV3780 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3780 && !window.__renderAllV3780Wrapped){
  window.__renderAllV3780Wrapped = true;
  renderAll = function(){
    const result = __renderAllOriginalV3780.apply(this, arguments);
    setTimeout(FL_injectNationalBadgesV3780, 250);
    setTimeout(FL_injectNationalBadgesV3780, 1300);
    return result;
  };
}

document.addEventListener("click", ()=>{
  setTimeout(FL_injectNationalBadgesV3780, 500);
}, true);

window.FL_renderBallonBestViewsV3780 = FL_renderBallonBestViewsV3780;
window.FL_fetchNationalBadgeV3780 = FL_fetchNationalBadgeV3780;
window.FL_injectNationalBadgesV3780 = FL_injectNationalBadgesV3780;


// ===== V3.7.81 TOP 11 DRAG + FOTOS DE JOGADORES =====
// Top 11 vira mapa visual:
// - busca foto do jogador via TheSportsDB;
// - edição com cards arrastáveis;
// - salvo fica travado;
// - botão Editar Top 11;
// - salva em TOP11_CARREIRA com foto_url, x, y e mapa_url.

let FL_TOP11_EDITING_V3781 = false;
let FL_TOP11_CURRENT_MAP_V3781 = "";
const FL_PLAYER_PHOTO_CACHE_V3781 = {};

var FL_normV3781 = function FL_normV3781(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3781 = function FL_escapeV3781(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3781 = function FL_escapeAttrV3781(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

var FL_activeCareerIdV3781 = function FL_activeCareerIdV3781(){
  return active?.carreira_id || "";
}

var FL_activeSeasonIdV3781 = function FL_activeSeasonIdV3781(){
  const seasons = typeof getCareerSeasonRecords === "function" ? getCareerSeasonRecords() : (getTable("CARREIRA_TEMPORADAS") || []);
  return seasons[0]?.id || "";
}

var FL_top11RowsV3781 = function FL_top11RowsV3781(){
  const carreiraId = FL_activeCareerIdV3781();
  return (getTable("TOP11_CARREIRA") || []).filter(r =>
    !carreiraId || String(r.carreira_id || "") === String(carreiraId)
  );
}

var FL_top11CurrentRowsV3781 = function FL_top11CurrentRowsV3781(){
  const rows = FL_top11RowsV3781();

  if(!rows.length) return [];

  // Se houver temporada selecionada, usa ela. Caso contrário pega a temporada mais recente disponível.
  const seasonId = FL_activeSeasonIdV3781();
  let filtered = rows.filter(r => String(r.carreira_temporada_id || "") === String(seasonId));

  if(!filtered.length){
    const sorted = [...rows].sort((a,b)=>String(b.temporada || "").localeCompare(String(a.temporada || "")));
    const temp = sorted[0]?.temporada || "";
    filtered = rows.filter(r => String(r.temporada || "") === String(temp));
  }

  return filtered.sort((a,b)=>Number(a.id || 0)-Number(b.id || 0));
}

var FL_defaultTop11PositionsV3781 = function FL_defaultTop11PositionsV3781(){
  return [
    ["GOL",50,88],
    ["LD",78,70],["ZAG",60,72],["ZAG",40,72],["LE",22,70],
    ["VOL",50,56],
    ["MC",35,43],["MC",65,43],
    ["PD",78,25],["CA",50,18],["PE",22,25]
  ];
}

var FL_fetchPlayerPhotoV3781 = async function FL_fetchPlayerPhotoV3781(name){
  const clean = String(name || "").trim();
  const key = FL_normV3781(clean);
  if(!key) return "";

  if(FL_PLAYER_PHOTO_CACHE_V3781[key] !== undefined) return FL_PLAYER_PHOTO_CACHE_V3781[key];

  try{
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {cache:"force-cache"});
    const data = await res.json();
    const players = data?.player || [];

    const found = players.find(p => FL_normV3781(p.strPlayer || "") === key) || players[0];

    const img = found?.strCutout || found?.strRender || found?.strThumb || "";
    FL_PLAYER_PHOTO_CACHE_V3781[key] = img || "";
    return img || "";
  }catch(err){
    console.warn("Falha ao buscar foto jogador:", clean, err);
    FL_PLAYER_PHOTO_CACHE_V3781[key] = "";
    return "";
  }
}

var FL_initialsV3781 = function FL_initialsV3781(name){
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "");
}

var FL_top11PlayerCardV3781 = function FL_top11PlayerCardV3781(row, idx){
  const defaults = FL_defaultTop11PositionsV3781();
  const d = defaults[idx] || ["POS",50,50];

  const x = row.x !== undefined && row.x !== "" ? Number(row.x) : d[1];
  const y = row.y !== undefined && row.y !== "" ? Number(row.y) : d[2];
  const pos = row.posicao_tatica || d[0];
  const name = row.jogador || "Jogador";
  const foto = row.foto_url || row.foto || "";
  const overall = row.overall || "";

  return `
    <div class="top11-player-v3781 ${FL_TOP11_EDITING_V3781 ? "editing" : ""}"
         data-id="${FL_escapeAttrV3781(row.id || "")}"
         data-index="${idx}"
         data-player="${FL_escapeAttrV3781(name)}"
         style="left:${x}%; top:${y}%;">
      <div class="top11-photo-v3781">
        ${foto ? `<img src="${FL_escapeAttrV3781(foto)}" onerror="this.parentElement.innerHTML='${FL_escapeV3781(FL_initialsV3781(name))}'">` : FL_escapeV3781(FL_initialsV3781(name))}
      </div>
      <div class="top11-info-v3781">
        <b>${FL_escapeV3781(name)}</b>
        <span>${FL_escapeV3781(pos)}${overall ? ` • ${FL_escapeV3781(overall)}` : ""}</span>
      </div>
    </div>
  `;
}

var FL_renderTop11MapV3781 = function FL_renderTop11MapV3781(){
  const page = $("top11");
  if(!page) return;

  let host = $("top11-map-v3781");
  if(!host){
    host = document.createElement("section");
    host.id = "top11-map-v3781";
    host.className = "top11-map-section-v3781";

    const target = page.querySelector(".content-card, .section-card, .page-content") || page;
    target.prepend(host);
  }

  const rows = FL_top11CurrentRowsV3781();
  const mapUrl = FL_TOP11_CURRENT_MAP_V3781 || rows.find(r=>r.mapa_url)?.mapa_url || "";

  host.innerHTML = `
    <div class="top11-head-v3781">
      <div>
        <h2>Top 11 da carreira</h2>
        <small>Arraste os jogadores no modo edição e salve a posição no mapa.</small>
      </div>
      <div class="top11-actions-v3781">
        <button type="button" onclick="FL_toggleTop11EditV3781()">${FL_TOP11_EDITING_V3781 ? "Cancelar edição" : "Editar Top 11"}</button>
        ${FL_TOP11_EDITING_V3781 ? `<button type="button" class="gold" onclick="FL_saveTop11PositionsV3781()">Salvar Top 11</button>` : ""}
      </div>
    </div>

    <div class="top11-map-url-v3781" style="${FL_TOP11_EDITING_V3781 ? "" : "display:none"}">
      <input id="top11-map-url-input-v3781" placeholder="URL da imagem de fundo do campo/mapa" value="${FL_escapeAttrV3781(mapUrl)}">
      <button type="button" onclick="FL_applyTop11MapV3781()">Aplicar fundo</button>
    </div>

    <div class="top11-pitch-v3781 ${FL_TOP11_EDITING_V3781 ? "editing" : ""}"
         style="${mapUrl ? `background-image:linear-gradient(rgba(2,6,23,.12),rgba(2,6,23,.28)),url('${FL_escapeAttrV3781(mapUrl)}')` : ""}">
      ${rows.length ? rows.map(FL_top11PlayerCardV3781).join("") : `
        <div class="top11-empty-v3781">
          <strong>Nenhum Top 11 cadastrado.</strong>
          <span>Cadastre jogadores no Top 11 para montar o mapa.</span>
        </div>
      `}
    </div>
  `;

  if(FL_TOP11_EDITING_V3781){
    FL_enableTop11DragV3781();
  }

  FL_enrichTop11PhotosV3781();
}

var FL_applyTop11MapV3781 = function FL_applyTop11MapV3781(){
  const input = $("top11-map-url-input-v3781");
  FL_TOP11_CURRENT_MAP_V3781 = input?.value || "";
  FL_renderTop11MapV3781();
}

var FL_toggleTop11EditV3781 = function FL_toggleTop11EditV3781(){
  FL_TOP11_EDITING_V3781 = !FL_TOP11_EDITING_V3781;
  FL_renderTop11MapV3781();
}

var FL_enableTop11DragV3781 = function FL_enableTop11DragV3781(){
  const pitch = document.querySelector(".top11-pitch-v3781");
  if(!pitch) return;

  pitch.querySelectorAll(".top11-player-v3781").forEach(card=>{
    if(card.dataset.dragReadyV3781) return;
    card.dataset.dragReadyV3781 = "1";

    let dragging = false;

    const move = e=>{
      if(!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      const rect = pitch.getBoundingClientRect();

      let x = ((p.clientX - rect.left) / rect.width) * 100;
      let y = ((p.clientY - rect.top) / rect.height) * 100;

      x = Math.max(4, Math.min(96, x));
      y = Math.max(6, Math.min(94, y));

      card.style.left = x + "%";
      card.style.top = y + "%";
      card.dataset.x = x.toFixed(2);
      card.dataset.y = y.toFixed(2);
    };

    const stop = ()=>{
      dragging = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", stop);
    };

    card.addEventListener("mousedown", e=>{
      if(!FL_TOP11_EDITING_V3781) return;
      e.preventDefault();
      dragging = true;
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    });

    card.addEventListener("touchstart", e=>{
      if(!FL_TOP11_EDITING_V3781) return;
      dragging = true;
      document.addEventListener("touchmove", move, {passive:false});
      document.addEventListener("touchend", stop);
    }, {passive:false});
  });
}

var FL_enrichTop11PhotosV3781 = async function FL_enrichTop11PhotosV3781(){
  const cards = [...document.querySelectorAll(".top11-player-v3781")];

  for(const card of cards){
    const id = card.dataset.id || "";
    const name = card.dataset.player || "";
    const row = FL_top11RowsV3781().find(r => String(r.id || "") === String(id));

    if(row?.foto_url || !name) continue;

    const img = await FL_fetchPlayerPhotoV3781(name);
    if(!img || !card.isConnected) continue;

    const photo = card.querySelector(".top11-photo-v3781");
    if(photo){
      photo.innerHTML = `<img src="${FL_escapeAttrV3781(img)}" onerror="this.parentElement.innerHTML='${FL_escapeV3781(FL_initialsV3781(name))}'">`;
    }

    if(row) row.foto_url = img;
  }
}

var FL_saveTop11PositionsV3781 = async function FL_saveTop11PositionsV3781(){
  const rows = FL_top11CurrentRowsV3781();
  const cards = [...document.querySelectorAll(".top11-player-v3781")];

  if(!rows.length){
    setStatus("Nenhum Top 11 para salvar.", "error");
    return;
  }

  const mapUrl = $("top11-map-url-input-v3781")?.value || FL_TOP11_CURRENT_MAP_V3781 || "";
  const updates = [];

  cards.forEach(card=>{
    const id = card.dataset.id || "";
    const row = rows.find(r => String(r.id || "") === String(id));
    if(!row) return;

    const x = card.dataset.x || parseFloat(card.style.left) || row.x || "";
    const y = card.dataset.y || parseFloat(card.style.top) || row.y || "";

    updates.push({
      id: row.id,
      record: Object.assign({}, row, {
        x,
        y,
        mapa_url: mapUrl,
        foto_url: row.foto_url || ""
      })
    });
  });

  try{
    setStatus("Salvando Top 11...", "loading");

    for(const item of updates){
      const result = await apiPost({
        action:"update",
        table:"TOP11_CARREIRA",
        id:item.id,
        record:item.record
      });

      if(!result || !result.ok){
        throw new Error(result?.error || "Falha ao salvar jogador do Top 11.");
      }

      const idx = db.TOP11_CARREIRA.findIndex(r => String(r.id) === String(item.id));
      if(idx >= 0) db.TOP11_CARREIRA[idx] = Object.assign({}, db.TOP11_CARREIRA[idx], item.record);
    }

    FL_TOP11_EDITING_V3781 = false;
    FL_TOP11_CURRENT_MAP_V3781 = mapUrl;
    FL_renderTop11MapV3781();
    setStatus("Top 11 salvo.", "ok");
  }catch(err){
    console.error(err);
    setStatus("Erro ao salvar Top 11: " + err.message, "error");
  }
}

const __renderTop11OriginalV3781 = typeof renderTop11 === "function" ? renderTop11 : null;
renderTop11 = function(){
  if(__renderTop11OriginalV3781){
    try{ __renderTop11OriginalV3781(); }catch(err){ console.warn("renderTop11 original falhou:", err); }
  }
  FL_renderTop11MapV3781();
};

window.renderTop11 = renderTop11;
window.FL_renderTop11MapV3781 = FL_renderTop11MapV3781;
window.FL_toggleTop11EditV3781 = FL_toggleTop11EditV3781;
window.FL_saveTop11PositionsV3781 = FL_saveTop11PositionsV3781;
window.FL_applyTop11MapV3781 = FL_applyTop11MapV3781;


// ===== V3.7.82 TROFÉUS SÓ GANHOS + ESTATÍSTICAS POR LIGAS =====
// Corrige:
// - Aba Troféus só mostra títulos que o protagonista realmente ganhou.
// - Campeões de outros times não entram mais no Hall.
// - Aba Estatísticas vira painel de maiores ligas/torneios com Top 5 vencedores.

var FL_normV3782 = function FL_normV3782(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3782 = function FL_escapeV3782(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3782 = function FL_escapeAttrV3782(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

var FL_activeCareerIdV3782 = function FL_activeCareerIdV3782(){
  return active?.carreira_id || "";
}

var FL_careerSeasonsV3782 = function FL_careerSeasonsV3782(){
  const carreiraId = FL_activeCareerIdV3782();
  return (getTable("CARREIRA_TEMPORADAS") || []).filter(s =>
    !carreiraId || String(s.carreira_id || "") === String(carreiraId)
  );
}

var FL_seasonByIdV3782 = function FL_seasonByIdV3782(){
  const map = new Map();
  FL_careerSeasonsV3782().forEach(s => map.set(String(s.id || ""), s));
  return map;
}

var FL_isTruthyWonV3782 = function FL_isTruthyWonV3782(value){
  const v = FL_normV3782(value);
  return ["sim","true","1","yes","y","ganhei","venci","campeao","campeao"].includes(v);
}

var FL_isWonChampionRecordV3782 = function FL_isWonChampionRecordV3782(record){
  const seasonMap = FL_seasonByIdV3782();
  const season = seasonMap.get(String(record.carreira_temporada_id || ""));

  // 1) Se existe flag/status explícito, respeita.
  if(
    FL_isTruthyWonV3782(record.ganhei) ||
    FL_isTruthyWonV3782(record.venci) ||
    FL_isTruthyWonV3782(record.conquistado) ||
    FL_isTruthyWonV3782(record.status)
  ){
    return true;
  }

  // 2) Se tem temporada vinculada, só é meu título se o campeão é o clube daquela temporada.
  if(season){
    const winner = FL_normV3782(record.clube || record.campeao || record.time_campeao || "");
    const myClub = FL_normV3782(season.clube_nome || season.clube || season.time || "");
    if(winner && myClub && winner === myClub) return true;
  }

  return false;
}

var FL_trophyImageV3782 = function FL_trophyImageV3782(name){
  const n = FL_normV3782(name);
  const file = filename => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=260`;

  if(n.includes("copa") && n.includes("mundo")) return file("FIFA_World_Cup_Trophy.jpg");
  if(n.includes("champions")) return file("UEFA_Champions_League_trophy.jpg");
  if(n.includes("europa") && n.includes("league")) return file("UEFA_Europa_League_Trophy.jpg");
  if(n.includes("conference")) return file("UEFA_Europa_Conference_League_Trophy.jpg");
  if(n.includes("libertadores")) return file("Copa_Libertadores_trophy.jpg");
  if(n.includes("eurocopa") || n === "euro") return file("UEFA_Euro_Trophy.jpg");
  if(n.includes("copa") && n.includes("america")) return file("Copa_Am%C3%A9rica_trophy.jpg");
  if(n.includes("nations")) return file("UEFA_Nations_League_Trophy.jpg");
  if(n.includes("premier")) return file("Premier_League_Trophy.jpg");
  if(n.includes("la") && n.includes("liga")) return file("LaLiga_trophy.jpg");
  if(n.includes("serie") && n.includes("a")) return file("Scudetto.svg");
  if(n.includes("bundesliga")) return file("Bundesliga_logo_(2017).svg");
  if(n.includes("ligue") && n.includes("1")) return file("Ligue_1_Uber_Eats_trophy.svg");
  if(n.includes("super")) return file("Association_football_trophy.jpg");
  return file("Association_football_trophy.jpg");
}

var FL_wonTitleRowsV3782 = function FL_wonTitleRowsV3782(){
  const carreiraId = FL_activeCareerIdV3782();

  const clubTitles = (getTable("CAMPEOES_CARREIRA") || [])
    .filter(t => !carreiraId || String(t.carreira_id || "") === String(carreiraId))
    .filter(FL_isWonChampionRecordV3782)
    .map(t => ({
      id:`club-${t.id || `${t.temporada}-${t.competicao}`}`,
      tipo:"clube",
      temporada:t.temporada || "",
      competicao:t.competicao || (typeof compName === "function" ? compName(t.competicao_id) : "") || "",
      vencedor:t.clube || t.campeao || "",
      extra:[t.artilheiro && `Artilheiro: ${t.artilheiro}`, t.lider_assistencias && `Assist.: ${t.lider_assistencias}`, t.melhor_jogador && `Melhor: ${t.melhor_jogador}`].filter(Boolean).join(" • ")
    }));

  // Títulos de seleção só entram se foram marcados no registro da seleção.
  const selectionRows = typeof FL_selectionRowsV3780 === "function"
    ? FL_selectionRowsV3780()
    : (getTable("SELECOES_CARREIRA") || []);

  const selectionTitles = [];
  selectionRows.forEach(r=>{
    String(r.titulos || "")
      .split(/[;,|]/)
      .map(x=>x.trim())
      .filter(Boolean)
      .forEach((title,idx)=>{
        selectionTitles.push({
          id:`sel-${r.id || r.carreira_temporada_id || r.temporada}-${idx}`,
          tipo:"seleção",
          temporada:r.temporada || "",
          competicao:title,
          vencedor:r.selecao || "",
          extra:`${num(r.jogos)} jogos • ${num(r.gols)} gols • ${num(r.assistencias)} assist.`
        });
      });
  });

  return [...clubTitles, ...selectionTitles]
    .filter(t=>t.competicao || t.vencedor)
    .sort((a,b)=>{
      if(typeof compareSeasonsDesc === "function") return compareSeasonsDesc(a.temporada,b.temporada);
      return String(b.temporada || "").localeCompare(String(a.temporada || ""));
    });
}

var renderTrofeus = function renderTrofeus(){
  const el = $("trophy-grid");
  if(!el) return;

  const rows = FL_wonTitleRowsV3782();

  el.innerHTML = rows.map(t=>`
    <article class="trophy-card trophy-card-v3782">
      <div class="trophy-img-v3782">
        <img src="${FL_escapeAttrV3782(FL_trophyImageV3782(t.competicao))}" onerror="this.parentElement.innerHTML='🏆'">
      </div>
      <div class="trophy-type-v3782">${FL_escapeV3782(t.tipo)}</div>
      <h3>${FL_escapeV3782(t.competicao || "Título")}</h3>
      <strong>${FL_escapeV3782(t.vencedor || "-")}</strong>
      <span>${FL_escapeV3782(t.temporada || "-")}</span>
      ${t.extra ? `<small>${FL_escapeV3782(t.extra)}</small>` : ""}
    </article>
  `).join("") || emptyCard("Nenhum título ganho cadastrado. Marque “Ganhei” nos campeonatos ou cadastre títulos da seleção.");
}

window.renderTrofeus = renderTrofeus;

// ---------- Estatísticas: maiores ligas e Top 5 vencedores ----------
const FL_MAJOR_COMPETITIONS_V3782 = [
  {name:"Champions League", aliases:["champions league","uefa champions league"], icon:"https://commons.wikimedia.org/wiki/Special:FilePath/UEFA_Champions_League_trophy.jpg?width=220"},
  {name:"Premier League", aliases:["premier league"], icon:"https://commons.wikimedia.org/wiki/Special:FilePath/Premier_League_Trophy.jpg?width=220"},
  {name:"La Liga", aliases:["la liga","spanish la liga"], icon:"https://commons.wikimedia.org/wiki/Special:FilePath/LaLiga_trophy.jpg?width=220"},
  {name:"Serie A Italiana", aliases:["serie a italiana","italian serie a","serie a"], icon:"https://commons.wikimedia.org/wiki/Special:FilePath/Scudetto.svg?width=220"},
  {name:"Bundesliga", aliases:["bundesliga"], icon:"https://commons.wikimedia.org/wiki/Special:FilePath/Bundesliga_logo_(2017).svg?width=220"},
  {name:"Ligue 1", aliases:["ligue 1"], icon:"https://commons.wikimedia.org/wiki/Special:FilePath/Ligue_1_Uber_Eats_trophy.svg?width=220"},
  {name:"Europa League", aliases:["europa league","uefa europa league"], icon:"https://commons.wikimedia.org/wiki/Special:FilePath/UEFA_Europa_League_Trophy.jpg?width=220"},
  {name:"Conference League", aliases:["conference league","uefa conference league"], icon:"https://commons.wikimedia.org/wiki/Special:FilePath/UEFA_Europa_Conference_League_Trophy.jpg?width=220"},
  {name:"Copa do Mundo", aliases:["copa do mundo","world cup"], icon:"https://commons.wikimedia.org/wiki/Special:FilePath/FIFA_World_Cup_Trophy.jpg?width=220"},
  {name:"Copa América", aliases:["copa america","copa américa"], icon:"https://commons.wikimedia.org/wiki/Special:FilePath/Copa_Am%C3%A9rica_trophy.jpg?width=220"}
];

var FL_matchMajorCompV3782 = function FL_matchMajorCompV3782(comp){
  const c = FL_normV3782(comp);
  return FL_MAJOR_COMPETITIONS_V3782.find(item =>
    item.aliases.some(a => c.includes(FL_normV3782(a)) || FL_normV3782(a).includes(c))
  );
}

var FL_championsRowsV3782 = function FL_championsRowsV3782(){
  const carreiraId = FL_activeCareerIdV3782();
  return (getTable("CAMPEOES_CARREIRA") || []).filter(r =>
    !carreiraId || String(r.carreira_id || "") === String(carreiraId)
  );
}

var FL_topWinnersByCompetitionV3782 = function FL_topWinnersByCompetitionV3782(major){
  const map = new Map();

  FL_championsRowsV3782().forEach(r=>{
    const comp = r.competicao || (typeof compName === "function" ? compName(r.competicao_id) : "") || "";
    const match = FL_matchMajorCompV3782(comp);

    if(!match || match.name !== major.name) return;

    const winner = String(r.clube || r.campeao || r.time_campeao || "").trim();
    if(!winner) return;

    const key = FL_normV3782(winner);
    if(!map.has(key)){
      map.set(key,{name:winner,count:0,seasons:[]});
    }

    const item = map.get(key);
    item.count++;
    if(r.temporada) item.seasons.push(r.temporada);
  });

  return [...map.values()]
    .sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name))
    .slice(0,5);
}

var FL_renderEstatisticasMajorLeaguesV3782 = function FL_renderEstatisticasMajorLeaguesV3782(){
  const page = $("estatisticas");
  if(!page) return;

  let host = $("stats-major-leagues-v3782");
  if(!host){
    host = document.createElement("section");
    host.id = "stats-major-leagues-v3782";
    host.className = "stats-major-leagues-v3782";
    const old = page.querySelector(".content-card, .section-card, .stats-table") || page;
    old.insertAdjacentElement("beforebegin", host);
  }

  host.innerHTML = `
    <div class="stats-leagues-head-v3782">
      <div>
        <h2>Grandes competições</h2>
        <small>Top 5 maiores vencedores conforme você alimenta os campeões das temporadas.</small>
      </div>
    </div>
    <div class="stats-leagues-grid-v3782">
      ${FL_MAJOR_COMPETITIONS_V3782.map(comp=>{
        const winners = FL_topWinnersByCompetitionV3782(comp);
        return `
          <article class="league-winners-card-v3782">
            <div class="league-icon-v3782">
              <img src="${FL_escapeAttrV3782(comp.icon)}" onerror="this.parentElement.innerHTML='🏆'">
            </div>
            <div class="league-info-v3782">
              <h3>${FL_escapeV3782(comp.name)}</h3>
              ${winners.length ? `
                <ol>
                  ${winners.map(w=>`
                    <li>
                      <span>${FL_escapeV3782(w.name)}</span>
                      <b>${w.count}</b>
                    </li>
                  `).join("")}
                </ol>
              ` : `<p>Sem campeões cadastrados ainda.</p>`}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;

  // Esconde a tabela antiga para não duplicar sentido.
  const oldTable = page.querySelector(".stats-table, table");
  if(oldTable) oldTable.closest(".content-card, .section-card")?.classList.add("stats-old-hidden-v3782");
}

var renderEstatisticas = function renderEstatisticas(){
  FL_renderEstatisticasMajorLeaguesV3782();
}

window.renderEstatisticas = renderEstatisticas;
window.renderStats = renderEstatisticas;


// ===== V3.7.83 BOLA DE OURO MODAL + BRASILEIRÃO + ESCUDO SELEÇÃO =====
// Correções:
// 1) Remove o bloco "Melhores" de dentro da tabela/arte da temporada.
// 2) O botão "Os melhores" abre um modal próprio com filtros no lugar certo.
// 3) Estatísticas inclui Brasileirão.
// 4) Brasil/seleções têm escudo forçado por fallback confiável, sem depender só da API.

let FL_BALLON_BEST_MODE_V3783 = "player";

var FL_normV3783 = function FL_normV3783(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3783 = function FL_escapeV3783(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3783 = function FL_escapeAttrV3783(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

// ---------- Seleções: fallback forte ----------
var FL_selectionBadgeStrongV3783 = function FL_selectionBadgeStrongV3783(name){
  const k = FL_normV3783(name);

  const commons = filename => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=180`;

  const map = {
    brasil: commons("Brazilian Football Confederation logo.svg"),
    brazil: commons("Brazilian Football Confederation logo.svg"),
    brasileira: commons("Brazilian Football Confederation logo.svg"),
    brasileiro: commons("Brazilian Football Confederation logo.svg"),

    argentina: commons("Argentina_national_football_team_logo.svg"),
    franca: commons("France_national_football_team_logo.svg"),
    france: commons("France_national_football_team_logo.svg"),
    espanha: commons("Spain_national_football_team_logo.svg"),
    spain: commons("Spain_national_football_team_logo.svg"),
    portugal: commons("Portuguese_Football_Federation.svg"),
    inglaterra: commons("England_national_football_team_crest.svg"),
    england: commons("England_national_football_team_crest.svg"),
    alemanha: commons("DFBEagle.svg"),
    germany: commons("DFBEagle.svg"),
    italia: commons("Italy_national_football_team_logo.svg"),
    italy: commons("Italy_national_football_team_logo.svg"),
    holanda: commons("Netherlands_national_football_team_logo.svg"),
    netherlands: commons("Netherlands_national_football_team_logo.svg"),
    uruguai: commons("Uruguay_football_association_logo.svg"),
    uruguay: commons("Uruguay_football_association_logo.svg")
  };

  if(map[k]) return map[k];

  if(typeof FL_badgeFallbackV3780 === "function"){
    const old = FL_badgeFallbackV3780(name);
    if(old) return old;
  }

  if(typeof FL_countryCodeV3780 === "function"){
    const code = FL_countryCodeV3780(name);
    if(code && !code.includes("-")) return `https://flagcdn.com/w160/${code}.png`;
  }

  return "";
}

window.getSelectionBadgeV3760 = FL_selectionBadgeStrongV3783;
window.FL_badgeFallbackV3780 = FL_selectionBadgeStrongV3783;

var FL_fetchNationalBadgeV3783 = async function FL_fetchNationalBadgeV3783(name){
  const fallback = FL_selectionBadgeStrongV3783(name);
  const k = FL_normV3783(name);

  // Brasil não pode falhar: usa Commons direto.
  if(["brasil","brazil","brasileira","brasileiro"].includes(k)) return fallback;

  try{
    if(typeof FL_fetchNationalBadgeV3780 === "function"){
      const api = await FL_fetchNationalBadgeV3780(name);
      return api || fallback;
    }
  }catch(err){}

  return fallback;
}

window.FL_fetchNationalBadgeV3780 = FL_fetchNationalBadgeV3783;

var FL_fixBrazilSelectionBadgesV3783 = function FL_fixBrazilSelectionBadgesV3783(){
  const badge = FL_selectionBadgeStrongV3783("Brasil");

  // Corrige placeholders que possuem texto Brasil/Brazil dentro de cards de seleção.
  const candidates = [...document.querySelectorAll("article, .selection-card, .national-card, .career-club-card, .season-selection, .selection-season-card, div")]
    .filter(el=>{
      const txt = (el.textContent || "").toLowerCase();
      const rect = el.getBoundingClientRect();
      if(rect.width < 120 || rect.height < 35 || rect.height > 260) return false;
      return (txt.includes("brasil") || txt.includes("brazil")) &&
             (txt.includes("seleção") || txt.includes("selecao") || txt.includes("editar seleção") || txt.includes("editar selecao") || txt.includes("sem dados") || txt.includes("jogos") || txt.includes("gols"));
    })
    .filter(el=>!el.querySelector(".selection-badge-fixed-v3783"));

  candidates.slice(0,20).forEach(el=>{
    const badgeBox = document.createElement("span");
    badgeBox.className = "selection-badge-fixed-v3783";
    badgeBox.innerHTML = `<img src="${FL_escapeAttrV3783(badge)}" onerror="this.parentElement.innerHTML='🇧🇷'">`;
    el.prepend(badgeBox);
  });

  // Corrige nós declarados por data.
  document.querySelectorAll("[data-national-team-v3780], [data-national-team-v3783]").forEach(async node=>{
    const name = node.dataset.nationalTeamV3780 || node.dataset.nationalTeamV3783 || "Brasil";
    const img = await FL_fetchNationalBadgeV3783(name);
    if(node.isConnected && img){
      node.innerHTML = `<img src="${FL_escapeAttrV3783(img)}" onerror="this.parentElement.innerHTML='🇧🇷'">`;
    }
  });
}

// ---------- Estatísticas: adiciona Brasileirão ----------
var FL_ensureBrasileiraoStatsV3783 = function FL_ensureBrasileiraoStatsV3783(){
  try{
    if(!Array.isArray(FL_MAJOR_COMPETITIONS_V3782)) return;
    if(FL_MAJOR_COMPETITIONS_V3782.some(c => FL_normV3783(c.name).includes("brasileirao"))) return;

    FL_MAJOR_COMPETITIONS_V3782.splice(1, 0, {
      name:"Brasileirão",
      aliases:["brasileirao","brasileirão","brazilian serie a","brazilian série a","campeonato brasileiro","brazilian serie a"],
      icon:"https://commons.wikimedia.org/wiki/Special:FilePath/Brasileir%C3%A3o_S%C3%A9rie_A_logo.png?width=220"
    });
  }catch(err){
    console.warn("Falha adicionando Brasileirão:", err);
  }
}

// ---------- Bola de Ouro: modal correto ----------
var FL_ballonRowsAllV3783 = function FL_ballonRowsAllV3783(){
  const career = (getTable("BOLA_DE_OURO_CARREIRA") || []).map(r=>Object.assign({__source:"career"}, r));
  const base = (typeof getTable === "function" ? (getTable("BOLA_DE_OURO_BASE") || getTable("BOLA_DE_OURO") || []) : []).map(r=>Object.assign({__source:"real"}, r));

  const map = new Map();

  [...base, ...career].forEach(r=>{
    const key = r.id && r.__source
      ? `${r.__source}:${r.id}`
      : `${r.__source || ""}|${r.temporada || r.ano || ""}|${r.posicao || ""}|${FL_normV3783(r.jogador || "")}|${FL_normV3783(r.clube || "")}`;

    map.set(key,r);
  });

  return [...map.values()].filter(r=>r.jogador || r.clube || r.pais || r.nacionalidade);
}

var FL_groupBallonBestV3783 = function FL_groupBallonBestV3783(mode){
  const rows = FL_ballonRowsAllV3783();
  const map = new Map();

  rows.forEach(r=>{
    const pos = Number(r.posicao || 0);
    if(!pos) return;

    let include = false;
    let key = "";
    let label = "";
    let sub = "";

    if(mode === "player"){
      include = pos === 1;
      key = FL_normV3783(r.jogador);
      label = r.jogador || "-";
      sub = "Bolas de Ouro";
    }else if(mode === "second"){
      include = pos === 2;
      key = FL_normV3783(r.jogador);
      label = r.jogador || "-";
      sub = "2º lugares";
    }else if(mode === "third"){
      include = pos === 3;
      key = FL_normV3783(r.jogador);
      label = r.jogador || "-";
      sub = "3º lugares";
    }else if(mode === "club"){
      include = pos === 1;
      key = FL_normV3783(r.clube || "Sem clube");
      label = r.clube || "Sem clube";
      sub = "Bolas de Ouro por time";
    }else if(mode === "country"){
      include = pos === 1;
      key = FL_normV3783(r.pais || r.nacionalidade || "Sem país");
      label = r.pais || r.nacionalidade || "Sem país";
      sub = "Bolas de Ouro por país";
    }else if(mode === "appearances"){
      include = true;
      key = FL_normV3783(r.jogador);
      label = r.jogador || "-";
      sub = "Aparições no Top 10";
    }

    if(!include || !key) return;

    if(!map.has(key)){
      map.set(key,{label,sub,count:0,details:[],career:0,real:0,wins:0,seconds:0,thirds:0});
    }

    const item = map.get(key);
    item.count++;
    if(r.__source === "career") item.career++;
    else item.real++;

    if(pos === 1) item.wins++;
    if(pos === 2) item.seconds++;
    if(pos === 3) item.thirds++;

    item.details.push(`${r.temporada || r.ano || "-"} #${pos}`);
  });

  return [...map.values()].sort((a,b)=>
    b.count - a.count ||
    b.wins - a.wins ||
    b.seconds - a.seconds ||
    a.label.localeCompare(b.label)
  );
}

var FL_ballonModeLabelV3783 = function FL_ballonModeLabelV3783(mode){
  const labels = {
    player:"Por jogador",
    second:"Mais vezes 2º lugar",
    third:"Mais vezes 3º lugar",
    club:"Por time",
    country:"Por país",
    appearances:"Mais vezes em qualquer posição"
  };
  return labels[mode] || "Melhores";
}

var FL_renderBallonBestModalV3783 = function FL_renderBallonBestModalV3783(){
  let modal = document.getElementById("fl-ballon-best-modal-v3783");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "fl-ballon-best-modal-v3783";
    modal.className = "fl-ballon-best-modal-v3783";
    document.body.appendChild(modal);
  }

  const modes = [
    ["player","Por jogador"],
    ["second","Mais 2º lugar"],
    ["third","Mais 3º lugar"],
    ["club","Por time"],
    ["country","Por país"],
    ["appearances","Qualquer posição"]
  ];

  const rows = FL_groupBallonBestV3783(FL_BALLON_BEST_MODE_V3783).slice(0,30);

  modal.innerHTML = `
    <div class="fl-ballon-best-backdrop-v3783" onclick="FL_closeBallonBestModalV3783()"></div>
    <div class="fl-ballon-best-panel-v3783">
      <button class="fl-ballon-best-close-v3783" onclick="FL_closeBallonBestModalV3783()">×</button>
      <div class="fl-ballon-best-title-v3783">
        <div>
          <h2>Os melhores da Bola de Ouro</h2>
          <small>${FL_escapeV3783(FL_ballonModeLabelV3783(FL_BALLON_BEST_MODE_V3783))}</small>
        </div>
      </div>

      <div class="fl-ballon-best-tabs-v3783">
        ${modes.map(([id,label])=>`
          <button class="${id===FL_BALLON_BEST_MODE_V3783 ? "active" : ""}" onclick="FL_BALLON_BEST_MODE_V3783='${id}'; FL_renderBallonBestModalV3783();">${label}</button>
        `).join("")}
      </div>

      <div class="fl-ballon-best-list-v3783">
        ${rows.map((r,idx)=>`
          <article class="fl-ballon-best-row-v3783">
            <span class="rank">${idx+1}</span>
            <div class="info">
              <strong>${FL_escapeV3783(r.label)}</strong>
              <small>${FL_escapeV3783(r.sub)} • ${r.career ? `${r.career} carreira` : ""}${r.career && r.real ? " • " : ""}${r.real ? `${r.real} real` : ""}</small>
              <em>${FL_escapeV3783(r.details.slice(0,8).join(" • "))}${r.details.length>8 ? "..." : ""}</em>
            </div>
            <b>${r.count}x</b>
          </article>
        `).join("") || `<div class="fl-empty-v3783">Sem dados para esta visualização.</div>`}
      </div>
    </div>
  `;
}

var FL_closeBallonBestModalV3783 = function FL_closeBallonBestModalV3783(){
  document.getElementById("fl-ballon-best-modal-v3783")?.remove();
}

var FL_hideInlineBallonBestV3783 = function FL_hideInlineBallonBestV3783(){
  document.querySelectorAll("#ballon-best-v3780,.ballon-best-v3780").forEach(el=>{
    el.remove();
  });
}

var FL_bindBestButtonV3783 = function FL_bindBestButtonV3783(){
  document.querySelectorAll("button,a").forEach(btn=>{
    const txt = (btn.textContent || "").toLowerCase();
    if(!txt.includes("os melhores")) return;
    if(btn.dataset.bestModalV3783) return;

    btn.dataset.bestModalV3783 = "1";
    btn.addEventListener("click", e=>{
      e.preventDefault();
      e.stopPropagation();
      FL_renderBallonBestModalV3783();
    }, true);
  });
}

// Neutraliza o bloco antigo embaixo da tabela.
window.FL_renderBallonBestViewsV3780 = function(){ FL_hideInlineBallonBestV3783(); };

// Pós render.
const __renderAllOriginalV3783 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3783 && !window.__renderAllV3783Wrapped){
  window.__renderAllV3783Wrapped = true;
  renderAll = function(){
    const result = __renderAllOriginalV3783.apply(this, arguments);
    setTimeout(()=>{
      FL_ensureBrasileiraoStatsV3783();
      FL_hideInlineBallonBestV3783();
      FL_bindBestButtonV3783();
      FL_fixBrazilSelectionBadgesV3783();
      if(typeof FL_renderEstatisticasMajorLeaguesV3782 === "function") FL_renderEstatisticasMajorLeaguesV3782();
    }, 250);
    setTimeout(FL_fixBrazilSelectionBadgesV3783, 1200);
    return result;
  };
}

document.addEventListener("click", ()=>{
  setTimeout(()=>{
    FL_hideInlineBallonBestV3783();
    FL_bindBestButtonV3783();
    FL_fixBrazilSelectionBadgesV3783();
  }, 220);
}, true);

setTimeout(()=>{
  FL_ensureBrasileiraoStatsV3783();
  FL_bindBestButtonV3783();
  FL_fixBrazilSelectionBadgesV3783();
}, 1000);

window.FL_renderBallonBestModalV3783 = FL_renderBallonBestModalV3783;
window.FL_closeBallonBestModalV3783 = FL_closeBallonBestModalV3783;
window.FL_ensureBrasileiraoStatsV3783 = FL_ensureBrasileiraoStatsV3783;
window.FL_fixBrazilSelectionBadgesV3783 = FL_fixBrazilSelectionBadgesV3783;


// ===== V3.7.84 ISOLAMENTO FORTE DE ABAS =====
// Corrige bug onde conteúdo de Troféus/Estatísticas continuava aparecendo em Records ou outras abas.
// Regra: só a aba ativa pode ficar visível. Blocos temporários são removidos ao sair da aba.

var FL_currentPageV3784 = function FL_currentPageV3784(){
  try{
    if(typeof currentPageId !== "undefined" && currentPageId) return currentPageId;
  }catch(err){}

  const activeMenu = document.querySelector(".menu-item.active[data-page]");
  if(activeMenu?.dataset?.page) return activeMenu.dataset.page;

  const activePage = document.querySelector(".page.active");
  if(activePage?.id) return activePage.id;

  return document.body.dataset.currentPage || "dashboard";
}

var FL_pageIdsV3784 = function FL_pageIdsV3784(){
  return [
    "dashboard",
    "resumo",
    "personagens",
    "estatisticas",
    "trofeus",
    "top11",
    "bolaouro",
    "records",
    "clubes",
    "museu",
    "selecaobrasileira",
    "selecaoconvocacoes"
  ];
}

var FL_removeForeignDynamicBlocksV3784 = function FL_removeForeignDynamicBlocksV3784(activePage){
  try{
    // Estatísticas nova só pode existir na aba estatisticas.
    if(activePage !== "estatisticas"){
      document.querySelectorAll("#stats-major-leagues-v3782,.stats-major-leagues-v3782").forEach(el=>el.remove());
      document.querySelectorAll(".stats-old-hidden-v3782").forEach(el=>el.classList.remove("stats-old-hidden-v3782"));
    }

    // Top11 mapa só pode existir na aba top11.
    if(activePage !== "top11"){
      document.querySelectorAll("#top11-map-v3781,.top11-map-section-v3781").forEach(el=>el.remove());
    }

    // Bola de Ouro inline antigo nunca deve aparecer.
    document.querySelectorAll("#ballon-best-v3780,.ballon-best-v3780").forEach(el=>el.remove());

    // X espalhado antigo nunca deve aparecer.
    document.querySelectorAll(".delete-career-item-x-v3769").forEach(el=>el.remove());
  }catch(err){
    console.warn("Falha limpando blocos estrangeiros v3.7.84:", err);
  }
}

var FL_forceOnlyActivePageV3784 = function FL_forceOnlyActivePageV3784(pageId){
  const activePage = pageId || FL_currentPageV3784() || "dashboard";
  document.body.dataset.currentPage = activePage;

  try{
    currentPageId = activePage;
  }catch(err){}

  const ids = FL_pageIdsV3784();

  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;

    const isActive = id === activePage || (activePage === "resumo" && id === "dashboard");

    el.classList.toggle("active", isActive);
    el.hidden = !isActive;
    el.style.display = isActive ? "" : "none";
  });

  // Segurança: qualquer .page sem id conhecido também fica escondida se não for ativa.
  document.querySelectorAll(".page").forEach(el=>{
    const isActive = el.id === activePage || (activePage === "resumo" && el.id === "dashboard");
    if(!isActive){
      el.classList.remove("active");
      el.hidden = true;
      el.style.display = "none";
    }
  });

  document.querySelectorAll(".menu-item[data-page]").forEach(item=>{
    item.classList.toggle("active", item.dataset.page === activePage);
  });

  FL_removeForeignDynamicBlocksV3784(activePage);
}

var FL_renderActivePageV3784 = function FL_renderActivePageV3784(pageId, force=false){
  const page = pageId || FL_currentPageV3784() || "dashboard";

  FL_forceOnlyActivePageV3784(page);

  try{
    if(typeof renderGlobalSelectorsOnly === "function"){
      renderGlobalSelectorsOnly();
    }
  }catch(err){
    console.error("Erro global selectors v3.7.84:", err);
  }

  try{
    if(typeof renderPageById === "function"){
      renderPageById(page, force);
    }else{
      // fallback por nome direto
      if(page === "estatisticas" && typeof renderEstatisticas === "function") renderEstatisticas();
      if(page === "trofeus" && typeof renderTrofeus === "function") renderTrofeus();
      if(page === "top11" && typeof renderTop11 === "function") renderTop11();
      if(page === "bolaouro" && typeof renderBolaOuro === "function") renderBolaOuro();
    }
  }catch(err){
    console.error("Erro render page v3.7.84:", page, err);
  }

  // Isola de novo depois do render, porque alguns renders mexem no DOM.
  FL_forceOnlyActivePageV3784(page);

  // Re-render específico seguro, apenas se a aba ativa for a correta.
  try{
    if(page === "estatisticas" && typeof FL_renderEstatisticasMajorLeaguesV3782 === "function"){
      FL_renderEstatisticasMajorLeaguesV3782();
    }

    if(page === "top11" && typeof FL_renderTop11MapV3781 === "function"){
      FL_renderTop11MapV3781();
    }

    if(page === "bolaouro"){
      if(typeof FL_bindBestButtonV3783 === "function") FL_bindBestButtonV3783();
      if(typeof FL_hideInlineBallonBestV3783 === "function") FL_hideInlineBallonBestV3783();
    }

    if(typeof FL_fixBrazilSelectionBadgesV3783 === "function"){
      FL_fixBrazilSelectionBadgesV3783();
    }
  }catch(err){
    console.warn("Pós-render específico v3.7.84 falhou:", err);
  }

  FL_forceOnlyActivePageV3784(page);
}

// Sobrescreve navegação de forma definitiva.
window.navigate = function(pageId){
  if(!pageId) return;

  try{
    currentPageId = pageId;
  }catch(err){}

  document.body.dataset.currentPage = pageId;

  FL_forceOnlyActivePageV3784(pageId);

  setTimeout(()=>FL_renderActivePageV3784(pageId, true), 0);
};

// Sobrescreve renderAll para renderizar somente a aba ativa.
window.renderAll = function(){
  const page = FL_currentPageV3784() || "dashboard";
  FL_renderActivePageV3784(page, true);
};

// Captura cliques no menu antes dos handlers antigos.
document.addEventListener("click", function(e){
  const menu = e.target.closest(".menu-item[data-page]");
  if(menu?.dataset?.page){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    window.navigate(menu.dataset.page);
  }
}, true);

// Reforços após qualquer render tardio.
var FL_periodicIsolationV3784 = function FL_periodicIsolationV3784(){
  const page = FL_currentPageV3784() || document.body.dataset.currentPage || "dashboard";
  FL_forceOnlyActivePageV3784(page);
}

setTimeout(FL_periodicIsolationV3784, 250);
setTimeout(FL_periodicIsolationV3784, 1000);
setTimeout(FL_periodicIsolationV3784, 2500);

window.FL_forceOnlyActivePageV3784 = FL_forceOnlyActivePageV3784;
window.FL_renderActivePageV3784 = FL_renderActivePageV3784;


// ===== V3.7.85 CORRIGE ESCUDO BR ESPALHADO + MELHORES COM ÍCONES =====
// Correções:
// 1) Remove a injeção ampla que colocou escudo do Brasil em tudo.
// 2) Mantém escudo de seleção apenas quando o componente pede explicitamente.
// 3) Modal "Os melhores" ganha bandeira/escudo por jogador, clube e país.

const FL_CLUB_BADGE_CACHE_V3785 = {};

var FL_normV3785 = function FL_normV3785(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3785 = function FL_escapeV3785(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3785 = function FL_escapeAttrV3785(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

// ---------- Escudo seleção: não espalhar ----------
var FL_removeScatteredBrazilBadgesV3785 = function FL_removeScatteredBrazilBadgesV3785(){
  document.querySelectorAll(".selection-badge-fixed-v3783").forEach(el => el.remove());
}

// Neutraliza função antiga que espalhava o CBF em cards errados.
window.FL_fixBrazilSelectionBadgesV3783 = function(){
  FL_removeScatteredBrazilBadgesV3785();

  // Só atualiza nós explicitamente marcados como seleção.
  document.querySelectorAll("[data-national-team-v3780], [data-national-team-v3783], [data-selection-badge]").forEach(async node=>{
    const name = node.dataset.nationalTeamV3780 || node.dataset.nationalTeamV3783 || node.dataset.selectionBadge || "Brasil";
    const img = typeof FL_fetchNationalBadgeV3783 === "function"
      ? await FL_fetchNationalBadgeV3783(name)
      : FL_selectionBadgeUrlV3785(name);

    if(node.isConnected && img){
      node.innerHTML = `<img src="${FL_escapeAttrV3785(img)}" onerror="this.parentElement.innerHTML='${FL_countryEmojiV3785(name)}'">`;
    }
  });
};

var FL_selectionBadgeUrlV3785 = function FL_selectionBadgeUrlV3785(name){
  const k = FL_normV3785(name);
  const commons = filename => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=180`;

  const map = {
    brasil: commons("Brazilian Football Confederation logo.svg"),
    brazil: commons("Brazilian Football Confederation logo.svg"),
    brasileira: commons("Brazilian Football Confederation logo.svg"),
    brasileiro: commons("Brazilian Football Confederation logo.svg"),
    argentina: commons("Argentina_national_football_team_logo.svg"),
    franca: commons("France_national_football_team_logo.svg"),
    france: commons("France_national_football_team_logo.svg"),
    espanha: commons("Spain_national_football_team_logo.svg"),
    spain: commons("Spain_national_football_team_logo.svg"),
    portugal: commons("Portuguese_Football_Federation.svg"),
    inglaterra: commons("England_national_football_team_crest.svg"),
    england: commons("England_national_football_team_crest.svg"),
    alemanha: commons("DFBEagle.svg"),
    germany: commons("DFBEagle.svg"),
    italia: commons("Italy_national_football_team_logo.svg"),
    italy: commons("Italy_national_football_team_logo.svg"),
    holanda: commons("Netherlands_national_football_team_logo.svg"),
    netherlands: commons("Netherlands_national_football_team_logo.svg"),
    uruguai: commons("Uruguay_football_association_logo.svg"),
    uruguay: commons("Uruguay_football_association_logo.svg")
  };

  if(map[k]) return map[k];

  const code = FL_countryCodeV3785(name);
  return code && !code.includes("-") ? `https://flagcdn.com/w160/${code}.png` : "";
}

window.getSelectionBadgeV3760 = FL_selectionBadgeUrlV3785;
window.FL_badgeFallbackV3780 = FL_selectionBadgeUrlV3785;

// ---------- País/bandeira ----------
var FL_countryCodeV3785 = function FL_countryCodeV3785(name){
  const k = FL_normV3785(name);
  const map = {
    brasil:"br", brazil:"br", brasileiro:"br", brasileira:"br",
    argentina:"ar", argentino:"ar", argentina:"ar",
    franca:"fr", france:"fr", frances:"fr", francesa:"fr",
    espanha:"es", spain:"es", espanhol:"es", espanhola:"es",
    portugal:"pt", portugues:"pt", portuguesa:"pt",
    inglaterra:"gb-eng", england:"gb-eng", ingles:"gb-eng", inglesa:"gb-eng",
    alemanha:"de", germany:"de", alemao:"de", alema:"de",
    italia:"it", italy:"it", italiano:"it", italiana:"it",
    holanda:"nl", netherlands:"nl", holandes:"nl", holandesa:"nl",
    uruguai:"uy", uruguay:"uy", uruguaio:"uy", uruguaia:"uy",
    belgica:"be", belgium:"be", belga:"be",
    croacia:"hr", croatia:"hr", croata:"hr",
    mexico:"mx", mexicano:"mx", mexicana:"mx",
    estadosunidos:"us", usa:"us", americano:"us", estadunidense:"us",
    japao:"jp", japan:"jp", japones:"jp", japonesa:"jp",
    colombia:"co", colombiano:"co", colombiana:"co",
    chile:"cl", chileno:"cl", chilena:"cl",
    paraguai:"py", paraguaio:"py", paraguaia:"py",
    equador:"ec", ecuador:"ec",
    peru:"pe", peruano:"pe", peruana:"pe",
    marrocos:"ma", morocco:"ma",
    senegal:"sn",
    nigeria:"ng",
    egito:"eg", egypt:"eg",
    camaroes:"cm", cameroon:"cm",
    coreiadosul:"kr", southkorea:"kr",
    australia:"au",
    canada:"ca"
  };
  return map[k] || "";
}

var FL_countryEmojiV3785 = function FL_countryEmojiV3785(name){
  const code = FL_countryCodeV3785(name);
  if(!code || code.includes("-")) return "🌐";
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

var FL_countryFlagUrlV3785 = function FL_countryFlagUrlV3785(name){
  const code = FL_countryCodeV3785(name);
  return code && !code.includes("-") ? `https://flagcdn.com/w80/${code}.png` : "";
}

// ---------- Clubes: TheSportsDB + fallback ----------
var FL_clubBadgeFallbackV3785 = function FL_clubBadgeFallbackV3785(name){
  const k = FL_normV3785(name);
  const wiki = filename => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=180`;

  const map = {
    juventus: wiki("Juventus_FC_2017_logo.svg"),
    juventusfc: wiki("Juventus_FC_2017_logo.svg"),
    juve: wiki("Juventus_FC_2017_logo.svg"),
    juventusturin: wiki("Juventus_FC_2017_logo.svg"),

    realmadrid: wiki("Real_Madrid_CF.svg"),
    madrid: wiki("Real_Madrid_CF.svg"),
    barcelona: wiki("FC_Barcelona_(crest).svg"),
    fcbarcelona: wiki("FC_Barcelona_(crest).svg"),

    acmilan: wiki("AC_Milan.svg"),
    milan: wiki("AC_Milan.svg"),
    intermilan: wiki("FC_Internazionale_Milano_2021.svg"),
    inter: wiki("FC_Internazionale_Milano_2021.svg"),

    manchestercity: wiki("Manchester_City_FC_badge.svg"),
    mancity: wiki("Manchester_City_FC_badge.svg"),
    manchesterunited: wiki("Manchester_United_FC_crest.svg"),
    manutd: wiki("Manchester_United_FC_crest.svg"),

    arsenal: wiki("Arsenal_FC.svg"),
    chelsea: wiki("Chelsea_FC.svg"),
    liverpool: wiki("Liverpool_FC.svg"),
    tottenham: wiki("Tottenham_Hotspur.svg"),

    psg: wiki("Paris_Saint-Germain_F.C..svg"),
    parissaintgermain: wiki("Paris_Saint-Germain_F.C..svg"),

    bayern: wiki("FC_Bayern_München_logo_(2024).svg"),
    bayernmunich: wiki("FC_Bayern_München_logo_(2024).svg"),
    borussiadortmund: wiki("Borussia_Dortmund_logo.svg"),
    dortmund: wiki("Borussia_Dortmund_logo.svg"),

    corinthians: wiki("Sport_Club_Corinthians_Paulista_crest.svg"),
    flamengo: wiki("Flamengo_braz_logo.svg"),
    palmeiras: wiki("Palmeiras_logo.svg"),
    saopaulo: wiki("São_Paulo_FC.svg"),
    santos: wiki("Santos_Logo.png"),
    gremio: wiki("Grêmio_FBPA.svg"),
    internacional: wiki("SC_Internacional.svg"),

    newcastle: wiki("Newcastle_United_Logo.svg"),
    newcastleunited: wiki("Newcastle_United_Logo.svg")
  };

  return map[k] || "";
}

var FL_fetchClubBadgeV3785 = async function FL_fetchClubBadgeV3785(name){
  const clean = String(name || "").trim();
  const key = FL_normV3785(clean);
  if(!key) return "";

  if(FL_CLUB_BADGE_CACHE_V3785[key] !== undefined) return FL_CLUB_BADGE_CACHE_V3785[key];

  const fallback = FL_clubBadgeFallbackV3785(clean);

  try{
    const variants = [
      clean,
      `${clean} FC`,
      clean.replace(/\bFC\b/ig,"").trim()
    ].filter(Boolean);

    for(const q of [...new Set(variants)]){
      const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(q)}`;
      const res = await fetch(url, {cache:"force-cache"});
      const data = await res.json();
      const teams = data?.teams || [];

      const found = teams.find(t => FL_normV3785(t.strSport).includes("soccer")) || teams[0];

      if(found?.strBadge){
        FL_CLUB_BADGE_CACHE_V3785[key] = found.strBadge;
        return found.strBadge;
      }
    }
  }catch(err){
    console.warn("Falha buscando escudo clube:", clean, err);
  }

  FL_CLUB_BADGE_CACHE_V3785[key] = fallback;
  return fallback;
}

// ---------- Modal Melhores melhorado ----------
var FL_ballonRowsAllV3785 = function FL_ballonRowsAllV3785(){
  const career = (getTable("BOLA_DE_OURO_CARREIRA") || []).map(r=>Object.assign({__source:"career"}, r));
  const base = (getTable("BOLA_DE_OURO_BASE") || getTable("BOLA_DE_OURO") || []).map(r=>Object.assign({__source:"real"}, r));

  const map = new Map();

  [...base, ...career].forEach(r=>{
    const key = r.id && r.__source
      ? `${r.__source}:${r.id}`
      : `${r.__source || ""}|${r.temporada || r.ano || ""}|${r.posicao || ""}|${FL_normV3785(r.jogador || "")}|${FL_normV3785(r.clube || "")}`;

    map.set(key,r);
  });

  return [...map.values()].filter(r=>r.jogador || r.clube || r.pais || r.nacionalidade);
}

var FL_groupBallonBestV3785 = function FL_groupBallonBestV3785(mode){
  const rows = FL_ballonRowsAllV3785();
  const map = new Map();

  rows.forEach(r=>{
    const pos = Number(r.posicao || 0);
    if(!pos) return;

    let include = false;
    let key = "";
    let label = "";
    let sub = "";

    const country = r.pais || r.nacionalidade || "";
    const club = r.clube || "";

    if(mode === "player"){
      include = pos === 1;
      key = FL_normV3785(r.jogador);
      label = r.jogador || "-";
      sub = "Bolas de Ouro";
    }else if(mode === "second"){
      include = pos === 2;
      key = FL_normV3785(r.jogador);
      label = r.jogador || "-";
      sub = "2º lugares";
    }else if(mode === "third"){
      include = pos === 3;
      key = FL_normV3785(r.jogador);
      label = r.jogador || "-";
      sub = "3º lugares";
    }else if(mode === "club"){
      include = pos === 1;
      key = FL_normV3785(club || "Sem clube");
      label = club || "Sem clube";
      sub = "Bolas de Ouro por time";
    }else if(mode === "country"){
      include = pos === 1;
      key = FL_normV3785(country || "Sem país");
      label = country || "Sem país";
      sub = "Bolas de Ouro por país";
    }else if(mode === "appearances"){
      include = true;
      key = FL_normV3785(r.jogador);
      label = r.jogador || "-";
      sub = "Aparições no Top 10";
    }

    if(!include || !key) return;

    if(!map.has(key)){
      map.set(key,{
        label,
        sub,
        count:0,
        details:[],
        career:0,
        real:0,
        wins:0,
        seconds:0,
        thirds:0,
        country,
        club,
        mode
      });
    }

    const item = map.get(key);
    item.count++;

    if(!item.country && country) item.country = country;
    if(!item.club && club) item.club = club;

    if(r.__source === "career") item.career++;
    else item.real++;

    if(pos === 1) item.wins++;
    if(pos === 2) item.seconds++;
    if(pos === 3) item.thirds++;

    item.details.push(`${r.temporada || r.ano || "-"} #${pos}`);
  });

  return [...map.values()].sort((a,b)=>
    b.count - a.count ||
    b.wins - a.wins ||
    b.seconds - a.seconds ||
    a.label.localeCompare(b.label)
  );
}

var FL_iconHtmlBallonV3785 = function FL_iconHtmlBallonV3785(row, mode){
  const country = row.country || row.label || "";
  const club = row.club || row.label || "";

  if(mode === "club"){
    return `<span class="fl-ballon-icon-v3785 club" data-club-badge-v3785="${FL_escapeAttrV3785(club)}">${FL_escapeV3785((club || "?").slice(0,2).toUpperCase())}</span>`;
  }

  const flag = FL_countryFlagUrlV3785(mode === "country" ? row.label : country);
  const emoji = FL_countryEmojiV3785(mode === "country" ? row.label : country);

  return `<span class="fl-ballon-icon-v3785 flag">${flag ? `<img src="${FL_escapeAttrV3785(flag)}" onerror="this.parentElement.innerHTML='${emoji}'">` : emoji}</span>`;
}

var FL_modeLabelBallonV3785 = function FL_modeLabelBallonV3785(mode){
  const labels = {
    player:"Por jogador",
    second:"Mais vezes 2º lugar",
    third:"Mais vezes 3º lugar",
    club:"Por time",
    country:"Por país",
    appearances:"Mais vezes em qualquer posição"
  };
  return labels[mode] || "Melhores";
}

var FL_renderBallonBestModalV3785 = function FL_renderBallonBestModalV3785(){
  let modal = document.getElementById("fl-ballon-best-modal-v3783");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "fl-ballon-best-modal-v3783";
    modal.className = "fl-ballon-best-modal-v3783";
    document.body.appendChild(modal);
  }

  const modes = [
    ["player","Por jogador"],
    ["second","Mais 2º lugar"],
    ["third","Mais 3º lugar"],
    ["club","Por time"],
    ["country","Por país"],
    ["appearances","Qualquer posição"]
  ];

  const activeMode = window.FL_BALLON_BEST_MODE_V3783 || "player";
  const rows = FL_groupBallonBestV3785(activeMode).slice(0,30);

  modal.innerHTML = `
    <div class="fl-ballon-best-backdrop-v3783" onclick="FL_closeBallonBestModalV3783()"></div>
    <div class="fl-ballon-best-panel-v3783 fl-ballon-best-panel-v3785">
      <button class="fl-ballon-best-close-v3783" onclick="FL_closeBallonBestModalV3783()">×</button>
      <div class="fl-ballon-best-title-v3783">
        <div>
          <h2>Os melhores da Bola de Ouro</h2>
          <small>${FL_escapeV3785(FL_modeLabelBallonV3785(activeMode))}</small>
        </div>
      </div>

      <div class="fl-ballon-best-tabs-v3783">
        ${modes.map(([id,label])=>`
          <button class="${id===activeMode ? "active" : ""}" onclick="window.FL_BALLON_BEST_MODE_V3783='${id}'; FL_renderBallonBestModalV3785();">${label}</button>
        `).join("")}
      </div>

      <div class="fl-ballon-best-list-v3783">
        ${rows.map((r,idx)=>`
          <article class="fl-ballon-best-row-v3783 fl-ballon-best-row-v3785">
            <span class="rank">${idx+1}</span>
            ${FL_iconHtmlBallonV3785(r, activeMode)}
            <div class="info">
              <strong>${FL_escapeV3785(r.label)}</strong>
              <small>${FL_escapeV3785(r.sub)} ${r.club && activeMode !== "club" ? `• ${FL_escapeV3785(r.club)}` : ""} ${r.country && activeMode !== "country" ? `• ${FL_escapeV3785(r.country)}` : ""}</small>
              <em>${FL_escapeV3785(r.details.slice(0,8).join(" • "))}${r.details.length>8 ? "..." : ""}</em>
            </div>
            <b>${r.count}x</b>
          </article>
        `).join("") || `<div class="fl-empty-v3783">Sem dados para esta visualização.</div>`}
      </div>
    </div>
  `;

  FL_enrichBallonClubBadgesV3785();
}

var FL_enrichBallonClubBadgesV3785 = async function FL_enrichBallonClubBadgesV3785(){
  const nodes = [...document.querySelectorAll("[data-club-badge-v3785]")];

  for(const node of nodes){
    const club = node.dataset.clubBadgeV3785 || "";
    const badge = await FL_fetchClubBadgeV3785(club);
    if(!node.isConnected) continue;

    if(badge){
      node.innerHTML = `<img src="${FL_escapeAttrV3785(badge)}" onerror="this.parentElement.innerHTML='${FL_escapeV3785((club || '?').slice(0,2).toUpperCase())}'">`;
    }
  }
}

// Substitui modal antigo.
window.FL_renderBallonBestModalV3783 = FL_renderBallonBestModalV3785;
window.FL_renderBallonBestModalV3785 = FL_renderBallonBestModalV3785;

// Pós-render.
const __renderAllOriginalV3785 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3785 && !window.__renderAllV3785Wrapped){
  window.__renderAllV3785Wrapped = true;
  renderAll = function(){
    const result = __renderAllOriginalV3785.apply(this, arguments);
    setTimeout(()=>{
      FL_removeScatteredBrazilBadgesV3785();
      if(typeof FL_bindBestButtonV3783 === "function") FL_bindBestButtonV3783();
    }, 250);
    return result;
  };
}

document.addEventListener("click", ()=>{
  setTimeout(FL_removeScatteredBrazilBadgesV3785, 200);
}, true);

setTimeout(FL_removeScatteredBrazilBadgesV3785, 600);
setTimeout(FL_removeScatteredBrazilBadgesV3785, 1600);

window.FL_removeScatteredBrazilBadgesV3785 = FL_removeScatteredBrazilBadgesV3785;


// ===== V3.7.86 TOP11 LIMPO + CRIAR TOP11 + REMOVER DATA AZUL =====
// - Remove texto azul claro de data ISO em temporadas jogadas.
// - Top 11 passa a ter apenas UM mapa.
// - Remove o bloco antigo "Cadastre o Top 11" embaixo.
// - Botão + Top11 funcional por carreira.
// - Tamanho recomendado do fundo Top 11: 1600x1000 ou 1920x1200, proporção 16:10.

let FL_TOP11_EDITING_V3786 = false;
let FL_TOP11_MAP_URL_V3786 = "";

var FL_normV3786 = function FL_normV3786(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3786 = function FL_escapeV3786(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3786 = function FL_escapeAttrV3786(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

var FL_activeCareerIdV3786 = function FL_activeCareerIdV3786(){
  return active?.carreira_id || "";
}

var FL_activeSeasonIdV3786 = function FL_activeSeasonIdV3786(){
  const seasons = typeof getCareerSeasonRecords === "function" ? getCareerSeasonRecords() : (getTable("CARREIRA_TEMPORADAS") || []);
  return seasons[0]?.id || "";
}

var FL_removeSeasonIsoDatesV3786 = function FL_removeSeasonIsoDatesV3786(){
  try{
    const candidates = [...document.querySelectorAll("#dashboard *,.season-card *,.career-season-card *,.played-season-card *,.season-row-card *")];
    candidates.forEach(el=>{
      if(el.children.length) return;
      const txt = (el.textContent || "").trim();
      if(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(txt) || /per[ií]odo n[aã]o definido/i.test(txt)){
        el.style.display = "none";
      }
    });
  }catch(err){
    console.warn("Falha ao remover datas ISO:", err);
  }
}

var FL_top11RowsV3786 = function FL_top11RowsV3786(){
  const carreiraId = FL_activeCareerIdV3786();
  return (getTable("TOP11_CARREIRA") || []).filter(r =>
    !carreiraId || String(r.carreira_id || "") === String(carreiraId)
  );
}

var FL_latestTop11RowsV3786 = function FL_latestTop11RowsV3786(){
  const rows = FL_top11RowsV3786();
  if(!rows.length) return [];

  const seasonId = FL_activeSeasonIdV3786();
  let filtered = rows.filter(r => String(r.carreira_temporada_id || "") === String(seasonId));

  if(!filtered.length){
    const sorted = [...rows].sort((a,b)=>
      String(b.temporada || "").localeCompare(String(a.temporada || "")) ||
      Number(a.id || 0)-Number(b.id || 0)
    );
    const season = sorted[0]?.temporada || "";
    filtered = rows.filter(r => String(r.temporada || "") === String(season));
  }

  return filtered.sort((a,b)=>{
    const order = ["GOL","GK","LD","RB","ZAG","CB","LE","LB","VOL","CDM","MC","CM","MEI","CAM","PD","RW","PE","LW","CA","ST"];
    const ao = order.indexOf(String(a.posicao_tatica || "").toUpperCase());
    const bo = order.indexOf(String(b.posicao_tatica || "").toUpperCase());
    return (ao === -1 ? 99 : ao) - (bo === -1 ? 99 : bo) || Number(a.id || 0)-Number(b.id || 0);
  });
}

var FL_defaultTop11PositionsV3786 = function FL_defaultTop11PositionsV3786(){
  return [
    ["GOL",50,88],
    ["LD",78,70],["ZAG",60,72],["ZAG",40,72],["LE",22,70],
    ["VOL",50,56],
    ["MC",35,43],["MC",65,43],
    ["PD",78,25],["CA",50,18],["PE",22,25]
  ];
}

var FL_initialsV3786 = function FL_initialsV3786(name){
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
}

var FL_fetchPlayerPhotoV3786 = async function FL_fetchPlayerPhotoV3786(name){
  if(typeof FL_fetchPlayerPhotoV3781 === "function"){
    try{ return await FL_fetchPlayerPhotoV3781(name); }catch(err){}
  }

  const clean = String(name || "").trim();
  if(!clean) return "";

  try{
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(clean)}`, {cache:"force-cache"});
    const data = await res.json();
    const p = (data?.player || [])[0];
    return p?.strCutout || p?.strRender || p?.strThumb || "";
  }catch(err){
    return "";
  }
}

var FL_top11CardHtmlV3786 = function FL_top11CardHtmlV3786(row, idx){
  const d = FL_defaultTop11PositionsV3786()[idx] || ["POS",50,50];

  const x = row.x !== undefined && row.x !== "" ? Number(row.x) : d[1];
  const y = row.y !== undefined && row.y !== "" ? Number(row.y) : d[2];
  const pos = row.posicao_tatica || d[0];
  const name = row.jogador || "Jogador";
  const foto = row.foto_url || "";
  const club = row.clube || "";
  const country = row.pais || "";

  return `
    <div class="top11-player-v3786 ${FL_TOP11_EDITING_V3786 ? "editing" : ""}"
         data-id="${FL_escapeAttrV3786(row.id || "")}"
         data-index="${idx}"
         data-player="${FL_escapeAttrV3786(name)}"
         style="left:${x}%; top:${y}%;">
      <div class="top11-photo-v3786">
        ${foto ? `<img src="${FL_escapeAttrV3786(foto)}" onerror="this.parentElement.innerHTML='${FL_escapeV3786(FL_initialsV3786(name))}'">` : FL_escapeV3786(FL_initialsV3786(name))}
      </div>
      <div class="top11-info-v3786">
        <b>${FL_escapeV3786(name)}</b>
        <span>${FL_escapeV3786(pos)}${club ? ` • ${FL_escapeV3786(club)}` : ""}${country ? ` • ${FL_escapeV3786(country)}` : ""}</span>
      </div>
    </div>
  `;
}

var FL_renderTop11CleanV3786 = function FL_renderTop11CleanV3786(){
  const page = $("top11");
  if(!page) return;

  const rows = FL_latestTop11RowsV3786();
  const mapUrl = FL_TOP11_MAP_URL_V3786 || rows.find(r=>r.mapa_url)?.mapa_url || "";

  // Limpa tudo que existia antes para não duplicar mapas/blocos antigos.
  page.innerHTML = `
    <div class="top11-page-head-v3786">
      <div>
        <h2>Top 11</h2>
        <p>Monte o melhor onze da carreira em um mapa visual.</p>
        <small>Fundo recomendado: <b>1600×1000 px</b> ou <b>1920×1200 px</b>, proporção 16:10.</small>
      </div>
      <div class="top11-head-actions-v3786">
        <button type="button" class="ghost" onclick="FL_toggleTop11EditV3786()">${FL_TOP11_EDITING_V3786 ? "Cancelar edição" : "Editar Top 11"}</button>
        <button type="button" class="gold" onclick="FL_openCreateTop11V3786()">+ Top 11</button>
      </div>
    </div>

    <section class="top11-map-section-v3786">
      <div class="top11-map-toolbar-v3786" style="${FL_TOP11_EDITING_V3786 ? "" : "display:none"}">
        <input id="top11-map-url-input-v3786" placeholder="URL da imagem de fundo do mapa/campo" value="${FL_escapeAttrV3786(mapUrl)}">
        <button type="button" onclick="FL_applyTop11MapV3786()">Aplicar fundo</button>
        <button type="button" class="gold" onclick="FL_saveTop11PositionsV3786()">Salvar posições</button>
      </div>

      <div class="top11-pitch-v3786 ${FL_TOP11_EDITING_V3786 ? "editing" : ""}"
           style="${mapUrl ? `background-image:linear-gradient(rgba(2,6,23,.08),rgba(2,6,23,.20)),url('${FL_escapeAttrV3786(mapUrl)}')` : ""}">
        ${rows.length ? rows.map(FL_top11CardHtmlV3786).join("") : `
          <button type="button" class="top11-create-card-v3786" onclick="FL_openCreateTop11V3786()">
            <b>+</b>
            <span>Criar Top 11</span>
          </button>
        `}
      </div>
    </section>
  `;

  if(FL_TOP11_EDITING_V3786) FL_enableTop11DragV3786();
  FL_enrichTop11PhotosV3786();
}

var FL_toggleTop11EditV3786 = function FL_toggleTop11EditV3786(){
  FL_TOP11_EDITING_V3786 = !FL_TOP11_EDITING_V3786;
  FL_renderTop11CleanV3786();
}

var FL_applyTop11MapV3786 = function FL_applyTop11MapV3786(){
  FL_TOP11_MAP_URL_V3786 = $("top11-map-url-input-v3786")?.value || "";
  FL_renderTop11CleanV3786();
}

var FL_enableTop11DragV3786 = function FL_enableTop11DragV3786(){
  const pitch = document.querySelector(".top11-pitch-v3786");
  if(!pitch) return;

  pitch.querySelectorAll(".top11-player-v3786").forEach(card=>{
    if(card.dataset.dragReadyV3786) return;
    card.dataset.dragReadyV3786 = "1";

    let dragging = false;

    const move = e=>{
      if(!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      const rect = pitch.getBoundingClientRect();

      let x = ((p.clientX - rect.left) / rect.width) * 100;
      let y = ((p.clientY - rect.top) / rect.height) * 100;

      x = Math.max(4, Math.min(96, x));
      y = Math.max(6, Math.min(94, y));

      card.style.left = x + "%";
      card.style.top = y + "%";
      card.dataset.x = x.toFixed(2);
      card.dataset.y = y.toFixed(2);
    };

    const stop = ()=>{
      dragging = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", stop);
    };

    card.addEventListener("mousedown", e=>{
      if(!FL_TOP11_EDITING_V3786) return;
      e.preventDefault();
      dragging = true;
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    });

    card.addEventListener("touchstart", e=>{
      if(!FL_TOP11_EDITING_V3786) return;
      dragging = true;
      document.addEventListener("touchmove", move, {passive:false});
      document.addEventListener("touchend", stop);
    }, {passive:false});
  });
}

var FL_enrichTop11PhotosV3786 = async function FL_enrichTop11PhotosV3786(){
  const cards = [...document.querySelectorAll(".top11-player-v3786")];

  for(const card of cards){
    const id = card.dataset.id || "";
    const name = card.dataset.player || "";
    const row = FL_top11RowsV3786().find(r => String(r.id || "") === String(id));

    if(row?.foto_url || !name) continue;

    const img = await FL_fetchPlayerPhotoV3786(name);
    if(!img || !card.isConnected) continue;

    const photo = card.querySelector(".top11-photo-v3786");
    if(photo){
      photo.innerHTML = `<img src="${FL_escapeAttrV3786(img)}" onerror="this.parentElement.innerHTML='${FL_escapeV3786(FL_initialsV3786(name))}'">`;
    }

    if(row) row.foto_url = img;
  }
}

var FL_openCreateTop11V3786 = function FL_openCreateTop11V3786(){
  const defaults = FL_defaultTop11PositionsV3786();
  const seasons = typeof getCareerSeasonRecords === "function" ? getCareerSeasonRecords() : (getTable("CARREIRA_TEMPORADAS") || []);
  const currentSeason = seasons[0] || {};
  const defaultTemp = currentSeason.temporada || "";

  openModal("Novo Top 11", `
    <form id="top11-create-form-v3786" class="top11-create-form-v3786">
      <label>Temporada</label>
      <input name="temporada" value="${FL_escapeAttrV3786(defaultTemp)}" placeholder="Ex: 2033/2034">

      <label>URL do fundo do mapa</label>
      <input name="mapa_url" placeholder="Imagem 1600×1000 ou 1920×1200" value="${FL_escapeAttrV3786(FL_TOP11_MAP_URL_V3786)}">

      <div class="top11-create-grid-v3786">
        ${defaults.map((d,i)=>`
          <div class="top11-create-row-v3786">
            <b>${i+1}</b>
            <input name="posicao_${i}" value="${FL_escapeAttrV3786(d[0])}" placeholder="POS">
            <input name="jogador_${i}" placeholder="Jogador">
            <input name="overall_${i}" placeholder="Overall">
            <input name="clube_${i}" placeholder="Clube">
            <input name="pais_${i}" placeholder="País">
          </div>
        `).join("")}
      </div>
    </form>
  `, async ()=>{
    await FL_saveNewTop11V3786();
  });
}

var FL_saveNewTop11V3786 = async function FL_saveNewTop11V3786(){
  const f = $("top11-create-form-v3786");
  if(!f) return;

  const temporada = f.temporada.value.trim();
  const mapaUrl = f.mapa_url.value.trim();
  const defaults = FL_defaultTop11PositionsV3786();
  const rows = [];

  for(let i=0;i<11;i++){
    const jogador = f[`jogador_${i}`]?.value?.trim() || "";
    if(!jogador) continue;

    const foto = await FL_fetchPlayerPhotoV3786(jogador);

    rows.push({
      carreira_id: FL_activeCareerIdV3786(),
      carreira_temporada_id: FL_activeSeasonIdV3786(),
      temporada,
      posicao_tatica: f[`posicao_${i}`]?.value?.trim() || defaults[i][0],
      jogador,
      overall: f[`overall_${i}`]?.value?.trim() || "",
      clube: f[`clube_${i}`]?.value?.trim() || "",
      pais: f[`pais_${i}`]?.value?.trim() || "",
      foto_url: foto || "",
      x: defaults[i][1],
      y: defaults[i][2],
      mapa_url: mapaUrl
    });
  }

  if(!rows.length){
    setStatus("Preencha pelo menos um jogador no Top 11.", "error");
    return;
  }

  try{
    setStatus("Salvando Top 11...", "loading");

    const result = await apiPost({
      action:"saveTop11CareerV2",
      carreira_id: FL_activeCareerIdV3786(),
      carreira_temporada_id: FL_activeSeasonIdV3786(),
      temporada,
      mapa_url: mapaUrl,
      rows
    });

    if(!result || !result.ok){
      throw new Error(result?.error || "Apps Script não confirmou salvamento do Top 11.");
    }

    if(!Array.isArray(db.TOP11_CARREIRA)) db.TOP11_CARREIRA = [];

    const saved = result.data?.rows || rows;
    saved.forEach(r=>db.TOP11_CARREIRA.push(r));

    FL_TOP11_MAP_URL_V3786 = mapaUrl;
    FL_TOP11_EDITING_V3786 = true;
    closeModal();
    FL_renderTop11CleanV3786();
    setStatus("Top 11 criado. Ajuste as posições e clique em Salvar posições.", "ok");
  }catch(err){
    console.error(err);
    setStatus("Erro ao salvar Top 11: " + err.message, "error");
  }
}

var FL_saveTop11PositionsV3786 = async function FL_saveTop11PositionsV3786(){
  const rows = FL_latestTop11RowsV3786();
  const cards = [...document.querySelectorAll(".top11-player-v3786")];

  if(!rows.length){
    setStatus("Nenhum Top 11 para salvar.", "error");
    return;
  }

  const mapUrl = $("top11-map-url-input-v3786")?.value || FL_TOP11_MAP_URL_V3786 || "";

  const updates = cards.map(card=>{
    const id = card.dataset.id || "";
    const row = rows.find(r => String(r.id || "") === String(id));
    if(!row) return null;

    return Object.assign({}, row, {
      x: card.dataset.x || parseFloat(card.style.left) || row.x || "",
      y: card.dataset.y || parseFloat(card.style.top) || row.y || "",
      mapa_url: mapUrl,
      foto_url: row.foto_url || ""
    });
  }).filter(Boolean);

  try{
    setStatus("Salvando posições do Top 11...", "loading");

    const result = await apiPost({
      action:"saveTop11CareerV2",
      carreira_id: FL_activeCareerIdV3786(),
      carreira_temporada_id: rows[0]?.carreira_temporada_id || FL_activeSeasonIdV3786(),
      temporada: rows[0]?.temporada || "",
      mapa_url: mapUrl,
      rows: updates
    });

    if(!result || !result.ok){
      throw new Error(result?.error || "Apps Script não confirmou salvamento.");
    }

    const saved = result.data?.rows || updates;

    saved.forEach(s=>{
      const idx = db.TOP11_CARREIRA.findIndex(r => String(r.id) === String(s.id));
      if(idx >= 0) db.TOP11_CARREIRA[idx] = Object.assign({}, db.TOP11_CARREIRA[idx], s);
    });

    FL_TOP11_MAP_URL_V3786 = mapUrl;
    FL_TOP11_EDITING_V3786 = false;
    FL_renderTop11CleanV3786();
    setStatus("Top 11 salvo.", "ok");
  }catch(err){
    console.error(err);
    setStatus("Erro ao salvar posições: " + err.message, "error");
  }
}

// Override final do Top11 para remover mapas duplicados.
renderTop11 = FL_renderTop11CleanV3786;
window.renderTop11 = FL_renderTop11CleanV3786;

const __renderAllOriginalV3786 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3786 && !window.__renderAllV3786Wrapped){
  window.__renderAllV3786Wrapped = true;
  renderAll = function(){
    const result = __renderAllOriginalV3786.apply(this, arguments);
    setTimeout(FL_removeSeasonIsoDatesV3786, 250);
    return result;
  };
}

document.addEventListener("click", ()=>{
  setTimeout(FL_removeSeasonIsoDatesV3786, 300);
}, true);

setTimeout(FL_removeSeasonIsoDatesV3786, 800);
setTimeout(FL_removeSeasonIsoDatesV3786, 1800);

window.FL_renderTop11CleanV3786 = FL_renderTop11CleanV3786;
window.FL_toggleTop11EditV3786 = FL_toggleTop11EditV3786;
window.FL_applyTop11MapV3786 = FL_applyTop11MapV3786;
window.FL_saveTop11PositionsV3786 = FL_saveTop11PositionsV3786;
window.FL_openCreateTop11V3786 = FL_openCreateTop11V3786;


// ===== V3.7.87 TOP11 POR TEMPORADA + MODAL PRÓPRIO + FUNDO FIXO =====
// Corrige:
// - openModal is not defined.
// - +Top11 agora abre modal próprio.
// - Fundo do Top11 é fixo para todos.
// - Remove aplicar fundo/campo de URL.
// - Salvar posições salva apenas o Top11/temporada selecionado.

const FL_TOP11_FIXED_BG_V3787 = "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg";
let FL_TOP11_EDITING_V3787 = false;
let FL_TOP11_SELECTED_KEY_V3787 = "";

var FL_normV3787 = function FL_normV3787(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3787 = function FL_escapeV3787(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3787 = function FL_escapeAttrV3787(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

var FL_activeCareerIdV3787 = function FL_activeCareerIdV3787(){
  return active?.carreira_id || "";
}

var FL_careerSeasonsV3787 = function FL_careerSeasonsV3787(){
  const carreiraId = FL_activeCareerIdV3787();
  const rows = typeof getCareerSeasonRecords === "function" ? getCareerSeasonRecords() : (getTable("CARREIRA_TEMPORADAS") || []);

  return rows.filter(s => !carreiraId || String(s.carreira_id || "") === String(carreiraId));
}

var FL_top11RowsAllV3787 = function FL_top11RowsAllV3787(){
  const carreiraId = FL_activeCareerIdV3787();
  return (getTable("TOP11_CARREIRA") || []).filter(r =>
    !carreiraId || String(r.carreira_id || "") === String(carreiraId)
  );
}

var FL_top11KeyV3787 = function FL_top11KeyV3787(row){
  if(row.carreira_temporada_id) return `id:${row.carreira_temporada_id}`;
  return `temp:${row.temporada || "sem-temporada"}`;
}

var FL_top11GroupsV3787 = function FL_top11GroupsV3787(){
  const map = new Map();

  FL_top11RowsAllV3787().forEach(r=>{
    const key = FL_top11KeyV3787(r);
    if(!map.has(key)){
      map.set(key,{
        key,
        temporada:r.temporada || "",
        carreira_temporada_id:r.carreira_temporada_id || "",
        rows:[]
      });
    }
    map.get(key).rows.push(r);
  });

  const groups = [...map.values()].sort((a,b)=>
    String(b.temporada || "").localeCompare(String(a.temporada || ""))
  );

  if(!FL_TOP11_SELECTED_KEY_V3787 && groups.length){
    FL_TOP11_SELECTED_KEY_V3787 = groups[0].key;
  }

  return groups;
}

var FL_selectedTop11GroupV3787 = function FL_selectedTop11GroupV3787(){
  const groups = FL_top11GroupsV3787();
  if(!groups.length) return null;

  return groups.find(g => g.key === FL_TOP11_SELECTED_KEY_V3787) || groups[0];
}

var FL_selectedTop11RowsV3787 = function FL_selectedTop11RowsV3787(){
  const group = FL_selectedTop11GroupV3787();
  if(!group) return [];

  return group.rows.sort((a,b)=>{
    const order = ["GOL","GK","LD","RB","ZAG","CB","LE","LB","VOL","CDM","MC","CM","MEI","CAM","PD","RW","PE","LW","CA","ST"];
    const ao = order.indexOf(String(a.posicao_tatica || "").toUpperCase());
    const bo = order.indexOf(String(b.posicao_tatica || "").toUpperCase());
    return (ao === -1 ? 99 : ao) - (bo === -1 ? 99 : bo) || Number(a.id || 0)-Number(b.id || 0);
  });
}

var FL_defaultTop11PositionsV3787 = function FL_defaultTop11PositionsV3787(){
  return [
    ["GOL",50,88],
    ["LD",78,70],["ZAG",60,72],["ZAG",40,72],["LE",22,70],
    ["VOL",50,56],
    ["MC",35,43],["MC",65,43],
    ["PD",78,25],["CA",50,18],["PE",22,25]
  ];
}

var FL_initialsV3787 = function FL_initialsV3787(name){
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
}

var FL_fetchPlayerPhotoV3787 = async function FL_fetchPlayerPhotoV3787(name){
  if(typeof FL_fetchPlayerPhotoV3786 === "function"){
    try{ return await FL_fetchPlayerPhotoV3786(name); }catch(err){}
  }
  if(typeof FL_fetchPlayerPhotoV3781 === "function"){
    try{ return await FL_fetchPlayerPhotoV3781(name); }catch(err){}
  }

  const clean = String(name || "").trim();
  if(!clean) return "";

  try{
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(clean)}`, {cache:"force-cache"});
    const data = await res.json();
    const p = (data?.player || [])[0];
    return p?.strCutout || p?.strRender || p?.strThumb || "";
  }catch(err){
    return "";
  }
}

var FL_top11CardHtmlV3787 = function FL_top11CardHtmlV3787(row, idx){
  const d = FL_defaultTop11PositionsV3787()[idx] || ["POS",50,50];

  const x = row.x !== undefined && row.x !== "" ? Number(row.x) : d[1];
  const y = row.y !== undefined && row.y !== "" ? Number(row.y) : d[2];
  const pos = row.posicao_tatica || d[0];
  const name = row.jogador || "Jogador";
  const foto = row.foto_url || "";
  const club = row.clube || "";
  const country = row.pais || "";

  return `
    <div class="top11-player-v3787 ${FL_TOP11_EDITING_V3787 ? "editing" : ""}"
         data-id="${FL_escapeAttrV3787(row.id || "")}"
         data-index="${idx}"
         data-player="${FL_escapeAttrV3787(name)}"
         style="left:${x}%; top:${y}%;">
      <div class="top11-photo-v3787">
        ${foto ? `<img src="${FL_escapeAttrV3787(foto)}" onerror="this.parentElement.innerHTML='${FL_escapeV3787(FL_initialsV3787(name))}'">` : FL_escapeV3787(FL_initialsV3787(name))}
      </div>
      <div class="top11-info-v3787">
        <b>${FL_escapeV3787(name)}</b>
        <span>${FL_escapeV3787(pos)}${club ? ` • ${FL_escapeV3787(club)}` : ""}${country ? ` • ${FL_escapeV3787(country)}` : ""}</span>
      </div>
    </div>
  `;
}

var FL_renderTop11V3787 = function FL_renderTop11V3787(){
  const page = $("top11");
  if(!page) return;

  const groups = FL_top11GroupsV3787();
  const selected = FL_selectedTop11GroupV3787();
  const rows = FL_selectedTop11RowsV3787();

  page.innerHTML = `
    <div class="top11-page-head-v3787">
      <div>
        <h2>Top 11</h2>
        <p>Monte o melhor onze da carreira em um mapa visual.</p>
        <small>Fundo fixo recomendado já aplicado. Proporção ideal: <b>16:10</b>.</small>
      </div>
      <div class="top11-head-actions-v3787">
        ${groups.length ? `
          <select onchange="FL_TOP11_SELECTED_KEY_V3787=this.value; FL_TOP11_EDITING_V3787=false; FL_renderTop11V3787();">
            ${groups.map(g=>`
              <option value="${FL_escapeAttrV3787(g.key)}" ${g.key === (selected?.key || "") ? "selected" : ""}>${FL_escapeV3787(g.temporada || "Top 11 sem temporada")}</option>
            `).join("")}
          </select>
        ` : ""}
        ${rows.length ? `<button type="button" class="ghost" onclick="FL_toggleTop11EditV3787()">${FL_TOP11_EDITING_V3787 ? "Cancelar edição" : "Editar Top 11"}</button>` : ""}
        <button type="button" class="gold" onclick="FL_openCreateTop11V3787()">+ Top 11</button>
      </div>
    </div>

    <section class="top11-map-section-v3787">
      <div class="top11-map-toolbar-v3787" style="${FL_TOP11_EDITING_V3787 ? "" : "display:none"}">
        <strong>Top 11 ${FL_escapeV3787(selected?.temporada || "")}</strong>
        <button type="button" class="gold" onclick="FL_saveTop11PositionsV3787()">Salvar posições deste Top 11</button>
      </div>

      <div class="top11-pitch-v3787 ${FL_TOP11_EDITING_V3787 ? "editing" : ""}"
           style="background-image:linear-gradient(rgba(2,6,23,.08),rgba(2,6,23,.18)),url('${FL_escapeAttrV3787(FL_TOP11_FIXED_BG_V3787)}')">
        ${rows.length ? rows.map(FL_top11CardHtmlV3787).join("") : `
          <button type="button" class="top11-create-card-v3787" onclick="FL_openCreateTop11V3787()">
            <b>+</b>
            <span>Criar Top 11</span>
          </button>
        `}
      </div>
    </section>
  `;

  if(FL_TOP11_EDITING_V3787) FL_enableTop11DragV3787();
  FL_enrichTop11PhotosV3787();
}

var FL_toggleTop11EditV3787 = function FL_toggleTop11EditV3787(){
  FL_TOP11_EDITING_V3787 = !FL_TOP11_EDITING_V3787;
  FL_renderTop11V3787();
}

var FL_enableTop11DragV3787 = function FL_enableTop11DragV3787(){
  const pitch = document.querySelector(".top11-pitch-v3787");
  if(!pitch) return;

  pitch.querySelectorAll(".top11-player-v3787").forEach(card=>{
    if(card.dataset.dragReadyV3787) return;
    card.dataset.dragReadyV3787 = "1";

    let dragging = false;

    const move = e=>{
      if(!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      const rect = pitch.getBoundingClientRect();

      let x = ((p.clientX - rect.left) / rect.width) * 100;
      let y = ((p.clientY - rect.top) / rect.height) * 100;

      x = Math.max(4, Math.min(96, x));
      y = Math.max(6, Math.min(94, y));

      card.style.left = x + "%";
      card.style.top = y + "%";
      card.dataset.x = x.toFixed(2);
      card.dataset.y = y.toFixed(2);
    };

    const stop = ()=>{
      dragging = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", stop);
    };

    card.addEventListener("mousedown", e=>{
      if(!FL_TOP11_EDITING_V3787) return;
      e.preventDefault();
      dragging = true;
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    });

    card.addEventListener("touchstart", e=>{
      if(!FL_TOP11_EDITING_V3787) return;
      dragging = true;
      document.addEventListener("touchmove", move, {passive:false});
      document.addEventListener("touchend", stop);
    }, {passive:false});
  });
}

var FL_enrichTop11PhotosV3787 = async function FL_enrichTop11PhotosV3787(){
  const cards = [...document.querySelectorAll(".top11-player-v3787")];

  for(const card of cards){
    const id = card.dataset.id || "";
    const name = card.dataset.player || "";
    const row = FL_top11RowsAllV3787().find(r => String(r.id || "") === String(id));

    if(row?.foto_url || !name) continue;

    const img = await FL_fetchPlayerPhotoV3787(name);
    if(!img || !card.isConnected) continue;

    const photo = card.querySelector(".top11-photo-v3787");
    if(photo){
      photo.innerHTML = `<img src="${FL_escapeAttrV3787(img)}" onerror="this.parentElement.innerHTML='${FL_escapeV3787(FL_initialsV3787(name))}'">`;
    }

    if(row) row.foto_url = img;
  }
}

var FL_openTop11ModalV3787 = function FL_openTop11ModalV3787(title, html, onSave){
  document.getElementById("fl-top11-modal-v3787")?.remove();

  const modal = document.createElement("div");
  modal.id = "fl-top11-modal-v3787";
  modal.className = "fl-top11-modal-v3787";
  modal.innerHTML = `
    <div class="fl-top11-backdrop-v3787" onclick="FL_closeTop11ModalV3787()"></div>
    <div class="fl-top11-panel-v3787">
      <button type="button" class="fl-top11-close-v3787" onclick="FL_closeTop11ModalV3787()">×</button>
      <h2>${FL_escapeV3787(title)}</h2>
      <div class="fl-top11-body-v3787">${html}</div>
      <div class="fl-top11-actions-v3787">
        <button type="button" onclick="FL_closeTop11ModalV3787()">Cancelar</button>
        <button type="button" class="gold" id="fl-top11-save-v3787">Salvar Top 11</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  $("fl-top11-save-v3787").onclick = onSave;
}

var FL_closeTop11ModalV3787 = function FL_closeTop11ModalV3787(){
  document.getElementById("fl-top11-modal-v3787")?.remove();
}

var FL_openCreateTop11V3787 = function FL_openCreateTop11V3787(){
  const defaults = FL_defaultTop11PositionsV3787();
  const seasons = FL_careerSeasonsV3787();

  const seasonOptions = seasons.map(s=>`
    <option value="${FL_escapeAttrV3787(s.id || "")}" data-temporada="${FL_escapeAttrV3787(s.temporada || "")}">
      ${FL_escapeV3787(s.temporada || s.clube_nome || s.clube || "Temporada")}
    </option>
  `).join("");

  FL_openTop11ModalV3787("Novo Top 11", `
    <form id="top11-create-form-v3787" class="top11-create-form-v3787">
      <label>Temporada do Top 11</label>
      ${seasonOptions ? `<select name="carreira_temporada_id">${seasonOptions}</select>` : `<input name="carreira_temporada_id" placeholder="ID da temporada">`}

      <label>Nome/ano da temporada</label>
      <input name="temporada" value="${FL_escapeAttrV3787(seasons[0]?.temporada || "")}" placeholder="Ex: 2033/2034">

      <div class="top11-create-grid-v3787">
        ${defaults.map((d,i)=>`
          <div class="top11-create-row-v3787">
            <b>${i+1}</b>
            <input name="posicao_${i}" value="${FL_escapeAttrV3787(d[0])}" placeholder="POS">
            <input name="jogador_${i}" placeholder="Jogador">
            <input name="overall_${i}" placeholder="Overall">
            <input name="clube_${i}" placeholder="Clube">
            <input name="pais_${i}" placeholder="País">
          </div>
        `).join("")}
      </div>
    </form>
  `, FL_saveNewTop11V3787);

  const select = document.querySelector("#top11-create-form-v3787 select[name='carreira_temporada_id']");
  const tempInput = document.querySelector("#top11-create-form-v3787 input[name='temporada']");
  if(select && tempInput){
    select.addEventListener("change", ()=>{
      const opt = select.options[select.selectedIndex];
      tempInput.value = opt?.dataset?.temporada || "";
    });
  }
}

var FL_saveNewTop11V3787 = async function FL_saveNewTop11V3787(){
  const f = $("top11-create-form-v3787");
  if(!f) return;

  const temporada = f.temporada.value.trim();
  const carreiraTemporadaId = f.carreira_temporada_id.value || "";
  const defaults = FL_defaultTop11PositionsV3787();
  const rows = [];

  for(let i=0;i<11;i++){
    const jogador = f[`jogador_${i}`]?.value?.trim() || "";
    if(!jogador) continue;

    const foto = await FL_fetchPlayerPhotoV3787(jogador);

    rows.push({
      carreira_id: FL_activeCareerIdV3787(),
      carreira_temporada_id: carreiraTemporadaId,
      temporada,
      posicao_tatica: f[`posicao_${i}`]?.value?.trim() || defaults[i][0],
      jogador,
      overall: f[`overall_${i}`]?.value?.trim() || "",
      clube: f[`clube_${i}`]?.value?.trim() || "",
      pais: f[`pais_${i}`]?.value?.trim() || "",
      foto_url: foto || "",
      x: defaults[i][1],
      y: defaults[i][2],
      mapa_url: FL_TOP11_FIXED_BG_V3787
    });
  }

  if(!rows.length){
    setStatus("Preencha pelo menos um jogador no Top 11.", "error");
    return;
  }

  try{
    setStatus("Salvando Top 11...", "loading");

    const result = await apiPost({
      action:"saveTop11CareerV2",
      carreira_id: FL_activeCareerIdV3787(),
      carreira_temporada_id: carreiraTemporadaId,
      temporada,
      mapa_url: FL_TOP11_FIXED_BG_V3787,
      rows
    });

    if(!result || !result.ok){
      throw new Error(result?.error || "Apps Script não confirmou salvamento do Top 11.");
    }

    if(!Array.isArray(db.TOP11_CARREIRA)) db.TOP11_CARREIRA = [];

    const saved = result.data?.rows || rows;
    saved.forEach(r=>db.TOP11_CARREIRA.push(r));

    FL_TOP11_SELECTED_KEY_V3787 = carreiraTemporadaId ? `id:${carreiraTemporadaId}` : `temp:${temporada}`;
    FL_TOP11_EDITING_V3787 = true;
    FL_closeTop11ModalV3787();
    FL_renderTop11V3787();
    setStatus("Top 11 criado. Ajuste as posições e clique em Salvar posições deste Top 11.", "ok");
  }catch(err){
    console.error(err);
    setStatus("Erro ao salvar Top 11: " + err.message, "error");
  }
}

var FL_saveTop11PositionsV3787 = async function FL_saveTop11PositionsV3787(){
  const group = FL_selectedTop11GroupV3787();
  const rows = FL_selectedTop11RowsV3787();
  const cards = [...document.querySelectorAll(".top11-player-v3787")];

  if(!group || !rows.length){
    setStatus("Nenhum Top 11 selecionado para salvar.", "error");
    return;
  }

  const updates = cards.map(card=>{
    const id = card.dataset.id || "";
    const row = rows.find(r => String(r.id || "") === String(id));
    if(!row) return null;

    return Object.assign({}, row, {
      carreira_temporada_id: group.carreira_temporada_id || row.carreira_temporada_id || "",
      temporada: group.temporada || row.temporada || "",
      x: card.dataset.x || parseFloat(card.style.left) || row.x || "",
      y: card.dataset.y || parseFloat(card.style.top) || row.y || "",
      mapa_url: FL_TOP11_FIXED_BG_V3787,
      foto_url: row.foto_url || ""
    });
  }).filter(Boolean);

  try{
    setStatus("Salvando posições deste Top 11...", "loading");

    const result = await apiPost({
      action:"saveTop11CareerV2",
      carreira_id: FL_activeCareerIdV3787(),
      carreira_temporada_id: group.carreira_temporada_id || "",
      temporada: group.temporada || "",
      mapa_url: FL_TOP11_FIXED_BG_V3787,
      rows: updates
    });

    if(!result || !result.ok){
      throw new Error(result?.error || "Apps Script não confirmou salvamento.");
    }

    const saved = result.data?.rows || updates;

    saved.forEach(s=>{
      const idx = db.TOP11_CARREIRA.findIndex(r => String(r.id) === String(s.id));
      if(idx >= 0) db.TOP11_CARREIRA[idx] = Object.assign({}, db.TOP11_CARREIRA[idx], s);
    });

    FL_TOP11_EDITING_V3787 = false;
    FL_renderTop11V3787();
    setStatus("Posições deste Top 11 salvas.", "ok");
  }catch(err){
    console.error(err);
    setStatus("Erro ao salvar posições: " + err.message, "error");
  }
}

// Override definitivo do Top11.
renderTop11 = FL_renderTop11V3787;
window.renderTop11 = FL_renderTop11V3787;

// Neutraliza funções antigas do Top 11 para não chamarem openModal.
window.FL_openCreateTop11V3786 = FL_openCreateTop11V3787;
window.FL_renderTop11CleanV3786 = FL_renderTop11V3787;
window.FL_applyTop11MapV3786 = function(){};
window.FL_saveTop11PositionsV3786 = FL_saveTop11PositionsV3787;
window.FL_toggleTop11EditV3786 = FL_toggleTop11EditV3787;

window.FL_renderTop11V3787 = FL_renderTop11V3787;
window.FL_toggleTop11EditV3787 = FL_toggleTop11EditV3787;
window.FL_openCreateTop11V3787 = FL_openCreateTop11V3787;
window.FL_closeTop11ModalV3787 = FL_closeTop11ModalV3787;
window.FL_saveTop11PositionsV3787 = FL_saveTop11PositionsV3787;


// ===== V3.7.88 TOP11 SALVAR SEM DUPLICAR + FECHAR MODAL =====
// Corrige:
// - botão parecia não funcionar porque salvava mas não fechava;
// - duplo clique gerava cópias;
// - salvamento agora desativa botão, mostra status, fecha modal e recarrega o Top11.

let FL_TOP11_SAVING_V3788 = false;

var FL_top11FixedBgV3788 = function FL_top11FixedBgV3788(){
  return "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg";
}

var FL_getTop11FormV3788 = function FL_getTop11FormV3788(){
  return document.getElementById("top11-create-form-v3787") ||
         document.getElementById("top11-create-form-v3788");
}

var FL_closeTop11ModalV3788 = function FL_closeTop11ModalV3788(){
  document.getElementById("fl-top11-modal-v3787")?.remove();
  document.getElementById("fl-top11-modal-v3788")?.remove();
}

var FL_setTop11ButtonSavingV3788 = function FL_setTop11ButtonSavingV3788(isSaving){
  const btn =
    document.getElementById("fl-top11-save-v3787") ||
    document.getElementById("fl-top11-save-v3788") ||
    [...document.querySelectorAll("button")].find(b => /salvar top 11/i.test(b.textContent || ""));

  if(!btn) return;

  btn.disabled = !!isSaving;
  btn.textContent = isSaving ? "Salvando..." : "Salvar Top 11";
}

var FL_defaultTop11PositionsV3788 = function FL_defaultTop11PositionsV3788(){
  if(typeof FL_defaultTop11PositionsV3787 === "function") return FL_defaultTop11PositionsV3787();
  return [
    ["GOL",50,88],
    ["LD",78,70],["ZAG",60,72],["ZAG",40,72],["LE",22,70],
    ["VOL",50,56],
    ["MC",35,43],["MC",65,43],
    ["PD",78,25],["CA",50,18],["PE",22,25]
  ];
}

var FL_activeCareerIdV3788 = function FL_activeCareerIdV3788(){
  return active?.carreira_id || "";
}

var FL_collectNewTop11RowsV3788 = function FL_collectNewTop11RowsV3788(){
  const f = FL_getTop11FormV3788();
  if(!f) throw new Error("Formulário do Top 11 não encontrado.");

  const defaults = FL_defaultTop11PositionsV3788();
  const temporada = String(f.temporada?.value || "").trim();
  const carreiraTemporadaId = String(f.carreira_temporada_id?.value || "").trim();

  const rows = [];

  for(let i=0; i<11; i++){
    const jogador = String(f[`jogador_${i}`]?.value || "").trim();
    if(!jogador) continue;

    rows.push({
      carreira_id: FL_activeCareerIdV3788(),
      carreira_temporada_id: carreiraTemporadaId,
      temporada,
      posicao_tatica: String(f[`posicao_${i}`]?.value || defaults[i]?.[0] || "").trim(),
      jogador,
      overall: String(f[`overall_${i}`]?.value || "").trim(),
      clube: String(f[`clube_${i}`]?.value || "").trim(),
      pais: String(f[`pais_${i}`]?.value || "").trim(),
      foto_url: "",
      x: defaults[i]?.[1] ?? "",
      y: defaults[i]?.[2] ?? "",
      mapa_url: FL_top11FixedBgV3788()
    });
  }

  return {temporada, carreiraTemporadaId, rows};
}

var FL_saveNewTop11V3788 = async function FL_saveNewTop11V3788(){
  if(FL_TOP11_SAVING_V3788) return;

  try{
    FL_TOP11_SAVING_V3788 = true;
    FL_setTop11ButtonSavingV3788(true);

    const payload = FL_collectNewTop11RowsV3788();

    if(!payload.rows.length){
      throw new Error("Preencha pelo menos um jogador no Top 11.");
    }

    setStatus("Salvando Top 11...", "loading");

    const result = await apiPost({
      action: "saveTop11CareerV2",
      carreira_id: FL_activeCareerIdV3788(),
      carreira_temporada_id: payload.carreiraTemporadaId,
      temporada: payload.temporada,
      mapa_url: FL_top11FixedBgV3788(),
      replace_existing: true,
      rows: payload.rows
    });

    if(!result || !result.ok){
      throw new Error(result?.error || "Apps Script não confirmou salvamento do Top 11.");
    }

    const saved = result.data?.rows || payload.rows;

    if(!Array.isArray(db.TOP11_CARREIRA)) db.TOP11_CARREIRA = [];

    // Remove da memória os registros da mesma temporada antes de colocar os novos.
    db.TOP11_CARREIRA = db.TOP11_CARREIRA.filter(r => {
      const sameCareer = String(r.carreira_id || "") === String(FL_activeCareerIdV3788());
      const sameSeasonId = payload.carreiraTemporadaId && String(r.carreira_temporada_id || "") === String(payload.carreiraTemporadaId);
      const sameSeason = !payload.carreiraTemporadaId && String(r.temporada || "") === String(payload.temporada);
      return !(sameCareer && (sameSeasonId || sameSeason));
    });

    saved.forEach(r => db.TOP11_CARREIRA.push(r));

    if(typeof FL_TOP11_SELECTED_KEY_V3787 !== "undefined"){
      FL_TOP11_SELECTED_KEY_V3787 = payload.carreiraTemporadaId ? `id:${payload.carreiraTemporadaId}` : `temp:${payload.temporada}`;
    }

    if(typeof FL_TOP11_EDITING_V3787 !== "undefined"){
      FL_TOP11_EDITING_V3787 = true;
    }

    FL_closeTop11ModalV3788();

    if(typeof FL_renderTop11V3787 === "function"){
      FL_renderTop11V3787();
    }else if(typeof renderTop11 === "function"){
      renderTop11();
    }

    setStatus("Top 11 salvo. Agora ajuste as posições e clique em Salvar posições deste Top 11.", "ok");
  }catch(err){
    console.error(err);
    setStatus("Erro ao salvar Top 11: " + err.message, "error");
  }finally{
    FL_TOP11_SAVING_V3788 = false;
    FL_setTop11ButtonSavingV3788(false);
  }
}

var FL_saveTop11PositionsV3788 = async function FL_saveTop11PositionsV3788(){
  if(FL_TOP11_SAVING_V3788) return;

  const oldFn = typeof FL_saveTop11PositionsV3787 === "function" ? FL_saveTop11PositionsV3787 : null;

  try{
    FL_TOP11_SAVING_V3788 = true;
    const btn = [...document.querySelectorAll("button")].find(b => /salvar posições/i.test(b.textContent || ""));
    if(btn){
      btn.disabled = true;
      btn.textContent = "Salvando posições...";
    }

    if(oldFn){
      await oldFn();
    }
  }finally{
    FL_TOP11_SAVING_V3788 = false;
  }
}

// Listener forte no botão do modal, caso o onclick antigo falhe.
document.addEventListener("click", function(e){
  const btn = e.target.closest("#fl-top11-save-v3787,#fl-top11-save-v3788,button");
  if(!btn) return;

  if(btn.id === "fl-top11-save-v3787" || btn.id === "fl-top11-save-v3788" || /salvar top 11/i.test(btn.textContent || "")){
    const modal = btn.closest("#fl-top11-modal-v3787,#fl-top11-modal-v3788");
    if(modal){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      FL_saveNewTop11V3788();
    }
  }
}, true);

window.FL_saveNewTop11V3787 = FL_saveNewTop11V3788;
window.FL_saveNewTop11V3788 = FL_saveNewTop11V3788;
window.FL_closeTop11ModalV3788 = FL_closeTop11ModalV3788;
window.FL_saveTop11PositionsV3788 = FL_saveTop11PositionsV3788;


// ===== V3.7.89 TOP11 BASE HISTÓRICA + TOP11 CARREIRA =====
// Corrige estrutura:
// - TOP11_BASE = base histórica fixa, colada manualmente.
// - TOP11_CARREIRA = Top 11 mutável da carreira.
// - Dashboard passa a ler as duas.
// - Top 11 da carreira continua editável.
// - Top 11 histórico aparece separado e não salva/edita.

let FL_TOP11_VIEW_MODE_V3789 = "carreira"; // carreira | base
let FL_TOP11_BASE_YEAR_V3789 = "";

var FL_normV3789 = function FL_normV3789(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3789 = function FL_escapeV3789(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3789 = function FL_escapeAttrV3789(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

var FL_top11FixedBgV3789 = function FL_top11FixedBgV3789(){
  return "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg";
}

var FL_top11BaseRowsV3789 = function FL_top11BaseRowsV3789(){
  return getTable("TOP11_BASE") || [];
}

var FL_top11BaseYearsV3789 = function FL_top11BaseYearsV3789(){
  const years = [...new Set(FL_top11BaseRowsV3789().map(r => r.ano || r.temporada).filter(Boolean))];
  years.sort((a,b)=>String(b).localeCompare(String(a)));
  if(!FL_TOP11_BASE_YEAR_V3789 && years.length) FL_TOP11_BASE_YEAR_V3789 = years[0];
  return years;
}

var FL_selectedTop11BaseRowsV3789 = function FL_selectedTop11BaseRowsV3789(){
  const years = FL_top11BaseYearsV3789();
  const year = FL_TOP11_BASE_YEAR_V3789 || years[0] || "";

  return FL_top11BaseRowsV3789()
    .filter(r => String(r.ano || r.temporada || "") === String(year))
    .sort((a,b)=>Number(a.id || 0)-Number(b.id || 0));
}

var FL_initialsV3789 = function FL_initialsV3789(name){
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
}

var FL_top11BaseCardHtmlV3789 = function FL_top11BaseCardHtmlV3789(row, idx){
  const x = row.x !== undefined && row.x !== "" ? Number(row.x) : 50;
  const y = row.y !== undefined && row.y !== "" ? Number(row.y) : 50;
  const name = row.jogador || "Jogador";
  const pos = row.posicao_tatica || row.posicao_origem || "";

  return `
    <div class="top11-player-v3787 top11-base-player-v3789"
         style="left:${x}%; top:${y}%;">
      <div class="top11-photo-v3787">
        ${FL_escapeV3789(FL_initialsV3789(name))}
      </div>
      <div class="top11-info-v3787">
        <b>${FL_escapeV3789(name)}</b>
        <span>${FL_escapeV3789(pos)}</span>
      </div>
    </div>
  `;
}

var FL_renderTop11BaseV3789 = function FL_renderTop11BaseV3789(){
  const page = document.getElementById("top11");
  if(!page) return;

  const years = FL_top11BaseYearsV3789();
  const rows = FL_selectedTop11BaseRowsV3789();

  page.innerHTML = `
    <div class="top11-page-head-v3787">
      <div>
        <h2>Top 11</h2>
        <p>Base histórica fixa e Top 11 da carreira ficam separados.</p>
        <small>Base histórica não é editável. Para editar, use Top 11 da carreira.</small>
      </div>

      <div class="top11-head-actions-v3787">
        <button type="button" class="${FL_TOP11_VIEW_MODE_V3789 === "carreira" ? "gold" : "ghost"}" onclick="FL_TOP11_VIEW_MODE_V3789='carreira'; FL_renderTop11V3789();">Top 11 Carreira</button>
        <button type="button" class="${FL_TOP11_VIEW_MODE_V3789 === "base" ? "gold" : "ghost"}" onclick="FL_TOP11_VIEW_MODE_V3789='base'; FL_renderTop11V3789();">Top 11 Base</button>

        ${years.length ? `
          <select onchange="FL_TOP11_BASE_YEAR_V3789=this.value; FL_renderTop11V3789();">
            ${years.map(y=>`
              <option value="${FL_escapeAttrV3789(y)}" ${String(y) === String(FL_TOP11_BASE_YEAR_V3789) ? "selected" : ""}>${FL_escapeV3789(y)}</option>
            `).join("")}
          </select>
        ` : ""}
      </div>
    </div>

    <section class="top11-map-section-v3787">
      <div class="top11-map-toolbar-v3787">
        <strong>Top 11 Base ${FL_escapeV3789(FL_TOP11_BASE_YEAR_V3789 || "")}</strong>
        <span>Histórico fixo</span>
      </div>

      <div class="top11-pitch-v3787"
           style="background-image:linear-gradient(rgba(2,6,23,.08),rgba(2,6,23,.18)),url('${FL_escapeAttrV3789(FL_top11FixedBgV3789())}')">
        ${rows.length ? rows.map(FL_top11BaseCardHtmlV3789).join("") : `
          <div class="top11-base-empty-v3789">
            <b>Nenhuma base histórica encontrada.</b>
            <span>Crie/cole dados na aba TOP11_BASE.</span>
          </div>
        `}
      </div>
    </section>
  `;
}

const FL_renderCareerTop11OriginalV3789 =
  typeof FL_renderTop11V3787 === "function" ? FL_renderTop11V3787 :
  typeof FL_renderTop11CleanV3786 === "function" ? FL_renderTop11CleanV3786 :
  typeof renderTop11 === "function" ? renderTop11 : null;

var FL_renderTop11V3789 = function FL_renderTop11V3789(){
  if(FL_TOP11_VIEW_MODE_V3789 === "base"){
    FL_renderTop11BaseV3789();
    return;
  }

  if(FL_renderCareerTop11OriginalV3789){
    FL_renderCareerTop11OriginalV3789();
  }

  // Injeta botões de alternância no modo carreira também.
  setTimeout(()=>{
    const head = document.querySelector("#top11 .top11-page-head-v3787");
    if(!head || head.querySelector(".top11-mode-tabs-v3789")) return;

    const tabs = document.createElement("div");
    tabs.className = "top11-mode-tabs-v3789";
    tabs.innerHTML = `
      <button type="button" class="gold" onclick="FL_TOP11_VIEW_MODE_V3789='carreira'; FL_renderTop11V3789();">Top 11 Carreira</button>
      <button type="button" class="ghost" onclick="FL_TOP11_VIEW_MODE_V3789='base'; FL_renderTop11V3789();">Top 11 Base</button>
    `;

    const actions = head.querySelector(".top11-head-actions-v3787") || head;
    actions.prepend(tabs);
  }, 50);
}

renderTop11 = FL_renderTop11V3789;
window.renderTop11 = FL_renderTop11V3789;
window.FL_renderTop11V3789 = FL_renderTop11V3789;
window.FL_renderTop11BaseV3789 = FL_renderTop11BaseV3789;


// ===== V3.7.90 TOP 11 UNIFICADO + MELHORES =====
// Corrige:
// - Base e carreira aparecem em UM seletor único.
// - Remove separação visual Top 11 Base / Top 11 Carreira.
// - Corrige posicionamento para o campo vertical do print.
// - Busca imagem dos jogadores da base também via TheSportsDB.
// - Cria painel "Melhores" com ranking por aparição.
// - Filtro: Total, GOL, DEF, MEI, ATA.

let FL_TOP11_SELECTED_UNIFIED_KEY_V3790 = "";
let FL_TOP11_APPEARANCE_FILTER_V3790 = "TOTAL";

const FL_TOP11_PHOTO_CACHE_V3790 = {};

var FL_normV3790 = function FL_normV3790(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3790 = function FL_escapeV3790(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3790 = function FL_escapeAttrV3790(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

var FL_top11FixedBgV3790 = function FL_top11FixedBgV3790(){
  return "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg";
}

var FL_activeCareerIdV3790 = function FL_activeCareerIdV3790(){
  return active?.carreira_id || "";
}

var FL_top11BaseRowsV3790 = function FL_top11BaseRowsV3790(){
  return getTable("TOP11_BASE") || [];
}

var FL_top11CareerRowsV3790 = function FL_top11CareerRowsV3790(){
  const carreiraId = FL_activeCareerIdV3790();
  return (getTable("TOP11_CARREIRA") || []).filter(r =>
    !carreiraId || String(r.carreira_id || "") === String(carreiraId)
  );
}

var FL_top11UnifiedGroupsV3790 = function FL_top11UnifiedGroupsV3790(){
  const groups = [];

  const baseMap = new Map();
  FL_top11BaseRowsV3790().forEach(r=>{
    const ano = r.ano || r.temporada || "";
    if(!ano) return;
    const key = `base:${ano}`;
    if(!baseMap.has(key)){
      baseMap.set(key,{
        key,
        label: ano,
        season: ano,
        source:"base",
        sourceLabel:"Base histórica",
        editable:false,
        rows:[]
      });
    }
    baseMap.get(key).rows.push(Object.assign({__top11Source:"base"}, r));
  });

  const careerMap = new Map();
  FL_top11CareerRowsV3790().forEach(r=>{
    const seasonId = r.carreira_temporada_id || "";
    const temp = r.temporada || "";
    const key = seasonId ? `career:${seasonId}` : `career:${temp || "sem-temporada"}`;
    if(!careerMap.has(key)){
      careerMap.set(key,{
        key,
        label: temp || "Top 11 carreira",
        season: temp,
        carreira_temporada_id: seasonId,
        source:"career",
        sourceLabel:"Carreira",
        editable:true,
        rows:[]
      });
    }
    careerMap.get(key).rows.push(Object.assign({__top11Source:"career"}, r));
  });

  groups.push(...baseMap.values(), ...careerMap.values());

  groups.sort((a,b)=>{
    const as = String(a.season || a.label || "");
    const bs = String(b.season || b.label || "");
    const bySeason = bs.localeCompare(as);
    if(bySeason) return bySeason;
    // se mesmo ano, carreira vem antes da base
    if(a.source !== b.source) return a.source === "career" ? -1 : 1;
    return 0;
  });

  if(!FL_TOP11_SELECTED_UNIFIED_KEY_V3790 && groups.length){
    FL_TOP11_SELECTED_UNIFIED_KEY_V3790 = groups[0].key;
  }

  return groups;
}

var FL_selectedTop11GroupV3790 = function FL_selectedTop11GroupV3790(){
  const groups = FL_top11UnifiedGroupsV3790();
  if(!groups.length) return null;
  return groups.find(g=>g.key === FL_TOP11_SELECTED_UNIFIED_KEY_V3790) || groups[0];
}

// Campo vertical do print: goleiro embaixo, ataque em cima.
// A tabela larga tinha GL, DEF, DEF2, DEF3, DEF4, MEI, MEI5, MEI6, ATA, ATA7, ATA8.
// O mapeamento antigo estava invertendo laterais/ataque.
// Agora usamos posições fixas coerentes com visual vertical:
// GOL embaixo; linha defensiva; meio; ataque.
var FL_positionCoordsV3790 = function FL_positionCoordsV3790(row, idx){
  const origem = String(row.posicao_origem || "").toUpperCase();
  const pos = String(row.posicao_tatica || "").toUpperCase();

  const byOrigin = {
    "GL":   [50, 91, "GOL"],
    "DEF":  [18, 72, "LE"],
    "DEF2": [38, 76, "ZAG"],
    "DEF3": [62, 76, "ZAG"],
    "DEF4": [82, 72, "LD"],
    "MEI":  [33, 52, "MC"],
    "MEI5": [50, 46, "MEI"],
    "MEI6": [67, 52, "MC"],
    "ATA":  [18, 25, "PE"],
    "ATA7": [50, 18, "CA"],
    "ATA8": [82, 25, "PD"]
  };

  const byPos = {
    "GOL": [50,91],
    "GK": [50,91],
    "LE": [18,72],
    "LB": [18,72],
    "LD": [82,72],
    "RB": [82,72],
    "ZAG": [50,76],
    "CB": [50,76],
    "VOL": [50,62],
    "CDM": [50,62],
    "MC": [50,50],
    "CM": [50,50],
    "MEI": [50,42],
    "CAM": [50,42],
    "PE": [18,25],
    "LW": [18,25],
    "PD": [82,25],
    "RW": [82,25],
    "CA": [50,18],
    "ST": [50,18]
  };

  if(byOrigin[origem]){
    const [x,y,display] = byOrigin[origem];
    return {x,y,display};
  }

  if(row.x !== undefined && row.x !== "" && row.y !== undefined && row.y !== ""){
    return {x:Number(row.x), y:Number(row.y), display:pos || ""};
  }

  if(byPos[pos]){
    const [x,y] = byPos[pos];
    return {x,y,display:pos};
  }

  // fallback por índice
  const defaults = [
    [50,91,"GOL"],
    [18,72,"LE"],[38,76,"ZAG"],[62,76,"ZAG"],[82,72,"LD"],
    [33,52,"MC"],[50,46,"MEI"],[67,52,"MC"],
    [18,25,"PE"],[50,18,"CA"],[82,25,"PD"]
  ];

  const d = defaults[idx] || [50,50,pos || "POS"];
  return {x:d[0], y:d[1], display:d[2]};
}

var FL_functionGroupV3790 = function FL_functionGroupV3790(row){
  const origem = String(row.posicao_origem || "").toUpperCase();
  const pos = String(row.posicao_tatica || "").toUpperCase();

  if(["GL","GOL","GK"].includes(origem) || ["GOL","GK"].includes(pos)) return "GOL";
  if(["DEF","DEF2","DEF3","DEF4","LE","LD","ZAG","CB","LB","RB"].includes(origem) || ["LE","LD","ZAG","CB","LB","RB"].includes(pos)) return "DEF";
  if(["MEI","MEI5","MEI6","VOL","MC","MEI","CAM","CDM","CM"].includes(origem) || ["VOL","MC","MEI","CAM","CDM","CM"].includes(pos)) return "MEI";
  if(["ATA","ATA7","ATA8","PE","PD","CA","LW","RW","ST"].includes(origem) || ["PE","PD","CA","LW","RW","ST"].includes(pos)) return "ATA";
  return "TOTAL";
}

var FL_initialsV3790 = function FL_initialsV3790(name){
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
}

var FL_fetchPlayerPhotoV3790 = async function FL_fetchPlayerPhotoV3790(name){
  const clean = String(name || "").trim();
  const key = FL_normV3790(clean);
  if(!key) return "";

  if(FL_TOP11_PHOTO_CACHE_V3790[key] !== undefined) return FL_TOP11_PHOTO_CACHE_V3790[key];

  if(typeof FL_fetchPlayerPhotoV3787 === "function"){
    try{
      const img = await FL_fetchPlayerPhotoV3787(clean);
      if(img){
        FL_TOP11_PHOTO_CACHE_V3790[key] = img;
        return img;
      }
    }catch(err){}
  }

  try{
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(clean)}`, {cache:"force-cache"});
    const data = await res.json();
    const players = data?.player || [];
    const found = players.find(p => FL_normV3790(p.strPlayer || "") === key) || players[0];
    const img = found?.strCutout || found?.strRender || found?.strThumb || "";
    FL_TOP11_PHOTO_CACHE_V3790[key] = img || "";
    return img || "";
  }catch(err){
    FL_TOP11_PHOTO_CACHE_V3790[key] = "";
    return "";
  }
}

var FL_sortTop11RowsForPitchV3790 = function FL_sortTop11RowsForPitchV3790(rows){
  const order = ["GL","DEF","DEF2","DEF3","DEF4","MEI","MEI5","MEI6","ATA","ATA7","ATA8"];
  return [...rows].sort((a,b)=>{
    const ao = order.indexOf(String(a.posicao_origem || "").toUpperCase());
    const bo = order.indexOf(String(b.posicao_origem || "").toUpperCase());
    if(ao !== -1 || bo !== -1) return (ao === -1 ? 99 : ao) - (bo === -1 ? 99 : bo);
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

var FL_top11UnifiedCardHtmlV3790 = function FL_top11UnifiedCardHtmlV3790(row, idx, group){
  const coords = FL_positionCoordsV3790(row, idx);
  const name = row.jogador || "Jogador";
  const pos = coords.display || row.posicao_tatica || row.posicao_origem || "";
  const foto = row.foto_url || "";

  return `
    <div class="top11-player-v3787 top11-player-v3790 ${group.editable && typeof FL_TOP11_EDITING_V3787 !== "undefined" && FL_TOP11_EDITING_V3787 ? "editing" : ""}"
         data-id="${FL_escapeAttrV3790(row.id || "")}"
         data-player="${FL_escapeAttrV3790(name)}"
         data-source="${FL_escapeAttrV3790(group.source)}"
         style="left:${coords.x}%; top:${coords.y}%;">
      <div class="top11-photo-v3787 top11-photo-v3790">
        ${foto ? `<img src="${FL_escapeAttrV3790(foto)}" onerror="this.parentElement.innerHTML='${FL_escapeV3790(FL_initialsV3790(name))}'">` : FL_escapeV3790(FL_initialsV3790(name))}
      </div>
      <div class="top11-info-v3787 top11-info-v3790">
        <b>${FL_escapeV3790(name)}</b>
        <span>${FL_escapeV3790(pos)}</span>
      </div>
    </div>
  `;
}

var FL_renderTop11UnifiedV3790 = function FL_renderTop11UnifiedV3790(){
  const page = document.getElementById("top11");
  if(!page) return;

  const groups = FL_top11UnifiedGroupsV3790();
  const group = FL_selectedTop11GroupV3790();
  const rows = group ? FL_sortTop11RowsForPitchV3790(group.rows) : [];

  const canEdit = !!group?.editable;
  const isEditing = canEdit && typeof FL_TOP11_EDITING_V3787 !== "undefined" && FL_TOP11_EDITING_V3787;

  page.innerHTML = `
    <div class="top11-page-head-v3787 top11-page-head-v3790">
      <div>
        <h2>Top 11</h2>
        <p>Histórico e carreira em um único seletor.</p>
        <small>Base histórica é fixa. Top 11 da carreira pode ser editado.</small>
      </div>
      <div class="top11-head-actions-v3787">
        ${groups.length ? `
          <select onchange="FL_TOP11_SELECTED_UNIFIED_KEY_V3790=this.value; if(typeof FL_TOP11_EDITING_V3787!=='undefined') FL_TOP11_EDITING_V3787=false; FL_renderTop11UnifiedV3790();">
            ${groups.map(g=>`
              <option value="${FL_escapeAttrV3790(g.key)}" ${g.key === group?.key ? "selected" : ""}>
                ${FL_escapeV3790(g.label)} · ${FL_escapeV3790(g.sourceLabel)}
              </option>
            `).join("")}
          </select>
        ` : ""}
        <button type="button" class="ghost" onclick="FL_scrollTop11BestV3790()">Melhores</button>
        ${canEdit ? `<button type="button" class="ghost" onclick="FL_toggleTop11EditV3790()">${isEditing ? "Cancelar edição" : "Editar Top 11"}</button>` : ""}
        <button type="button" class="gold" onclick="FL_openCreateTop11V3790()">+ Top 11</button>
      </div>
    </div>

    <section class="top11-map-section-v3787">
      <div class="top11-map-toolbar-v3787">
        <strong>Top 11 ${FL_escapeV3790(group?.label || "")}</strong>
        <span>${FL_escapeV3790(group?.sourceLabel || "")}</span>
        ${isEditing ? `<button type="button" class="gold" onclick="FL_saveTop11PositionsV3790()">Salvar posições deste Top 11</button>` : ""}
      </div>

      <div class="top11-pitch-v3787 top11-pitch-v3790"
           style="background-image:linear-gradient(rgba(2,6,23,.08),rgba(2,6,23,.18)),url('${FL_escapeAttrV3790(FL_top11FixedBgV3790())}')">
        ${rows.length ? rows.map((r,i)=>FL_top11UnifiedCardHtmlV3790(r,i,group)).join("") : `
          <button type="button" class="top11-create-card-v3787" onclick="FL_openCreateTop11V3790()">
            <b>+</b>
            <span>Criar Top 11</span>
          </button>
        `}
      </div>
    </section>

    <section id="top11-melhores-v3790" class="top11-best-section-v3790">
      ${FL_renderTop11BestInnerV3790()}
    </section>
  `;

  if(isEditing && typeof FL_enableTop11DragV3787 === "function"){
    FL_enableTop11DragV3787();
  }

  FL_enrichTop11PhotosV3790();
}

var FL_enrichTop11PhotosV3790 = function FL_enrichTop11PhotosV3790(){
  const nodes = [...document.querySelectorAll(".top11-player-v3790")];

  nodes.forEach(async node=>{
    const name = node.dataset.player || "";
    const photo = node.querySelector(".top11-photo-v3790");
    if(!name || !photo || photo.querySelector("img")) return;

    const img = await FL_fetchPlayerPhotoV3790(name);
    if(!img || !node.isConnected) return;

    photo.innerHTML = `<img src="${FL_escapeAttrV3790(img)}" onerror="this.parentElement.innerHTML='${FL_escapeV3790(FL_initialsV3790(name))}'">`;
  });
}

var FL_top11AppearancesV3790 = function FL_top11AppearancesV3790(){
  const rows = [
    ...FL_top11BaseRowsV3790().map(r=>Object.assign({__source:"base"}, r)),
    ...FL_top11CareerRowsV3790().map(r=>Object.assign({__source:"career"}, r))
  ];

  const filter = FL_TOP11_APPEARANCE_FILTER_V3790 || "TOTAL";
  const map = new Map();

  rows.forEach(r=>{
    const func = FL_functionGroupV3790(r);
    if(filter !== "TOTAL" && func !== filter) return;

    const name = String(r.jogador || "").trim();
    if(!name) return;

    const key = FL_normV3790(name);

    if(!map.has(key)){
      map.set(key,{
        jogador:name,
        total:0,
        base:0,
        carreira:0,
        funcoes:new Set(),
        anos:[],
      });
    }

    const item = map.get(key);
    item.total++;
    if(r.__source === "career") item.carreira++;
    else item.base++;
    item.funcoes.add(func);
    const year = r.ano || r.temporada || "";
    if(year) item.anos.push(year);
  });

  return [...map.values()]
    .map(i=>Object.assign({}, i, {funcoes:[...i.funcoes].filter(f=>f!=="TOTAL")}))
    .sort((a,b)=>b.total-a.total || a.jogador.localeCompare(b.jogador));
}

var FL_renderTop11BestInnerV3790 = function FL_renderTop11BestInnerV3790(){
  const rows = FL_top11AppearancesV3790().slice(0,30);
  const filters = [
    ["TOTAL","Total"],
    ["GOL","Goleiros"],
    ["DEF","Defesa"],
    ["MEI","Meio"],
    ["ATA","Ataque"]
  ];

  return `
    <div class="top11-best-head-v3790">
      <div>
        <h2>Melhores</h2>
        <p>Jogadores com mais aparições em Top 11.</p>
      </div>
      <div class="top11-best-tabs-v3790">
        ${filters.map(([id,label])=>`
          <button type="button" class="${FL_TOP11_APPEARANCE_FILTER_V3790===id ? "active" : ""}" onclick="FL_TOP11_APPEARANCE_FILTER_V3790='${id}'; FL_updateTop11BestV3790();">${label}</button>
        `).join("")}
      </div>
    </div>

    <div class="top11-best-list-v3790">
      ${rows.map((r,idx)=>`
        <article class="top11-best-card-v3790">
          <span class="rank">${idx+1}</span>
          <div class="avatar" data-top11-best-photo="${FL_escapeAttrV3790(r.jogador)}">${FL_escapeV3790(FL_initialsV3790(r.jogador))}</div>
          <div class="info">
            <strong>${FL_escapeV3790(r.jogador)}</strong>
            <small>${FL_escapeV3790(r.funcoes.join(" / ") || "-")} • ${r.base} base • ${r.carreira} carreira</small>
            <em>${FL_escapeV3790([...new Set(r.anos)].slice(0,10).join(" • "))}${r.anos.length>10 ? "..." : ""}</em>
          </div>
          <b>${r.total}x</b>
        </article>
      `).join("") || `<div class="top11-base-empty-v3789"><b>Sem dados.</b><span>Cadastre ou cole dados no TOP11_BASE.</span></div>`}
    </div>
  `;
}

var FL_updateTop11BestV3790 = function FL_updateTop11BestV3790(){
  const el = document.getElementById("top11-melhores-v3790");
  if(!el) return;
  el.innerHTML = FL_renderTop11BestInnerV3790();
  FL_enrichTop11BestPhotosV3790();
}

var FL_enrichTop11BestPhotosV3790 = function FL_enrichTop11BestPhotosV3790(){
  const nodes = [...document.querySelectorAll("[data-top11-best-photo]")];

  nodes.forEach(async node=>{
    const name = node.dataset.top11BestPhoto || "";
    if(!name || node.querySelector("img")) return;
    const img = await FL_fetchPlayerPhotoV3790(name);
    if(!img || !node.isConnected) return;
    node.innerHTML = `<img src="${FL_escapeAttrV3790(img)}" onerror="this.parentElement.innerHTML='${FL_escapeV3790(FL_initialsV3790(name))}'">`;
  });
}

var FL_enrichTop11PhotosV3790 = function FL_enrichTop11PhotosV3790(){
  const playerNodes = [...document.querySelectorAll(".top11-player-v3790")];

  playerNodes.forEach(async node=>{
    const name = node.dataset.player || "";
    const photo = node.querySelector(".top11-photo-v3790");
    if(!name || !photo || photo.querySelector("img")) return;
    const img = await FL_fetchPlayerPhotoV3790(name);
    if(!img || !node.isConnected) return;
    photo.innerHTML = `<img src="${FL_escapeAttrV3790(img)}" onerror="this.parentElement.innerHTML='${FL_escapeV3790(FL_initialsV3790(name))}'">`;
  });

  FL_enrichTop11BestPhotosV3790();
}

var FL_scrollTop11BestV3790 = function FL_scrollTop11BestV3790(){
  document.getElementById("top11-melhores-v3790")?.scrollIntoView({behavior:"smooth", block:"start"});
}

var FL_toggleTop11EditV3790 = function FL_toggleTop11EditV3790(){
  if(typeof FL_toggleTop11EditV3787 === "function"){
    FL_toggleTop11EditV3787();
  }else{
    window.FL_TOP11_EDITING_V3787 = !window.FL_TOP11_EDITING_V3787;
  }
  FL_renderTop11UnifiedV3790();
}

var FL_openCreateTop11V3790 = function FL_openCreateTop11V3790(){
  if(typeof FL_openCreateTop11V3788 === "function") return FL_openCreateTop11V3788();
  if(typeof FL_openCreateTop11V3787 === "function") return FL_openCreateTop11V3787();
}

var FL_saveTop11PositionsV3790 = function FL_saveTop11PositionsV3790(){
  if(typeof FL_saveTop11PositionsV3788 === "function") return FL_saveTop11PositionsV3788();
  if(typeof FL_saveTop11PositionsV3787 === "function") return FL_saveTop11PositionsV3787();
}

renderTop11 = FL_renderTop11UnifiedV3790;
window.renderTop11 = FL_renderTop11UnifiedV3790;
window.FL_renderTop11UnifiedV3790 = FL_renderTop11UnifiedV3790;
window.FL_updateTop11BestV3790 = FL_updateTop11BestV3790;
window.FL_scrollTop11BestV3790 = FL_scrollTop11BestV3790;
window.FL_openCreateTop11V3790 = FL_openCreateTop11V3790;
window.FL_toggleTop11EditV3790 = FL_toggleTop11EditV3790;
window.FL_saveTop11PositionsV3790 = FL_saveTop11PositionsV3790;


// ===== V3.7.91 TOP 11 — POSICIONAMENTO CORRETO NO CAMPO HORIZONTAL =====
// O campo do dashboard está deitado.
// Então o fluxo correto é:
// GOL na esquerda -> DEF -> MEI -> ATA na direita.

var FL_positionCoordsV3791 = function FL_positionCoordsV3791(row, idx){
  const origem = String(row.posicao_origem || "").toUpperCase();
  const pos = String(row.posicao_tatica || "").toUpperCase();

  // Mapeamento direto da TOP11_BASE:
  // ANO | GL | DEF | DEF2 | DEF3 | DEF4 | MEI | MEI5 | MEI6 | ATA | ATA7 | ATA8
  const byOrigin = {
    "GL":   [8, 50, "GOL"],

    "DEF":  [22, 20, "LE"],
    "DEF2": [27, 38, "ZAG"],
    "DEF3": [27, 62, "ZAG"],
    "DEF4": [22, 80, "LD"],

    "MEI":  [52, 28, "MEI"],
    "MEI5": [52, 50, "MEI"],
    "MEI6": [52, 72, "MEI"],

    "ATA":  [78, 28, "PE"],
    "ATA7": [84, 50, "CA"],
    "ATA8": [78, 72, "PD"]
  };

  // Mapeamento para TOP11_CARREIRA quando não houver x/y salvo.
  const byPos = {
    "GOL": [8,50],
    "GK": [8,50],

    "LE": [22,20],
    "LB": [22,20],
    "LD": [22,80],
    "RB": [22,80],
    "ZAG": [27,50],
    "CB": [27,50],

    "VOL": [43,50],
    "CDM": [43,50],
    "MC": [52,50],
    "CM": [52,50],
    "MEI": [58,50],
    "CAM": [58,50],

    "PE": [78,28],
    "LW": [78,28],
    "PD": [78,72],
    "RW": [78,72],
    "CA": [84,50],
    "ST": [84,50]
  };

  if(byOrigin[origem]){
    const [x,y,display] = byOrigin[origem];
    return {x,y,display};
  }

  // Para carreira editável, se já existe posição salva, respeita.
  if(row.__top11Source === "career" && row.x !== undefined && row.x !== "" && row.y !== undefined && row.y !== ""){
    return {x:Number(row.x), y:Number(row.y), display:pos || ""};
  }

  // Para base histórica, força o mapeamento horizontal mesmo se x/y vier antigo.
  if(row.__top11Source === "base" && byPos[pos]){
    const [x,y] = byPos[pos];
    return {x,y,display:pos};
  }

  if(byPos[pos]){
    const [x,y] = byPos[pos];
    return {x,y,display:pos};
  }

  // fallback por índice, também horizontal
  const defaults = [
    [8,50,"GOL"],
    [22,20,"LE"], [27,38,"ZAG"], [27,62,"ZAG"], [22,80,"LD"],
    [52,28,"MEI"], [52,50,"MEI"], [52,72,"MEI"],
    [78,28,"PE"], [84,50,"CA"], [78,72,"PD"]
  ];

  const d = defaults[idx] || [50,50,pos || "POS"];
  return {x:d[0], y:d[1], display:d[2]};
}

// Sobrescreve a função usada pela v3.7.90.
window.FL_positionCoordsV3790 = FL_positionCoordsV3791;

// Re-renderiza o Top11 usando o novo posicionamento.
setTimeout(()=>{
  try{
    if(document.body.dataset.currentPage === "top11" && typeof FL_renderTop11UnifiedV3790 === "function"){
      FL_renderTop11UnifiedV3790();
    }
  }catch(err){}
}, 300);


// ===== V3.7.92 TOP 11 — BASE ROBUSTA + MELHORES ORGANIZADO =====
// Corrige:
// - TOP11_BASE pode vir com cabeçalhos diferentes/maiúsculos.
// - Garante seleção dos 11 jogadores por ano quando a base está completa.
// - Ordem correta por posição original.
// - Melhores em layout limpo, sem texto vazando.

var FL_normV3792 = function FL_normV3792(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3792 = function FL_escapeV3792(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3792 = function FL_escapeAttrV3792(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

var FL_pickV3792 = function FL_pickV3792(row, keys){
  for(const k of keys){
    if(row && row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }

  const normalized = {};
  Object.keys(row || {}).forEach(k=>{
    normalized[FL_normV3792(k)] = row[k];
  });

  for(const k of keys){
    const nk = FL_normV3792(k);
    if(normalized[nk] !== undefined && normalized[nk] !== null && normalized[nk] !== "") return normalized[nk];
  }

  return "";
}

var FL_normalizeBaseRowV3792 = function FL_normalizeBaseRowV3792(row){
  return {
    id: FL_pickV3792(row, ["id","ID"]),
    ano: FL_pickV3792(row, ["ano","ANO","temporada","TEMPORADA"]),
    posicao_origem: FL_pickV3792(row, ["posicao_origem","POSICAO_ORIGEM","posição_origem","POSIÇÃO_ORIGEM","origem","ORIGEM"]),
    posicao_tatica: FL_pickV3792(row, ["posicao_tatica","POSICAO_TATICA","posição_tatica","POSIÇÃO_TATICA","posicao","POSICAO","posição","POSIÇÃO"]),
    jogador: FL_pickV3792(row, ["jogador","JOGADOR","player","PLAYER"]),
    x: FL_pickV3792(row, ["x","X"]),
    y: FL_pickV3792(row, ["y","Y"]),
    mapa_url: FL_pickV3792(row, ["mapa_url","MAPA_URL"])
  };
}

var FL_top11BaseRowsV3792 = function FL_top11BaseRowsV3792(){
  const raw = getTable("TOP11_BASE") || [];
  const rows = raw.map(FL_normalizeBaseRowV3792).filter(r=>r.ano && r.jogador);

  // Se por algum motivo a base foi colada no formato largo, converte também.
  const wideRaw = raw.filter(r => FL_pickV3792(r, ["ANO","ano"]) && (FL_pickV3792(r, ["GL"]) || FL_pickV3792(r, ["DEF"])));
  if(wideRaw.length){
    const mapping = [
      ["GL","GOL"],["DEF","LE"],["DEF2","ZAG"],["DEF3","ZAG"],["DEF4","LD"],
      ["MEI","MEI"],["MEI5","MEI"],["MEI6","MEI"],
      ["ATA","PE"],["ATA7","CA"],["ATA8","PD"]
    ];
    const converted = [];
    let id = 1;
    wideRaw.forEach(w=>{
      const ano = FL_pickV3792(w, ["ANO","ano"]);
      mapping.forEach(([orig,pos])=>{
        const jogador = FL_pickV3792(w, [orig]);
        if(jogador){
          converted.push({id:id++, ano, posicao_origem:orig, posicao_tatica:pos, jogador});
        }
      });
    });
    return converted;
  }

  return rows;
}

var FL_positionOrderV3792 = function FL_positionOrderV3792(row){
  const origem = String(row.posicao_origem || "").toUpperCase();
  const order = ["GL","DEF","DEF2","DEF3","DEF4","MEI","MEI5","MEI6","ATA","ATA7","ATA8"];
  const idx = order.indexOf(origem);
  if(idx !== -1) return idx;

  const pos = String(row.posicao_tatica || "").toUpperCase();
  const groupOrder = {
    GOL:0, GK:0,
    LE:1, LB:1, ZAG:2, CB:2, LD:4, RB:4,
    VOL:5, MC:6, CM:6, MEI:7, CAM:7,
    PE:8, LW:8, CA:9, ST:9, PD:10, RW:10
  };
  return groupOrder[pos] ?? 99;
}

var FL_top11UnifiedGroupsV3792 = function FL_top11UnifiedGroupsV3792(){
  const groups = [];

  const baseMap = new Map();
  FL_top11BaseRowsV3792().forEach(r=>{
    const ano = r.ano || r.temporada || "";
    if(!ano) return;
    const key = `base:${ano}`;
    if(!baseMap.has(key)){
      baseMap.set(key,{
        key,
        label: ano,
        season: ano,
        source:"base",
        sourceLabel:"Base histórica",
        editable:false,
        rows:[]
      });
    }
    baseMap.get(key).rows.push(Object.assign({__top11Source:"base"}, r));
  });

  const careerMap = new Map();
  const careerRows = typeof FL_top11CareerRowsV3790 === "function" ? FL_top11CareerRowsV3790() : (getTable("TOP11_CARREIRA") || []);
  careerRows.forEach(r=>{
    const seasonId = r.carreira_temporada_id || "";
    const temp = r.temporada || "";
    const key = seasonId ? `career:${seasonId}` : `career:${temp || "sem-temporada"}`;
    if(!careerMap.has(key)){
      careerMap.set(key,{
        key,
        label: temp || "Top 11 carreira",
        season: temp,
        carreira_temporada_id: seasonId,
        source:"career",
        sourceLabel:"Carreira",
        editable:true,
        rows:[]
      });
    }
    careerMap.get(key).rows.push(Object.assign({__top11Source:"career"}, r));
  });

  groups.push(...baseMap.values(), ...careerMap.values());

  groups.forEach(g=>{
    g.rows = [...g.rows].sort((a,b)=>FL_positionOrderV3792(a)-FL_positionOrderV3792(b) || Number(a.id||0)-Number(b.id||0));
  });

  groups.sort((a,b)=>{
    const bySeason = String(b.season || b.label || "").localeCompare(String(a.season || a.label || ""));
    if(bySeason) return bySeason;
    if(a.source !== b.source) return a.source === "career" ? -1 : 1;
    return 0;
  });

  if(!window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790 && groups.length){
    window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790 = groups[0].key;
  }

  return groups;
}

var FL_selectedTop11GroupV3792 = function FL_selectedTop11GroupV3792(){
  const groups = FL_top11UnifiedGroupsV3792();
  if(!groups.length) return null;
  return groups.find(g=>g.key === window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790) || groups[0];
}

var FL_positionCoordsV3792 = function FL_positionCoordsV3792(row, idx){
  const origem = String(row.posicao_origem || "").toUpperCase();
  const pos = String(row.posicao_tatica || "").toUpperCase();

  const byOrigin = {
    "GL":   [8, 50, "GOL"],

    "DEF":  [22, 20, "LE"],
    "DEF2": [27, 38, "ZAG"],
    "DEF3": [27, 62, "ZAG"],
    "DEF4": [22, 80, "LD"],

    "MEI":  [52, 28, "MEI"],
    "MEI5": [52, 50, "MEI"],
    "MEI6": [52, 72, "MEI"],

    "ATA":  [78, 28, "PE"],
    "ATA7": [84, 50, "CA"],
    "ATA8": [78, 72, "PD"]
  };

  const byPos = {
    "GOL":[8,50], "GK":[8,50],
    "LE":[22,20], "LB":[22,20],
    "LD":[22,80], "RB":[22,80],
    "ZAG":[27,50], "CB":[27,50],
    "VOL":[42,50], "CDM":[42,50],
    "MC":[52,50], "CM":[52,50],
    "MEI":[58,50], "CAM":[58,50],
    "PE":[78,28], "LW":[78,28],
    "CA":[84,50], "ST":[84,50],
    "PD":[78,72], "RW":[78,72]
  };

  if(byOrigin[origem]){
    const [x,y,display] = byOrigin[origem];
    return {x,y,display};
  }

  if(row.__top11Source === "career" && row.x !== undefined && row.x !== "" && row.y !== undefined && row.y !== ""){
    return {x:Number(row.x), y:Number(row.y), display:pos || ""};
  }

  if(byPos[pos]){
    const [x,y] = byPos[pos];
    return {x,y,display:pos};
  }

  const defaults = [
    [8,50,"GOL"],
    [22,20,"LE"],[27,38,"ZAG"],[27,62,"ZAG"],[22,80,"LD"],
    [52,28,"MEI"],[52,50,"MEI"],[52,72,"MEI"],
    [78,28,"PE"],[84,50,"CA"],[78,72,"PD"]
  ];
  const d = defaults[idx] || [50,50,pos || "POS"];
  return {x:d[0],y:d[1],display:d[2]};
}

var FL_sortTop11RowsForPitchV3792 = function FL_sortTop11RowsForPitchV3792(rows){
  return [...rows].sort((a,b)=>FL_positionOrderV3792(a)-FL_positionOrderV3792(b) || Number(a.id||0)-Number(b.id||0));
}

var FL_functionGroupV3792 = function FL_functionGroupV3792(row){
  const origem = String(row.posicao_origem || "").toUpperCase();
  const pos = String(row.posicao_tatica || "").toUpperCase();

  if(["GL","GOL","GK"].includes(origem) || ["GOL","GK"].includes(pos)) return "GOL";
  if(["DEF","DEF2","DEF3","DEF4","LE","LD","ZAG","CB","LB","RB"].includes(origem) || ["LE","LD","ZAG","CB","LB","RB"].includes(pos)) return "DEF";
  if(["MEI","MEI5","MEI6","VOL","MC","MEI","CAM","CDM","CM"].includes(origem) || ["VOL","MC","MEI","CAM","CDM","CM"].includes(pos)) return "MEI";
  if(["ATA","ATA7","ATA8","PE","PD","CA","LW","RW","ST"].includes(origem) || ["PE","PD","CA","LW","RW","ST"].includes(pos)) return "ATA";
  return "TOTAL";
}

var FL_top11AppearancesV3792 = function FL_top11AppearancesV3792(){
  const baseRows = FL_top11BaseRowsV3792().map(r=>Object.assign({__source:"base"}, r));
  const careerRows = (typeof FL_top11CareerRowsV3790 === "function" ? FL_top11CareerRowsV3790() : (getTable("TOP11_CARREIRA") || [])).map(r=>Object.assign({__source:"career"}, r));
  const rows = [...baseRows, ...careerRows];

  const filter = window.FL_TOP11_APPEARANCE_FILTER_V3790 || "TOTAL";
  const map = new Map();

  rows.forEach(r=>{
    const func = FL_functionGroupV3792(r);
    if(filter !== "TOTAL" && func !== filter) return;

    const name = String(r.jogador || "").trim();
    if(!name) return;

    const key = FL_normV3792(name);

    if(!map.has(key)){
      map.set(key,{jogador:name,total:0,base:0,carreira:0,funcoes:new Set(),anos:[]});
    }

    const item = map.get(key);
    item.total++;
    if(r.__source === "career") item.carreira++;
    else item.base++;
    item.funcoes.add(func);
    const year = r.ano || r.temporada || "";
    if(year && !item.anos.includes(year)) item.anos.push(year);
  });

  return [...map.values()]
    .map(i=>Object.assign({}, i, {funcoes:[...i.funcoes].filter(f=>f!=="TOTAL")}))
    .sort((a,b)=>b.total-a.total || b.carreira-a.carreira || a.jogador.localeCompare(b.jogador));
}

var FL_renderTop11BestInnerV3792 = function FL_renderTop11BestInnerV3792(){
  const rows = FL_top11AppearancesV3792().slice(0,30);
  const filters = [
    ["TOTAL","Total"],
    ["GOL","Goleiros"],
    ["DEF","Defesa"],
    ["MEI","Meio"],
    ["ATA","Ataque"]
  ];

  return `
    <div class="top11-best-head-v3790 top11-best-head-v3792">
      <div>
        <h2>Melhores</h2>
        <p>Jogadores com mais aparições em Top 11.</p>
      </div>
      <div class="top11-best-tabs-v3790">
        ${filters.map(([id,label])=>`
          <button type="button" class="${(window.FL_TOP11_APPEARANCE_FILTER_V3790||"TOTAL")===id ? "active" : ""}" onclick="window.FL_TOP11_APPEARANCE_FILTER_V3790='${id}'; FL_updateTop11BestV3792();">${label}</button>
        `).join("")}
      </div>
    </div>

    <div class="top11-best-list-v3792">
      ${rows.map((r,idx)=>`
        <article class="top11-best-card-v3792">
          <span class="rank">${idx+1}</span>
          <div class="avatar" data-top11-best-photo="${FL_escapeAttrV3792(r.jogador)}">${typeof FL_initialsV3790 === "function" ? FL_escapeV3792(FL_initialsV3790(r.jogador)) : FL_escapeV3792(String(r.jogador).slice(0,2).toUpperCase())}</div>
          <div class="info">
            <div class="name-line">
              <strong>${FL_escapeV3792(r.jogador)}</strong>
              <b>${r.total}x</b>
            </div>
            <small>${FL_escapeV3792(r.funcoes.join(" / ") || "-")} • ${r.base} base • ${r.carreira} carreira</small>
            <em>${FL_escapeV3792(r.anos.slice(0,6).join(" • "))}${r.anos.length>6 ? "..." : ""}</em>
          </div>
        </article>
      `).join("") || `<div class="top11-base-empty-v3789"><b>Sem dados.</b><span>Cadastre ou cole dados no TOP11_BASE.</span></div>`}
    </div>
  `;
}

var FL_updateTop11BestV3792 = function FL_updateTop11BestV3792(){
  const el = document.getElementById("top11-melhores-v3790");
  if(!el) return;
  el.innerHTML = FL_renderTop11BestInnerV3792();
  if(typeof FL_enrichTop11BestPhotosV3790 === "function") FL_enrichTop11BestPhotosV3790();
}

var FL_renderTop11UnifiedV3792 = function FL_renderTop11UnifiedV3792(){
  // Copia a render v3.7.90, mas usa grupos/rows/coords corrigidos.
  const page = document.getElementById("top11");
  if(!page) return;

  const groups = FL_top11UnifiedGroupsV3792();
  const group = FL_selectedTop11GroupV3792();
  const rows = group ? FL_sortTop11RowsForPitchV3792(group.rows) : [];

  const canEdit = !!group?.editable;
  const isEditing = canEdit && typeof FL_TOP11_EDITING_V3787 !== "undefined" && FL_TOP11_EDITING_V3787;

  const playerHtml = rows.map((r,i)=>{
    const coords = FL_positionCoordsV3792(r,i);
    const name = r.jogador || "Jogador";
    const pos = coords.display || r.posicao_tatica || r.posicao_origem || "";
    const foto = r.foto_url || "";

    return `
      <div class="top11-player-v3787 top11-player-v3790 ${isEditing ? "editing" : ""}"
           data-id="${FL_escapeAttrV3792(r.id || "")}"
           data-player="${FL_escapeAttrV3792(name)}"
           data-source="${FL_escapeAttrV3792(group.source)}"
           style="left:${coords.x}%; top:${coords.y}%;">
        <div class="top11-photo-v3787 top11-photo-v3790">
          ${foto ? `<img src="${FL_escapeAttrV3792(foto)}" onerror="this.parentElement.innerHTML='${typeof FL_initialsV3790 === "function" ? FL_escapeV3792(FL_initialsV3790(name)) : FL_escapeV3792(String(name).slice(0,2).toUpperCase())}'">` : (typeof FL_initialsV3790 === "function" ? FL_escapeV3792(FL_initialsV3790(name)) : FL_escapeV3792(String(name).slice(0,2).toUpperCase()))}
        </div>
        <div class="top11-info-v3787 top11-info-v3790">
          <b>${FL_escapeV3792(name)}</b>
          <span>${FL_escapeV3792(pos)}</span>
        </div>
      </div>
    `;
  }).join("");

  page.innerHTML = `
    <div class="top11-page-head-v3787 top11-page-head-v3790">
      <div>
        <h2>Top 11</h2>
        <p>Histórico e carreira em um único seletor.</p>
        <small>${rows.length}/11 jogadores neste Top 11.</small>
      </div>
      <div class="top11-head-actions-v3787">
        ${groups.length ? `
          <select onchange="window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790=this.value; if(typeof FL_TOP11_EDITING_V3787!=='undefined') FL_TOP11_EDITING_V3787=false; FL_renderTop11UnifiedV3792();">
            ${groups.map(g=>`
              <option value="${FL_escapeAttrV3792(g.key)}" ${g.key === group?.key ? "selected" : ""}>
                ${FL_escapeV3792(g.label)} · ${FL_escapeV3792(g.sourceLabel)}
              </option>
            `).join("")}
          </select>
        ` : ""}
        <button type="button" class="ghost" onclick="document.getElementById('top11-melhores-v3790')?.scrollIntoView({behavior:'smooth',block:'start'});">Melhores</button>
        ${canEdit ? `<button type="button" class="ghost" onclick="FL_toggleTop11EditV3790()">${isEditing ? "Cancelar edição" : "Editar Top 11"}</button>` : ""}
        <button type="button" class="gold" onclick="FL_openCreateTop11V3790()">+ Top 11</button>
      </div>
    </div>

    <section class="top11-map-section-v3787">
      <div class="top11-map-toolbar-v3787">
        <strong>Top 11 ${FL_escapeV3792(group?.label || "")}</strong>
        <span>${FL_escapeV3792(group?.sourceLabel || "")}</span>
        ${isEditing ? `<button type="button" class="gold" onclick="FL_saveTop11PositionsV3790()">Salvar posições deste Top 11</button>` : ""}
      </div>

      <div class="top11-pitch-v3787 top11-pitch-v3790"
           style="background-image:linear-gradient(rgba(2,6,23,.08),rgba(2,6,23,.18)),url('${typeof FL_top11FixedBgV3790 === "function" ? FL_escapeAttrV3792(FL_top11FixedBgV3790()) : "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg"}')">
        ${rows.length ? playerHtml : `
          <button type="button" class="top11-create-card-v3787" onclick="FL_openCreateTop11V3790()">
            <b>+</b>
            <span>Criar Top 11</span>
          </button>
        `}
      </div>
    </section>

    <section id="top11-melhores-v3790" class="top11-best-section-v3790 top11-best-section-v3792">
      ${FL_renderTop11BestInnerV3792()}
    </section>
  `;

  if(isEditing && typeof FL_enableTop11DragV3787 === "function") FL_enableTop11DragV3787();
  if(typeof FL_enrichTop11PhotosV3790 === "function") FL_enrichTop11PhotosV3790();
  if(typeof FL_enrichTop11BestPhotosV3790 === "function") FL_enrichTop11BestPhotosV3790();
}

// Override final.
window.FL_top11BaseRowsV3790 = FL_top11BaseRowsV3792;
window.FL_top11UnifiedGroupsV3790 = FL_top11UnifiedGroupsV3792;
window.FL_selectedTop11GroupV3790 = FL_selectedTop11GroupV3792;
window.FL_positionCoordsV3790 = FL_positionCoordsV3792;
window.FL_top11AppearancesV3790 = FL_top11AppearancesV3792;
window.FL_renderTop11BestInnerV3790 = FL_renderTop11BestInnerV3792;
window.FL_updateTop11BestV3790 = FL_updateTop11BestV3792;
window.FL_renderTop11UnifiedV3790 = FL_renderTop11UnifiedV3792;

renderTop11 = FL_renderTop11UnifiedV3792;
window.renderTop11 = FL_renderTop11UnifiedV3792;
window.FL_renderTop11UnifiedV3792 = FL_renderTop11UnifiedV3792;
window.FL_updateTop11BestV3792 = FL_updateTop11BestV3792;


// ===== V3.7.93 TOP11 11 JOGADORES + X CERTO + MELHORES EM LISTA =====
// Correções:
// - Remove X vermelho perdido/fixo.
// - Restaura X somente em cards de temporadas jogadas.
// - Top11 base: leitura robusta vertical/larga.
// - Melhores: lista vertical 1,2,3... sem grid apertado.

var FL_normV3793 = function FL_normV3793(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3793 = function FL_escapeV3793(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3793 = function FL_escapeAttrV3793(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

var FL_pickV3793 = function FL_pickV3793(row, keys){
  for(const k of keys){
    if(row && row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  const normalized = {};
  Object.keys(row || {}).forEach(k=>normalized[FL_normV3793(k)] = row[k]);
  for(const k of keys){
    const nk = FL_normV3793(k);
    if(normalized[nk] !== undefined && normalized[nk] !== null && normalized[nk] !== "") return normalized[nk];
  }
  return "";
}

var FL_top11FixedBgV3793 = function FL_top11FixedBgV3793(){
  return "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg";
}

var FL_originMappingV3793 = function FL_originMappingV3793(){
  return [
    ["GL","GOL",8,50],
    ["DEF","LE",22,20],
    ["DEF2","ZAG",27,38],
    ["DEF3","ZAG",27,62],
    ["DEF4","LD",22,80],
    ["MEI","MEI",52,28],
    ["MEI5","MEI",52,50],
    ["MEI6","MEI",52,72],
    ["ATA","PE",78,28],
    ["ATA7","CA",84,50],
    ["ATA8","PD",78,72]
  ];
}

var FL_normalizeBaseRowsV3793 = function FL_normalizeBaseRowsV3793(){
  const raw = getTable("TOP11_BASE") || [];
  if(!raw.length) return [];

  const mapping = FL_originMappingV3793();

  // 1) Se a base estiver colada no formato largo:
  // ANO | GL | DEF | DEF2 | ...
  const wideRows = raw.filter(r=>{
    const ano = FL_pickV3793(r, ["ANO","ano","Ano"]);
    const hasWide = mapping.some(([orig]) => !!FL_pickV3793(r, [orig]));
    return ano && hasWide;
  });

  if(wideRows.length){
    const out = [];
    let id = 1;
    wideRows.forEach(w=>{
      const ano = FL_pickV3793(w, ["ANO","ano","Ano"]);
      mapping.forEach(([orig,pos,x,y])=>{
        const jogador = FL_pickV3793(w, [orig]);
        if(jogador){
          out.push({
            id:id++,
            ano,
            posicao_origem:orig,
            posicao_tatica:pos,
            jogador,
            x,
            y,
            mapa_url: FL_top11FixedBgV3793(),
            __top11Source:"base"
          });
        }
      });
    });
    return out;
  }

  // 2) Formato vertical:
  // id | ano | posicao_origem | posicao_tatica | jogador | x | y | mapa_url
  return raw.map(r=>{
    const origem = String(FL_pickV3793(r, ["posicao_origem","POSICAO_ORIGEM","posição_origem","origem"]) || "").toUpperCase();
    const map = mapping.find(([o])=>o===origem);
    return {
      id: FL_pickV3793(r, ["id","ID"]),
      ano: FL_pickV3793(r, ["ano","ANO","temporada","TEMPORADA"]),
      posicao_origem: origem,
      posicao_tatica: FL_pickV3793(r, ["posicao_tatica","POSICAO_TATICA","posição_tatica","posicao","POSICAO"]) || (map ? map[1] : ""),
      jogador: FL_pickV3793(r, ["jogador","JOGADOR","player","PLAYER"]),
      x: map ? map[2] : FL_pickV3793(r, ["x","X"]),
      y: map ? map[3] : FL_pickV3793(r, ["y","Y"]),
      mapa_url: FL_pickV3793(r, ["mapa_url","MAPA_URL"]) || FL_top11FixedBgV3793(),
      __top11Source:"base"
    };
  }).filter(r=>r.ano && r.jogador);
}

var FL_top11BaseRowsV3793 = function FL_top11BaseRowsV3793(){
  return FL_normalizeBaseRowsV3793();
}

var FL_positionOrderV3793 = function FL_positionOrderV3793(row){
  const origem = String(row.posicao_origem || "").toUpperCase();
  const order = ["GL","DEF","DEF2","DEF3","DEF4","MEI","MEI5","MEI6","ATA","ATA7","ATA8"];
  const idx = order.indexOf(origem);
  if(idx >= 0) return idx;
  return Number(row.id || 9999);
}

var FL_positionCoordsV3793 = function FL_positionCoordsV3793(row, idx){
  const origem = String(row.posicao_origem || "").toUpperCase();
  const map = FL_originMappingV3793().find(([o])=>o===origem);
  if(map) return {x:map[2], y:map[3], display:map[1]};

  if(row.__top11Source === "career" && row.x !== undefined && row.x !== "" && row.y !== undefined && row.y !== ""){
    return {x:Number(row.x), y:Number(row.y), display:row.posicao_tatica || ""};
  }

  const defaults = FL_originMappingV3793();
  const d = defaults[idx] || ["","POS",50,50];
  return {x:d[2], y:d[3], display:row.posicao_tatica || d[1]};
}

var FL_top11CareerRowsV3793 = function FL_top11CareerRowsV3793(){
  const carreiraId = active?.carreira_id || "";
  return (getTable("TOP11_CARREIRA") || []).filter(r => !carreiraId || String(r.carreira_id || "") === String(carreiraId));
}

var FL_top11UnifiedGroupsV3793 = function FL_top11UnifiedGroupsV3793(){
  const groups = [];

  const baseMap = new Map();
  FL_top11BaseRowsV3793().forEach(r=>{
    const ano = r.ano || r.temporada || "";
    if(!ano) return;
    const key = `base:${ano}`;
    if(!baseMap.has(key)){
      baseMap.set(key,{key,label:ano,season:ano,source:"base",sourceLabel:"Base histórica",editable:false,rows:[]});
    }
    baseMap.get(key).rows.push(r);
  });

  const careerMap = new Map();
  FL_top11CareerRowsV3793().forEach(r=>{
    const sid = r.carreira_temporada_id || "";
    const temp = r.temporada || "";
    const key = sid ? `career:${sid}` : `career:${temp || "sem-temporada"}`;
    if(!careerMap.has(key)){
      careerMap.set(key,{key,label:temp || "Top 11 carreira",season:temp,carreira_temporada_id:sid,source:"career",sourceLabel:"Carreira",editable:true,rows:[]});
    }
    careerMap.get(key).rows.push(Object.assign({__top11Source:"career"}, r));
  });

  groups.push(...baseMap.values(), ...careerMap.values());
  groups.forEach(g=>g.rows = [...g.rows].sort((a,b)=>FL_positionOrderV3793(a)-FL_positionOrderV3793(b)));

  groups.sort((a,b)=>{
    const bySeason = String(b.season || b.label || "").localeCompare(String(a.season || a.label || ""));
    if(bySeason) return bySeason;
    if(a.source !== b.source) return a.source === "career" ? -1 : 1;
    return 0;
  });

  if(!window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790 && groups.length){
    window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790 = groups[0].key;
  }
  return groups;
}

var FL_selectedTop11GroupV3793 = function FL_selectedTop11GroupV3793(){
  const groups = FL_top11UnifiedGroupsV3793();
  if(!groups.length) return null;
  return groups.find(g=>g.key === window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790) || groups[0];
}

var FL_initialsV3793 = function FL_initialsV3793(name){
  if(typeof FL_initialsV3790 === "function") return FL_initialsV3790(name);
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
}

var FL_functionGroupV3793 = function FL_functionGroupV3793(row){
  const origem = String(row.posicao_origem || "").toUpperCase();
  const pos = String(row.posicao_tatica || "").toUpperCase();
  if(["GL","GOL","GK"].includes(origem) || ["GOL","GK"].includes(pos)) return "GOL";
  if(["DEF","DEF2","DEF3","DEF4","LE","LD","ZAG","CB","LB","RB"].includes(origem) || ["LE","LD","ZAG","CB","LB","RB"].includes(pos)) return "DEF";
  if(["MEI","MEI5","MEI6","VOL","MC","MEI","CAM","CDM","CM"].includes(origem) || ["VOL","MC","MEI","CAM","CDM","CM"].includes(pos)) return "MEI";
  if(["ATA","ATA7","ATA8","PE","PD","CA","LW","RW","ST"].includes(origem) || ["PE","PD","CA","LW","RW","ST"].includes(pos)) return "ATA";
  return "TOTAL";
}

var FL_renderTop11UnifiedV3793 = function FL_renderTop11UnifiedV3793(){
  const page = document.getElementById("top11");
  if(!page) return;

  const groups = FL_top11UnifiedGroupsV3793();
  const group = FL_selectedTop11GroupV3793();
  const rows = group ? [...group.rows].sort((a,b)=>FL_positionOrderV3793(a)-FL_positionOrderV3793(b)) : [];
  const canEdit = !!group?.editable;
  const isEditing = canEdit && typeof FL_TOP11_EDITING_V3787 !== "undefined" && FL_TOP11_EDITING_V3787;

  const playerHtml = rows.map((r,i)=>{
    const coords = FL_positionCoordsV3793(r,i);
    const name = r.jogador || "Jogador";
    const pos = coords.display || r.posicao_tatica || r.posicao_origem || "";
    const foto = r.foto_url || "";

    return `
      <div class="top11-player-v3787 top11-player-v3790 ${isEditing ? "editing" : ""}"
           data-id="${FL_escapeAttrV3793(r.id || "")}"
           data-player="${FL_escapeAttrV3793(name)}"
           data-source="${FL_escapeAttrV3793(group.source)}"
           style="left:${coords.x}%; top:${coords.y}%;">
        <div class="top11-photo-v3787 top11-photo-v3790">
          ${foto ? `<img src="${FL_escapeAttrV3793(foto)}" onerror="this.parentElement.innerHTML='${FL_escapeV3793(FL_initialsV3793(name))}'">` : FL_escapeV3793(FL_initialsV3793(name))}
        </div>
        <div class="top11-info-v3787 top11-info-v3790">
          <b>${FL_escapeV3793(name)}</b>
          <span>${FL_escapeV3793(pos)}</span>
        </div>
      </div>
    `;
  }).join("");

  const missingWarning = rows.length && rows.length < 11
    ? `<div class="top11-warning-v3793">Atenção: este Top 11 tem ${rows.length}/11 jogadores lidos da planilha.</div>`
    : "";

  page.innerHTML = `
    <div class="top11-page-head-v3787 top11-page-head-v3790">
      <div>
        <h2>Top 11</h2>
        <p>Histórico e carreira em um único seletor.</p>
        <small>${rows.length}/11 jogadores neste Top 11.</small>
      </div>
      <div class="top11-head-actions-v3787">
        ${groups.length ? `
          <select onchange="window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790=this.value; if(typeof FL_TOP11_EDITING_V3787!=='undefined') FL_TOP11_EDITING_V3787=false; FL_renderTop11UnifiedV3793();">
            ${groups.map(g=>`
              <option value="${FL_escapeAttrV3793(g.key)}" ${g.key === group?.key ? "selected" : ""}>
                ${FL_escapeV3793(g.label)} · ${FL_escapeV3793(g.sourceLabel)}
              </option>
            `).join("")}
          </select>
        ` : ""}
        <button type="button" class="ghost" onclick="document.getElementById('top11-melhores-v3790')?.scrollIntoView({behavior:'smooth',block:'start'});">Melhores</button>
        ${canEdit ? `<button type="button" class="ghost" onclick="FL_toggleTop11EditV3790()">${isEditing ? "Cancelar edição" : "Editar Top 11"}</button>` : ""}
        <button type="button" class="gold" onclick="FL_openCreateTop11V3790()">+ Top 11</button>
      </div>
    </div>

    ${missingWarning}

    <section class="top11-map-section-v3787">
      <div class="top11-map-toolbar-v3787">
        <strong>Top 11 ${FL_escapeV3793(group?.label || "")}</strong>
        <span>${FL_escapeV3793(group?.sourceLabel || "")}</span>
        ${isEditing ? `<button type="button" class="gold" onclick="FL_saveTop11PositionsV3790()">Salvar posições deste Top 11</button>` : ""}
      </div>

      <div class="top11-pitch-v3787 top11-pitch-v3790"
           style="background-image:linear-gradient(rgba(2,6,23,.08),rgba(2,6,23,.18)),url('${FL_escapeAttrV3793(FL_top11FixedBgV3793())}')">
        ${rows.length ? playerHtml : `
          <button type="button" class="top11-create-card-v3787" onclick="FL_openCreateTop11V3790()">
            <b>+</b>
            <span>Criar Top 11</span>
          </button>
        `}
      </div>
    </section>

    <section id="top11-melhores-v3790" class="top11-best-section-v3790 top11-best-section-v3793">
      ${FL_renderTop11BestInnerV3793()}
    </section>
  `;

  if(isEditing && typeof FL_enableTop11DragV3787 === "function") FL_enableTop11DragV3787();
  if(typeof FL_enrichTop11PhotosV3790 === "function") FL_enrichTop11PhotosV3790();
  if(typeof FL_enrichTop11BestPhotosV3790 === "function") FL_enrichTop11BestPhotosV3790();
}

var FL_top11AppearancesV3793 = function FL_top11AppearancesV3793(){
  const rows = [
    ...FL_top11BaseRowsV3793().map(r=>Object.assign({__source:"base"}, r)),
    ...FL_top11CareerRowsV3793().map(r=>Object.assign({__source:"career"}, r))
  ];

  const filter = window.FL_TOP11_APPEARANCE_FILTER_V3790 || "TOTAL";
  const map = new Map();

  rows.forEach(r=>{
    const func = FL_functionGroupV3793(r);
    if(filter !== "TOTAL" && func !== filter) return;

    const name = String(r.jogador || "").trim();
    if(!name) return;

    const key = FL_normV3793(name);
    if(!map.has(key)) map.set(key,{jogador:name,total:0,base:0,carreira:0,funcoes:new Set(),anos:[]});

    const item = map.get(key);
    item.total++;
    if(r.__source === "career") item.carreira++;
    else item.base++;
    item.funcoes.add(func);

    const year = r.ano || r.temporada || "";
    if(year && !item.anos.includes(year)) item.anos.push(year);
  });

  return [...map.values()]
    .map(i=>Object.assign({}, i, {funcoes:[...i.funcoes].filter(Boolean)}))
    .sort((a,b)=>b.total-a.total || b.carreira-a.carreira || a.jogador.localeCompare(b.jogador));
}

var FL_renderTop11BestInnerV3793 = function FL_renderTop11BestInnerV3793(){
  const rows = FL_top11AppearancesV3793().slice(0,50);
  const filters = [
    ["TOTAL","Total"],
    ["GOL","Goleiros"],
    ["DEF","Defesa"],
    ["MEI","Meio"],
    ["ATA","Ataque"]
  ];

  return `
    <div class="top11-best-head-v3790 top11-best-head-v3793">
      <div>
        <h2>Melhores</h2>
        <p>Jogadores com mais aparições em Top 11.</p>
      </div>
      <div class="top11-best-tabs-v3790">
        ${filters.map(([id,label])=>`
          <button type="button" class="${(window.FL_TOP11_APPEARANCE_FILTER_V3790||"TOTAL")===id ? "active" : ""}" onclick="window.FL_TOP11_APPEARANCE_FILTER_V3790='${id}'; FL_updateTop11BestV3793();">${label}</button>
        `).join("")}
      </div>
    </div>

    <div class="top11-best-list-v3793">
      ${rows.map((r,idx)=>`
        <article class="top11-best-card-v3793">
          <span class="rank">${idx+1}</span>
          <div class="avatar" data-top11-best-photo="${FL_escapeAttrV3793(r.jogador)}">${FL_escapeV3793(FL_initialsV3793(r.jogador))}</div>
          <div class="info">
            <div class="name-line">
              <strong>${FL_escapeV3793(r.jogador)}</strong>
              <b>${r.total}x</b>
            </div>
            <small>${FL_escapeV3793(r.funcoes.join(" / ") || "-")} • ${r.base} base • ${r.carreira} carreira</small>
            <em>${FL_escapeV3793(r.anos.slice(0,8).join(" • "))}${r.anos.length>8 ? "..." : ""}</em>
          </div>
        </article>
      `).join("") || `<div class="top11-base-empty-v3789"><b>Sem dados.</b><span>Cadastre ou cole dados no TOP11_BASE.</span></div>`}
    </div>
  `;
}

var FL_updateTop11BestV3793 = function FL_updateTop11BestV3793(){
  const el = document.getElementById("top11-melhores-v3790");
  if(!el) return;
  el.innerHTML = FL_renderTop11BestInnerV3793();
  if(typeof FL_enrichTop11BestPhotosV3790 === "function") FL_enrichTop11BestPhotosV3790();
}

// Remove X solto perdido, mas não apaga botões de fechar modais reais.
var FL_removeLostFloatingXV3793 = function FL_removeLostFloatingXV3793(){
  document.querySelectorAll("button, .delete-career-item-x-v3769, .remove-season-x-v3793").forEach(el=>{
    const txt = (el.textContent || "").trim();
    const rect = el.getBoundingClientRect();

    const isFloatingTopRight = rect.top >= 0 && rect.top < 80 && rect.right > window.innerWidth - 90;
    const isRedRound = getComputedStyle(el).borderRadius.includes("999") || getComputedStyle(el).borderRadius.includes("50");

    if((txt === "×" || txt === "x" || txt === "X") && isFloatingTopRight && isRedRound && !el.closest(".modal,.fl-top11-modal-v3787,.fl-ballon-best-modal-v3783")){
      el.remove();
    }
  });
}

// Restaura X nas temporadas jogadas, só dentro de cards que têm "Editar temporada".
var FL_restoreSeasonDeleteXV3793 = function FL_restoreSeasonDeleteXV3793(){
  const currentPage = document.body.dataset.currentPage || "";
  if(currentPage && currentPage !== "dashboard" && currentPage !== "resumo") return;

  const buttons = [...document.querySelectorAll("button")].filter(b=>/editar temporada/i.test(b.textContent || ""));

  buttons.forEach(btn=>{
    const card = btn.closest("article, .season-card, .career-season-card, .played-season-card, .season-row-card, .card, .row");
    if(!card || card.querySelector(".season-delete-x-v3793")) return;

    const oldPos = getComputedStyle(card).position;
    if(oldPos === "static") card.style.position = "relative";

    const x = document.createElement("button");
    x.type = "button";
    x.className = "season-delete-x-v3793";
    x.textContent = "×";
    x.title = "Excluir temporada";

    // Tenta reaproveitar um id/data se existir no card.
    const possibleId =
      card.dataset?.id ||
      card.dataset?.seasonId ||
      btn.dataset?.id ||
      btn.dataset?.seasonId ||
      "";

    x.onclick = async (e)=>{
      e.preventDefault();
      e.stopPropagation();

      if(!confirm("Excluir esta temporada?")) return;

      if(typeof deleteCareerSeasonV3769 === "function" && possibleId){
        return deleteCareerSeasonV3769(possibleId);
      }

      if(typeof deleteSeasonFullV3770 === "function" && possibleId){
        return deleteSeasonFullV3770(possibleId);
      }

      setStatus("Não consegui identificar o ID desta temporada para excluir.", "error");
    };

    card.appendChild(x);
  });
}

// Overrides finais.
window.FL_top11BaseRowsV3790 = FL_top11BaseRowsV3793;
window.FL_top11UnifiedGroupsV3790 = FL_top11UnifiedGroupsV3793;
window.FL_selectedTop11GroupV3790 = FL_selectedTop11GroupV3793;
window.FL_positionCoordsV3790 = FL_positionCoordsV3793;
window.FL_top11AppearancesV3790 = FL_top11AppearancesV3793;
window.FL_renderTop11BestInnerV3790 = FL_renderTop11BestInnerV3793;
window.FL_updateTop11BestV3790 = FL_updateTop11BestV3793;
window.FL_renderTop11UnifiedV3790 = FL_renderTop11UnifiedV3793;

renderTop11 = FL_renderTop11UnifiedV3793;
window.renderTop11 = FL_renderTop11UnifiedV3793;
window.FL_renderTop11UnifiedV3793 = FL_renderTop11UnifiedV3793;
window.FL_updateTop11BestV3793 = FL_updateTop11BestV3793;

const __renderAllOriginalV3793 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3793 && !window.__renderAllV3793Wrapped){
  window.__renderAllV3793Wrapped = true;
  renderAll = function(){
    const result = __renderAllOriginalV3793.apply(this, arguments);
    setTimeout(()=>{
      FL_removeLostFloatingXV3793();
      FL_restoreSeasonDeleteXV3793();
    }, 250);
    setTimeout(FL_removeLostFloatingXV3793, 900);
    return result;
  };
}

document.addEventListener("click", ()=>{
  setTimeout(()=>{
    FL_removeLostFloatingXV3793();
    FL_restoreSeasonDeleteXV3793();
  }, 250);
}, true);

setTimeout(()=>{FL_removeLostFloatingXV3793(); FL_restoreSeasonDeleteXV3793();}, 700);
setTimeout(()=>{FL_removeLostFloatingXV3793(); FL_restoreSeasonDeleteXV3793();}, 1800);


// ===== V3.7.94 TOP11 — POSIÇÕES GENÉRICAS + REMOVER X PERDIDO =====
// Corrige a sua TOP11_BASE atual, onde posicao_origem está como:
// GOL, DEF, DEF, DEF, DEF, MEI, MEI, MEI, ATA, ATA, ATA
// Em vez de DEF2/DEF3/ATA7/ATA8.
// Agora o dashboard usa a ordem da linha dentro do ano para posicionar os 11.

var FL_normV3794 = function FL_normV3794(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

var FL_escapeV3794 = function FL_escapeV3794(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3794 = function FL_escapeAttrV3794(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

var FL_top11FixedBgV3794 = function FL_top11FixedBgV3794(){
  return "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg";
}

var FL_pickV3794 = function FL_pickV3794(row, keys){
  for(const k of keys){
    if(row && row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  const normalized = {};
  Object.keys(row || {}).forEach(k => normalized[FL_normV3794(k)] = row[k]);
  for(const k of keys){
    const nk = FL_normV3794(k);
    if(normalized[nk] !== undefined && normalized[nk] !== null && normalized[nk] !== "") return normalized[nk];
  }
  return "";
}

// Slots corretos no campo deitado, por ordem dentro de cada temporada.
var FL_top11SlotsV3794 = function FL_top11SlotsV3794(){
  return [
    {orig:"GOL", pos:"GOL", x:8,  y:50},

    {orig:"DEF", pos:"LE",  x:22, y:20},
    {orig:"DEF", pos:"ZAG", x:27, y:38},
    {orig:"DEF", pos:"ZAG", x:27, y:62},
    {orig:"DEF", pos:"LD",  x:22, y:80},

    {orig:"MEI", pos:"MEI", x:52, y:28},
    {orig:"MEI", pos:"MEI", x:52, y:50},
    {orig:"MEI", pos:"MEI", x:52, y:72},

    {orig:"ATA", pos:"PE",  x:78, y:28},
    {orig:"ATA", pos:"CA",  x:84, y:50},
    {orig:"ATA", pos:"PD",  x:78, y:72}
  ];
}

// Lê TOP11_BASE de forma robusta e redistribui pelos 11 slots por ordem de cada ano.
var FL_top11BaseRowsV3794 = function FL_top11BaseRowsV3794(){
  const raw = getTable("TOP11_BASE") || [];
  if(!raw.length) return [];

  // Se vier no formato largo, converte direto.
  const wideRows = raw.filter(r=>{
    const ano = FL_pickV3794(r, ["ANO","ano","Ano"]);
    return ano && (FL_pickV3794(r, ["GL"]) || FL_pickV3794(r, ["DEF"]) || FL_pickV3794(r, ["ATA8"]));
  });

  if(wideRows.length){
    const wideMap = [
      ["GL","GOL"],
      ["DEF","LE"],
      ["DEF2","ZAG"],
      ["DEF3","ZAG"],
      ["DEF4","LD"],
      ["MEI","MEI"],
      ["MEI5","MEI"],
      ["MEI6","MEI"],
      ["ATA","PE"],
      ["ATA7","CA"],
      ["ATA8","PD"]
    ];

    const out = [];
    let id = 1;

    wideRows.forEach(w=>{
      const ano = FL_pickV3794(w, ["ANO","ano","Ano"]);
      const slots = FL_top11SlotsV3794();

      wideMap.forEach(([col,pos], idx)=>{
        const jogador = FL_pickV3794(w, [col]);
        if(!jogador) return;
        const s = slots[idx];
        out.push({
          id:id++,
          ano,
          posicao_origem:s.orig,
          posicao_tatica:pos || s.pos,
          jogador,
          x:s.x,
          y:s.y,
          mapa_url:FL_top11FixedBgV3794(),
          __top11Source:"base",
          __slotIndex:idx
        });
      });
    });

    return out;
  }

  // Formato vertical: agrupa por ano e usa a ordem da linha dentro do ano.
  const rows = raw.map((r, globalIdx)=>({
    id: FL_pickV3794(r, ["id","ID"]) || globalIdx + 1,
    ano: FL_pickV3794(r, ["ano","ANO","Ano","temporada","TEMPORADA"]),
    posicao_origem: String(FL_pickV3794(r, ["posicao_origem","POSICAO_ORIGEM","posição_origem","origem"]) || "").toUpperCase(),
    posicao_tatica: String(FL_pickV3794(r, ["posicao_tatica","POSICAO_TATICA","posição_tatica","posicao","POSICAO"]) || "").toUpperCase(),
    jogador: FL_pickV3794(r, ["jogador","JOGADOR","player","PLAYER"]),
    raw_x: FL_pickV3794(r, ["x","X"]),
    raw_y: FL_pickV3794(r, ["y","Y"]),
    mapa_url: FL_pickV3794(r, ["mapa_url","MAPA_URL"]) || FL_top11FixedBgV3794(),
    __top11Source:"base",
    __globalIndex:globalIdx
  })).filter(r=>r.ano && r.jogador);

  const byYear = new Map();
  rows.forEach(r=>{
    if(!byYear.has(String(r.ano))) byYear.set(String(r.ano), []);
    byYear.get(String(r.ano)).push(r);
  });

  const out = [];
  const slots = FL_top11SlotsV3794();

  [...byYear.entries()].forEach(([ano, yearRows])=>{
    yearRows.sort((a,b)=>Number(a.id || 0)-Number(b.id || 0) || a.__globalIndex-b.__globalIndex);

    yearRows.forEach((r, idx)=>{
      const s = slots[idx] || slots[slots.length-1];

      // Se o dado veio genérico, força pelo slot.
      const generic = ["GOL","DEF","MEI","ATA",""].includes(r.posicao_origem);
      const forceSlot = generic || idx < 11;

      out.push(Object.assign({}, r, {
        posicao_origem: forceSlot ? s.orig : r.posicao_origem,
        posicao_tatica: forceSlot ? s.pos : (r.posicao_tatica || s.pos),
        x: forceSlot ? s.x : (r.raw_x || s.x),
        y: forceSlot ? s.y : (r.raw_y || s.y),
        __slotIndex: idx
      }));
    });
  });

  return out;
}

var FL_positionOrderV3794 = function FL_positionOrderV3794(row){
  if(row.__slotIndex !== undefined) return Number(row.__slotIndex);
  const order = ["GL","GOL","DEF","DEF2","DEF3","DEF4","MEI","MEI5","MEI6","ATA","ATA7","ATA8"];
  const origem = String(row.posicao_origem || "").toUpperCase();
  const idx = order.indexOf(origem);
  return idx >= 0 ? idx : Number(row.id || 9999);
}

var FL_positionCoordsV3794 = function FL_positionCoordsV3794(row, idx){
  if(row.__top11Source === "base"){
    const s = FL_top11SlotsV3794()[row.__slotIndex ?? idx] || FL_top11SlotsV3794()[idx] || {x:50,y:50,pos:row.posicao_tatica || "POS"};
    return {x:s.x, y:s.y, display:row.posicao_tatica || s.pos};
  }

  if(row.__top11Source === "career" && row.x !== undefined && row.x !== "" && row.y !== undefined && row.y !== ""){
    return {x:Number(row.x), y:Number(row.y), display:row.posicao_tatica || ""};
  }

  const s = FL_top11SlotsV3794()[idx] || {x:50,y:50,pos:row.posicao_tatica || "POS"};
  return {x:s.x, y:s.y, display:row.posicao_tatica || s.pos};
}

var FL_top11CareerRowsV3794 = function FL_top11CareerRowsV3794(){
  const carreiraId = active?.carreira_id || "";
  return (getTable("TOP11_CARREIRA") || []).filter(r => !carreiraId || String(r.carreira_id || "") === String(carreiraId));
}

var FL_top11UnifiedGroupsV3794 = function FL_top11UnifiedGroupsV3794(){
  const groups = [];
  const baseMap = new Map();

  FL_top11BaseRowsV3794().forEach(r=>{
    const ano = r.ano || r.temporada || "";
    if(!ano) return;
    const key = `base:${ano}`;

    if(!baseMap.has(key)){
      baseMap.set(key,{key,label:ano,season:ano,source:"base",sourceLabel:"Base histórica",editable:false,rows:[]});
    }
    baseMap.get(key).rows.push(r);
  });

  const careerMap = new Map();
  FL_top11CareerRowsV3794().forEach(r=>{
    const sid = r.carreira_temporada_id || "";
    const temp = r.temporada || "";
    const key = sid ? `career:${sid}` : `career:${temp || "sem-temporada"}`;

    if(!careerMap.has(key)){
      careerMap.set(key,{key,label:temp || "Top 11 carreira",season:temp,carreira_temporada_id:sid,source:"career",sourceLabel:"Carreira",editable:true,rows:[]});
    }
    careerMap.get(key).rows.push(Object.assign({__top11Source:"career"}, r));
  });

  groups.push(...baseMap.values(), ...careerMap.values());

  groups.forEach(g=>{
    g.rows = [...g.rows].sort((a,b)=>FL_positionOrderV3794(a)-FL_positionOrderV3794(b));
  });

  groups.sort((a,b)=>{
    const bySeason = String(b.season || b.label || "").localeCompare(String(a.season || a.label || ""));
    if(bySeason) return bySeason;
    if(a.source !== b.source) return a.source === "career" ? -1 : 1;
    return 0;
  });

  if(!window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790 && groups.length){
    window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790 = groups[0].key;
  }
  return groups;
}

var FL_selectedTop11GroupV3794 = function FL_selectedTop11GroupV3794(){
  const groups = FL_top11UnifiedGroupsV3794();
  if(!groups.length) return null;
  return groups.find(g=>g.key === window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790) || groups[0];
}

var FL_initialsV3794 = function FL_initialsV3794(name){
  if(typeof FL_initialsV3790 === "function") return FL_initialsV3790(name);
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
}

var FL_functionGroupV3794 = function FL_functionGroupV3794(row){
  const pos = String(row.posicao_tatica || "").toUpperCase();
  if(["GOL","GK"].includes(pos)) return "GOL";
  if(["LE","LD","ZAG","CB","LB","RB"].includes(pos)) return "DEF";
  if(["VOL","MC","MEI","CAM","CDM","CM"].includes(pos)) return "MEI";
  if(["PE","PD","CA","LW","RW","ST"].includes(pos)) return "ATA";
  return "TOTAL";
}

var FL_top11AppearancesV3794 = function FL_top11AppearancesV3794(){
  const rows = [
    ...FL_top11BaseRowsV3794().map(r=>Object.assign({__source:"base"}, r)),
    ...FL_top11CareerRowsV3794().map(r=>Object.assign({__source:"career"}, r))
  ];

  const filter = window.FL_TOP11_APPEARANCE_FILTER_V3790 || "TOTAL";
  const map = new Map();

  rows.forEach(r=>{
    const func = FL_functionGroupV3794(r);
    if(filter !== "TOTAL" && func !== filter) return;

    const name = String(r.jogador || "").trim();
    if(!name) return;

    const key = FL_normV3794(name);
    if(!map.has(key)) map.set(key,{jogador:name,total:0,base:0,carreira:0,funcoes:new Set(),anos:[]});

    const item = map.get(key);
    item.total++;
    if(r.__source === "career") item.carreira++;
    else item.base++;
    item.funcoes.add(func);

    const year = r.ano || r.temporada || "";
    if(year && !item.anos.includes(year)) item.anos.push(year);
  });

  return [...map.values()]
    .map(i=>Object.assign({}, i, {funcoes:[...i.funcoes].filter(Boolean)}))
    .sort((a,b)=>b.total-a.total || b.carreira-a.carreira || a.jogador.localeCompare(b.jogador));
}

var FL_renderTop11BestInnerV3794 = function FL_renderTop11BestInnerV3794(){
  const rows = FL_top11AppearancesV3794().slice(0,50);
  const filters = [["TOTAL","Total"],["GOL","Goleiros"],["DEF","Defesa"],["MEI","Meio"],["ATA","Ataque"]];

  return `
    <div class="top11-best-head-v3790 top11-best-head-v3793">
      <div>
        <h2>Melhores</h2>
        <p>Jogadores com mais aparições em Top 11.</p>
      </div>
      <div class="top11-best-tabs-v3790">
        ${filters.map(([id,label])=>`
          <button type="button" class="${(window.FL_TOP11_APPEARANCE_FILTER_V3790||"TOTAL")===id ? "active" : ""}" onclick="window.FL_TOP11_APPEARANCE_FILTER_V3790='${id}'; FL_updateTop11BestV3794();">${label}</button>
        `).join("")}
      </div>
    </div>

    <div class="top11-best-list-v3793">
      ${rows.map((r,idx)=>`
        <article class="top11-best-card-v3793">
          <span class="rank">${idx+1}</span>
          <div class="avatar" data-top11-best-photo="${FL_escapeAttrV3794(r.jogador)}">${FL_escapeV3794(FL_initialsV3794(r.jogador))}</div>
          <div class="info">
            <div class="name-line">
              <strong>${FL_escapeV3794(r.jogador)}</strong>
              <b>${r.total}x</b>
            </div>
            <small>${FL_escapeV3794(r.funcoes.join(" / ") || "-")} • ${r.base} base • ${r.carreira} carreira</small>
            <em>${FL_escapeV3794(r.anos.slice(0,8).join(" • "))}${r.anos.length>8 ? "..." : ""}</em>
          </div>
        </article>
      `).join("") || `<div class="top11-base-empty-v3789"><b>Sem dados.</b><span>Cadastre ou cole dados no TOP11_BASE.</span></div>`}
    </div>
  `;
}

var FL_updateTop11BestV3794 = function FL_updateTop11BestV3794(){
  const el = document.getElementById("top11-melhores-v3790");
  if(!el) return;
  el.innerHTML = FL_renderTop11BestInnerV3794();
  if(typeof FL_enrichTop11BestPhotosV3790 === "function") FL_enrichTop11BestPhotosV3790();
}

var FL_renderTop11UnifiedV3794 = function FL_renderTop11UnifiedV3794(){
  const page = document.getElementById("top11");
  if(!page) return;

  const groups = FL_top11UnifiedGroupsV3794();
  const group = FL_selectedTop11GroupV3794();
  const rows = group ? [...group.rows].sort((a,b)=>FL_positionOrderV3794(a)-FL_positionOrderV3794(b)) : [];
  const canEdit = !!group?.editable;
  const isEditing = canEdit && typeof FL_TOP11_EDITING_V3787 !== "undefined" && FL_TOP11_EDITING_V3787;

  const playerHtml = rows.map((r,i)=>{
    const coords = FL_positionCoordsV3794(r,i);
    const name = r.jogador || "Jogador";
    const pos = coords.display || r.posicao_tatica || r.posicao_origem || "";
    const foto = r.foto_url || "";

    return `
      <div class="top11-player-v3787 top11-player-v3790 ${isEditing ? "editing" : ""}"
           data-id="${FL_escapeAttrV3794(r.id || "")}"
           data-player="${FL_escapeAttrV3794(name)}"
           data-source="${FL_escapeAttrV3794(group.source)}"
           style="left:${coords.x}%; top:${coords.y}%;">
        <div class="top11-photo-v3787 top11-photo-v3790">
          ${foto ? `<img src="${FL_escapeAttrV3794(foto)}" onerror="this.parentElement.innerHTML='${FL_escapeV3794(FL_initialsV3794(name))}'">` : FL_escapeV3794(FL_initialsV3794(name))}
        </div>
        <div class="top11-info-v3787 top11-info-v3790">
          <b>${FL_escapeV3794(name)}</b>
          <span>${FL_escapeV3794(pos)}</span>
        </div>
      </div>
    `;
  }).join("");

  const missingWarning = rows.length && rows.length < 11
    ? `<div class="top11-warning-v3793">Atenção: este Top 11 tem ${rows.length}/11 jogadores lidos da planilha. Confira se a temporada tem 11 linhas na TOP11_BASE.</div>`
    : "";

  page.innerHTML = `
    <div class="top11-page-head-v3787 top11-page-head-v3790">
      <div>
        <h2>Top 11</h2>
        <p>Histórico e carreira em um único seletor.</p>
        <small>${rows.length}/11 jogadores neste Top 11.</small>
      </div>
      <div class="top11-head-actions-v3787">
        ${groups.length ? `
          <select onchange="window.FL_TOP11_SELECTED_UNIFIED_KEY_V3790=this.value; if(typeof FL_TOP11_EDITING_V3787!=='undefined') FL_TOP11_EDITING_V3787=false; FL_renderTop11UnifiedV3794();">
            ${groups.map(g=>`
              <option value="${FL_escapeAttrV3794(g.key)}" ${g.key === group?.key ? "selected" : ""}>
                ${FL_escapeV3794(g.label)} · ${FL_escapeV3794(g.sourceLabel)}
              </option>
            `).join("")}
          </select>
        ` : ""}
        <button type="button" class="ghost" onclick="document.getElementById('top11-melhores-v3790')?.scrollIntoView({behavior:'smooth',block:'start'});">Melhores</button>
        ${canEdit ? `<button type="button" class="ghost" onclick="FL_toggleTop11EditV3790()">${isEditing ? "Cancelar edição" : "Editar Top 11"}</button>` : ""}
        <button type="button" class="gold" onclick="FL_openCreateTop11V3790()">+ Top 11</button>
      </div>
    </div>

    ${missingWarning}

    <section class="top11-map-section-v3787">
      <div class="top11-map-toolbar-v3787">
        <strong>Top 11 ${FL_escapeV3794(group?.label || "")}</strong>
        <span>${FL_escapeV3794(group?.sourceLabel || "")}</span>
        ${isEditing ? `<button type="button" class="gold" onclick="FL_saveTop11PositionsV3790()">Salvar posições deste Top 11</button>` : ""}
      </div>

      <div class="top11-pitch-v3787 top11-pitch-v3790"
           style="background-image:linear-gradient(rgba(2,6,23,.08),rgba(2,6,23,.18)),url('${FL_escapeAttrV3794(FL_top11FixedBgV3794())}')">
        ${rows.length ? playerHtml : `
          <button type="button" class="top11-create-card-v3787" onclick="FL_openCreateTop11V3790()">
            <b>+</b>
            <span>Criar Top 11</span>
          </button>
        `}
      </div>
    </section>

    <section id="top11-melhores-v3790" class="top11-best-section-v3790 top11-best-section-v3793">
      ${FL_renderTop11BestInnerV3794()}
    </section>
  `;

  if(isEditing && typeof FL_enableTop11DragV3787 === "function") FL_enableTop11DragV3787();
  if(typeof FL_enrichTop11PhotosV3790 === "function") FL_enrichTop11PhotosV3790();
  if(typeof FL_enrichTop11BestPhotosV3790 === "function") FL_enrichTop11BestPhotosV3790();
}

// Remove o X vermelho perdido no topo do resumo sem depender da classe.
var FL_removeLostTopRightXV3794 = function FL_removeLostTopRightXV3794(){
  const all = [...document.querySelectorAll("button,div,span,a")];

  all.forEach(el=>{
    const txt = (el.textContent || "").trim();
    if(!["×","x","X"].includes(txt)) return;

    const rect = el.getBoundingClientRect();
    if(!rect.width || !rect.height) return;

    const style = getComputedStyle(el);
    const bg = style.backgroundColor || "";
    const cls = String(el.className || "");

    const nearTopRight =
      rect.top >= -5 &&
      rect.top < 100 &&
      rect.right > window.innerWidth - 120;

    const looksRed =
      bg.includes("127") ||
      bg.includes("185") ||
      bg.includes("220") ||
      bg.includes("239") ||
      bg.includes("248") ||
      /red|danger|delete|remove|x-v37|season-delete/i.test(cls);

    const isModalClose = !!el.closest(".modal,.fl-top11-modal-v3787,.fl-ballon-best-modal-v3783,.fl-top11-modal-v3788");
    const isInsideSeason = !!el.closest(".season-card,.career-season-card,.played-season-card,.season-row-card");

    if(nearTopRight && looksRed && !isModalClose && !isInsideSeason){
      el.remove();
    }
  });
}

// Overrides definitivos.
window.FL_top11BaseRowsV3790 = FL_top11BaseRowsV3794;
window.FL_top11BaseRowsV3792 = FL_top11BaseRowsV3794;
window.FL_top11BaseRowsV3793 = FL_top11BaseRowsV3794;
window.FL_top11UnifiedGroupsV3790 = FL_top11UnifiedGroupsV3794;
window.FL_top11UnifiedGroupsV3792 = FL_top11UnifiedGroupsV3794;
window.FL_top11UnifiedGroupsV3793 = FL_top11UnifiedGroupsV3794;
window.FL_selectedTop11GroupV3790 = FL_selectedTop11GroupV3794;
window.FL_positionCoordsV3790 = FL_positionCoordsV3794;
window.FL_positionCoordsV3792 = FL_positionCoordsV3794;
window.FL_positionCoordsV3793 = FL_positionCoordsV3794;
window.FL_top11AppearancesV3790 = FL_top11AppearancesV3794;
window.FL_renderTop11BestInnerV3790 = FL_renderTop11BestInnerV3794;
window.FL_updateTop11BestV3790 = FL_updateTop11BestV3794;
window.FL_updateTop11BestV3793 = FL_updateTop11BestV3794;
window.FL_renderTop11UnifiedV3790 = FL_renderTop11UnifiedV3794;
window.FL_renderTop11UnifiedV3792 = FL_renderTop11UnifiedV3794;
window.FL_renderTop11UnifiedV3793 = FL_renderTop11UnifiedV3794;

renderTop11 = FL_renderTop11UnifiedV3794;
window.renderTop11 = FL_renderTop11UnifiedV3794;
window.FL_renderTop11UnifiedV3794 = FL_renderTop11UnifiedV3794;
window.FL_updateTop11BestV3794 = FL_updateTop11BestV3794;
window.FL_removeLostTopRightXV3794 = FL_removeLostTopRightXV3794;

const __renderAllOriginalV3794 = typeof renderAll === "function" ? renderAll : null;
if(__renderAllOriginalV3794 && !window.__renderAllV3794Wrapped){
  window.__renderAllV3794Wrapped = true;
  renderAll = function(){
    const result = __renderAllOriginalV3794.apply(this, arguments);
    setTimeout(FL_removeLostTopRightXV3794, 150);
    setTimeout(FL_removeLostTopRightXV3794, 700);
    setTimeout(FL_removeLostTopRightXV3794, 1600);
    return result;
  };
}

document.addEventListener("click", ()=>{
  setTimeout(FL_removeLostTopRightXV3794, 200);
}, true);

setTimeout(FL_removeLostTopRightXV3794, 300);
setTimeout(FL_removeLostTopRightXV3794, 1200);
setTimeout(FL_removeLostTopRightXV3794, 2500);


// ===== V3.7.95 TOP11 — JOGADOR CRIADO + FOTO MANUAL =====
// Nova coluna TOP11_CARREIRA:
// criado
//
// Regras:
// criado = SIM / TRUE / 1 / CRIADO
// - Não busca foto por API.
// - Usa apenas foto_url.
// - Se foto_url estiver vazia, mostra iniciais.
// criado vazio ou NÃO
// - Pode buscar foto por API.

var FL_isCreatedPlayerV3795 = function FL_isCreatedPlayerV3795(row){
  const v = String(
    row?.criado ??
    row?.CRIADO ??
    row?.jogador_criado ??
    row?.JOGADOR_CRIADO ??
    row?.created ??
    ""
  ).trim().toLowerCase();

  return ["sim","s","yes","y","true","1","criado","created"].includes(v);
}

var FL_pickV3795 = function FL_pickV3795(row, keys){
  for(const k of keys){
    if(row && row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }

  const norm = {};
  Object.keys(row || {}).forEach(k=>{
    const nk = String(k).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"");
    norm[nk] = row[k];
  });

  for(const k of keys){
    const nk = String(k).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"");
    if(norm[nk] !== undefined && norm[nk] !== null && norm[nk] !== "") return norm[nk];
  }

  return "";
}

var FL_initialsV3795 = function FL_initialsV3795(name){
  if(typeof FL_initialsV3794 === "function") return FL_initialsV3794(name);
  if(typeof FL_initialsV3790 === "function") return FL_initialsV3790(name);

  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
}

var FL_escapeV3795 = function FL_escapeV3795(value){
  return typeof escapeHtml === "function" ? escapeHtml(String(value ?? "")) : String(value ?? "");
}

var FL_escapeAttrV3795 = function FL_escapeAttrV3795(value){
  return typeof escapeAttr === "function" ? escapeAttr(String(value ?? "")) : String(value ?? "").replace(/"/g,"&quot;");
}

// Puxa carreira preservando criado/foto_url.
var FL_top11CareerRowsV3795 = function FL_top11CareerRowsV3795(){
  const carreiraId = active?.carreira_id || "";
  return (getTable("TOP11_CARREIRA") || []).filter(r => !carreiraId || String(r.carreira_id || "") === String(carreiraId));
}

// Se a função de grupo já existe, só reusa; se não, cria fallback.
var FL_top11UnifiedGroupsV3795 = function FL_top11UnifiedGroupsV3795(){
  if(typeof FL_top11UnifiedGroupsV3794 === "function"){
    const groups = FL_top11UnifiedGroupsV3794();

    // Reinjeta dados completos da tabela de carreira, caso função anterior tenha perdido coluna criado.
    const careerRows = FL_top11CareerRowsV3795();
    groups.forEach(g=>{
      if(g.source !== "career") return;

      g.rows = g.rows.map(r=>{
        const full = careerRows.find(x => String(x.id || "") === String(r.id || ""));
        return full ? Object.assign({__top11Source:"career"}, r, full) : r;
      });
    });

    return groups;
  }

  return [];
}

var FL_shouldFetchPhotoV3795 = function FL_shouldFetchPhotoV3795(row){
  if(FL_isCreatedPlayerV3795(row)) return false;
  const foto = FL_pickV3795(row, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]);
  if(foto) return false;
  return true;
}

var FL_photoHtmlV3795 = function FL_photoHtmlV3795(row, name){
  const foto = FL_pickV3795(row, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]);
  if(foto){
    return `<img src="${FL_escapeAttrV3795(foto)}" onerror="this.parentElement.innerHTML='${FL_escapeV3795(FL_initialsV3795(name))}'">`;
  }
  return FL_escapeV3795(FL_initialsV3795(name));
}

// Sobrescreve enriquecimento de fotos para respeitar jogador criado.
var FL_enrichTop11PhotosV3795 = function FL_enrichTop11PhotosV3795(){
  const nodes = [...document.querySelectorAll(".top11-player-v3790,.top11-player-v3787")];
  const allRows = [
    ...(typeof FL_top11BaseRowsV3794 === "function" ? FL_top11BaseRowsV3794() : (getTable("TOP11_BASE") || [])),
    ...FL_top11CareerRowsV3795().map(r=>Object.assign({__top11Source:"career"}, r))
  ];

  nodes.forEach(async node=>{
    const name = node.dataset.player || "";
    const id = node.dataset.id || "";
    const source = node.dataset.source || "";
    const photo = node.querySelector(".top11-photo-v3790,.top11-photo-v3787");

    if(!name || !photo || photo.querySelector("img")) return;

    const row =
      allRows.find(r => id && String(r.id || "") === String(id) && (!source || String(r.__top11Source || r.source || "") === String(source))) ||
      allRows.find(r => String(r.jogador || "").trim().toLowerCase() === String(name).trim().toLowerCase());

    if(row && !FL_shouldFetchPhotoV3795(row)){
      photo.innerHTML = FL_photoHtmlV3795(row, name);
      return;
    }

    if(typeof FL_fetchPlayerPhotoV3790 !== "function") return;

    const img = await FL_fetchPlayerPhotoV3790(name);
    if(!img || !node.isConnected) return;

    photo.innerHTML = `<img src="${FL_escapeAttrV3795(img)}" onerror="this.parentElement.innerHTML='${FL_escapeV3795(FL_initialsV3795(name))}'">`;
  });
}

// Melhorar ranking melhores: criado não busca API se tiver foto manual ou sem foto.
var FL_enrichTop11BestPhotosV3795 = function FL_enrichTop11BestPhotosV3795(){
  const nodes = [...document.querySelectorAll("[data-top11-best-photo]")];
  const allCareer = FL_top11CareerRowsV3795();

  nodes.forEach(async node=>{
    const name = node.dataset.top11BestPhoto || "";
    if(!name || node.querySelector("img")) return;

    const createdRow = allCareer.find(r =>
      String(r.jogador || "").trim().toLowerCase() === String(name).trim().toLowerCase() &&
      FL_isCreatedPlayerV3795(r)
    );

    if(createdRow){
      const foto = FL_pickV3795(createdRow, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]);
      if(foto){
        node.innerHTML = `<img src="${FL_escapeAttrV3795(foto)}" onerror="this.parentElement.innerHTML='${FL_escapeV3795(FL_initialsV3795(name))}'">`;
      }else{
        node.innerHTML = FL_escapeV3795(FL_initialsV3795(name));
      }
      return;
    }

    if(typeof FL_fetchPlayerPhotoV3790 !== "function") return;
    const img = await FL_fetchPlayerPhotoV3790(name);
    if(!img || !node.isConnected) return;

    node.innerHTML = `<img src="${FL_escapeAttrV3795(img)}" onerror="this.parentElement.innerHTML='${FL_escapeV3795(FL_initialsV3795(name))}'">`;
  });
}

// Render final: reaproveita v3.7.94 e depois aplica a regra de foto.
const FL_renderTop11UnifiedOriginalV3795 =
  typeof FL_renderTop11UnifiedV3794 === "function" ? FL_renderTop11UnifiedV3794 :
  typeof FL_renderTop11UnifiedV3793 === "function" ? FL_renderTop11UnifiedV3793 :
  typeof renderTop11 === "function" ? renderTop11 : null;

var FL_renderTop11UnifiedV3795 = function FL_renderTop11UnifiedV3795(){
  if(FL_renderTop11UnifiedOriginalV3795){
    FL_renderTop11UnifiedOriginalV3795();
  }

  setTimeout(()=>{
    FL_enrichTop11PhotosV3795();
    FL_enrichTop11BestPhotosV3795();
  }, 120);
}

// Modal de +Top11: se existir modal antigo, adiciona criado/foto_url manual sem quebrar layout.
const FL_openCreateTop11OriginalV3795 =
  typeof FL_openCreateTop11V3788 === "function" ? FL_openCreateTop11V3788 :
  typeof FL_openCreateTop11V3787 === "function" ? FL_openCreateTop11V3787 :
  null;

var FL_openCreateTop11V3795 = function FL_openCreateTop11V3795(){
  if(FL_openCreateTop11OriginalV3795){
    FL_openCreateTop11OriginalV3795();

    setTimeout(()=>{
      const form = document.getElementById("top11-create-form-v3788") || document.getElementById("top11-create-form-v3787");
      if(!form || form.dataset.criadoV3795 === "1") return;
      form.dataset.criadoV3795 = "1";

      const rows = form.querySelectorAll(".top11-create-row-v3787");
      rows.forEach((row, idx)=>{
        if(row.querySelector(`[name="criado_${idx}"]`)) return;

        const criado = document.createElement("select");
        criado.name = `criado_${idx}`;
        criado.innerHTML = `<option value="">API</option><option value="SIM">Criado</option>`;
        criado.title = "Se for criado, o dashboard não buscará imagem na API.";

        const foto = document.createElement("input");
        foto.name = `foto_url_${idx}`;
        foto.placeholder = "Foto URL manual";
        foto.title = "Use quando jogador for criado.";

        row.appendChild(criado);
        row.appendChild(foto);
      });
    }, 200);
  }
}

// Salvamento novo do Top11 com criado/foto_url.
var FL_saveNewTop11V3795 = async function FL_saveNewTop11V3795(){
  const form = document.getElementById("top11-create-form-v3788") || document.getElementById("top11-create-form-v3787");

  if(!form){
    if(typeof FL_saveNewTop11V3788 === "function") return FL_saveNewTop11V3788();
    return;
  }

  if(window.FL_TOP11_SAVING_V3788) return;

  try{
    window.FL_TOP11_SAVING_V3788 = true;

    const btn = document.getElementById("fl-top11-save-v3788") || document.getElementById("fl-top11-save-v3787");
    if(btn){
      btn.disabled = true;
      btn.textContent = "Salvando...";
    }

    const defaults = typeof FL_defaultTop11PositionsV3788 === "function" ? FL_defaultTop11PositionsV3788() : [
      ["GOL",8,50],["LE",22,20],["ZAG",27,38],["ZAG",27,62],["LD",22,80],["MEI",52,28],["MEI",52,50],["MEI",52,72],["PE",78,28],["CA",84,50],["PD",78,72]
    ];

    const origins = ["GL","DEF","DEF2","DEF3","DEF4","MEI","MEI5","MEI6","ATA","ATA7","ATA8"];

    const temporada = String(form.temporada?.value || "").trim();
    const carreiraTemporadaId = String(form.carreira_temporada_id?.value || "").trim();

    const rows = [];

    for(let i=0;i<11;i++){
      const jogador = String(form[`jogador_${i}`]?.value || "").trim();
      if(!jogador) continue;

      const criado = String(form[`criado_${i}`]?.value || "").trim();
      const fotoUrl = String(form[`foto_url_${i}`]?.value || "").trim();

      rows.push({
        carreira_id: active?.carreira_id || "",
        carreira_temporada_id: carreiraTemporadaId,
        temporada,
        posicao_origem: origins[i] || "",
        posicao_tatica: String(form[`posicao_${i}`]?.value || defaults[i]?.[0] || "").trim(),
        jogador,
        overall: String(form[`overall_${i}`]?.value || "").trim(),
        clube: String(form[`clube_${i}`]?.value || "").trim(),
        pais: String(form[`pais_${i}`]?.value || "").trim(),
        criado,
        foto_url: fotoUrl,
        x: defaults[i]?.[1] ?? "",
        y: defaults[i]?.[2] ?? "",
        mapa_url: "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg"
      });
    }

    if(!rows.length){
      setStatus("Preencha pelo menos um jogador no Top 11.", "error");
      return;
    }

    setStatus("Salvando Top 11...", "loading");

    const result = await apiPost({
      action:"saveTop11CareerV2",
      carreira_id: active?.carreira_id || "",
      carreira_temporada_id: carreiraTemporadaId,
      temporada,
      mapa_url:"https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg",
      replace_existing:true,
      rows
    });

    if(!result || !result.ok){
      throw new Error(result?.error || "Apps Script não confirmou salvamento do Top 11.");
    }

    if(!Array.isArray(db.TOP11_CARREIRA)) db.TOP11_CARREIRA = [];

    db.TOP11_CARREIRA = db.TOP11_CARREIRA.filter(r=>{
      const sameCareer = String(r.carreira_id || "") === String(active?.carreira_id || "");
      const sameSeasonId = carreiraTemporadaId && String(r.carreira_temporada_id || "") === String(carreiraTemporadaId);
      const sameSeason = !carreiraTemporadaId && String(r.temporada || "") === String(temporada);
      return !(sameCareer && (sameSeasonId || sameSeason));
    });

    const saved = result.data?.rows || rows;
    saved.forEach(r=>db.TOP11_CARREIRA.push(r));

    if(typeof FL_closeTop11ModalV3788 === "function") FL_closeTop11ModalV3788();
    else document.getElementById("fl-top11-modal-v3787")?.remove();

    setStatus("Top 11 salvo.", "ok");

    if(typeof FL_renderTop11UnifiedV3795 === "function") FL_renderTop11UnifiedV3795();
  }catch(err){
    console.error(err);
    setStatus("Erro ao salvar Top 11: " + err.message, "error");
  }finally{
    window.FL_TOP11_SAVING_V3788 = false;
    const btn = document.getElementById("fl-top11-save-v3788") || document.getElementById("fl-top11-save-v3787");
    if(btn){
      btn.disabled = false;
      btn.textContent = "Salvar Top 11";
    }
  }
}

// Listener forte para salvar com campos novos.
document.addEventListener("click", function(e){
  const btn = e.target.closest("#fl-top11-save-v3787,#fl-top11-save-v3788,button");
  if(!btn) return;

  if(btn.id === "fl-top11-save-v3787" || btn.id === "fl-top11-save-v3788" || /salvar top 11/i.test(btn.textContent || "")){
    const modal = btn.closest("#fl-top11-modal-v3787,#fl-top11-modal-v3788");
    if(modal){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      FL_saveNewTop11V3795();
    }
  }
}, true);

window.FL_isCreatedPlayerV3795 = FL_isCreatedPlayerV3795;
window.FL_top11CareerRowsV3795 = FL_top11CareerRowsV3795;
window.FL_top11UnifiedGroupsV3794 = FL_top11UnifiedGroupsV3795;
window.FL_enrichTop11PhotosV3790 = FL_enrichTop11PhotosV3795;
window.FL_enrichTop11BestPhotosV3790 = FL_enrichTop11BestPhotosV3795;
window.FL_renderTop11UnifiedV3794 = FL_renderTop11UnifiedV3795;
window.FL_renderTop11UnifiedV3795 = FL_renderTop11UnifiedV3795;
window.FL_openCreateTop11V3790 = FL_openCreateTop11V3795;
window.FL_openCreateTop11V3788 = FL_openCreateTop11V3795;
window.FL_saveNewTop11V3788 = FL_saveNewTop11V3795;
window.FL_saveNewTop11V3795 = FL_saveNewTop11V3795;

renderTop11 = FL_renderTop11UnifiedV3795;
window.renderTop11 = FL_renderTop11UnifiedV3795;


// ===== V3.7.96 — FORÇA TOP 11 NOVO E BLOQUEIA RENDER ANTIGO =====
// Corrige o bug do Top 11 voltar para o campo verde antigo.
// Esta versão renderiza o Top 11 novo diretamente e intercepta renderPageById("top11").

(function(){
  const TOP11_BG_V3796 = "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg";

  var esc = function esc(v){
    if(typeof escapeHtml === "function") return escapeHtml(String(v ?? ""));
    return String(v ?? "").replace(/[&<>"']/g, m=>({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[m]));
  }

  var attr = function attr(v){
    if(typeof escapeAttr === "function") return escapeAttr(String(v ?? ""));
    return String(v ?? "").replace(/"/g,"&quot;");
  }

  var norm = function norm(v){
    return String(v || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"");
  }

  var pick = function pick(row, keys){
    for(const k of keys){
      if(row && row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    const n = {};
    Object.keys(row || {}).forEach(k=>n[norm(k)] = row[k]);
    for(const k of keys){
      const nk = norm(k);
      if(n[nk] !== undefined && n[nk] !== null && n[nk] !== "") return n[nk];
    }
    return "";
  }

  var initials = function initials(name){
    const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
  }

  var slots = function slots(){
    return [
      {orig:"GL",   pos:"GOL", x:8,  y:50},
      {orig:"DEF",  pos:"LE",  x:22, y:20},
      {orig:"DEF2", pos:"ZAG", x:27, y:38},
      {orig:"DEF3", pos:"ZAG", x:27, y:62},
      {orig:"DEF4", pos:"LD",  x:22, y:80},
      {orig:"MEI",  pos:"MEI", x:52, y:28},
      {orig:"MEI5", pos:"MEI", x:52, y:50},
      {orig:"MEI6", pos:"MEI", x:52, y:72},
      {orig:"ATA",  pos:"PE",  x:78, y:28},
      {orig:"ATA7", pos:"CA",  x:84, y:50},
      {orig:"ATA8", pos:"PD",  x:78, y:72}
    ];
  }

  var isCreated = function isCreated(row){
    const v = String(pick(row, ["criado","CRIADO","jogador_criado","created"]) || "").trim().toLowerCase();
    return ["sim","s","yes","y","true","1","criado","created"].includes(v);
  }

  var baseRows = function baseRows(){
    const raw = (typeof getTable === "function" ? getTable("TOP11_BASE") : (window.db?.TOP11_BASE || [])) || [];
    if(!raw.length) return [];

    const wideRows = raw.filter(r=>{
      const ano = pick(r, ["ANO","ano","Ano"]);
      return ano && (pick(r, ["GL"]) || pick(r, ["DEF"]) || pick(r, ["ATA8"]));
    });

    if(wideRows.length){
      const cols = ["GL","DEF","DEF2","DEF3","DEF4","MEI","MEI5","MEI6","ATA","ATA7","ATA8"];
      const out = [];
      let id = 1;
      wideRows.forEach(w=>{
        const ano = pick(w, ["ANO","ano","Ano"]);
        slots().forEach((s,i)=>{
          const jogador = pick(w, [cols[i]]);
          if(!jogador) return;
          out.push({
            id:id++,
            ano,
            posicao_origem:s.orig,
            posicao_tatica:s.pos,
            jogador,
            x:s.x,
            y:s.y,
            mapa_url:TOP11_BG_V3796,
            __source:"base",
            __top11Source:"base",
            __slotIndex:i
          });
        });
      });
      return out;
    }

    const rows = raw.map((r,idx)=>({
      id: pick(r, ["id","ID"]) || idx + 1,
      ano: pick(r, ["ano","ANO","Ano","temporada","TEMPORADA"]),
      posicao_origem: String(pick(r, ["posicao_origem","POSICAO_ORIGEM","posição_origem","origem"]) || "").toUpperCase(),
      posicao_tatica: String(pick(r, ["posicao_tatica","POSICAO_TATICA","posição_tatica","posicao","POSICAO"]) || "").toUpperCase(),
      jogador: pick(r, ["jogador","JOGADOR","player","PLAYER"]),
      foto_url: pick(r, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]),
      x: pick(r, ["x","X"]),
      y: pick(r, ["y","Y"]),
      mapa_url: pick(r, ["mapa_url","MAPA_URL"]) || TOP11_BG_V3796,
      __source:"base",
      __top11Source:"base",
      __rawIndex:idx
    })).filter(r=>r.ano && r.jogador);

    const byYear = new Map();
    rows.forEach(r=>{
      const key = String(r.ano);
      if(!byYear.has(key)) byYear.set(key, []);
      byYear.get(key).push(r);
    });

    const out = [];
    [...byYear.entries()].forEach(([ano, arr])=>{
      arr.sort((a,b)=>Number(a.id||0)-Number(b.id||0) || a.__rawIndex-b.__rawIndex);
      arr.forEach((r,i)=>{
        const s = slots()[i] || slots()[slots().length-1];
        out.push(Object.assign({}, r, {
          posicao_origem:s.orig,
          posicao_tatica:s.pos,
          x:s.x,
          y:s.y,
          __slotIndex:i
        }));
      });
    });

    return out;
  }

  var careerRows = function careerRows(){
    const all = (typeof getTable === "function" ? getTable("TOP11_CARREIRA") : (window.db?.TOP11_CARREIRA || [])) || [];
    const carreiraId = window.active?.carreira_id || "";
    return all.filter(r => !carreiraId || String(r.carreira_id || "") === String(carreiraId))
      .map((r,i)=>Object.assign({__source:"career", __top11Source:"career", __slotIndex:i}, r));
  }

  var groups = function groups(){
    const map = new Map();

    baseRows().forEach(r=>{
      const label = r.ano || r.temporada || "";
      if(!label) return;
      const key = `base:${label}`;
      if(!map.has(key)) map.set(key, {key,label,season:label,source:"base",sourceLabel:"Base histórica",editable:false,rows:[]});
      map.get(key).rows.push(r);
    });

    careerRows().forEach(r=>{
      const label = r.temporada || "Top 11 carreira";
      const sid = r.carreira_temporada_id || "";
      const key = sid ? `career:${sid}` : `career:${label}`;
      if(!map.has(key)) map.set(key, {key,label,season:label,source:"career",sourceLabel:"Carreira",editable:true,rows:[]});
      map.get(key).rows.push(r);
    });

    const arr = [...map.values()];
    arr.forEach(g=>g.rows.sort((a,b)=>(a.__slotIndex ?? Number(a.id||0)) - (b.__slotIndex ?? Number(b.id||0))));
    arr.sort((a,b)=>{
      const s = String(b.season||b.label||"").localeCompare(String(a.season||a.label||""));
      if(s) return s;
      return a.source === "career" ? -1 : 1;
    });

    if(!window.FL_TOP11_SELECTED_UNIFIED_KEY_V3796 && arr.length){
      window.FL_TOP11_SELECTED_UNIFIED_KEY_V3796 = arr[0].key;
    }
    return arr;
  }

  var selectedGroup = function selectedGroup(){
    const gs = groups();
    if(!gs.length) return null;
    return gs.find(g=>g.key === window.FL_TOP11_SELECTED_UNIFIED_KEY_V3796) || gs[0];
  }

  var coord = function coord(row, idx){
    if(row.__source === "career" && row.x !== undefined && row.x !== "" && row.y !== undefined && row.y !== ""){
      return {x:Number(row.x), y:Number(row.y), pos:row.posicao_tatica || ""};
    }
    const s = slots()[row.__slotIndex ?? idx] || slots()[idx] || {x:50,y:50,pos:row.posicao_tatica||"POS"};
    return {x:s.x, y:s.y, pos:row.posicao_tatica || s.pos};
  }

  var groupPos = function groupPos(row){
    const p = String(row.posicao_tatica || "").toUpperCase();
    if(["GOL","GK"].includes(p)) return "GOL";
    if(["LE","LD","ZAG","CB","LB","RB"].includes(p)) return "DEF";
    if(["VOL","MC","MEI","CAM","CDM","CM"].includes(p)) return "MEI";
    if(["PE","PD","CA","LW","RW","ST"].includes(p)) return "ATA";
    return "TOTAL";
  }

  var appearances = function appearances(filter="TOTAL"){
    const map = new Map();
    [...baseRows(), ...careerRows()].forEach(r=>{
      const gp = groupPos(r);
      if(filter !== "TOTAL" && gp !== filter) return;
      const name = String(r.jogador || "").trim();
      if(!name) return;
      const key = norm(name);
      if(!map.has(key)) map.set(key, {jogador:name,total:0,base:0,carreira:0,funcoes:new Set(),anos:[]});
      const it = map.get(key);
      it.total++;
      if(r.__source === "career") it.carreira++; else it.base++;
      it.funcoes.add(gp);
      const ano = r.ano || r.temporada || "";
      if(ano && !it.anos.includes(ano)) it.anos.push(ano);
    });
    return [...map.values()]
      .map(i=>Object.assign({}, i, {funcoes:[...i.funcoes]}))
      .sort((a,b)=>b.total-a.total || b.carreira-a.carreira || a.jogador.localeCompare(b.jogador));
  }

  var bestHtml = function bestHtml(){
    const filter = window.FL_TOP11_BEST_FILTER_V3796 || "TOTAL";
    const filters = [["TOTAL","Total"],["GOL","Goleiros"],["DEF","Defesa"],["MEI","Meio"],["ATA","Ataque"]];
    const rows = appearances(filter).slice(0,50);

    return `
      <div class="top11-best-head-v3796">
        <div>
          <h2>Melhores</h2>
          <p>Jogadores com mais aparições em Top 11.</p>
        </div>
        <div class="top11-best-tabs-v3796">
          ${filters.map(([id,label])=>`
            <button type="button" class="${filter===id ? "active" : ""}" onclick="window.FL_TOP11_BEST_FILTER_V3796='${id}'; window.FL_renderTop11NewV3796(); setTimeout(()=>document.getElementById('top11-melhores-v3796')?.scrollIntoView({behavior:'smooth',block:'start'}),50);">${label}</button>
          `).join("")}
        </div>
      </div>
      <div class="top11-best-list-v3796">
        ${rows.map((r,i)=>`
          <article class="top11-best-card-v3796">
            <span class="rank">${i+1}</span>
            <div class="avatar" data-top11-best-photo="${attr(r.jogador)}">${esc(initials(r.jogador))}</div>
            <div class="info">
              <div class="name-line"><strong>${esc(r.jogador)}</strong><b>${r.total}x</b></div>
              <small>${esc(r.funcoes.join(" / "))} • ${r.base} base • ${r.carreira} carreira</small>
              <em>${esc(r.anos.slice(0,8).join(" • "))}${r.anos.length>8 ? "..." : ""}</em>
            </div>
          </article>
        `).join("") || `<div class="top11-empty-v3796">Sem dados.</div>`}
      </div>
    `;
  }

  var fetchPhoto = async function fetchPhoto(name){
    if(!name) return "";
    if(window.FL_TOP11_PHOTO_CACHE_V3796?.[norm(name)] !== undefined) return window.FL_TOP11_PHOTO_CACHE_V3796[norm(name)];
    window.FL_TOP11_PHOTO_CACHE_V3796 = window.FL_TOP11_PHOTO_CACHE_V3796 || {};
    if(typeof FL_fetchPlayerPhotoV3790 === "function"){
      try{
        const img = await FL_fetchPlayerPhotoV3790(name);
        window.FL_TOP11_PHOTO_CACHE_V3796[norm(name)] = img || "";
        return img || "";
      }catch(e){}
    }
    try{
      const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`, {cache:"force-cache"});
      const data = await res.json();
      const p = (data?.player || [])[0];
      const img = p?.strCutout || p?.strRender || p?.strThumb || "";
      window.FL_TOP11_PHOTO_CACHE_V3796[norm(name)] = img || "";
      return img || "";
    }catch(e){
      window.FL_TOP11_PHOTO_CACHE_V3796[norm(name)] = "";
      return "";
    }
  }

  var enrichPhotos = function enrichPhotos(){
    const allRows = [...baseRows(), ...careerRows()];
    document.querySelectorAll("[data-top11-player-photo]").forEach(async el=>{
      const name = el.dataset.top11PlayerPhoto || "";
      const id = el.dataset.id || "";
      const row = allRows.find(r=>id && String(r.id||"")===String(id)) || allRows.find(r=>String(r.jogador||"").toLowerCase()===name.toLowerCase());
      const manual = pick(row||{}, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]);
      if(manual){
        el.innerHTML = `<img src="${attr(manual)}" onerror="this.parentElement.innerHTML='${esc(initials(name))}'">`;
        return;
      }
      if(row && isCreated(row)) return;
      const img = await fetchPhoto(name);
      if(img && el.isConnected) el.innerHTML = `<img src="${attr(img)}" onerror="this.parentElement.innerHTML='${esc(initials(name))}'">`;
    });

    document.querySelectorAll("[data-top11-best-photo]").forEach(async el=>{
      const name = el.dataset.top11BestPhoto || "";
      const created = careerRows().find(r=>String(r.jogador||"").toLowerCase()===name.toLowerCase() && isCreated(r));
      const manual = pick(created||{}, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]);
      if(manual){
        el.innerHTML = `<img src="${attr(manual)}" onerror="this.parentElement.innerHTML='${esc(initials(name))}'">`;
        return;
      }
      if(created) return;
      const img = await fetchPhoto(name);
      if(img && el.isConnected) el.innerHTML = `<img src="${attr(img)}" onerror="this.parentElement.innerHTML='${esc(initials(name))}'">`;
    });
  }

  var renderTop11New = function renderTop11New(){
    const page = document.getElementById("top11") || document.querySelector('[data-page="top11"]');
    if(!page) return;

    const gs = groups();
    const group = selectedGroup();
    const rows = group ? group.rows.slice(0,11) : [];
    const isEditing = !!group?.editable && !!window.FL_TOP11_EDITING_V3787;

    const cards = rows.map((r,i)=>{
      const c = coord(r,i);
      const name = r.jogador || "Jogador";
      const manual = pick(r, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]);
      const photo = manual ? `<img src="${attr(manual)}" onerror="this.parentElement.innerHTML='${esc(initials(name))}'">` : esc(initials(name));
      return `
        <div class="top11-player-v3796 ${isEditing ? "editing" : ""}"
             data-id="${attr(r.id||"")}"
             data-source="${attr(group.source)}"
             data-player="${attr(name)}"
             style="left:${c.x}%; top:${c.y}%;">
          <div class="top11-photo-v3796" data-id="${attr(r.id||"")}" data-top11-player-photo="${attr(name)}">${photo}</div>
          <div class="top11-info-v3796">
            <b>${esc(name)}</b>
            <span>${esc(c.pos)}</span>
          </div>
        </div>
      `;
    }).join("");

    page.innerHTML = `
      <div class="top11-page-head-v3796">
        <div>
          <h2>Top 11</h2>
          <p>Histórico e carreira em um único seletor.</p>
          <small>${rows.length}/11 jogadores neste Top 11.</small>
        </div>
        <div class="top11-actions-v3796">
          ${gs.length ? `
            <select onchange="window.FL_TOP11_SELECTED_UNIFIED_KEY_V3796=this.value; window.FL_TOP11_EDITING_V3787=false; window.FL_renderTop11NewV3796();">
              ${gs.map(g=>`<option value="${attr(g.key)}" ${g.key===group?.key ? "selected" : ""}>${esc(g.label)} · ${esc(g.sourceLabel)}</option>`).join("")}
            </select>
          ` : ""}
          <button type="button" class="ghost" onclick="document.getElementById('top11-melhores-v3796')?.scrollIntoView({behavior:'smooth',block:'start'});">Melhores</button>
          ${group?.editable ? `<button type="button" class="ghost" onclick="window.FL_TOP11_EDITING_V3787=!window.FL_TOP11_EDITING_V3787; window.FL_renderTop11NewV3796();">${isEditing ? "Cancelar edição" : "Editar Top 11"}</button>` : ""}
          <button type="button" class="gold" onclick="if(typeof FL_openCreateTop11V3795==='function') FL_openCreateTop11V3795(); else if(typeof FL_openCreateTop11V3790==='function') FL_openCreateTop11V3790();">+ Top 11</button>
        </div>
      </div>

      ${rows.length && rows.length < 11 ? `<div class="top11-warning-v3796">Atenção: este Top 11 tem ${rows.length}/11 jogadores lidos.</div>` : ""}

      <section class="top11-map-section-v3796">
        <div class="top11-map-toolbar-v3796">
          <strong>Top 11 ${esc(group?.label || "")}</strong>
          <span>${esc(group?.sourceLabel || "")}</span>
          ${isEditing ? `<button type="button" class="gold" onclick="if(typeof FL_saveTop11PositionsV3790==='function') FL_saveTop11PositionsV3790();">Salvar posições deste Top 11</button>` : ""}
        </div>
        <div class="top11-pitch-v3796" style="background-image:linear-gradient(rgba(2,6,23,.08),rgba(2,6,23,.18)),url('${attr(TOP11_BG_V3796)}')">
          ${rows.length ? cards : `<button type="button" class="top11-create-empty-v3796" onclick="if(typeof FL_openCreateTop11V3795==='function') FL_openCreateTop11V3795(); else if(typeof FL_openCreateTop11V3790==='function') FL_openCreateTop11V3790();"><b>+</b><span>Criar Top 11</span></button>`}
        </div>
      </section>

      <section id="top11-melhores-v3796" class="top11-best-section-v3796">
        ${bestHtml()}
      </section>
    `;

    if(isEditing) enableDrag();
    enrichPhotos();
    removeLostX();
  }

  var enableDrag = function enableDrag(){
    const pitch = document.querySelector(".top11-pitch-v3796");
    if(!pitch) return;
    pitch.querySelectorAll(".top11-player-v3796").forEach(card=>{
      let dragging = false;
      const move = e=>{
        if(!dragging) return;
        const p = e.touches ? e.touches[0] : e;
        const rect = pitch.getBoundingClientRect();
        let x = ((p.clientX - rect.left)/rect.width)*100;
        let y = ((p.clientY - rect.top)/rect.height)*100;
        x = Math.max(4, Math.min(96, x));
        y = Math.max(6, Math.min(94, y));
        card.style.left = x+"%";
        card.style.top = y+"%";
        card.dataset.x = x.toFixed(2);
        card.dataset.y = y.toFixed(2);
      };
      const stop = ()=>{
        dragging = false;
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", stop);
      };
      card.addEventListener("mousedown", e=>{
        e.preventDefault();
        dragging = true;
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);
      });
    });
  }

  var removeLostX = function removeLostX(){
    document.querySelectorAll("button,div,span,a").forEach(el=>{
      const txt = (el.textContent||"").trim();
      if(!["×","x","X"].includes(txt)) return;
      const rect = el.getBoundingClientRect();
      const cls = String(el.className||"");
      const isTopRight = rect.top >= -5 && rect.top < 110 && rect.right > window.innerWidth - 130;
      const isAllowedModal = !!el.closest(".modal,.fl-top11-modal-v3787,.fl-top11-modal-v3788,.fl-ballon-best-modal-v3783");
      if(isTopRight && /red|danger|delete|remove|season|x/i.test(cls) && !isAllowedModal) el.remove();
    });
  }

  window.FL_renderTop11NewV3796 = renderTop11New;
  window.renderTop11 = renderTop11New;
  try { renderTop11 = renderTop11New; } catch(e){}

  const oldRenderPage = window.renderPageById || (typeof renderPageById === "function" ? renderPageById : null);
  if(oldRenderPage && !window.__top11RenderPageV3796Wrapped){
    window.__top11RenderPageV3796Wrapped = true;
    window.renderPageById = function(pageId){
      if(String(pageId).toLowerCase() === "top11" || String(pageId).toLowerCase() === "top 11"){
        setTimeout(renderTop11New, 0);
        return renderTop11New();
      }
      return oldRenderPage.apply(this, arguments);
    };
    try { renderPageById = window.renderPageById; } catch(e){}
  }

  document.addEventListener("click", function(e){
    const t = e.target.closest("[data-page],button,a,.nav-item,.sidebar-item");
    const txt = String(t?.textContent || "").toLowerCase();
    const dp = String(t?.dataset?.page || "").toLowerCase();
    if(dp === "top11" || txt.includes("top 11")){
      setTimeout(renderTop11New, 50);
      setTimeout(renderTop11New, 300);
    }
    setTimeout(removeLostX, 250);
  }, true);

  setTimeout(removeLostX, 400);
  setTimeout(removeLostX, 1400);
})();


// ===== V3.7.97 — CORRIGE TOP11_CARREIRA FORA DO MAPA =====
// Problema do print:
// - carreira estava usando __slotIndex global da tabela, não a posição dentro da temporada.
// - x/y vindo como ####, vazio ou texto quebrava o CSS e mandava jogador para o canto.
// Correção:
// - cada temporada recalcula slots 0..10.
// - x/y só é usado se for número válido entre 0 e 100.
// - se x/y for inválido, usa slot fixo do campo.

(function(){
  const TOP11_BG_V3797 = "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg";

  var esc = function esc(v){
    if(typeof escapeHtml === "function") return escapeHtml(String(v ?? ""));
    return String(v ?? "").replace(/[&<>"']/g, m=>({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[m]));
  }

  var attr = function attr(v){
    if(typeof escapeAttr === "function") return escapeAttr(String(v ?? ""));
    return String(v ?? "").replace(/"/g,"&quot;");
  }

  var norm = function norm(v){
    return String(v || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"");
  }

  var pick = function pick(row, keys){
    for(const k of keys){
      if(row && row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    const n = {};
    Object.keys(row || {}).forEach(k=>n[norm(k)] = row[k]);
    for(const k of keys){
      const nk = norm(k);
      if(n[nk] !== undefined && n[nk] !== null && n[nk] !== "") return n[nk];
    }
    return "";
  }

  var initials = function initials(name){
    const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
  }

  var slots = function slots(){
    return [
      {orig:"GL",   pos:"GOL", x:8,  y:50},
      {orig:"DEF",  pos:"LE",  x:22, y:20},
      {orig:"DEF2", pos:"ZAG", x:27, y:38},
      {orig:"DEF3", pos:"ZAG", x:27, y:62},
      {orig:"DEF4", pos:"LD",  x:22, y:80},
      {orig:"MEI",  pos:"MEI", x:52, y:28},
      {orig:"MEI5", pos:"MEI", x:52, y:50},
      {orig:"MEI6", pos:"MEI", x:52, y:72},
      {orig:"ATA",  pos:"PE",  x:78, y:28},
      {orig:"ATA7", pos:"CA",  x:84, y:50},
      {orig:"ATA8", pos:"PD",  x:78, y:72}
    ];
  }

  var validPct = function validPct(v){
    const s = String(v ?? "").trim().replace(",", ".");
    if(!s || /#/.test(s)) return null;
    const n = Number(s);
    if(!Number.isFinite(n)) return null;
    if(n < 0 || n > 100) return null;
    return n;
  }

  var positionOrder = function positionOrder(row){
    const origem = String(pick(row, ["posicao_origem","POSICAO_ORIGEM"]) || "").toUpperCase();
    const pos = String(pick(row, ["posicao_tatica","POSICAO_TATICA"]) || "").toUpperCase();

    const originOrder = ["GL","GOL","DEF","DEF2","DEF3","DEF4","MEI","MEI5","MEI6","ATA","ATA7","ATA8"];
    const oi = originOrder.indexOf(origem);
    if(oi >= 0) return oi;

    const posOrder = {
      GOL:0, GK:0,
      LE:1, LB:1,
      ZAG:2, CB:2,
      LD:4, RB:4,
      VOL:5, CDM:5,
      MC:6, CM:6,
      MEI:7, CAM:7,
      PE:8, LW:8,
      CA:9, ST:9,
      PD:10, RW:10
    };

    if(posOrder[pos] !== undefined) return posOrder[pos];
    return Number(row.id || 9999);
  }

  var isCreated = function isCreated(row){
    const v = String(pick(row, ["criado","CRIADO","jogador_criado","created"]) || "").trim().toLowerCase();
    return ["sim","s","yes","y","true","1","criado","created"].includes(v);
  }

  var baseRows = function baseRows(){
    const raw = (typeof getTable === "function" ? getTable("TOP11_BASE") : (window.db?.TOP11_BASE || [])) || [];
    if(!raw.length) return [];

    const wideRows = raw.filter(r=>{
      const ano = pick(r, ["ANO","ano","Ano"]);
      return ano && (pick(r, ["GL"]) || pick(r, ["DEF"]) || pick(r, ["ATA8"]));
    });

    if(wideRows.length){
      const cols = ["GL","DEF","DEF2","DEF3","DEF4","MEI","MEI5","MEI6","ATA","ATA7","ATA8"];
      const out = [];
      let id = 1;
      wideRows.forEach(w=>{
        const ano = pick(w, ["ANO","ano","Ano"]);
        slots().forEach((s,i)=>{
          const jogador = pick(w, [cols[i]]);
          if(!jogador) return;
          out.push({
            id:id++,
            ano,
            posicao_origem:s.orig,
            posicao_tatica:s.pos,
            jogador,
            x:s.x,
            y:s.y,
            mapa_url:TOP11_BG_V3797,
            __source:"base",
            __top11Source:"base",
            __slotIndex:i
          });
        });
      });
      return out;
    }

    const rows = raw.map((r,idx)=>({
      id: pick(r, ["id","ID"]) || idx + 1,
      ano: pick(r, ["ano","ANO","Ano","temporada","TEMPORADA"]),
      posicao_origem: String(pick(r, ["posicao_origem","POSICAO_ORIGEM","posição_origem","origem"]) || "").toUpperCase(),
      posicao_tatica: String(pick(r, ["posicao_tatica","POSICAO_TATICA","posição_tatica","posicao","POSICAO"]) || "").toUpperCase(),
      jogador: pick(r, ["jogador","JOGADOR","player","PLAYER"]),
      foto_url: pick(r, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]),
      x: pick(r, ["x","X"]),
      y: pick(r, ["y","Y"]),
      mapa_url: pick(r, ["mapa_url","MAPA_URL"]) || TOP11_BG_V3797,
      __source:"base",
      __top11Source:"base",
      __rawIndex:idx
    })).filter(r=>r.ano && r.jogador);

    const byYear = new Map();
    rows.forEach(r=>{
      const key = String(r.ano);
      if(!byYear.has(key)) byYear.set(key, []);
      byYear.get(key).push(r);
    });

    const out = [];
    [...byYear.entries()].forEach(([ano, arr])=>{
      arr.sort((a,b)=>Number(a.id||0)-Number(b.id||0) || a.__rawIndex-b.__rawIndex);
      arr.forEach((r,i)=>{
        const s = slots()[i] || slots()[slots().length-1];
        out.push(Object.assign({}, r, {
          posicao_origem:s.orig,
          posicao_tatica:s.pos,
          x:s.x,
          y:s.y,
          __slotIndex:i
        }));
      });
    });

    return out;
  }

  var careerRows = function careerRows(){
    const all = (typeof getTable === "function" ? getTable("TOP11_CARREIRA") : (window.db?.TOP11_CARREIRA || [])) || [];
    const carreiraId = window.active?.carreira_id || "";

    const rows = all
      .filter(r => !carreiraId || String(pick(r, ["carreira_id","CARREIRA_ID"]) || "") === String(carreiraId))
      .map((r,i)=>Object.assign({__source:"career", __top11Source:"career", __rawIndex:i}, r));

    const bySeason = new Map();
    rows.forEach(r=>{
      const season = String(pick(r, ["temporada","TEMPORADA"]) || "sem-temporada");
      const sid = String(pick(r, ["carreira_temporada_id","CARREIRA_TEMPORADA_ID"]) || "");
      const key = sid ? `id:${sid}` : `temp:${season}`;
      if(!bySeason.has(key)) bySeason.set(key, []);
      bySeason.get(key).push(r);
    });

    const out = [];
    [...bySeason.values()].forEach(arr=>{
      arr.sort((a,b)=>positionOrder(a)-positionOrder(b) || Number(a.id||0)-Number(b.id||0) || a.__rawIndex-b.__rawIndex);

      arr.forEach((r,i)=>{
        const s = slots()[i] || slots()[slots().length-1];

        // Se x/y for válido e realmente salvo pelo usuário, usa.
        // Se vier ####, vazio ou inválido, usa o slot.
        const xValid = validPct(pick(r, ["x","X"]));
        const yValid = validPct(pick(r, ["y","Y"]));
        const useSaved = xValid !== null && yValid !== null;

        out.push(Object.assign({}, r, {
          __slotIndex:i,
          posicao_origem: pick(r, ["posicao_origem","POSICAO_ORIGEM"]) || s.orig,
          posicao_tatica: pick(r, ["posicao_tatica","POSICAO_TATICA"]) || s.pos,
          x: useSaved ? xValid : s.x,
          y: useSaved ? yValid : s.y
        }));
      });
    });

    return out;
  }

  var groups = function groups(){
    const map = new Map();

    baseRows().forEach(r=>{
      const label = r.ano || r.temporada || "";
      if(!label) return;
      const key = `base:${label}`;
      if(!map.has(key)) map.set(key, {key,label,season:label,source:"base",sourceLabel:"Base histórica",editable:false,rows:[]});
      map.get(key).rows.push(r);
    });

    careerRows().forEach(r=>{
      const label = pick(r, ["temporada","TEMPORADA"]) || "Top 11 carreira";
      const sid = pick(r, ["carreira_temporada_id","CARREIRA_TEMPORADA_ID"]) || "";
      const key = sid ? `career:${sid}` : `career:${label}`;
      if(!map.has(key)) map.set(key, {key,label,season:label,source:"career",sourceLabel:"Carreira",editable:true,rows:[]});
      map.get(key).rows.push(r);
    });

    const arr = [...map.values()];
    arr.forEach(g=>g.rows.sort((a,b)=>(a.__slotIndex ?? 999) - (b.__slotIndex ?? 999)));
    arr.sort((a,b)=>{
      const s = String(b.season||b.label||"").localeCompare(String(a.season||a.label||""));
      if(s) return s;
      return a.source === "career" ? -1 : 1;
    });

    if(!window.FL_TOP11_SELECTED_UNIFIED_KEY_V3797 && arr.length){
      window.FL_TOP11_SELECTED_UNIFIED_KEY_V3797 = window.FL_TOP11_SELECTED_UNIFIED_KEY_V3796 || arr[0].key;
    }

    return arr;
  }

  var selectedGroup = function selectedGroup(){
    const gs = groups();
    if(!gs.length) return null;
    return gs.find(g=>g.key === window.FL_TOP11_SELECTED_UNIFIED_KEY_V3797) || gs.find(g=>g.key === window.FL_TOP11_SELECTED_UNIFIED_KEY_V3796) || gs[0];
  }

  var coord = function coord(row, idx){
    const x = validPct(row.x);
    const y = validPct(row.y);
    const s = slots()[row.__slotIndex ?? idx] || slots()[idx] || {x:50,y:50,pos:row.posicao_tatica||"POS"};

    return {
      x: x !== null ? x : s.x,
      y: y !== null ? y : s.y,
      pos: row.posicao_tatica || s.pos
    };
  }

  var groupPos = function groupPos(row){
    const p = String(row.posicao_tatica || "").toUpperCase();
    if(["GOL","GK"].includes(p)) return "GOL";
    if(["LE","LD","ZAG","CB","LB","RB"].includes(p)) return "DEF";
    if(["VOL","MC","MEI","CAM","CDM","CM"].includes(p)) return "MEI";
    if(["PE","PD","CA","LW","RW","ST"].includes(p)) return "ATA";
    return "TOTAL";
  }

  var appearances = function appearances(filter="TOTAL"){
    const map = new Map();

    [...baseRows(), ...careerRows()].forEach(r=>{
      const gp = groupPos(r);
      if(filter !== "TOTAL" && gp !== filter) return;

      const name = String(r.jogador || "").trim();
      if(!name) return;

      const key = norm(name);
      if(!map.has(key)) map.set(key, {jogador:name,total:0,base:0,carreira:0,funcoes:new Set(),anos:[]});

      const it = map.get(key);
      it.total++;
      if(r.__source === "career") it.carreira++; else it.base++;
      it.funcoes.add(gp);

      const ano = r.ano || r.temporada || "";
      if(ano && !it.anos.includes(ano)) it.anos.push(ano);
    });

    return [...map.values()]
      .map(i=>Object.assign({}, i, {funcoes:[...i.funcoes]}))
      .sort((a,b)=>b.total-a.total || b.carreira-a.carreira || a.jogador.localeCompare(b.jogador));
  }

  var bestHtml = function bestHtml(){
    const filter = window.FL_TOP11_BEST_FILTER_V3797 || window.FL_TOP11_BEST_FILTER_V3796 || "TOTAL";
    const filters = [["TOTAL","Total"],["GOL","Goleiros"],["DEF","Defesa"],["MEI","Meio"],["ATA","Ataque"]];
    const rows = appearances(filter).slice(0,50);

    return `
      <div class="top11-best-head-v3796">
        <div>
          <h2>Melhores</h2>
          <p>Jogadores com mais aparições em Top 11.</p>
        </div>
        <div class="top11-best-tabs-v3796">
          ${filters.map(([id,label])=>`
            <button type="button" class="${filter===id ? "active" : ""}" onclick="window.FL_TOP11_BEST_FILTER_V3797='${id}'; window.FL_renderTop11NewV3797(); setTimeout(()=>document.getElementById('top11-melhores-v3796')?.scrollIntoView({behavior:'smooth',block:'start'}),50);">${label}</button>
          `).join("")}
        </div>
      </div>
      <div class="top11-best-list-v3796">
        ${rows.map((r,i)=>`
          <article class="top11-best-card-v3796">
            <span class="rank">${i+1}</span>
            <div class="avatar" data-top11-best-photo="${attr(r.jogador)}">${esc(initials(r.jogador))}</div>
            <div class="info">
              <div class="name-line"><strong>${esc(r.jogador)}</strong><b>${r.total}x</b></div>
              <small>${esc(r.funcoes.join(" / "))} • ${r.base} base • ${r.carreira} carreira</small>
              <em>${esc(r.anos.slice(0,8).join(" • "))}${r.anos.length>8 ? "..." : ""}</em>
            </div>
          </article>
        `).join("") || `<div class="top11-empty-v3796">Sem dados.</div>`}
      </div>
    `;
  }

  var fetchPhoto = async function fetchPhoto(name){
    if(!name) return "";
    window.FL_TOP11_PHOTO_CACHE_V3797 = window.FL_TOP11_PHOTO_CACHE_V3797 || {};
    if(window.FL_TOP11_PHOTO_CACHE_V3797[norm(name)] !== undefined) return window.FL_TOP11_PHOTO_CACHE_V3797[norm(name)];

    if(typeof FL_fetchPlayerPhotoV3790 === "function"){
      try{
        const img = await FL_fetchPlayerPhotoV3790(name);
        window.FL_TOP11_PHOTO_CACHE_V3797[norm(name)] = img || "";
        return img || "";
      }catch(e){}
    }

    try{
      const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`, {cache:"force-cache"});
      const data = await res.json();
      const p = (data?.player || [])[0];
      const img = p?.strCutout || p?.strRender || p?.strThumb || "";
      window.FL_TOP11_PHOTO_CACHE_V3797[norm(name)] = img || "";
      return img || "";
    }catch(e){
      window.FL_TOP11_PHOTO_CACHE_V3797[norm(name)] = "";
      return "";
    }
  }

  var enrichPhotos = function enrichPhotos(){
    const allRows = [...baseRows(), ...careerRows()];

    document.querySelectorAll("[data-top11-player-photo]").forEach(async el=>{
      const name = el.dataset.top11PlayerPhoto || "";
      const id = el.dataset.id || "";
      const source = el.dataset.source || "";
      const row =
        allRows.find(r=>id && String(r.id||"")===String(id) && (!source || r.__source === source)) ||
        allRows.find(r=>String(r.jogador||"").toLowerCase()===name.toLowerCase());

      const manual = pick(row||{}, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]);
      if(manual){
        el.innerHTML = `<img src="${attr(manual)}" onerror="this.parentElement.innerHTML='${esc(initials(name))}'">`;
        return;
      }

      if(row && isCreated(row)) return;

      const img = await fetchPhoto(name);
      if(img && el.isConnected) el.innerHTML = `<img src="${attr(img)}" onerror="this.parentElement.innerHTML='${esc(initials(name))}'">`;
    });

    document.querySelectorAll("[data-top11-best-photo]").forEach(async el=>{
      const name = el.dataset.top11BestPhoto || "";
      const created = careerRows().find(r=>String(r.jogador||"").toLowerCase()===name.toLowerCase() && isCreated(r));
      const manual = pick(created||{}, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]);
      if(manual){
        el.innerHTML = `<img src="${attr(manual)}" onerror="this.parentElement.innerHTML='${esc(initials(name))}'">`;
        return;
      }
      if(created) return;

      const img = await fetchPhoto(name);
      if(img && el.isConnected) el.innerHTML = `<img src="${attr(img)}" onerror="this.parentElement.innerHTML='${esc(initials(name))}'">`;
    });
  }

  var renderTop11New = function renderTop11New(){
    const page = document.getElementById("top11") || document.querySelector('[data-page="top11"]');
    if(!page) return;

    const gs = groups();
    const group = selectedGroup();
    const rows = group ? group.rows.slice(0,11) : [];
    const isEditing = !!group?.editable && !!window.FL_TOP11_EDITING_V3787;

    const cards = rows.map((r,i)=>{
      const c = coord(r,i);
      const name = r.jogador || "Jogador";
      const manual = pick(r, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]);
      const photo = manual ? `<img src="${attr(manual)}" onerror="this.parentElement.innerHTML='${esc(initials(name))}'">` : esc(initials(name));

      return `
        <div class="top11-player-v3796 ${isEditing ? "editing" : ""}"
             data-id="${attr(r.id||"")}"
             data-source="${attr(group.source)}"
             data-player="${attr(name)}"
             style="left:${c.x}%; top:${c.y}%;">
          <div class="top11-photo-v3796" data-id="${attr(r.id||"")}" data-source="${attr(group.source)}" data-top11-player-photo="${attr(name)}">${photo}</div>
          <div class="top11-info-v3796">
            <b>${esc(name)}</b>
            <span>${esc(c.pos)}</span>
          </div>
        </div>
      `;
    }).join("");

    page.innerHTML = `
      <div class="top11-page-head-v3796">
        <div>
          <h2>Top 11</h2>
          <p>Histórico e carreira em um único seletor.</p>
          <small>${rows.length}/11 jogadores neste Top 11.</small>
        </div>
        <div class="top11-actions-v3796">
          ${gs.length ? `
            <select onchange="window.FL_TOP11_SELECTED_UNIFIED_KEY_V3797=this.value; window.FL_TOP11_SELECTED_UNIFIED_KEY_V3796=this.value; window.FL_TOP11_EDITING_V3787=false; window.FL_renderTop11NewV3797();">
              ${gs.map(g=>`<option value="${attr(g.key)}" ${g.key===group?.key ? "selected" : ""}>${esc(g.label)} · ${esc(g.sourceLabel)}</option>`).join("")}
            </select>
          ` : ""}
          <button type="button" class="ghost" onclick="document.getElementById('top11-melhores-v3796')?.scrollIntoView({behavior:'smooth',block:'start'});">Melhores</button>
          ${group?.editable ? `<button type="button" class="ghost" onclick="window.FL_TOP11_EDITING_V3787=!window.FL_TOP11_EDITING_V3787; window.FL_renderTop11NewV3797();">${isEditing ? "Cancelar edição" : "Editar Top 11"}</button>` : ""}
          <button type="button" class="gold" onclick="if(typeof FL_openCreateTop11V3795==='function') FL_openCreateTop11V3795(); else if(typeof FL_openCreateTop11V3790==='function') FL_openCreateTop11V3790();">+ Top 11</button>
        </div>
      </div>

      ${rows.length && rows.length < 11 ? `<div class="top11-warning-v3796">Atenção: este Top 11 tem ${rows.length}/11 jogadores lidos.</div>` : ""}

      <section class="top11-map-section-v3796">
        <div class="top11-map-toolbar-v3796">
          <strong>Top 11 ${esc(group?.label || "")}</strong>
          <span>${esc(group?.sourceLabel || "")}</span>
          ${isEditing ? `<button type="button" class="gold" onclick="window.FL_saveTop11PositionsV3797()">Salvar posições deste Top 11</button>` : ""}
        </div>
        <div class="top11-pitch-v3796" style="background-image:linear-gradient(rgba(2,6,23,.08),rgba(2,6,23,.18)),url('${attr(TOP11_BG_V3797)}')">
          ${rows.length ? cards : `<button type="button" class="top11-create-empty-v3796" onclick="if(typeof FL_openCreateTop11V3795==='function') FL_openCreateTop11V3795(); else if(typeof FL_openCreateTop11V3790==='function') FL_openCreateTop11V3790();"><b>+</b><span>Criar Top 11</span></button>`}
        </div>
      </section>

      <section id="top11-melhores-v3796" class="top11-best-section-v3796">
        ${bestHtml()}
      </section>
    `;

    if(isEditing) enableDrag();
    enrichPhotos();
    removeLostX();
  }

  var enableDrag = function enableDrag(){
    const pitch = document.querySelector(".top11-pitch-v3796");
    if(!pitch) return;

    pitch.querySelectorAll(".top11-player-v3796").forEach(card=>{
      let dragging = false;

      const move = e=>{
        if(!dragging) return;
        const p = e.touches ? e.touches[0] : e;
        const rect = pitch.getBoundingClientRect();
        let x = ((p.clientX - rect.left)/rect.width)*100;
        let y = ((p.clientY - rect.top)/rect.height)*100;
        x = Math.max(4, Math.min(96, x));
        y = Math.max(6, Math.min(94, y));
        card.style.left = x+"%";
        card.style.top = y+"%";
        card.dataset.x = x.toFixed(2);
        card.dataset.y = y.toFixed(2);
      };

      const stop = ()=>{
        dragging = false;
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", stop);
      };

      card.addEventListener("mousedown", e=>{
        e.preventDefault();
        dragging = true;
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);
      });
    });
  }

  var savePositions = async function savePositions(){
    const group = selectedGroup();
    if(!group || !group.editable){
      setStatus("Este Top 11 é base histórica e não pode ser editado.", "error");
      return;
    }

    const cards = [...document.querySelectorAll(".top11-player-v3796")];
    const rows = cards.map(card=>{
      const id = card.dataset.id || "";
      const original = group.rows.find(r=>String(r.id||"")===String(id)) || {};
      const x = validPct(card.dataset.x) ?? validPct(card.style.left) ?? validPct(original.x);
      const y = validPct(card.dataset.y) ?? validPct(card.style.top) ?? validPct(original.y);
      return Object.assign({}, original, {id, x, y});
    });

    try{
      setStatus("Salvando posições do Top 11...", "loading");
      const result = await apiPost({
        action:"saveTop11CareerV2",
        carreira_id: window.active?.carreira_id || "",
        carreira_temporada_id: group.carreira_temporada_id || "",
        temporada: group.label || "",
        mapa_url: TOP11_BG_V3797,
        replace_existing: false,
        rows
      });

      if(!result || !result.ok) throw new Error(result?.error || "Apps Script não confirmou salvamento.");

      if(Array.isArray(window.db?.TOP11_CARREIRA)){
        const saved = result.data?.rows || rows;
        saved.forEach(s=>{
          const idx = window.db.TOP11_CARREIRA.findIndex(r=>String(r.id||"")===String(s.id||""));
          if(idx >= 0) window.db.TOP11_CARREIRA[idx] = Object.assign({}, window.db.TOP11_CARREIRA[idx], s);
        });
      }

      setStatus("Posições salvas.", "ok");
      window.FL_TOP11_EDITING_V3787 = false;
      renderTop11New();
    }catch(err){
      console.error(err);
      setStatus("Erro ao salvar posições: " + err.message, "error");
    }
  }

  var removeLostX = function removeLostX(){
    document.querySelectorAll("button,div,span,a").forEach(el=>{
      const txt = (el.textContent||"").trim();
      if(!["×","x","X"].includes(txt)) return;
      const rect = el.getBoundingClientRect();
      const cls = String(el.className||"");
      const isTopRight = rect.top >= -5 && rect.top < 110 && rect.right > window.innerWidth - 130;
      const isAllowedModal = !!el.closest(".modal,.fl-top11-modal-v3787,.fl-top11-modal-v3788,.fl-ballon-best-modal-v3783");
      if(isTopRight && /red|danger|delete|remove|season|x/i.test(cls) && !isAllowedModal) el.remove();
    });
  }

  window.FL_top11CareerRowsV3797 = careerRows;
  window.FL_top11BaseRowsV3797 = baseRows;
  window.FL_renderTop11NewV3797 = renderTop11New;
  window.FL_saveTop11PositionsV3797 = savePositions;
  window.renderTop11 = renderTop11New;
  try { renderTop11 = renderTop11New; } catch(e){}

  const oldRenderPage = window.renderPageById || (typeof renderPageById === "function" ? renderPageById : null);
  if(oldRenderPage && !window.__top11RenderPageV3797Wrapped){
    window.__top11RenderPageV3797Wrapped = true;
    window.renderPageById = function(pageId){
      if(String(pageId).toLowerCase() === "top11" || String(pageId).toLowerCase() === "top 11"){
        setTimeout(renderTop11New, 0);
        return renderTop11New();
      }
      return oldRenderPage.apply(this, arguments);
    };
    try { renderPageById = window.renderPageById; } catch(e){}
  }

  document.addEventListener("click", function(e){
    const t = e.target.closest("[data-page],button,a,.nav-item,.sidebar-item");
    const txt = String(t?.textContent || "").toLowerCase();
    const dp = String(t?.dataset?.page || "").toLowerCase();
    if(dp === "top11" || txt.includes("top 11")){
      setTimeout(renderTop11New, 50);
      setTimeout(renderTop11New, 300);
    }
    setTimeout(removeLostX, 250);
  }, true);

  setTimeout(removeLostX, 400);
  setTimeout(removeLostX, 1400);
})();


// ===== V3.7.98 — EDITAR JOGADOR DO TOP 11 + CRIADO/FOTO URL =====
// Funcionalidades:
// - Clicar em jogador da carreira abre modal de edição.
// - Edita nome, posição, criado e foto_url.
// - Se criado = SIM, não busca imagem pela API.
// - + Top 11 tem campos Criado/API e Foto URL manual.

(function(){
  const TOP11_BG_V3798 = "https://res.cloudinary.com/duq0dyp6b/image/upload/v1780867999/kxt7strjhnbprbl6h3oy.jpg";

  var esc = function esc(v){
    if(typeof escapeHtml === "function") return escapeHtml(String(v ?? ""));
    return String(v ?? "").replace(/[&<>"']/g, m=>({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[m]));
  }

  var attr = function attr(v){
    if(typeof escapeAttr === "function") return escapeAttr(String(v ?? ""));
    return String(v ?? "").replace(/"/g,"&quot;");
  }

  var norm = function norm(v){
    return String(v || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"");
  }

  var pick = function pick(row, keys){
    for(const k of keys){
      if(row && row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    const n = {};
    Object.keys(row || {}).forEach(k=>n[norm(k)] = row[k]);
    for(const k of keys){
      const nk = norm(k);
      if(n[nk] !== undefined && n[nk] !== null && n[nk] !== "") return n[nk];
    }
    return "";
  }

  var initials = function initials(name){
    const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
  }

  var isCreated = function isCreated(row){
    const v = String(pick(row, ["criado","CRIADO","jogador_criado","created"]) || "").trim().toLowerCase();
    return ["sim","s","yes","y","true","1","criado","created"].includes(v);
  }

  var currentTop11Group = function currentTop11Group(){
    if(typeof FL_top11CareerRowsV3797 === "function" && typeof FL_top11BaseRowsV3797 === "function"){
      const allCareer = FL_top11CareerRowsV3797();
      const allBase = FL_top11BaseRowsV3797();

      const selected =
        window.FL_TOP11_SELECTED_UNIFIED_KEY_V3797 ||
        window.FL_TOP11_SELECTED_UNIFIED_KEY_V3796 ||
        "";

      const careerGroups = new Map();
      allCareer.forEach(r=>{
        const sid = pick(r, ["carreira_temporada_id","CARREIRA_TEMPORADA_ID"]) || "";
        const temp = pick(r, ["temporada","TEMPORADA"]) || "";
        const key = sid ? `career:${sid}` : `career:${temp}`;
        if(!careerGroups.has(key)) careerGroups.set(key, {key, source:"career", editable:true, rows:[]});
        careerGroups.get(key).rows.push(r);
      });

      const baseGroups = new Map();
      allBase.forEach(r=>{
        const ano = r.ano || r.temporada || "";
        const key = `base:${ano}`;
        if(!baseGroups.has(key)) baseGroups.set(key, {key, source:"base", editable:false, rows:[]});
        baseGroups.get(key).rows.push(r);
      });

      return careerGroups.get(selected) || baseGroups.get(selected) || null;
    }

    return null;
  }

  var findCareerRowById = function findCareerRowById(id){
    const rows =
      typeof FL_top11CareerRowsV3797 === "function" ? FL_top11CareerRowsV3797() :
      typeof FL_top11CareerRowsV3795 === "function" ? FL_top11CareerRowsV3795() :
      (getTable("TOP11_CARREIRA") || []);

    return rows.find(r=>String(r.id || "") === String(id));
  }

  var openEditTop11PlayerModal = function openEditTop11PlayerModal(id){
    const row = findCareerRowById(id);

    if(!row){
      setStatus("Só dá para editar jogadores do Top 11 da carreira. Base histórica é fixa.", "error");
      return;
    }

    const nome = pick(row, ["jogador","JOGADOR"]);
    const pos = pick(row, ["posicao_tatica","POSICAO_TATICA"]);
    const origem = pick(row, ["posicao_origem","POSICAO_ORIGEM"]);
    const criado = isCreated(row) ? "SIM" : "";
    const foto = pick(row, ["foto_url","FOTO_URL","imagem_url","IMAGEM_URL"]);
    const clube = pick(row, ["clube","CLUBE"]);
    const pais = pick(row, ["pais","PAIS"]);
    const overall = pick(row, ["overall","OVERALL"]);

    document.getElementById("fl-top11-player-edit-modal-v3798")?.remove();

    const modal = document.createElement("div");
    modal.id = "fl-top11-player-edit-modal-v3798";
    modal.className = "fl-modal-backdrop-v3798";
    modal.innerHTML = `
      <div class="fl-modal-card-v3798">
        <button type="button" class="fl-modal-close-v3798" onclick="document.getElementById('fl-top11-player-edit-modal-v3798')?.remove()">×</button>

        <h2>Editar jogador do Top 11</h2>
        <p>Altere nome, posição e imagem manual quando o jogador for criado.</p>

        <form id="fl-top11-player-edit-form-v3798">
          <input type="hidden" name="id" value="${attr(id)}">

          <label>
            Nome do jogador
            <input name="jogador" value="${attr(nome)}" required>
          </label>

          <div class="fl-grid-2-v3798">
            <label>
              Posição
              <select name="posicao_tatica">
                ${["GOL","LE","ZAG","LD","VOL","MC","MEI","PE","CA","PD"].map(p=>`
                  <option value="${p}" ${String(pos).toUpperCase()===p ? "selected" : ""}>${p}</option>
                `).join("")}
              </select>
            </label>

            <label>
              Posição origem
              <select name="posicao_origem">
                ${["GL","DEF","DEF2","DEF3","DEF4","MEI","MEI5","MEI6","ATA","ATA7","ATA8"].map(p=>`
                  <option value="${p}" ${String(origem).toUpperCase()===p ? "selected" : ""}>${p}</option>
                `).join("")}
              </select>
            </label>
          </div>

          <div class="fl-grid-2-v3798">
            <label>
              Tipo de imagem
              <select name="criado">
                <option value="" ${!criado ? "selected" : ""}>Buscar por API</option>
                <option value="SIM" ${criado ? "selected" : ""}>Criado / usar URL manual</option>
              </select>
            </label>

            <label>
              Overall
              <input name="overall" value="${attr(overall)}" placeholder="Opcional">
            </label>
          </div>

          <label>
            Foto URL manual
            <div class="fl-url-row-v3798">
              <input name="foto_url" value="${attr(foto)}" placeholder="https://res.cloudinary.com/.../jogador.png">
              <button type="button" onclick="FL_previewTop11PlayerPhotoV3798()">Prévia</button>
            </div>
          </label>

          <div id="fl-top11-player-preview-v3798" class="fl-preview-v3798">
            ${foto ? `<img src="${attr(foto)}" onerror="this.parentElement.innerHTML='URL inválida'">` : `<span>${esc(initials(nome))}</span>`}
          </div>

          <div class="fl-grid-2-v3798">
            <label>
              Clube
              <input name="clube" value="${attr(clube)}" placeholder="Opcional">
            </label>

            <label>
              País
              <input name="pais" value="${attr(pais)}" placeholder="Opcional">
            </label>
          </div>

          <div class="fl-modal-actions-v3798">
            <button type="button" class="ghost" onclick="document.getElementById('fl-top11-player-edit-modal-v3798')?.remove()">Cancelar</button>
            <button type="submit" class="gold">Salvar jogador</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("fl-top11-player-edit-form-v3798").onsubmit = saveTop11PlayerEdit;
  }

  var previewTop11PlayerPhoto = function previewTop11PlayerPhoto(){
    const form = document.getElementById("fl-top11-player-edit-form-v3798");
    const preview = document.getElementById("fl-top11-player-preview-v3798");
    if(!form || !preview) return;

    const url = String(form.foto_url.value || "").trim();
    const nome = String(form.jogador.value || "").trim();

    if(url){
      preview.innerHTML = `<img src="${attr(url)}" onerror="this.parentElement.innerHTML='URL inválida'">`;
    }else{
      preview.innerHTML = `<span>${esc(initials(nome))}</span>`;
    }
  }

  var saveTop11PlayerEdit = async function saveTop11PlayerEdit(e){
    e.preventDefault();

    const form = e.currentTarget;
    const id = String(form.id.value || "").trim();
    const original = findCareerRowById(id);

    if(!original){
      setStatus("Jogador não encontrado na TOP11_CARREIRA.", "error");
      return;
    }

    const updated = Object.assign({}, original, {
      id,
      jogador: String(form.jogador.value || "").trim(),
      posicao_tatica: String(form.posicao_tatica.value || "").trim(),
      posicao_origem: String(form.posicao_origem.value || "").trim(),
      criado: String(form.criado.value || "").trim(),
      foto_url: String(form.foto_url.value || "").trim(),
      clube: String(form.clube.value || "").trim(),
      pais: String(form.pais.value || "").trim(),
      overall: String(form.overall.value || "").trim()
    });

    try{
      setStatus("Salvando jogador do Top 11...", "loading");

      const result = await apiPost({
        action:"saveTop11CareerV2",
        carreira_id: active?.carreira_id || updated.carreira_id || "",
        carreira_temporada_id: updated.carreira_temporada_id || "",
        temporada: updated.temporada || "",
        mapa_url: updated.mapa_url || TOP11_BG_V3798,
        replace_existing:false,
        rows:[updated]
      });

      if(!result || !result.ok){
        throw new Error(result?.error || "Apps Script não confirmou o salvamento.");
      }

      if(Array.isArray(window.db?.TOP11_CARREIRA)){
        const idx = window.db.TOP11_CARREIRA.findIndex(r=>String(r.id || "") === String(id));
        if(idx >= 0){
          window.db.TOP11_CARREIRA[idx] = Object.assign({}, window.db.TOP11_CARREIRA[idx], updated);
        }
      }

      document.getElementById("fl-top11-player-edit-modal-v3798")?.remove();

      setStatus("Jogador atualizado.", "ok");

      if(typeof FL_renderTop11NewV3797 === "function") FL_renderTop11NewV3797();
      else if(typeof FL_renderTop11NewV3796 === "function") FL_renderTop11NewV3796();
      else if(typeof renderTop11 === "function") renderTop11();
    }catch(err){
      console.error(err);
      setStatus("Erro ao salvar jogador: " + err.message, "error");
    }
  }

  var enhanceCreateTop11Modal = function enhanceCreateTop11Modal(){
    const form =
      document.getElementById("top11-create-form-v3788") ||
      document.getElementById("top11-create-form-v3787");

    if(!form || form.dataset.criadoV3798 === "1") return;
    form.dataset.criadoV3798 = "1";

    const rows = [...form.querySelectorAll(".top11-create-row-v3787,.top11-create-row-v3788")];

    rows.forEach((row, idx)=>{
      if(row.querySelector(`[name="criado_${idx}"]`)) return;

      const criado = document.createElement("select");
      criado.name = `criado_${idx}`;
      criado.className = "top11-created-select-v3798";
      criado.innerHTML = `
        <option value="">API</option>
        <option value="SIM">Criado</option>
      `;
      criado.title = "Se for criado, usa só a foto_url manual e não busca na API.";

      const foto = document.createElement("input");
      foto.name = `foto_url_${idx}`;
      foto.className = "top11-photo-url-v3798";
      foto.placeholder = "Foto URL manual";

      row.appendChild(criado);
      row.appendChild(foto);
    });
  }

  const originalOpenCreate =
    window.FL_openCreateTop11V3795 ||
    window.FL_openCreateTop11V3790 ||
    window.FL_openCreateTop11V3788 ||
    window.FL_openCreateTop11V3787 ||
    null;

  var openCreateTop11WithCreated = function openCreateTop11WithCreated(){
    if(originalOpenCreate) originalOpenCreate();
    setTimeout(enhanceCreateTop11Modal, 120);
    setTimeout(enhanceCreateTop11Modal, 350);
  }

  var saveTop11WithCreatedFromModal = async function saveTop11WithCreatedFromModal(e){
    const btn = e.target.closest("#fl-top11-save-v3787,#fl-top11-save-v3788,button");
    if(!btn) return;

    const modal = btn.closest("#fl-top11-modal-v3787,#fl-top11-modal-v3788");
    if(!modal) return;

    if(!/salvar top 11/i.test(btn.textContent || "") && btn.id !== "fl-top11-save-v3787" && btn.id !== "fl-top11-save-v3788") return;

    const form =
      document.getElementById("top11-create-form-v3788") ||
      document.getElementById("top11-create-form-v3787");

    if(!form) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if(window.FL_TOP11_SAVING_V3798) return;
    window.FL_TOP11_SAVING_V3798 = true;

    try{
      btn.disabled = true;
      btn.textContent = "Salvando...";

      const origins = ["GL","DEF","DEF2","DEF3","DEF4","MEI","MEI5","MEI6","ATA","ATA7","ATA8"];
      const defaults = [
        ["GOL",8,50],["LE",22,20],["ZAG",27,38],["ZAG",27,62],["LD",22,80],
        ["MEI",52,28],["MEI",52,50],["MEI",52,72],
        ["PE",78,28],["CA",84,50],["PD",78,72]
      ];

      const temporada = String(form.temporada?.value || "").trim();
      const carreiraTemporadaId = String(form.carreira_temporada_id?.value || "").trim();

      const rows = [];
      for(let i=0;i<11;i++){
        const jogador = String(form[`jogador_${i}`]?.value || "").trim();
        if(!jogador) continue;

        rows.push({
          carreira_id: active?.carreira_id || "",
          carreira_temporada_id: carreiraTemporadaId,
          temporada,
          posicao_origem: origins[i],
          posicao_tatica: String(form[`posicao_${i}`]?.value || defaults[i][0]).trim(),
          jogador,
          overall: String(form[`overall_${i}`]?.value || "").trim(),
          clube: String(form[`clube_${i}`]?.value || "").trim(),
          pais: String(form[`pais_${i}`]?.value || "").trim(),
          criado: String(form[`criado_${i}`]?.value || "").trim(),
          foto_url: String(form[`foto_url_${i}`]?.value || "").trim(),
          x: defaults[i][1],
          y: defaults[i][2],
          mapa_url: TOP11_BG_V3798
        });
      }

      if(!rows.length){
        setStatus("Preencha pelo menos um jogador.", "error");
        return;
      }

      setStatus("Salvando Top 11...", "loading");

      const result = await apiPost({
        action:"saveTop11CareerV2",
        carreira_id: active?.carreira_id || "",
        carreira_temporada_id: carreiraTemporadaId,
        temporada,
        mapa_url: TOP11_BG_V3798,
        replace_existing:true,
        rows
      });

      if(!result || !result.ok){
        throw new Error(result?.error || "Apps Script não confirmou o salvamento.");
      }

      if(!Array.isArray(window.db.TOP11_CARREIRA)) window.db.TOP11_CARREIRA = [];

      window.db.TOP11_CARREIRA = window.db.TOP11_CARREIRA.filter(r=>{
        const sameCareer = String(r.carreira_id || "") === String(active?.carreira_id || "");
        const sameSeasonId = carreiraTemporadaId && String(r.carreira_temporada_id || "") === String(carreiraTemporadaId);
        const sameSeason = !carreiraTemporadaId && String(r.temporada || "") === String(temporada);
        return !(sameCareer && (sameSeasonId || sameSeason));
      });

      (result.data?.rows || rows).forEach(r=>window.db.TOP11_CARREIRA.push(r));

      modal.remove();
      setStatus("Top 11 salvo.", "ok");

      if(typeof FL_renderTop11NewV3797 === "function") FL_renderTop11NewV3797();
      else if(typeof renderTop11 === "function") renderTop11();
    }catch(err){
      console.error(err);
      setStatus("Erro ao salvar Top 11: " + err.message, "error");
    }finally{
      window.FL_TOP11_SAVING_V3798 = false;
      btn.disabled = false;
      btn.textContent = "Salvar Top 11";
    }
  }

  // Clique no jogador do Top 11 da carreira para editar.
  document.addEventListener("click", function(e){
    const card = e.target.closest(".top11-player-v3796");
    if(!card) return;

    const source = card.dataset.source || "";
    const id = card.dataset.id || "";

    if(source !== "career") return;

    // Em modo de arraste, não abrir edição.
    if(window.FL_TOP11_EDITING_V3787) return;

    e.preventDefault();
    e.stopPropagation();
    openEditTop11PlayerModal(id);
  }, true);

  // Intercepta abertura de + Top11 para adicionar campos Criado/FOTO.
  document.addEventListener("click", function(e){
    const btn = e.target.closest("button");
    if(!btn) return;

    if(/\+\s*top\s*11/i.test(btn.textContent || "")){
      setTimeout(enhanceCreateTop11Modal, 250);
      setTimeout(enhanceCreateTop11Modal, 700);
    }
  }, true);

  // Intercepta salvamento do modal +Top11 para enviar criado/foto_url.
  document.addEventListener("click", saveTop11WithCreatedFromModal, true);

  window.FL_openEditTop11PlayerModalV3798 = openEditTop11PlayerModal;
  window.FL_previewTop11PlayerPhotoV3798 = previewTop11PlayerPhoto;
  window.FL_openCreateTop11V3798 = openCreateTop11WithCreated;
  window.FL_openCreateTop11V3795 = openCreateTop11WithCreated;
  window.FL_openCreateTop11V3790 = openCreateTop11WithCreated;
})();


// ===== V3.8.02 EMERGENCY ROLLBACK =====
// Pacote de segurança: volta à base estável e evita travamento por funções ausentes.
(function(){
  window.addEventListener("error", function(e){
    console.warn("Football Legacy erro capturado sem travar:", e.message);
  });

  window.addEventListener("unhandledrejection", function(e){
    console.warn("Football Legacy promise rejeitada sem travar:", e.reason);
  });

  if(typeof window.FL_SAFE_TOP11_ROLLBACK_V3802 === "undefined"){
    window.FL_SAFE_TOP11_ROLLBACK_V3802 = true;
  }

  // Não altera render, não altera importação, não força API.
  // Este pacote é somente para voltar a carregar estável.
})();

// ===== V3.8.10 — BOLA DE OURO: BOTÕES SUBIR/DESCER TEMPORADA =====
(function(){
  function getSelect(){ return document.getElementById('ballonSeasonSelect'); }

  function getSeasonsSafe(){
    try{
      if(typeof getBallonSeasons === 'function'){
        return (getBallonSeasons() || []).map(String).filter(Boolean);
      }
    }catch(err){ console.warn('Falha getBallonSeasons v3.8.10:', err); }

    const select = getSelect();
    return select ? Array.from(select.options).map(o => String(o.value || '')).filter(Boolean) : [];
  }

  function setSeason(value){
    const select = getSelect();
    if(!select || !value) return;

    try{ activeBallonSeason = value; }catch(err){ window.activeBallonSeason = value; }
    try{ localStorage.setItem('fl_active_ballon_season', value); }catch(err){}

    select.value = value;

    try{ select.dispatchEvent(new Event('change', {bubbles:true})); }catch(err){}

    setTimeout(function(){
      try{ if(typeof renderBolaOuro === 'function') renderBolaOuro(); }catch(e){}
      bindButtons();
    }, 0);
  }

  function move(direction){
    const select = getSelect();
    const seasons = getSeasonsSafe();
    if(!select || !seasons.length) return;

    const current = String(select.value || (typeof getActiveBallonSeason === 'function' ? getActiveBallonSeason() : '') || '');
    let idx = seasons.findIndex(s => String(s) === current);
    if(idx < 0) idx = Math.max(0, select.selectedIndex || 0);

    const nextIdx = Math.min(Math.max(idx + direction, 0), seasons.length - 1);
    if(nextIdx === idx) return;

    setSeason(seasons[nextIdx]);
  }

  function updateState(){
    const select = getSelect();
    const up = document.getElementById('ballonSeasonUpBtn');
    const down = document.getElementById('ballonSeasonDownBtn');
    const seasons = getSeasonsSafe();

    if(!select || !up || !down || !seasons.length){
      if(up) up.disabled = true;
      if(down) down.disabled = true;
      return;
    }

    const current = String(select.value || '');
    let idx = seasons.findIndex(s => String(s) === current);
    if(idx < 0) idx = Math.max(0, select.selectedIndex || 0);

    up.disabled = idx <= 0;
    down.disabled = idx >= seasons.length - 1;
    up.title = up.disabled ? 'Já está na temporada mais alta/recente' : 'Subir uma temporada';
    down.title = down.disabled ? 'Já está na temporada mais baixa/antiga' : 'Descer uma temporada';
  }

  function bindButtons(){
    const select = getSelect();
    if(!select) return;

    const label = select.closest('label') || select.parentElement;
    if(!label) return;

    let box = document.getElementById('ballonSeasonStepControls');
    if(!box){
      box = document.createElement('div');
      box.id = 'ballonSeasonStepControls';
      box.className = 'ballon-season-step-controls-v3810';
      box.innerHTML = '<button type="button" id="ballonSeasonUpBtn" class="ballon-season-step-btn-v3810" aria-label="Subir uma temporada">▲</button><button type="button" id="ballonSeasonDownBtn" class="ballon-season-step-btn-v3810" aria-label="Descer uma temporada">▼</button>';
      label.insertAdjacentElement('afterend', box);
    }

    const up = document.getElementById('ballonSeasonUpBtn');
    const down = document.getElementById('ballonSeasonDownBtn');

    if(up && !up.dataset.boundV3810){
      up.dataset.boundV3810 = '1';
      up.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); move(-1); });
    }
    if(down && !down.dataset.boundV3810){
      down.dataset.boundV3810 = '1';
      down.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); move(1); });
    }
    if(!select.dataset.boundStepV3810){
      select.dataset.boundStepV3810 = '1';
      select.addEventListener('change', function(){ setTimeout(updateState, 0); });
    }

    updateState();
  }

  window.FL_bindBallonSeasonStepButtonsV3810 = bindButtons;
  window.FL_moveBallonSeasonV3810 = move;

  const oldRender = window.renderBolaOuro || (typeof renderBolaOuro === 'function' ? renderBolaOuro : null);
  if(oldRender && !window.__ballonSeasonStepWrappedV3810){
    window.__ballonSeasonStepWrappedV3810 = true;
    window.renderBolaOuro = function(){
      const result = oldRender.apply(this, arguments);
      setTimeout(bindButtons, 0);
      setTimeout(updateState, 20);
      return result;
    };
    try{ renderBolaOuro = window.renderBolaOuro; }catch(err){}
  }

  document.addEventListener('DOMContentLoaded', function(){ setTimeout(bindButtons, 100); });
  document.addEventListener('click', function(e){
    const t = e.target.closest('[data-page], .menu-item, .nav-item, button, a');
    if(!t) return;
    const page = String(t.dataset?.page || '').toLowerCase();
    const txt = String(t.textContent || '').toLowerCase();
    if(page.includes('bola') || txt.includes('bola de ouro')){
      setTimeout(bindButtons, 150);
      setTimeout(bindButtons, 500);
    }
  }, true);
  setTimeout(bindButtons, 300);
})();


// ===== V3.9.0 SELEÇÃO BRASILEIRA (base de jogadores + convocações) =====
let selecaoSeasonId = "";
let selecaoSelectedTeam = null;
let selecaoSlotState = { convocacaoId:null, slots:{}, base:[] };
let selecaoSlotPickerOpenFor = null;

var getSelecaoSeasonRecords = function getSelecaoSeasonRecords(){
  return getCareerSeasonRecords().slice().sort((a,b)=>compareSeasonsDesc(a.temporada,b.temporada));
}

var getSelecaoBaseForSeason = function getSelecaoBaseForSeason(seasonId=selecaoSeasonId){
  return getTable("SELECAO_BASE_TEMPORADA").filter(r=>String(r.carreira_temporada_id)===String(seasonId));
}

var SELECAO_ORDEM_POSICOES = ["GOL","ZAG","LD","LE","VOL","MC","MEI","PD","PE","ATA"];

var normalizarPosicaoSelecao = function normalizarPosicaoSelecao(valor){
  const v = (valor||"").trim().toUpperCase();
  if(v === "CA" || v === "ATACANTE" || v === "CENTROAVANTE") return "ATA";
  return v;
}

// Template padrão de convocação (26 no total): usado como quantidade inicial
// sugerida ao criar uma convocação, ajustável pelo usuário.
var SELECAO_TEMPLATE_26 = {GOL:3, ZAG:4, LD:2, LE:2, VOL:1, MC:2, MEI:2, PD:3, PE:3, ATA:4};

var renderSelecaoBrasileira = function renderSelecaoBrasileira(){
  const select = $("selecaoSeasonSelect");
  if(!select) return;

  const seasons = getSelecaoSeasonRecords();

  if(!seasons.length){
    select.innerHTML = `<option value="">Nenhuma temporada</option>`;
    if($("selecaoBaseGrouped")) $("selecaoBaseGrouped").innerHTML = emptyCard("Crie uma temporada primeiro.");
    return;
  }

  if(!selecaoSeasonId || !seasons.find(s=>String(s.id)===String(selecaoSeasonId))){
    selecaoSeasonId = String(seasons[0].id);
  }

  select.innerHTML = seasons.map(s=>`<option value="${s.id}" ${String(s.id)===String(selecaoSeasonId)?"selected":""}>${escapeHtml(s.temporada||"-")}</option>`).join("");

  select.onchange = ()=>{
    selecaoSeasonId = select.value;
    renderSelecaoBaseGrouped();
  };

  const addBtn = $("selecaoAddJogadorBtn");
  if(addBtn) addBtn.onclick = ()=>openSelecaoJogadorForm();

  const copyBtn = $("selecaoCopyPrevBtn");
  if(copyBtn) copyBtn.onclick = selecaoCopyPrevSeason;

  renderSelecaoBaseGrouped();
}

var selecaoJogadorCardHtml = function selecaoJogadorCardHtml(r){
  return `
    <article class="entity-card">
      <div class="entity-top">
        <div class="selecao-avatar">${r.foto_url ? `<img src="${escapeAttr(r.foto_url)}" onerror="this.parentElement.textContent='⚽'">` : "⚽"}</div>
        <div>
          <h3>${escapeHtml(r.nome||"-")}</h3>
          <small>${r.escudo_time_url ? `<img src="${escapeAttr(r.escudo_time_url)}" style="height:14px;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : ""}${escapeHtml(r.time||"-")} • ${escapeHtml(String(r.idade||"-"))} anos • OVR ${escapeHtml(String(r.overall||"-"))}</small>
        </div>
      </div>
      <small>Convocações: ${r.convocacoes_qtd||0} • Nota média: ${r.nota_media||"-"} • Bom: ${r.bom_qtd||0} • Ruim: ${r.ruim_qtd||0}</small>
      <div class="entity-actions">
        <button onclick="openSelecaoJogadorForm('${r.id}')">Editar</button>
        <button class="delete" onclick="deleteSelecaoJogador('${r.id}')">Excluir</button>
      </div>
    </article>
  `;
}

// FIX V3.9.1: base organizada por posição — goleiros primeiro, depois zagueiros,
// laterais, volantes, meias, atacantes (nessa ordem). Dentro de cada posição os
// jogadores quebram linha normalmente (o "até 7 por linha" é só o efeito natural
// da grade responsiva numa tela cheia). Posições fora da lista conhecida aparecem
// no final, agrupadas por nome.
var renderSelecaoBaseGrouped = function renderSelecaoBaseGrouped(){
  const el = $("selecaoBaseGrouped");
  if(!el) return;

  const rows = getSelecaoBaseForSeason();

  if(!rows.length){
    el.innerHTML = emptyCard("Nenhum jogador na base desta temporada ainda.");
    return;
  }

  const grupos = {};
  rows.forEach(r=>{
    const pos = (r.posicao||"").trim().toUpperCase() || "SEM POSIÇÃO";
    if(!grupos[pos]) grupos[pos] = [];
    grupos[pos].push(r);
  });

  const posicoesPresentes = Object.keys(grupos);
  const ordenadas = SELECAO_ORDEM_POSICOES.filter(p=>posicoesPresentes.includes(p));
  const extras = posicoesPresentes.filter(p=>!SELECAO_ORDEM_POSICOES.includes(p)).sort();
  const ordemFinal = [...ordenadas, ...extras];

  el.innerHTML = ordemFinal.map(pos=>`
    <div class="selecao-posicao-grupo">
      <h4 class="selecao-posicao-titulo">${escapeHtml(pos)} <small>(${grupos[pos].length})</small></h4>
      <div class="cards-list">${grupos[pos].map(selecaoJogadorCardHtml).join("")}</div>
    </div>
  `).join("");
}

var searchTeamsForSelecao = async function searchTeamsForSelecao(){
  const query = $("selecaoTeamSearch")?.value?.trim();
  const results = $("selecaoTeamResults");
  if(!query || !results) return;

  results.innerHTML = `<div class="entity-card"><small>Buscando time...</small></div>`;

  try{
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const json = await res.json();
    const teams = (json.teams||[]).filter(t=>String(t.strSport||"").toLowerCase().includes("soccer"));

    if(!teams.length){
      results.innerHTML = `<div class="entity-card"><small>Nenhum time encontrado. Pode digitar manualmente no campo acima.</small></div>`;
      return;
    }

    results.innerHTML = teams.slice(0,8).map(t=>{
      const team = {name:t.strTeam||"", badge:t.strBadge||""};
      return `<div class="team-result">
        <img src="${team.badge}" onerror="this.style.display='none'">
        <div><strong>${escapeHtml(team.name)}</strong></div>
        <button type="button" onclick='selectSelecaoTeam(${JSON.stringify(team).replace(/'/g,"&apos;")})'>Selecionar</button>
      </div>`;
    }).join("");
  }catch(err){
    results.innerHTML = `<div class="entity-card"><small>Erro ao buscar time na API. Pode digitar manualmente.</small></div>`;
  }
}

var selectSelecaoTeam = function selectSelecaoTeam(team){
  selecaoSelectedTeam = team;
  const box = $("selecaoSelectedTeamBox");
  if(box){
    box.classList.add("active");
    box.innerHTML = `<img src="${team.badge||""}" onerror="this.style.display='none'"><strong>${escapeHtml(team.name||"-")}</strong>`;
  }
}

var buscarFotoAutomaticaSelecao = async function buscarFotoAutomaticaSelecao(){
  const nomeInput = form.querySelector('[name="nome"]');
  const fotoInput = form.querySelector('[name="foto_url"]');
  const fotoPreview = $("selecaoFotoPreview");
  const nome = nomeInput?.value?.trim();

  if(!nome){ setStatus("Digite o nome do jogador antes de buscar a foto.","error"); return; }

  setStatus("Buscando foto...","");
  try{
    const url = await FL_fetchPlayerPhotoV3790(nome);
    if(!url){ setStatus("Nenhuma foto encontrada para esse nome.","error"); return; }
    if(fotoInput) fotoInput.value = url;
    if(fotoPreview) fotoPreview.innerHTML = `<img src="${escapeAttr(url)}" style="width:64px;height:64px;object-fit:cover;border-radius:12px" onerror="this.style.display='none'">`;
    setStatus("Foto encontrada.","ok");
  }catch(err){
    setStatus("Erro ao buscar foto: "+err.message,"error");
  }
}

var openSelecaoJogadorForm = function openSelecaoJogadorForm(existingId=null){
  if(!selecaoSeasonId){ alert("Selecione uma temporada primeiro."); return; }

  const existing = existingId ? getSelecaoBaseForSeason().find(r=>String(r.id)===String(existingId)) : null;
  selecaoSelectedTeam = existing ? {name:existing.time||"", badge:existing.escudo_time_url||""} : null;

  modalTitle.textContent = existing ? "Editar jogador" : "Adicionar jogador à base";
  modalBox.classList.remove("wide");
  form.className = "form-grid";

  form.innerHTML = `
    <div class="form-field"><label>Nome</label><input name="nome" value="${escapeAttr(existing?.nome||"")}" placeholder="Nome do jogador"></div>
    <div class="form-field">
      <label>Time</label>
      <div class="file-row"><input id="selecaoTeamSearch" value="${escapeAttr(existing?.time||"")}" placeholder="Buscar time pela API ou digitar manualmente"><button type="button" class="upload-btn" onclick="searchTeamsForSelecao()">Buscar</button></div>
    </div>
    <div class="selected-team ${selecaoSelectedTeam?"active":""}" id="selecaoSelectedTeamBox">
      ${selecaoSelectedTeam ? `<img src="${escapeAttr(selecaoSelectedTeam.badge||"")}" onerror="this.style.display='none'"><strong>${escapeHtml(selecaoSelectedTeam.name||"-")}</strong>` : ""}
    </div>
    <div class="team-results" id="selecaoTeamResults"></div>
    <div class="form-field">
      <label>Posição</label>
      <input name="posicao" list="selecaoPosicoesList" value="${escapeAttr(existing?.posicao||"")}" placeholder="Ex: GOL, ZAG, LD, LE, VOL, MEI, PD, PE, CA">
      <datalist id="selecaoPosicoesList">
        <option value="GOL"><option value="ZAG"><option value="LD"><option value="LE">
        <option value="VOL"><option value="MC"><option value="MEI"><option value="PD">
        <option value="PE"><option value="ATA">
      </datalist>
    </div>
    <div class="form-field"><label>Idade</label><input name="idade" type="number" value="${escapeAttr(existing?.idade||"")}"></div>
    <div class="form-field"><label>Overall</label><input name="overall" type="number" value="${escapeAttr(existing?.overall||"")}"></div>
    <div class="form-field full">
      <label>Foto do jogador</label>
      <div class="file-row">
        <input name="foto_url" value="${escapeAttr(existing?.foto_url||"")}" placeholder="URL da foto (automática, importada ou colada manualmente)">
        <button type="button" class="upload-btn" onclick="triggerUpload('foto_url')">Importar</button>
        <button type="button" class="ghost-btn" onclick="buscarFotoAutomaticaSelecao()">Buscar automática</button>
      </div>
      <input type="file" id="file_foto_url" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadToCloudinary(event,'foto_url')">
      <div id="selecaoFotoPreview" style="margin-top:8px">${existing?.foto_url ? `<img src="${escapeAttr(existing.foto_url)}" style="width:64px;height:64px;object-fit:cover;border-radius:12px" onerror="this.style.display='none'">` : ""}</div>
    </div>
    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">${existing?"Salvar edição":"Adicionar"}</button>
    </div>
  `;

  const fotoInput = form.querySelector('[name="foto_url"]');
  const fotoPreview = $("selecaoFotoPreview");
  if(fotoInput && fotoPreview){
    fotoInput.addEventListener("input", ()=>{
      const url = fotoInput.value.trim();
      fotoPreview.innerHTML = url ? `<img src="${escapeAttr(url)}" style="width:64px;height:64px;object-fit:cover;border-radius:12px" onerror="this.style.display='none'">` : "";
    });
  }

  form.onsubmit = async e=>{
    e.preventDefault();
    const btn = $("saveBtn");
    if(btn && btn.disabled) return;
    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      if(!data.nome || !data.nome.trim()) throw new Error("Informe o nome do jogador.");

      const typedTeam = ($("selecaoTeamSearch")?.value||"").trim();
      const time = selecaoSelectedTeam?.name || typedTeam || "";
      const escudo = selecaoSelectedTeam?.badge || existing?.escudo_time_url || "";

      let foto = (data.foto_url||"").trim() || existing?.foto_url || "";
      if(!foto){
        try{ foto = await FL_fetchPlayerPhotoV3790(data.nome); }catch(errFoto){}
      }

      const seasonRecord = getSelecaoSeasonRecords().find(s=>String(s.id)===String(selecaoSeasonId)) || {};

      const record = {
        carreira_id: active.carreira_id,
        carreira_temporada_id: selecaoSeasonId,
        temporada: seasonRecord.temporada || "",
        nome: data.nome.trim(),
        time,
        posicao: normalizarPosicaoSelecao(data.posicao),
        idade: data.idade || "",
        overall: data.overall || "",
        foto_url: foto || "",
        escudo_time_url: escudo || "",
        convocacoes_qtd: existing?.convocacoes_qtd || 0,
        nota_media: existing?.nota_media || "",
        bom_qtd: existing?.bom_qtd || 0,
        ruim_qtd: existing?.ruim_qtd || 0,
        status: existing?.status || ""
      };

      const payload = existing
        ? {action:"update", table:"SELECAO_BASE_TEMPORADA", id:existing.id, record}
        : {action:"create", table:"SELECAO_BASE_TEMPORADA", record};

      const res = await apiPost(payload);
      if(!res || !res.ok) throw new Error((res&&res.error)||"Erro ao salvar jogador.");

      clearButtonSaving(btn);
      closeModal();
      await loadData();
      renderSelecaoBaseGrouped();
      setStatus("Jogador salvo na base.","ok");
    }catch(err){
      clearButtonSaving(btn);
      setStatus("Erro ao salvar jogador: "+err.message,"error");
      console.error(err);
    }
  };

  modal.classList.add("active");
}

var deleteSelecaoJogador = async function deleteSelecaoJogador(id){
  if(!confirm("Excluir este jogador da base?")) return;
  try{
    const res = await apiPost({action:"delete", table:"SELECAO_BASE_TEMPORADA", id});
    if(!res || !res.ok) throw new Error((res&&res.error)||"Erro ao excluir.");
    await loadData();
    renderSelecaoBaseGrouped();
    setStatus("Jogador removido da base.","ok");
  }catch(err){
    setStatus("Erro ao excluir jogador: "+err.message,"error");
  }
}

var selecaoCopyPrevSeason = async function selecaoCopyPrevSeason(){
  const seasons = getSelecaoSeasonRecords();
  const idx = seasons.findIndex(s=>String(s.id)===String(selecaoSeasonId));
  const prev = seasons[idx+1];

  if(!prev){ setStatus("Não há temporada anterior para copiar.","error"); return; }
  if(!confirm(`Copiar base de jogadores de ${prev.temporada} para a temporada atual?`)) return;

  try{
    const current = seasons[idx] || {};
    const res = await apiPost({
      action:"copySelecaoBaseAnterior",
      carreira_id: active.carreira_id,
      from_carreira_temporada_id: prev.id,
      to_carreira_temporada_id: selecaoSeasonId,
      to_temporada: current.temporada || ""
    });
    if(!res || !res.ok) throw new Error((res&&res.error)||"Erro ao copiar base.");
    await loadData();
    renderSelecaoBaseGrouped();
    setStatus(`Base copiada de ${prev.temporada} (${res.data?.copiados||0} jogadores).`,"ok");
  }catch(err){
    setStatus("Erro ao copiar base: "+err.message,"error");
  }
}

var gerarConvocacaoPorCriterio = function gerarConvocacaoPorCriterio(qtdPorPosicao, criterio, idadeAlvo, overallBalance){
  const baseTodo = getSelecaoBaseForSeason();
  const escolhidos = [];

  Object.keys(qtdPorPosicao).forEach(posicao=>{
    const qtd = Number(qtdPorPosicao[posicao]) || 0;
    if(qtd <= 0) return;

    const daPosicao = baseTodo
      .filter(r=>(r.posicao||"").trim() === posicao)
      .map(r=>({
        id: r.id,
        nome: r.nome,
        time: r.time,
        idade: r.idade,
        overall: r.overall,
        foto_url: r.foto_url,
        nota_media: r.nota_media,
        convocacoes_qtd: r.convocacoes_qtd,
        peso: Math.max(0.1, num(r.overall) + (num(r.nota_media)*3) - (num(r.convocacoes_qtd)*0.5))
      }));

    let selecionadosDaPosicao = [];

    if(criterio === "aleatoria"){
      // Sorteio ponderado (overall + nota média*3 - convocações*0.5), sem repetir.
      const pool = daPosicao.slice();
      const n = Math.min(qtd, pool.length);
      for(let i=0;i<n;i++){
        const total = pool.reduce((a,p)=>a+p.peso,0);
        let r = Math.random()*total;
        let idx = 0;
        for(;idx<pool.length;idx++){
          r -= pool[idx].peso;
          if(r<=0) break;
        }
        idx = Math.min(idx, pool.length-1);
        selecionadosDaPosicao.push(pool[idx]);
        pool.splice(idx,1);
      }
    }else{
      // Critérios determinísticos: ordena e pega os N primeiros.
      const alvo = num(idadeAlvo);
      const ordenado = daPosicao.slice().sort((a,b)=>{
        if(criterio === "menos_convocados") return num(a.convocacoes_qtd) - num(b.convocacoes_qtd);
        if(criterio === "mais_convocados") return num(b.convocacoes_qtd) - num(a.convocacoes_qtd);
        if(criterio === "melhores_notas") return num(b.nota_media) - num(a.nota_media);
        if(criterio === "piores_notas") return num(a.nota_media) - num(b.nota_media);
        if(criterio === "maiores_overalls") return num(b.overall) - num(a.overall);
        if(criterio === "mais_velhos") return num(b.idade) - num(a.idade);
        if(criterio === "mais_novos") return num(a.idade) - num(b.idade);
        if(criterio === "idade_media"){
          // Equilibra a proximidade da idade alvo com a preferência de overall,
          // sem deixar o overall dominar completamente a escolha por idade.
          const direcao = overallBalance === "maior" ? 1 : (overallBalance === "menor" ? -1 : 0);
          const scoreA = Math.abs(num(a.idade)-alvo) - (direcao * 0.15 * num(a.overall));
          const scoreB = Math.abs(num(b.idade)-alvo) - (direcao * 0.15 * num(b.overall));
          return scoreA - scoreB;
        }
        return 0;
      });
      selecionadosDaPosicao = ordenado.slice(0, qtd);
    }

    escolhidos.push(...selecionadosDaPosicao);
  });

  return escolhidos;
}

var openSelecaoConvocacaoForm = function openSelecaoConvocacaoForm(){
  if(!selecaoSeasonId){ alert("Selecione uma temporada primeiro."); return; }

  modalTitle.textContent = "Nova convocação";
  modalBox.classList.remove("wide");
  form.className = "form-grid";

  form.innerHTML = `
    <div class="form-field"><label>Nome da convocação</label><input name="nome_convocacao" placeholder="Ex: Eliminatórias Junho"></div>
    <div class="form-field"><label>Tipo</label><input name="tipo" placeholder="Ex: Amistoso, Eliminatórias, Copa América, Copa do Mundo"></div>
    <div class="form-field"><label>Competição/Contexto</label><input name="competicao_ou_contexto" placeholder="Opcional"></div>
    <div class="form-field"><label>Data</label><input name="data" type="date"></div>
    <div class="form-field"><label>Modo</label>
      <select name="modo">
        <optgroup label="Manual">
          <option value="manual">Eu escolho cada jogador</option>
        </optgroup>
        <optgroup label="Automática — critério">
          <option value="automatica_aleatoria">Sorteio aleatório (ponderado)</option>
          <option value="automatica_idade_media">Por idade média desejada</option>
          <option value="automatica_maiores_overalls">Maiores overalls</option>
          <option value="automatica_mais_velhos">Só os mais velhos</option>
          <option value="automatica_mais_novos">Só os mais novos</option>
          <option value="automatica_melhores_notas">Melhores notas</option>
          <option value="automatica_piores_notas">Piores notas</option>
          <option value="automatica_menos_convocados">Menos convocados primeiro</option>
          <option value="automatica_mais_convocados">Mais convocados primeiro</option>
        </optgroup>
      </select>
    </div>
    <div class="form-field" id="selecaoIdadeMediaField" style="display:none">
      <label>Idade média desejada</label>
      <input name="idade_media" type="number" min="15" max="45" value="25">
      <small>Escolhe, posição por posição, os jogadores com idade mais próxima da idade escolhida acima. Se faltar jogador exatamente nessa idade, ele pega o mais próximo disponível.</small>
      <label style="margin-top:8px">Também equilibrar com</label>
      <select name="overall_balance">
        <option value="none">Nenhum — só a idade</option>
        <option value="maior">Maior overall possível</option>
        <option value="menor">Menor overall possível</option>
      </select>
      <small>Entre jogadores com idade parecida, prioriza quem tem overall maior (ou menor) — sem abrir mão da idade alvo por completo.</small>
    </div>
    <div class="form-field full" id="selecaoQtdAutoField">
      <label>Quantidade por posição <small id="selecaoQtdTotalLabel" style="font-weight:400"></small></label>
      <div id="selecaoQtdPorPosicaoBox" class="selecao-qtd-lista"></div>
    </div>
    <div class="form-field full"><label>Observações</label><textarea name="observacoes"></textarea></div>
    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button class="gold-btn" id="saveBtn">Criar convocação</button>
    </div>
  `;

  const LIMITE_CONVOCACAO = 26;
  const baseAtual = getSelecaoBaseForSeason();
  const contagemPorPosicao = {};
  baseAtual.forEach(r=>{
    const pos = (r.posicao||"").trim();
    if(!pos) return;
    contagemPorPosicao[pos] = (contagemPorPosicao[pos]||0) + 1;
  });

  const presentes = Object.keys(contagemPorPosicao);
  const ordenadas = SELECAO_ORDEM_POSICOES.filter(p=>presentes.includes(p));
  const extras = presentes.filter(p=>!SELECAO_ORDEM_POSICOES.includes(p)).sort();
  const posicoesDisponiveis = [...ordenadas, ...extras];

  // Template fixo de convocação (26 no total): GOL 3, ZAG 4, LD 2, LE 2, VOL 1,
  // MC 2, MEI 2, PD 3, PE 3, ATA 4. Capado pelo que realmente existe na base.
  const distribuicaoPadrao = {};
  posicoesDisponiveis.forEach(p=>{
    const sugerido = SELECAO_TEMPLATE_26[p] || 0;
    distribuicaoPadrao[p] = Math.min(sugerido, contagemPorPosicao[p]);
  });

  const qtdPorPosicaoBox = $("selecaoQtdPorPosicaoBox");
  const totalLabel = $("selecaoQtdTotalLabel");

  const atualizarTotalLabel = ()=>{
    if(!qtdPorPosicaoBox || !totalLabel) return;
    const total = [...qtdPorPosicaoBox.querySelectorAll("[data-posicao-qtd]")]
      .reduce((a,i)=>a+(Number(i.value)||0), 0);
    totalLabel.textContent = `— ${total} / ${LIMITE_CONVOCACAO} jogadores`;
    totalLabel.style.color = total > LIMITE_CONVOCACAO ? "#f87171" : "var(--muted)";
  };

  if(qtdPorPosicaoBox){
    qtdPorPosicaoBox.innerHTML = posicoesDisponiveis.length
      ? posicoesDisponiveis.map(p=>`
          <div class="selecao-qtd-linha">
            <span class="selecao-qtd-posicao">${escapeHtml(p)}</span>
            <small class="selecao-qtd-disponivel">${contagemPorPosicao[p]} na base</small>
            <input type="number" min="0" max="${contagemPorPosicao[p]}" value="${distribuicaoPadrao[p]}" data-posicao-qtd="${escapeAttr(p)}">
          </div>
        `).join("")
      : "<small>Nenhuma posição cadastrada na base ainda. Adicione jogadores com posição primeiro.</small>";

    qtdPorPosicaoBox.querySelectorAll("[data-posicao-qtd]").forEach(input=>{
      input.addEventListener("input", atualizarTotalLabel);
    });
    atualizarTotalLabel();
  }

  const modoSelect = form.querySelector("[name='modo']");
  const idadeMediaField = $("selecaoIdadeMediaField");
  if(modoSelect && idadeMediaField){
    modoSelect.addEventListener("change", ()=>{
      idadeMediaField.style.display = modoSelect.value === "automatica_idade_media" ? "" : "none";
    });
  }

  form.onsubmit = async e=>{
    e.preventDefault();
    const btn = $("saveBtn");
    if(btn && btn.disabled) return;
    setButtonSaving(btn);

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      if(!data.nome_convocacao || !data.nome_convocacao.trim()) throw new Error("Informe o nome da convocação.");

      const qtdPorPosicao = {};
      (qtdPorPosicaoBox ? [...qtdPorPosicaoBox.querySelectorAll("[data-posicao-qtd]")] : []).forEach(input=>{
        qtdPorPosicao[input.dataset.posicaoQtd] = Number(input.value)||0;
      });

      const totalVagasPedidas = Object.values(qtdPorPosicao).reduce((a,b)=>a+b,0);
      if(totalVagasPedidas > 26){
        throw new Error(`Total de ${totalVagasPedidas} jogadores passa do limite de 26. Ajuste a quantidade por posição.`);
      }

      const seasonRecord = getSelecaoSeasonRecords().find(s=>String(s.id)===String(selecaoSeasonId)) || {};

      const record = {
        carreira_id: active.carreira_id,
        carreira_temporada_id: selecaoSeasonId,
        temporada: seasonRecord.temporada || "",
        nome_convocacao: data.nome_convocacao.trim(),
        tipo: data.tipo || "",
        modo: data.modo || "manual",
        competicao_ou_contexto: data.competicao_ou_contexto || "",
        data: data.data || "",
        observacoes: data.observacoes || ""
      };

      const res = await apiPost({action:"create", table:"SELECAO_CONVOCACOES", record});
      if(!res || !res.ok) throw new Error((res&&res.error)||"Erro ao criar convocação.");

      const convocacaoId = res.data.id;

      if(data.modo && data.modo.startsWith("automatica")){
        const criterio = data.modo.replace("automatica_","") || "aleatoria";
        const escolhidos = gerarConvocacaoPorCriterio(qtdPorPosicao, criterio, data.idade_media, data.overall_balance);

        if(!escolhidos.length){
          throw new Error("Nenhum jogador escolhido — defina a quantidade por posição (maior que zero).");
        }

        const r2 = await apiPost({
          action:"saveSelecaoConvocados",
          convocacao_id: convocacaoId,
          jogadores: escolhidos.map(j=>({
            jogador_base_id: j.id,
            nome: j.nome,
            time: j.time,
            idade_na_convocacao: j.idade,
            overall_na_convocacao: j.overall
          }))
        });
        if(!r2 || !r2.ok) throw new Error((r2&&r2.error)||"Erro ao salvar convocados.");

        clearButtonSaving(btn);
        closeModal();
        await loadData();
        renderSelecaoConvocacoesList();
        const faltou = totalVagasPedidas - escolhidos.length;
        setStatus(
          faltou > 0
            ? `Convocação criada com ${escolhidos.length} jogadores (faltaram ${faltou} — não havia gente suficiente na base para alguma posição).`
            : `Convocação criada com ${escolhidos.length} jogadores.`,
          faltou > 0 ? "error" : "ok"
        );
      }else{
        const totalVagas = Object.values(qtdPorPosicao).reduce((a,b)=>a+b,0);
        if(totalVagas <= 0){
          throw new Error("Defina quantas vagas por posição você quer preencher (maior que zero).");
        }

        clearButtonSaving(btn);
        closeModal();
        await loadData();
        renderSelecaoConvocacoesList();
        openSelecaoConvocadosSlotPicker(convocacaoId, qtdPorPosicao);
      }
    }catch(err){
      clearButtonSaving(btn);
      setStatus("Erro ao criar convocação: "+err.message,"error");
      console.error(err);
    }
  };

  modal.classList.add("active");
}

var openSelecaoConvocadosSlotPicker = function openSelecaoConvocadosSlotPicker(convocacaoId, qtdPorPosicaoOpcional){
  const base = getSelecaoBaseForSeason();
  const existingConvocados = getTable("SELECAO_CONVOCADOS").filter(c=>String(c.convocacao_id)===String(convocacaoId));

  // Se não veio quantidade por posição (ex: reabrindo uma convocação já existente
  // pra editar), deduz a partir de quantos jogadores já convocados existem em cada posição.
  let qtdPorPosicao = qtdPorPosicaoOpcional;
  const existingByPos = {};
  existingConvocados.forEach(c=>{
    const jogador = base.find(b=>String(b.id)===String(c.jogador_base_id));
    const pos = jogador ? ((jogador.posicao||"").trim() || "SEM POSIÇÃO") : "SEM POSIÇÃO";
    if(!existingByPos[pos]) existingByPos[pos] = [];
    existingByPos[pos].push(String(c.jogador_base_id));
  });

  if(!qtdPorPosicao){
    qtdPorPosicao = {};
    Object.keys(existingByPos).forEach(pos=>{ qtdPorPosicao[pos] = existingByPos[pos].length; });
  }

  const slots = {};
  Object.keys(qtdPorPosicao).forEach(pos=>{
    const qtd = Number(qtdPorPosicao[pos])||0;
    if(qtd<=0) return;
    const jaConvocados = existingByPos[pos] || [];
    const arr = [];
    for(let i=0;i<qtd;i++) arr.push(jaConvocados[i] || null);
    slots[pos] = arr;
  });

  selecaoSlotState = { convocacaoId, slots, base };
  selecaoSlotPickerOpenFor = null;

  modalTitle.textContent = "Escolher jogadores convocados";
  modalBox.classList.add("wide");
  form.className = "form-grid";

  form.innerHTML = `
    <div id="selecaoSlotsContainer"></div>
    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Fechar</button>
      <button class="gold-btn" type="button" id="saveSlotsBtn" onclick="salvarSlotsConvocacao()">Salvar convocados</button>
    </div>
  `;

  renderSelecaoSlotsUI();
  modal.classList.add("active");
}

var renderSelecaoSlotsUI = function renderSelecaoSlotsUI(){
  const container = $("selecaoSlotsContainer");
  if(!container) return;

  const { slots, base } = selecaoSlotState;
  const posicoesComVaga = Object.keys(slots);

  if(!posicoesComVaga.length){
    container.innerHTML = emptyCard("Nenhuma vaga definida. Feche e crie a convocação novamente definindo quantidade por posição.");
    return;
  }

  const ordenadas = SELECAO_ORDEM_POSICOES.filter(p=>posicoesComVaga.includes(p));
  const extras = posicoesComVaga.filter(p=>!SELECAO_ORDEM_POSICOES.includes(p)).sort();
  const ordemFinal = [...ordenadas, ...extras];

  container.innerHTML = ordemFinal.map(pos=>{
    const arr = slots[pos];
    const preenchidos = arr.filter(Boolean).length;

    const slotsHtml = arr.map((jogId, idx)=>{
      const jogador = jogId ? base.find(b=>String(b.id)===String(jogId)) : null;

      if(jogador){
        return `<div class="selecao-slot filled">
          <div class="selecao-avatar" style="width:56px;height:56px">${jogador.foto_url?`<img src="${escapeAttr(jogador.foto_url)}" onerror="this.parentElement.textContent='⚽'">`:"⚽"}</div>
          <strong>${escapeHtml(jogador.nome||"-")}</strong>
          <small>${escapeHtml(jogador.time||"-")} • OVR ${escapeHtml(String(jogador.overall||"-"))}</small>
          <div class="selecao-slot-actions">
            <button type="button" onclick="abrirEscolhaSlot('${escapeAttr(pos)}',${idx})">Trocar</button>
            <button type="button" class="delete" onclick="removerSlotConvocacao('${escapeAttr(pos)}',${idx})">Remover</button>
          </div>
        </div>`;
      }

      return `<button type="button" class="selecao-slot empty" onclick="abrirEscolhaSlot('${escapeAttr(pos)}',${idx})">+ Escolher</button>`;
    }).join("");

    const painelCandidatos = (selecaoSlotPickerOpenFor && selecaoSlotPickerOpenFor.posicao===pos)
      ? renderSelecaoCandidatosHtml(pos)
      : "";

    return `
      <div class="selecao-posicao-grupo">
        <h4 class="selecao-posicao-titulo">${escapeHtml(pos)} <small>(${preenchidos}/${arr.length})</small></h4>
        <div class="selecao-slots-row">${slotsHtml}</div>
        ${painelCandidatos}
      </div>
    `;
  }).join("");
}

var renderSelecaoCandidatosHtml = function renderSelecaoCandidatosHtml(pos){
  const { slots, base } = selecaoSlotState;
  const idxAberto = selecaoSlotPickerOpenFor.index;

  const usados = new Set();
  Object.entries(slots).forEach(([p,arr])=>{
    arr.forEach((id,i)=>{
      if(id && !(p===pos && i===idxAberto)) usados.add(String(id));
    });
  });

  const candidatos = base.filter(r=>((r.posicao||"").trim()===pos) && !usados.has(String(r.id)));

  return `<div class="selecao-candidatos-panel">
    ${candidatos.map(c=>`
      <button type="button" class="selecao-candidato-card" onclick="escolherCandidatoSlot('${c.id}')">
        <div class="selecao-avatar" style="width:48px;height:48px">${c.foto_url?`<img src="${escapeAttr(c.foto_url)}" onerror="this.parentElement.textContent='⚽'">`:"⚽"}</div>
        <div><strong>${escapeHtml(c.nome||"-")}</strong><br><small>${escapeHtml(c.time||"-")} • OVR ${escapeHtml(String(c.overall||"-"))}</small></div>
      </button>
    `).join("") || "<small>Nenhum jogador disponível nessa posição (todos já usados em outra vaga, ou base vazia).</small>"}
    <button type="button" class="ghost-btn" onclick="fecharEscolhaSlot()">Cancelar</button>
  </div>`;
}

var abrirEscolhaSlot = function abrirEscolhaSlot(pos, idx){
  selecaoSlotPickerOpenFor = {posicao:pos, index:idx};
  renderSelecaoSlotsUI();
}

var fecharEscolhaSlot = function fecharEscolhaSlot(){
  selecaoSlotPickerOpenFor = null;
  renderSelecaoSlotsUI();
}

var escolherCandidatoSlot = function escolherCandidatoSlot(jogadorId){
  if(!selecaoSlotPickerOpenFor) return;
  const {posicao, index} = selecaoSlotPickerOpenFor;
  selecaoSlotState.slots[posicao][index] = jogadorId;
  selecaoSlotPickerOpenFor = null;
  renderSelecaoSlotsUI();
}

var removerSlotConvocacao = function removerSlotConvocacao(pos, idx){
  selecaoSlotState.slots[pos][idx] = null;
  renderSelecaoSlotsUI();
}

var salvarSlotsConvocacao = async function salvarSlotsConvocacao(){
  const btn = $("saveSlotsBtn");
  if(btn && btn.disabled) return;
  setButtonSaving(btn);

  try{
    const { convocacaoId, slots, base } = selecaoSlotState;
    const jogadorIds = [];
    Object.values(slots).forEach(arr=>arr.forEach(id=>{ if(id) jogadorIds.push(id); }));

    const selecionados = base.filter(r=>jogadorIds.includes(String(r.id)) || jogadorIds.includes(r.id));

    const res = await apiPost({
      action:"saveSelecaoConvocados",
      convocacao_id: convocacaoId,
      jogadores: selecionados.map(j=>({
        jogador_base_id: j.id,
        nome: j.nome,
        time: j.time,
        idade_na_convocacao: j.idade,
        overall_na_convocacao: j.overall
      }))
    });
    if(!res || !res.ok) throw new Error((res&&res.error)||"Erro ao salvar convocados.");

    clearButtonSaving(btn);
    closeModal();
    await loadData();
    renderSelecaoConvocacoesList();
    setStatus(`${selecionados.length} jogadores convocados salvos.`,"ok");
  }catch(err){
    clearButtonSaving(btn);
    setStatus("Erro ao salvar convocados: "+err.message,"error");
    console.error(err);
  }
}

var renderSelecaoConvocacoesPage = function renderSelecaoConvocacoesPage(){
  const select = $("selecaoConvSeasonSelect");
  if(!select) return;

  const seasons = getSelecaoSeasonRecords();

  if(!seasons.length){
    select.innerHTML = `<option value="">Nenhuma temporada</option>`;
    if($("selecaoConvocacoesList")) $("selecaoConvocacoesList").innerHTML = emptyCard("Crie uma temporada primeiro.");
    return;
  }

  if(!selecaoSeasonId || !seasons.find(s=>String(s.id)===String(selecaoSeasonId))){
    selecaoSeasonId = String(seasons[0].id);
  }

  select.innerHTML = seasons.map(s=>`<option value="${s.id}" ${String(s.id)===String(selecaoSeasonId)?"selected":""}>${escapeHtml(s.temporada||"-")}</option>`).join("");

  select.onchange = ()=>{
    selecaoSeasonId = select.value;
    renderSelecaoConvocacoesList();
  };

  const novaConvBtn = $("selecaoNovaConvocacaoBtn");
  if(novaConvBtn) novaConvBtn.onclick = ()=>openSelecaoConvocacaoForm();

  renderSelecaoConvocacoesList();
}

var SELECAO_MODO_LABELS = {
  manual: "Manual",
  automatica_aleatoria: "Sorteio aleatório",
  automatica_menos_convocados: "Menos convocados primeiro",
  automatica_mais_convocados: "Mais convocados primeiro",
  automatica_melhores_notas: "Melhores notas",
  automatica_piores_notas: "Piores notas",
  automatica_maiores_overalls: "Maiores overalls",
  automatica_mais_velhos: "Só os mais velhos",
  automatica_mais_novos: "Só os mais novos",
  automatica_idade_media: "Por idade média"
};

var formatSelecaoModo = function formatSelecaoModo(modo){
  return SELECAO_MODO_LABELS[modo] || modo || "-";
}

var formatSelecaoData = function formatSelecaoData(dataStr){
  const raw = String(dataStr||"").trim();
  if(!raw) return "";
  // Aceita tanto "2026-01-20" quanto timestamps ISO completos ("2026-01-20T08:00:00.000Z").
  const soData = raw.split("T")[0];
  const partes = soData.split("-");
  if(partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return soData;
}

var renderSelecaoConvocacoesList = function renderSelecaoConvocacoesList(){
  const el = $("selecaoConvocacoesList");
  if(!el) return;

  const convocacoes = getTable("SELECAO_CONVOCACOES").filter(c=>String(c.carreira_temporada_id)===String(selecaoSeasonId));
  const baseTodo = getTable("SELECAO_BASE_TEMPORADA");

  el.innerHTML = convocacoes.map(c=>{
    const convocados = getTable("SELECAO_CONVOCADOS").filter(j=>String(j.convocacao_id)===String(c.id));

    // Junta cada convocado com os dados da base (foto, escudo, posição) pelo jogador_base_id.
    const convocadosComBase = convocados.map(j=>{
      const jogadorBase = baseTodo.find(b=>String(b.id)===String(j.jogador_base_id));
      return {
        convocadoId: j.id,
        nome: j.nome || (jogadorBase && jogadorBase.nome) || "-",
        time: j.time || (jogadorBase && jogadorBase.time) || "-",
        overall: j.overall_na_convocacao || (jogadorBase && jogadorBase.overall) || "-",
        idade: j.idade_na_convocacao || (jogadorBase && jogadorBase.idade) || "",
        posicao: (jogadorBase && jogadorBase.posicao) || "SEM POSIÇÃO",
        foto_url: jogadorBase ? jogadorBase.foto_url : "",
        escudo_time_url: jogadorBase ? jogadorBase.escudo_time_url : "",
        nota: j.nota, foi_bem: j.foi_bem, foi_mal: j.foi_mal, observacao: j.observacao
      };
    });

    const grupos = {};
    convocadosComBase.forEach(j=>{
      if(!grupos[j.posicao]) grupos[j.posicao] = [];
      grupos[j.posicao].push(j);
    });
    const presentes = Object.keys(grupos);
    const ordenadas = SELECAO_ORDEM_POSICOES.filter(p=>presentes.includes(p));
    const extras = presentes.filter(p=>!SELECAO_ORDEM_POSICOES.includes(p)).sort();
    const ordemFinal = [...ordenadas, ...extras];

    const rosterHtml = ordemFinal.map(pos=>`
      <div class="selecao-posicao-grupo">
        <h4 class="selecao-posicao-titulo">${escapeHtml(pos)} <small>(${grupos[pos].length})</small></h4>
        <div class="selecao-conv-lista">
          ${grupos[pos].map(j=>`
            <div class="selecao-conv-jogador">
              <strong class="selecao-conv-nome">${escapeHtml(j.nome)}</strong>
              <div class="selecao-conv-linha">
                <div class="selecao-avatar" style="width:34px;height:34px">${j.foto_url ? `<img src="${escapeAttr(j.foto_url)}" onerror="this.parentElement.textContent='⚽'">` : "⚽"}</div>
                <span class="selecao-conv-time">${j.escudo_time_url ? `<img src="${escapeAttr(j.escudo_time_url)}" style="height:11px;vertical-align:middle;margin-right:3px" onerror="this.style.display='none'">` : ""}${escapeHtml(j.time)} · ${escapeHtml(String(j.overall))}</span>
                <input name="nota_${j.convocadoId}" type="number" step="0.1" placeholder="Nota" title="Nota">
                <label title="Foi bem"><input type="checkbox" name="bem_${j.convocadoId}">👍</label>
                <label title="Foi mal"><input type="checkbox" name="mal_${j.convocadoId}">👎</label>
                <input name="obs_${j.convocadoId}" placeholder="Observação" title="Observação">
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("") || "<small>Nenhum jogador convocado ainda. Clique em \"Editar convocados\" para escolher.</small>";

    const idadeMediaConv = convocadosComBase.length
      ? Math.round((convocadosComBase.reduce((a,j)=>a+num(j.idade),0)/convocadosComBase.length)*10)/10
      : null;
    const overallMedioConv = convocadosComBase.length
      ? Math.round((convocadosComBase.reduce((a,j)=>a+num(j.overall),0)/convocadosComBase.length)*10)/10
      : null;

    return `
      <article class="entity-card">
        <div class="selecao-conv-header">
          <div>
            <h2 class="selecao-conv-titulo">${escapeHtml(c.nome_convocacao||"-")}</h2>
            <small class="selecao-conv-sub">${escapeHtml(c.tipo||"-")}${c.tipo&&c.modo?" • ":""}${escapeHtml(formatSelecaoModo(c.modo))}${c.competicao_ou_contexto?` • ${escapeHtml(c.competicao_ou_contexto)}`:""}</small>
          </div>
          <div class="selecao-conv-medias">
            ${idadeMediaConv!==null ? `<div class="selecao-conv-media-box"><strong>${idadeMediaConv}</strong><span>Idade média</span></div>` : ""}
            ${overallMedioConv!==null ? `<div class="selecao-conv-media-box"><strong>${overallMedioConv}</strong><span>Overall médio</span></div>` : ""}
          </div>
        </div>

        <div id="convocadosGrid_${c.id}">${rosterHtml}</div>

        <div class="entity-actions">
          <button onclick="openSelecaoConvocadosSlotPicker('${c.id}')">Editar convocados</button>
          <button onclick="saveConvocacaoNotas('${c.id}')">Salvar notas</button>
          <button class="delete" onclick="deleteSelecaoConvocacao('${c.id}')">Excluir</button>
        </div>
      </article>
    `;
  }).join("") || emptyCard("Nenhuma convocação nesta temporada ainda.");

  // Preenche os valores atuais depois de montar o HTML (evita problema de aspas em atributos).
  convocacoes.forEach(c=>{
    const grid = document.getElementById("convocadosGrid_"+c.id);
    if(!grid) return;
    getTable("SELECAO_CONVOCADOS").filter(j=>String(j.convocacao_id)===String(c.id)).forEach(j=>{
      const notaInput = grid.querySelector(`[name="nota_${j.id}"]`);
      const bemInput = grid.querySelector(`[name="bem_${j.id}"]`);
      const malInput = grid.querySelector(`[name="mal_${j.id}"]`);
      const obsInput = grid.querySelector(`[name="obs_${j.id}"]`);
      if(notaInput) notaInput.value = j.nota || "";
      if(bemInput) bemInput.checked = (j.foi_bem===true||j.foi_bem==="true"||j.foi_bem==="SIM"||j.foi_bem==="sim");
      if(malInput) malInput.checked = (j.foi_mal===true||j.foi_mal==="true"||j.foi_mal==="SIM"||j.foi_mal==="sim");
      if(obsInput) obsInput.value = j.observacao || "";
    });
  });
}

var saveConvocacaoNotas = async function saveConvocacaoNotas(convocacaoId){
  const grid = document.getElementById("convocadosGrid_"+convocacaoId);
  if(!grid) return;

  const convocados = getTable("SELECAO_CONVOCADOS").filter(j=>String(j.convocacao_id)===String(convocacaoId));

  const notas = convocados.map(j=>{
    const notaInput = grid.querySelector(`[name="nota_${j.id}"]`);
    const bemInput = grid.querySelector(`[name="bem_${j.id}"]`);
    const malInput = grid.querySelector(`[name="mal_${j.id}"]`);
    const obsInput = grid.querySelector(`[name="obs_${j.id}"]`);

    return {
      id: j.id,
      nota: notaInput ? notaInput.value : "",
      foi_bem: bemInput ? bemInput.checked : false,
      foi_mal: malInput ? malInput.checked : false,
      observacao: obsInput ? obsInput.value : ""
    };
  });

  try{
    const res = await apiPost({action:"updateNotasConvocacao", notas});
    if(!res || !res.ok) throw new Error((res&&res.error)||"Erro ao salvar notas.");
    await loadData();
    renderSelecaoConvocacoesList();
    setStatus("Notas da convocação salvas. Base atualizada.","ok");
  }catch(err){
    setStatus("Erro ao salvar notas: "+err.message,"error");
  }
}

var deleteSelecaoConvocacao = async function deleteSelecaoConvocacao(id){
  if(!confirm("Excluir esta convocação? Isso também remove os jogadores convocados dela.")) return;
  try{
    const res = await apiPost({action:"deleteSelecaoConvocacaoCascata", id});
    if(!res || !res.ok) throw new Error((res&&res.error)||"Erro ao excluir.");
    await loadData();
    renderSelecaoConvocacoesList();
    setStatus("Convocação e seus convocados excluídos.","ok");
  }catch(err){
    setStatus("Erro ao excluir convocação: "+err.message,"error");
  }
}

window.openSelecaoJogadorForm = openSelecaoJogadorForm;
window.buscarFotoAutomaticaSelecao = buscarFotoAutomaticaSelecao;
window.deleteSelecaoJogador = deleteSelecaoJogador;
window.searchTeamsForSelecao = searchTeamsForSelecao;
window.selectSelecaoTeam = selectSelecaoTeam;
window.openSelecaoConvocacaoForm = openSelecaoConvocacaoForm;
window.openSelecaoConvocadosSlotPicker = openSelecaoConvocadosSlotPicker;
window.abrirEscolhaSlot = abrirEscolhaSlot;
window.fecharEscolhaSlot = fecharEscolhaSlot;
window.escolherCandidatoSlot = escolherCandidatoSlot;
window.removerSlotConvocacao = removerSlotConvocacao;
window.salvarSlotsConvocacao = salvarSlotsConvocacao;
window.saveConvocacaoNotas = saveConvocacaoNotas;
window.deleteSelecaoConvocacao = deleteSelecaoConvocacao;
window.renderSelecaoBrasileira = renderSelecaoBrasileira;
window.renderSelecaoConvocacoesPage = renderSelecaoConvocacoesPage;
window.renderSelecaoBaseGrouped = renderSelecaoBaseGrouped;
