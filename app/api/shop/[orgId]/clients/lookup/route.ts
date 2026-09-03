import { appApiHandler } from "@/lib/app-api";
import { formatPhoneAsBase } from "@/lib/formatting";
import { isValidCpfCnpj } from "@/lib/validation";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const ShopClientLookupInputSchema = z.object({
  telefone: z.string({
    required_error: "Telefone não informado.",
    invalid_type_error: "Tipo não válido para telefone.",
  }),
});
export type TShopClientLookupInput = z.infer<
  typeof ShopClientLookupInputSchema
>;

function extractOrgId(pathname: string) {
  return pathname.split("/")[3];
}

async function lookupShopClient(request: NextRequest) {
  const orgId = extractOrgId(request.nextUrl.pathname);
  const body = await request.json();
  const input = ShopClientLookupInputSchema.parse(body);
  const telefoneBase = formatPhoneAsBase(input.telefone);
  if (!telefoneBase) throw new createHttpError.BadRequest("Telefone inválido.");

  const client = await db.query.clients.findFirst({
    where: (fields, { and, eq }) =>
      and(
        eq(fields.organizacaoId, orgId),
        eq(fields.telefoneBase, telefoneBase),
      ),
    columns: {
      id: true,
      nome: true,
      cpfCnpj: true,
      telefone: true,
    },
    with: {
      saldos: {
        columns: {
          id: true,
          programaId: true,
          saldoValorDisponivel: true,
          saldoValorAcumuladoTotal: true,
          saldoValorResgatadoTotal: true,
        },
        with: {
          programa: {
            columns: {
              id: true,
              ativo: true,
              terminologia: true,
              modalidadeDescontosPermitida: true,
              resgateLimiteTipo: true,
              resgateLimiteValor: true,
            },
          },
        },
      },
    },
  });

  const publicClient = client
    ? {
        id: client.id,
        nome: client.nome,
        telefone: client.telefone,
        possuiCpfCnpjValido: isValidCpfCnpj(client.cpfCnpj ?? ""),
        saldos: client.saldos,
      }
    : null;

  return NextResponse.json({
    data: {
      client: publicClient,
    },
    message: client
      ? "Cliente encontrado com sucesso."
      : "Cliente não encontrado.",
  });
}
export type TShopClientLookupOutput =
  Awaited<ReturnType<typeof lookupShopClient>> extends NextResponse<infer T>
    ? T
    : never;

export const POST = appApiHandler({ POST: lookupShopClient });
