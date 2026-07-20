# Football Legacy V3.8.03 — Syntax Safe Emergency

Rollback de emergência com script sintaticamente seguro. Converte declarações duplicadas de function/async function para var function-expression para evitar travamento antes do carregamento.

# Football Legacy V3.8.11 — Fix temporada travada + data de nascimento + nova carreira

- Corrige criação de temporada travando quando a busca de time pela API
  externa (TheSportsDB) falhava: agora aceita nome de time digitado
  manualmente e usa "Geral" como competição padrão se nenhuma for marcada.
- Adiciona campo "Data de nascimento" no formulário de personagem
  (o cálculo de idade por temporada já existia e já usava esse campo,
  só faltava a entrada de dados).
- Adiciona botão "+ Nova Carreira" sempre visível na topbar, independente
  de já existir uma carreira ativa (antes o botão principal virava
  "+ Criar Personagem" e não tinha mais como criar outra carreira pela UI).
- Remove trecho de código corrompido (listeners globais colados por engano)
  de dentro do handler de salvar da Bola de Ouro.
