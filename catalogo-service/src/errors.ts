import { Response } from "express";
import { ErroApi } from "./types";

export function enviarErro(res: Response, status: number, mensagem: string, codigo: string) {
  const corpo: ErroApi = { mensagem, codigo };
  return res.status(status).json(corpo);
}
