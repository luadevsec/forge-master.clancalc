// worker/services/calc/tecnologia.ts
import pontosBase from "../../data/pontos-base.js";

/**
 * Tecnologia
 * ----------
 * Sem sorte, sem modificador individual, sem estado persistente —
 * o jogador só declara qual nível de pesquisa (preparada
 * previamente) ele concluiu hoje, e isso bate direto com a
 * pontuação daquele nível.
 *
 * pontos = pontosPorNivel[nivel] × (1 + bonusClaPct / 100)
 *
 * @param nivelPesquisa - nível concluído hoje (1 a 5)
 * @param bonusClaPct   - modificadores_cla.pesquisa (%)
 */
export function tecnologia(nivelPesquisa: number, bonusClaPct: number): number {
  const pontos = pontosBase.tecnologia.pontosPorNivel[
    nivelPesquisa as keyof typeof pontosBase.tecnologia.pontosPorNivel
  ];
  return (pontos ?? 0) * (1 + bonusClaPct / 100);
}
