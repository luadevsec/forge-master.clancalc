// worker/services/calc/chaveMasmorra.ts
import pontosBase from "../../data/pontos-base.js";
import recursoFixos from "../../data/recurso-fixo.js";

/**
 * Chave de Masmorra
 * ------------------
 * Quantidade é FIXA (recursoFixos.chaveMasmorra.quantidadePorDia) —
 * não vem de input do usuário, o jogo dá a mesma quantia pra todo
 * mundo, todo dia que a categoria "Chave" tá liberada.
 *
 * pontos = quantidade_fixa × pontos_por_chave × (1 + bonus_cla / 100)
 *
 * @param bonusClaPct - modificadores_cla.chave_masmorra (%)
 */
export function chaveMasmorra(bonusClaPct: number): number {
  const quantidade = recursoFixos.chaveMasmorra.quantidadePorDia;
  const pontosPorChave = pontosBase.chaveMasmorra.pontosPorChave;
  return quantidade * pontosPorChave * (1 + bonusClaPct / 100);
}
