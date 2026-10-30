# Projeto Integrador — Sistema Distribuído de Pedidos

Disciplina de Web Services — IFMS.

Três serviços independentes (TypeScript + Express), cada um com seus próprios dados, que se comunicam apenas por HTTP:

| Serviço | Pasta | Porta | Responsabilidade |
|---|---|---|---|
| Catálogo/Estoque | `catalogo-service` | 3001 | Dono dos produtos, preços e quantidade disponível. Só ele altera estoque. |
| Pedidos | `pedidos-service` | 3000 | Recebe o pedido, pede reserva ao Catálogo, calcula total, registra o pedido e solicita notificação. |
| Notificações | `notificacoes-service` | 3002 | Registra tentativas de notificação. Não conhece estoque nem regras de pedido. |

## Status por encontro

- [x] **Encontro 1** — estrutura do repositório, tipos, contratos dos três serviços e Catálogo/Estoque completo.
- [ ] Encontro 2 — Pedidos e comunicação síncrona com Catálogo.
- [ ] Encontro 3 — Notificações, timeout e observabilidade.
- [ ] Encontro 4 — testes de integração, documentação e demonstração.

> No Encontro 1, Pedidos e Notificações sobem como projetos Express vazios (apenas `GET /health`) nas portas corretas. Seus tipos já estão definidos em `src/types.ts`.

## Arquitetura

```
                                  reserva estoque
                              ┌──────────────────────► CATÁLOGO/ESTOQUE :3001
 Thunder/Cliente ──POST /pedidos──► PEDIDOS :3000        (dependência crítica: sem reserva, pedido não nasce)
                              └──────────────────────► NOTIFICAÇÕES :3002
                                  envia aviso            (dependência secundária: falha de aviso não apaga o pedido)
```

## Como rodar

Pré-requisito: Node.js 18+.

Em **cada** pasta de serviço:

```bash
cd catalogo-service
cp .env.example .env
npm install
npm run dev
```

Ordem de inicialização sugerida: Catálogo (3001) → Notificações (3002) → Pedidos (3000).

Verificação rápida: `GET http://localhost:<porta>/health` responde `{ "status": "ok" }` em cada serviço.

### Variáveis de ambiente

```bash
# catalogo-service/.env.example
PORT=3001

# notificacoes-service/.env.example
PORT=3002

# pedidos-service/.env.example
PORT=3000
CATALOG_URL=http://localhost:3001
NOTIFICATION_URL=http://localhost:3002
```

O `.env` real não é versionado; apenas o `.env.example`.

## Contrato de erros (todos os serviços)

Todo erro responde JSON neste formato, sem stack trace:

```json
{ "mensagem": "Estoque insuficiente", "codigo": "ESTOQUE_INSUFICIENTE" }
```

| Status | Quando usar | Exemplo de mensagem |
|---|---|---|
| 400 | body inválido / quantidade <= 0 | "Dados do pedido são inválidos" |
| 404 | produto ou pedido não existe | "Produto não encontrado" |
| 409 | estoque insuficiente | "Estoque insuficiente" |
| 502 | serviço dependente falhou | "Catálogo indisponível" |
| 504 | serviço dependente excedeu timeout | "Catálogo demorou para responder" |

## Contratos

### Serviço 1 — Catálogo/Estoque (:3001) — implementado

| Método | Endpoint | Comportamento |
|---|---|---|
| GET | `/produtos` | 200 + lista de produtos |
| GET | `/produtos/:id` | 200 + produto \| 400 (id inválido) \| 404 |
| POST | `/produtos` | 201 + produto criado \| 400 se dados inválidos |
| POST | `/produtos/:id/reservas` | 200 reserva \| 400 \| 404 \| 409 |

**Produto**

```json
{ "id": 1, "nome": "Teclado mecânico", "preco": 189.9, "estoque": 8 }
```

**POST /produtos** — body: `nome` (texto não vazio), `preco` (número > 0), `estoque` (inteiro >= 0).

```json
{ "nome": "Webcam HD", "preco": 149.9, "estoque": 5 }
```

**POST /produtos/:id/reservas** — body: `quantidade` (inteiro > 0).

```http
POST /produtos/1/reservas
{ "quantidade": 2 }

200 OK
{ "produtoId": 1, "reservado": 2, "precoUnitario": 189.9, "estoqueRestante": 6 }
```

O `precoUnitario` vai na resposta para que Pedidos calcule o total com o preço do Catálogo, sem confiar em preço enviado pelo cliente.

Códigos de erro da reserva:

| Situação | Status | codigo |
|---|---|---|
| id não numérico | 400 | `ID_INVALIDO` |
| quantidade ausente, <= 0 ou não inteira | 400 | `QUANTIDADE_INVALIDA` |
| JSON malformado | 400 | `JSON_INVALIDO` |
| produto não existe | 404 | `PRODUTO_NAO_ENCONTRADO` |
| quantidade maior que o estoque | 409 | `ESTOQUE_INSUFICIENTE` |

Produtos iniciais (em memória): 1 Teclado mecânico (R$ 189,90, estoque 8), 2 Mouse sem fio (R$ 79,50, estoque 15), 3 Monitor 24 polegadas (R$ 899,00, estoque 3). Os dados voltam ao estado inicial quando o serviço reinicia.

### Serviço 2 — Pedidos (:3000) — contrato definido, implementação no Encontro 2

| Método | Endpoint | Comportamento |
|---|---|---|
| POST | `/pedidos` | cria pedido depois de reservar estoque |
| GET | `/pedidos` | lista pedidos |
| GET | `/pedidos/:id` | retorna pedido \| 404 |

```http
POST /pedidos
{
  "produtoId": 1,
  "quantidade": 2,
  "clienteEmail": "aluno@estudante.ifms.edu.br"
}
```

Resposta: `id`, `produtoId`, `quantidade`, `clienteEmail`, `total`, `status`, `notificacaoStatus` (`"enviada"` ou `"pendente"`) e `criadoEm`.

Fluxo obrigatório: validar body → reservar estoque → criar pedido → notificar → responder.
Falha em validar ou reservar → pedido **não** é criado. Falha em notificar → pedido **permanece** criado com `notificacaoStatus: "pendente"`.

### Serviço 3 — Notificações (:3002) — contrato definido, implementação no Encontro 3

| Método | Endpoint | Comportamento |
|---|---|---|
| POST | `/notificacoes` | 201 e registra a notificação |
| GET | `/notificacoes` | 200 + histórico |

```http
POST /notificacoes
{
  "pedidoId": 17,
  "destino": "aluno@estudante.ifms.edu.br",
  "mensagem": "Pedido 17 confirmado"
}
```

## Testes do Encontro 1

Com o Catálogo rodando em 3001, use `testes-catalogo.http` (extensão REST Client) ou o Thunder Client:

| Cenário | Requisição | Esperado |
|---|---|---|
| Sucesso | `POST /produtos/1/reservas` `{ "quantidade": 2 }` | 200 + `estoqueRestante` |
| Produto inexistente | `POST /produtos/999/reservas` `{ "quantidade": 2 }` | 404 |
| Quantidade inválida | `POST /produtos/1/reservas` `{ "quantidade": 0 }` | 400 |
| Estoque insuficiente | `POST /produtos/1/reservas` `{ "quantidade": 50 }` | 409 |

**Checkpoint:** Catálogo roda sozinho em :3001 e passa pelos quatro cenários de teste.

## Estrutura

```
projeto-webservices-final/
├── catalogo-service/
│   ├── src/ (server.ts, app.ts, data.ts, errors.ts, types.ts)
│   ├── package.json
│   └── .env.example
├── pedidos-service/
│   ├── src/ (server.ts, types.ts)
│   ├── package.json
│   └── .env.example
├── notificacoes-service/
│   ├── src/ (server.ts, types.ts)
│   ├── package.json
│   └── .env.example
├── testes-catalogo.http
├── README.md
└── .gitignore
```
