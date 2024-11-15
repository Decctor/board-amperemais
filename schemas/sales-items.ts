import { z } from 'zod'

const SaleItemSchema = z.object({
  codigo: z.string({}),
  descricao: z.string({}),
  unidade: z.string({}),
  qtde: z.number(),
  valorunit: z.number(),
  vprod: z.number(),
  vdesc: z.number(),
  vcusto: z.number(),
  baseicms: z.number(),
  percent: z.number(),
  icms: z.number(),
  cst_icms: z.string({}),
  csosn: z.string({}),
  cst_pis: z.string({}),
  cfop: z.string({}),
  tipo: z.string({}),
  vfrete: z.number(),
  vseg: z.number(),
  voutro: z.number(),
  vipi: z.number(),
  vicmsst: z.number(),
  vicms_desonera: z.number(),
  ncm: z.string({}),
  cest: z.string({}),
  grupo: z.string({}),
  idVenda: z.string({}),
  idCliente: z.string({}),
  dataVenda: z.string({}),
})

export type TSaleItem = z.infer<typeof SaleItemSchema>
export type TSaleItemSimplified = {
  descricao: TSaleItem['descricao']
  unidade: TSaleItem['unidade']
  valorunit: TSaleItem['valorunit']
  vprod: TSaleItem['vprod']
  vcusto: TSaleItem['vcusto']
}
export type TSaleItemSimplifiedDTO = TSaleItemSimplified & {
  _id: string
}
