# Football Legacy (Career Universe) — Documento de Referência do Projeto

> **Propósito deste documento**: se você (Claude) estiver lendo isso pela primeira vez num chat novo, isto é tudo que você precisa saber pra continuar trabalhando neste projeto sem precisar re-descobrir nada. Leia inteiro antes de mexer em qualquer coisa.

**Versão atual do app no momento em que este documento foi escrito**: v2.20
**Dono/usuário único**: Milton Figueiredo

---

## 1. O que é o Football Legacy

Football Legacy (nome interno "Career Universe") é um **dashboard pessoal** feito pelo Milton pra acompanhar seus próprios saves de **modo carreira do FIFA/EA FC**. Ele tem várias "carreiras" (playthroughs diferentes, cada uma com seu próprio personagem — ex: "MILTON V8.0", uma carreira do "Yuri Alberto" etc). Pra cada carreira, ele registra manualmente:

- Temporadas jogadas (time, competições, estatísticas, empréstimos)
- Troféus ganhos
- Convocações e desempenho pela Seleção Brasileira
- Rankings de Bola de Ouro e Top 11 do ano (dele e dos concorrentes reais)
- Comparação com recordes reais de clubes/competições (base de dados histórica real que o Milton foi populando)

É um app **single-user** — não tem sistema de login complexo, não precisa. Todas as decisões de arquitetura partem desse pressuposto (RLS aberta no Supabase, sem autenticação de verdade).

---

## 2. Acesso — onde tudo está

| O quê | Onde |
|---|---|
| **Site em produção** | https://football-legacy-dun.vercel.app/ |
| **Repositório GitHub** | https://github.com/miltonfigueiredo97-lang/football-legacy |
| **Projeto Vercel** | ID `prj_QX5FF6uAmg1SBTRKMqMQZdpFOk7F`, team `team_bfROKDT5GYvkzg9QgDsYwh1d` (slug `mackmus`) |
| **Projeto Supabase** | `ryylegveltrypqclimqo`, região `sa-east-1`, org `xocndjisflftnnjphlyj` (miltonfigueiredo97-lang's Org) |

### Como fazer commit/push no GitHub
Milton **autorizou previamente** commitar e dar push direto no repo sem pedir confirmação a cada vez. Fluxo padrão usado em toda esta conversa:

```bash
cd /home/claude/repo  # clonar se nao existir: git clone https://github.com/miltonfigueiredo97-lang/football-legacy.git repo
git pull origin main
# ... fazer as mudanças ...
git config user.email "miltonfigueiredo97@gmail.com"
git config user.name "Milton Figueiredo"
git remote set-url origin https://SEU_TOKEN_AQUI@github.com/miltonfigueiredo97-lang/football-legacy.git
git add -A
git commit -m "vX.XX: descrição detalhada do que mudou e por quê"
git push origin main
```

**IMPORTANTE — bump de versão obrigatório em TODO commit**: sempre que alterar `index.html` ou `script.js`/`style.css`/`api/football-legacy.js`, suba o número de versão em `index.html`:
- A tag visível: `<span id="appVersionTag">vX.XX</span>` (linha ~15)
- O cache-busting dos assets: `style.css?v=X.XX` e `script.js?v=X.XX` (linhas ~7 e ~266)

Isso existe **especificamente** pra Milton conseguir confirmar visualmente, olhando o canto superior esquerdo do site, se uma correção realmente subiu no ar — o app sofreu (e ainda pode sofrer) com cache agressivo do navegador/Vercel.

### Sobre o token do GitHub
Um Personal Access Token já foi usado nesta sessão (`ghp_...`). **Ele deveria ser revogado e substituído** por segurança — isso ficou pendente. Se você não tiver um token válido em mãos num chat novo, peça ao Milton pra gerar um novo em github.com/settings/tokens e usá-lo apenas na `git remote set-url`.

### Apps Script (Code.gs) — regra especial
Se alguma vez for necessário atualizar `Code.gs` (o antigo backend em Google Apps Script, hoje **desativado/legado**, substituído pelo `api/football-legacy.js`), **NUNCA** commitar/dar push desse arquivo pro GitHub. Ele vive fora do repo, direto em script.google.com. Sempre entregar o arquivo completo no chat pro Milton colar manualmente lá.

---

## 3. Arquitetura

```
Frontend (Vercel, estático)          Backend (Vercel, serverless)         Banco (Supabase Postgres)
├── index.html (267 linhas)    ──►   api/football-legacy.js         ──►   27 tabelas, RLS aberta
├── script.js (~21.000 linhas)       (~1.180 linhas, Node.js,             (allow_all policy — ok
├── style.css (~4.900 linhas)         usa @supabase/supabase-js)          pra app single-user)
└── vercel.json (headers no-cache)
```

- **Frontend**: vanilla JS puro, sem framework. Um único `script.js` gigante com múltiplas "seções" que foram sendo empilhadas ao longo do tempo (ver seção 7 sobre isso — é importante).
- **Backend**: uma única Vercel Function (`api/football-legacy.js`) que expõe um endpoint tipo RPC via `action=` (GET) e um body `{action, ...}` (POST). Ela substituiu 100% o antigo Google Apps Script, mantendo o **mesmo protocolo de ações** que o frontend já esperava (isso foi proposital, pra minimizar mudança no frontend na hora da migração).
- **Banco**: Supabase (Postgres). RLS ligado em todas as tabelas mas com policy `allow_all` (aceitável porque é single-user e a anon key não é secreta o suficiente pra importar, mas também não expõe nada sensível).

### Protocolo da API (`api/football-legacy.js`)

GET `?action=summary` → retorna as tabelas mais usadas pela UI (ver `getSummaryData()`, lista de ~27 tabelas)
GET `?action=all` → retorna literalmente TODAS as tabelas
GET `?action=schema` → mapa de nomes de tabela

POST com `{action: "..."}` — principais ações:
- `create`, `update`, `delete`, `bulkCreate`, `batch` — CRUD genérico em qualquer tabela via `table` no payload
- `saveSeasonFull` — salva uma temporada inteira de uma vez (clube, competições jogadas, estatísticas, títulos) — é o botão "Salvar" do formulário de editar temporada
- `saveTop11CareerV2` — salva o Top 11 do ano
- `saveBallonCareerRankingV2` / `saveBallonCareerRanking` — salva ranking de Bola de Ouro
- `copySelecaoBaseAnterior` — duplica o elenco da Seleção de uma temporada pra outra
- `saveSelecaoConvocados` / `updateNotasConvocacao` / `deleteSelecaoConvocacaoCascata` — fluxo de convocação
- `gerarFantasyAnalise` — chama a API da Anthropic (Claude) pra gerar a análise do Fantasy AI
- `saveSelecaoNacionalCompeticoes`, `deleteSeasonFull`, `top11_base` — outras ações específicas

O `TABLE_MAP` dentro do arquivo faz a ponte entre o nome "lógico" que o frontend usa (ex: `CARREIRA_TEMPORADAS`) e o nome físico da tabela no Postgres (`carreira_temporadas`).

---

## 4. Banco de dados — as 27 tabelas

### Tabelas "BASE" (referência histórica real — dados do mundo real do futebol, não da carreira do Milton)
| Tabela | Linhas | O que guarda |
|---|---|---|
| `temporadas_base` | 86 | Temporadas reais de referência |
| `competicoes_base` | 11 | Lista de competições reais |
| `campeoes_base` | 839 | Campeões históricos reais de cada competição/ano (Champions League, Brasileirão, Libertadores, Copa do Mundo etc). **Atenção**: as colunas físicas estão com nomes trocados por herança da migração original — `campeao` na verdade guarda o NOME DA COMPETIÇÃO, `vice` guarda o CLUBE CAMPEÃO, `competicao_id` guarda o ANO. O frontend já lê na ordem certa, mas se for mexer via SQL direto, cuidado. |
| `bola_de_ouro_base` | 715 | Rankings reais de Bola de Ouro por ano |
| `records_base` | 229 | Recordes reais por clube/seleção (artilheiro histórico, mais jogos etc) |
| `top11_base` | 275 | Seleções ideais reais por temporada/competição |

### Tabelas de estrutura/identidade
| Tabela | Linhas | O que guarda |
|---|---|---|
| `usuarios` | 2 | Usuários do sistema (só o Milton usa de fato) |
| `universos` | 2 | "Universo" = agrupador de carreiras (ex: EA FC 26) |
| `carreiras` | 3 | Cada playthrough (ex: "MILTON V8.0") |
| `personagens` | 3 | Personagem jogável de cada carreira (ex: MILTON FIGUEIREDO) |
| `clubes` | 7 | Clubes cadastrados manualmente (cache local, a maior parte vem de busca via API externa) |
| `competicoes` | 37 | Competições cadastradas (usadas nas estatísticas) |

### Tabelas da carreira do Milton (dados que ELE joga/registra)
| Tabela | Linhas | O que guarda |
|---|---|---|
| `carreira_temporadas` | 28 | Cada temporada de cada carreira: clube, período, status, se foi emprestado, nota do Fantasy AI, ordem cronológica (`ordem_na_carreira`) |
| `estatisticas_carreira` | 105 | Estatísticas por competição dentro de uma temporada (jogos, gols, assistências, cartões, nota) |
| `top11_carreira` | 99 | Top 11 registrado por temporada |
| `bola_de_ouro_carreira` | 38 | Ranking de Bola de Ouro registrado por temporada |
| `campeoes_carreira` | 29 | Títulos ganhos/registrados pelo personagem, e também registro geral de quem ganhou cada grande competição naquele ano (mesmo sem o personagem ter jogado) |
| `selecoes_carreira` | 11 | Convocações "resumo" (legado, meio sobreposto com `selecao_convocacoes`) |
| `selecoes_estatisticas_carreira` | 1 | Estatísticas agregadas de seleção (legado) |

### Módulo Seleção Brasileira (o mais trabalhado nas últimas sessões)
| Tabela | Linhas | O que guarda |
|---|---|---|
| `selecao_base_temporada` | 536 | **O elenco convocável da Seleção Brasileira**, um snapshot por temporada de carreira (`carreira_temporada_id`). Cada linha = 1 jogador com nome, posição, time, idade, overall, escudo do time, e desde a v2.20 também `fifa_playerid` (ID do jogador no banco de dados do FIFA/EA FC — ver seção 6). |
| `selecao_convocacoes` | 7 | Cada "convocação" criada (nome, tipo, data, competição) |
| `selecao_convocados` | 191 | Os jogadores dentro de cada convocação, com nota, "foi bem"/"foi mal" (joinha), observações |

### Tabelas legadas (residuais, não usar)
`campeoes` (0 linhas), `temporadas` (3), `estatisticas` (3), `midias` (0), `config` (1) — sobras de antes da migração pro Supabase. Não causam problema, mas não são lidas pela UI atual de forma significativa.

---

## 5. Módulos/telas do app (visão funcional)

1. **Resumo** — visão geral: seletor de Usuário/Carreira/Personagem, botões "+ Nova Carreira", "+ Temporada", "Fantasy", "Atualizar" (força reload dos dados do zero, botão `syncBtn`)
2. **Temporadas jogadas** — cards com cada temporada (time, idade, nota do Fantasy, status, badge de "Emprestado por X" quando aplicável, jogos/gols/assistências, resumo de convocação da Seleção naquele período)
3. **Personagens** — CRUD de personagens da carreira
4. **Records** — comparação Real (`records_base`) vs Carreira do Milton, filtrável por clube/competição, com tag visual "RECORDE REAL" (azul) vs "SUA CARREIRA" (dourado)
5. **Grandes competições** (dentro de Estatísticas) — top 5 vencedores reais por competição, agrupado por região (Europa - Clubes, Europa - Ligas, América - Clubes, América - Ligas, Mundial - Clubes, Seleções), com ícone de troféu real por competição
6. **Troféus** — títulos cadastrados pelo personagem, com ícone real por competição
7. **Fantasy AI** — análise gerada por IA (chama a Anthropic API) sobre o desempenho do jogador, com seletor de "temporada de referência" mostrando time + status pra evitar ambiguidade
8. **Top 11 / Bola de Ouro** — rankings anuais, manuais ou com critérios automáticos combináveis
9. **Seleção Brasileira** — base de jogadores convocáveis, convocações, notas de desempenho ("foi bem"/"foi mal"), agregação "só esta temporada" vs "total da carreira"

---

## 6. O sistema de importação de dados do FIFA/EA FC (muito importante)

Esta foi a parte mais trabalhada e mais gambiarra-resolvida do projeto. Resumo de como funciona, porque provavelmente vai ser pedido de novo:

### O problema
Milton quer manter a base `selecao_base_temporada` (elenco convocável) sempre atualizada com os dados REAIS do save dele (time atual, overall, idade de cada jogador), porque o "mundo" do modo carreira simula transferências e evolução de jogadores ao longo do tempo.

### A fonte de dados
Milton exporta um pacote `.rar` com os arquivos brutos (`.txt`, tab-separated, `encoding='utf-16'`) do banco de dados interno do jogo. **Os únicos arquivos realmente necessários** (evita pedir o pacote inteiro de novo):
- `players.txt` — dados de cada jogador: `playerid`, `overallrating`, `birthdate` (ver formato abaixo), `nationality` (código numérico — Brasil = **54**)
- `editedplayernames.txt` — nomes reais (`firstname`, `surname`, `commonname`) só dos jogadores que passaram por atualização de elenco pós-lançamento do jogo (jogadores menos famosos/mais novos). **Jogadores super famosos (Vini Jr, Bremer etc) NÃO aparecem aqui** — o nome deles vem de um recurso binário compilado do jogo que não está nesses arquivos soltos.
- `teamplayerlinks.txt` — vínculo jogador → time (`playerid`, `teamid`). **Atenção**: um jogador pode ter mais de 1 vínculo (clube real + seleção nacional, ou até vínculos "fantasmas"/histórico) — ver lógica de filtro abaixo.
- `teams.txt` — nome de cada time (`assetid`, `teamname`)
- `createplayer.txt` — identifica jogadores CRIADOS pelo usuário (personagens custom como "Milton", "Gusta", "Bruno Mariano"). Campo `create_playerid` = o playerid real deles em `players.txt`.
- `dcplayernames.txt` — tabela auxiliar nome↔ID, cobertura parcial, menos útil que `editedplayernames.txt`.

### Como decodificar a data de nascimento
O campo `birthdate` em `players.txt` é um inteiro = dias desde **14/10/1582** (epoch tipo calendário juliano/gregoriano proleptic). Fórmula:
```python
from datetime import date, timedelta
EPOCH = date(1582, 10, 14)
data_nascimento = EPOCH + timedelta(days=int(birthdate_raw))
```
Confirmado batendo exatamente com a data real de nascimento do Vinícius Júnior (12/07/2000) e de vários outros jogadores.

### Como calcular a idade corretamente — ARMADILHA IMPORTANTE
**NÃO use a data real de hoje pra calcular idade.** O save do Milton está num ponto do tempo simulado à frente do calendário real — na sessão em que isso foi descoberto, a data "de hoje" dentro do jogo era **2028-08-17**, ou seja, **exatamente 2 anos à frente** da data real (2026-08-17). Isso foi confirmado batendo a idade do próprio personagem "Milton" (que deveria ter 18 anos, não 16). **Sempre confirme esse offset com o Milton ou recalcule usando um personagem/jogador de idade conhecida antes de aplicar em massa.** Se uma nova sessão de importação for feita e as datas de temporada tiverem avançado mais, o offset muda de novo.

### Como identificar o time atual corretamente (e evitar o erro de achar que é seleção)
Um jogador pode ter múltiplos registros em `teamplayerlinks.txt`. A primeira tentativa foi excluir qualquer `teamid` que aparecesse em `teamnationlinks.txt` (achando que ali só tinha seleções nacionais) — **isso estava ERRADO**: essa tabela também lista clubes normais por outros motivos (parece ser regra de elegibilidade/quota, não exclusivamente seleção), e isso fez o sistema achar coisas erradas tipo "Bruno Guimarães está na seleção quando deveria estar no Newcastle" (na real, ele tinha migrado pro Arsenal dentro do save, e o sistema só não sabia diferenciar). **A abordagem correta que ficou**: montar uma lista fixa de NOMES DE PAÍSES (Brasil, Argentina, France, Germany etc) e comparar contra `teamname` — se o nome do time bate com um nome de país, é seleção; senão, é clube de verdade. Times com múltiplos vínculos: prioriza o que NÃO é seleção.

### O ID do FIFA/EA FC é a fonte de verdade
A técnica que realmente resolveu tudo: usar o **`playerid`** de `players.txt` como identificador único e definitivo — é o **mesmo número que aparece no SoFIFA** (confirmado: Vinícius Júnior é playerid `238794` tanto no arquivo do jogo quanto no SoFIFA). Fluxo consolidado:

1. Milton fornece (ou o Claude descobre via nome + data de nascimento real + clube) o `fifa_playerid` de cada jogador
2. Com o ID em mãos, busca DIRETO em `players.txt` (overall, idade) e `teamplayerlinks.txt`+`teams.txt` (time atual) — **nunca mais por nome**, pra evitar homônimos (erro comum: nomes comuns brasileiros tipo "Milton", "Paulinho", "Carlos Augusto" batem com dezenas de jogadores de base/times pequenos)
3. Atualiza `selecao_base_temporada` com esses dados

**Desde a v2.20, existe uma coluna permanente `fifa_playerid` na tabela `selecao_base_temporada`** e um campo no formulário de editar jogador da Seleção (visível também no card, como `#123456` ou aviso "sem ID"). **Fluxo definitivo daqui pra frente**: toda vez que um jogador novo for cadastrado na base da Seleção, cadastrar junto o ID do FIFA dele. Isso elimina o problema de homônimo de vez.

### Limitações reais (não são preguiça, são limitações de arquivo)
- Jogadores muito famosos/licenciados não têm nome resolúvel via `editedplayernames.txt`/`dcplayernames.txt` — só o `playerid` funciona pra eles.
- A API gratuita do TheSportsDB (usada pra buscar escudos de time) foi restringida em algum momento e agora só aceita buscar "Arsenal" no plano grátis (`https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=X`) — não dá mais pra buscar outros times por ali. Escudos de times novos precisam de outra fonte (Wikimedia Commons é uma alternativa razoável, ver padrão de URL usado no `FL_trophyImageV3782` do script.js).

---

## 7. Padrões de código e armadilhas conhecidas (LEIA ANTES DE EDITAR script.js)

`script.js` cresceu por acréscimo ao longo de muitas sessões, e tem um padrão recorrente de bugs que **já apareceram várias vezes** — sempre verificar isso antes de assumir que uma função só tem uma definição:

### 7.1 — Múltiplas definições da mesma função (`var X = function X(){...}` repetido)
É comum a mesma função (`openSeasonFlow`, `loadData`, `renderPlayedSeasons`, `getActiveCareer` etc) ter **várias versões ao longo do arquivo**, sobrescrevendo a anterior por reatribuição de `var`. **A versão que vale é a ÚLTIMA definida no arquivo** (ordem de execução linear do JS). Ao corrigir um bug, sempre confirmar com `grep -n "var NOMEDAFUNCAO\s*=" script.js` que você está editando a última ocorrência, ou o fix não vai ter efeito nenhum.

### 7.2 — Binding de botão capturando função ANTIGA (bug real, já mordeu 2x)
Padrão perigoso: `$("algumBotao").onclick = nomeDaFuncao;` (sem parênteses, referência direta). Se esse binding roda **antes** de todas as reatribuições de `var nomeDaFuncao = function(){...}` ao longo do arquivo já terem acontecido, o botão fica travado pra sempre com a versão antiga/quebrada da função, mesmo que uma versão mais nova e corrigida exista depois no arquivo.

**Sintoma clássico**: um fix é aplicado, `node --check` passa, o commit sobe, mas o comportamento no site continua "errado" mesmo depois de cache limpo — porque o botão nunca chamou a função nova.

**Fix padrão**: trocar pra um wrapper que resolve o nome em tempo de clique, não em tempo de binding:
```js
// ERRADO (captura estático):
$("meuBotao").onclick = minhaFuncao;
// CERTO (resolve na hora do clique):
$("meuBotao").onclick = () => minhaFuncao();
```
Já corrigido em: `ballonBatchBtn`. **Se aparecer um bug de "dado de outra carreira" ou "botão não atualiza depois do fix" de novo, suspeitar disso primeiro.**

### 7.3 — Botões com `type="button"` mas SEM nenhum handler de clique associado
Bug histórico grande (corrigido na v2.17): existiam **17 botões "Salvar"** (`id="saveBtn"`, `type="button"`) espalhados pelo formulário genérico de Editar/Novo registro que **nunca tiveram nenhum onclick nem addEventListener** — dependiam (erroneamente) do clique disparar o submit nativo do form, o que só acontece com `type="submit"`. Todos os `id="saveBtn"` `type="button"` sem onclick foram corrigidos pra:
```js
onclick="this.closest('form').dispatchEvent(new Event('submit',{cancelable:true}))"
```
Se um formulário novo for criado com um botão "Salvar" customizado, **sempre garantir que ele tem type="submit" OU um onclick explícito** — nunca deixar um botão mudo.

### 7.4 — `getActiveCareer()` — cuidado com fallback perigoso (corrigido v2.19)
Existia um fallback que, se `active.carreira_id` não batesse com nada, caía pra **a primeira carreira de TODO O SISTEMA** (`getTable("CARREIRAS")[0]`) — não só de outro usuário, de qualquer carreira que existisse. Isso causou vazamento de dados entre carreiras (ex: modal de Bola de Ouro mostrando dados errados). Removido esse fallback; agora cai só pra primeira carreira do MESMO usuário ativo, ou `null`.

### 7.5 — Campos booleanos salvos como `"1.0"`/`"0.0"` (string numérica), não `"true"`/`"sim"`
Bug crítico achado e corrigido na v2.12/v2.13: os campos `foi_bem`, `foi_mal`, `foi_bem2`, `foi_mal2` (joinha de desempenho na convocação) são salvos como `"1.0"`/`"0.0"`. Várias checagens pelo código (frontend E backend) só reconheciam `"true"`/`"sim"` como positivo, zerando silenciosamente contagens de bom/ruim e bônus de nota. **Ao adicionar qualquer checagem de campo booleano-like nesse sistema, sempre testar contra número (`Number(v) >= 1`), não só string.** Existe uma função utilitária `ehPositivo(v)` no backend e uma equivalente no frontend que já fazem essa checagem certa — reusar essas, não reinventar.

### 7.6 — `type="button"` em botões dentro de `<form>`
Fix em massa (v2.9): 91 botões sem `type=` explícito dentro de `<form>` viravam `type="submit"` por padrão do navegador, causando o form fechar/resetar sozinho ao clicar em qualquer botão interno (ex: "Editar", "Excluir"). **Todo botão novo dentro de um `<form>` que não deve submeter precisa de `type="button"` explícito.**

### 7.7 — Cache agressivo (navegador + Vercel CDN)
Depois de vários relatos de "eu apliquei o fix mas nada mudou":
- `vercel.json` na raiz do repo força `Cache-Control: no-cache, no-store, must-revalidate` pra `index.html`, `script.js`, `style.css`
- A API (`api/football-legacy.js`) também manda esses headers em toda resposta
- O fetch de dados no frontend já usa `{cache:"no-store"}` + query string `?cache=timestamp`
- Mesmo assim, **sempre orientar o Milton a dar Ctrl+Shift+R (hard refresh)** depois de qualquer deploy, e confirmar pelo número de versão no canto superior esquerdo que o JS realmente atualizou antes de investigar mais fundo.

### 7.8 — `apiPost` engolindo mensagem de erro real (corrigido v2.19)
Antes, qualquer erro HTTP do backend virava genericamente `"HTTP 500 ao salvar via proxy Vercel"`, sem nunca ler o corpo da resposta (que o backend sempre preenche com `{ok:false, error: "mensagem real"}`). Isso tornava debugar erros 500 baseado só no que o Milton reportava praticamente impossível. Corrigido pra sempre tentar ler `corpo.error` do JSON de resposta antes de lançar o erro genérico. **Se aparecer um novo erro 500 misterioso, o texto de erro que aparece agora já deveria ser específico o suficiente pra achar a causa direto no código, sem precisar depender só dos logs do Vercel (que têm retenção curta e nem sempre pegam o evento a tempo).**

---

## 8. Dívidas técnicas conhecidas / pendências em aberto

- **Token do GitHub exposto** (`ghp_...`) usado nas sessões — recomendado revogar e gerar um novo.
- **Duplicidade "Wesley" / "Wesley França"** em `selecao_base_temporada` (temporada id 28): são o mesmo jogador real (fifa_playerid `80170`, AS Roma), cadastrados 2x com nomes diferentes. Não foram mesclados pra não quebrar convocações que porventura referenciem um dos dois — decisão de mesclar ou não fica pro Milton.
- **~4 jogadores sem `fifa_playerid` e sem dados confiáveis**: Gabriel Veneno, Kauan Basile, Igor Serrote (confirmado pelo Milton que não existem no levantamento dele) — Ryan Francisco já foi resolvido (ID 93575, São Paulo, 19, 76).
- **Escudos de time**: ~44 corrigidos/confirmados na v2.20-adjacente, mas a fonte principal (TheSportsDB API grátis) está limitada a buscar só "Arsenal" agora — pesquisar uma fonte alternativa estável se for preciso buscar escudos de times novos no futuro (Wikimedia Commons é o que foi usado como alternativa pontual).
- **La Liga 2000/01–2003/04**: 4 temporadas faltando no histórico real (`campeoes_base`) entre o período antigo migrado e o período novo.
- **Mais records reais** (`records_base`) podem ser preenchidos pra mais clubes/categorias — hoje cobre os principais europeus e brasileiros mas não é exaustivo.

---

## 9. Convenções de trabalho combinadas com o Milton

- Commit/push direto autorizado, sem pedir confirmação a cada vez.
- **Sempre** subir a versão (`vX.XX`) em todo commit que toque `index.html`/`script.js`/`style.css`/`api/football-legacy.js`.
- Mudanças em `Code.gs` (Apps Script legado): nunca commitar, sempre entregar no chat pra colar manual.
- Antes de aplicar qualquer atualização em massa nos dados (ex: elenco da Seleção), **verificar tabelas relacionadas por órfãos/duplicatas** antes de mexer — várias sessões passadas descobriram bugs de dado (registros órfãos, `carreira_temporada_id` salvo como `"10.0"` em vez de `"10"`, linhas de teste esquecidas) só fazendo essa varredura.
- Ao mesclar ou apagar registros que pareçam "duplicados", **sempre confirmar que não são legitimamente diferentes** antes de apagar — já aconteceu de um registro real (a temporada do Chelsea) ser apagado por engano achando que era duplicata de um registro de OUTRA tabela (a base da Seleção), quando na real eram sistemas independentes. Regra de ouro: duas tabelas parecerem "sincronizadas" não significa que uma duplicata em uma implica duplicata na outra.
- Ao fazer merge/homônimo em jogadores reais: **time bate = confiança alta, time não bate = pode ser transferência real que aconteceu no save simulado (perguntar antes de aplicar) ou pode ser homônimo (não aplicar sem certeza)**. Usar `fifa_playerid` sempre que possível pra eliminar essa ambiguidade de vez.

---

*Documento gerado para servir de contexto inicial em caso de nova sessão de chat. Mantenha atualizado conforme o projeto evolui — principalmente a seção 8 (pendências) e o número de versão no topo.*
