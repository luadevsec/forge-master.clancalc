// worker/services/utils.ts
//
// Funções de apoio que NÃO são cálculo de pontuação pura (isso fica em
// calc.ts) — são lógica de decisão/otimização que alimenta o calc depois.
//
// distribuirOvosNasChocadeiras: decide quantos ovos de cada tier chocar
// em cada chocadeira do jogador, respeitando:
//   - o tempo de choco de cada tier, ajustado pelo Timer Speed do clã
//     + individual (multiplicador, não desconto — ver fórmula abaixo)
//   - a capacidade de 23h de CADA chocadeira, individualmente
//   - o estoque de ovos disponível por tier (informado no dia)
// maximizando os pontos de eclosão.
//
// O resultado (ovosChocadosPorTier) é o INPUT que calc.ovo espera.
// Esta função nunca calcula pontos de fusão nem aplica bônus do clã
// de eclosão/fusão — só decide "o que chocar", calc decide "quanto vale".

import constantes, {type TierOvo } from "../data/constantes.js";
import pontosBase from "../data/pontos-base.js";


export interface ItemChocadeira {
  tier: TierOvo;
  quantidade: number;
}

export interface ChocadeiraResultado {
  itens: ItemChocadeira[];
  segundosUsados: number;
  segundosOciosos: number;
}

export interface DistribuicaoOvosResultado {
  chocadeiras: ChocadeiraResultado[];
  ovosChocadosPorTier: Record<TierOvo, number>;
  estoqueNaoUsado: Record<TierOvo, number>;
}

/**
 * Distribui o estoque de ovos do jogador entre as chocadeiras
 * disponíveis, maximizando o valor REAL de chocar cada ovo — não só
 * pontos de eclosão.
 *
 * Ovos do tier ATUAL PRA CIMA (protegidos, não fazem parte do estoque
 * declarado pra fusão) rendem um bônus extra na decisão: chocá-los
 * soma os pontos de fusão (pontosPorFusao) além da eclosão, porque
 * só viram material de fusão SE forem chocados — diferente de tiers
 * abaixo do atual, que já contam pra fusão independente de serem
 * chocados ou não. Por isso o "valor" usado aqui não é simplesmente
 * pontosPorTier — ver `valorParaOtimizacao` abaixo.
 *
 * (Simplificação assumida: os bônus percentuais do clã de eclosão e
 * fusão não entram nessa conta de decisão — eles escalam tudo de
 * forma parecida e dificilmente mudam a ordem de prioridade entre
 * tiers. Só afeta a pontuação final, que é sempre calculada por
 * calc.ovo, não aqui.)
 *
 * Resolve UMA CHOCADEIRA DE CADA VEZ (cada uma com capacidade
 * independente de 23h), subtraindo do estoque o que já foi usado
 * antes de resolver a próxima. Isso evita o erro de tratar a soma
 * das capacidades como se fosse uma mochila só — 2 chocadeiras de
 * 23h NÃO é o mesmo que 1 chocadeira de 46h, porque cada uma tem
 * seu próprio limite individual que não pode estourar.
 *
 * É uma heurística (não uma prova de ótimo global absoluto quando
 * há múltiplas chocadeiras), mas como todas as chocadeiras são
 * idênticas e os ovos não têm nenhuma sinergia entre si, na prática
 * ela entrega o resultado ótimo — ver o documento de explicação.
 *
 * @param estoqueDisponivel       - quantos ovos de cada tier o jogador tem hoje (input do dia)
 * @param numChocadeiras          - constantes.ovo.chocadeirasBase + modIndividuais.chocadeiras_extras
 * @param velocidadeClaPct        - modificadores_cla.velocidade_choco_<tier> (%), por tier — Timer Speed do clã
 * @param velocidadeIndividualPct - modIndividuais.velocidade_choco_<tier> (%), por tier — Timer Speed pessoal
 * @param tierAtual               - modIndividuais.tier_ovo_atual — protege esse tier e acima (mesmo campo usado em calc.ovo)
 */
export function distribuirOvosNasChocadeiras(
  estoqueDisponivel: Record<TierOvo, number>,
  numChocadeiras: number,
  velocidadeClaPct: Record<TierOvo, number>,
  velocidadeIndividualPct: Record<TierOvo, number>,
  tierAtual: TierOvo
): DistribuicaoOvosResultado {
  const { ordemTiers, tempoChocoBaseSegundos, capacidadeChocadeiraSegundos } =
    constantes.ovo;
  const { pontosPorTier, pontosPorFusao } = pontosBase.ovo;

  // valor usado pra DECIDIR o que chocar (não é o que calc.ovo relata
  // como pontuação final — isso continua sendo calculado só lá).
  // Tiers no tier atual pra cima ganham o bônus de fusão marginal,
  // porque só viram material de fusão SE forem chocados.
  const indiceAtual = ordemTiers.indexOf(tierAtual);
  const valorParaOtimizacao = {} as Record<TierOvo, number>;
  for (const tier of ordemTiers) {
    const protegido = ordemTiers.indexOf(tier) >= indiceAtual;
    valorParaOtimizacao[tier] = pontosPorTier[tier] + (protegido ? pontosPorFusao : 0);
  }

  // tempo final por tier — NÃO é desconto subtrativo, é Timer Speed
  // (multiplicador): tempo_final = tempo_base / (1 + velocidade% / 100).
  // Confirmado com a tabela oficial "Egg Hatching Times": Level 5 =
  // 50% Timer Speed = tempo dividido por 1.5 (não tempo × 0.5).
  // Velocidade do clã e individual SOMAM antes de aplicar a divisão.
  // Arredondado pra BAIXO (segundo inteiro): mesma filosofia usada no
  // resto do calc — sempre o garantido, nunca o especulado.
  const tempoFinalPorTier = {} as Record<TierOvo, number>;
  for (const tier of ordemTiers) {
    const velocidadeTotalPct = velocidadeClaPct[tier] + velocidadeIndividualPct[tier];
    tempoFinalPorTier[tier] = Math.floor(
      tempoChocoBaseSegundos[tier] / (1 + velocidadeTotalPct / 100)
    );
  }

  const estoqueRestante = { ...estoqueDisponivel };
  const chocadeiras: ChocadeiraResultado[] = [];

  for (let i = 0; i < numChocadeiras; i++) {
    // processa do tier mais ALTO pro mais BAIXO: em caso de empate de
    // valor, o knapsack fica com o tier mais alto primeiro, e só desce
    // pros miúdos (branco, azul...) pra preencher a sobra de tempo que
    // os grandes não conseguem ocupar exatamente.
    const ordemProcessamento = [...ordemTiers].reverse();
    const resultado = resolverKnapsackUmaChocadeira(
      estoqueRestante,
      capacidadeChocadeiraSegundos,
      tempoFinalPorTier,
      valorParaOtimizacao,
      ordemProcessamento
    );
    chocadeiras.push(resultado);
    for (const item of resultado.itens) {
      estoqueRestante[item.tier] -= item.quantidade;
    }
  }

  const ovosChocadosPorTier = {} as Record<TierOvo, number>;
  for (const tier of ordemTiers) ovosChocadosPorTier[tier] = 0;
  for (const chocadeira of chocadeiras) {
    for (const item of chocadeira.itens) {
      ovosChocadosPorTier[item.tier] += item.quantidade;
    }
  }

  return { chocadeiras, ovosChocadosPorTier, estoqueNaoUsado: estoqueRestante };
}

/**
 * Resolve o knapsack limitado (bounded knapsack) de UMA chocadeira:
 * dado um estoque disponível e uma capacidade em segundos, escolhe
 * quantos ovos de cada tier chocar pra maximizar o valor de decisão
 * (`valorPorTier` — que pode incluir o bônus de fusão marginal dos
 * tiers protegidos, não é necessariamente só pontos de eclosão puros),
 * sem estourar a capacidade.
 *
 * O parâmetro `ordemTiers` aqui é a ORDEM DE PROCESSAMENTO do knapsack
 * (não necessariamente a ordem de rank) — quem processa primeiro "ganha"
 * o empate quando dois tiers rendem o mesmo valor. Chamamos essa função
 * com a ordem invertida (tier mais alto primeiro) de propósito.
 *
 * Técnica: "group knapsack" — programação dinâmica onde, tier por
 * tier, testamos "e se eu levasse 0, 1, 2, ... k desse tier?" pra
 * cada capacidade possível, guardando sempre a melhor escolha. Ver
 * o documento de explicação pra o passo a passo com exemplo numérico.
 */
function resolverKnapsackUmaChocadeira(
  estoqueRestante: Record<TierOvo, number>,
  capacidadeSegundos: number,
  tempoFinalPorTier: Record<TierOvo, number>,
  valorPorTier: Record<TierOvo, number>,
  ordemTiers: readonly TierOvo[]
): ChocadeiraResultado {
  const capacidade = capacidadeSegundos;

  // dp[w] = melhor valor possível com capacidade w, considerando
  // só os tiers já processados até aqui.
  let dp = new Float64Array(capacidade + 1);

  // escolha[índice do tier][w] = quantos ovos DESSE tier entraram na
  // melhor solução pra capacidade w — guardado pra poder reconstruir
  // a escolha final no final (backtracking).
  const escolhaPorTier: number[][] = [];

  for (const tier of ordemTiers) {
    const peso = tempoFinalPorTier[tier];
    const valor = valorPorTier[tier];
    const disponivel = estoqueRestante[tier];

    const dpAnterior = dp;
    const dpNovo = new Float64Array(capacidade + 1);
    const escolhaTier = new Array<number>(capacidade + 1).fill(0);

    for (let w = 0; w <= capacidade; w++) {
      if (peso <= 0) {
        // guarda defensiva: com a fórmula de Timer Speed (divisão), o
        // tempo nunca chega a zero/negativo na prática (só se aproxima
        // assintoticamente com velocidade muito alta) — mas se algum
        // dado de entrada inesperado zerar isso, trata como "de graça"
        // em vez de dividir por zero.
        dpNovo[w] = dpAnterior[w] + disponivel * valor;
        escolhaTier[w] = disponivel;
        continue;
      }

      const maxPorCapacidade = Math.floor(w / peso);
      const maxK = Math.min(disponivel, maxPorCapacidade);

      let melhorValor = dpAnterior[w]; // k = 0 (não pegar nada desse tier)
      let melhorK = 0;
      for (let k = 1; k <= maxK; k++) {
        const candidato = dpAnterior[w - k * peso] + k * valor;
        if (candidato > melhorValor) {
          melhorValor = candidato;
          melhorK = k;
        }
      }
      dpNovo[w] = melhorValor;
      escolhaTier[w] = melhorK;
    }

    dp = dpNovo;
    escolhaPorTier.push(escolhaTier);
  }

  // backtracking: percorre os tiers de trás pra frente, "removendo"
  // da capacidade o que foi escolhido pra cada um, até sobrar 0.
  let capacidadeRestante = capacidade;
  const itens: ItemChocadeira[] = [];
  for (let indice = ordemTiers.length - 1; indice >= 0; indice--) {
    const tier = ordemTiers[indice];
    const k = escolhaPorTier[indice][capacidadeRestante];
    if (k > 0) {
      itens.unshift({ tier, quantidade: k });
      capacidadeRestante -= k * tempoFinalPorTier[tier];
    }
  }

  return {
    itens,
    segundosUsados: capacidade - capacidadeRestante,
    segundosOciosos: capacidadeRestante,
  };
}

/**
 * Forja
 * -----
 * Calcula quanto tempo (em segundos) vai durar a melhoria da forja
 * pro nível que está sendo completado, DEPOIS que todos os nodes
 * desse nível já foram comprados. NÃO afeta pontuação (calc.forja
 * só olha ouro gasto) — isso é puramente informativo pra tela,
 * então fica em utils, não em calc.
 *
 * ASSUNÇÃO A CONFIRMAR: usa a mesma fórmula de Timer Speed dos ovos
 * (divisão: tempo / (1 + velocidade%/100)) — não foi confirmado
 * explicitamente que a forja usa essa mesma mecânica de tempo.
 * Ajustar aqui se a fórmula real for diferente.
 *
 * @param nivelForja              - nível que está sendo completado (mesma chave de constantes.forja.niveis)
 * @param velocidadeIndividualPct - modIndividuais.tempo_forja (%)
 */
export function calcularTempoMelhoriaForja(
  nivelForja: number,
  velocidadeIndividualPct: number
): number {
  const nivel = constantes.forja.niveis[nivelForja as keyof typeof constantes.forja.niveis];
  if (!nivel || nivel.tempoAbsolutoSegundos === null) return 0;
  return Math.floor(nivel.tempoAbsolutoSegundos / (1 + velocidadeIndividualPct / 100));
}

/**
 * Dia 6 — Batalha
 * ----------------
 * ATK, Vida e Poder são digitados DIRETO da tela do jogo pelo
 * jogador — não calculamos Poder do zero a partir de ATK/Vida (uma
 * tentativa de regressão nos dados reais mostrou erro de até 16%
 * ponto a ponto, provavelmente por causa de substats que não temos
 * visibilidade — ver notas em constantes.diaBatalha).
 *
 * O que ESTA função faz é aplicar o buff de guerra em ATK e Vida
 * diretamente (multiplicação simples), e estimar quanto o Poder
 * deveria CRESCER proporcionalmente usando a fórmula aproximada só
 * como RÉGUA DE RAZÃO — nunca aplicada ao Poder real diretamente.
 * Isso cancela boa parte do erro da fórmula: os substats do jogador
 * são os mesmos antes e depois do buff, então aparecem em cima e
 * embaixo da divisão e se anulam — só a RAZÃO de crescimento importa,
 * não o valor absoluto que a fórmula prevê.
 *
 * Não retorna pontos — é usado pra ranking/decisão estratégica
 * ("com quem a gente bate de frente"), não soma no total semanal.
 *
 * @param atk             - ATK declarado pelo jogador (sem buff)
 * @param vida            - Vida declarada pelo jogador (sem buff)
 * @param poderDeclarado  - Poder declarado pelo jogador (sem buff) — valor REAL, não recalculado
 * @param bonusDanoPct    - modificadores_cla.dano_guerra (%) — buffa ATK
 * @param bonusVidaPct    - modificadores_cla.vida_guerra (%) — buffa Vida
 */
export function calcularStatsBatalha(
  atk: number,
  vida: number,
  poderDeclarado: number,
  bonusDanoPct: number,
  bonusVidaPct: number
): { atk: number; vida: number; poder: number } {
  const { pesoAtk, pesoVida } = constantes.diaBatalha;

  const atkBuffado = atk * (1 + bonusDanoPct / 100);
  const vidaBuffado = vida * (1 + bonusVidaPct / 100);

  const poderEstimadoSemBuff = pesoAtk * atk + pesoVida * vida;
  const poderEstimadoComBuff = pesoAtk * atkBuffado + pesoVida * vidaBuffado;

  const fatorCrescimento =
    poderEstimadoSemBuff > 0 ? poderEstimadoComBuff / poderEstimadoSemBuff : 1;

  return {
    atk: atkBuffado,
    vida: vidaBuffado,
    poder: poderDeclarado * fatorCrescimento,
  };
}