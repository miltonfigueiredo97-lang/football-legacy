const API_URL = window.FOOTBALL_LEGACY_API || "https://script.google.com/macros/s/AKfycbwf5AklY1S3w9Ba28oLx4BllIWl4ucS5Tdlyh1kgbicqJQgPrQqmbcxqLD85dbN68FBDQ/exec";
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

const tableMap = {usuario:"USUARIOS",universo:"UNIVERSOS",carreira:"CARREIRAS",personagem:"PERSONAGENS",clube:"CLUBES",temporada:"TEMPORADAS",competicao:"COMPETICOES",campeao:"CAMPEOES",estatistica:"ESTATISTICAS",bolaouro:"BOLA_DE_OURO",top11:"TOP11",midia:"MIDIAS"};

const schemas = {
  personagem:[["carreira_id","ID da carreira","number"],["tipo","Tipo","select",["protagonista","coadjuvante","real"]],["nome","Nome","text"],["foto","Foto URL","fileurl"],["posicao","Posição","text"],["nacionalidade","Nacionalidade","text"]],
  clube:[["nome","Nome","text"],["pais","País","text"],["escudo","Escudo URL","fileurl"],["estadio","Estádio","text"]],
  competicao:[["nome","Nome","text"]],
  campeao:[["competicao_id","ID da competição","number"],["temporada","Temporada","text"],["clube","Clube campeão","text"],["artilheiro","Artilheiro","text"],["lider_assistencias","Líder assistências","text"],["melhor_jogador","Melhor jogador","text"]],
  estatistica:[["personagem_id","ID do personagem","number"],["competicao_id","ID da competição","number"],["temporada","Temporada","text"],["jogos","Jogos","number"],["gols","Gols","number"],["assistencias","Assistências","number"],["cartoes","Cartões","number"],["media_geral","Nota geral","text"]],
  top11:[["temporada","Temporada","text"],["posicao","Posição","text"],["jogador","Jogador","text"],["overall","Overall","number"]],
  bolaouro:[["temporada","Temporada","text"],["posicao","Posição","number"],["jogador","Jogador","text"],["idade","Idade","number"],["valor_mercado","Valor de mercado","text"],["nacionalidade","Nacionalidade / Bandeira","text"],["overall","Overall","number"],["imagem_destaque_url","Imagem destaque do vencedor","fileurl"]],
  midia:[["carreira_id","ID da carreira","number"],["temporada","Temporada","text"],["tipo","Tipo","select",["imagem","video"]],["titulo","Título","text"],["descricao","Descrição","textarea"],["url","URL","fileurl"]]
};

const pageTitles = {dashboard:"Resumo",personagens:"Personagens",estatisticas:"Estatísticas",trofeus:"Troféus",top11:"Top 11",bolaouro:"Bola de Ouro",clubes:"Clubes",museu:"Museu"};

function $(id){return document.getElementById(id)}
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

    const finalUrl = (API_URL || "https://script.google.com/macros/s/AKfycbwf5AklY1S3w9Ba28oLx4BllIWl4ucS5Tdlyh1kgbicqJQgPrQqmbcxqLD85dbN68FBDQ/exec") + "?action=all&cache=" + Date.now();

    console.log("Football Legacy API:", finalUrl);

    const res = await fetch(finalUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow"
    });

    if(!res.ok){
      throw new Error("HTTP " + res.status + " ao chamar Apps Script");
    }

    const text = await res.text();

    let json;
    try{
      json = JSON.parse(text);
    }catch(parseErr){
      console.error("Resposta não JSON:", text);
      throw new Error("Apps Script não retornou JSON. Veja Console.");
    }

    if(!json.ok){
      throw new Error(json.error || "Apps Script retornou ok:false");
    }

    db = json.data || {};

    console.log("Football Legacy DB carregado:", db);

    ensureActive();
    renderAll();

    setStatus("Dados carregados do Google Sheets com sucesso.","ok");
  }catch(err){
    console.error("Erro loadData:", err);
    setStatus("Erro ao carregar Google Sheets: " + err.message, "error");
  }
}

async function apiPost(payload){
  const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
  const text=await res.text();
  try{return JSON.parse(text)}catch(e){console.error(text);throw new Error("Resposta inválida da API")}
}

function renderAll(){
  const steps=[renderSelectors,renderDashboard,renderPlayedSeasons,renderPersonagens,renderStats,renderTrofeus,renderTop11,renderBolaOuro,renderClubes,renderMuseu,renderPrimaryButton];

  for(const step of steps){
    try{
      if(typeof step === "function") step();
    }catch(e){
      console.error("Erro em " + (step.name || "render"), e);
      setStatus("Erro em " + (step.name || "render") + ": " + e.message, "error");
    }
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

function renderPlayedSeasons(){
  const container = $("playedSeasonsCards") || $("playedSeasonsTable");
  if(!container) return;

  const stats = getProtagonistStats();
  const seasonsTable = getCareerSeasons();
  const clubes = getTable("CLUBES");
  const bySeason = {};

  function ensureSeason(key){
    if(!bySeason[key]){
      const seasonRecord = seasonsTable.find(t => String(t.temporada) === String(key)) || {};
      const club = clubes.find(c => String(c.id) === String(seasonRecord.clube_id)) ||
                   clubes.find(c => String(c.nome||"").toLowerCase() === String(seasonRecord.clube_nome||"").toLowerCase()) ||
                   {};
      bySeason[key] = {
        temporada:key,
        time: seasonRecord.clube_nome || seasonRecord.time || club.nome || "-",
        escudo: seasonRecord.escudo || club.escudo || "",
        jogos:0,
        gols:0,
        assistencias:0,
        cartoes:0,
        notas:[],
        titulos:[]
      };
    }
    return bySeason[key];
  }

  seasonsTable.forEach(t => {
    if(t.temporada) ensureSeason(t.temporada);
  });

  stats.forEach(s=>{
    const key=s.temporada||"-";
    const row=ensureSeason(key);
    row.jogos+=num(s.jogos);
    row.gols+=num(s.gols);
    row.assistencias+=num(s.assistencias);
    row.cartoes+=num(s.cartoes);
    if(s.media_geral !== undefined && s.media_geral !== ""){
      row.notas.push(num(s.media_geral));
    }
  });

  getTable("CAMPEOES").forEach(t=>{
    if(!t.temporada) return;
    const row=ensureSeason(t.temporada);
    if(t.clube || t.competicao_id){
      row.titulos.push({
        nome: compName(t.competicao_id),
        clube: t.clube || "",
        icon: trophyIcon(compName(t.competicao_id))
      });
    }
  });

  const rows=Object.values(bySeason).sort((a,b)=>compareSeasonsDesc(a.temporada,b.temporada));

  if(!rows.length){
    container.innerHTML = `<div class="season-empty">Nenhuma temporada jogada cadastrada ainda.</div>`;
    return;
  }

  container.innerHTML = rows.map(r=>{
    const avgGoals = r.jogos ? (r.gols/r.jogos).toFixed(2) : "0.00";
    const avgAssists = r.jogos ? (r.assistencias/r.jogos).toFixed(2) : "0.00";
    const avgRating = r.notas.length ? (r.notas.reduce((a,b)=>a+b,0)/r.notas.length).toFixed(2) : "-";
    const titles = r.titulos.length
      ? r.titulos.map(t=>`<span class="title-badge" title="${t.nome}${t.clube?` • ${t.clube}`:""}">${t.icon}</span>`).join("")
      : `<span class="title-badge empty" title="Sem títulos">–</span>`;

    return `
      <article class="season-card">
        <div class="season-card-main">
          <div class="season-club-crest">
            ${r.escudo ? `<img src="${r.escudo}" onerror="this.parentElement.innerHTML='<span>⚽</span>'">` : `<span>⚽</span>`}
          </div>
          <div>
            <strong>${r.temporada}</strong>
            <h4>${r.time || "-"}</h4>
            <small>Resumo da temporada</small>
          </div>
        </div>

        <div class="season-stat"><small>Jogos</small><strong>${r.jogos}</strong></div>
        <div class="season-stat"><small>Gols</small><strong>${r.gols}</strong></div>
        <div class="season-stat"><small>Assist.</small><strong>${r.assistencias}</strong></div>
        <div class="season-stat"><small>G/J</small><strong>${avgGoals}</strong></div>
        <div class="season-stat"><small>A/J</small><strong>${avgAssists}</strong></div>
        <div class="season-stat"><small>Cartões</small><strong>${r.cartoes}</strong></div>
        <div class="season-stat"><small>Nota média</small><strong>${avgRating}</strong></div>
        <div class="season-titles">${titles}</div>
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
      <button onclick="openPlayerByName('${escapeAttr(r.jogador||"")}')">${r.jogador||"-"}</button>
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
  const raw=String(v||"").trim();
  if(!raw)return"🌐";
  if(raw.length<=4&&/[\uD83C][\uDDE6-\uDDFF]/.test(raw))return raw;

  const k=raw.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g,"");

  const map={
    br:"🇧🇷",bra:"🇧🇷",brasil:"🇧🇷",brazil:"🇧🇷",brasileiro:"🇧🇷",
    fr:"🇫🇷",fra:"🇫🇷",franca:"🇫🇷",france:"🇫🇷",frances:"🇫🇷",
    es:"🇪🇸",esp:"🇪🇸",espanha:"🇪🇸",spain:"🇪🇸",espanhol:"🇪🇸",
    pt:"🇵🇹",por:"🇵🇹",portugal:"🇵🇹",portugues:"🇵🇹",
    en:"🏴",eng:"🏴",inglaterra:"🏴",england:"🏴",ingles:"🏴",
    it:"🇮🇹",ita:"🇮🇹",italia:"🇮🇹",italy:"🇮🇹",italiano:"🇮🇹",
    de:"🇩🇪",ger:"🇩🇪",alemanha:"🇩🇪",germany:"🇩🇪",alemao:"🇩🇪",
    ar:"🇦🇷",arg:"🇦🇷",argentina:"🇦🇷",argentino:"🇦🇷",
    nl:"🇳🇱",holanda:"🇳🇱",netherlands:"🇳🇱",
    eg:"🇪🇬",egito:"🇪🇬",egypt:"🇪🇬",
    ma:"🇲🇦",marrocos:"🇲🇦",morocco:"🇲🇦",
    be:"🇧🇪",belgica:"🇧🇪",belgium:"🇧🇪",
    uy:"🇺🇾",uruguai:"🇺🇾",uruguay:"🇺🇾",
    no:"🇳🇴",noruega:"🇳🇴",norway:"🇳🇴",
    se:"🇸🇪",suecia:"🇸🇪",sweden:"🇸🇪",
    hr:"🇭🇷",croacia:"🇭🇷",croatia:"🇭🇷",
    rs:"🇷🇸",servia:"🇷🇸",serbia:"🇷🇸",
    ch:"🇨🇭",suica:"🇨🇭",switzerland:"🇨🇭",
    dk:"🇩🇰",dinamarca:"🇩🇰",denmark:"🇩🇰",
    pl:"🇵🇱",polonia:"🇵🇱",poland:"🇵🇱",
    sn:"🇸🇳",senegal:"🇸🇳",
    ci:"🇨🇮",costadomarfim:"🇨🇮",ivorycoast:"🇨🇮",
    ca:"🇨🇦",canada:"🇨🇦",
    us:"🇺🇸",usa:"🇺🇸",eua:"🇺🇸",estadosunidos:"🇺🇸"
  };
  return map[k]||"🌐";
}

function openForm(kind,id=null){
  const schema=schemas[kind], table=tableMap[kind]; if(!schema||!table)return alert("Formulário não configurado: "+kind);
  const current=id?(getTable(table).find(x=>String(x.id)===String(id))||{}):{};
  modalTitle.textContent=id?`Editar ${kind}`:`Novo ${kind}`;
  form.className="form-grid";
  form.innerHTML=schema.map(([key,label,type,options])=>{
    let value=current[key]??"";
    if(!id){if(key==="carreira_id")value=active.carreira_id||""; if(key==="personagem_id")value=active.protagonista_id||""; if(key==="temporada")value=getCurrentSeason()||""}
    if(type==="select")return `<div class="form-field"><label>${label}</label><select name="${key}">${options.map(o=>`<option value="${o}" ${String(o)===String(value)?"selected":""}>${o}</option>`).join("")}</select></div>`;
    if(type==="textarea")return `<div class="form-field"><label>${label}</label><textarea name="${key}">${value}</textarea></div>`;
    if(type==="fileurl")return `<div class="form-field"><label>${label}</label><div class="file-row"><input name="${key}" value="${value}" placeholder="URL"><button type="button" class="upload-btn" onclick="triggerUpload('${key}')">Importar</button></div><input type="file" id="file_${key}" accept="image/png,image/jpeg,image/webp,video/mp4" style="display:none" onchange="uploadToCloudinary(event,'${key}')"></div>`;
    return `<div class="form-field"><label>${label}</label><input name="${key}" type="${type}" value="${value}"></div>`;
  }).join("")+`<div class="form-actions"><button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button><button class="gold-btn" id="saveBtn">Salvar</button></div>`;
  form.onsubmit=async e=>{e.preventDefault();const btn=$("saveBtn");btn.disabled=true;btn.textContent="Salvando...";try{let record=applyDefaults(kind,Object.fromEntries(new FormData(form).entries()));const payload=id?{action:"update",table,id,record}:{action:"create",table,record};const res=await apiPost(payload);if(!res.ok)throw new Error(res.error||"Erro ao salvar");closeModal();await loadData()}catch(err){btn.disabled=false;btn.textContent="Salvar";setStatus("Erro ao salvar: "+err.message,"error")}};
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
    btn.disabled=true;
    btn.textContent="Salvando...";

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

window.openForm=openForm;window.removeRecord=removeRecord;window.setActiveProtagonist=setActiveProtagonist;window.openPlayerByName=openPlayerByName;window.triggerUpload=triggerUpload;window.uploadToCloudinary=uploadToCloudinary;

window.addEventListener('error', function(event){
  console.error("Football Legacy error:", event.error || event.message);
  setStatus("Erro no dashboard: " + (event.message || "erro desconhecido"), "error");
});

window.addEventListener('unhandledrejection', function(event){
  console.error("Football Legacy promise error:", event.reason);
  const msg = event.reason && event.reason.message ? event.reason.message : String(event.reason || "erro desconhecido");
  setStatus("Erro no dashboard: " + msg, "error");
});


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
