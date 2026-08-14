// worker/services/calc/montaria.ts
import pontosBase from "../../data/pontos-base.js";

/**
 * Montaria
 * --------
 * 1 invocação (custo pessoal, modIndividuais.custo_montaria chaves)
 * gera 1 montaria. A "sorte" dá uma chance de montaria EXTRA por
 * invocação garantida — sempre arredondada pra baixo, contando só
 * o que é garantido (nunca especulado):
 *
 *   invocações garantidas = floor(chavesGastas / custoMontaria)
 *   extra de sorte        = floor(invocações garantidas × sorteMontariaPct / 100)
 *   total invocado        = invocações garantidas + extra de sorte
 *
 * Toda montaria invocada pontua 2x:
 *   1) como "invocar montaria" (bônus do clã "invocar_montaria")
 *   2) como material de fusão, somada ao estoque prévio que o
 *      jogador já tinha guardado (campo do dia, "montariaParaFusao"),
 *      pontuando como "fundir montaria" (bônus do clã "fundir_montaria")
 *
 * @param chavesGastas      - chaves de montaria gastas hoje
 * @param custoMontaria     - modIndividuais.custo_montaria (chaves por invocação)
 * @param sorteMontariaPct  - modIndividuais.sorte_montaria (%)
 * @param montariaParaFusao - estoque prévio guardado, informado no dia
 * @param bonusInvocarPct   - modificadores_cla.invocar_montaria (%)
 * @param bonusFundirPct    - modificadores_cla.fundir_montaria (%)
 */
export function montaria(
  chavesGastas: number,
  custoMontaria: number,
  sorteMontariaPct: number,
  montariaParaFusao: number,
  bonusInvocarPct: number,
  bonusFundirPct: number
): number {
  const { pontosPorInvocacao, pontosPorFusao } = pontosBase.montaria;

  const invocacoesGarantidas = Math.floor(chavesGastas / custoMontaria);
  const extraDaSorte = Math.floor(
    (invocacoesGarantidas * sorteMontariaPct) / 100
  );
  const totalInvocado = invocacoesGarantidas + extraDaSorte;

  const pontosInvocacao =
    totalInvocado * pontosPorInvocacao * (1 + bonusInvocarPct / 100);

  const totalParaFusao = totalInvocado + montariaParaFusao;
  const pontosFusao =
    totalParaFusao * pontosPorFusao * (1 + bonusFundirPct / 100);

  return pontosInvocacao + pontosFusao;
}
