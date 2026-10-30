export type StatusPedido = "confirmado";

export type NotificacaoStatus = "enviada" | "pendente";

export interface Pedido {
  id: number;
  produtoId: number;
  quantidade: number;
  clienteEmail: string;
  total: number;
  status: StatusPedido;
  notificacaoStatus: NotificacaoStatus;
  criadoEm: string;
}

export interface NovoPedidoBody {
  produtoId: number;
  quantidade: number;
  clienteEmail: string;
}

export interface ErroApi {
  mensagem: string;
  codigo: string;
}
