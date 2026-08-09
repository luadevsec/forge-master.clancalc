// worker/data/tipos.ts
//
// Tipos que espelham as tabelas do D1. Mantidos separados de
// constantes.ts (que é dado do JOGO) porque isso é dado do BANCO —
// responsabilidades diferentes, mudam por motivos diferentes.

/**
 * Linha da tabela `modificadores_cla` (singleton, id sempre = 1).
 * Espelha worker/../migrations/0001_init.sql + 0003_ovo_pet.sql.
 */
export interface ModificadoresCla {
  id: 1;

  // --- bônus por categoria/ação (%) ---
  martelo: number;
  invocar_habilidade: number;
  melhorar_habilidade: number;
  pesquisa: number;
  melhorar_forja: number;
  chave_masmorra: number;
  chocar_ovo: number;
  fundir_pet: number;
  invocar_montaria: number;
  fundir_montaria: number;

  // --- bônus de calendário (Guerra de Clãs Dia 1-6) (%) ---
  dia_1: number;
  dia_2: number;
  dia_3: number;
  dia_4: number;
  dia_5: number;
  dia_6: number;

  // --- bônus de combate, Dia 6 (%) ---
  dano_guerra: number;
  vida_guerra: number;

  // --- Timer Speed de choco por tier, adicionado na migration 0003 (%) ---
  velocidade_choco_branco: number;
  velocidade_choco_azul: number;
  velocidade_choco_verde: number;
  velocidade_choco_amarelo: number;
  velocidade_choco_vermelho: number;
  velocidade_choco_roxo: number;

  atualizado_em: string;
}

/**
 * Linha da tabela `modificadores_individuais` (1 por usuário).
 * Espelha worker/../migrations/0001_init.sql + 0003_ovo_pet.sql.
 */
export interface ModificadoresIndividuais {
  usuario_id: number;

  custo_habilidade: number;
  sorte_pet: number;
  custo_montaria: number;
  sorte_montaria: number;
  tempo_forja: number;
  custo_forja: number;
  nivel_forja: number; // influencia pontos de MARTELO (não confundir com nível de melhoria da Forja, que é input do dia)
  sorte_martelo: number;

  // --- adicionados na migration 0003 (Ovo/Pet) ---
  tier_ovo_atual: string; // TierOvo, ver worker/data/constantes.ts
  chocadeiras_extras: number;
  velocidade_choco_branco: number;
  velocidade_choco_azul: number;
  velocidade_choco_verde: number;
  velocidade_choco_amarelo: number;
  velocidade_choco_vermelho: number;
  velocidade_choco_roxo: number;

  atualizado_em: string;
}