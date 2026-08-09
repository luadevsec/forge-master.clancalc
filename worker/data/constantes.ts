// worker/data/pontuacao-base.ts
//
// Pontuação base de cada ação, ANTES do bônus do clã.
// Fonte: planilha "Clan War Day Actions".
// Editar aqui quando o jogo mudar os valores — não precisa mexer
// no resto do código.

const constantes = {
  habilidade: {
    habilidadesPorInvocacao: 5, // 1 invocação (custo pessoal) gera 5 habilidades
    habilidadesPorMelhoria: 10, // a cada 10 habilidades, conta 1 melhoria (automático)
  },
  ovo: {
    // ordem de rank, do mais fraco pro mais forte — usada pra achar
    // o "tier mais baixo aberto" (sorte) e o "tier atual protegido" (fusão)
    ordemTiers: ["branco", "azul", "verde", "amarelo", "vermelho", "roxo"] as const,

    // tempo BASE de choco por tier, em SEGUNDOS (sem desconto nenhum).
    // Cada tier é o dobro do anterior. Fonte: confirmado pelo usuário.
    tempoChocoBaseSegundos: {
      branco: 1800,    // 30 min
      azul: 7200,      // 2h
      verde: 14400,     // 4h
      amarelo: 28800,  // 8h
      vermelho: 57600, // 16h
      roxo: 115200,     // 32h
    },

    // capacidade de UMA chocadeira, em segundos: janela de 23h (não 24 —
    // margem de segurança pra nunca estourar a virada do dia por causa
    // de segundos de diferença entre o preparo e o fechamento do dia).
    capacidadeChocadeiraSegundos: 23 * 60 * 60, // 82800

    // toda conta começa com 2 chocadeiras; chocadeirasExtras (modificador
    // individual, 0 a 3) soma em cima disso.
    chocadeirasBase: 2,
  },
  forja: {
    // Fonte: tabela oficial "Forge Upgrades Cost and Forging
    // Probabilities". custoPorNode é o preço de 1 node (sem
    // desconto). tempoAbsolutoSegundos é o tempo de MELHORIA
    // daquele nível inteiro — só começa a contar depois que TODOS
    // os numNodes daquele nível já foram comprados (não é por node).
    // Nível 1 não tem custo/tempo (ponto de partida do jogo).
    niveis: {
      1: { custoPorNode: null, numNodes: 0, tempoAbsolutoSegundos: null },
      2: { custoPorNode: 400, numNodes: 1, tempoAbsolutoSegundos: 300 },
      3: { custoPorNode: 700, numNodes: 1, tempoAbsolutoSegundos: 900 },
      4: { custoPorNode: 1500, numNodes: 1, tempoAbsolutoSegundos: 1800 },
      5: { custoPorNode: 3500, numNodes: 1, tempoAbsolutoSegundos: 3600 },
      6: { custoPorNode: 10000, numNodes: 1, tempoAbsolutoSegundos: 7200 },
      7: { custoPorNode: 25000, numNodes: 1, tempoAbsolutoSegundos: 27200 },
      8: { custoPorNode: 50000, numNodes: 1, tempoAbsolutoSegundos: 47200 },
      9: { custoPorNode: 33333.33, numNodes: 3, tempoAbsolutoSegundos: 67200 },
      10: { custoPorNode: 50000, numNodes: 3, tempoAbsolutoSegundos: 87200 },
      11: { custoPorNode: 83333.33, numNodes: 3, tempoAbsolutoSegundos: 107200 },
      12: { custoPorNode: 116666.67, numNodes: 3, tempoAbsolutoSegundos: 127200 },
      13: { custoPorNode: 112500, numNodes: 4, tempoAbsolutoSegundos: 147200 },
      14: { custoPorNode: 150000, numNodes: 4, tempoAbsolutoSegundos: 167200 },
      15: { custoPorNode: 160000, numNodes: 5, tempoAbsolutoSegundos: 187200 },
      16: { custoPorNode: 182000, numNodes: 5, tempoAbsolutoSegundos: 207200 },
      17: { custoPorNode: 170000, numNodes: 6, tempoAbsolutoSegundos: 227200 },
      18: { custoPorNode: 161428.57, numNodes: 7, tempoAbsolutoSegundos: 247200 },
      19: { custoPorNode: 155000, numNodes: 8, tempoAbsolutoSegundos: 277200 },
      20: { custoPorNode: 150000, numNodes: 9, tempoAbsolutoSegundos: 307200 },
      21: { custoPorNode: 146000, numNodes: 10, tempoAbsolutoSegundos: 337200 },
      22: { custoPorNode: 157000, numNodes: 10, tempoAbsolutoSegundos: 367200 },
      23: { custoPorNode: 168000, numNodes: 10, tempoAbsolutoSegundos: 397200 },
      24: { custoPorNode: 179000, numNodes: 10, tempoAbsolutoSegundos: 427200 },
      25: { custoPorNode: 190000, numNodes: 10, tempoAbsolutoSegundos: 457200 },
      26: { custoPorNode: 201000, numNodes: 10, tempoAbsolutoSegundos: 487200 },
      27: { custoPorNode: 212000, numNodes: 10, tempoAbsolutoSegundos: 517200 },
      28: { custoPorNode: 223000, numNodes: 10, tempoAbsolutoSegundos: 547200 },
      29: { custoPorNode: 234000, numNodes: 10, tempoAbsolutoSegundos: 577200 },
      30: { custoPorNode: 245000, numNodes: 10, tempoAbsolutoSegundos: 607200 },
      31: { custoPorNode: 256000, numNodes: 10, tempoAbsolutoSegundos: 637200 },
      32: { custoPorNode: 267000, numNodes: 10, tempoAbsolutoSegundos: 667200 },
      33: { custoPorNode: 278000, numNodes: 10, tempoAbsolutoSegundos: 697200 },
      34: { custoPorNode: 289000, numNodes: 10, tempoAbsolutoSegundos: 727200 },
      35: { custoPorNode: 300000, numNodes: 10, tempoAbsolutoSegundos: 757200 },
    },
  },
  martelo: {
    // ordem das 10 categorias de raridade, Primitive -> Divine —
    // mesma ordem usada em pontosBase.martelo.pontosPorCategoria
    categorias: [
      "primitive", "medieval", "earlyModern", "modern", "space",
      "interstellar", "multiverse", "quantum", "underworld", "divine",
    ] as const,
 
    // % de chance de cada categoria, por nível da forja (nivel_forja,
    // modificador individual — mesmo campo já usado antes de Martelo
    // existir, conforme o README). Fonte: tabela oficial "Forge
    // Upgrades Cost and Forging Probabilities". Cada linha soma ~100%
    // (pequenas variações de até 0.05% são arredondamento da própria
    // planilha oficial, não erro de transcrição).
    probabilidadePorNivel: {
      1: [100.00, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      2: [99.00, 1.00, 0, 0, 0, 0, 0, 0, 0, 0],
      3: [98.00, 2.00, 0, 0, 0, 0, 0, 0, 0, 0],
      4: [96.00, 4.00, 0, 0, 0, 0, 0, 0, 0, 0],
      5: [91.50, 8.00, 0.50, 0, 0, 0, 0, 0, 0, 0],
      6: [82.00, 16.00, 2.00, 0, 0, 0, 0, 0, 0, 0],
      7: [64.00, 32.00, 4.00, 0, 0, 0, 0, 0, 0, 0],
      8: [27.80, 64.00, 8.00, 0.20, 0, 0, 0, 0, 0, 0],
      9: [13.00, 70.00, 16.00, 1.00, 0, 0, 0, 0, 0, 0],
      10: [6.00, 60.00, 32.00, 2.00, 0, 0, 0, 0, 0, 0],
      11: [0, 31.90, 64.00, 4.00, 0.10, 0, 0, 0, 0, 0],
      12: [0, 27.50, 64.00, 8.00, 0.50, 0, 0, 0, 0, 0],
      13: [0, 8.00, 75.00, 16.00, 1.00, 0, 0, 0, 0, 0],
      14: [0, 0, 66.00, 32.00, 2.00, 0.05, 0, 0, 0, 0],
      15: [0, 0, 31.70, 64.00, 4.00, 0.25, 0, 0, 0, 0],
      16: [0, 0, 21.50, 70.00, 8.00, 0.50, 0, 0, 0, 0],
      17: [0, 0, 0, 82.90, 16.00, 1.00, 0.05, 0, 0, 0],
      18: [0, 0, 0, 65.70, 32.00, 2.00, 0.25, 0, 0, 0],
      19: [0, 0, 0, 31.50, 64.00, 4.00, 0.50, 0, 0, 0],
      20: [0, 0, 0, 0, 91.00, 8.00, 1.00, 0.05, 0, 0],
      21: [0, 0, 0, 0, 81.70, 16.00, 2.00, 0.25, 0, 0],
      22: [0, 0, 0, 0, 63.50, 32.00, 4.00, 0.50, 0, 0],
      23: [0, 0, 0, 0, 27.00, 64.00, 8.00, 1.00, 0, 0],
      24: [0, 0, 0, 0, 0, 82.00, 16.00, 2.00, 0.05, 0],
      25: [0, 0, 0, 0, 0, 64.00, 32.00, 4.00, 0.05, 0],
      26: [0, 0, 0, 0, 0, 43.80, 50.00, 6.00, 0.25, 0],
      27: [0, 0, 0, 0, 0, 31.50, 60.00, 8.00, 0.50, 0],
      28: [0, 0, 0, 0, 0, 21.00, 65.00, 13.00, 1.00, 0],
      29: [0, 0, 0, 0, 0, 6.99, 68.00, 23.00, 2.00, 0.02],
      30: [0, 0, 0, 0, 0, 0, 60.00, 36.00, 4.00, 0.05],
      31: [0, 0, 0, 0, 0, 0, 50.80, 43.00, 6.00, 0.25],
      32: [0, 0, 0, 0, 0, 0, 41.50, 50.00, 8.00, 0.50],
      33: [0, 0, 0, 0, 0, 0, 28.00, 58.00, 13.00, 1.00],
      34: [0, 0, 0, 0, 0, 0, 11.00, 64.00, 23.00, 2.00],
      35: [0, 0, 0, 0, 0, 0, 0, 60.00, 36.00, 4.00],
    } as Record<number, readonly number[]>,
  },
  diaBatalha: {
    // Pesos DERIVADOS POR REGRESSÃO em cima de 9 amostras reais de
    // (ATK, Vida, Poder) — NÃO é fórmula oficial do jogo, é uma
    // aproximação. Erro médio de ~7% no valor ABSOLUTO de Poder
    // (por isso NUNCA usamos isso pra calcular o Poder do zero —
    // só pra medir a RAZÃO de crescimento entre buffado/não-buffado,
    // aplicada em cima do Poder real que o jogador declara).
    // Se um dia surgir a fórmula oficial ou mais dados "limpos"
    // (jogadores sem substats, em escalas maiores), revisar aqui.
    pesoAtk: 4.276,
    pesoVida: 5.114,
  },

} as const;

export type TierOvo = (typeof constantes.ovo.ordemTiers)[number];
export default constantes;