// worker/services/calc.ts
//
// Funções puras de cálculo de pontuação, agrupadas no objeto `calc`.
// Uma função por categoria de recurso, adicionada incrementalmente.
//
// Constantes do jogo (pontuação base, quantidades fixas, tabelas)
// NÃO ficam hardcoded aqui — vivem em worker/data/*.ts, pra dar pra
// editar sem mexer em código quando o jogo atualizar.
//
// REGRA DO PROJETO: as funções de `calc` NUNCA validam input (ex:
// divisão por custo/modificador zerado, nível fora do intervalo
// válido). Validação é responsabilidade de uma camada externa,
// separada, antes de chamar essas funções.


import constantes, { type TierOvo } from "../data/constantes.js";
import pontosBase from "../data/pontos-base.js";
import recursoFixos from "../data/recurso-fixo.js";

export const calc = {
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
  chaveMasmorra(bonusClaPct: number): number {
    const quantidade = recursoFixos.chaveMasmorra.quantidadePorDia;
    const pontosPorChave = pontosBase.chaveMasmorra.pontosPorChave;
    return quantidade * pontosPorChave * (1 + bonusClaPct / 100);
  },

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
  habilidade(
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
  },

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
  montaria(
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
  },

  /**
   * Ovo / Pet
   * ---------
   * Recebe o resultado JÁ PRONTO da distribuição de rodadas
   * (distribuirOvosNasChocadeiras, em utils.ts) — esta função só
   * soma pontos, não decide quantos ovos de cada tier foram chocados.
   *
   * Sorte (modIndividuais.sorte_pet) é ÚNICA e GLOBAL, aplicada sobre
   * o TOTAL de ovos abertos no dia (todos os tiers somados), floor:
   *   extraDeSorte = floor(totalOvosAbertos × sortePct / 100)
   *
   * O pet nascido da sorte NÃO tem tier previsível — por convenção
   * (base no garantido, não no especulado), ele pontua na eclosão
   * como se fosse do tier MAIS BAIXO aberto naquele dia, e conta
   * normalmente na fusão.
   *
   * Fusão: "tier atual" do jogador (modIndividuais.tier_ovo_atual)
   * protege esse tier e todos acima — ovos chocados nesses tiers NÃO
   * estavam no estoque declarado pelo jogador (ovosParaFusaoDeclarado,
   * que já presume só os tiers abaixo do atual) e entram como
   * adicional na fusão.
   *
   * @param ovosChocadosPorTier    - qtd de ovos abertos hoje, por tier (vem de distribuirOvosNasChocadeiras)
   * @param sortePct               - modIndividuais.sorte_pet (%)
   * @param tierAtual              - modIndividuais.tier_ovo_atual — protege esse tier e acima
   * @param ovosParaFusaoDeclarado - estoque de ovos/pets abaixo do tierAtual, informado no dia
   * @param bonusClaChocarPct      - modificadores_cla.chocar_ovo (%) — único, não por tier
   * @param bonusClaFundirPct      - modificadores_cla.fundir_pet (%)
   */
  ovo(
    ovosChocadosPorTier: Record<TierOvo, number>,
    sortePct: number,
    tierAtual: TierOvo,
    ovosParaFusaoDeclarado: number,
    bonusClaChocarPct: number,
    bonusClaFundirPct: number
  ): number {
    const { ordemTiers } = constantes.ovo;
    const { pontosPorTier, pontosPorFusao } = pontosBase.ovo;

    const totalOvosAbertos = ordemTiers.reduce(
      (soma, tier) => soma + ovosChocadosPorTier[tier],
      0
    );
    const extraDeSorte = Math.floor((totalOvosAbertos * sortePct) / 100);

    const tierMaisBaixoAberto = ordemTiers.find(
      (tier) => ovosChocadosPorTier[tier] > 0
    );

    const pontosEclosaoBase = ordemTiers.reduce(
      (soma, tier) => soma + ovosChocadosPorTier[tier] * pontosPorTier[tier],
      0
    );
    const pontosEclosaoSorte = tierMaisBaixoAberto
      ? extraDeSorte * pontosPorTier[tierMaisBaixoAberto]
      : 0;
    const pontosEclosao =
      (pontosEclosaoBase + pontosEclosaoSorte) * (1 + bonusClaChocarPct / 100);

    const indiceAtual = ordemTiers.indexOf(tierAtual);
    const qtdChocadosTierProtegido = ordemTiers.reduce(
      (soma, tier, i) =>
        i >= indiceAtual ? soma + ovosChocadosPorTier[tier] : soma,
      0
    );
    const totalParaFusao =
      ovosParaFusaoDeclarado + qtdChocadosTierProtegido + extraDeSorte;
    const pontosFusao =
      totalParaFusao * pontosPorFusao * (1 + bonusClaFundirPct / 100);

    return pontosEclosao + pontosFusao;
  },

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
  forja(
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
  },

   /**
   * Martelo
   * -------
   * O jogador gasta martelos forjando itens; cada forja sorteia uma
   * categoria de raridade (Primitive -> Divine) segundo a % daquele
   * nível da forja (nivel_forja, modIndividuais — mesmo campo citado
   * no README antes de Martelo existir). Sorte de martelo dá forjas
   * EXTRA de graça, sorte absoluta (mesmo padrão de montaria/ovo):
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
  martelo(
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
  },
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
  tecnologia(nivelPesquisa: number, bonusClaPct: number): number {
    const pontos = pontosBase.tecnologia.pontosPorNivel[
      nivelPesquisa as keyof typeof pontosBase.tecnologia.pontosPorNivel
    ];
    return (pontos ?? 0) * (1 + bonusClaPct / 100);
  },
};