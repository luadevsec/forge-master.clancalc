// worker/services/calc/calc.ts
//
// Monta o objeto `calc`, agregando uma função por categoria — cada
// uma vive no seu próprio arquivo dentro desta pasta. Uso:
// calc.chaveMasmorra(...), calc.habilidade(...), calc.ovo(...), etc.
//
// REGRA DO PROJETO: as funções de `calc` NUNCA validam input (ex:
// divisão por custo/modificador zerado, nível fora do intervalo
// válido). Validação é responsabilidade de uma camada externa,
// separada (validacao.ts), antes de chamar essas funções.
//
// O objeto `calc` é fechado em 7 categorias: chaveMasmorra,
// habilidade, montaria, ovo, forja, martelo, tecnologia. Nenhuma
// categoria nova deve ser adicionada aqui.

import { chaveMasmorra } from "./chaveMasmorra.js";
import { habilidade } from "./habilidade.js";
import { montaria } from "./montaria.js";
import { ovo } from "./ovo.js";
import { forja } from "./forja.js";
import { martelo } from "./martelo.js";
import { tecnologia } from "./tecnologia.js";

const calc = {
  chaveMasmorra,
  habilidade,
  montaria,
  ovo,
  forja,
  martelo,
  tecnologia,
};

export default calc;
