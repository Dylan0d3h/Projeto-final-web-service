export interface Produto {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
}

export interface NovoProdutoBody {
  nome: string;
  preco: number;
  estoque: number;
}

export interface ReservaBody {
  quantidade: number;
}

export interface ReservaResposta {
  produtoId: number;
  reservado: number;
  precoUnitario: number;
  estoqueRestante: number;
}

export interface ErroApi {
  mensagem: string;
  codigo: string;
}
