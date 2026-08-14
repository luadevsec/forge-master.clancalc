// worker/services/calc/habilidade.ts
import constantes from "../../data/constantes.js";
import pontosBase from "../../data/pontos-base.js";

/**
 * Habilidade
 * ----------
 * 1 invocação (custo pessoal, modIndividuais.custo_habilidade tickets)
 * gera 5 habilidades. Cada habilidade vale pontosPorInvocacao, com o
 * bônus do clã de "invocar_habilidade".
 *
 * A cada 10 habilidades geradas, conta AUTOMATICAMENTE 1 melhoria —
 * sem custo extra — que vale pontosPorMelhoria, com o bônus do clã
 * de "melhorar_habilidade" (buff separado).
 *
 * @param ticketsGastos    - quanto o jogador gastou em tickets hoje
 * @param custoHabilidade  - modIndividuais.custo_habilidade (tickets por invocação)
 * @param bonusInvocarPct  - modificadores_cla.invocar_habilidade (%)
 * @param bonusMelhorarPct - modificadores_cla.melhorar_habilidade (%)
 */
export function habilidade(
  ticketsGastos: number,
  custoHabilidade: number,
  bonusInvocarPct: number,
  bonusMelhorarPct: number
): number {
  const { habilidadesPorInvocacao, habilidadesPorMelhoria } = constantes.habilidade;
  const { pontosPorInvocacao, pontosPorMelhoria } = pontosBase.habilidade;

  const numInvocacoes = Math.floor(ticketsGastos / custoHabilidade);
  const numHabilidades = numInvocacoes * habilidadesPorInvocacao;

  const pontosInvocacao =
    numHabilidades * pontosPorInvocacao * (1 + bonusInvocarPct / 100);

  const numMelhorias = Math.floor(numHabilidades / habilidadesPorMelhoria);
  const pontosMelhoria =
    numMelhorias * pontosPorMelhoria * (1 + bonusMelhorarPct / 100);

  return pontosInvocacao + pontosMelhoria;
}
