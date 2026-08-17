import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ryylegveltrypqclimqo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5eWxlZ3ZlbHRyeXBxY2xpbXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTk4MTAsImV4cCI6MjEwMjQ3NTgxMH0.EtHhtvRcjVAkZuve8RN7vtr1HDa2bWk5ygIQxbNI0oE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapa TABELA_MAIUSCULA (como o frontend manda) -> tabela_minuscula (Supabase)
const TABLE_MAP = {
  USUARIOS: "usuarios",
  UNIVERSOS: "universos",
  CARREIRAS: "carreiras",
  PERSONAGENS: "personagens",
  CLUBES: "clubes",
  TEMPORADAS: "temporadas",
  COMPETICOES: "competicoes",
  ESTATISTICAS: "estatisticas",
  MIDIAS: "midias",
  CONFIG: "config",
  CAMPEOES: "campeoes",
  SELECOES_ESTATISTICAS_CARREIRA: "selecoes_estatisticas_carreira",
  TEMPORADAS_BASE: "temporadas_base",
  COMPETICOES_BASE: "competicoes_base",
  COMPETICOES_CAMPEOES_BASE: "campeoes_base",
  BOLA_DE_OURO_BASE: "bola_de_ouro_base",
  RECORDS_BASE: "records_base",
  CARREIRA_TEMPORADAS: "carreira_temporadas",
  ESTATISTICAS_CARREIRA: "estatisticas_carreira",
  TOP11_CARREIRA: "top11_carreira",
  TOP11_BASE: "top11_base",
  BOLA_DE_OURO_CARREIRA: "bola_de_ouro_carreira",
  CAMPEOES_CARREIRA: "campeoes_carreira",
  CAMPEOES_BASE: "campeoes_base",
  SELECOES_CARREIRA: "selecoes_carreira",
  SELECAO_BASE_TEMPORADA: "selecao_base_temporada",
  SELECAO_CONVOCACOES: "selecao_convocacoes",
  SELECAO_CONVOCADOS: "selecao_convocados"
};

function tbl(nameUpper) {
  const t = TABLE_MAP[nameUpper];
  if (!t) throw new Error("Tabela inválida: " + nameUpper);
  return t;
}

// ---------- Helpers genéricos ----------

async function getNextId(tableLower) {
  const { data, error } = await supabase
    .from(tableLower)
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || !data.length) return 1;
  return Number(data[0].id) + 1;
}

function cleanRecord(record) {
  const out = {};
  Object.keys(record || {}).forEach((k) => {
    out[k] = record[k] === undefined ? null : record[k];
  });
  return out;
}

async function createRow(tableUpper, record) {
  const t = tbl(tableUpper);
  const id = record && record.id ? Number(record.id) : await getNextId(t);
  const finalRecord = cleanRecord({ ...record, id });
  const { data, error } = await supabase.from(t).insert(finalRecord).select().single();
  if (error) throw error;
  return data;
}

async function bulkCreateRows(tableUpper, records) {
  if (!records || !records.length) return [];
  const t = tbl(tableUpper);
  let nextId = await getNextId(t);
  const finalRecords = records.map((r) => {
    const id = r.id ? Number(r.id) : nextId++;
    return cleanRecord({ ...r, id });
  });
  const { data, error } = await supabase.from(t).insert(finalRecords).select();
  if (error) throw error;
  return data;
}

async function updateRow(tableUpper, id, record) {
  const t = tbl(tableUpper);
  const finalRecord = cleanRecord(record);
  delete finalRecord.id;
  const { data, error } = await supabase.from(t).update(finalRecord).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function deleteRow(tableUpper, id) {
  const t = tbl(tableUpper);
  const { error } = await supabase.from(t).delete().eq("id", id);
  if (error) throw error;
  return { id, deleted: true };
}

async function deleteRowsWhere(tableUpper, column, value) {
  const t = tbl(tableUpper);
  const { data, error } = await supabase.from(t).delete().eq(column, value).select();
  if (error) throw error;
  return (data || []).length;
}

async function readTable(tableUpper) {
  const t = tbl(tableUpper);
  const { data, error } = await supabase.from(t).select("*");
  if (error) throw error;
  return data || [];
}

async function findById(tableUpper, id) {
  const rows = await readTable(tableUpper);
  return rows.find((r) => String(r.id) === String(id)) || null;
}

async function findByName(tableUpper, nameField, name) {
  const rows = await readTable(tableUpper);
  return rows.find((r) => sameText(r[nameField], name)) || null;
}

function normKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function sameText(a, b) {
  const aa = normKey(a);
  const bb = normKey(b);
  return aa && bb && (aa === bb || aa.indexOf(bb) !== -1 || bb.indexOf(aa) !== -1);
}

// ---------- Ações genéricas ----------

async function getSummaryData() {
  const tables = [
    "USUARIOS", "UNIVERSOS", "CARREIRAS", "PERSONAGENS", "CLUBES", "COMPETICOES",
    "TEMPORADAS_BASE", "COMPETICOES_BASE", "COMPETICOES_CAMPEOES_BASE", "BOLA_DE_OURO_BASE",
    "RECORDS_BASE", "TOP11_BASE", "CARREIRA_TEMPORADAS", "ESTATISTICAS_CARREIRA", "TOP11_CARREIRA",
    "BOLA_DE_OURO_CARREIRA", "CAMPEOES_CARREIRA", "SELECOES_CARREIRA",
    "SELECOES_ESTATISTICAS_CARREIRA", "SELECAO_BASE_TEMPORADA", "SELECAO_CONVOCACOES",
    "SELECAO_CONVOCADOS", "TEMPORADAS", "ESTATISTICAS", "MIDIAS", "CONFIG",
    "COMPETICOES_CAMPEOES_BASE", "CAMPEOES_BASE"
  ];
  const data = {};
  await Promise.all(
    tables.map(async (name) => {
      try {
        data[name] = await readTable(name);
      } catch (err) {
        data[name] = [];
      }
    })
  );
  return data;
}

async function getAllData() {
  const tables = Object.keys(TABLE_MAP);
  const data = {};
  await Promise.all(
    tables.map(async (name) => {
      try {
        data[name] = await readTable(name);
      } catch (err) {
        data[name] = [];
      }
    })
  );
  return data;
}

// ---------- Seleção Brasileira ----------

async function copySelecaoBaseAnterior(payload) {
  const carreiraId = payload.carreira_id;
  const fromSeasonId = payload.from_carreira_temporada_id;
  const toSeasonId = payload.to_carreira_temporada_id;
  const toTemporada = payload.to_temporada || "";

  if (!carreiraId) throw new Error("carreira_id obrigatório.");
  if (!fromSeasonId) throw new Error("from_carreira_temporada_id obrigatório.");
  if (!toSeasonId) throw new Error("to_carreira_temporada_id obrigatório.");

  const base = await readTable("SELECAO_BASE_TEMPORADA");
  const origem = base.filter((r) => String(r.carreira_temporada_id) === String(fromSeasonId));
  if (!origem.length) return { copiados: 0 };

  const agora = new Date().toISOString();
  let nextId = await getNextId("selecao_base_temporada");
  const novos = origem.map((r) => ({
    id: nextId++,
    carreira_id: carreiraId,
    carreira_temporada_id: toSeasonId,
    temporada: toTemporada,
    nome: r.nome || "",
    time: r.time || "",
    posicao: r.posicao || "",
    idade: r.idade || "",
    overall: r.overall || "",
    foto_url: r.foto_url || "",
    escudo_time_url: r.escudo_time_url || "",
    convocacoes_qtd: 0,
    nota_media: "",
    nota_maxima: "",
    bom_qtd: 0,
    ruim_qtd: 0,
    status: r.status || "",
    criado_em: agora,
    atualizado_em: agora
  }));

  const { data, error } = await supabase.from("selecao_base_temporada").insert(novos).select();
  if (error) throw error;
  return { copiados: data.length, jogadores: data };
}

async function saveSelecaoConvocados(payload) {
  const convocacaoId = payload.convocacao_id;
  const jogadores = payload.jogadores || [];
  if (!convocacaoId) throw new Error("convocacao_id obrigatório.");

  await deleteRowsWhere("SELECAO_CONVOCADOS", "convocacao_id", convocacaoId);

  const agora = new Date().toISOString();
  let nextId = await getNextId("selecao_convocados");
  const salvos = jogadores.map((j) => ({
    id: nextId++,
    convocacao_id: convocacaoId,
    jogador_base_id: j.jogador_base_id || "",
    nome: j.nome || "",
    time: j.time || "",
    idade_na_convocacao: j.idade_na_convocacao || "",
    overall_na_convocacao: j.overall_na_convocacao || "",
    nota: "",
    nota2: "",
    foi_bem: "",
    foi_mal: "",
    foi_bem2: "",
    foi_mal2: "",
    observacao: "",
    criado_em: agora,
    atualizado_em: agora
  }));

  if (salvos.length) {
    const { error } = await supabase.from("selecao_convocados").insert(salvos);
    if (error) throw error;
  }

  const afetados = [...new Set(salvos.map((s) => s.jogador_base_id).filter(Boolean))];
  await recalcularAgregadosSelecaoBase(afetados);

  return { convocacao_id: convocacaoId, jogadores: salvos };
}

async function updateNotasConvocacao(payload) {
  const notas = payload.notas || [];
  if (!Array.isArray(notas) || !notas.length) throw new Error("Nenhuma nota recebida.");

  const agora = new Date().toISOString();
  const afetados = new Set();

  for (const n of notas) {
    if (!n.id) continue;
    const notaConvertida = n.nota !== undefined ? (n.nota === "" ? "" : Number(n.nota)) : undefined;
    const nota2Convertida = n.nota2 !== undefined ? (n.nota2 === "" ? "" : Number(n.nota2)) : undefined;

    const patch = { atualizado_em: agora };
    if (notaConvertida !== undefined) patch.nota = Number.isNaN(notaConvertida) ? "" : notaConvertida;
    if (nota2Convertida !== undefined) patch.nota2 = Number.isNaN(nota2Convertida) ? "" : nota2Convertida;
    if (n.foi_bem !== undefined) patch.foi_bem = n.foi_bem;
    if (n.foi_mal !== undefined) patch.foi_mal = n.foi_mal;
    if (n.foi_bem2 !== undefined) patch.foi_bem2 = n.foi_bem2;
    if (n.foi_mal2 !== undefined) patch.foi_mal2 = n.foi_mal2;
    if (n.observacao !== undefined) patch.observacao = n.observacao;

    const { data, error } = await supabase.from("selecao_convocados").update(patch).eq("id", n.id).select().single();
    if (error) throw error;
    if (data && data.jogador_base_id) afetados.add(String(data.jogador_base_id));
  }

  await recalcularAgregadosSelecaoBase([...afetados]);
  return { atualizados: notas.length };
}

function ehPositivo(v) {
  return v === true || v === "true" || v === "TRUE" || v === "SIM" || v === "sim";
}

async function recalcularAgregadosSelecaoBase(jogadorBaseIds) {
  if (!jogadorBaseIds || !jogadorBaseIds.length) return;

  const convocados = await readTable("SELECAO_CONVOCADOS");

  for (const jogadorBaseId of jogadorBaseIds) {
    if (!jogadorBaseId) continue;

    const doJogador = convocados.filter((c) => String(c.jogador_base_id) === String(jogadorBaseId));

    const jogos = [];
    doJogador.forEach((c) => {
      const n1 = Number(c.nota);
      if (c.nota !== undefined && c.nota !== "" && c.nota !== null && !Number.isNaN(n1) && n1 > 0) {
        jogos.push(n1 + (ehPositivo(c.foi_bem) ? 0.5 : 0) - (ehPositivo(c.foi_mal) ? 0.5 : 0));
      }
      const n2 = Number(c.nota2);
      if (c.nota2 !== undefined && c.nota2 !== "" && c.nota2 !== null && !Number.isNaN(n2) && n2 > 0) {
        jogos.push(n2 + (ehPositivo(c.foi_bem2) ? 0.5 : 0) - (ehPositivo(c.foi_mal2) ? 0.5 : 0));
      }
    });

    const qtdJogos = jogos.length;
    const notaMedia = qtdJogos ? Math.round((jogos.reduce((a, b) => a + b, 0) / qtdJogos) * 100) / 100 : "";
    const notaMaxima = qtdJogos ? Math.round(Math.max(...jogos) * 100) / 100 : "";

    const bomQtd =
      doJogador.filter((c) => ehPositivo(c.foi_bem)).length + doJogador.filter((c) => ehPositivo(c.foi_bem2)).length;
    const ruimQtd =
      doJogador.filter((c) => ehPositivo(c.foi_mal)).length + doJogador.filter((c) => ehPositivo(c.foi_mal2)).length;

    await supabase
      .from("selecao_base_temporada")
      .update({
        convocacoes_qtd: qtdJogos,
        nota_media: notaMedia,
        nota_maxima: notaMaxima,
        bom_qtd: bomQtd,
        ruim_qtd: ruimQtd
      })
      .eq("id", jogadorBaseId);
  }
}

async function deleteSelecaoConvocacaoCascata(payload) {
  const convocacaoId = payload.id || payload.convocacao_id;
  if (!convocacaoId) throw new Error("ID da convocação não informado.");

  const convocados = await readTable("SELECAO_CONVOCADOS");
  const afetados = convocados
    .filter((c) => String(c.convocacao_id) === String(convocacaoId))
    .map((c) => c.jogador_base_id)
    .filter(Boolean);

  const deletedConvocados = await deleteRowsWhere("SELECAO_CONVOCADOS", "convocacao_id", convocacaoId);
  const deletedConvocacao = await deleteRowsWhere("SELECAO_CONVOCACOES", "id", convocacaoId);

  if (afetados.length) await recalcularAgregadosSelecaoBase(afetados);

  return { convocacao_id: convocacaoId, deletedConvocados, deletedConvocacao };
}

async function saveSelecaoNacionalCompeticoes(payload) {
  const carreiraId = payload.carreira_id;
  const personagemId = payload.personagem_id;
  const carreiraTemporadaId = payload.carreira_temporada_id;
  const temporada = payload.temporada || "";
  const competicoes = payload.competicoes || [];

  if (!carreiraId) throw new Error("carreira_id obrigatório.");
  if (!personagemId) throw new Error("personagem_id obrigatório.");
  if (!carreiraTemporadaId) throw new Error("carreira_temporada_id obrigatório.");

  const existentes = await readTable("SELECOES_ESTATISTICAS_CARREIRA");
  const paraApagar = existentes.filter(
    (r) => String(r.carreira_temporada_id) === String(carreiraTemporadaId) && String(r.personagem_id) === String(personagemId)
  );
  for (const r of paraApagar) await deleteRow("SELECOES_ESTATISTICAS_CARREIRA", r.id);

  const salvos = [];
  for (const c of competicoes) {
    if (!c.competicao) continue;
    const saved = await createRow("SELECOES_ESTATISTICAS_CARREIRA", {
      carreira_id: carreiraId,
      personagem_id: personagemId,
      carreira_temporada_id: carreiraTemporadaId,
      temporada,
      competicao: c.competicao,
      jogos: c.jogos || "",
      gols: c.gols || "",
      assistencias: c.assistencias || "",
      campeao: c.campeao ? "sim" : ""
    });
    salvos.push(saved);
  }

  return { competicoes: salvos };
}

// ---------- Competições (normalização) ----------

function normalizeCompetitionLabel(name) {
  const raw = String(name || "").trim();
  const key = normKey(raw);
  const aliases = {
    supercopadauefa: "Supercopa da UEFA",
    uefasupercup: "Supercopa da UEFA",
    intercontinentaldeclubes: "Intercontinental de Clubes",
    mundialdeclubes: "Mundial de Clubes",
    fifaclubworldcup: "Mundial de Clubes"
  };
  return aliases[key] || raw;
}

function normCompetitionKeyExact(value) {
  return normKey(normalizeCompetitionLabel(value));
}

async function ensureCompetitionExact(name) {
  const normalized = normalizeCompetitionLabel(name);
  const rows = await readTable("COMPETICOES");
  const found = rows.find((r) => normCompetitionKeyExact(r.nome) === normCompetitionKeyExact(normalized));
  if (found) {
    if (String(found.nome || "") !== String(normalized)) {
      return await updateRow("COMPETICOES", found.id, { nome: normalized });
    }
    return found;
  }
  return await createRow("COMPETICOES", { nome: normalized });
}

async function getCompetitionByIdFirst(id, name) {
  if (id !== undefined && id !== null && String(id).trim() !== "") {
    const byId = await findById("COMPETICOES", id);
    if (byId) return byId;
  }
  return await ensureCompetitionExact(name);
}

// ---------- Salvar temporada completa (clube) ----------
// FIX V4.0: agora suporta jogador emprestado (status "emprestado" + clube_emprestimo_nome)
// e múltiplos clubes na mesma temporada.
async function handleSaveSeasonFull(payload) {
  const carreiraId = payload.carreira_id;
  const personagemId = payload.personagem_id;
  const existingSeasonId = payload.existingSeasonId;
  const team = payload.team || {};
  const competitionsPayload = payload.competitions || [];
  const stats = payload.stats || [];
  const titles = payload.titles || [];

  if (!carreiraId) throw new Error("carreira_id obrigatório.");
  if (!personagemId) throw new Error("personagem_id obrigatório.");
  if (!payload.temporada) throw new Error("temporada obrigatória.");
  if (!team.name) throw new Error("time obrigatório.");

  let clube = await findByName("CLUBES", "nome", team.name);
  if (!clube) {
    clube = await createRow("CLUBES", { nome: team.name, pais: team.country || "", escudo: team.badge || "", estadio: "" });
  }

  let clubeEmprestimo = null;
  if (payload.emprestado && team.loan_club_name) {
    clubeEmprestimo = await findByName("CLUBES", "nome", team.loan_club_name);
    if (!clubeEmprestimo) {
      clubeEmprestimo = await createRow("CLUBES", { nome: team.loan_club_name, pais: "", escudo: team.loan_club_badge || "", estadio: "" });
    }
  }

  const compMap = {};
  const compList = [];
  for (const item of competitionsPayload) {
    const id = item && typeof item === "object" ? item.id || item.competicao_id : "";
    const name = item && typeof item === "object" ? item.nome || item.competicao : item;
    const comp = await getCompetitionByIdFirst(id, name);
    const key = "id:" + String(comp.id);
    if (!compMap[key]) {
      compMap[key] = comp;
      compList.push(comp);
    }
  }
  for (const s of stats) {
    const comp = await getCompetitionByIdFirst(s.competicao_id, s.competicao);
    const key = "id:" + String(comp.id);
    if (!compMap[key]) {
      compMap[key] = comp;
      compList.push(comp);
    }
  }

  let ordemNaCarreira = payload.ordem_na_carreira;
  if ((ordemNaCarreira === undefined || ordemNaCarreira === null || ordemNaCarreira === "") && !existingSeasonId) {
    const temporadasDaCarreira = await readTable("CARREIRA_TEMPORADAS");
    const ordens = temporadasDaCarreira
      .filter((t) => String(t.carreira_id) === String(carreiraId))
      .map((t) => Number(t.ordem_na_carreira))
      .filter((n) => !Number.isNaN(n));
    ordemNaCarreira = ordens.length ? Math.max(...ordens) + 1 : 1;
  }

  const seasonRecord = {
    carreira_id: carreiraId,
    temporada_base_id: "",
    temporada: payload.temporada,
    clube_id: clube.id,
    clube_nome: team.name,
    escudo: team.badge || clube.escudo || "",
    liga: team.league || "",
    competicoes: compList.map((c) => c.nome).join(", "),
    status: payload.status || "em andamento",
    data_inicio: payload.data_inicio || "",
    data_fim: payload.data_fim || "",
    emprestado: payload.emprestado ? "sim" : "",
    clube_emprestimo_id: clubeEmprestimo ? clubeEmprestimo.id : "",
    clube_emprestimo_nome: clubeEmprestimo ? clubeEmprestimo.nome : ""
  };

  if (ordemNaCarreira !== undefined && ordemNaCarreira !== null && ordemNaCarreira !== "") {
    seasonRecord.ordem_na_carreira = ordemNaCarreira;
  }

  let season;
  if (existingSeasonId) {
    season = await updateRow("CARREIRA_TEMPORADAS", existingSeasonId, seasonRecord);
  } else {
    season = await createRow("CARREIRA_TEMPORADAS", seasonRecord);
  }
  const seasonId = season.id || existingSeasonId;

  const allowedIds = {};
  compList.forEach((c) => (allowedIds[String(c.id)] = true));

  const oldStats = await readTable("ESTATISTICAS_CARREIRA");
  const deletedStats = [];
  for (const row of oldStats) {
    if (
      String(row.carreira_temporada_id) === String(seasonId) &&
      String(row.personagem_id) === String(personagemId) &&
      !allowedIds[String(row.competicao_id)]
    ) {
      await deleteRow("ESTATISTICAS_CARREIRA", row.id);
      deletedStats.push(row.id);
    }
  }

  const savedStats = [];
  for (const s of stats) {
    const comp = await getCompetitionByIdFirst(s.competicao_id, s.competicao);
    const old = oldStats.find(
      (o) =>
        String(o.carreira_temporada_id) === String(seasonId) &&
        String(o.personagem_id) === String(personagemId) &&
        String(o.competicao_id) === String(comp.id)
    );
    const record = {
      carreira_id: carreiraId,
      carreira_temporada_id: seasonId,
      personagem_id: personagemId,
      competicao_id: comp.id,
      competicao: comp.nome,
      jogos: s.jogos || "",
      gols: s.gols || "",
      assistencias: s.assistencias || "",
      cartoes: s.cartoes || "",
      nota_geral: s.nota_geral || "",
      clube_id: s.clube_nome && s.clube_nome !== team.name && clubeEmprestimo ? clubeEmprestimo.id : clube.id,
      clube_nome: s.clube_nome || team.name
    };
    const saved = old ? await updateRow("ESTATISTICAS_CARREIRA", old.id, record) : await createRow("ESTATISTICAS_CARREIRA", record);
    savedStats.push(saved);
  }

  const oldTitles = await readTable("CAMPEOES_CARREIRA");
  const deletedTitles = [];
  for (const row of oldTitles) {
    if (String(row.carreira_temporada_id) === String(seasonId) && !allowedIds[String(row.competicao_id)]) {
      await deleteRow("CAMPEOES_CARREIRA", row.id);
      deletedTitles.push(row.id);
    }
  }

  const savedTitles = [];
  for (const t of titles) {
    const comp = await getCompetitionByIdFirst(t.competicao_id, t.competicao);
    const hasData = t.ganhou || t.campeao || t.artilheiro || t.lider_assistencias || t.melhor_jogador;
    const old = oldTitles.find((o) => String(o.carreira_temporada_id) === String(seasonId) && String(o.competicao_id) === String(comp.id));

    if (!hasData) {
      if (old) {
        await deleteRow("CAMPEOES_CARREIRA", old.id);
        deletedTitles.push(old.id);
      }
      continue;
    }

    const record = {
      carreira_id: carreiraId,
      carreira_temporada_id: seasonId,
      temporada: payload.temporada,
      competicao_id: comp.id,
      competicao: comp.nome,
      clube: t.campeao || "",
      artilheiro: t.artilheiro || "",
      lider_assistencias: t.lider_assistencias || "",
      melhor_jogador: t.melhor_jogador || "",
      status: t.ganhou ? "titulo_ganho" : "registro_geral"
    };
    const saved = old ? await updateRow("CAMPEOES_CARREIRA", old.id, record) : await createRow("CAMPEOES_CARREIRA", record);
    savedTitles.push(saved);
  }

  return { clube, season, competicoes: compList, stats: savedStats, titles: savedTitles, deletedStats, deletedTitles };
}

async function deleteSeasonFull(payload) {
  const seasonId = payload.id || payload.carreira_temporada_id || payload.season_id;
  if (!seasonId) throw new Error("ID da temporada não informado.");

  const deletedStats = await deleteRowsWhere("ESTATISTICAS_CARREIRA", "carreira_temporada_id", seasonId);
  const deletedSeason = await deleteRowsWhere("CARREIRA_TEMPORADAS", "id", seasonId);

  return { carreira_temporada_id: seasonId, deleted: { ESTATISTICAS_CARREIRA: deletedStats, CARREIRA_TEMPORADAS: deletedSeason } };
}

async function deleteCareerItem(payload) {
  const table = payload.table || "";
  const id = payload.id || "";
  const allowed = ["CAMPEOES_CARREIRA", "SELECOES_CARREIRA", "TOP11_CARREIRA", "BOLA_DE_OURO_CARREIRA"];
  if (!allowed.includes(table)) throw new Error("Tabela não permitida para exclusão separada: " + table);
  if (!id && id !== 0) throw new Error("ID não informado para excluir.");
  const deleted = await deleteRowsWhere(table, "id", id);
  return { table, id, deleted };
}

// ---------- Top 11 ----------

async function saveTop11CareerV2(payload) {
  const rows = payload.rows || [];
  const carreiraId = String(payload.carreira_id || "");
  const carreiraTemporadaId = String(payload.carreira_temporada_id || "");
  const temporada = String(payload.temporada || "");
  const mapaUrl = String(payload.mapa_url || "");
  const replaceExisting = payload.replace_existing === true || String(payload.replace_existing) === "true";

  if (!rows.length) throw new Error("Nenhum jogador recebido para salvar Top 11.");

  const anyId = rows.some((r) => !!r.id);

  if (replaceExisting && !anyId) {
    const existentes = await readTable("TOP11_CARREIRA");
    for (const r of existentes) {
      const sameCareer = !carreiraId || String(r.carreira_id) === carreiraId;
      const sameSeasonId = carreiraTemporadaId && String(r.carreira_temporada_id) === carreiraTemporadaId;
      const sameSeason = !carreiraTemporadaId && temporada && String(r.temporada) === temporada;
      if (sameCareer && (sameSeasonId || sameSeason)) await deleteRow("TOP11_CARREIRA", r.id);
    }
  }

  const saved = [];
  for (const r of rows) {
    const record = {
      carreira_id: r.carreira_id || carreiraId,
      carreira_temporada_id: r.carreira_temporada_id || carreiraTemporadaId,
      temporada: r.temporada || temporada,
      posicao_origem: r.posicao_origem || "",
      posicao_tatica: r.posicao_tatica || "",
      jogador: r.jogador || "",
      overall: r.overall || "",
      clube: r.clube || "",
      pais: r.pais || "",
      criado: r.criado || "",
      foto_url: r.foto_url || "",
      x: r.x || "",
      y: r.y || "",
      mapa_url: r.mapa_url || mapaUrl
    };
    const result = r.id ? await updateRow("TOP11_CARREIRA", r.id, record) : await createRow("TOP11_CARREIRA", record);
    saved.push(result);
  }

  return { rows: saved };
}

async function getTop11Base() {
  return await readTable("TOP11_BASE");
}

// ---------- Batch genérico (operações create/update em sequência) ----------

async function runBatch(operations) {
  const results = [];
  for (const op of operations || []) {
    try {
      let data;
      if (op.action === "create") data = await createRow(op.table, op.record || {});
      else if (op.action === "update") data = await updateRow(op.table, op.id, op.record || {});
      else if (op.action === "delete") data = await deleteRow(op.table, op.id);
      else throw new Error("Ação de batch inválida: " + op.action);
      results.push({ ok: true, data });
    } catch (err) {
      results.push({ ok: false, error: err && err.message ? err.message : String(err) });
    }
  }
  return { results };
}

// ---------- Bola de ouro ----------

function cleanImageUrlBallon(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase().includes("fakepath")) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return "";
}

async function saveBallonCareerRankingV2(payload) {
  const temporada = String(payload.temporada || payload.ano || "").trim();
  if (!temporada) throw new Error("Temporada/Ano do Bola de Ouro não informado.");

  let rows = payload.rows || payload.ranking || [];
  if (typeof rows === "string") rows = JSON.parse(rows);
  if (!Array.isArray(rows) || !rows.length) throw new Error("Nenhum jogador recebido para salvar.");

  const imagem = cleanImageUrlBallon(payload.imagem_destaque_url || payload.imagem_url || "");
  const carreiraId = payload.carreira_id || 1;

  await deleteRowsWhere("BOLA_DE_OURO_CARREIRA", "temporada", temporada);

  const saved = [];
  for (let index = 0; index < rows.length; index++) {
    const item = rows[index];
    const jogador = String(item.jogador || item.nome || "").trim();
    if (!jogador) continue;

    const pos = Number(item.posicao || item.pos || index + 1);
    const pais = String(item.pais || item["país"] || item.nacionalidade || "").trim();
    const idade = String(item.idade_na_premiacao || item.idade || "").trim();

    const record = {
      carreira_id: carreiraId,
      temporada,
      ano: temporada,
      posicao: pos,
      jogador,
      pais,
      idade_na_premiacao: idade,
      valor_mercado: item.valor_mercado || item.valor || "",
      imagem_url: pos === 1 ? imagem : "",
      observacao: item.observacao || "",
      clube: item.clube || item.club || item.time || "",
      carreira_temporada_id: item.carreira_temporada_id || "",
      idade,
      nacionalidade: item.nacionalidade || pais,
      overall: item.overall || "",
      imagem_destaque_url: pos === 1 ? imagem : ""
    };
    const result = await createRow("BOLA_DE_OURO_CARREIRA", record);
    saved.push(result);
  }

  return { temporada, rows: saved };
}

// ---------- Fantasy (Claude / Anthropic) ----------

async function coletarResumoTemporadasFantasy(carreiraId, personagemId, nomeJogador, temporadaAtual) {
  const temporadas = await readTable("CARREIRA_TEMPORADAS");
  const stats = await readTable("ESTATISTICAS_CARREIRA");
  const camposCompeticao = await readTable("CAMPEOES_CARREIRA");
  const ballon = await readTable("BOLA_DE_OURO_CARREIRA");
  const top11 = await readTable("TOP11_CARREIRA");
  const selecao = await readTable("SELECOES_CARREIRA");

  let temporadasDaCarreira = temporadas
    .filter((t) => String(t.carreira_id) === String(carreiraId))
    .sort((a, b) => String(a.temporada).localeCompare(String(b.temporada)));

  if (temporadaAtual) {
    const idxAtual = temporadasDaCarreira.findIndex((t) => String(t.temporada) === String(temporadaAtual));
    if (idxAtual !== -1) temporadasDaCarreira = temporadasDaCarreira.slice(0, idxAtual + 1);
  }

  return temporadasDaCarreira.map((t) => {
    const statsDaTemporada = stats.filter((s) => String(s.carreira_temporada_id) === String(t.id));
    const golsTotais = statsDaTemporada.reduce((a, s) => a + (Number(s.gols) || 0), 0);
    const assistTotais = statsDaTemporada.reduce((a, s) => a + (Number(s.assistencias) || 0), 0);
    const jogosTotais = statsDaTemporada.reduce((a, s) => a + (Number(s.jogos) || 0), 0);
    const camposDaTemporada = camposCompeticao.filter((c) => String(c.carreira_temporada_id) === String(t.id));
    const ballonDaTemporada = ballon.find((b) => String(b.carreira_temporada_id) === String(t.id));
    const top11DaTemporada = top11.find((t2) => String(t2.carreira_temporada_id) === String(t.id));
    const selecaoDaTemporada = selecao.find((s) => String(s.carreira_temporada_id) === String(t.id));

    return {
      id: t.id,
      temporada: t.temporada,
      clube: t.clube_nome,
      emprestado: t.emprestado === "sim",
      clube_emprestimo_nome: t.clube_emprestimo_nome || "",
      jogos: jogosTotais,
      gols: golsTotais,
      assistencias: assistTotais,
      competicoes: statsDaTemporada.map((s) => ({
        competicao: s.competicao,
        jogos: s.jogos,
        gols: s.gols,
        assistencias: s.assistencias,
        nota: s.nota_geral
      })),
      titulos: camposDaTemporada.filter((c) => c.status === "titulo_ganho").map((c) => c.competicao),
      premios_individuais: camposDaTemporada.reduce((arr, c) => {
        if (sameText(c.artilheiro || "", nomeJogador)) arr.push("Artilheiro de " + c.competicao);
        if (sameText(c.lider_assistencias || "", nomeJogador)) arr.push("Líder de assistências de " + c.competicao);
        if (sameText(c.melhor_jogador || "", nomeJogador)) arr.push("Melhor jogador de " + c.competicao);
        return arr;
      }, []),
      bola_de_ouro_posicao: ballonDaTemporada ? ballonDaTemporada.posicao : null,
      top11: !!top11DaTemporada,
      selecao_nacional: selecaoDaTemporada
        ? {
            selecao: selecaoDaTemporada.selecao,
            jogos: selecaoDaTemporada.jogos,
            gols: selecaoDaTemporada.gols,
            assistencias: selecaoDaTemporada.assistencias,
            titulos: selecaoDaTemporada.titulos
          }
        : null
    };
  });
}

async function coletarRecordsRelevantesFantasy(resumoTemporadas, posicao) {
  const competicoesJogadas = {};
  resumoTemporadas.forEach((t) => {
    (t.competicoes || []).forEach((c) => {
      if (c.competicao) competicoesJogadas[normKey(c.competicao)] = true;
    });
  });

  const todosRecords = await readTable("RECORDS_BASE");
  return todosRecords
    .filter((r) => {
      const escopoGlobal = String(r.escopo_tipo || "").toLowerCase().includes("global") || String(r.escopo_tipo || "").toLowerCase().includes("geral");
      const competicaoJogada = r.competicao && competicoesJogadas[normKey(r.competicao)];
      const mesmaPosicao = posicao && r.posicao && sameText(r.posicao, posicao);
      return escopoGlobal || competicaoJogada || mesmaPosicao;
    })
    .slice(0, 25);
}

function montarPromptFantasy(personagem, idadeAtual, temporadaAtual, resumoTemporadas, recordsRelevantes, temporadaStatus) {
  const linhas = [];
  linhas.push("Você é um analista de mercado de futebol muito experiente, especializado em avaliar jogadores e prever propostas de transferência realistas, como um diretor esportivo profissional real.");
  linhas.push("");
  linhas.push("Analise a carreira do jogador abaixo (dados de uma carreira de FIFA/EA FC Career Mode, mas trate a análise como se fosse um jogador real e o mercado de transferências real do futebol mundial).");
  linhas.push("");
  linhas.push("Jogador: " + (personagem.nome || "-"));
  linhas.push("Posição: " + (personagem.posicao || "não informada"));
  linhas.push("Nacionalidade: " + (personagem.nacionalidade || "não informada"));
  linhas.push("IMPORTANTE: a idade ATUAL do jogador, agora, é EXATAMENTE " + (idadeAtual || "não informada") + ". Use esse valor exato.");
  linhas.push("A temporada de referência é: " + (temporadaAtual || "não informada") + ". Ignore qualquer temporada depois dessa.");
  if (temporadaStatus === "em andamento") {
    linhas.push("IMPORTANTE: essa temporada ainda está EM ANDAMENTO — os números são parciais.");
  } else if (temporadaStatus === "finalizada" || temporadaStatus === "transferido") {
    linhas.push("Essa temporada já está FINALIZADA — os números são o resultado final.");
  }
  linhas.push("");

  let totalBolaDeOuroVencida = 0;
  let totalTop3BolaDeOuro = 0;
  let totalTop11 = 0;
  const totalTitulosPorCompeticao = {};
  let temporadaAtualObj = null;

  resumoTemporadas.forEach((t) => {
    const pos = Number(t.bola_de_ouro_posicao);
    if (pos === 1) totalBolaDeOuroVencida++;
    if (pos >= 1 && pos <= 3) totalTop3BolaDeOuro++;
    if (t.top11) totalTop11++;
    (t.titulos || []).forEach((nomeTitulo) => {
      totalTitulosPorCompeticao[nomeTitulo] = (totalTitulosPorCompeticao[nomeTitulo] || 0) + 1;
    });
    if (String(t.temporada) === String(temporadaAtual)) temporadaAtualObj = t;
  });

  linhas.push("RESUMO DE PRÊMIOS NA CARREIRA INTEIRA (já contado, use estes números exatos):");
  linhas.push("- Bolas de Ouro vencidas: " + totalBolaDeOuroVencida + " vez(es).");
  linhas.push("- Vezes no Top 3 da Bola de Ouro: " + totalTop3BolaDeOuro + " vez(es).");
  linhas.push("- Vezes eleito para o Top 11: " + totalTop11 + " vez(es).");
  const listaTitulos = Object.keys(totalTitulosPorCompeticao).map((nome) => totalTitulosPorCompeticao[nome] + "x " + nome);
  if (listaTitulos.length) linhas.push("- Títulos na carreira: " + listaTitulos.join(", ") + ".");
  linhas.push("");
  linhas.push("Histórico temporada a temporada:");

  resumoTemporadas.forEach((t) => {
    let linhaClube = "- " + t.temporada + " (" + (t.clube || "-") + ")";
    if (t.emprestado && t.clube_emprestimo_nome) linhaClube += " [EMPRESTADO para " + t.clube_emprestimo_nome + "]";
    linhas.push(linhaClube + ": " + t.jogos + " jogos, " + t.gols + " gols, " + t.assistencias + " assistências no total.");

    t.competicoes.forEach((c) => {
      let linha = "    " + c.competicao + ": " + c.jogos + " jogos, " + c.gols + " gols, " + c.assistencias + " assistências";
      if (c.nota) linha += ", nota média " + c.nota;
      linhas.push(linha + ".");
    });

    if (t.titulos.length) linhas.push("    Títulos: " + t.titulos.join(", ") + ".");
    if (t.premios_individuais && t.premios_individuais.length) linhas.push("    Prêmios individuais: " + t.premios_individuais.join(", ") + ".");
    if (t.bola_de_ouro_posicao) linhas.push("    Terminou em " + t.bola_de_ouro_posicao + "º na Bola de Ouro dessa temporada.");
    if (t.top11) linhas.push("    Foi eleito para o Top 11 dessa temporada.");
    if (t.selecao_nacional) {
      const sel = t.selecao_nacional;
      let linhaSelecao = "    Pela seleção " + (sel.selecao || "nacional") + ": " + (sel.jogos || 0) + " jogos, " + (sel.gols || 0) + " gols, " + (sel.assistencias || 0) + " assistências";
      if (sel.titulos) linhaSelecao += ", títulos: " + sel.titulos;
      linhas.push(linhaSelecao + ".");
    }
  });

  if (recordsRelevantes && recordsRelevantes.length) {
    linhas.push("");
    linhas.push("Recordes e referências históricas relevantes:");
    recordsRelevantes.forEach((r) => {
      let linhaRecord = "- " + (r.categoria || "Recorde");
      if (r.competicao) linhaRecord += " (" + r.competicao + ")";
      linhaRecord += ": " + (r.jogador ? r.jogador + " — " : "") + (r.valor || "") + (r.unidade ? " " + r.unidade : "");
      if (r.temporada) linhaRecord += " (" + r.temporada + ")";
      linhas.push(linhaRecord);
    });
  }

  linhas.push("");
  linhas.push("Use também seu próprio conhecimento real sobre futebol pra comparar e contextualizar esse jogador.");
  linhas.push("");
  linhas.push("IMPORTANTE — analise a TRAJETÓRIA do jogador ao longo das temporadas, não só a atual isolada.");
  linhas.push("");
  linhas.push("IMPORTANTE — TETO FINANCEIRO REAL DE CADA CLUBE: respeite o orçamento real de cada clube ao propor valores.");
  linhas.push("");
  linhas.push("IMPORTANTE — REGRA CRÍTICA SOBRE EMPRÉSTIMOS: o clube ATUAL do jogador nessa temporada é \"" + (temporadaAtualObj ? temporadaAtualObj.clube : "-") + "\"" + (temporadaAtualObj && temporadaAtualObj.emprestado ? " (jogador está emprestado lá)" : "") + ". NUNCA proponha \"Empréstimo\" ou \"Empréstimo com opção de compra\" tendo como destino esse MESMO clube atual — um clube não empresta o próprio jogador pra si mesmo. Se o jogador já está emprestado nesse clube atual, uma proposta desse mesmo clube só pode ser \"Transferência definitiva\".");
  linhas.push("");
  linhas.push("IMPORTANTE sobre coerência financeira: se houver proposta de RENOVAÇÃO do clube atual, ela vem SEMPRE em primeiro lugar. Depois, ordene as demais da MAIOR pra MENOR valor de transferência.");
  linhas.push("");
  linhas.push("Considere clubes de TODAS as ligas relevantes do mundo, não só as 5 grandes ligas europeias.");
  linhas.push("");
  linhas.push('Responda SOMENTE com um JSON válido (nada de texto antes ou depois, nada de ```), no formato exato:');
  linhas.push('{"analise": "texto curto (4 a 6 frases)", "nota_temporada": (0 a 10, uma casa decimal), "indice_mercado": (0 a 100), "cenario_sem_clube": (true/false), "propostas": [{"clube": "nome", "modalidade": "Transferência definitiva OU Empréstimo OU Empréstimo com opção de compra", "anos_contrato": (número), "valor_transferencia": "ex: €60M", "valor_opcao_compra": "", "bonus": "", "salario_anual": "ex: €8M/ano", "justificativa": "1 frase"}]}');

  return linhas.join("\n");
}

async function gerarFantasyAnalise(payload) {
  const personagemId = payload.personagem_id;
  const carreiraId = payload.carreira_id;
  const idadeAtual = payload.idade_atual || "";
  const temporadaAtual = payload.temporada_atual || "";
  const temporadaStatus = payload.temporada_status || "";

  if (!personagemId) throw new Error("personagem_id obrigatório.");
  if (!carreiraId) throw new Error("carreira_id obrigatório.");

  const personagem = await findById("PERSONAGENS", personagemId);
  if (!personagem) throw new Error("Personagem não encontrado.");

  const resumoTemporadas = await coletarResumoTemporadasFantasy(carreiraId, personagemId, personagem.nome, temporadaAtual);
  if (!resumoTemporadas.length) throw new Error("Esse jogador ainda não tem temporadas registradas para analisar.");

  const temporadaAtualDados = resumoTemporadas[resumoTemporadas.length - 1];
  const recordsRelevantes = await coletarRecordsRelevantesFantasy(resumoTemporadas, personagem.posicao);
  const prompt = montarPromptFantasy(personagem, idadeAtual, temporadaAtual, resumoTemporadas, recordsRelevantes, temporadaStatus);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Chave de API não configurada (ANTHROPIC_API_KEY nas variáveis de ambiente do Vercel).");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 4000, messages: [{ role: "user", content: prompt }] })
  });

  const json = await response.json();
  if (!response.ok) throw new Error("Erro da API de IA: " + (json.error && json.error.message ? json.error.message : JSON.stringify(json)));

  const textoResposta = (json.content || []).map((b) => b.text || "").join("\n").trim();

  try {
    const textoLimpo = textoResposta.replace(/```json/gi, "").replace(/```/g, "").trim();
    const dadosResposta = JSON.parse(textoLimpo);
    if (dadosResposta && dadosResposta.nota_temporada !== undefined && temporadaAtualDados && temporadaAtualDados.id) {
      await updateRow("CARREIRA_TEMPORADAS", temporadaAtualDados.id, { nota_fantasy: dadosResposta.nota_temporada });
    }
  } catch (errNota) {
    // Se não vier JSON válido, só não salva a nota.
  }

  return { analise: textoResposta, temporada_atual: temporadaAtualDados };
}

// ---------- Handler principal ----------

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method === "GET") {
      const action = req.query.action || "all";
      if (action === "summary") return res.status(200).json({ ok: true, data: await getSummaryData() });
      if (action === "all") return res.status(200).json({ ok: true, data: await getAllData() });
      if (action === "schema") return res.status(200).json({ ok: true, schema: TABLE_MAP });
      return res.status(400).json({ ok: false, error: "Ação GET inválida: " + action });
    }

    if (req.method === "POST") {
      const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const action = payload.action || "";
      const table = payload.table || "";

      if (!action) throw new Error("Campo action ausente.");

      let data;
      switch (action) {
        case "saveSeasonFull":
          data = await handleSaveSeasonFull(payload);
          break;
        case "top11_base":
          data = await getTop11Base();
          break;
        case "saveTop11CareerV2":
          data = await saveTop11CareerV2(payload);
          break;
        case "deleteCareerItem":
          data = await deleteCareerItem(payload);
          break;
        case "deleteSeasonFull":
          data = await deleteSeasonFull(payload);
          break;
        case "saveBallonCareerRankingV2":
        case "saveBallonCareerRanking":
          data = await saveBallonCareerRankingV2(payload);
          break;
        case "copySelecaoBaseAnterior":
          data = await copySelecaoBaseAnterior(payload);
          break;
        case "saveSelecaoConvocados":
          data = await saveSelecaoConvocados(payload);
          break;
        case "updateNotasConvocacao":
          data = await updateNotasConvocacao(payload);
          break;
        case "deleteSelecaoConvocacaoCascata":
          data = await deleteSelecaoConvocacaoCascata(payload);
          break;
        case "gerarFantasyAnalise":
          data = await gerarFantasyAnalise(payload);
          break;
        case "saveSelecaoNacionalCompeticoes":
          data = await saveSelecaoNacionalCompeticoes(payload);
          break;
        case "batch":
          data = await runBatch(payload.operations || []);
          break;
        case "bulkCreate":
          data = await bulkCreateRows(table, Array.isArray(payload.records) ? payload.records : []);
          break;
        case "create":
          data = await createRow(table, payload.record || {});
          break;
        case "update":
          data = await updateRow(table, payload.id, payload.record || {});
          break;
        case "delete":
          data = await deleteRow(table, payload.id);
          break;
        default:
          return res.status(400).json({ ok: false, error: "Ação POST inválida: " + action });
      }

      return res.status(200).json({ ok: true, data });
    }

    return res.status(405).json({ ok: false, error: "Método não permitido." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}
