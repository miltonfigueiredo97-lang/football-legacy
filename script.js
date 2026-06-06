const API_URL = window.FOOTBALL_LEGACY_API;

let db = {};
let loaded = false;

const tableMap = {
  usuario: "USUARIOS",
  universo: "UNIVERSOS",
  carreira: "CARREIRAS",
  personagem: "PERSONAGENS",
  clube: "CLUBES",
  temporada: "TEMPORADAS",
  competicao: "COMPETICOES",
  campeao: "CAMPEOES",
  estatistica: "ESTATISTICAS",
  bolaouro: "BOLA_DE_OURO",
  top11: "TOP11",
  midia: "MIDIAS"
};

const schemas = {
  usuario: [
    ["nome", "Nome", "text"],
    ["avatar", "Avatar URL", "text"]
  ],
  universo: [
    ["usuario_id", "ID do usuário", "number"],
    ["nome", "Nome do universo", "text"],
    ["jogo", "Jogo", "text"],
    ["inicio", "Ano início", "text"]
  ],
  carreira: [
    ["universo_id", "ID do universo", "number"],
    ["nome", "Nome da carreira", "text"],
    ["descricao", "Descrição", "textarea"],
    ["status", "Status", "select", ["ativa", "finalizada", "pausada"]]
  ],
  personagem: [
    ["carreira_id", "ID da carreira", "number"],
    ["tipo", "Tipo", "select", ["protagonista", "coadjuvante", "real"]],
    ["nome", "Nome", "text"],
    ["foto", "Foto URL", "text"],
    ["posicao", "Posição", "text"],
    ["nacionalidade", "Nacionalidade", "text"]
  ],
  clube: [
    ["nome", "Nome", "text"],
    ["pais", "País", "text"],
    ["escudo", "Escudo URL", "text"],
    ["estadio", "Estádio", "text"]
  ],
  temporada: [
    ["carreira_id", "ID da carreira", "number"],
    ["temporada", "Temporada", "text"],
    ["ano", "Ano", "text"]
  ],
  competicao: [
    ["nome", "Nome", "text"]
  ],
  campeao: [
    ["competicao_id", "ID da competição", "number"],
    ["temporada", "Temporada", "text"],
    ["clube", "Clube campeão", "text"]
  ],
  estatistica: [
    ["personagem_id", "ID do personagem", "number"],
    ["competicao_id", "ID da competição", "number"],
    ["temporada", "Temporada", "text"],
    ["jogos", "Jogos", "number"],
    ["gols", "Gols", "number"],
    ["assistencias", "Assistências", "number"]
  ],
  bolaouro: [
    ["temporada", "Temporada", "text"],
    ["posicao", "Posição", "number"],
    ["jogador", "Jogador", "text"],
    ["overall", "Overall", "number"]
  ],
  top11: [
    ["temporada", "Temporada", "text"],
    ["posicao", "Posição", "text"],
    ["jogador", "Jogador", "text"],
    ["overall", "Overall", "number"]
  ],
  midia: [
    ["carreira_id", "ID da carreira", "number"],
    ["temporada", "Temporada", "text"],
    ["tipo", "Tipo", "select", ["imagem", "video"]],
    ["titulo", "Título", "text"],
    ["descricao", "Descrição", "textarea"],
    ["url", "URL", "text"]
  ]
};

const pageTitles = {
  dashboard: "Resumo",
  historia: "História",
  personagens: "Personagens",
  estatisticas: "Estatísticas",
  trofeus: "Troféus",
  top11: "Top 11",
  bolaouro: "Bola de Ouro",
  clubes: "Clubes",
  museu: "Museu",
  admin: "Administração"
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(message, type = "") {
  const el = $("statusBar");
  el.textContent = message;
  el.className = "status-bar " + type;
}

function toNumber(value) {
  const n = Number(value || 0);
  return isNaN(n) ? 0 : n;
}

function initials(name) {
  return String(name || "FL")
    .split(" ")
    .map(x => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getTable(name) {
  return db[name] || [];
}

function byId(table, id) {
  return getTable(table).find(x => String(x.id) === String(id));
}

function compName(id) {
  const comp = byId("COMPETICOES", id);
  return comp ? comp.nome : id || "-";
}

function personagemName(id) {
  const p = byId("PERSONAGENS", id);
  return p ? p.nome : id || "-";
}

async function loadData() {
  try {
    setStatus("Carregando dados do Google Sheets...");
    const res = await fetch(API_URL + "?action=all&cache=" + Date.now());
    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error || "Erro ao carregar dados.");
    }

    db = json.data || {};
    loaded = true;
    renderAll();
    setStatus("Dados carregados do Google Sheets com sucesso.", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Erro ao carregar Google Sheets: " + err.message, "error");
  }
}

async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error(text);
    throw new Error("Resposta inválida da API.");
  }
}

async function createRecord(kind, record) {
  const table = tableMap[kind];

  if (!table) {
    alert("Tipo sem tabela configurada: " + kind);
    return;
  }

  setStatus("Salvando no Google Sheets...");

  const json = await apiPost({
    action: "create",
    table,
    record
  });

  if (!json.ok) {
    throw new Error(json.error || "Erro ao salvar.");
  }

  await loadData();
}

async function updateRecord(kind, id, record) {
  const table = tableMap[kind];

  setStatus("Atualizando no Google Sheets...");

  const json = await apiPost({
    action: "update",
    table,
    id,
    record
  });

  if (!json.ok) {
    throw new Error(json.error || "Erro ao atualizar.");
  }

  await loadData();
}

async function deleteRecord(kind, id) {
  const table = tableMap[kind];

  if (!confirm("Excluir este registro do Google Sheets?")) {
    return;
  }

  setStatus("Excluindo no Google Sheets...");

  const json = await apiPost({
    action: "delete",
    table,
    id
  });

  if (!json.ok) {
    throw new Error(json.error || "Erro ao excluir.");
  }

  await loadData();
}

function renderAll() {
  renderDashboard();
  renderPersonagens();
  renderClubes();
  renderStats();
  renderTrofeus();
  renderTop11();
  renderBolaOuro();
  renderMuseu();
  renderHistoria();
}

function renderDashboard() {
  const usuarios = getTable("USUARIOS");
  const carreiras = getTable("CARREIRAS");
  const personagens = getTable("PERSONAGENS");
  const clubes = getTable("CLUBES");
  const stats = getTable("ESTATISTICAS");
  const campeoes = getTable("CAMPEOES");
  const bola = getTable("BOLA_DE_OURO");
  const midias = getTable("MIDIAS");

  const firstCareer = carreiras[0];
  const firstPersonagem = personagens.find(p => p.tipo === "protagonista") || personagens[0];

  $("careerNameSide").textContent = firstCareer ? firstCareer.nome : "Football Legacy";
  $("careerMetaSide").textContent = firstCareer ? firstCareer.status || "Carreira cadastrada" : "Google Sheets conectado";
  $("careerTitle").textContent = firstCareer ? firstCareer.nome : "Football Legacy";
  $("careerDescription").textContent = firstCareer ? firstCareer.descricao || "Sem descrição cadastrada." : "Crie uma carreira na Administração.";
  $("currentSeason").textContent = getTable("TEMPORADAS")[0]?.temporada || "Banco conectado";

  $("countUsers").textContent = usuarios.length;
  $("countCareers").textContent = carreiras.length;
  $("countCharacters").textContent = personagens.length;
  $("countClubs").textContent = clubes.length;

  $("countTitles").textContent = campeoes.length;
  $("sumGoals").textContent = stats.reduce((a, b) => a + toNumber(b.gols), 0);
  $("sumAssists").textContent = stats.reduce((a, b) => a + toNumber(b.assistencias), 0);
  $("sumGames").textContent = stats.reduce((a, b) => a + toNumber(b.jogos), 0);
  $("countBallon").textContent = bola.filter(x => String(x.posicao) === "1").length;
  $("countMedia").textContent = midias.length;

  if (firstPersonagem) {
    $("mainCharacter").textContent = firstPersonagem.nome;
    $("mainInitials").textContent = initials(firstPersonagem.nome);
    $("mainCharacterSub").textContent = `${firstPersonagem.posicao || "-"} • ${firstPersonagem.nacionalidade || "-"}`;
    $("mainOverall").textContent = firstPersonagem.tipo || "FL";
  } else {
    $("mainCharacter").textContent = "Sem personagem";
    $("mainInitials").textContent = "FL";
    $("mainCharacterSub").textContent = "Cadastre um personagem";
    $("mainOverall").textContent = "FL";
  }

  const latest = [
    ...campeoes.slice(-3).map(x => ({
      year: x.temporada,
      title: "Campeão cadastrado",
      desc: `${compName(x.competicao_id)}: ${x.clube}`
    })),
    ...midias.slice(-3).map(x => ({
      year: x.temporada,
      title: x.titulo,
      desc: x.descricao || x.tipo
    }))
  ].slice(-5).reverse();

  $("latestTimeline").innerHTML = latest.length ? latest.map(e => `
    <div class="timeline-item">
      <strong>${e.year || "-"}</strong>
      <div><p>${e.title}</p><small>${e.desc || ""}</small></div>
    </div>
  `).join("") : `<div class="timeline-item"><strong>-</strong><div><p>Nenhum registro ainda.</p></div></div>`;

  $("dashboardCharacters").innerHTML = personagens.slice(0, 5).map(p => `
    <div class="mini-player">
      <div>${initials(p.nome)}</div>
      <strong>${p.nome}</strong>
      <span>${p.tipo || "-"} • ${p.posicao || "-"}</span>
    </div>
  `).join("") || `<div class="mini-player"><div>+</div><strong>Nenhum personagem</strong><span>Crie no botão acima</span></div>`;
}

function renderHistoria() {
  const campeoes = getTable("CAMPEOES").map(x => ({
    year: x.temporada,
    title: "Título",
    desc: `${x.clube} venceu ${compName(x.competicao_id)}`
  }));

  const midias = getTable("MIDIAS").map(x => ({
    year: x.temporada,
    title: x.titulo,
    desc: x.descricao
  }));

  const historico = [...campeoes, ...midias].reverse();

  $("historyTimeline").innerHTML = historico.length ? historico.map(e => `
    <div>
      <span>${e.year || "-"}</span>
      <strong>${e.title || "-"}</strong>
      <p>${e.desc || ""}</p>
    </div>
  `).join("") : `<div><span>-</span><strong>Nenhum evento ainda.</strong><p>Cadastre títulos ou mídias.</p></div>`;
}

function renderPersonagens() {
  const personagens = getTable("PERSONAGENS");

  $("personagens-list").innerHTML = personagens.map(p => `
    <article class="entity-card">
      <div class="entity-top">
        <div class="entity-avatar">${initials(p.nome)}</div>
        <div>
          <h3>${p.nome || "-"}</h3>
          <small>ID ${p.id} • ${p.tipo || "-"} • ${p.posicao || "-"}</small>
        </div>
      </div>
      <small>Nacionalidade: ${p.nacionalidade || "-"}</small>
      <div class="entity-actions">
        <button onclick="openForm('personagem', '${p.id}')">Editar</button>
        <button class="delete" onclick="deleteRecord('personagem', '${p.id}')">Excluir</button>
      </div>
    </article>
  `).join("") || emptyCard("Nenhum personagem cadastrado.");
}

function renderClubes() {
  const clubes = getTable("CLUBES");

  $("clubes-list").innerHTML = clubes.map(c => `
    <article class="entity-card">
      <div class="entity-top">
        <div class="entity-avatar">🏟</div>
        <div>
          <h3>${c.nome || "-"}</h3>
          <small>ID ${c.id} • ${c.pais || "-"}</small>
        </div>
      </div>
      <small>Estádio: ${c.estadio || "-"}</small>
      <div class="entity-actions">
        <button onclick="openForm('clube', '${c.id}')">Editar</button>
        <button class="delete" onclick="deleteRecord('clube', '${c.id}')">Excluir</button>
      </div>
    </article>
  `).join("") || emptyCard("Nenhum clube cadastrado.");
}

function renderStats() {
  const stats = getTable("ESTATISTICAS");

  $("stats-table").innerHTML = `
    <div class="table-row header">
      <div>Personagem</div><div>Competição</div><div>Jogos</div><div>Gols</div><div>Assistências</div>
    </div>
    ${stats.map(s => `
      <div class="table-row">
        <div>${personagemName(s.personagem_id)}</div>
        <div>${compName(s.competicao_id)}<br><small>${s.temporada || ""}</small></div>
        <div>${s.jogos || 0}</div>
        <div>${s.gols || 0}</div>
        <div>${s.assistencias || 0}</div>
      </div>
    `).join("")}
  `;
}

function renderTrofeus() {
  const campeoes = getTable("CAMPEOES");

  $("trophy-grid").innerHTML = campeoes.map(t => `
    <article class="trophy-card">
      <h3>${compName(t.competicao_id)}</h3>
      <div class="cups">🏆</div>
      <span>${t.temporada || "-"} • ${t.clube || "-"}</span>
      <div class="entity-actions">
        <button onclick="openForm('campeao', '${t.id}')">Editar</button>
        <button class="delete" onclick="deleteRecord('campeao', '${t.id}')">Excluir</button>
      </div>
    </article>
  `).join("") || emptyCard("Nenhum título cadastrado.");
}

function renderTop11() {
  const top11 = getTable("TOP11");

  $("top11Pitch").innerHTML = top11.map(p => `
    <div class="field-player">
      ${p.overall || "-"}<br>
      <span>${p.posicao || ""}</span>
      <span>${p.jogador || "-"}</span>
    </div>
  `).join("") || `<div class="field-player">+<br><span>Cadastre o Top 11</span></div>`;
}

function renderBolaOuro() {
  const bola = getTable("BOLA_DE_OURO");

  $("ballon-table").innerHTML = `
    <div class="table-row header">
      <div>Temporada</div><div>Posição</div><div>Jogador</div><div>Overall</div><div>Ações</div>
    </div>
    ${bola.map(b => `
      <div class="table-row">
        <div>${b.temporada || "-"}</div>
        <div>${b.posicao || "-"}</div>
        <div>${b.jogador || "-"}</div>
        <div>${b.overall || "-"}</div>
        <div>
          <button onclick="openForm('bolaouro', '${b.id}')">Editar</button>
          <button onclick="deleteRecord('bolaouro', '${b.id}')">Excluir</button>
        </div>
      </div>
    `).join("")}
  `;
}

function renderMuseu() {
  const midias = getTable("MIDIAS");

  $("media-grid").innerHTML = midias.map(m => `
    <article class="media-card">
      <div>${m.tipo === "video" ? "🎥" : "📸"}</div>
      <strong>${m.titulo || "-"}</strong>
      <span>${m.temporada || "-"} • ${m.descricao || ""}</span>
      ${m.url ? `<a href="${m.url}" target="_blank">Abrir mídia</a>` : ""}
      <div class="entity-actions">
        <button onclick="openForm('midia', '${m.id}')">Editar</button>
        <button class="delete" onclick="deleteRecord('midia', '${m.id}')">Excluir</button>
      </div>
    </article>
  `).join("") || emptyCard("Nenhuma mídia cadastrada.");
}

function emptyCard(text) {
  return `<article class="entity-card"><small>${text}</small></article>`;
}

function navigate(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".menu-item").forEach(item => item.classList.remove("active"));

  const page = document.getElementById(pageId);
  if (page) page.classList.add("active");

  const item = document.querySelector(`.menu-item[data-page="${pageId}"]`);
  if (item) item.classList.add("active");

  $("page-title").textContent = pageTitles[pageId] || "Football Legacy";
}

document.querySelectorAll(".menu-item").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelectorAll("[data-page-link]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.pageLink));
});

document.querySelectorAll("[data-form]").forEach(button => {
  button.addEventListener("click", () => openForm(button.dataset.form));
});

$("syncBtn").addEventListener("click", loadData);

const modal = $("modal");
const form = $("dynamic-form");
const modalTitle = $("modal-title");

$("close-modal").addEventListener("click", closeModal);
modal.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});

let currentForm = null;

function closeModal() {
  modal.classList.remove("active");
  form.innerHTML = "";
}

function openForm(kind, id = null) {
  currentForm = { kind, id };

  const schema = schemas[kind];
  const table = tableMap[kind];

  if (!schema || !table) {
    alert("Formulário ainda não configurado: " + kind);
    return;
  }

  const current = id ? (getTable(table).find(x => String(x.id) === String(id)) || {}) : {};

  modalTitle.textContent = id ? `Editar ${kind}` : `Novo ${kind}`;

  form.innerHTML = schema.map(([key, label, type, options]) => {
    const value = current[key] ?? "";

    if (type === "select") {
      return `<div class="form-field">
        <label>${label}</label>
        <select name="${key}">
          ${options.map(o => `<option value="${o}" ${String(o) === String(value) ? "selected" : ""}>${o}</option>`).join("")}
        </select>
      </div>`;
    }

    if (type === "textarea") {
      return `<div class="form-field">
        <label>${label}</label>
        <textarea name="${key}">${value}</textarea>
      </div>`;
    }

    return `<div class="form-field">
      <label>${label}</label>
      <input name="${key}" type="${type}" value="${value}">
    </div>`;
  }).join("") + `
    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button type="submit" class="gold-btn">Salvar</button>
    </div>
  `;

  form.onsubmit = async e => {
    e.preventDefault();

    try {
      const record = Object.fromEntries(new FormData(form).entries());

      if (currentForm.id) {
        await updateRecord(currentForm.kind, currentForm.id, record);
      } else {
        await createRecord(currentForm.kind, record);
      }

      closeModal();
    } catch (err) {
      console.error(err);
      setStatus("Erro ao salvar: " + err.message, "error");
    }
  };

  modal.classList.add("active");
}

window.openForm = openForm;
window.deleteRecord = async function(kind, id) {
  try {
    await deleteRecord(kind, id);
  } catch (err) {
    console.error(err);
    setStatus("Erro ao excluir: " + err.message, "error");
  }
};

loadData();
