// worker/services/bonus.ts
//
// Camada de COMPOSIÇÃO de bônus — combina o bônus de calendário
// (Dia 1-6, "Guerra de Clãs Dia X") com o bônus de categoria ANTES
// de chamar `calc`. Isso NÃO é pontuação (calc.ts) nem otimização
// (utils.ts) — é montagem de input, então fica em arquivo próprio.
//
// REGRA: aditivo, não composto. Soma as % primeiro, multiplica só
// uma vez no final — nunca aplica o bônus do dia como uma segunda
// multiplicação em cima de um total já bonificado pela categoria.

import type { ModificadoresCla } from "../data/tipos.js";

/**
 * Bônus de calendário (%) do dia de guerra informado.
 * Dia 7 (resgatar recompensas) não gera pontos novos — retorna 0.
 */
export function bonusDoDia(modCla: ModificadoresCla, dia: number): number {
  switch (dia) {
    case 1: return modCla.dia_1;
    case 2: return modCla.dia_2;
    case 3: return modCla.dia_3;
    case 4: return modCla.dia_4;
    case 5: return modCla.dia_5;
    case 6: return modCla.dia_6;
    default: return 0; // Dia 7, ou qualquer valor inesperado
  }
}

/**
 * Soma o bônus de categoria com o bônus do dia — SEMPRE usar isso
 * (em vez de passar o bônus de categoria puro) em toda chamada de
 * função de `calc` que precisa do bônus do clã.
 *
 * Categorias com 2 ações (habilidade, montaria, ovo) precisam chamar
 * isso 2x, uma pra cada bônus — o dia soma nos DOIS separadamente,
 * não uma vez só no total.
 *
 * @example
 *   // categoria de 1 ação (ex: chave)
 *   const bonus = combinarBonus(modCla.chave_masmorra, modCla, diaAtual);
 *   const pontos = calc.chaveMasmorra(bonus);
 *
 * @example
 *   // categoria de 2 ações (ex: habilidade)
 *   const bonusInvocar = combinarBonus(modCla.invocar_habilidade, modCla, diaAtual);
 *   const bonusMelhorar = combinarBonus(modCla.melhorar_habilidade, modCla, diaAtual);
 *   const pontos = calc.habilidade(tickets, custo, bonusInvocar, bonusMelhorar);
 */
export function combinarBonus(
  bonusCategoriaPct: number,
  modCla: ModificadoresCla,
  dia: number
): number {
  return bonusCategoriaPct + bonusDoDia(modCla, dia);
}