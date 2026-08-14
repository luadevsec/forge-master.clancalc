// worker/services/calc/forja.ts
import constantes from "../../data/constantes.js";
import pontosBase from "../../data/pontos-base.js";

/**
 * Forja
 * -----
 * O jogador só ganha pontos pelo OURO GASTO comprando nodes — a
 * compra em si é instantânea, sem custo de tempo. O tempo de
 * "melhoria" (tabela em constantes.forja.niveis) só COMEÇA depois
 * que TODOS os nodes daquele nível já foram comprados, e enquanto
 * ele roda o jogador não compra nodes nem gasta ouro — por isso
 * o tempo NUNCA entra na pontuação, é só informativo pra tela
 * (ver calcularTempoMelhoriaForja em utils.ts).
 *
 * pontos = floor(gastoComDesconto / 1000) × pontosPorMilharGasto
 *          × (1 + bonusClaPct / 100)
 * — sempre múltiplo inteiro de 1000 gasto: 999 = 0 pontos extra,
 * 1000 = 27 pontos. O garantido, nunca o especulado.
 *
 * @param nivelForja          - nível atual da forja (chave de constantes.forja.niveis)
 * @param quantidadeNodes     - quantos nodes o jogador comprou hoje, nesse nível
 * @param custoIndividualPct  - modIndividuais.custo_forja (%) — desconto no preço de cada node
 * @param bonusClaPct         - modificadores_cla.melhorar_forja (%)
 */
export function forja(
  nivelForja: number,
  quantidadeNodes: number,
  custoIndividualPct: number,
  bonusClaPct: number
): number {
  const { custoPorNode } =
    constantes.forja.niveis[nivelForja as keyof typeof constantes.forja.niveis];
  const { pontosPorMilharGasto } = pontosBase.forja;

  const custoNodeComDesconto = (custoPorNode ?? 0) * (1 - custoIndividualPct / 100);
  const gastoTotal = quantidadeNodes * custoNodeComDesconto;

  const milharesGastos = Math.floor(gastoTotal / 1000);
  return milharesGastos * pontosPorMilharGasto * (1 + bonusClaPct / 100);
}
