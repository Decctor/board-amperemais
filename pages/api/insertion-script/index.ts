import type { NextApiHandler } from "next";
// import ResultsJSON from "../../../resultados-att.json";
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

// const Results = ResultsJSON as any[];
const Results = [] as any[];

// 3 - This function handles the insertion of sale items into the database
const handleSaleItemsInsertion: NextApiHandler<any> = async (req, res) => {
	const existingSales = await db.query.sales.findMany({
		columns: {
			id: true,
			idExterno: true,
			clienteId: true,
		},
	});
	const existingProducts = await db.query.products.findMany({
		columns: {
			id: true,
			codigo: true,
		},
	});

	const saleMap = new Map(existingSales.map((c) => [c.idExterno, { saleId: c.id, clienteId: c.clienteId }]));
	const productMap = new Map(existingProducts.map((p) => [p.codigo, p.id]));

	const saleItemsRecords = Results.flatMap((sale) => sale.itens.map((item) => ({ idExterno: sale.id, ...item })));

	// 2. Processar as itens de vendas em lotes menores
	const BATCH_SIZE = 100;
	const totalSaleItems = saleItemsRecords.length;
	const insertedSaleItemsIds = [];

	for (let i = 0; i < totalSaleItems; i += BATCH_SIZE) {
		const batch = saleItemsRecords.slice(i, i + BATCH_SIZE);
		const saleItemsBatch: TNewSaleItemEntity[] = batch
			.map((saleItem) => {
				const { idExterno, ...item } = saleItem;
				const { saleId, clienteId } = saleMap.get(idExterno) || {};

				if (!saleId || !clienteId) {
					console.warn(`Venda não encontrada: ${idExterno}`);
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
				const valorVendaTotalLiquido = valorVendaTotalBruto - valorTotalDesconto;
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
		const result = await db.insert(saleItems).values(saleItemsBatch).returning({ id: sales.id });
		insertedSaleItemsIds.push(...result);

		console.log(`Processado lote ${Math.ceil(i / BATCH_SIZE)} de ${Math.ceil(totalSaleItems / BATCH_SIZE)}`);
	}

	return res.status(200).json({
		message: "Itens de vendas inseridas com sucesso",
		count: insertedSaleItemsIds.length,
		sales: insertedSaleItemsIds,
	});
};
// 2 - This function handles the insertion of sales into the database
const handleSalesInsertion: NextApiHandler<any> = async (req, res) => {
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

					const custoTotal = sale.itens.reduce((sum, item) => sum + Number(item.vcusto), 0);

					const dataVenda = dayjs(sale.data, "DD/MM/YYYY").add(3, "hours").toDate();
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
			const result = await db.insert(sales).values(salesBatch).returning({ id: sales.id });

			insertedSalesIds.push(...result);

			console.log(`Processado lote ${Math.ceil(i / BATCH_SIZE)} de ${Math.ceil(totalSales / BATCH_SIZE)}`);
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
// 1 - This function handles the insertion of clients and products into the database
const handleProductsAndClientsInsertion: NextApiHandler<any> = async (req, res) => {
	try {
		// Extract unique clients by name
		const uniqueClients = Array.from(
			new Map(
				Results.map((sale) => [
					sale.cliente,
					{
						nome: sale.cliente,
						telefone: sale.clientefone || sale.clientecelular ? formatToPhone(sale.clientefone || sale.clientecelular) : null,
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
		});
	} catch (error) {
		console.error("Error inserting data:", error);
		return res.status(500).json({ error: "Error inserting data" });
	}
};
// If necessary, this resets the database by deleting all sales and sale items
const handleReset: NextApiHandler<any> = async (req, res) => {
	await db.delete(saleItems);
	// await db.delete(sales);
	// await db.delete(clients);
	// await db.delete(products);

	return res.status(200).json({
		message: "Vendas e itens de vendas deletadas com sucesso",
	});
};
export default apiHandler({
	GET: handleSaleItemsInsertion,
});
