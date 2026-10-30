export interface Notificacao {
  id: number;
  pedidoId: number;
  destino: string;
  mensagem: string;
  criadaEm: string;
}

export interface NovaNotificacaoBody {
  pedidoId: number;
  destino: string;
  mensagem: string;
}

export interface ErroApi {
  mensagem: string;
  codigo: string;
}
