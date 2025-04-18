import type { NextApiHandler } from "next";
import ResultsJSON from "../../../resultados-att.json";
import { apiHandler } from "@/lib/api";
import { formatToPhone } from "@/lib/formatting";
import { db } from "@/services/drizzle";
import {
	clients,
	products,
	saleItems,
	sales,
	type TNewClientEntity,
	type TNewProductEntity,
	type TNewSaleEntity,
	type TNewSaleItemEntity,
} from "@/services/drizzle/schema";
import dayjsCustomFormatter from "dayjs/plugin/customParseFormat";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";
dayjs.extend(dayjsCustomFormatter);

const Results = ResultsJSON.flatMap((i) => i);
const ResultsExample = [
	{
		cliente: "RENATO MARTINS SOUZA",
		clientefone: "34999652939",
		clientecelular: "",
		documento: "000003550",
		modelo: "55",
		serie: "001",
		valor: "3640.00",
		id: "LAN4082881943608449",
		movimento: "RECEITAS",
		data: "01/03/2025",
		vendedor: "LUDMILA",
		natureza: "SN01",
		tipo: "Venda de produtos",
		parceiro: "0",
		situacao: "00",
		chave: "31250346268418000185550010000035501082881940",
		itens: [
			{
				codigo: "002522",
				descricao: "ABRACADEIRA NYLON 280MMX4,8 - PRETA",
				unidade: "UN",
				qtde: "100.0000",
				valorunit: "0.3500",
				vprod: "35.00",
				vdesc: "2.64",
				vcusto: 13,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "007",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "39269090",
				cest: "1002000",
				grupo: "MISCELANIA",
			},
			{
				codigo: "0146",
				descricao: "TERMINAL ILHOS CURTO 16MM AZUL",
				unidade: "UN",
				qtde: "6.0000",
				valorunit: "0.9600",
				vprod: "5.76",
				vdesc: "0.43",
				vcusto: 1.2,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "000",
				csosn: "102",
				cst_pis: "49",
				cfop: "5102",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85369090",
				cest: "",
				grupo: "TERMINAIS",
			},
			{
				codigo: "05001.5070.31",
				descricao: "DISJUNTOR NEMA ASM3-B 3X70A",
				unidade: "PC",
				qtde: "1.0000",
				valorunit: "118.9700",
				vprod: "118.97",
				vdesc: "8.96",
				vcusto: 79.07,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85362000",
				cest: "1200400",
				grupo: "PROTEÇÃO",
			},
			{
				codigo: "05121.0020.21",
				descricao: "DISJUNTOR SOPRANO 20A 2 POLO",
				unidade: "PC",
				qtde: "1.0000",
				valorunit: "32.9000",
				vprod: "32.90",
				vdesc: "2.48",
				vcusto: 22.06,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85362000",
				cest: "1200400",
				grupo: "PROTEÇÃO",
			},
			{
				codigo: "05136.0001.01",
				descricao: "CONECTOR GENERICO FRONTAL 25MM",
				unidade: "PC",
				qtde: "8.0000",
				valorunit: "13.1500",
				vprod: "105.20",
				vdesc: "7.92",
				vcusto: 35.12,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85389090",
				cest: "1200500",
				grupo: "TERMINAIS",
			},
			{
				codigo: "05137.0121.03",
				descricao: "BARRAMENTO PENTE FASE 63A 12P 21CM TRIFASICO",
				unidade: "PC",
				qtde: "1.0000",
				valorunit: "35.2500",
				vprod: "35.25",
				vdesc: "2.66",
				vcusto: 22.54,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85444900",
				cest: "1200700",
				grupo: "TERMINAIS",
			},
			{
				codigo: "120452",
				descricao: "QUADRO P/ 1 DISJUNTOR C/ TAMPA PVC SOBREPOR - ILUMI",
				unidade: "UN",
				qtde: "1.0000",
				valorunit: "15.9000",
				vprod: "15.90",
				vdesc: "0.00",
				vcusto: 8.89,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "007",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85381000",
				cest: "1200500",
				grupo: "INFRAESTRUTURA",
			},
			{
				codigo: "123119",
				descricao: "SOQUETE c/RABICHO PARA T8",
				unidade: "UN",
				qtde: "20.0000",
				valorunit: "2.0000",
				vprod: "40.00",
				vdesc: "3.01",
				vcusto: 16.8,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "007",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85366100",
				cest: "1200400",
				grupo: "INFRAESTRUTURA",
			},
			{
				codigo: "129",
				descricao: "TERMINAL PRE ISOLADO FORQUILHA 4 - 6MM FURO 5.3 AM",
				unidade: "UN",
				qtde: "20.0000",
				valorunit: "1.1500",
				vprod: "23.00",
				vdesc: "1.73",
				vcusto: 6.2,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "000",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85369090",
				cest: "1200400",
				grupo: "TERMINAIS",
			},
			{
				codigo: "1855",
				descricao: "PARAFUSO FENDIDO BIMETALICO PFB 50MM - INTELLI",
				unidade: "PC",
				qtde: "1.0000",
				valorunit: "25.2400",
				vprod: "25.24",
				vdesc: "1.90",
				vcusto: 16.83,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85359090",
				cest: "1200300",
				grupo: "TERMINAIS",
			},
			{
				codigo: "218200000017",
				descricao: "Cordao paralelo 300V 2x2,5mm2 - Marrom",
				unidade: "UN",
				qtde: "50.0000",
				valorunit: "5.2800",
				vprod: "264.00",
				vdesc: "19.89",
				vcusto: 176,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "006",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85444900",
				cest: "1200700",
				grupo: "CABOS",
			},
			{
				codigo: "24.00.00.00.37",
				descricao: "LUMINARIA SLIM LINEAR 240CM 72W 6500K",
				unidade: "UN",
				qtde: "2.0000",
				valorunit: "88.0200",
				vprod: "176.04",
				vdesc: "13.26",
				vcusto: 97.8,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "006",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "94051190",
				cest: "2112200",
				grupo: "ILUMINAÇÃO",
			},
			{
				codigo: "3101001-1",
				descricao: "DUTO PEAD CORRUGADO PRETO 1 POL.",
				unidade: "MT",
				qtde: "50.0000",
				valorunit: "2.2000",
				vprod: "110.00",
				vdesc: "0.00",
				vcusto: 67.5,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "39172100",
				cest: "1000600",
				grupo: "INFRAESTRUTURA",
			},
			{
				codigo: "400435",
				descricao: "FITA ISOLANTE 3M IMPERIAL 18X20M",
				unidade: "UN",
				qtde: "2.0000",
				valorunit: "8.8500",
				vprod: "17.70",
				vdesc: "1.33",
				vcusto: 10.84,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "102",
				cst_pis: "49",
				cfop: "5102",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "39191020",
				cest: "",
				grupo: "MISCELANIA",
			},
			{
				codigo: "401071",
				descricao: "FITA ISOLANTE 3M AUTO FUSAO 19MMX10M",
				unidade: "UN",
				qtde: "1.0000",
				valorunit: "39.5000",
				vprod: "39.50",
				vdesc: "2.98",
				vcusto: 22.14,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "000",
				csosn: "102",
				cst_pis: "49",
				cfop: "5102",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "40059190",
				cest: "",
				grupo: "MISCELANIA",
			},
			{
				codigo: "4201213",
				descricao: "CORDAO PARALELO 300V 2x1mm - BRANCO - ANTICHAMA - MEGATRON",
				unidade: "MT",
				qtde: "50.0000",
				valorunit: "2.3200",
				vprod: "116.00",
				vdesc: "8.74",
				vcusto: 77.5,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "0",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85444900",
				cest: "1200700",
				grupo: "CABOS",
			},
			{
				codigo: "591481374",
				descricao: "LAMPADA LED TUBULAR 65W 6500K 2,40m",
				unidade: "UN",
				qtde: "1.0000",
				valorunit: "75.9000",
				vprod: "75.90",
				vdesc: "5.72",
				vcusto: 50.6,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "000",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85395200",
				cest: "0900500",
				grupo: "ILUMINAÇÃO",
			},
			{
				codigo: "7642",
				descricao: "CABO FLEXIVEL 750V 2,5MM AMARELO - ANTICHAMA - MEGATRON",
				unidade: "MT",
				qtde: "100.0000",
				valorunit: "2.3300",
				vprod: "233.00",
				vdesc: "17.55",
				vcusto: 160,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85444900",
				cest: "1200700",
				grupo: "CABOS",
			},
			{
				codigo: "7802",
				descricao: "CABO FLEXIVEL 750V 6MM PRETO - ANTICHAMA - MEGATRON",
				unidade: "MT",
				qtde: "300.0000",
				valorunit: "5.6500",
				vprod: "1695.00",
				vdesc: "127.67",
				vcusto: 1137,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85444900",
				cest: "1200700",
				grupo: "CABOS",
			},
			{
				codigo: "7822",
				descricao: "CABO FLEXIVEL 750V 6MM AZUL - ANTICHAMA - MEGATRON",
				unidade: "MT",
				qtde: "100.0000",
				valorunit: "5.7700",
				vprod: "577.00",
				vdesc: "43.46",
				vcusto: 382,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85444900",
				cest: "1200700",
				grupo: "CABOS",
			},
			{
				codigo: "79073",
				descricao: "CONECTOR DE PERFURACAO CDP 150-35",
				unidade: "PC",
				qtde: "6.0000",
				valorunit: "18.3000",
				vprod: "109.80",
				vdesc: "8.27",
				vcusto: 60.96,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85359090",
				cest: "1200300",
				grupo: "TERMINAIS",
			},
			{
				codigo: "S3B70340",
				descricao: "MODULO TOMADA 2P+T 10A 250v BRANCO - MILUZ",
				unidade: "UN",
				qtde: "3.0000",
				valorunit: "9.4000",
				vprod: "28.20",
				vdesc: "2.12",
				vcusto: 18.81,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85366910",
				cest: "1200400",
				grupo: "ACABAMENTO",
			},
			{
				codigo: "S3B72010",
				descricao: "MODULO INTERRUPTOR SIMPLES 10A 250V BRANCO - MILUZ",
				unidade: "UN",
				qtde: "2.0000",
				valorunit: "7.9500",
				vprod: "15.90",
				vdesc: "1.20",
				vcusto: 10.8,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "001",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "85365090",
				cest: "1200400",
				grupo: "ACABAMENTO",
			},
			{
				codigo: "S3B76120",
				descricao: "SUPORTE 4X2 - MILUZ",
				unidade: "UN",
				qtde: "5.0000",
				valorunit: "3.0000",
				vprod: "15.00",
				vdesc: "1.13",
				vcusto: 7.4,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "000",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "39259090",
				cest: "1001700",
				grupo: "ACABAMENTO",
			},
			{
				codigo: "S3B77110",
				descricao: "PLACA 4X2 1 POSTO BRANCO - MILUZ",
				unidade: "UN",
				qtde: "5.0000",
				valorunit: "3.2000",
				vprod: "16.00",
				vdesc: "1.21",
				vcusto: 10.6,
				baseicms: "0.00",
				percent: "0.00",
				icms: "0.00",
				cst_icms: "000",
				csosn: "500",
				cst_pis: "49",
				cfop: "5405",
				tipo: "PRODUTOS",
				vfrete: "0.00",
				vseg: "0.00",
				voutro: "0.00",
				vipi: "0.00",
				vicmsst: "0.00",
				vicms_desonera: "0.00",
				ncm: "39259090",
				cest: "1001700",
				grupo: "ACABAMENTO",
			},
		],
	},
];

const handleFixSalesDatesScript: NextApiHandler<any> = async (req, res) => {
	await db.delete(saleItems);
	await db.delete(sales);

	return res.status(200).json({
		message: "Vendas e itens de vendas deletadas com sucesso",
	});
};
const handleSaleItemsInsertionScript: NextApiHandler<any> = async (
	req,
	res,
) => {
	const existingSales = await db.query.sales.findMany({
		columns: {
			id: true,
			chave: true,
			clienteId: true,
		},
	});
	const existingProducts = await db.query.products.findMany({
		columns: {
			id: true,
			codigo: true,
		},
	});

	const saleMap = new Map(
		existingSales.map((c) => [
			c.chave,
			{ saleId: c.id, clienteId: c.clienteId },
		]),
	);
	const productMap = new Map(existingProducts.map((p) => [p.codigo, p.id]));

	const saleItemsRecords = Results.flatMap((sale) =>
		sale.itens.map((item) => ({ vendaChave: sale.chave, ...item })),
	);

	// 2. Processar as itens de vendas em lotes menores
	const BATCH_SIZE = 100;
	const totalSaleItems = saleItemsRecords.length;
	const insertedSaleItemsIds = [];

	for (let i = 0; i < totalSaleItems; i += BATCH_SIZE) {
		const batch = saleItemsRecords.slice(i, i + BATCH_SIZE);
		const saleItemsBatch: TNewSaleItemEntity[] = batch
			.map((saleItem) => {
				const { vendaChave, ...item } = saleItem;
				const { saleId, clienteId } = saleMap.get(vendaChave) || {};

				if (!saleId || !clienteId) {
					console.warn(`Venda não encontrada: ${vendaChave}`);
					return null;
				}

				const productID = productMap.get(item.codigo);
				if (!productID) {
					console.warn(`Produto não encontrado: ${item.codigo}`);
					return null;
				}
				const quantidade = Number(item.qtde);
				const valorVendaUnitario = Number(item.valorunit);
				const valorVendaTotalBruto = valorVendaUnitario * quantidade;
				const valorTotalDesconto = Number(item.vdesc);
				const valorVendaTotalLiquido =
					valorVendaTotalBruto - valorTotalDesconto;
				const valorCustoTotal = Number(item.vcusto);

				return {
					vendaId: saleId,
					clienteId: clienteId,
					produtoId: productID,
					quantidade: Number(item.qtde),
					valorVendaUnitario: valorVendaUnitario,
					valorCustoUnitario: valorCustoTotal / quantidade,
					valorVendaTotalBruto,
					valorTotalDesconto,
					valorVendaTotalLiquido,
					valorCustoTotal,
					metadados: {
						baseicms: item.baseicms,
						percent: item.percent,
						icms: item.icms,
						cst_icms: item.cst_icms,
						csosn: item.csosn,
						cst_pis: item.cst_pis,
						cfop: item.cfop,
						vfrete: item.vfrete,
						vseg: item.vseg,
						voutro: item.voutro,
						vipi: item.vipi,
						vicmsst: item.vicmsst,
						vicms_desonera: item.vicms_desonera,
						cest: item.cest,
					},
				};
			})
			.filter(Boolean) as TNewSaleItemEntity[];

		// Inserir o lote atual
		const result = await db
			.insert(saleItems)
			.values(saleItemsBatch)
			.returning({ id: sales.id });
		insertedSaleItemsIds.push(...result);

		console.log(
			`Processado lote ${Math.ceil(i / BATCH_SIZE)} de ${Math.ceil(totalSaleItems / BATCH_SIZE)}`,
		);
	}

	return res.status(200).json({
		message: "Itens de vendas inseridas com sucesso",
		count: insertedSaleItemsIds.length,
		sales: insertedSaleItemsIds,
	});
};
const handleSalesJSONExport: NextApiHandler<any> = async (req, res) => {
	try {
		// 1. Primeiro obter todos os clientes e produtos necessários
		const existingClients = await db.query.clients.findMany({
			columns: {
				id: true,
				nome: true,
			},
		});

		const existingProducts = await db.query.products.findMany({
			columns: {
				id: true,
				codigo: true,
			},
		});

		const clientMap = new Map(existingClients.map((c) => [c.nome, c.id]));
		const productMap = new Map(existingProducts.map((p) => [p.codigo, p.id]));

		// 2. Processar as vendas em lotes menores
		const BATCH_SIZE = 100;
		const totalSales = Results.length;
		const insertedSalesIds = [];

		for (let i = 0; i < totalSales; i += BATCH_SIZE) {
			const batch = Results.slice(i, i + BATCH_SIZE);

			const salesBatch: TNewSaleEntity[] = batch
				.map((sale) => {
					const clientId = clientMap.get(sale.cliente);
					if (!clientId) {
						console.warn(`Cliente não encontrado: ${sale.cliente}`);
						return null;
					}

					const custoTotal = sale.itens.reduce(
						(sum, item) => sum + Number(item.vcusto),
						0,
					);

					const dataVenda = dayjs(sale.data, "DD/MM/YYYY")
						.add(3, "hours")
						.toDate();
					return {
						idExterno: sale.id,
						clienteId: clientId,
						valorTotal: Number(sale.valor),
						custoTotal: custoTotal,
						vendedor: sale.vendedor || "N/A",
						parceiro: sale.parceiro || "N/A",
						chave: sale.chave || "N/A",
						documento: sale.documento || "N/A",
						modelo: sale.modelo || "N/A",
						movimento: sale.movimento || "N/A",
						natureza: sale.natureza || "N/A",
						serie: sale.serie || "N/A",
						situacao: sale.situacao || "N/A",
						tipo: sale.tipo,
						dataVenda,
					};
				})
				.filter(Boolean) as TNewSaleEntity[];

			// Inserir o lote atual
			const result = await db
				.insert(sales)
				.values(salesBatch)
				.returning({ id: sales.id });

			insertedSalesIds.push(...result);

			console.log(
				`Processado lote ${Math.ceil(i / BATCH_SIZE)} de ${Math.ceil(totalSales / BATCH_SIZE)}`,
			);
		}

		return res.status(200).json({
			message: "Vendas inseridas com sucesso",
			count: insertedSalesIds.length,
			sales: insertedSalesIds,
		});
	} catch (error) {
		console.error("Erro ao inserir vendas:", error);
		return res.status(500).json({
			error: "Erro ao inserir vendas",
			details: error instanceof Error ? error.message : "Erro desconhecido",
		});
	}
};
const handleProductsAndClientsInsertionScript: NextApiHandler<any> = async (
	req,
	res,
) => {
	try {
		// Extract unique clients by name
		const uniqueClients = Array.from(
			new Map(
				Results.map((sale) => [
					sale.cliente,
					{
						nome: sale.cliente,
						telefone:
							sale.clientefone || sale.clientecelular
								? formatToPhone(sale.clientefone || sale.clientecelular)
								: null,
					},
				]),
			).values(),
		);

		// Extract unique products by codigo
		const uniqueProducts = Array.from(
			new Map(
				Results.flatMap((sale) =>
					sale.itens.map((item) => [
						item.codigo,
						{
							codigo: item.codigo || "N/A",
							descricao: item.descricao || "N/A",
							unidade: item.unidade || "N/A",
							ncm: item.ncm || "N/A",
							tipo: item.tipo || "N/A",
							grupo: item.grupo || "N/A",
						},
					]),
				),
			).values(),
		);

		// Start transaction
		const result = await db.transaction(async (tx) => {
			// 1. Insert all clients and get their IDs
			console.log("Starting to insert clients");
			const insertedClients = await Promise.all(
				uniqueClients.map(async (client) => {
					const [inserted] = await tx
						.insert(clients)
						.values(client as TNewClientEntity)
						.returning();
					return inserted;
				}),
			);
			console.log("Finished inserting clients");
			// 2. Insert all products and get their IDs
			console.log("Starting to insert products");
			const insertedProducts = await Promise.all(
				uniqueProducts.map(async (product) => {
					const [inserted] = await tx
						.insert(products)
						.values(product as TNewProductEntity)
						// .onConflictDoUpdate({
						// 	target: [products.codigo],
						// 	set: {
						// 		descricao: (product as TNewProductEntity).descricao,
						// 		unidade: (product as TNewProductEntity).unidade,
						// 		ncm: (product as TNewProductEntity).ncm,
						// 		tipo: (product as TNewProductEntity).tipo,
						// 		grupo: (product as TNewProductEntity).grupo,
						// 	},
						// })
						.returning();
					return inserted;
				}),
			);
			console.log("Finished inserting products");
			// Create maps for quick lookups
			const clientMap = new Map(insertedClients.map((c) => [c.nome, c.id]));
			const productMap = new Map(insertedProducts.map((p) => [p.codigo, p.id]));

			return res.status(200).json({
				clients: Array.from(clientMap),
				products: productMap,
				message: "Data inserted successfully",
			});
			// 3. Insert sales and their items
			// console.log("Starting to insert sales and items");
			// for (const sale of Results) {
			// 	const clientId = clientMap.get(sale.cliente)!;

			// 	// Calculate totals
			// 	const custoTotal = sale.itens.reduce(
			// 		(sum, item) => sum + Number(item.vcusto), // doest require multiplication by quantity (vcusto is already the total cost)
			// 		0,
			// 	);

			// 	// Insert sale
			// 	const [insertedSale] = await tx
			// 		.insert(sales)
			// 		.values({
			// 			idExterno: sale.id,
			// 			clienteId: clientId,
			// 			valorTotal: Number(sale.valor),
			// 			custoTotal: custoTotal,
			// 			vendedor: sale.vendedor || "N/A",
			// 			parceiro: sale.parceiro || "N/A",
			// 			chave: sale.chave || "N/A",
			// 			documento: sale.documento || "N/A",
			// 			modelo: sale.modelo || "N/A",
			// 			movimento: sale.movimento || "N/A",
			// 			natureza: sale.natureza || "N/A",
			// 			serie: sale.serie || "N/A",
			// 			situacao: sale.situacao || "N/A",
			// 			tipo: sale.tipo,
			// 		})
			// 		.returning();

			// 	// Insert sale items
			// 	await Promise.all(
			// 		sale.itens.map(async (item) => {
			// 			const quantidade = Number(item.qtde);
			// 			const valorVendaUnitario = Number(item.valorunit);
			// 			const valorVendaTotalBruto = valorVendaUnitario * quantidade;
			// 			const valorTotalDesconto = Number(item.vdesc);
			// 			const valorVendaTotalLiquido =
			// 				valorVendaTotalBruto - valorTotalDesconto;
			// 			const valorCustoTotal = Number(item.vcusto);

			// 			return tx.insert(saleItems).values({
			// 				vendaId: insertedSale.id,
			// 				clienteId: clientId,
			// 				produtoId: productMap.get(item.codigo)!,
			// 				quantidade: Number(item.qtde),
			// 				valorVendaUnitario: valorVendaUnitario,
			// 				valorCustoUnitario: valorCustoTotal / quantidade,
			// 				valorVendaTotalBruto,
			// 				valorTotalDesconto,
			// 				valorVendaTotalLiquido,
			// 				valorCustoTotal,
			// 				metadados: {
			// 					baseicms: item.baseicms,
			// 					percent: item.percent,
			// 					icms: item.icms,
			// 					cst_icms: item.cst_icms,
			// 					csosn: item.csosn,
			// 					cst_pis: item.cst_pis,
			// 					cfop: item.cfop,
			// 					vfrete: item.vfrete,
			// 					vseg: item.vseg,
			// 					voutro: item.voutro,
			// 					vipi: item.vipi,
			// 					vicmsst: item.vicmsst,
			// 					vicms_desonera: item.vicms_desonera,
			// 					cest: item.cest,
			// 				},
			// 			});
			// 		}),
			// 	);
			// }
			// console.log("Finished inserting sales and items");
		});
	} catch (error) {
		console.error("Error inserting data:", error);
		return res.status(500).json({ error: "Error inserting data" });
	}
};
export default apiHandler({
	GET: handleSaleItemsInsertionScript,
});
