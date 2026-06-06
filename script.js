const API_URL = window.FOOTBALL_LEGACY_API;
const CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET || "";

let db = {};
let active = {
  usuario_id: localStorage.getItem("fl_active_usuario_id") || "",
  carreira_id: localStorage.getItem("fl_active_carreira_id") || "",
  protagonista_id: localStorage.getItem("fl_active_protagonista_id") || "",
  temporada: localStorage.getItem("fl_active_temporada") || ""
};

const tableMap = {
  usuario:"USUARIOS", universo:"UNIVERSOS", carreira:"CARREIRAS", personagem:"PERSONAGENS", clube:"CLUBES",
  temporada:"TEMPORADAS", competicao:"COMPETICOES", campeao:"CAMPEOES", estatistica:"ESTATISTICAS",
  bolaouro:"BOLA_DE_OURO", top11:"TOP11", midia:"MIDIAS"
};

const schemas = {
  usuario:[["nome","Nome","text"],["avatar","Avatar URL","text"]],
  universo:[["usuario_id","ID do usuário","number"],["nome","Nome do universo","text"],["jogo","Jogo","text"],["inicio","Ano início","text"]],
  carreira:[["universo_id","ID do universo","number"],["nome","Nome da carreira","text"],["descricao","Descrição","textarea"],["status","Status","select",["ativa","finalizada","pausada"]]],
  personagem:[["carreira_id","ID da carreira","number"],["tipo","Tipo","select",["protagonista","coadjuvante","real"]],["nome","Nome","text"],["foto","Foto URL","fileurl"],["posicao","Posição","text"],["nacionalidade","Nacionalidade","text"]],
  clube:[["nome","Nome","text"],["pais","País","text"],["escudo","Escudo URL","fileurl"],["estadio","Estádio","text"]],
  temporada:[["carreira_id","ID da carreira","number"],["temporada","Temporada","text"],["ano","Ano","text"]],
  competicao:[["nome","Nome","text"]],
  campeao:[["competicao_id","ID da competição","number"],["temporada","Temporada","text"],["clube","Clube campeão","text"]],
  estatistica:[["personagem_id","ID do personagem","number"],["competicao_id","ID da competição","number"],["temporada","Temporada","text"],["jogos","Jogos","number"],["gols","Gols","number"],["assistencias","Assistências","number"]],
  bolaouro:[["temporada","Temporada","text"],["posicao","Posição","number"],["jogador","Jogador","text"],["idade","Idade","number"],["valor_mercado","Valor de mercado","text"],["nacionalidade","Nacionalidade / Bandeira","text"],["overall","Overall","number"],["imagem_destaque_url","Imagem destaque do vencedor","fileurl"]],
  top11:[["temporada","Temporada","text"],["posicao","Posição","text"],["jogador","Jogador","text"],["overall","Overall","number"]],
  midia:[["carreira_id","ID da carreira","number"],["temporada","Temporada","text"],["tipo","Tipo","select",["imagem","video"]],["titulo","Título","text"],["descricao","Descrição","textarea"],["url","URL","fileurl"]]
};

schemas.carreiraRapida = [
  ["nome","Nome da carreira","text"],
  ["jogo","Jogo / Universo","text"],
  ["descricao","Descrição","textarea"],
  ["status","Status","select",["ativa","finalizada","pausada"]]
];

const pageTitles = {dashboard:"Resumo",personagens:"Personagens",estatisticas:"Estatísticas",trofeus:"Troféus",top11:"Top 11",bolaouro:"Bola de Ouro",clubes:"Clubes",museu:"Museu",admin:"Administração"};

function $(id){return document.getElementById(id)}
function setStatus(msg,type=""){const el=$("statusBar"); el.textContent=msg; el.className="status-bar "+type}
function num(v){const n=Number(v||0); return isNaN(n)?0:n}
function initials(name){return String(name||"FL").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}
function getTable(name){return db[name]||[]}
function byId(table,id){return getTable(table).find(x=>String(x.id)===String(id))}
function compName(id){const c=byId("COMPETICOES",id); return c?c.nome:(id||"-")}
function personagemName(id){const p=byId("PERSONAGENS",id); return p?p.nome:(id||"-")}
function getUserUniverses(uid){return getTable("UNIVERSOS").filter(u=>String(u.usuario_id)===String(uid))}
function getCareersForUser(uid){const universeIds=getUserUniverses(uid).map(u=>String(u.id)); return getTable("CARREIRAS").filter(c=>universeIds.includes(String(c.universo_id)))}
function getActiveUser(){return byId("USUARIOS",active.usuario_id)||getTable("USUARIOS")[0]}
function getActiveCareer(){return byId("CARREIRAS",active.carreira_id)||getCareersForUser(active.usuario_id)[0]||getTable("CARREIRAS")[0]}
function getCareerCharacters(){const c=getActiveCareer(); if(!c)return[]; return getTable("PERSONAGENS").filter(p=>String(p.carreira_id)===String(c.id))}
function getActiveProtagonist(){return byId("PERSONAGENS",active.protagonista_id)||getCareerCharacters().find(p=>p.tipo==="protagonista")||getCareerCharacters()[0]}
function getCareerSeasons(){const c=getActiveCareer(); if(!c)return[]; return getTable("TEMPORADAS").filter(t=>String(t.carreira_id)===String(c.id))}
function getCareerMedia(){const c=getActiveCareer(); if(!c)return[]; return getTable("MIDIAS").filter(m=>String(m.carreira_id)===String(c.id))}
function getProtagonistStats(){const p=getActiveProtagonist(); if(!p)return[]; return getTable("ESTATISTICAS").filter(s=>String(s.personagem_id)===String(p.id))}
function saveActive(){
  localStorage.setItem("fl_active_usuario_id",active.usuario_id||"");
  localStorage.setItem("fl_active_carreira_id",active.carreira_id||"");
  localStorage.setItem("fl_active_protagonista_id",active.protagonista_id||"");
  localStorage.setItem("fl_active_temporada",active.temporada||"");
}

function ensureActive(){
  const users=getTable("USUARIOS"); if(!active.usuario_id&&users[0])active.usuario_id=String(users[0].id);
  let careers=getCareersForUser(active.usuario_id); if(!careers.length)careers=getTable("CARREIRAS");
  if(!active.carreira_id&&careers[0])active.carreira_id=String(careers[0].id);
  const chars=getCareerCharacters(); if(!active.protagonista_id&&chars[0])active.protagonista_id=String(chars[0].id);
  saveActive();
}

function renderSelectors(){
  const users=getTable("USUARIOS");
  $("userSelect").innerHTML=users.map(u=>`<option value="${u.id}" ${String(u.id)===String(active.usuario_id)?"selected":""}>${u.nome||"Usuário "+u.id}</option>`).join("")||`<option value="">Nenhum usuário</option>`;
  let careers=getCareersForUser(active.usuario_id); if(!careers.length)careers=getTable("CARREIRAS");
  $("careerSelect").innerHTML=careers.map(c=>`<option value="${c.id}" ${String(c.id)===String(active.carreira_id)?"selected":""}>${c.nome||"Carreira "+c.id}</option>`).join("")||`<option value="">Nenhuma carreira</option>`;
  const chars=getCareerCharacters();
  $("protagonistSelect").innerHTML=chars.map(p=>`<option value="${p.id}" ${String(p.id)===String(active.protagonista_id)?"selected":""}>${p.nome||"Personagem "+p.id}</option>`).join("")||`<option value="">Nenhum personagem</option>`;
}

function bindSelectors(){
  $("userSelect").onchange=e=>{active.usuario_id=e.target.value;const c=getCareersForUser(active.usuario_id);active.carreira_id=c[0]?String(c[0].id):"";active.protagonista_id="";const chars=getCareerCharacters();active.protagonista_id=chars[0]?String(chars[0].id):"";active.temporada="";saveActive();renderAll()};
  $("careerSelect").onchange=e=>{active.carreira_id=e.target.value;active.protagonista_id="";const chars=getCareerCharacters();active.protagonista_id=chars[0]?String(chars[0].id):"";active.temporada="";saveActive();renderAll()};
  $("protagonistSelect").onchange=e=>{active.protagonista_id=e.target.value;active.temporada="";saveActive();renderAll()};
}

async function loadData(){
  try{
    setStatus("Carregando dados do Google Sheets...");
    const res=await fetch(API_URL+"?action=all&cache="+Date.now());
    const json=await res.json();
    if(!json.ok)throw new Error(json.error||"Erro ao carregar dados.");
    db=json.data||{};
    ensureActive();
    renderAll();
    setStatus("Dados carregados do Google Sheets com sucesso.","ok");
  }catch(err){console.error(err);setStatus("Erro ao carregar Google Sheets: "+err.message,"error")}
}

async function apiPost(payload){
  const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
  const text=await res.text();
  try{return JSON.parse(text)}catch(e){console.error(text);throw new Error("Resposta inválida da API.")}
}

function applyContext(kind,record){
  if(kind==="universo"&&!record.usuario_id&&active.usuario_id)record.usuario_id=active.usuario_id;
  if(kind==="carreira"&&!record.universo_id){const u=getUserUniverses(active.usuario_id)[0]||getTable("UNIVERSOS")[0];if(u)record.universo_id=u.id}
  if(["personagem","temporada","midia"].includes(kind)&&!record.carreira_id&&active.carreira_id)record.carreira_id=active.carreira_id;
  if(kind==="estatistica"&&!record.personagem_id&&active.protagonista_id)record.personagem_id=active.protagonista_id;
  if(kind==="bolaouro"&&!record.temporada){const s=getCareerSeasons()[0]; if(s)record.temporada=s.temporada}
  return record;
}

async function createRecord(kind,record,button){
  const table=tableMap[kind]; if(!table)return alert("Tipo sem tabela: "+kind);
  record=applyContext(kind,record);
  setButtonLoading(button,true);
  setStatus("Salvando no Google Sheets...");
  const json=await apiPost({action:"create",table,record});
  if(!json.ok)throw new Error(json.error||"Erro ao salvar.");

  if(kind==="personagem" && json.data && json.data.id){
    active.protagonista_id = String(json.data.id);
    saveActive();
  }

  await loadData();

  if(kind==="carreira" && json.data && json.data.id){
    active.carreira_id = String(json.data.id);
    active.protagonista_id = "";
    saveActive();
    await loadData();
  }

  setButtonLoading(button,false);
  return json.data;
}


async function createQuickCareer(record, button){
  setButtonLoading(button,true);
  setStatus("Criando carreira...");

  let userId = active.usuario_id;
  if(!userId){
    const firstUser = getTable("USUARIOS")[0];
    userId = firstUser ? firstUser.id : "";
  }

  if(!userId){
    throw new Error("Crie um usuário antes de criar a carreira.");
  }

  let universe = getUserUniverses(userId)[0];

  if(!universe){
    const universeJson = await apiPost({
      action:"create",
      table:"UNIVERSOS",
      record:{
        usuario_id:userId,
        nome:record.jogo || "EA FC",
        jogo:record.jogo || "EA FC",
        inicio:""
      }
    });

    if(!universeJson.ok) throw new Error(universeJson.error || "Erro ao criar universo.");
    universe = universeJson.data;
  }

  const careerJson = await apiPost({
    action:"create",
    table:"CARREIRAS",
    record:{
      universo_id:universe.id,
      nome:record.nome || "Nova Carreira",
      descricao:record.descricao || "",
      status:record.status || "ativa"
    }
  });

  if(!careerJson.ok) throw new Error(careerJson.error || "Erro ao criar carreira.");

  active.usuario_id = String(userId);
  active.carreira_id = String(careerJson.data.id);
  active.protagonista_id = "";
  saveActive();

  await loadData();
  setButtonLoading(button,false);
  return careerJson.data;
}

async function updateRecord(kind,id,record,button){
  const table=tableMap[kind]; record=applyContext(kind,record);
  setButtonLoading(button,true);
  setStatus("Atualizando no Google Sheets...");
  const json=await apiPost({action:"update",table,id,record});
  if(!json.ok)throw new Error(json.error||"Erro ao atualizar.");
  await loadData();
  setButtonLoading(button,false);
}

async function removeRecord(kind,id){
  const table=tableMap[kind]; if(!confirm("Excluir este registro?"))return;
  setStatus("Excluindo no Google Sheets...");
  const json=await apiPost({action:"delete",table,id});
  if(!json.ok)throw new Error(json.error||"Erro ao excluir.");
  await loadData();
}

function setButtonLoading(btn,loading){
  if(!btn)return;
  if(!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
  btn.disabled=loading;
  btn.textContent=loading?"Salvando...":(btn.dataset.originalText || "Salvar");
}


function safeText(id,value){
  const el = $(id);
  if(el) el.textContent = value;
}

function getCurrentSeason(stats){
  const seasonsFromStats = stats.map(s=>s.temporada).filter(Boolean);
  const seasonsFromCareer = getCareerSeasons().map(s=>s.temporada).filter(Boolean);
  const allSeasons = [...new Set([...seasonsFromStats, ...seasonsFromCareer])].sort(compareSeasonsDesc);

  if(active.temporada && allSeasons.includes(active.temporada)){
    return active.temporada;
  }

  active.temporada = allSeasons[0] || "";
  saveActive();
  return active.temporada;
}

function compareSeasonsDesc(a,b){
  return seasonKey(b) - seasonKey(a);
}

function seasonKey(value){
  const text = String(value || "");
  const matches = text.match(/\d{4}/g);
  if(matches && matches.length) return Number(matches[matches.length - 1]);
  const n = Number(text);
  return isNaN(n) ? 0 : n;
}

function getAvailableSeasonsForActivePlayer(){
  const stats = getProtagonistStats();
  const seasonsFromStats = stats.map(s=>s.temporada).filter(Boolean);
  const seasonsFromCareer = getCareerSeasons().map(s=>s.temporada).filter(Boolean);
  return [...new Set([...seasonsFromStats, ...seasonsFromCareer])].sort(compareSeasonsDesc);
}

function renderSeasonSelector(){
  const select = $("seasonSelect");
  if(!select) return;

  const seasons = getAvailableSeasonsForActivePlayer();
  const current = getCurrentSeason(getProtagonistStats());

  if(!seasons.length){
    select.innerHTML = `<option value="">-</option>`;
    select.value = "";
    return;
  }

  select.innerHTML = seasons.map(s => `<option value="${s}" ${String(s)===String(current)?"selected":""}>${s}</option>`).join("");
  select.value = current;

  select.onchange = e => {
    active.temporada = e.target.value;
    saveActive();
    renderDashboard();
    renderStats();
  };
}


function renderAll(){
  ensureActive();
  renderSelectors();
  renderPrimaryButton();
  renderDashboard();
  renderPersonagens();
  renderClubes();
  renderStats();
  renderTrofeus();
  renderTop11();
  renderBolaOuro();
  renderMuseu();
}


function renderPrimaryButton(){
  const btn = $("primaryCreateBtn");
  if(!btn) return;

  const career = getActiveCareer();

  if(career){
    btn.textContent = "+ Criar Personagem";
    btn.onclick = () => openForm("personagem");
  }else{
    btn.textContent = "+ Criar Carreira";
    btn.onclick = () => openForm("carreiraRapida");
  }
}


function ensurePlayerPhotoElements(){
  let frame = $("protagonistEditCard");
  if(!frame) return {};

  let img = $("mainPlayerPhoto");
  let fallback = $("mainInitials");

  if(!img){
    img = document.createElement("img");
    img.id = "mainPlayerPhoto";
    img.alt = "Foto do protagonista";
    frame.prepend(img);
  }

  if(!fallback){
    fallback = document.createElement("div");
    fallback.id = "mainInitials";
    fallback.className = "player-photo-fallback";
    fallback.textContent = "FL";
    frame.appendChild(fallback);
  }

  return {img, fallback};
}

function setPlayerPhoto(protagonist){
  const {img, fallback} = ensurePlayerPhotoElements();

  if(!img || !fallback) return;

  const photoUrl = protagonist && protagonist.foto ? String(protagonist.foto).trim() : "";

  img.onload = null;
  img.onerror = null;

  if(photoUrl){
    img.onload = () => {
      img.classList.add("visible");
      fallback.classList.add("hidden");
    };

    img.onerror = () => {
      img.classList.remove("visible");
      img.removeAttribute("src");
      fallback.classList.remove("hidden");
      fallback.textContent = initials(protagonist ? protagonist.nome : "FL");
    };

    img.src = photoUrl;
  }else{
    img.classList.remove("visible");
    img.removeAttribute("src");
    fallback.classList.remove("hidden");
    fallback.textContent = initials(protagonist ? protagonist.nome : "FL");
  }
}

function renderDashboard(){
  const user=getActiveUser(), career=getActiveCareer(), protagonist=getActiveProtagonist(), stats=getProtagonistStats(), bola=getTable("BOLA_DE_OURO");

  const currentSeason = getCurrentSeason(stats);
  const currentStats = currentSeason ? stats.filter(s=>String(s.temporada)===String(currentSeason)) : stats;

  const currentGames=currentStats.reduce((a,b)=>a+num(b.jogos),0);
  const currentGoals=currentStats.reduce((a,b)=>a+num(b.gols),0);
  const currentAssists=currentStats.reduce((a,b)=>a+num(b.assistencias),0);

  safeText("careerNameSide", career?career.nome:"Football Legacy");
  safeText("careerMetaSide", user?user.nome:"Google Sheets conectado");
  safeText("currentSeason", currentSeason||"Banco conectado");

  safeText("mainCharacterTitle", protagonist?protagonist.nome:"Protagonista");
  safeText("mainCharacterDesc", career?career.descricao||"Resumo da carreira do jogador selecionado.":"Crie uma carreira na Administração.");

  safeText("activePosition", protagonist?protagonist.posicao||"-":"-");
  safeText("activeNationality", protagonist?protagonist.nacionalidade||"-":"-");
  safeText("activeSeasonsCount", new Set(stats.map(s=>s.temporada)).size);
  safeText("currentGamesHero", currentGames);
  safeText("currentGoalsHero", currentGoals);
  safeText("currentAssistsHero", currentAssists);
  safeText("currentAvgGoalsHero", currentGames?(currentGoals/currentGames).toFixed(2):"0.00");
  safeText("currentAvgAssistsHero", currentGames?(currentAssists/currentGames).toFixed(2):"0.00");

  renderSeasonSelector();

  safeText("mainCharacter", protagonist?protagonist.nome:"Sem personagem");
  safeText("mainCharacterSub", protagonist?`${protagonist.posicao||"-"} • ${protagonist.nacionalidade||"-"}`:"Cadastre um personagem");

  setPlayerPhoto(protagonist);

  safeText("sumGames", currentGames);
  safeText("sumGoals", currentGoals);
  safeText("sumAssists", currentAssists);
  safeText("avgGoals", currentGames?(currentGoals/currentGames).toFixed(2):"0.00");
  safeText("avgAssists", currentGames?(currentAssists/currentGames).toFixed(2):"0.00");
  safeText("countBallon", bola.filter(x=>String(x.posicao)==="1"&&(!protagonist||x.jogador===protagonist.nome)).length);

  renderSeasonSummary(stats);
}

function renderSeasonSummary(stats){
  const rows=stats.map(s=>{
    const games=num(s.jogos), goals=num(s.gols), assists=num(s.assistencias);
    const trophies=getTable("CAMPEOES").filter(t=>String(t.temporada)===String(s.temporada));
    return `<div class="table-row">
      <div>${s.temporada||"-"}</div>
      <div>${compName(s.competicao_id)}</div>
      <div>${games}</div>
      <div>${goals}</div>
      <div>${assists}</div>
      <div>${games?(goals/games).toFixed(2):"0.00"}</div>
      <div>${games?(assists/games).toFixed(2):"0.00"}</div>
      <div class="trophy-list">${trophies.map(t=>`<span class="trophy-icon" title="${compName(t.competicao_id)}">🏆</span>`).join("")||"-"}</div>
    </div>`;
  }).join("");
  $("season-summary-table").innerHTML=`<div class="table-row header"><div>Temporada</div><div>Competição</div><div>Jogos</div><div>Gols</div><div>Assist.</div><div>G/J</div><div>A/J</div><div>Títulos</div></div>`+(rows||`<div class="table-row"><div>Nenhuma estatística cadastrada para este protagonista.</div></div>`);
}

function renderPersonagens(){
  const personagens=getCareerCharacters();
  $("personagens-list").innerHTML=personagens.map(p=>`<article class="entity-card">
    <div class="entity-top"><div class="entity-avatar ${p.foto?'has-photo':''}" style="${p.foto?`background-image:url('${p.foto}')`:''}">${p.foto?'':initials(p.nome)}</div><div><h3><button class="clickable-player-name" onclick="openForm('personagem','${p.id}')">${p.nome||"-"}</button></h3><small>ID ${p.id} • ${p.tipo||"-"} • ${p.posicao||"-"}</small></div></div>
    <small>Nacionalidade: ${p.nacionalidade||"-"}</small>
    <div class="entity-actions">
      <button class="select" onclick="setActiveProtagonist('${p.id}')">Selecionar</button>
      <button onclick="openForm('personagem','${p.id}')">Editar</button>
      <button class="delete" onclick="removeRecord('personagem','${p.id}')">Excluir</button>
    </div>
  </article>`).join("")||emptyCard("Nenhum personagem cadastrado nesta carreira.");
}

function renderClubes(){
  const clubes=getTable("CLUBES");
  $("clubes-list").innerHTML=clubes.map(c=>`<article class="entity-card">
    <div class="entity-top"><div class="entity-avatar">${c.escudo?`<img src="${c.escudo}" style="width:38px;height:38px;object-fit:contain">`:"🏟"}</div><div><h3>${c.nome||"-"}</h3><small>ID ${c.id} • ${c.pais||"-"}</small></div></div>
    <small>Estádio: ${c.estadio||"-"}</small>
    <div class="entity-actions"><button onclick="openForm('clube','${c.id}')">Editar</button><button class="delete" onclick="removeRecord('clube','${c.id}')">Excluir</button></div>
  </article>`).join("")||emptyCard("Nenhum clube cadastrado.");
}

function renderStats(){
  const allStats=getProtagonistStats();
  const currentSeason=getCurrentSeason(allStats);
  const stats=currentSeason?allStats.filter(s=>String(s.temporada)===String(currentSeason)):allStats;

  $("stats-table").innerHTML=`<div class="table-row header"><div>Temporada</div><div>Competição</div><div>Jogos</div><div>Gols</div><div>Assist.</div><div>G/J</div><div>A/J</div><div>Ações</div></div>`+
    stats.map(s=>{const g=num(s.jogos),go=num(s.gols),a=num(s.assistencias);return `<div class="table-row"><div>${s.temporada||"-"}</div><div>${compName(s.competicao_id)}</div><div>${g}</div><div>${go}</div><div>${a}</div><div>${g?(go/g).toFixed(2):"0.00"}</div><div>${g?(a/g).toFixed(2):"0.00"}</div><div><button onclick="openForm('estatistica','${s.id}')">Editar</button></div></div>`}).join("");
}

function renderTrofeus(){
  const campeoes=getTable("CAMPEOES");
  $("trophy-grid").innerHTML=campeoes.map(t=>`<article class="trophy-card"><h3>${compName(t.competicao_id)}</h3><div class="cups">🏆</div><span>${t.temporada||"-"} • ${t.clube||"-"}</span><div class="entity-actions"><button onclick="openForm('campeao','${t.id}')">Editar</button><button class="delete" onclick="removeRecord('campeao','${t.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhum título cadastrado.");
}

function renderTop11(){
  const top11=getTable("TOP11");
  $("top11Pitch").innerHTML=top11.map(p=>`<div class="field-player">${p.overall||"-"}<br><span>${p.posicao||""}</span><span>${p.jogador||"-"}</span></div>`).join("")||`<div class="field-player">+<br><span>Cadastre o Top 11</span></div>`;
}

function renderBolaOuro(){
  const all = getTable("BOLA_DE_OURO").slice();

  const availableSeasons = [...new Set(all.map(b=>b.temporada).filter(Boolean))].sort().reverse();
  const activeSeason = availableSeasons[0] || getCareerSeasons()[0]?.temporada || "-";

  const seasonRows = all
    .filter(b=>String(b.temporada||"")===String(activeSeason))
    .sort((a,b)=>num(a.posicao)-num(b.posicao))
    .slice(0,10);

  const winner = seasonRows.find(b=>String(b.posicao)==="1") || seasonRows[0];

  const seasonLabel = $("ballonSeasonLabel");
  if(seasonLabel) seasonLabel.textContent = activeSeason !== "-" ? `1º ao 10º colocado • ${activeSeason}` : "1º ao 10º colocado";

  const poster = $("ballon-poster");
  if(poster){
    const imgUrl = winner ? (winner.imagem_destaque_url || winner.imagem || winner.url || "") : "";

    if(imgUrl){
      poster.classList.add("has-image");
      poster.style.backgroundImage = `url("${imgUrl}")`;
    }else{
      poster.classList.remove("has-image");
      poster.style.backgroundImage = "";
    }
  }

  const list = $("ballon-ranking-list");
  if(!list) return;

  list.innerHTML = `
    <div class="ballon-head">
      <div>#</div>
      <div>Jogador</div>
      <div>Idade</div>
      <div>Valor de mercado</div>
      <div></div>
    </div>
    ${seasonRows.map(row=>`
      <div class="ballon-row ${String(row.posicao)==="1"?"first":""}">
        <div class="ballon-pos">${row.posicao||"-"}</div>
        <div class="ballon-player-cell">
          <span class="flag-dot">${flagFrom(row.nacionalidade || row.pais || row.país)}</span>
          <button onclick="openPlayerByName('${escapeAttr(row.jogador||"")}')">${row.jogador||"-"}</button>
        </div>
        <div>${row.idade||"-"}</div>
        <div>${row.valor_mercado||row.valor||"-"}</div>
        <div class="ballon-actions">
          <button onclick="openForm('bolaouro','${row.id}')">Editar</button>
        </div>
      </div>
    `).join("")}
  `;

  if(!seasonRows.length){
    list.innerHTML += `<div class="ballon-row empty-row"><div>Nenhum ranking cadastrado para a temporada selecionada.</div></div>`;
  }
}

function renderMuseu(){
  const midias=getCareerMedia();
  $("media-grid").innerHTML=midias.map(m=>`<article class="media-card"><div>${m.tipo==="video"?"🎥":"📸"}</div><strong>${m.titulo||"-"}</strong><span>${m.temporada||"-"} • ${m.descricao||""}</span>${m.url?`<a href="${m.url}" target="_blank">Abrir mídia</a>`:""}<div class="entity-actions"><button onclick="openForm('midia','${m.id}')">Editar</button><button class="delete" onclick="removeRecord('midia','${m.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhuma mídia cadastrada nesta carreira.");
}


function flagFrom(value){
  const raw = String(value||"").trim();
  if(!raw) return "🌐";

  // Se já vier emoji de bandeira, usa direto.
  if(raw.length <= 4 && /[\uD83C][\uDDE6-\uDDFF]/.test(raw)) return raw;

  const v = raw.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g,"");

  const map = {
    brasil:"🇧🇷", brasileiro:"🇧🇷", brazil:"🇧🇷",
    franca:"🇫🇷", france:"🇫🇷", frances:"🇫🇷",
    espanha:"🇪🇸", spain:"🇪🇸", espanhol:"🇪🇸",
    portugal:"🇵🇹", portugues:"🇵🇹",
    inglaterra:"🏴", england:"🏴", ingles:"🏴",
    italia:"🇮🇹", italy:"🇮🇹", italiano:"🇮🇹",
    alemanha:"🇩🇪", germany:"🇩🇪", alemao:"🇩🇪",
    argentina:"🇦🇷", argentino:"🇦🇷",
    holanda:"🇳🇱", netherlands:"🇳🇱", paisesbaixos:"🇳🇱",
    egito:"🇪🇬", egypt:"🇪🇬",
    marrocos:"🇲🇦", morocco:"🇲🇦",
    belgica:"🇧🇪", belgium:"🇧🇪",
    uruguai:"🇺🇾", uruguay:"🇺🇾",
    noruega:"🇳🇴", norway:"🇳🇴",
    suecia:"🇸🇪", sweden:"🇸🇪",
    croacia:"🇭🇷", croatia:"🇭🇷",
    servia:"🇷🇸", serbia:"🇷🇸",
    suica:"🇨🇭", switzerland:"🇨🇭",
    dinamarca:"🇩🇰", denmark:"🇩🇰",
    polonia:"🇵🇱", poland:"🇵🇱",
    senegal:"🇸🇳",
    costadomarfim:"🇨🇮", ivorycoast:"🇨🇮",
    canada:"🇨🇦",
    estadosunidos:"🇺🇸", eua:"🇺🇸", usa:"🇺🇸"
  };

  return map[v] || "🌐";
}

function escapeAttr(value){
  return String(value||"").replace(/'/g,"\\'").replace(/"/g,"&quot;");
}

function openPlayerByName(name){
  const player = getTable("PERSONAGENS").find(p => String(p.nome||"").toLowerCase() === String(name||"").toLowerCase());

  if(player){
    openForm("personagem", String(player.id));
    return;
  }

  alert("Jogador ainda não está cadastrado como personagem. Nome: " + name);
}

function emptyCard(text){return `<article class="entity-card"><small>${text}</small></article>`}
function setActiveProtagonist(id){active.protagonista_id=String(id);active.temporada="";saveActive();renderAll()}


function editActiveProtagonist(){
  const protagonist = getActiveProtagonist();

  if(!protagonist || !protagonist.id){
    openForm("personagem");
    return;
  }

  openForm("personagem", String(protagonist.id));
}

function navigate(pageId){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".menu-item").forEach(i=>i.classList.remove("active"));
  document.getElementById(pageId)?.classList.add("active");
  document.querySelector(`.menu-item[data-page="${pageId}"]`)?.classList.add("active");
  $("page-title").textContent=pageTitles[pageId]||"Football Legacy";
}

document.querySelectorAll(".menu-item").forEach(b=>b.onclick=()=>navigate(b.dataset.page));
document.querySelectorAll("[data-form]").forEach(b=>b.onclick=()=>openForm(b.dataset.form));
document.querySelectorAll("[data-ballon-batch]").forEach(b=>b.onclick=()=>openBallonBatchForm());
$("syncBtn").onclick=loadData;
$("primaryCreateBtn").onclick=()=>openForm(getActiveCareer()?"personagem":"carreiraRapida");
if($("seasonCreateBtn")) $("seasonCreateBtn").onclick=openSeasonFlow;
if($("protagonistEditCard")) $("protagonistEditCard").onclick=editActiveProtagonist;

const modal=$("modal"), form=$("dynamic-form"), modalTitle=$("modal-title");
$("close-modal").onclick=closeModal;
modal.onclick=e=>{if(e.target===modal)closeModal()};
let currentForm=null;

function closeModal(){modal.classList.remove("active");document.querySelector(".modal-box").classList.remove("ballon-modal");form.innerHTML=""}



function openBallonBatchForm(){
  currentForm = {kind:"bolaouroBatch", id:null};

  const seasons = getCareerSeasons().map(s => s.temporada).filter(Boolean);
  const uniqueSeasons = [...new Set(seasons)];

  if(!uniqueSeasons.length){
    alert("Crie uma TEMPORADA antes de cadastrar o ranking Bola de Ouro. Assim o ranking fica vinculado a uma temporada existente.");
    openForm("temporada");
    return;
  }

  const defaultSeason = uniqueSeasons[0];

  modalTitle.textContent = "Novo ranking Bola de Ouro";
  document.querySelector(".modal-box").classList.add("ballon-modal");

  const seasonOptions = uniqueSeasons.map(s => `<option value="${s}">${s}</option>`).join("");

  const rows = Array.from({length:10}, (_,i)=>i+1).map(pos=>`
    <div class="ballon-batch-row">
      <strong>${pos}</strong>
      <input name="jogador_${pos}" placeholder="Nome do jogador">
      <input name="nacionalidade_${pos}" placeholder="País ou emoji. Ex: França ou 🇫🇷">
      <input name="idade_${pos}" type="number" placeholder="Idade">
      <input name="valor_mercado_${pos}" placeholder="Ex: €90M">
    </div>
  `).join("");

  form.innerHTML = `
    <div class="ballon-batch-form">
      <div class="ballon-batch-top">
        <div class="form-field">
          <label>Temporada</label>
          <select name="temporada">${seasonOptions}</select>
          <div class="ballon-save-note">O ranking será salvo nessa temporada. Para editar temporadas antigas, selecione aqui.</div>
        </div>
        <div class="ballon-batch-image">
          <label>
            Imagem de fundo do vencedor
            <input name="imagem_destaque_url" placeholder="URL gerada automaticamente">
          </label>
          <button type="button" class="upload-btn" onclick="triggerUpload('imagem_destaque_url')">Importar</button>
          <input type="file" id="file_imagem_destaque_url" accept="image/png,image/jpeg,image/webp,video/mp4" style="display:none" onchange="uploadToCloudinary(event,'imagem_destaque_url')">
        </div>
      </div>

      <div class="ballon-batch-table">
        <div class="ballon-batch-head">
          <div>#</div>
          <div>Jogador</div>
          <div>País / Bandeira</div>
          <div>Idade</div>
          <div>Valor</div>
        </div>
        ${rows}
      </div>

      <div class="form-actions">
        <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="gold-btn" id="saveBtn">Salvar ranking</button>
      </div>
    </div>
  `;

  form.onsubmit = async e => {
    e.preventDefault();
    const btn = $("saveBtn");

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      await saveBallonBatch(data, btn);
      alert("Ranking Bola de Ouro salvo com sucesso.");
      closeModal();
    }catch(err){
      setButtonLoading(btn,false);
      console.error(err);
      setStatus("Erro ao salvar ranking: " + err.message, "error");
      const existing = form.querySelector(".ballon-error-note");
      if(existing) existing.remove();
      form.insertAdjacentHTML("beforeend", `<div class="ballon-error-note">${err.message}</div>`);
    }
  };

  modal.classList.add("active");
}

async function saveBallonBatch(data, button){
  const temporada = data.temporada || "";
  const imagem = data.imagem_destaque_url || "";

  if(!temporada){
    throw new Error("Selecione uma temporada.");
  }

  const registros = [];

  for(let pos=1; pos<=10; pos++){
    const jogador = (data[`jogador_${pos}`] || "").trim();

    if(!jogador) continue;

    registros.push({
      temporada,
      posicao: pos,
      jogador,
      idade: data[`idade_${pos}`] || "",
      valor_mercado: data[`valor_mercado_${pos}`] || "",
      nacionalidade: data[`nacionalidade_${pos}`] || "",
      overall: "",
      imagem_destaque_url: pos === 1 ? imagem : ""
    });
  }

  if(!registros.length){
    throw new Error("Preencha pelo menos o 1º colocado.");
  }

  setButtonLoading(button,true);
  setStatus("Salvando ranking Bola de Ouro...");

  // Evita duplicar a mesma temporada: remove ranking antigo da temporada antes de salvar o novo.
  const antigos = getTable("BOLA_DE_OURO").filter(r => String(r.temporada) === String(temporada));
  for(const antigo of antigos){
    const del = await apiPost({action:"delete", table:"BOLA_DE_OURO", id:antigo.id});
    if(!del.ok) throw new Error(del.error || "Erro ao limpar ranking antigo.");
  }

  for(const record of registros){
    const json = await apiPost({
      action:"create",
      table:"BOLA_DE_OURO",
      record
    });

    if(!json.ok){
      throw new Error(json.error || "Erro ao salvar posição " + record.posicao);
    }
  }

  await loadData();

  const salvos = getTable("BOLA_DE_OURO").filter(r => String(r.temporada) === String(temporada));

  // Checagem útil: se colunas novas não existem no Apps Script/planilha, valores voltam vazios.
  const primeiro = salvos.find(r => String(r.posicao) === "1");
  if(primeiro && registros[0].idade && !primeiro.idade){
    throw new Error("O ranking foi criado, mas idade/valor/imagem não voltaram da planilha. Atualize o Apps Script V1.5 e execute setupDatabase.");
  }

  setButtonLoading(button,false);
}


let selectedSeasonTeam = null;
let selectedCompetitionsForSeason = [];

async function searchTeamsForSeason(){
  const query = $("seasonTeamSearch")?.value?.trim();
  const results = $("seasonTeamResults");
  if(!query || !results) return;

  results.innerHTML = `<div class="entity-card"><small>Buscando time...</small></div>`;

  try{
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const json = await res.json();
    const teams = (json.teams || []).filter(t => String(t.strSport||"").toLowerCase().includes("soccer"));

    if(!teams.length){
      results.innerHTML = `<div class="entity-card"><small>Nenhum time encontrado. Digite outro nome.</small></div>`;
      return;
    }

    results.innerHTML = teams.slice(0,8).map((t,i)=>`
      <div class="team-result">
        <img src="${t.strBadge || ""}" onerror="this.style.display='none'">
        <div>
          <strong>${t.strTeam}</strong>
          <small>${t.strLeague || "-"} • ${t.strCountry || "-"}</small>
        </div>
        <button type="button" onclick='selectSeasonTeam(${JSON.stringify({
          name:t.strTeam,
          league:t.strLeague || "",
          country:t.strCountry || "",
          badge:t.strBadge || ""
        }).replace(/'/g,"&apos;")})'>Selecionar</button>
      </div>
    `).join("");
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
        <strong>${team.name}</strong>
        <small>${team.league || "-"} • ${team.country || "-"}</small>
      </div>
    `;
  }

  renderCompetitionSuggestions(team);
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
  }

  list.push("Champions League","Europa League","Conference League","Mundial de Clubes");

  return [...new Set(list.filter(Boolean))];
}

function renderCompetitionSuggestions(team){
  const wrap = $("seasonCompetitionChecks");
  if(!wrap) return;

  const comps = competitionSuggestions(team);

  wrap.innerHTML = comps.map((c,i)=>`
    <label class="comp-check">
      <input type="checkbox" value="${c}" ${i===0?"checked":""} onchange="renderSeasonStatsRows()">
      ${c}
    </label>
  `).join("");

  renderSeasonStatsRows();
}

function getSelectedSeasonCompetitions(){
  return [...document.querySelectorAll("#seasonCompetitionChecks input:checked")].map(i=>i.value);
}

function renderSeasonStatsRows(){
  const wrap = $("seasonStatsRows");
  if(!wrap) return;

  const comps = getSelectedSeasonCompetitions();
  selectedCompetitionsForSeason = comps;

  if(!comps.length){
    wrap.innerHTML = `<div class="entity-card"><small>Selecione pelo menos uma competição.</small></div>`;
    return;
  }

  wrap.innerHTML = comps.map(comp=>`
    <div class="season-stats-row">
      <strong>${comp}</strong>
      <input name="jogos_${escapeName(comp)}" type="number" placeholder="Jogos">
      <input name="gols_${escapeName(comp)}" type="number" placeholder="Gols">
      <input name="assistencias_${escapeName(comp)}" type="number" placeholder="Assist.">
      <input name="cartoes_${escapeName(comp)}" type="number" placeholder="Cartões">
      <input name="media_geral_${escapeName(comp)}" placeholder="Média">
    </div>
  `).join("");
}

function escapeName(value){
  return String(value).replace(/[^a-zA-Z0-9]/g,"_");
}

function openSeasonFlow(){
  currentForm = {kind:"temporadaFluxo", id:null};
  selectedSeasonTeam = null;
  selectedCompetitionsForSeason = [];

  modalTitle.textContent = "Nova temporada";
  document.querySelector(".modal-box").classList.add("ballon-modal");

  form.innerHTML = `
    <div class="season-flow">
      <div class="season-flow-grid">
        <div class="form-field">
          <label>Temporada</label>
          <input name="temporada" placeholder="Ex: 2037/2038">
        </div>
        <div class="form-field">
          <label>Ano</label>
          <input name="ano" placeholder="Ex: 2038">
        </div>
      </div>

      <div class="team-search-row">
        <div class="form-field">
          <label>Selecionar time</label>
          <input id="seasonTeamSearch" placeholder="Ex: Newcastle, Milan, Real Madrid">
        </div>
        <button type="button" class="upload-btn" onclick="searchTeamsForSeason()">Buscar time</button>
      </div>

      <div class="selected-team" id="selectedTeamBox"></div>
      <div class="team-results" id="seasonTeamResults"></div>

      <div class="form-field">
        <label>Competições do time</label>
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
        <button type="submit" class="gold-btn" id="saveBtn">Salvar temporada</button>
      </div>
    </div>
  `;

  form.onsubmit = async e => {
    e.preventDefault();
    const btn = $("saveBtn");

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      await saveSeasonFlow(data, btn);
      alert("Temporada salva com sucesso.");
      closeModal();
    }catch(err){
      setButtonLoading(btn,false);
      console.error(err);
      setStatus("Erro ao salvar temporada: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

async function saveSeasonFlow(data, button){
  if(!active.carreira_id) throw new Error("Selecione ou crie uma carreira antes.");
  if(!active.protagonista_id) throw new Error("Selecione ou crie um protagonista antes.");
  if(!data.temporada) throw new Error("Informe a temporada.");
  if(!selectedSeasonTeam) throw new Error("Selecione um time.");

  const comps = selectedCompetitionsForSeason.length ? selectedCompetitionsForSeason : getSelectedSeasonCompetitions();
  if(!comps.length) throw new Error("Selecione pelo menos uma competição.");

  setButtonLoading(button,true);
  setStatus("Salvando nova temporada...");

  // Cria ou reutiliza clube
  let clube = getTable("CLUBES").find(c => String(c.nome||"").toLowerCase() === String(selectedSeasonTeam.name||"").toLowerCase());

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

  const tempJson = await apiPost({
    action:"create",
    table:"TEMPORADAS",
    record:{
      carreira_id:active.carreira_id,
      temporada:data.temporada,
      ano:data.ano || "",
      clube_id:clube.id,
      clube_nome:selectedSeasonTeam.name,
      escudo:selectedSeasonTeam.badge,
      liga:selectedSeasonTeam.league,
      competicoes:comps.join(", ")
    }
  });

  if(!tempJson.ok) throw new Error(tempJson.error || "Erro ao criar temporada.");

  for(const compNameText of comps){
    let comp = getTable("COMPETICOES").find(c => String(c.nome||"").toLowerCase() === String(compNameText).toLowerCase());

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

    const statJson = await apiPost({
      action:"create",
      table:"ESTATISTICAS",
      record:{
        personagem_id:active.protagonista_id,
        competicao_id:comp.id,
        temporada:data.temporada,
        jogos:data[`jogos_${key}`] || "",
        gols:data[`gols_${key}`] || "",
        assistencias:data[`assistencias_${key}`] || "",
        cartoes:data[`cartoes_${key}`] || "",
        media_geral:data[`media_geral_${key}`] || "",
        clube_id:clube.id,
        clube_nome:selectedSeasonTeam.name
      }
    });

    if(!statJson.ok) throw new Error(statJson.error || "Erro ao criar estatística.");
  }

  active.temporada = data.temporada;
  saveActive();

  await loadData();
  setButtonLoading(button,false);
}


function getSelectedSeasonRecord(){
  const season = active.temporada || getCurrentSeason(getProtagonistStats());
  return getCareerSeasons().find(s => String(s.temporada) === String(season));
}

function renderSeasonButtons(){
  const btn = $("seasonFinalizeBtn");
  if(!btn) return;

  const season = getSelectedSeasonRecord();

  if(!season){
    btn.textContent = "Finalizar temporada";
    btn.disabled = true;
    return;
  }

  const status = String(season.status || "").toLowerCase();

  if(status === "finalizada"){
    btn.textContent = "Temporada finalizada";
    btn.disabled = true;
  }else{
    btn.textContent = "Finalizar temporada";
    btn.disabled = false;
    btn.onclick = openFinishSeasonFlow;
  }
}

function openFinishSeasonFlow(){
  const seasons = getAvailableSeasonsForActivePlayer();

  if(!seasons.length){
    alert("Crie uma temporada antes de finalizar.");
    openSeasonFlow();
    return;
  }

  currentForm = {kind:"finalizarTemporada", id:null};
  modalTitle.textContent = "Finalizar temporada";
  document.querySelector(".modal-box").classList.add("ballon-modal");

  const currentSeason = active.temporada || getCurrentSeason(getProtagonistStats());
  const seasonOptions = seasons.map(s => `<option value="${s}" ${String(s)===String(currentSeason)?"selected":""}>${s}</option>`).join("");
  const characters = getCareerCharacters();
  const comps = getTable("COMPETICOES");

  const characterOptions = characters.map(p => `<option value="${p.id}">${p.nome}</option>`).join("");
  const compOptions = comps.map(c => `<option value="${c.id}">${c.nome}</option>`).join("");

  const top11Rows = Array.from({length:11}, (_,i)=>i+1).map(i => `
    <div class="finish-row">
      <strong>${i}</strong>
      <input name="top11_posicao_${i}" placeholder="POS">
      <input name="top11_jogador_${i}" placeholder="Jogador">
      <input name="top11_overall_${i}" type="number" placeholder="OVR">
    </div>
  `).join("");

  const ballonRows = Array.from({length:10}, (_,i)=>i+1).map(i => `
    <div class="finish-row">
      <strong>${i}</strong>
      <input name="bo_jogador_${i}" placeholder="Jogador">
      <input name="bo_nacionalidade_${i}" placeholder="País ou emoji">
      <input name="bo_idade_${i}" type="number" placeholder="Idade">
      <input name="bo_valor_${i}" placeholder="Ex: €90M">
    </div>
  `).join("");

  const majorCompetitions = [
    "Champions League",
    "Copa do Mundo",
    "Premier League",
    "La Liga",
    "Serie A",
    "Bundesliga",
    "Ligue 1",
    "Brasileirão",
    "Libertadores",
    "Mundial de Clubes"
  ];

  const championRows = majorCompetitions.map(name => `
    <div class="finish-row">
      <input name="champ_competicao" value="${name}" readonly>
      <input name="champ_campeao_${escapeName(name)}" placeholder="Time campeão">
      <input name="champ_artilheiro_${escapeName(name)}" placeholder="Artilheiro">
      <input name="champ_assist_${escapeName(name)}" placeholder="Líder assistências">
      <input name="champ_melhor_${escapeName(name)}" placeholder="Melhor jogador">
    </div>
  `).join("");

  form.innerHTML = `
    <div class="finish-season-form">
      <div class="finish-section">
        <h4>1. Temporada</h4>
        <div class="form-field">
          <label>Selecione a temporada que será finalizada</label>
          <select name="temporada" id="finishSeasonSelect">${seasonOptions}</select>
        </div>
      </div>

      <div class="finish-section">
        <h4>2. Estatísticas dos jogadores da carreira</h4>
        <p>Escolha jogador por jogador e preencha competição, jogos, gols, assistências, cartões e nota geral.</p>

        <div class="finish-add-line">
          <select id="finishPlayerSelect">${characterOptions}</select>
          <select id="finishCompSelect">${compOptions}</select>
          <input id="finishJogos" type="number" placeholder="Jogos">
          <input id="finishGols" type="number" placeholder="Gols">
          <input id="finishAssists" type="number" placeholder="Assist.">
          <input id="finishCartoes" type="number" placeholder="Cartões">
          <input id="finishNota" placeholder="Nota">
          <button type="button" onclick="addFinishStatLine()">Adicionar</button>
        </div>

        <div class="finish-stats-grid" id="finishStatsRows">
          <div class="finish-head">
            <div>Jogador</div><div>Competição</div><div>Jogos</div><div>Gols</div><div>Assist.</div><div>Cartões</div><div>Nota</div><div></div>
          </div>
        </div>
      </div>

      <div class="finish-section">
        <h4>3. Top 11 da temporada</h4>
        <div class="finish-top11-grid">
          <div class="finish-head"><div>#</div><div>Posição</div><div>Jogador</div><div>Overall</div></div>
          ${top11Rows}
        </div>
      </div>

      <div class="finish-section">
        <h4>4. Melhores do mundo</h4>
        <p>Preencha o ranking do 1º ao 10º. A imagem do vencedor pode ser vinculada abaixo.</p>
        <div class="ballon-batch-image">
          <label>
            Imagem de fundo do vencedor
            <input name="bo_imagem" placeholder="URL gerada automaticamente">
          </label>
          <button type="button" class="upload-btn" onclick="triggerUpload('bo_imagem')">Importar</button>
          <input type="file" id="file_bo_imagem" accept="image/png,image/jpeg,image/webp,video/mp4" style="display:none" onchange="uploadToCloudinary(event,'bo_imagem')">
        </div>
        <div class="finish-ballon-grid">
          <div class="finish-head"><div>#</div><div>Jogador</div><div>País</div><div>Idade</div><div>Valor</div></div>
          ${ballonRows}
        </div>
      </div>

      <div class="finish-section">
        <h4>5. Times campeões e prêmios dos grandes torneios</h4>
        <p>Preencha apenas o que tiver acontecido na temporada.</p>
        <div class="finish-champs-grid">
          <div class="finish-head"><div>Competição</div><div>Campeão</div><div>Artilheiro</div><div>Líder assist.</div><div>Melhor jogador</div></div>
          ${championRows}
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="gold-btn" id="saveBtn">Finalizar temporada</button>
      </div>
    </div>
  `;

  form.onsubmit = async e => {
    e.preventDefault();
    const btn = $("saveBtn");

    try{
      const data = Object.fromEntries(new FormData(form).entries());
      await saveFinishSeason(data, btn);
      alert("Temporada finalizada com sucesso. Você já pode iniciar uma nova temporada.");
      closeModal();
    }catch(err){
      setButtonLoading(btn,false);
      console.error(err);
      setStatus("Erro ao finalizar temporada: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

let finishStatLines = [];

function addFinishStatLine(){
  const playerId = $("finishPlayerSelect").value;
  const compId = $("finishCompSelect").value;

  const line = {
    id: Date.now() + Math.random(),
    personagem_id: playerId,
    competicao_id: compId,
    jogador: personagemName(playerId),
    competicao: compName(compId),
    jogos: $("finishJogos").value || "",
    gols: $("finishGols").value || "",
    assistencias: $("finishAssists").value || "",
    cartoes: $("finishCartoes").value || "",
    media_geral: $("finishNota").value || ""
  };

  finishStatLines.push(line);

  ["finishJogos","finishGols","finishAssists","finishCartoes","finishNota"].forEach(id => {
    const el = $(id);
    if(el) el.value = "";
  });

  renderFinishStatLines();
}

function removeFinishStatLine(id){
  finishStatLines = finishStatLines.filter(l => String(l.id) !== String(id));
  renderFinishStatLines();
}

function renderFinishStatLines(){
  const wrap = $("finishStatsRows");
  if(!wrap) return;

  const head = `
    <div class="finish-head">
      <div>Jogador</div><div>Competição</div><div>Jogos</div><div>Gols</div><div>Assist.</div><div>Cartões</div><div>Nota</div><div></div>
    </div>
  `;

  const rows = finishStatLines.map(l => `
    <div class="finish-row">
      <strong>${l.jogador}</strong>
      <span>${l.competicao}</span>
      <span>${l.jogos || "-"}</span>
      <span>${l.gols || "-"}</span>
      <span>${l.assistencias || "-"}</span>
      <span>${l.cartoes || "-"}</span>
      <span>${l.media_geral || "-"}</span>
      <button type="button" class="remove-line" onclick="removeFinishStatLine('${l.id}')">Remover</button>
    </div>
  `).join("");

  wrap.innerHTML = head + (rows || `<div class="entity-card"><small>Nenhuma linha adicionada ainda.</small></div>`);
}

async function saveFinishSeason(data, button){
  const temporada = data.temporada;
  if(!temporada) throw new Error("Selecione uma temporada.");

  setButtonLoading(button,true);
  setStatus("Finalizando temporada...");

  // Estatísticas
  for(const line of finishStatLines){
    const existing = getTable("ESTATISTICAS").find(s =>
      String(s.temporada) === String(temporada) &&
      String(s.personagem_id) === String(line.personagem_id) &&
      String(s.competicao_id) === String(line.competicao_id)
    );

    const record = {
      personagem_id: line.personagem_id,
      competicao_id: line.competicao_id,
      temporada,
      jogos: line.jogos,
      gols: line.gols,
      assistencias: line.assistencias,
      cartoes: line.cartoes,
      media_geral: line.media_geral
    };

    if(existing){
      const upd = await apiPost({action:"update", table:"ESTATISTICAS", id:existing.id, record});
      if(!upd.ok) throw new Error(upd.error || "Erro ao atualizar estatística.");
    }else{
      const crt = await apiPost({action:"create", table:"ESTATISTICAS", record});
      if(!crt.ok) throw new Error(crt.error || "Erro ao criar estatística.");
    }
  }

  // Limpa e recria Top 11 da temporada
  for(const old of getTable("TOP11").filter(r => String(r.temporada) === String(temporada))){
    await apiPost({action:"delete", table:"TOP11", id:old.id});
  }

  for(let i=1;i<=11;i++){
    const jogador = data[`top11_jogador_${i}`];
    if(!jogador) continue;

    const crt = await apiPost({
      action:"create",
      table:"TOP11",
      record:{
        temporada,
        posicao:data[`top11_posicao_${i}`] || i,
        jogador,
        overall:data[`top11_overall_${i}`] || ""
      }
    });
    if(!crt.ok) throw new Error(crt.error || "Erro ao salvar Top 11.");
  }

  // Limpa e recria Bola de Ouro
  for(const old of getTable("BOLA_DE_OURO").filter(r => String(r.temporada) === String(temporada))){
    await apiPost({action:"delete", table:"BOLA_DE_OURO", id:old.id});
  }

  for(let i=1;i<=10;i++){
    const jogador = data[`bo_jogador_${i}`];
    if(!jogador) continue;

    const crt = await apiPost({
      action:"create",
      table:"BOLA_DE_OURO",
      record:{
        temporada,
        posicao:i,
        jogador,
        idade:data[`bo_idade_${i}`] || "",
        valor_mercado:data[`bo_valor_${i}`] || "",
        nacionalidade:data[`bo_nacionalidade_${i}`] || "",
        imagem_destaque_url:i===1 ? (data.bo_imagem || "") : ""
      }
    });
    if(!crt.ok) throw new Error(crt.error || "Erro ao salvar Bola de Ouro.");
  }

  // Limpa e recria campeões dos grandes campeonatos
  for(const old of getTable("CAMPEOES").filter(r => String(r.temporada) === String(temporada))){
    await apiPost({action:"delete", table:"CAMPEOES", id:old.id});
  }

  const compsNames = [...document.querySelectorAll('input[name="champ_competicao"]')].map(i => i.value);

  for(const name of compsNames){
    const key = escapeName(name);
    const campeao = data[`champ_campeao_${key}`];

    if(!campeao && !data[`champ_artilheiro_${key}`] && !data[`champ_assist_${key}`] && !data[`champ_melhor_${key}`]) continue;

    let comp = getTable("COMPETICOES").find(c => String(c.nome||"").toLowerCase() === String(name).toLowerCase());

    if(!comp){
      const compJson = await apiPost({action:"create", table:"COMPETICOES", record:{nome:name}});
      if(!compJson.ok) throw new Error(compJson.error || "Erro ao criar competição.");
      comp = compJson.data;
    }

    const crt = await apiPost({
      action:"create",
      table:"CAMPEOES",
      record:{
        competicao_id:comp.id,
        temporada,
        clube:campeao || "",
        artilheiro:data[`champ_artilheiro_${key}`] || "",
        lider_assistencias:data[`champ_assist_${key}`] || "",
        melhor_jogador:data[`champ_melhor_${key}`] || ""
      }
    });
    if(!crt.ok) throw new Error(crt.error || "Erro ao salvar campeões.");
  }

  // Marca temporada como finalizada
  const seasonRecord = getCareerSeasons().find(s => String(s.temporada) === String(temporada));
  if(seasonRecord){
    await apiPost({
      action:"update",
      table:"TEMPORADAS",
      id:seasonRecord.id,
      record:{status:"finalizada"}
    });
  }

  active.temporada = temporada;
  saveActive();

  await loadData();
  setButtonLoading(button,false);
}

function openForm(kind,id=null){
  currentForm={kind,id};
  const schema=schemas[kind], table=tableMap[kind];
  if(!schema)return alert("Formulário não configurado: "+kind);
  const current=(id && table)?(getTable(table).find(x=>String(x.id)===String(id))||{}):{};
  modalTitle.textContent=id?`Editar ${kind}`:`Novo ${kind}`;

  form.innerHTML=schema.map(([key,label,type,options])=>{
    let value=current[key]??"";
    if(!id){
      if(["personagem","temporada","midia"].includes(kind)&&key==="carreira_id")value=active.carreira_id||"";
      if(kind==="estatistica"&&key==="personagem_id")value=active.protagonista_id||"";
      if(kind==="universo"&&key==="usuario_id")value=active.usuario_id||"";
      if(kind==="carreira"&&key==="universo_id"){const u=getUserUniverses(active.usuario_id)[0]||getTable("UNIVERSOS")[0];value=u?u.id:""}
      if(kind==="bolaouro"&&key==="temporada"){const s=getCareerSeasons()[0];value=s?s.temporada:""}
    }
    if(type==="select")return `<div class="form-field"><label>${label}</label><select name="${key}">${options.map(o=>`<option value="${o}" ${String(o)===String(value)?"selected":""}>${o}</option>`).join("")}</select></div>`;
    if(type==="textarea")return `<div class="form-field"><label>${label}</label><textarea name="${key}">${value}</textarea></div>`;
    if(type==="fileurl")return `<div class="form-field"><label>${label}</label><div class="file-row"><input name="${key}" type="text" value="${value}" placeholder="URL gerada automaticamente"><button type="button" class="upload-btn" onclick="triggerUpload('${key}')">Importar</button></div><input type="file" id="file_${key}" accept="image/png,image/jpeg,video/mp4" style="display:none" onchange="uploadToCloudinary(event,'${key}')"></div>`;
    return `<div class="form-field"><label>${label}</label><input name="${key}" type="${type}" value="${value}"></div>`;
  }).join("")+`<div class="form-actions"><button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button><button type="submit" class="gold-btn" id="saveBtn">Salvar</button></div>`;

  form.onsubmit=async e=>{
    e.preventDefault();
    const btn=$("saveBtn");
    try{
      const record=Object.fromEntries(new FormData(form).entries());

      if(currentForm.kind==="carreiraRapida"){
        await createQuickCareer(record,btn);
      }else if(currentForm.id){
        await updateRecord(currentForm.kind,currentForm.id,record,btn);
      }else{
        await createRecord(currentForm.kind,record,btn);
      }

      closeModal();
    }catch(err){
      setButtonLoading(btn,false);
      console.error(err);
      setStatus("Erro ao salvar: "+err.message,"error");
    }
  };
  modal.classList.add("active");
}

function triggerUpload(key){
  if(!CLOUDINARY_UPLOAD_PRESET){
    alert("Para ativar upload automático, me envie o Upload Preset unsigned do Cloudinary. O botão já está preparado.");
    return;
  }
  document.getElementById("file_"+key).click();
}

async function uploadToCloudinary(event,key){
  const file=event.target.files[0]; if(!file)return;
  const input=form.querySelector(`[name="${key}"]`);
  const data=new FormData();
  data.append("file",file);
  data.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);
  setStatus("Enviando mídia para Cloudinary...");
  const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,{method:"POST",body:data});
  const json=await res.json();
  if(!json.secure_url)throw new Error(json.error?.message||"Erro no upload Cloudinary");
  input.value=json.secure_url;
  setStatus("Mídia enviada ao Cloudinary. URL preenchida.", "ok");
}

window.openBallonBatchForm=openBallonBatchForm; window.openPlayerByName=openPlayerByName; window.openFinishSeasonFlow=openFinishSeasonFlow; window.addFinishStatLine=addFinishStatLine; window.removeFinishStatLine=removeFinishStatLine; window.openSeasonFlow=openSeasonFlow; window.searchTeamsForSeason=searchTeamsForSeason; window.selectSeasonTeam=selectSeasonTeam; window.renderSeasonStatsRows=renderSeasonStatsRows; window.openForm=openForm; window.removeRecord=removeRecord; window.setActiveProtagonist=setActiveProtagonist; window.editActiveProtagonist=editActiveProtagonist; window.closeModal=closeModal; window.triggerUpload=triggerUpload; window.uploadToCloudinary=uploadToCloudinary;
bindSelectors();
loadData();
