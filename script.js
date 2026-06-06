const state = {
  personagens: JSON.parse(localStorage.getItem('fl_personagens')) || [
    { id: 1, nome: 'Milton', tipo: 'Protagonista', posicao: 'ATA', nacionalidade: 'Brasil', overall: 91 },
    { id: 2, nome: 'Leon Gomes', tipo: 'Protagonista', posicao: 'ATA', nacionalidade: 'Brasil', overall: 94 },
    { id: 3, nome: 'Diego Campos', tipo: 'Coadjuvante', posicao: 'MEI', nacionalidade: 'Brasil', overall: 88 }
  ],
  clubes: JSON.parse(localStorage.getItem('fl_clubes')) || [
    { id: 1, nome: 'Santos', pais: 'Brasil', estadio: 'Vila Belmiro' },
    { id: 2, nome: 'Arsenal', pais: 'Inglaterra', estadio: 'Emirates Stadium' },
    { id: 3, nome: 'Milan', pais: 'Itália', estadio: 'San Siro' }
  ],
  estatisticas: JSON.parse(localStorage.getItem('fl_estatisticas')) || [
    { temporada: '2037/2038', competicao: 'Champions League', jogos: 13, gols: 14, assistencias: 6 },
    { temporada: '2037/2038', competicao: 'Serie A', jogos: 36, gols: 31, assistencias: 12 },
    { temporada: '2037/2038', competicao: 'Copa Itália', jogos: 5, gols: 4, assistencias: 3 }
  ],
  trofeus: JSON.parse(localStorage.getItem('fl_trofeus')) || [
    { competicao: 'Champions League', quantidade: 4, temporadas: '2034/2035, 2035/2036, 2037/2038' },
    { competicao: 'Serie A', quantidade: 3, temporadas: '2035/2036, 2036/2037, 2037/2038' },
    { competicao: 'Mundial de Clubes', quantidade: 2, temporadas: '2036, 2038' }
  ]
};

const pageTitles = {
  dashboard: 'Resumo',
  historia: 'História',
  personagens: 'Personagens',
  estatisticas: 'Estatísticas',
  trofeus: 'Troféus',
  top11: 'Top 11',
  bolaouro: 'Bola de Ouro',
  clubes: 'Clubes',
  museu: 'Museu',
  admin: 'Administração'
};

function saveLocal() {
  localStorage.setItem('fl_personagens', JSON.stringify(state.personagens));
  localStorage.setItem('fl_clubes', JSON.stringify(state.clubes));
  localStorage.setItem('fl_estatisticas', JSON.stringify(state.estatisticas));
  localStorage.setItem('fl_trofeus', JSON.stringify(state.trofeus));
}

function navigate(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));

  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');

  const item = document.querySelector(`.menu-item[data-page="${pageId}"]`);
  if (item) item.classList.add('active');

  document.getElementById('page-title').textContent = pageTitles[pageId] || 'Football Legacy';
}

document.querySelectorAll('.menu-item').forEach(button => {
  button.addEventListener('click', () => navigate(button.dataset.page));
});

document.querySelectorAll('[data-page-link]').forEach(button => {
  button.addEventListener('click', () => navigate(button.dataset.pageLink));
});

document.querySelector('[data-open-admin]').addEventListener('click', () => navigate('admin'));

function initials(name) {
  return name.split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase();
}

function renderPersonagens() {
  const el = document.getElementById('personagens-list');
  el.innerHTML = state.personagens.map(p => `
    <article class="entity-card">
      <div class="entity-top">
        <div class="entity-avatar">${initials(p.nome)}</div>
        <div>
          <h3>${p.nome}</h3>
          <small>${p.tipo} • ${p.posicao} • ${p.nacionalidade}</small>
        </div>
      </div>
      <small>Overall: ${p.overall || '-'}</small>
      <div class="entity-actions">
        <button onclick="editItem('personagem', ${p.id})">Editar</button>
        <button class="delete" onclick="deleteItem('personagem', ${p.id})">Excluir</button>
      </div>
    </article>
  `).join('');
}

function renderClubes() {
  const el = document.getElementById('clubes-list');
  el.innerHTML = state.clubes.map(c => `
    <article class="entity-card">
      <div class="entity-top">
        <div class="entity-avatar">🏟</div>
        <div>
          <h3>${c.nome}</h3>
          <small>${c.pais}</small>
        </div>
      </div>
      <small>Estádio: ${c.estadio || '-'}</small>
      <div class="entity-actions">
        <button onclick="editItem('clube', ${c.id})">Editar</button>
        <button class="delete" onclick="deleteItem('clube', ${c.id})">Excluir</button>
      </div>
    </article>
  `).join('');
}

function renderStats() {
  const el = document.getElementById('stats-table');
  el.innerHTML = `
    <div class="table-row header">
      <div>Temporada</div><div>Competição</div><div>Jogos</div><div>Gols</div><div>Assistências</div>
    </div>
    ${state.estatisticas.map(s => `
      <div class="table-row">
        <div>${s.temporada}</div><div>${s.competicao}</div><div>${s.jogos}</div><div>${s.gols}</div><div>${s.assistencias}</div>
      </div>
    `).join('')}
  `;
}

function renderTrofeus() {
  const el = document.getElementById('trophy-grid');
  el.innerHTML = state.trofeus.map(t => `
    <article class="trophy-card">
      <h3>${t.competicao}</h3>
      <div class="cups">${'🏆'.repeat(Number(t.quantidade || 1))}</div>
      <span>${t.temporadas || ''}</span>
    </article>
  `).join('');
}

const modal = document.getElementById('modal');
const form = document.getElementById('dynamic-form');
const modalTitle = document.getElementById('modal-title');
document.getElementById('close-modal').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.classList.remove('active');
  form.innerHTML = '';
}

const schemas = {
  personagem: [
    ['nome','Nome','text'],
    ['tipo','Tipo','select', ['Protagonista','Coadjuvante','Real']],
    ['posicao','Posição','text'],
    ['nacionalidade','Nacionalidade','text'],
    ['overall','Overall','number']
  ],
  clube: [
    ['nome','Nome do clube','text'],
    ['pais','País','text'],
    ['estadio','Estádio','text']
  ],
  estatistica: [
    ['temporada','Temporada','text'],
    ['competicao','Competição','text'],
    ['jogos','Jogos','number'],
    ['gols','Gols','number'],
    ['assistencias','Assistências','number']
  ],
  trofeu: [
    ['competicao','Competição','text'],
    ['quantidade','Quantidade','number'],
    ['temporadas','Temporadas','text']
  ],
  midia: [
    ['titulo','Título','text'],
    ['tipo','Tipo','select', ['Imagem','Vídeo']],
    ['url','URL','text'],
    ['descricao','Descrição','textarea']
  ],
  top11: [
    ['jogador','Jogador','text'],
    ['posicao','Posição','text'],
    ['overall','Overall','number']
  ],
  bolaouro: [
    ['temporada','Temporada','text'],
    ['posicao','Posição no ranking','number'],
    ['jogador','Jogador','text'],
    ['overall','Overall','number']
  ]
};

let editing = null;

function openForm(type, item = null) {
  editing = item ? { type, id: item.id } : null;
  modalTitle.textContent = item ? `Editar ${type}` : `Novo ${type}`;
  const fields = schemas[type] || schemas.personagem;

  form.innerHTML = fields.map(([key,label,inputType,options]) => {
    const value = item?.[key] ?? '';
    if (inputType === 'select') {
      return `<div class="form-field"><label>${label}</label><select name="${key}">${options.map(o => `<option ${o===value?'selected':''}>${o}</option>`).join('')}</select></div>`;
    }
    if (inputType === 'textarea') {
      return `<div class="form-field"><label>${label}</label><textarea name="${key}">${value}</textarea></div>`;
    }
    return `<div class="form-field"><label>${label}</label><input name="${key}" type="${inputType}" value="${value}"></div>`;
  }).join('') + `
    <div class="form-actions">
      <button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button>
      <button type="submit" class="gold-btn">Salvar</button>
    </div>
  `;

  form.onsubmit = e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    saveItem(type, data);
  };

  modal.classList.add('active');
}

document.querySelectorAll('[data-form]').forEach(button => {
  button.addEventListener('click', () => openForm(button.dataset.form));
});

function collectionByType(type) {
  if (type === 'personagem') return state.personagens;
  if (type === 'clube') return state.clubes;
  if (type === 'estatistica') return state.estatisticas;
  if (type === 'trofeu') return state.trofeus;
  return null;
}

function saveItem(type, data) {
  const collection = collectionByType(type);
  if (!collection) {
    alert('Esse cadastro visual já existe, mas será conectado ao Sheets nas próximas versões.');
    closeModal();
    return;
  }

  if (editing && editing.type === type) {
    const index = collection.findIndex(x => x.id === editing.id);
    collection[index] = { ...collection[index], ...data };
  } else {
    collection.push({ id: Date.now(), ...data });
  }

  saveLocal();
  renderAll();
  closeModal();
}

window.editItem = function(type, id) {
  const collection = collectionByType(type);
  const item = collection.find(x => x.id === id);
  openForm(type, item);
};

window.deleteItem = function(type, id) {
  if (!confirm('Excluir este registro?')) return;
  const collection = collectionByType(type);
  const index = collection.findIndex(x => x.id === id);
  collection.splice(index, 1);
  saveLocal();
  renderAll();
};

function renderAll() {
  renderPersonagens();
  renderClubes();
  renderStats();
  renderTrofeus();
}

renderAll();
