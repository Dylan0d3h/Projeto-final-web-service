import { Produto } from "./types";

export const produtos: Produto[] = [
  { id: 1, nome: "Teclado mecânico", preco: 189.9, estoque: 8 },
  { id: 2, nome: "Mouse sem fio", preco: 79.5, estoque: 15 },
  { id: 3, nome: "Monitor 24 polegadas", preco: 899.0, estoque: 3 },
];

let proximoId = produtos.length + 1;

export function gerarId(): number {
  return proximoId++;
}
