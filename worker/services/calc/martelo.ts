// worker/services/calc/martelo.ts
import constantes from "../../data/constantes.js";
import pontosBase from "../../data/pontos-base.js";

/**
 * Martelo
 * -------
 * O jogador gasta martelos forjando itens; cada forja sorteia uma
 * categoria de raridade (Primitive -> Divine) segundo a % daquele
 * nível da forja (nivel_forja, modIndividuais). Sorte de martelo dá
 * forjas EXTRA de graça, sorte absoluta (mesmo padrão de montaria):
 *
 *   extraDaSorte = floor(martelosGastos × sorteMartelo% / 100)
 *   totalForjas  = martelosGastos + extraDaSorte
 *
 * Como o resultado de cada forja é aleatório, a pontuação usa
 * VALOR ESPERADO (média ponderada pelas probabilidades daquele
 * nível), em vez de tentar "distribuir" o total em quantidades
 * inteiras por categoria — matematicamente equivalente (distributi-
 * vidade: total×Σp×pontos = Σ(total×p)×pontos), sem inventar
 * arredondamento pra um processo que já é probabilístico:
 *
 *   mediaPontosPorForja = Σ (probabilidade[categoria]/100 × pontosPorCategoria[categoria])
 *   pontos = totalForjas × mediaPontosPorForja × (1 + bonusClaPct / 100)
 *
 * @param martelosGastos  - martelos gastos forjando hoje
 * @param sorteMartelo    - modIndividuais.sorte_martelo (%)
 * @param nivelForja      - modIndividuais.nivel_forja — define qual linha da tabela de probabilidade usar
 * @param bonusClaPct     - modificadores_cla.martelo (%)
 */
export function martelo(
  martelosGastos: number,
  sorteMartelo: number,
  nivelForja: number,
  bonusClaPct: number
): number {
  const extraDaSorte = Math.floor((martelosGastos * sorteMartelo) / 100);
  const totalForjas = martelosGastos + extraDaSorte;

  const probabilidades = constantes.martelo.probabilidadePorNivel[nivelForja];
  const { pontosPorCategoria } = pontosBase.martelo;

  const mediaPontosPorForja = probabilidades.reduce(
    (soma, probPct, i) => soma + (probPct / 100) * pontosPorCategoria[i],
    0
  );

  return totalForjas * mediaPontosPorForja * (1 + bonusClaPct / 100);
}
