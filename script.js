const defaultData={
career:{name:'Milton Save',game:'EA FC 31',season:'2037/2038',description:'Uma carreira documentada como uma história viva: protagonistas, troféus, transferências, mídia e recordes.',club:'Milan',protagonist:'Leon Gomes',universe:'EA FC 31',league:'Serie A'},
player:{name:'Leon Gomes',overall:94,position:'ATA',nationality:'Brasil',pace:96,shoot:95,pass:88,drib:93,def:45,phy:87},
statsCards:[{icon:'🏆',value:'27',label:'Títulos'},{icon:'⚽',value:'684',label:'Gols'},{icon:'👟',value:'241',label:'Assistências'},{icon:'👕',value:'811',label:'Jogos'},{icon:'⭐',value:'4',label:'Bolas de Ouro'},{icon:'💰',value:'€180M',label:'Maior transferência'}],
events:[{id:1,year:'2038',title:'Champions League',description:'Milan conquista a Champions League com gol decisivo de Leon Gomes.',icon:'🏆'},{id:2,year:'2038',title:'Bola de Ouro',description:'Leon Gomes é eleito o melhor jogador do mundo pela 4ª vez.',icon:'🟡'},{id:3,year:'2037',title:'Transferência Recorde',description:'Leon Gomes é transferido por €180M, a maior da história do save.',icon:'🔁'},{id:4,year:'2037',title:'Novo Capitão',description:'Leon Gomes assume a braçadeira de capitão do Milan.',icon:'©️'}],
protagonistas:[{id:1,initials:'MF',name:'Milton',role:'Manager',period:'2030-Atual'},{id:2,initials:'LG',name:'Leon Gomes',role:'ATACANTE',period:'2032-Atual',active:true},{id:3,initials:'RC',name:'Rafael Cruz',role:'MEIA',period:'2034-Atual'}],
objectives:[{id:1,icon:'🏇',title:'Vencer a Serie A',meta:'Meta: 1/1',progress:100},{id:2,icon:'⚽',title:'Conquistar a Champions League',meta:'Meta: 0/1',progress:75},{id:3,icon:'🎯',title:'Marcar 40+ gols',meta:'Meta: 40/40',progress:100}],
match:{home:'Milan',homeInfo:'1º • Serie A',away:'Lazio',awayInfo:'4º • Serie A',date:'25 Mai 2038',time:'20:45',stadium:'San Siro'},
clubHistory:[{id:1,club:'Milan',period:'2036-Atual',data:'J 136 | G 102'},{id:2,club:'Real Madrid',period:'2034-2036',data:'J 89 | G 68'},{id:3,club:'Sporting CP',period:'2032-2034',data:'J 82 | G 51'},{id:4,club:'Santos',period:'2030-2032',data:'J 60 | G 31'}],
personagens:[{id:1,nome:'Milton',tipo:'Protagonista',posicao:'ATA',nacionalidade:'Brasil',overall:91},{id:2,nome:'Leon Gomes',tipo:'Protagonista',posicao:'ATA',nacionalidade:'Brasil',overall:94},{id:3,nome:'Diego Campos',tipo:'Coadjuvante',posicao:'MEI',nacionalidade:'Brasil',overall:88}],
clubes:[{id:1,nome:'Santos',pais:'Brasil',estadio:'Vila Belmiro'},{id:2,nome:'Arsenal',pais:'Inglaterra',estadio:'Emirates Stadium'},{id:3,nome:'Milan',pais:'Itália',estadio:'San Siro'}],
estatisticas:[{id:1,temporada:'2037/2038',competicao:'Champions League',jogos:13,gols:14,assistencias:6},{id:2,temporada:'2037/2038',competicao:'Serie A',jogos:36,gols:31,assistencias:12}],
trofeus:[{id:1,competicao:'Champions League',quantidade:4,temporadas:'2034/2035, 2035/2036, 2037/2038'},{id:2,competicao:'Serie A',quantidade:3,temporadas:'2035/2036, 2036/2037, 2037/2038'}],
media:[{id:1,titulo:'Primeira Champions',tipo:'Imagem',descricao:'Momento histórico da carreira.'},{id:2,titulo:'Gol do título',tipo:'Vídeo',descricao:'Lance salvo no museu.'}]
};
let state=JSON.parse(localStorage.getItem('fl_v04'))||structuredClone(defaultData);
const $=id=>document.getElementById(id);
const set=(id,v)=>{const e=$(id);if(e)e.textContent=v}
const initials=n=>(n||'FL').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
function save(){localStorage.setItem('fl_v04',JSON.stringify(state))}
document.querySelectorAll('.menu-item').forEach(b=>b.onclick=()=>{document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.menu-item').forEach(i=>i.classList.remove('active'));$(b.dataset.page).classList.add('active');b.classList.add('active')});
document.querySelectorAll('[data-page-link]').forEach(b=>b.onclick=()=>document.querySelector(`[data-page="${b.dataset.pageLink}"]`).click());
function render(){
const c=state.career,p=state.player;
set('sideCareerName',c.name);set('sideCareerMeta',`${c.game} • ${c.season}`);set('topCareerName',c.name);set('seasonText',`Temporada ${c.season}`);set('careerTitle',c.name);set('careerDescription',c.description);set('currentClub',c.club);set('currentProtagonist',c.protagonist);set('currentUniverse',c.universe);set('currentLeague',c.league);
set('playerName',p.name);set('playerOverall',p.overall);set('playerPosition',p.position);set('playerSub',`${p.position} • ${p.nationality}`);set('playerInitials',initials(p.name));set('pace',p.pace);set('shoot',p.shoot);set('pass',p.pass);set('drib',p.drib);set('def',p.def);set('phy',p.phy);
$('statsStrip').innerHTML=state.statsCards.map((s,i)=>`<article class="stat-card editable"><button class="edit-chip" onclick="openForm('statCard',${i})">Editar</button><div class="icon">${s.icon}</div><div><strong>${s.value}</strong><span>${s.label}</span></div></article>`).join('');
$('eventsList').innerHTML=state.events.map(e=>`<div class="event-row"><div class="event-year">${e.year}</div><div><strong>${e.title}</strong><p>${e.description}</p></div><div class="event-icon">${e.icon||'•'}</div></div>`).join('');
$('bigTimeline').innerHTML=state.events.map(e=>`<div><span>${e.year}</span><strong>${e.title}</strong><p>${e.description}</p></div>`).join('');
$('protagonistsList').innerHTML=state.protagonistas.map(p=>`<div class="person-row ${p.active?'active':''}"><div class="person-initial">${p.initials||initials(p.name)}</div><div class="person-face">${initials(p.name)}</div><div><strong>${p.name}</strong><small>${p.role}</small></div><em>${p.period}</em></div>`).join('');
$('objectivesList').innerHTML=state.objectives.map(o=>`<div class="event-row"><div>${o.icon}</div><div><strong>${o.title}</strong><p>${o.meta} • ${o.progress}%</p></div><div class="event-icon">${o.progress>=100?'✓':o.progress+'%'}</div></div>`).join('');
const m=state.match;set('matchHome',m.home);set('matchHomeInfo',m.homeInfo);set('matchAway',m.away);set('matchAwayInfo',m.awayInfo);set('matchDate',m.date);set('matchTime',m.time);set('matchStadium',m.stadium);
$('clubPath').innerHTML=state.clubHistory.map(ch=>`<div class="club-stop"><div class="shield">${ch.club[0]}</div><div><strong>${ch.club}</strong><span>${ch.period}</span><small>${ch.data}</small></div></div>`).join('');
$('personagensList').innerHTML=state.personagens.map(p=>`<article class="entity-card"><div class="entity-head"><div class="entity-avatar">${initials(p.nome)}</div><div><h3>${p.nome}</h3><small>${p.tipo} • ${p.posicao} • ${p.nacionalidade}</small></div></div><small>Overall: ${p.overall||'-'}</small><div class="entity-actions"><button onclick="openForm('personagem',${p.id})">Editar</button><button class="delete" onclick="del('personagens',${p.id})">Excluir</button></div></article>`).join('');
$('clubesList').innerHTML=state.clubes.map(c=>`<article class="entity-card"><div class="entity-head"><div class="entity-avatar">⬟</div><div><h3>${c.nome}</h3><small>${c.pais}</small></div></div><small>Estádio: ${c.estadio||'-'}</small><div class="entity-actions"><button onclick="openForm('clube',${c.id})">Editar</button><button class="delete" onclick="del('clubes',${c.id})">Excluir</button></div></article>`).join('');
$('statsTable').innerHTML=`<div class="table-row header"><div>Temporada</div><div>Competição</div><div>Jogos</div><div>Gols</div><div>Assistências</div></div>`+state.estatisticas.map(s=>`<div class="table-row"><div>${s.temporada}</div><div>${s.competicao}</div><div>${s.jogos}</div><div>${s.gols}</div><div>${s.assistencias}</div></div>`).join('');
$('trophyGrid').innerHTML=state.trofeus.map(t=>`<article class="trophy-card"><h3>${t.competicao}</h3><div style="font-size:30px;margin:12px 0">${'🏆'.repeat(Number(t.quantidade||1))}</div><small>${t.temporadas||''}</small></article>`).join('');
$('mediaGrid').innerHTML=state.media.map(m=>`<article class="media-card"><h3>${m.tipo==='Vídeo'?'🎥':'📸'} ${m.titulo}</h3><small>${m.descricao||''}</small></article>`).join('');
}
const schemas={
career:{title:'Editar capa da carreira',target:'career',fields:[['name','Nome','text'],['game','Jogo','text'],['season','Temporada','text'],['description','Descrição','textarea'],['club','Clube atual','text'],['protagonist','Protagonista','text'],['universe','Universo','text'],['league','Liga','text']]},
player:{title:'Editar jogador principal',target:'player',fields:[['name','Nome','text'],['overall','Overall','number'],['position','Posição','text'],['nationality','Nacionalidade','text'],['pace','Ritmo','number'],['shoot','Finalização','number'],['pass','Passe','number'],['drib','Controle','number'],['def','Defesa','number'],['phy','Físico','number']]},
match:{title:'Editar próxima partida',target:'match',fields:[['home','Mandante','text'],['homeInfo','Info mandante','text'],['away','Visitante','text'],['awayInfo','Info visitante','text'],['date','Data','text'],['time','Horário','text'],['stadium','Estádio','text']]},
event:{title:'Novo evento',collection:'events',fields:[['year','Ano/temporada','text'],['title','Título','text'],['description','Descrição','textarea'],['icon','Ícone','text']]},
objective:{title:'Novo objetivo',collection:'objectives',fields:[['icon','Ícone','text'],['title','Título','text'],['meta','Meta','text'],['progress','Progresso %','number']]},
personagem:{title:'Personagem',collection:'personagens',fields:[['nome','Nome','text'],['tipo','Tipo','select',['Protagonista','Coadjuvante','Real']],['posicao','Posição','text'],['nacionalidade','Nacionalidade','text'],['overall','Overall','number']]},
clube:{title:'Clube',collection:'clubes',fields:[['nome','Nome','text'],['pais','País','text'],['estadio','Estádio','text']]},
stat:{title:'Estatística',collection:'estatisticas',fields:[['temporada','Temporada','text'],['competicao','Competição','text'],['jogos','Jogos','number'],['gols','Gols','number'],['assistencias','Assistências','number']]},
trophy:{title:'Título',collection:'trofeus',fields:[['competicao','Competição','text'],['quantidade','Quantidade','number'],['temporadas','Temporadas','text']]},
media:{title:'Mídia',collection:'media',fields:[['titulo','Título','text'],['tipo','Tipo','select',['Imagem','Vídeo']],['descricao','Descrição','textarea']]},
statCard:{title:'Editar card',collection:'statsCards',fields:[['icon','Ícone','text'],['value','Valor','text'],['label','Legenda','text']]},
clubHistory:{title:'Clube no histórico',collection:'clubHistory',fields:[['club','Clube','text'],['period','Período','text'],['data','Dados','text']]},
top11:{title:'Top 11',fields:[['jogador','Jogador','text'],['posicao','Posição','text'],['overall','Overall','number']]},
ballon:{title:'Bola de Ouro',fields:[['temporada','Temporada','text'],['posicao','Posição','number'],['jogador','Jogador','text'],['overall','Overall','number']]}
};
let current=null;
function openForm(type,id=null){
const s=schemas[type]||schemas.career;current={type,id};$('modalTitle').textContent=s.title;let item={};if(s.target)item=state[s.target];if(s.collection&&id!==null)item=type==='statCard'?state[s.collection][id]:state[s.collection].find(x=>x.id===id)||{};
$('form').innerHTML=s.fields.map(f=>{const[k,l,t,opts]=f,v=item[k]??'';if(t==='select')return `<div class="form-field"><label>${l}</label><select name="${k}">${opts.map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select></div>`;if(t==='textarea')return `<div class="form-field"><label>${l}</label><textarea name="${k}">${v}</textarea></div>`;return `<div class="form-field"><label>${l}</label><input name="${k}" type="${t}" value="${v}"></div>`}).join('')+`<div class="form-actions"><button type="button" class="ghost-btn" onclick="closeModal()">Cancelar</button><button class="gold-btn">Salvar</button></div>`;
$('form').onsubmit=e=>{e.preventDefault();saveForm(Object.fromEntries(new FormData($('form')).entries()))};$('modal').classList.add('active')}
function saveForm(data){const {type,id}=current,s=schemas[type];if(s.target)state[s.target]={...state[s.target],...data};else if(s.collection){if(type==='statCard'&&id!==null)state[s.collection][id]={...state[s.collection][id],...data};else if(id!==null){const i=state[s.collection].findIndex(x=>x.id===id);state[s.collection][i]={...state[s.collection][i],...data}}else state[s.collection].push({id:Date.now(),...data})}else alert('Esse módulo visual será ligado ao Sheets depois.');save();render();closeModal()}
function closeModal(){$('modal').classList.remove('active');$('form').innerHTML=''}
function del(collection,id){if(confirm('Excluir?')){state[collection]=state[collection].filter(x=>x.id!==id);save();render()}}
document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openForm(b.dataset.edit)}));$('closeModal').onclick=closeModal;$('modal').onclick=e=>{if(e.target===$('modal'))closeModal()};render();
