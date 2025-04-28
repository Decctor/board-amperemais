// import type { NextApiHandler } from "next";
// import { db } from "@/services/drizzle";
// import { apiHandler } from "@/lib/api";

// import { ProductEmbeddingService } from "@/services/ai";
// const handleTesting: NextApiHandler<any> = async (req, res) => {
// 	const embeddingService = new ProductEmbeddingService(process.env.OPENAI_API_KEY!, db);
// 	const products = await db.query.products.findMany({
// 		limit: 50,
// 	});

// 	for (const product of products) {
// 		try {
// 			await embeddingService.createEmbedding(product);
// 			console.log(`Created embedding for product ${product.id}`);
// 		} catch (error) {
// 			console.error(`Error creating embedding for product ${product.id}:`, error);
// 		}
// 	}
// };

// export default apiHandler({
// 	GET: handleTesting,
// });
