// worker/services/calc/ovo.ts
import constantes, { type TierOvo } from "../../data/constantes.js";
import pontosBase from "../../data/pontos-base.js";

/**
 * Ovo / Pet
 * ---------
 * Recebe o resultado JÁ PRONTO da distribuição de rodadas
 * (distribuirOvosNasChocadeiras, em utils.ts) — esta função só
 * soma pontos, não decide quantos ovos de cada tier foram chocados.
 *
 * Fusão: "tier atual" do jogador (modIndividuais.tier_ovo_atual)
 * protege esse tier e todos acima — ovos chocados nesses tiers NÃO
 * estavam no estoque declarado pelo jogador (ovosParaFusaoDeclarado,
 * que já presume só os tiers abaixo do atual) e entram como
 * adicional na fusão.
 *
 * NOTA: a mecânica de "sorte de ovo" (sorte_pet) foi REMOVIDA —
 * não existe mais no jogo. Eclosão é direta (ovosChocadosPorTier ×
 * pontosPorTier), sem extra de sorte nem "tier mais baixo aberto".
 *
 * @param ovosChocadosPorTier    - qtd de ovos abertos hoje, por tier (vem de distribuirOvosNasChocadeiras)
 * @param tierAtual              - modIndividuais.tier_ovo_atual — protege esse tier e acima
 * @param ovosParaFusaoDeclarado - estoque de ovos/pets abaixo do tierAtual, informado no dia
 * @param bonusClaChocarPct      - modificadores_cla.chocar_ovo (%) — único, não por tier
 * @param bonusClaFundirPct      - modificadores_cla.fundir_pet (%)
 */
export function ovo(
  ovosChocadosPorTier: Record<TierOvo, number>,
  tierAtual: TierOvo,
  ovosParaFusaoDeclarado: number,
  bonusClaChocarPct: number,
  bonusClaFundirPct: number
): number {
  const { ordemTiers } = constantes.ovo;
  const { pontosPorTier, pontosPorFusao } = pontosBase.ovo;

  const pontosEclosaoBase = ordemTiers.reduce(
    (soma, tier) => soma + ovosChocadosPorTier[tier] * pontosPorTier[tier],
    0
  );
  const pontosEclosao = pontosEclosaoBase * (1 + bonusClaChocarPct / 100);

  const indiceAtual = ordemTiers.indexOf(tierAtual);
  const qtdChocadosTierProtegido = ordemTiers.reduce(
    (soma, tier, i) =>
      i >= indiceAtual ? soma + ovosChocadosPorTier[tier] : soma,
    0
  );
  const totalParaFusao = ovosParaFusaoDeclarado + qtdChocadosTierProtegido;
  const pontosFusao =
    totalParaFusao * pontosPorFusao * (1 + bonusClaFundirPct / 100);

  return pontosEclosao + pontosFusao;
}
