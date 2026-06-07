console.log('Football Legacy script carregado v3.7.76 ballon selector stable');
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
  personagem:[["carreira_id","ID da carreira","number"],["tipo","Tipo","select",["protagonista","coadjuvante","real"]],["nome","Nome","text"],["foto","Foto URL","fileurl"],["posicao","Posição","text"],["nacionalidade","Nacionalidade","text"]],
  clube:[["nome","Nome","text"],["pais","País","text"],["escudo","Escudo URL","fileurl"],["estadio","Estádio","text"]],
  competicao:[["nome","Nome","text"]],
  campeao:[["competicao_id","ID da competição","number"],["temporada","Temporada","text"],["clube","Clube campeão","text"],["artilheiro","Artilheiro","text"],["lider_assistencias","Líder assistências","text"],["melhor_jogador","Melhor jogador","text"]],
  estatistica:[["personagem_id","ID do personagem","number"],["competicao_id","ID da competição","number"],["temporada","Temporada","text"],["jogos","Jogos","number"],["gols","Gols","number"],["assistencias","Assistências","number"],["cartoes","Cartões","number"],["media_geral","Nota geral","text"]],
  top11:[["temporada","Temporada","text"],["posicao","Posição","text"],["jogador","Jogador","text"],["overall","Overall","number"]],
  bolaouro:[["temporada","Temporada","text"],["posicao","Posição","number"],["jogador","Jogador","text"],["idade","Idade","number"],["valor_mercado","Valor de mercado","text"],["nacionalidade","Nacionalidade / Bandeira","text"],["overall","Overall","number"],["imagem_destaque_url","Imagem destaque do vencedor","fileurl"]],
  bolaourobase:[["temporada_base_id","ID temporada base","number"],["temporada","Temporada","text"],["ano","Ano","number"],["posicao","Posição","number"],["jogador","Jogador","text"],["pais","País","text"],["clube","Clube","text"],["idade_na_premiacao","Idade","number"],["valor_mercado","Valor de mercado","text"],["imagem_url","Imagem URL","fileurl"]],
  midia:[["carreira_id","ID da carreira","number"],["temporada","Temporada","text"],["tipo","Tipo","select",["imagem","video"]],["titulo","Título","text"],["descricao","Descrição","textarea"],["url","URL","fileurl"]]
};

const pageTitles = {dashboard:"Resumo",personagens:"Personagens",estatisticas:"Estatísticas",trofeus:"Troféus",top11:"Top 11",bolaouro:"Bola de Ouro",clubes:"Clubes",museu:"Museu"};

function $(id){return document.getElementById(id)}

function jsonpRequest(url, timeoutMs = 20000){
  return new Promise((resolve, reject)=>{
    const callbackName = "__fl_jsonp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const separator = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    const timeout = setTimeout(()=>{
      cleanup();
      reject(new Error("Tempo esgotado carregando Apps Script via JSONP"));
    }, timeoutMs);

    function cleanup(){
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
function bind(id,event,handler){
  const el = $(id);
  if(el) el.addEventListener(event, handler);
}
function setClick(id,handler){
  bind(id,"click",handler);
}
function setStatus(msg,type=""){const el=$("statusBar"); if(el){el.textContent=msg; el.className="status-bar "+type}}
function setText(id,v){const el=$(id); if(el) el.textContent=v}
function num(v){const n=Number(String(v||"").replace(",", ".")); return isNaN(n)?0:n}
function getTable(name){return db[name]||[]}
function byId(table,id){return getTable(table).find(x=>String(x.id)===String(id))}
function initials(name){return String(name||"FL").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}
function compName(id){const c=byId("COMPETICOES",id); return c?c.nome:(id||"-")}
function personagemName(id){const p=byId("PERSONAGENS",id); return p?p.nome:(id||"-")}
function getUserUniverses(uid){return getTable("UNIVERSOS").filter(u=>String(u.usuario_id)===String(uid))}
function getCareersForUser(uid){const ids=getUserUniverses(uid).map(u=>String(u.id)); return getTable("CARREIRAS").filter(c=>ids.includes(String(c.universo_id)))}
function getActiveUser(){return byId("USUARIOS",active.usuario_id)||getTable("USUARIOS")[0]}
function getActiveCareer(){return byId("CARREIRAS",active.carreira_id)||getCareersForUser(active.usuario_id)[0]||getTable("CARREIRAS")[0]}
function getCareerCharacters(){const c=getActiveCareer(); return c?getTable("PERSONAGENS").filter(p=>String(p.carreira_id)===String(c.id)):[]}
function getActiveProtagonist(){return byId("PERSONAGENS",active.protagonista_id)||getCareerCharacters().find(p=>p.tipo==="protagonista")||getCareerCharacters()[0]}
function getCareerSeasons(){const c=getActiveCareer(); return c?getTable("TEMPORADAS").filter(t=>String(t.carreira_id)===String(c.id)):[]}
function getCareerMedia(){const c=getActiveCareer(); return c?getTable("MIDIAS").filter(m=>String(m.carreira_id)===String(c.id)):[]}
function getProtagonistStats(){const p=getActiveProtagonist(); return p?getTable("ESTATISTICAS").filter(s=>String(s.personagem_id)===String(p.id)):[]}
function saveActive(){Object.entries(active).forEach(([k,v])=>localStorage.setItem("fl_active_"+k, v||""))}

function ensureActive(){
  const users=getTable("USUARIOS"); if(!active.usuario_id&&users[0]) active.usuario_id=String(users[0].id);
  let careers=getCareersForUser(active.usuario_id); if(!careers.length) careers=getTable("CARREIRAS");
  if(!active.carreira_id&&careers[0]) active.carreira_id=String(careers[0].id);
  const chars=getCareerCharacters(); if(!active.protagonista_id&&chars[0]) active.protagonista_id=String(chars[0].id);
  saveActive();
}

function escapeAttr(value){
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function seasonKey(value){const m=String(value||"").match(/\d{4}/g); return m?Number(m[m.length-1]):0}
function compareSeasonsDesc(a,b){return seasonKey(b)-seasonKey(a)}
function getAvailableSeasonsForActivePlayer(){
  const stats=getProtagonistStats().map(s=>s.temporada).filter(Boolean);
  const seasons=getCareerSeasons().map(s=>s.temporada).filter(Boolean);
  return [...new Set([...stats,...seasons])].sort(compareSeasonsDesc);
}
function getCurrentSeason(stats=getProtagonistStats()){
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

function normalizeDbAfterLoad(){
  if(!db || typeof db !== "object") db = {};
  Object.keys(db).forEach(k=>{
    if(!Array.isArray(db[k])) db[k] = [];
  });
}

async function fetchApiAction(action){
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

function mergeDb(partial){
  if(!db || typeof db !== "object") db = {};
  Object.keys(partial || {}).forEach(k=>{
    db[k] = Array.isArray(partial[k]) ? partial[k] : [];
  });
  normalizeDbAfterLoad();
}

function renderOnlyResumoAfterSummary(){
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

async function loadData(options={}){
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

async function forceRefreshData(){
  await loadData({force:true});
}

window.forceRefreshData = forceRefreshData;


async function apiPost(payload){
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

function getCurrentPageId(){
  const activePage = document.querySelector(".page.active");
  return activePage ? activePage.id : (currentPageId || "resumo");
}

function renderGlobalSelectorsOnly(){
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
}

function renderResumoFast(){
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

function renderPageById(pageId, force=false){
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

function renderAll(){
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



function renderSelectors(){
  const users=getTable("USUARIOS");
  if($("userSelect")) $("userSelect").innerHTML=users.map(u=>`<option value="${u.id}" ${String(u.id)===String(active.usuario_id)?"selected":""}>${u.nome||"Usuário "+u.id}</option>`).join("")||`<option>Nenhum usuário</option>`;
  let careers=getCareersForUser(active.usuario_id); if(!careers.length) careers=getTable("CARREIRAS");
  if($("careerSelect")) $("careerSelect").innerHTML=careers.map(c=>`<option value="${c.id}" ${String(c.id)===String(active.carreira_id)?"selected":""}>${c.nome||"Carreira "+c.id}</option>`).join("")||`<option>Nenhuma carreira</option>`;
  const chars=getCareerCharacters();
  if($("protagonistSelect")) $("protagonistSelect").innerHTML=chars.map(p=>`<option value="${p.id}" ${String(p.id)===String(active.protagonista_id)?"selected":""}>${p.nome||"Personagem "+p.id}</option>`).join("")||`<option>Nenhum personagem</option>`;
}

function renderSeasonSelector(){
  const select=$("seasonSelect"); if(!select) return;
  const seasons=getAvailableSeasonsForActivePlayer();
  const current=getCurrentSeason();
  select.innerHTML=seasons.length?seasons.map(s=>`<option value="${s}" ${s===current?"selected":""}>${s}</option>`).join(""):`<option value="">-</option>`;
  select.value=current||"";
  select.onchange=e=>{active.temporada=e.target.value;saveActive();renderDashboard();renderPlayedSeasons();renderStats()};
}

function renderDashboard(){
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

function setPlayerPhoto(p){
  const img=$("mainPlayerPhoto"), fallback=$("mainInitials"); if(!img||!fallback)return;
  const url=p&&p.foto?String(p.foto).trim():"";
  img.onload=()=>{img.classList.add("visible");fallback.classList.add("hidden")};
  img.onerror=()=>{img.classList.remove("visible");fallback.classList.remove("hidden");fallback.textContent=initials(p?p.nome:"FL")};
  if(url){img.src=url}else{img.removeAttribute("src");img.classList.remove("visible");fallback.classList.remove("hidden");fallback.textContent=initials(p?p.nome:"FL")}
}



function setButtonSaving(btn, label="Salvando..."){
  if(!btn) return;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.disabled = true;
  btn.classList.add("saving");
  btn.textContent = label;
}

function clearButtonSaving(btn){
  if(!btn) return;
  btn.disabled = false;
  btn.classList.remove("saving");
  if(btn.dataset.originalText){
    btn.textContent = btn.dataset.originalText;
    delete btn.dataset.originalText;
  }
}

// ===== V3.6 SEASON STINTS / PASSAGENS POR TIME =====
function monthYearToSeason(value){
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

function getCareerSeasonRecords(){
  const carreira = getActiveCareer();
  if(!carreira) return [];

  const nova = getTable("CARREIRA_TEMPORADAS")
    .filter(t=>String(t.carreira_id)===String(carreira.id));

  if(nova.length) return nova;

  return getTable("TEMPORADAS")
    .filter(t=>String(t.carreira_id)===String(carreira.id));
}

function getSeasonRecordLabel(row){
  const inicio = row.data_inicio || row.periodo_inicio || "";
  const fim = row.data_fim || row.periodo_fim || "";
  const periodo = inicio || fim ? ` • ${inicio || "?"} até ${fim || "?"}` : "";
  return `${row.temporada || "-"} • ${row.clube_nome || row.time || "-"}${periodo}`;
}

function getCompetitionsFromSeasonRecord(row){
  return String(row.competicoes || "")
    .split(",")
    .map(x=>x.trim())
    .filter(Boolean);
}

function findCompetitionIdByName(name){
  const all = [...getTable("COMPETICOES"), ...getTable("COMPETICOES_BASE")];
  const n = String(name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const found = all.find(c=>{
    const a = String(c.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const b = String(c.nome_curto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    return a === n || b === n;
  });
  return found ? found.id : "";
}

function getSeasonStatsForRecord(seasonRecord){
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


function renderPlayedSeasons(){
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


function trophyIcon(name){
  const n = String(name||"").toLowerCase();
  if(n.includes("champions")) return "🏆";
  if(n.includes("mundo") || n.includes("world")) return "🌍";
  if(n.includes("liga") || n.includes("league")) return "🥇";
  if(n.includes("copa") || n.includes("cup")) return "🏅";
  if(n.includes("libertadores")) return "🏆";
  if(n.includes("super")) return "⭐";
  return "🏆";
}

function renderPersonagens(){
  const el=$("personagens-list"); if(!el)return;
  const chars=getCareerCharacters();
  el.innerHTML=chars.map(p=>`<article class="entity-card"><div class="entity-top"><div class="entity-avatar" style="${p.foto?`background-image:url('${p.foto}')`:''}">${p.foto?'':initials(p.nome)}</div><div><h3><button class="clickable-player-name" onclick="openForm('personagem','${p.id}')">${p.nome||"-"}</button></h3><small>${p.tipo||"-"} • ${p.posicao||"-"}</small></div></div><small>Nacionalidade: ${p.nacionalidade||"-"}</small><div class="entity-actions"><button onclick="setActiveProtagonist('${p.id}')">Selecionar</button><button onclick="openForm('personagem','${p.id}')">Editar</button><button class="delete" onclick="removeRecord('personagem','${p.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhum personagem nesta carreira.");
}

function renderStats(){
  const el=$("stats-table"); if(!el)return;
  const season=getCurrentSeason(); const rows=getProtagonistStats().filter(s=>!season||String(s.temporada)===String(season));
  el.innerHTML=`<div class="table-row header"><div>Temporada</div><div>Competição</div><div>Jogos</div><div>Gols</div><div>Assist.</div><div>G/J</div><div>A/J</div><div>Ações</div></div>`+
  rows.map(s=>{const g=num(s.jogos),go=num(s.gols),a=num(s.assistencias);return`<div class="table-row"><div>${s.temporada}</div><div>${compName(s.competicao_id)}</div><div>${g}</div><div>${go}</div><div>${a}</div><div>${g?(go/g).toFixed(2):"0.00"}</div><div>${g?(a/g).toFixed(2):"0.00"}</div><div><button onclick="openForm('estatistica','${s.id}')">Editar</button></div></div>`}).join("");
}

function renderTrofeus(){
  const el=$("trophy-grid"); if(!el)return;
  const rows=getTable("CAMPEOES");
  el.innerHTML=rows.map(t=>`<article class="trophy-card"><h3>${compName(t.competicao_id)}</h3><div style="font-size:36px;margin:12px 0">🏆</div><span>${t.temporada||"-"} • ${t.clube||"-"}</span><div class="entity-actions"><button onclick="openForm('campeao','${t.id}')">Editar</button><button class="delete" onclick="removeRecord('campeao','${t.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhum título cadastrado.");
}

function renderTop11(){
  const el=$("top11Pitch"); if(!el)return;
  const season=getCurrentSeason(); const rows=getTable("TOP11").filter(r=>!season||String(r.temporada)===String(season));
  el.innerHTML=rows.map(p=>`<div class="field-player">${p.overall||"-"}<br><span>${p.posicao||""}</span><span>${p.jogador||"-"}</span></div>`).join("")||`<div class="field-player">+<br><span>Cadastre o Top 11</span></div>`;
}


function uniqueBallonRows(rows){
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


function getBallonSeasons(){
  return [...new Set(getTable("BOLA_DE_OURO").map(x=>x.temporada).filter(Boolean))]
    .sort(compareSeasonsDesc);
}

function getActiveBallonSeason(){
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

function renderBallonSeasonSelector(){
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

function renderBolaOuro(){
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

function renderClubes(){
  const el=$("clubes-list"); if(!el)return;
  const rows=getTable("CLUBES");
  el.innerHTML=rows.map(c=>`<article class="entity-card"><div class="entity-top"><div class="entity-avatar">${c.escudo?`<img src="${c.escudo}">`:"🏟"}</div><div><h3>${c.nome||"-"}</h3><small>${c.pais||"-"}</small></div></div><small>Estádio: ${c.estadio||"-"}</small><div class="entity-actions"><button onclick="openForm('clube','${c.id}')">Editar</button><button class="delete" onclick="removeRecord('clube','${c.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhum clube.");
}

function renderMuseu(){
  const el=$("media-grid"); if(!el)return;
  const rows=getCareerMedia();
  el.innerHTML=rows.map(m=>`<article class="media-card"><div style="font-size:34px">${m.tipo==="video"?"🎥":"📸"}</div><strong>${m.titulo||"-"}</strong><span>${m.temporada||"-"} • ${m.descricao||""}</span>${m.url?`<a href="${m.url}" target="_blank">Abrir mídia</a>`:""}<div class="entity-actions"><button onclick="openForm('midia','${m.id}')">Editar</button><button class="delete" onclick="removeRecord('midia','${m.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhuma mídia.");
}

function renderPrimaryButton(){
  const btn=$("primaryCreateBtn"); if(!btn)return;
  const career=getActiveCareer();
  btn.textContent=career?"+ Criar Personagem":"+ Criar Carreira";
  btn.onclick=()=>career?openForm("personagem"):openQuickCareerForm();
}

function emptyCard(text){return `<article class="entity-card"><small>${text}</small></article>`}
function flagFrom(v){
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

function closeModal(){
  if(modal) modal.classList.remove("active");
  if(modalBox) modalBox.classList.remove("wide");
  if(form) form.innerHTML = "";
}


function navigate(pageId){
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
function openForm(kind,id=null){
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


function openQuickCareerForm(){
  modalTitle.textContent="Criar carreira";form.className="form-grid";
  form.innerHTML=`<div class="form-field"><label>Nome da carreira</label><input name="nome" placeholder="Ex: MILTON V7.0"></div><div class="form-field"><label>Jogo / Universo</label><input name="jogo" value="EA FC"></div><div class="form-field"><label>Descrição</label><textarea name="descricao"></textarea></div><div class="form-actions"><button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button><button class="gold-btn" id="saveBtn">Salvar</button></div>`;
  form.onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());let u=getUserUniverses(active.usuario_id)[0];if(!u){const r=await apiPost({action:"create",table:"UNIVERSOS",record:{usuario_id:active.usuario_id,nome:data.jogo,jogo:data.jogo}});u=r.data}const r=await apiPost({action:"create",table:"CARREIRAS",record:{universo_id:u.id,nome:data.nome,descricao:data.descricao,status:"ativa"}});active.carreira_id=String(r.data.id);active.protagonista_id="";saveActive();closeModal();await loadData()};
  modal.classList.add("active");
}

function openTop11BatchForm(){
  modalTitle.textContent="Novo Top 11";modalBox.classList.add("wide");form.className="form-grid top11-batch";
  const season=getCurrentSeason();
  const rows=Array.from({length:11},(_,i)=>i+1).map(i=>`<div class="batch-row"><strong>${i}</strong><input name="posicao_${i}" placeholder="POS"><input name="jogador_${i}" placeholder="Jogador"><input name="overall_${i}" type="number" placeholder="OVR"></div>`).join("");
  form.innerHTML=`<div class="form-field"><label>Temporada</label><select name="temporada">${getAvailableSeasonsForActivePlayer().map(s=>`<option value="${s}" ${s===season?"selected":""}>${s}</option>`).join("")}</select></div><div class="batch-grid"><div class="batch-head"><div>#</div><div>Posição</div><div>Jogador</div><div>Overall</div></div>${rows}</div><div class="form-actions"><button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button><button class="gold-btn" id="saveBtn">Salvar Top 11</button></div>`;
  form.onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());const season=data.temporada;for(const old of getTable("TOP11").filter(r=>String(r.temporada)===String(season)))await apiPost({action:"delete",table:"TOP11",id:old.id});for(let i=1;i<=11;i++){if(!data[`jogador_${i}`])continue;await apiPost({action:"create",table:"TOP11",record:{temporada:season,posicao:data[`posicao_${i}`]||i,jogador:data[`jogador_${i}`],overall:data[`overall_${i}`]||""}})}closeModal();await loadData()};
  modal.classList.add("active");
}

function openBallonBatchForm(){
  modalTitle.textContent="Novo ranking Bola de Ouro";
  modalBox.classList.add("wide");
  form.className="form-grid ballon-batch";

  const selectedSeason = getActiveBallonSeason() || getCurrentSeason();
  const seasons=[...new Set([...getAvailableSeasonsForActivePlayer(),...getBallonSeasons()])].sort(compareSeasonsDesc);
  const seasonOptions=seasons.length
    ? seasons.map(s=>`<option value="${s}" ${s===selectedSeason?"selected":""}>${s}</option>`).join("")
    : `<option value="${selectedSeason||""}">${selectedSeason||"Sem temporada"}</option>`;

  const existingRows=uniqueBallonRows(getTable("BOLA_DE_OURO").filter(r=>String(r.temporada)===String(selectedSeason)));

  function existing(pos,field){
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
      await 
window.addEventListener('error', function(event){
  console.error("Football Legacy error:", event.error || event.message);
  setStatus("Erro no dashboard: " + (event.message || "erro desconhecido"), "error");
});

window.addEventListener('unhandledrejection', function(event){
  console.error("Football Legacy promise error:", event.reason);
  const msg = event.reason && event.reason.message ? event.reason.message : String(event.reason || "erro desconhecido");
  setStatus("Erro no dashboard: " + msg, "error");
});

loadData();
    }catch(err){
      btn.disabled=false;
      btn.textContent="Salvar Ranking";
      setStatus("Erro ao salvar ranking: "+err.message,"error");
      console.error(err);
    }
  };

  modal.classList.add("active");
}

function openSeasonFlow(){
  modalTitle.textContent="Nova temporada";form.className="form-grid";modalBox.classList.add("wide");
  form.innerHTML=`<div class="form-field"><label>Temporada</label><input name="temporada" placeholder="2025/2026"></div><div class="form-field"><label>Ano</label><input name="ano" placeholder="2026"></div><div class="form-actions"><button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button><button class="gold-btn" id="saveBtn">Salvar temporada</button></div>`;
  form.onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());const r=await apiPost({action:"create",table:"TEMPORADAS",record:{carreira_id:active.carreira_id,temporada:data.temporada,ano:data.ano,status:"ativa"}});active.temporada=data.temporada;saveActive();closeModal();await loadData()};
  modal.classList.add("active");
}

function triggerUpload(key){const input=$("file_"+key); if(input)input.click()}
async function uploadToCloudinary(event,key){const file=event.target.files[0]; if(!file)return; const target=form.querySelector(`[name="${key}"]`); const fd=new FormData();fd.append("file",file);fd.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);setStatus("Enviando mídia...");const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,{method:"POST",body:fd});const json=await res.json();if(!json.secure_url)throw new Error(json.error?.message||"Erro Cloudinary");target.value=json.secure_url;setStatus("Mídia enviada.","ok")}

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
function normalizeSeasonValue(value){
  return String(value || "").trim();
}

function getBallonBaseRows(){
  return getTable("BOLA_DE_OURO_BASE").map(row=>Object.assign({__source:"base"}, row));
}

function getBallonCareerRows(){
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

function getBallonAllRowsForCurrentView(){
  return [...getBallonBaseRows(), ...getBallonCareerRows()];
}

function getBallonSeasons(){
  return [...new Set(getBallonAllRowsForCurrentView().map(x=>normalizeSeasonValue(x.temporada)).filter(Boolean))]
    .sort((a,b)=>{
      const ay = Number(String(a).match(/\d{4}/)?.[0] || 0);
      const by = Number(String(b).match(/\d{4}/)?.[0] || 0);
      return by - ay;
    });
}

function getActiveBallonSeason(){
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

function renderBallonSeasonSelector(){
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

function uniqueBallonRows(rows){
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

function renderBolaOuro(){
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

function getBallonWinnersRanking(){
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

function openBestBallonModal(){
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

function closeBestBallonModal(){
  const modal = $("bestBallonModal");
  if(modal) modal.classList.remove("active");
}

function openBallonBatchForm(){
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

  function existing(pos,field){
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
function openSeasonFlow(existingId=null){
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

  function updateSeasonFromDate(){
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

  function renderSeasonStatsEditor(seasonRecord){
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

function editSeasonRecord(id){
  openSeasonFlow(id);
}


// ===== V3.6.2 RESTORE API SEASON FLOW =====
let selectedSeasonTeam = null;
let selectedCompetitionsForSeason = [];

function escapeName(value){
  return String(value || "").replace(/[^a-zA-Z0-9]/g,"_");
}

function unescapeCompKey(key){
  return String(key || "").replace(/_/g," ");
}

function competitionSuggestions(team){
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

async function searchTeamsForSeason(){
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

function selectSeasonTeam(team){
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

function renderCompetitionSuggestions(team, existingComps=[]){
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

function getSelectedSeasonCompetitions(){
  return [...document.querySelectorAll("#seasonCompetitionChecks input:checked")].map(i=>i.value);
}

function renderSeasonStatsRows(existingStats=null){
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

function openSeasonFlow(existingId=null){
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

async function saveSeasonFlow(data, button, existing=null){
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

function editSeasonRecord(id){
  openSeasonFlow(id);
}

function renderPlayedSeasons(){
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
function getActivePlayerSeasonRows(){
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

function compareSeasonsAsc(a,b){
  const ay = Number(String(a||"").match(/\d{4}/)?.[0] || 0);
  const by = Number(String(b||"").match(/\d{4}/)?.[0] || 0);
  return ay - by;
}

function buildClubJourney(){
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

function renderHero(){
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

function renderPlayedSeasons(){
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

function openClubJourney(key){
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

function closeClubJourney(){
  const modal = $("clubJourneyModal");
  if(modal) modal.classList.remove("active");
}

if($("closeClubJourney")) $("closeClubJourney").onclick = closeClubJourney;
if($("clubJourneyModal")) $("clubJourneyModal").onclick = e => { if(e.target === $("clubJourneyModal")) closeClubJourney(); };


// ===== V3.6.5 FIX RESUMO + TITULOS =====
currentPageId = "dashboard";

function renderResumoFast(){
  try{ renderDashboardJourney(); }catch(err){ console.error("Erro em renderDashboardJourney", err); }
  try{ renderSeasonSelector(); }catch(err){ console.error("Erro em renderSeasonSelector", err); }
  try{ renderPlayedSeasons(); }catch(err){ console.error("Erro em renderPlayedSeasons", err); }
}

function renderPageById(pageId, force=false){
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
  }

  renderedPages[page] = true;
}

function renderAll(){
  renderedPages = {};
  renderGlobalSelectorsOnly();
  renderPageById("dashboard", true);
}

function renderDashboardJourney(){
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

function getExistingChampionRecord(seasonId, comp){
  return getTable("CAMPEOES_CARREIRA").find(c =>
    String(c.carreira_temporada_id) === String(seasonId) &&
    String(c.competicao || "").toLowerCase() === String(comp || "").toLowerCase()
  );
}

function renderSeasonTitlesRows(existing=null){
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
function openSeasonFlow(existingId=null){
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

async function saveSeasonTitlesFlow(data, existing=null){
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

function closeClubJourney(){
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

function getSeasonTitleCompetitions(){
  const selected = getSelectedSeasonCompetitions ? getSelectedSeasonCompetitions() : [];
  return [...new Set([...selected, ...MAIN_SEASON_TITLES].filter(Boolean))];
}

function renderSeasonTitlesRows(existing=null){
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

async function saveSeasonTitlesFlow(data, existing=null){
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

function renderDashboardJourney(){
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

function getRecordsBaseRows(){
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

function getRecordsSeasonForStat(stat){
  if(stat.temporada) return stat.temporada;

  const season = getTable("CARREIRA_TEMPORADAS").find(t=>String(t.id)===String(stat.carreira_temporada_id));
  return season ? season.temporada : "";
}

function getRecordsClubForStat(stat){
  if(stat.clube_nome) return stat.clube_nome;

  const season = getTable("CARREIRA_TEMPORADAS").find(t=>String(t.id)===String(stat.carreira_temporada_id));
  return season ? season.clube_nome : "";
}

function getRecordsCompetitionForStat(stat){
  return stat.competicao || compName(stat.competicao_id) || "";
}

function getRecordsScopeOptions(){
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

function renderRecordsFilters(){
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

function getSelectedRecordScope(){
  const select = $("recordsScopeSelect");
  const value = select?.value || localStorage.getItem("fl_records_scope") || "all|all";
  const [type, ...rest] = String(value).split("|");
  return {type:type || "all", value:rest.join("|") || "all"};
}

function filterRecordsStatsByScope(stats, scope){
  if(!scope || scope.type === "all") return stats;

  if(scope.type === "club"){
    return stats.filter(s=>String(getRecordsClubForStat(s)).toLowerCase()===String(scope.value).toLowerCase());
  }

  if(scope.type === "competition"){
    return stats.filter(s=>String(getRecordsCompetitionForStat(s)).toLowerCase()===String(scope.value).toLowerCase());
  }

  return stats;
}

function aggregateRecordsByPlayer(stats){
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

function buildSingleSeasonGoalRecords(stats){
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

function renderRecordList(containerId, rows, metric, label){
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

function renderSingleSeasonGoalRecords(rows){
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

function renderRecords(){
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
function normalizeTextKey(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]/g,"");
}

function trophyImageForCompetition(name){
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

function trophyFallbackIcon(name){
  const key = normalizeTextKey(name);
  if(key.includes("champions")) return "🏆";
  if(key.includes("copa") || key.includes("cup")) return "🏆";
  if(key.includes("liga") || key.includes("league") || key.includes("serie") || key.includes("bundesliga") || key.includes("ligue")) return "🥇";
  if(key.includes("mundial") || key.includes("world")) return "🌍";
  return "🏆";
}

function getCareerTrophyRows(){
  const carreira = getActiveCareer();
  const rows = getTable("CAMPEOES_CARREIRA")
    .filter(t=>!carreira || String(t.carreira_id)===String(carreira.id))
    .filter(t=>String(t.status || "").includes("titulo") || String(t.clube || "").trim());

  const legacy = getTable("CAMPEOES")
    .filter(t=>!carreira || !t.carreira_id || String(t.carreira_id)===String(carreira.id));

  return [...rows, ...legacy];
}

function getSeasonByCareerSeasonId(id){
  return getTable("CARREIRA_TEMPORADAS").find(t=>String(t.id)===String(id)) || {};
}

function renderTrofeus(){
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

function Trueish(v){ return true; }

function renderDashboardJourney(){
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
function normalizeRecordCategory(cat){
  const key = normalizeTextKey(cat);
  if(key.includes("artilheiro")) return "maior_artilheiro";
  if(key.includes("assist")) return "mais_assistencias";
  if(key.includes("jogos")) return "mais_jogos";
  if(key.includes("gols") && key.includes("temporada")) return "gols_em_uma_temporada";
  return cat || "";
}

function getRecordsBaseStaticRows(){
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

function buildCareerRecordRows(){
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

function getRecordsScopeOptions(){
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

function filterRecordRowsByScope(rows, scope){
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

function renderRecordRowsList(containerId, allRows, category, label){
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

function renderRecords(){
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
function normalizeScopeName(value){
  return normalizeTextKey(value)
    .replace("uefachampionsleague","championsleague")
    .replace("ucl","championsleague")
    .replace("brazilianseriea","brasileirao")
    .replace("campeonatobrasileiroseriea","brasileirao")
    .replace("serieaitaliana","seriea")
    .replace("italianseriea","seriea")
    .replace("laligaea","laliga");
}

function sameScope(a,b){
  const aa = normalizeScopeName(a);
  const bb = normalizeScopeName(b);
  if(!aa || !bb) return false;
  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

function getStatCompetitionName(stat){
  return stat.competicao || compName(stat.competicao_id) || "";
}

function getStatClubName(stat){
  return stat.clube_nome || getRecordsClubForStat(stat) || "";
}

function getCareerRowsForScope(scope){
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

function buildCareerRecordRowsForScope(scope){
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

function filterRecordRowsByScope(rows, scope){
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

function renderRecords(){
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

function getCareerTotals(){
  const stats = getRecordsBaseRows();
  return stats.reduce((acc,s)=>{
    acc.jogos += num(s.jogos);
    acc.gols += num(s.gols);
    acc.assistencias += num(s.assistencias);
    acc.cartoes += num(s.cartoes);
    return acc;
  },{jogos:0,gols:0,assistencias:0,cartoes:0});
}

function renderDashboardJourney(){
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
function isWonTrophy(row){
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

function getCareerTrophyRows(){
  const carreira = getActiveCareer();

  const rows = getTable("CAMPEOES_CARREIRA")
    .filter(t=>!carreira || String(t.carreira_id)===String(carreira.id))
    .filter(t=>isWonTrophy(t));

  const legacy = getTable("CAMPEOES")
    .filter(t=>!carreira || !t.carreira_id || String(t.carreira_id)===String(carreira.id))
    .filter(t=>isWonTrophy(t) || String(t.titulo || "").toLowerCase().includes("sim"));

  return [...rows, ...legacy];
}

function renderTrofeus(){
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
function findPlayerCardShell(){
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

function applyPlayerCardOverlay(protagonist){
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

function renderDashboardJourney(){
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
function normalizeClubKey(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/football club|fc|cf|sc|ac|afc|calcio|club de futbol/g,"")
    .replace(/[^a-z0-9]/g,"");
}

function clubBadgeStatic(name){
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

function clubBadgeForBallon(row){
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

function renderBallonPlayerCell(row, sourceLabel=""){
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
function competitionSuggestions(team){
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
function competitionSuggestions(team){
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

function startFootballLegacy(){
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



async function removeRecord(kind,id){
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
function isEuropeanTeamForCompetitions(team){
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
function competitionSuggestions(team){
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
function selectSeasonTeam(team){
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
function getCurrentSelectedCompetitionsFromModal(){
  const checked = getSelectedSeasonCompetitions ? getSelectedSeasonCompetitions() : [];
  return [...new Set(checked.filter(Boolean))];
}

async function saveSeasonFlow(data, button, existing=null){
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

async function saveSeasonTitlesFlow(data, existing=null){
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
function getBallonRowClub(row){
  return row.clube || row.club || row.time || row.equipe || "";
}

function getClubOptionsForSelect(selected=""){
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

function syncClubManualFromSelect(){
  const sel = $("ballonClubSelect");
  const input = $("ballonClubManual");
  if(sel && input && sel.value){
    input.value = sel.value;
  }
}

function getBallonClubFromForm(data){
  return data.clube || data.club || data.time || "";
}

function renderBallonPlayerCell(row, sourceLabel=""){
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
function clubBadgeForBallon(row){
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
function openBallonRankingForm(existingId=null){
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

function extractYearFromSeason(season){
  const nums = String(season || "").match(/\d{4}/g);
  if(!nums || !nums.length) return "";
  return nums.length > 1 ? nums[1] : nums[0];
}

// Compatibilidade com nomes antigos de função/botão.
function openBallonForm(id=null){ openBallonRankingForm(id); }
function openBolaOuroForm(id=null){ openBallonRankingForm(id); }
function editBallonRanking(id){ openBallonRankingForm(id); }
function editBolaOuroRanking(id){ openBallonRankingForm(id); }

window.openBallonRankingForm = openBallonRankingForm;
window.openBallonForm = openBallonForm;
window.openBolaOuroForm = openBolaOuroForm;
window.editBallonRanking = editBallonRanking;
window.editBolaOuroRanking = editBolaOuroRanking;
window.syncClubManualFromSelect = syncClubManualFromSelect;



// ===== V3.7.17 BOLA DE OURO: NOVO RANKING LIMPO + CLUBE EM LOTE =====
function getBallonAvailableSeasons(){
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

function openBallonBatchForm(options={}){
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

function openNewBallonRanking(){
  openBallonBatchForm({editExisting:false});
}

function openEditBallonRankingSeason(season){
  openBallonBatchForm({editExisting:true, editSeason:season});
}

// Compatibilidade com botões antigos.
function openBallonRankingForm(id=null){
  if(id){
    return openBallonFormSingle(id);
  }
  return openNewBallonRanking();
}

function openBolaOuroRankingForm(id=null){
  return openBallonRankingForm(id);
}

// Formulário individual antigo preservado como fallback para botão editar de uma linha.
function openBallonFormSingle(existingId=null){
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

function normalizeBallonCareerRecord(record){
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

function getBallonRowClub(row){
  return row.clube || row.club || row.time || row.equipe || "";
}

// Reaplica salvamento em lote com clube na propriedade final `clube`.
function openBallonBatchForm(options={}){
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

function openBallonFormSingle(existingId=null){
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

function normalizeDbAfterLoad(){
  if(!db || typeof db !== "object") db = {};
  Object.keys(db).forEach(k=>{
    if(!Array.isArray(db[k])) db[k] = [];
  });
}

async function fetchAllFromSheetsClean(){
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

async function loadData(){
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

async function forceRefreshData(){
  await loadData();
}

// Bola de Ouro: usa ano inicial da temporada.
// 2025/2026 -> 2025.
function getAwardYearFromSeason(value){
  const text = String(value || "");
  const years = text.match(/\d{4}/g);
  if(!years || !years.length) return "";
  return years[0];
}

function getCareerSeasonBallonOptions(){
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

function normalizeBallonCareerRecord(record){
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

function syncLocalTableAfterSave(payload, res){
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

function getBallonRowClub(row){
  return row.clube || row.club || row.time || row.equipe || "";
}

function openBallonBatchForm(options={}){
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

function openNewBallonRanking(){ openBallonBatchForm({editExisting:false}); }
function openEditBallonRankingSeason(season){ openBallonBatchForm({editExisting:true, editSeason:getAwardYearFromSeason(season)}); }

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

function renderSeasonStatsRows(existingStats=null){
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

function renderCompetitionSuggestions(team, existingComps=[]){
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

function unlockSeasonSaveButton(btn){
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

function refreshAfterSeasonSaveInBackground(){
  setTimeout(async ()=>{
    try{
      await loadData();
    }catch(err){
      console.warn("Temporada salva, mas atualização automática falhou:", err);
      setStatus("Temporada salva na planilha. Clique em Atualizar se ainda não aparecer.", "warn");
    }
  }, 100);
}

function openSeasonFlow(existingId=null){
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

function getAwardYearFromSeason(value){
  const text = String(value || "");
  const years = text.match(/\d{4}/g);
  if(!years || !years.length) return "";
  return years.length > 1 ? years[years.length - 1] : years[0];
}

function getCareerSeasonBallonOptions(){
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

function normalizeBallonCareerRecord(record){
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

async function apiBatchPost(operations){
  const payload = {
    action:"batch",
    operations
  };

  return await apiPost(payload);
}

function getAwardYearFromSeason(value){
  const text = String(value || "");
  const years = text.match(/\d{4}/g);
  if(!years || !years.length) return "";
  return years.length > 1 ? years[years.length - 1] : years[0];
}

function getCareerSeasonBallonOptions(){
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

function normalizeBallonCareerRecord(record){
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

function getBallonRowClub(row){
  return row.clube || row.club || row.time || row.equipe || "";
}

function syncBatchResultsLocal(operations, response){
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

function openBallonBatchForm(options={}){
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

function openNewBallonRanking(){ openBallonBatchForm({editExisting:false}); }
function openEditBallonRankingSeason(season){ openBallonBatchForm({editExisting:true, editSeason:getAwardYearFromSeason(season)}); }

window.openBallonBatchForm = openBallonBatchForm;
window.openNewBallonRanking = openNewBallonRanking;
window.openEditBallonRankingSeason = openEditBallonRankingSeason;
window.getAwardYearFromSeason = getAwardYearFromSeason;



// ===== V3.7.36 TEMPORADA SALVAMENTO EM LOTE =====
// Temporada inteira = 1 chamada ao Apps Script.
// Requer Apps Script v3.5.8 com action=saveSeasonFull.

function normalizeCompetitionLabelV3736(name){
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

function compKeyV3736(name){
  return String(normalizeCompetitionLabelV3736(name) || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
}

function getSelectedSeasonCompetitionsV3736(){
  const checks = [...document.querySelectorAll("#seasonCompetitionChecks input[type='checkbox']:checked")];
  const values = checks.map(ch=>normalizeCompetitionLabelV3736(ch.value || ch.dataset.competition || ch.name || ""));
  return [...new Set(values.filter(Boolean))];
}

function buildSeasonFullPayloadV3736(data, existing=null){
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

function syncSeasonFullLocalV3736(result){
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

async function saveSeasonFullV3736(data, existing=null){
  const payload = buildSeasonFullPayloadV3736(data, existing);
  const res = await apiPost(payload);
  if(!res.ok) throw new Error(res.error || "Erro ao salvar temporada em lote.");
  syncSeasonFullLocalV3736(res);
  return res.data || res;
}

function openSeasonFlow(existingId=null){
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

function normalizeCompetitionLabelV3737(name){
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

function compKeyV3737(name){
  return String(normalizeCompetitionLabelV3737(name) || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
}

function getCheckboxCompetitionNameV3737(ch){
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

function getSelectedSeasonCompetitionsV3736(){
  const checks = [...document.querySelectorAll("#seasonCompetitionChecks input[type='checkbox']:checked")];

  const values = checks.map(getCheckboxCompetitionNameV3737)
    .map(normalizeCompetitionLabelV3737)
    .filter(Boolean);

  return [...new Set(values)];
}

// Compatibilidade caso outra função use esse nome.
function getSelectedSeasonCompetitions(){
  return getSelectedSeasonCompetitionsV3736();
}

function getPossibleKeysForCompV3737(comp){
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

function getDataByCompFieldV3737(data, field, comp){
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

function buildSeasonFullPayloadV3736(data, existing=null){
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

function normalizeCompetitionLabelV3738(name){
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

function compKeyV3738(name){
  return String(normalizeCompetitionLabelV3738(name) || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
}

function sameCompetitionV3738(a,b){
  return compKeyV3738(a) === compKeyV3738(b);
}

function getSelectedSeasonCompetitionsV3736(){
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

function getExistingStatForCompV3738(stats, comp){
  return (stats || []).find(s=>{
    const name = s.competicao || compName(s.competicao_id) || "";
    return sameCompetitionV3738(name, comp);
  }) || {};
}

function renderSeasonStatsRows(existingStats=null){
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

function readSeasonStatsRowsFromDomV3738(){
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

function readSeasonTitlesRowsFromDomV3738(){
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

function buildSeasonFullPayloadV3736(data, existing=null){
  if(!active.carreira_id) throw new Error("Selecione ou crie uma carreira antes.");
  if(!active.protagonista_id) throw new Error("Selecione ou crie um protagonista antes.");
  if(!selectedSeasonTeam) throw new Error("Selecione um time pela busca da API.");

  const temporada = data.temporada || monthYearToSeason(data.data_inicio);
  if(!temporada) throw new Error("Informe o início no time ou a temporada.");

  const stats = readSeasonStatsRowsFromDomV3738();
  const comps = [...new Set([
    ...getSelectedSeasonCompetitionsV3736(),
    ...stats.map(s=>s.competicao)
  ].map(normalizeCompetitionLabelV3738).filter(Boolean))];

  if(!comps.length) throw new Error("Selecione pelo menos uma competição.");

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

function normalizeCompetitionNameSafeV3741(value){
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

function getSelectedSeasonCompetitionsV3736(){
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

function getSelectedSeasonCompetitions(){
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

function normalizeDbAfterLoadV3742(){
  if(!db || typeof db !== "object") db = {};
  Object.keys(db).forEach(k=>{
    if(!Array.isArray(db[k])) db[k] = [];
  });
}

async function fetchActionV3742(action){
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

function mergeDbV3742(partial){
  if(!db || typeof db !== "object") db = {};
  Object.keys(partial || {}).forEach(k=>{
    db[k] = Array.isArray(partial[k]) ? partial[k] : [];
  });
  normalizeDbAfterLoadV3742();
}

async function loadData(){
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

async function loadFullDbV3742(reason=""){
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

async function forceRefreshData(){
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

async function loadData(){
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

async function loadFullDbV3743Background(){
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

async function loadFullDbV3742(reason=""){
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

async function forceRefreshData(){
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

function normalizeClubKeyV3744(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/football club|futebol clube|sociedade esportiva|fc|cf|ac|sc|afc|calcio|club de futbol/g,"")
    .replace(/[^a-z0-9]/g,"");
}

function getBallonClubNameV3744(row){
  return row.clube || row.club || row.time || row.equipe || "";
}

function getClubBadgeFromDbV3744(clubName){
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

function getClubBadgeStaticV3744(clubName){
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

function getClubBadgeInitialV3744(clubName){
  if(!clubName) return "";
  return getClubBadgeFromDbV3744(clubName) || getClubBadgeStaticV3744(clubName) || "";
}

async function fetchClubBadgeApiV3744(clubName){
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

function ballonClubBadgeHtmlV3744(row){
  const club = getBallonClubNameV3744(row);
  if(!club) return "";

  const badge = getClubBadgeInitialV3744(club);
  const safeClub = escapeAttr(club);

  if(badge){
    return `<img class="ballon-club-badge-v3744" src="${escapeAttr(badge)}" title="${safeClub}" onerror="this.remove()">`;
  }

  return `<span class="ballon-club-badge-placeholder-v3744" data-club="${safeClub}" title="${safeClub}"></span>`;
}

async function enrichBallonClubBadgesV3744(){
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

function renderBolaOuro(){
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

function renderRecordRowsList(containerId, allRows, category, label){
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

function flCleanInjectedGarbageV3759(){
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

function flKeyV3760(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

function normalizeSelectionNameV3760(value){
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

function getSelectionBadgeV3760(name){
  const norm = normalizeSelectionNameV3760(name);
  return NATIONAL_TEAM_BADGES_V3760[flKeyV3760(norm)] || "";
}

function getPlayerImageV3760(p){
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

function getActivePlayerSelectionV3760(){
  const p = typeof getActiveProtagonist === "function" ? getActiveProtagonist() : null;
  if(!p) return "";
  return normalizeSelectionNameV3760(
    p.selecao || p.seleção || p.selecao_nacional || p.national_team || p.nacionalidade || ""
  );
}

function getSelectionRowsV3760(){
  const carreiraId = active?.carreira_id || "";
  const personagemId = active?.protagonista_id || "";
  return getTable("SELECOES_CARREIRA").filter(r =>
    (!carreiraId || String(r.carreira_id) === String(carreiraId)) &&
    (!personagemId || String(r.personagem_id) === String(personagemId))
  );
}

function getSelectionRowForSeasonV3760(season){
  if(!season) return null;
  return getSelectionRowsV3760().find(r =>
    String(r.carreira_temporada_id || "") === String(season.id || "") ||
    String(r.temporada || "") === String(season.temporada || "")
  ) || null;
}

function getSelectionTotalsV3760(){
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

function parseBirthV3760(value){
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

function getBirthValueV3760(){
  const p = typeof getActiveProtagonist === "function" ? getActiveProtagonist() : null;
  if(!p) return "";
  return p.data_nascimento || p.idade || p.nascimento || p.aniversario || "";
}

function getSeasonStartV3760(season){
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

function calcAgeAtSeasonV3760(season){
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

function getSeasonAggregatesV3760(){
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

function getCareerTotalsV3760(){
  const rows = getSeasonAggregatesV3760();
  return rows.reduce((acc,r)=>{
    acc.jogos += r.jogos;
    acc.gols += r.gols;
    acc.assistencias += r.assistencias;
    return acc;
  },{jogos:0,gols:0,assistencias:0});
}

function buildProjectionV3760(){
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

function applyPlayerCardOverlay(protagonist){
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

function renderMetricGroupV3760(title, data, extra=""){
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

function renderDashboardJourney(){
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

function renderSelectionCellV3760(season){
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

function renderPlayedSeasons(){
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
    const age = calcAgeAtSeasonV3760(r);
    const periodo = (r.data_inicio || r.data_fim) ? `${r.data_inicio || "?"} até ${r.data_fim || "?"}` : "";

    return `
      <article class="season-card season-card-v3760">
        <div class="season-club-side-v3760">
          <div class="season-club-crest season-club-crest-v3760">
            ${r.escudo ? `<img src="${escapeAttr(r.escudo)}" onerror="this.parentElement.innerHTML='<span>⚽</span>'">` : `<span>⚽</span>`}
          </div>
          ${age !== "" ? `<span class="season-age-v3760">${age} anos</span>` : ""}
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

function openSelectionSeasonModalV3760(seasonId){
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

function injectSelectionFieldOnPersonagemFormV3760(){
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

function FL_normText_3766(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

function FL_cleanUrl_3766(value){
  const raw = String(value || "").trim();
  if(!raw) return "";
  if(raw.toLowerCase().includes("fakepath")) return "";
  if(raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return "";
}

function FL_normalizeBallonSeason_3766(value){
  const raw = String(value || "").trim();
  let m = raw.match(/-\s*(\d{4})$/);
  if(m) return m[1];

  m = raw.match(/(\d{4})\s*\/\s*(\d{4})/);
  if(m) return m[2];

  m = raw.match(/(\d{4})/);
  if(m) return m[1];

  return raw;
}

function FL_getBallonSeason_3766(){
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

function FL_getBallonWinnerImage_3766(){
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

function FL_getInputsByMeaning_3766(row){
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

function FL_isBallonRankingRow_3766(row){
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

function FL_getBallonRows_3766(){
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

async function FL_saveBallonRanking_3766(){
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

async function deleteCareerSeasonFullV3767(seasonId){
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

function injectDeleteSeasonButtonsV3767(){
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

function getSeasonIdFromCardEditButtonV3770(card){
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

function findSeasonCardByEditButtonV3770(btn){
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

function injectDeleteSeasonButtonsV3770(){
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

function removeScatteredCareerDeleteXV3771(){
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

function flSafeNoopV3772(){}

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

function removeScatteredCareerDeleteXV3772(){
  try{
    // Remove de vez X genéricos espalhados de CAMPEOES/SELECOES/TOP11/BOLA.
    document.querySelectorAll(".delete-career-item-x-v3769").forEach(el => el.remove());
    document.querySelectorAll(".career-delete-ready-v3769").forEach(el => el.classList.remove("career-delete-ready-v3769"));
  }catch(err){
    console.warn("Falha ao remover X espalhados v3.7.72:", err);
  }
}

function cleanupWrongSeasonXV3772(){
  try{
    // Remove os X antigos que usavam heurística por texto e podiam apontar para outra temporada.
    document.querySelectorAll(".delete-season-x-v3767").forEach(el => el.remove());
  }catch(err){}
}

function getSeasonIdFromCardEditButtonV3772(card){
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

function findSeasonCardByEditButtonV3772(btn){
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

function injectDeleteSeasonButtonsV3772(){
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
function cleanupOrphanPlayerCardOnNonResumoV3772(){
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

function stableTabsAfterRenderV3772(){
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

function FL_normV3773(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

function FL_normalizeSeasonV3773(value){
  const raw = String(value || "").trim();

  let m = raw.match(/-\s*(\d{4})$/);
  if(m) return m[1];

  m = raw.match(/(\d{4})\s*\/\s*(\d{4})/);
  if(m) return m[2];

  m = raw.match(/(\d{4})/);
  if(m) return m[1];

  return raw;
}

function FL_isBallonModalV3773(){
  const title = (typeof modalTitle !== "undefined" && modalTitle ? modalTitle.textContent : "").toLowerCase();
  const txt = (typeof form !== "undefined" && form ? form.textContent : "").toLowerCase();

  return title.includes("bola de ouro") || txt.includes("ranking bola de ouro") || txt.includes("jogador") && txt.includes("valor");
}

function FL_getBallonSeasonInputV3773(){
  const root = form || document;

  return (
    root.querySelector("[name='temporada']") ||
    root.querySelector("[name='ano']") ||
    root.querySelector("#ballonSeason") ||
    root.querySelector("select")
  );
}

function FL_getBallonSeasonCurrentV3773(){
  const input = FL_getBallonSeasonInputV3773();
  return FL_normalizeSeasonV3773(input?.value || "");
}

function FL_getExistingBallonRowsV3773(season){
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

function FL_findAncestorWithInputsV3773(input){
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

function FL_getBallonInputRowsV3773(){
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

function FL_inputByMeaningV3773(row, patterns, fallbackIndex){
  const inputs = [...row.querySelectorAll("input,select,textarea")].filter(i => i.type !== "file");

  for(const input of inputs){
    const key = FL_normV3773([input.name,input.id,input.placeholder,input.dataset?.field,input.getAttribute("aria-label")].join(" "));

    if(patterns.some(p => key.includes(p))) return input;
  }

  return inputs[fallbackIndex] || null;
}

function FL_setInputValueV3773(input, value){
  if(!input) return;

  input.value = value || "";
  input.dispatchEvent(new Event("input", {bubbles:true}));
  input.dispatchEvent(new Event("change", {bubbles:true}));
}

function FL_getBallonImageInputV3773(){
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

function FL_prefillBallonFromExistingV3773(){
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

function FL_attachBallonPrefillListenersV3773(){
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

function FL_keyV3776(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"");
}

function FL_isBallonModalV3776(){
  const title = (typeof modalTitle !== "undefined" && modalTitle ? modalTitle.textContent : "").toLowerCase();
  const txt = (typeof form !== "undefined" && form ? form.textContent : "").toLowerCase();
  return title.includes("bola de ouro") || txt.includes("ranking bola de ouro") || (txt.includes("jogador") && txt.includes("valor"));
}

function FL_normalizeSeasonV3776(value){
  const raw = String(value || "").trim();

  let m = raw.match(/-\s*(\d{4})$/);
  if(m) return m[1];

  m = raw.match(/(\d{4})\s*\/\s*(\d{4})/);
  if(m) return m[2];

  m = raw.match(/(\d{4})/);
  if(m) return m[1];

  return raw;
}

function FL_getSeasonInputV3776(){
  const root = form || document;

  return (
    root.querySelector("[name='temporada']") ||
    root.querySelector("[name='ano']") ||
    root.querySelector("#ballonSeason") ||
    root.querySelector("select")
  );
}

function FL_getSeasonV3776(){
  const input = FL_getSeasonInputV3776();
  return FL_normalizeSeasonV3776(input?.value || "");
}

function FL_getSavedBallonRowsV3776(season){
  const normalized = FL_normalizeSeasonV3776(season);

  return (db.BOLA_DE_OURO_CARREIRA || [])
    .filter(r => {
      const a = FL_normalizeSeasonV3776(r.temporada);
      const b = FL_normalizeSeasonV3776(r.ano);
      return String(a) === String(normalized) || String(b) === String(normalized);
    })
    .sort((a,b) => Number(a.posicao || 999) - Number(b.posicao || 999));
}

function FL_typeV3776(input){
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

function FL_getBallonColumnsV3776(){
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

function FL_setSilentV3776(input, value){
  if(!input) return;
  input.value = value || "";
}

function FL_clearRowsV3776(){
  const c = FL_getBallonColumnsV3776();

  for(let i=0;i<10;i++){
    FL_setSilentV3776(c.jogador[i], "");
    FL_setSilentV3776(c.pais[i], "");
    FL_setSilentV3776(c.clube[i], "");
    FL_setSilentV3776(c.idade[i], "");
    FL_setSilentV3776(c.valor[i], "");
  }
}

function FL_getImageInputV3776(){
  const root = form || document;
  const inputs = [...root.querySelectorAll("input,select,textarea")]
    .filter(input => input.type !== "file");

  return inputs.find(input => FL_typeV3776(input) === "image") || null;
}

function FL_setImageV3776(value){
  const input = FL_getImageInputV3776();
  if(!input) return;

  const clean = String(value || "").toLowerCase().includes("fakepath") ? "" : value;
  FL_setSilentV3776(input, clean || "");
}

function FL_loadBallonSeasonV3776(force=false){
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

function FL_attachBallonStableSelectorV3776(){
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
