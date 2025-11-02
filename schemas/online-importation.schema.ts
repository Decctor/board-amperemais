import { z } from "zod";

const OnlineSoftwareSaleItemSchema = z.object({
	codigo: z.string({
		required_error: "Código do item não informado.",
		invalid_type_error: "Tipo não válido para o código do item.",
	}),
	descricao: z.string({
		required_error: "Descrição do item não informada.",
		invalid_type_error: "Tipo não válido para a descrição do item.",
	}),
	unidade: z.string({
		required_error: "Unidade do item não informada.",
		invalid_type_error: "Tipo não válido para a unidade do item.",
	}),
	qtde: z.string({
		required_error: "Quantidade do item não informada.",
		invalid_type_error: "Tipo não válido para a quantidade do item.",
	}),
	valorunit: z.string({
		required_error: "Valor unitário do item não informado.",
		invalid_type_error: "Tipo não válido para o valor unitário do item.",
	}),
	vprod: z.string({
		required_error: "Valor do produto não informado.",
		invalid_type_error: "Tipo não válido para o valor do produto.",
	}),
	vdesc: z.string({
		required_error: "Valor do desconto não informado.",
		invalid_type_error: "Tipo não válido para o valor do desconto.",
	}),
	vcusto: z.number({
		required_error: "Valor do custo não informado.",
		invalid_type_error: "Tipo não válido para o valor do custo.",
	}),
	baseicms: z.string({
		required_error: "Base do ICMS não informada.",
		invalid_type_error: "Tipo não válido para a base do ICMS.",
	}),
	percent: z.string({
		required_error: "Percentual não informado.",
		invalid_type_error: "Tipo não válido para o percentual.",
	}),
	icms: z.string({
		required_error: "ICMS não informado.",
		invalid_type_error: "Tipo não válido para o ICMS.",
	}),
	cst_icms: z.string({
		required_error: "CST do ICMS não informado.",
		invalid_type_error: "Tipo não válido para o CST do ICMS.",
	}),
	csosn: z.string({
		required_error: "CSOSN não informado.",
		invalid_type_error: "Tipo não válido para o CSOSN.",
	}),
	cst_pis: z.string({
		required_error: "CST do PIS não informado.",
		invalid_type_error: "Tipo não válido para o CST do PIS.",
	}),
	cfop: z.string({
		required_error: "CFOP não informado.",
		invalid_type_error: "Tipo não válido para o CFOP.",
	}),
	tipo: z.string({
		required_error: "Tipo não informado.",
		invalid_type_error: "Tipo não válido para o tipo.",
	}),
	vfrete: z.string({
		required_error: "Valor do frete não informado.",
		invalid_type_error: "Tipo não válido para o valor do frete.",
	}),
	vseg: z.string({
		required_error: "Valor do seguro não informado.",
		invalid_type_error: "Tipo não válido para o valor do seguro.",
	}),
	voutro: z.string({
		required_error: "Valor de outros não informado.",
		invalid_type_error: "Tipo não válido para o valor de outros.",
	}),
	vipi: z.string({
		required_error: "Valor do IPI não informado.",
		invalid_type_error: "Tipo não válido para o valor do IPI.",
	}),
	vicmsst: z.string({
		required_error: "Valor do ICMS ST não informado.",
		invalid_type_error: "Tipo não válido para o valor do ICMS ST.",
	}),
	vicms_desonera: z.string({
		required_error: "Valor do ICMS desonerado não informado.",
		invalid_type_error: "Tipo não válido para o valor do ICMS desonerado.",
	}),
	ncm: z.string({
		required_error: "NCM não informado.",
		invalid_type_error: "Tipo não válido para o NCM.",
	}),
	cest: z.string({
		required_error: "CEST não informado.",
		invalid_type_error: "Tipo não válido para o CEST.",
	}),
	grupo: z.string({
		required_error: "Grupo não informado.",
		invalid_type_error: "Tipo não válido para o grupo.",
	}),
});

export const OnlineSoftwareSaleImportationSchema = z.object({
	cliente: z.string({
		required_error: "Cliente não informado.",
		invalid_type_error: "Tipo não válido para o cliente.",
	}),
	clientefone: z
		.string({
			required_error: "Telefone do cliente não informado.",
			invalid_type_error: "Tipo não válido para o telefone do cliente.",
		})
		.optional()
		.nullable(),
	clientecelular: z
		.string({
			invalid_type_error: "Tipo não válido para o celular do cliente.",
		})
		.optional()
		.nullable(),
	documento: z.string({
		required_error: "Documento não informado.",
		invalid_type_error: "Tipo não válido para o documento.",
	}),
	modelo: z.string({
		required_error: "Modelo não informado.",
		invalid_type_error: "Tipo não válido para o modelo.",
	}),
	serie: z.string({
		required_error: "Série não informada.",
		invalid_type_error: "Tipo não válido para a série.",
	}),
	valor: z.string({
		required_error: "Valor não informado.",
		invalid_type_error: "Tipo não válido para o valor.",
	}),
	id: z.string({
		required_error: "ID não informado.",
		invalid_type_error: "Tipo não válido para o ID.",
	}),
	movimento: z.string({
		required_error: "Movimento não informado.",
		invalid_type_error: "Tipo não válido para o movimento.",
	}),
	data: z.string({
		required_error: "Data não informada.",
		invalid_type_error: "Tipo não válido para a data.",
	}),
	vendedor: z.string({
		required_error: "Vendedor não informado.",
		invalid_type_error: "Tipo não válido para o vendedor.",
	}),
	natureza: z.string({
		required_error: "Natureza não informada.",
		invalid_type_error: "Tipo não válido para a natureza.",
	}),
	tipo: z.string({
		required_error: "Tipo não informado.",
		invalid_type_error: "Tipo não válido para o tipo.",
	}),
	parceiro: z
		.string({
			required_error: "Parceiro não informado.",
			invalid_type_error: "Tipo não válido para o parceiro.",
		})
		.optional()
		.nullable(),
	situacao: z.string({
		required_error: "Situação não informada.",
		invalid_type_error: "Tipo não válido para a situação.",
	}),
	chave: z
		.string({
			required_error: "Chave não informada.",
			invalid_type_error: "Tipo não válido para a chave.",
		})
		.optional()
		.nullable(),
	itens: z.array(OnlineSoftwareSaleItemSchema, {
		required_error: "Itens não informados.",
		invalid_type_error: "Tipo não válido para os itens.",
	}),
});

type TOnlineSoftwareSalesImportation = z.infer<typeof OnlineSoftwareSaleImportationSchema>;
type TOnlineSoftwareSaleItemImportation = z.infer<typeof OnlineSoftwareSaleItemSchema>;
