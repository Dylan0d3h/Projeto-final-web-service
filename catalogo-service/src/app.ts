import express, { NextFunction, Request, Response } from "express";
import { produtos, gerarId } from "./data";
import { enviarErro } from "./errors";
import { NovoProdutoBody, Produto, ReservaResposta } from "./types";

export const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[catalogo] ${req.method} ${req.originalUrl} -> ${res.statusCode}`);
  });
  next();
});

function lerId(valor: string | string[] | undefined): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function quantidadeValida(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0;
}

function produtoBodyValido(body: any): body is NovoProdutoBody {
  return (
    body !== null &&
    typeof body === "object" &&
    typeof body.nome === "string" &&
    body.nome.trim().length > 0 &&
    typeof body.preco === "number" &&
    Number.isFinite(body.preco) &&
    body.preco > 0 &&
    typeof body.estoque === "number" &&
    Number.isInteger(body.estoque) &&
    body.estoque >= 0
  );
}

app.get("/health", (_req, res) => {
  res.json({ servico: "catalogo-service", status: "ok" });
});

app.get("/produtos", (_req, res) => {
  res.status(200).json(produtos);
});

app.get("/produtos/:id", (req, res) => {
  const id = lerId(req.params.id);
  if (id === null) {
    return enviarErro(res, 400, "ID do produto inválido", "ID_INVALIDO");
  }

  const produto = produtos.find((p) => p.id === id);
  if (!produto) {
    return enviarErro(res, 404, "Produto não encontrado", "PRODUTO_NAO_ENCONTRADO");
  }

  return res.status(200).json(produto);
});

app.post("/produtos", (req, res) => {
  if (!produtoBodyValido(req.body)) {
    return enviarErro(
      res,
      400,
      "Dados do produto são inválidos (nome obrigatório, preco > 0, estoque inteiro >= 0)",
      "DADOS_INVALIDOS"
    );
  }

  const novo: Produto = {
    id: gerarId(),
    nome: req.body.nome.trim(),
    preco: req.body.preco,
    estoque: req.body.estoque,
  };
  produtos.push(novo);

  return res.status(201).json(novo);
});

app.post("/produtos/:id/reservas", (req, res) => {
  const id = lerId(req.params.id);
  if (id === null) {
    return enviarErro(res, 400, "ID do produto inválido", "ID_INVALIDO");
  }

  const quantidade = req.body?.quantidade;
  if (!quantidadeValida(quantidade)) {
    return enviarErro(
      res,
      400,
      "Quantidade inválida: informe um número inteiro maior que zero",
      "QUANTIDADE_INVALIDA"
    );
  }

  const produto = produtos.find((p) => p.id === id);
  if (!produto) {
    return enviarErro(res, 404, "Produto não encontrado", "PRODUTO_NAO_ENCONTRADO");
  }

  if (quantidade > produto.estoque) {
    return enviarErro(res, 409, "Estoque insuficiente", "ESTOQUE_INSUFICIENTE");
  }

  produto.estoque -= quantidade;

  const resposta: ReservaResposta = {
    produtoId: produto.id,
    reservado: quantidade,
    precoUnitario: produto.preco,
    estoqueRestante: produto.estoque,
  };
  return res.status(200).json(resposta);
});

app.use((_req, res) => {
  enviarErro(res, 404, "Rota não encontrada", "ROTA_NAO_ENCONTRADA");
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === "entity.parse.failed") {
    return enviarErro(res, 400, "JSON do corpo da requisição é inválido", "JSON_INVALIDO");
  }
  console.error("[catalogo] erro inesperado:", err);
  return enviarErro(res, 500, "Erro interno no Catálogo", "ERRO_INTERNO");
});
