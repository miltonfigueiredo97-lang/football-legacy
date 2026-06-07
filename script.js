console.log('Football Legacy script carregado v3.7 records tab');
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

async function loadData(){
  try{
    setStatus("Carregando dados do Google Sheets...");

    const url = API_URL + "?action=all&cache=" + Date.now();

    console.log("Football Legacy API via Vercel proxy:", url);

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

    if(!res.ok){
      throw new Error("HTTP " + res.status + " ao chamar proxy Vercel");
    }

    const json = await res.json();

    if(!json.ok){
      throw new Error(json.error || "Proxy/Apps Script retornou ok:false");
    }

    db = json.data || {};
    console.log("Football Legacy DB carregado:", {
      usuarios: getTable("USUARIOS").length,
      carreiras: getTable("CARREIRAS").length,
      personagens: getTable("PERSONAGENS").length,
      bolaBase: getTable("BOLA_DE_OURO_BASE").length,
      bolaCarreira: getTable("BOLA_DE_OURO_CARREIRA").length,
      temporadasBase: getTable("TEMPORADAS_BASE").length
    });

    ensureActive();
    renderAll();

    setStatus("Dados carregados do Google Sheets com sucesso.","ok");
  }catch(err){
    console.error("Erro loadData:", err);
    setStatus("Erro ao carregar Google Sheets: " + err.message, "error");
  }
}

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
    <div class="ballon-actions"><button onclick="openForm('bolaouro','${r.id}')">Editar</button></div>
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

  list.push("Champions League","Europa League","Conference League","Mundial de Clubes");

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