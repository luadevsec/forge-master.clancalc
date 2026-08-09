// worker/data/pontuacao-base.ts
//
// Pontuação base de cada ação, ANTES do bônus do clã.
// Fonte: planilha "Clan War Day Actions".
// Editar aqui quando o jogo mudar os valores — não precisa mexer
// no resto do código.

const pontosBase = {
  chaveMasmorra: {
    pontosPorChave: 3000,
  },
  habilidade: {
    pontosPorInvocacao: 125, // cada habilidade habitada
    pontosPorMelhoria: 125,
  },
  montaria: {
    pontosPorInvocacao: 600,
    pontosPorFusao: 600,
  },
  ovo: {
    pontosPorTier: {
      branco: 400,
      azul: 1600,
      verde: 3200,
      amarelo: 6400,
      vermelho: 12800,
      roxo: 25600,
    },
    pontosPorFusao: 1250,
  },
  forja: {
    // pra CADA 1000 de ouro gasto (múltiplo inteiro, arredondado
    // pra baixo — 999 gasto = 0 pontos extra, 1000 = 27 pontos)
    pontosPorMilharGasto: 27,
  },
  martelo: {
    // pontos de cada categoria, MESMA ORDEM de
    // constantes.martelo.categorias (Primitive -> Divine)
    pontosPorCategoria: [1, 1, 1, 2, 2, 2, 3, 3, 3, 3] as const,
  },
  tecnologia: {
    // pontos por nível de pesquisa concluída (preparada previamente,
    // só bate com a pontuação no dia). Fonte: protótipo original.
    pontosPorNivel: {
      1: 920,
      2: 9000,
      3: 26000,
      4: 47800,
      5: 90700,
    },
  },
} as const;


export default pontosBase;