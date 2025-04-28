import { OpenAI } from "openai";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { db, type DB } from "../drizzle";
import { productEmbeddings, products, type TProductEntity } from "../drizzle/schema";
import { PostgresError } from "postgres";

export class ProductEmbeddingService {
	private readonly openai: OpenAI;
	private readonly db: DB;

	constructor(openaiApiKey: string, db: DB) {
		this.openai = new OpenAI({ apiKey: openaiApiKey });
		this.db = db;
	}

	private async generateEmbedding(text: string): Promise<number[]> {
		try {
			const response = await this.openai.embeddings.create({
				model: "text-embedding-ada-002",
				input: text,
			});

			return response.data[0].embedding;
		} catch (error) {
			console.error("Error generating embedding:", error);
			throw new Error("Failed to generate embedding");
		}
	}

	private prepareProductText(product: TProductEntity): string {
		// Incluindo todos os campos relevantes para melhorar a busca
		return [product.descricao, product.codigo, product.grupo, product.tipo, product.unidade].filter(Boolean).join(" ").toLowerCase().trim();
	}

	async createEmbedding(product: TProductEntity) {
		try {
			const text = this.prepareProductText(product);
			const embedding = await this.generateEmbedding(text);

			await this.db.insert(productEmbeddings).values({
				produtoId: product.id,
				embedding: embedding,
			});

			return true;
		} catch (error) {
			if (error instanceof PostgresError && error.code === "23505") {
				// Unique constraint violation - embedding already exists
				return await this.updateEmbedding(product);
			}
			throw error;
		}
	}

	async updateEmbedding(product: TProductEntity) {
		try {
			const text = this.prepareProductText(product);
			const embedding = await this.generateEmbedding(text);

			await this.db
				.update(productEmbeddings)
				.set({
					embedding: embedding,
					dataAtualizacao: new Date(),
				})
				.where(eq(productEmbeddings.produtoId, product.id));

			return true;
		} catch (error) {
			console.error(`Error updating embedding for product ${product.id}:`, error);
			throw error;
		}
	}

	async searchSimilarProducts(
		query: string,
		options: {
			limit?: number;
			similarityThreshold?: number;
			grupo?: string;
		} = {},
	) {
		const { limit = 5, similarityThreshold = 0.7, grupo } = options;

		try {
			const queryEmbedding = await this.generateEmbedding(query);

			const similarity = sql<number>`1 - (${cosineDistance(productEmbeddings.embedding, queryEmbedding)})`;

			const conditions = [];
			if (grupo) conditions.push(eq(products.grupo, grupo));

			const result = await this.db
				.select({ descricao: products.descricao, similarity })
				.from(productEmbeddings)
				.where(and(gt(similarity, similarityThreshold), ...conditions))
				.orderBy((t) => desc(t.similarity))
				.innerJoin(products, eq(products.id, productEmbeddings.produtoId))
				.limit(limit);

			return result;
		} catch (error) {
			console.error("Error searching products:", error);
			throw new Error("Failed to search products");
		}
	}

	async deleteEmbedding(productId: string) {
		try {
			await this.db.delete(productEmbeddings).where(eq(productEmbeddings.produtoId, productId));
			return true;
		} catch (error) {
			console.error(`Error deleting embedding for product ${productId}:`, error);
			throw error;
		}
	}

	async refreshAllEmbeddings() {
		try {
			const allProducts = await this.db.select().from(products);

			for (const product of allProducts) {
				await this.createEmbedding(product);
				// Optional: Add delay to avoid rate limiting
				await new Promise((resolve) => setTimeout(resolve, 200));
			}

			return true;
		} catch (error) {
			console.error("Error refreshing all embeddings:", error);
			throw error;
		}
	}

	async getEmbeddingStatus() {
		try {
			const result = await this.db.execute(`
        SELECT 
          COUNT(DISTINCT p.id) as total_products,
          COUNT(DISTINCT pe.produto_id) as total_embeddings,
          MAX(pe.data_atualizacao) as last_update
        FROM products p
        LEFT JOIN product_embeddings pe ON p.id = pe.produto_id
      `);

			return result[0];
		} catch (error) {
			console.error("Error getting embedding status:", error);
			throw error;
		}
	}
}
