import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ servico: "pedidos-service", status: "ok" });
});

app.use((_req, res) => {
  res.status(404).json({ mensagem: "Rota não encontrada", codigo: "ROTA_NAO_ENCONTRADA" });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`[pedidos] Pedidos rodando em http://localhost:${PORT}`);
});
