import { z } from 'zod'
import { SaleNatureEnum } from './enums'

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
})
export const SaleSchema = z.object({
  id: z.string({}),
  chave: z.string({}),
  cliente: z.string({}),
  data: z.string({}),
  dataVenda: z.string({}),
  modelo: z.enum(['DV', '55', '65', '3A', '02']),
  movimento: z.enum(['RECEITAS']),
  natureza: SaleNatureEnum,
  parceiro: z.string({}),
  serie: z.string(),
  situacao: z.enum(['00', '04', '02', '05']),
  tipo: z.enum(['Devolucao de compra', 'Outras Saidas Nao Especificadas', 'Remessa para conserto', 'Condicional', 'Venda de produtos']),
  valor: z.number({}),
  vendedor: z.string({}),
  idCliente: z.string({}),
  itens: z.array(SaleItemSchema),
  custoTotal: z.number(),
})

export const SalesQueryFilters = z.object({
  saleNature: z.array(SaleNatureEnum),
  total: z.object({
    min: z.number().optional().nullable(),
    max: z.number().optional().nullable(),
  }),
  sellers: z.array(z.string()),
})
export type TSalesQueryFilter = z.infer<typeof SalesQueryFilters>

export const SalesSimplifiedSearchQueryParams = z.object({
  search: z.string({ required_error: 'Parâmetro de busca não informado.', invalid_type_error: 'Parâmetro de busca não informado.' }),
  page: z
    .number({ required_error: 'Parâmetro de página não informado.', invalid_type_error: 'Parâmetro de página não informado.' })
    .min(1, { message: 'Página não informada.' }),
})
export type TSalesSimplifiedSearchQueryParams = z.infer<typeof SalesSimplifiedSearchQueryParams>

export type TSale = z.infer<typeof SaleSchema>

export type TSaleSimplified = Pick<TSale, 'id' | 'cliente' | 'valor'>
export type TSaleSimplifiedDTO = TSaleSimplified & { _id: string }

export const SaleSimplifiedProjection = { id: 1, cliente: 1, valor: 1 }
