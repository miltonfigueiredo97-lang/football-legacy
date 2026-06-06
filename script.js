const API_URL = window.FOOTBALL_LEGACY_API;
const CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET || "";

let db = {};
let active = {
  usuario_id: localStorage.getItem("fl_active_usuario_id") || "",
  carreira_id: localStorage.getItem("fl_active_carreira_id") || "",
  protagonista_id: localStorage.getItem("fl_active_protagonista_id") || ""
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
  bolaouro:[["temporada","Temporada","text"],["posicao","Posição","number"],["jogador","Jogador","text"],["overall","Overall","number"]],
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
function saveActive(){localStorage.setItem("fl_active_usuario_id",active.usuario_id||"");localStorage.setItem("fl_active_carreira_id",active.carreira_id||"");localStorage.setItem("fl_active_protagonista_id",active.protagonista_id||"")}

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
  $("userSelect").onchange=e=>{active.usuario_id=e.target.value;const c=getCareersForUser(active.usuario_id);active.carreira_id=c[0]?String(c[0].id):"";active.protagonista_id="";const chars=getCareerCharacters();active.protagonista_id=chars[0]?String(chars[0].id):"";saveActive();renderAll()};
  $("careerSelect").onchange=e=>{active.carreira_id=e.target.value;active.protagonista_id="";const chars=getCareerCharacters();active.protagonista_id=chars[0]?String(chars[0].id):"";saveActive();renderAll()};
  $("protagonistSelect").onchange=e=>{active.protagonista_id=e.target.value;saveActive();renderAll()};
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
  btn.disabled=loading;
  btn.textContent=loading?"Salvando...":"Salvar";
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

function renderDashboard(){
  const user=getActiveUser(), career=getActiveCareer(), protagonist=getActiveProtagonist(), chars=getCareerCharacters(), seasons=getCareerSeasons(), stats=getProtagonistStats(), bola=getTable("BOLA_DE_OURO");
  const games=stats.reduce((a,b)=>a+num(b.jogos),0), goals=stats.reduce((a,b)=>a+num(b.gols),0), assists=stats.reduce((a,b)=>a+num(b.assistencias),0);
  $("careerNameSide").textContent=career?career.nome:"Football Legacy";
  $("careerMetaSide").textContent=user?user.nome:"Google Sheets conectado";
  $("currentSeason").textContent=seasons[0]?.temporada||"Banco conectado";
  $("mainCharacterTitle").textContent=protagonist?protagonist.nome:"Protagonista";
  $("mainCharacterDesc").textContent=career?career.descricao||"Resumo da carreira do jogador selecionado.":"Crie uma carreira na Administração.";
  $("activeCareerName").textContent=career?career.nome:"-";
  $("activePosition").textContent=protagonist?protagonist.posicao||"-":"-";
  $("activeNationality").textContent=protagonist?protagonist.nacionalidade||"-":"-";
  $("activeSeasonsCount").textContent=new Set(stats.map(s=>s.temporada)).size;
  $("mainCharacter").textContent=protagonist?protagonist.nome:"Sem personagem";
  $("mainInitials").textContent=initials(protagonist?protagonist.nome:"FL");
  $("mainCharacterSub").textContent=protagonist?`${protagonist.posicao||"-"} • ${protagonist.nacionalidade||"-"}`:"Cadastre um personagem";
  $("mainType").textContent=protagonist?protagonist.tipo:"FL";
  $("sumGames").textContent=games; $("sumGoals").textContent=goals; $("sumAssists").textContent=assists;
  $("avgGoals").textContent=games?(goals/games).toFixed(2):"0.00";
  $("avgAssists").textContent=games?(assists/games).toFixed(2):"0.00";
  $("countBallon").textContent=bola.filter(x=>String(x.posicao)==="1"&&(!protagonist||x.jogador===protagonist.nome)).length;
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
    <div class="entity-top"><div class="entity-avatar">${initials(p.nome)}</div><div><h3>${p.nome||"-"}</h3><small>ID ${p.id} • ${p.tipo||"-"} • ${p.posicao||"-"}</small></div></div>
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
  const stats=getProtagonistStats();
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
  const bola=getTable("BOLA_DE_OURO");
  $("ballon-table").innerHTML=`<div class="table-row compact header"><div>Temporada</div><div>Posição</div><div>Jogador</div><div>Overall</div><div>Ações</div></div>`+
  bola.map(b=>`<div class="table-row compact"><div>${b.temporada||"-"}</div><div>${b.posicao||"-"}</div><div>${b.jogador||"-"}</div><div>${b.overall||"-"}</div><div><button onclick="openForm('bolaouro','${b.id}')">Editar</button></div></div>`).join("");
}

function renderMuseu(){
  const midias=getCareerMedia();
  $("media-grid").innerHTML=midias.map(m=>`<article class="media-card"><div>${m.tipo==="video"?"🎥":"📸"}</div><strong>${m.titulo||"-"}</strong><span>${m.temporada||"-"} • ${m.descricao||""}</span>${m.url?`<a href="${m.url}" target="_blank">Abrir mídia</a>`:""}<div class="entity-actions"><button onclick="openForm('midia','${m.id}')">Editar</button><button class="delete" onclick="removeRecord('midia','${m.id}')">Excluir</button></div></article>`).join("")||emptyCard("Nenhuma mídia cadastrada nesta carreira.");
}

function emptyCard(text){return `<article class="entity-card"><small>${text}</small></article>`}
function setActiveProtagonist(id){active.protagonista_id=String(id);saveActive();renderAll()}

function navigate(pageId){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".menu-item").forEach(i=>i.classList.remove("active"));
  document.getElementById(pageId)?.classList.add("active");
  document.querySelector(`.menu-item[data-page="${pageId}"]`)?.classList.add("active");
  $("page-title").textContent=pageTitles[pageId]||"Football Legacy";
}

document.querySelectorAll(".menu-item").forEach(b=>b.onclick=()=>navigate(b.dataset.page));
document.querySelectorAll("[data-form]").forEach(b=>b.onclick=()=>openForm(b.dataset.form));
$("syncBtn").onclick=loadData;
$("primaryCreateBtn").onclick=()=>openForm(getActiveCareer()?"personagem":"carreiraRapida");

const modal=$("modal"), form=$("dynamic-form"), modalTitle=$("modal-title");
$("close-modal").onclick=closeModal;
modal.onclick=e=>{if(e.target===modal)closeModal()};
let currentForm=null;

function closeModal(){modal.classList.remove("active");form.innerHTML=""}

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

window.openForm=openForm; window.removeRecord=removeRecord; window.setActiveProtagonist=setActiveProtagonist; window.closeModal=closeModal; window.triggerUpload=triggerUpload; window.uploadToCloudinary=uploadToCloudinary;
bindSelectors();
loadData();
