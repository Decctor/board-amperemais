import type { NextApiHandler } from "next";
import { db } from "@/services/drizzle";
import { apiHandler } from "@/lib/api";

import { ProductEmbeddingService } from "@/services/ai";
import { sales } from "@/services/drizzle/schema";
import { count, sql, sum } from "drizzle-orm";
const handleTesting: NextApiHandler<any> = async (req, res) => {


    const salesGroupedByPartner = await db.select({
        parceiro: sales.parceiro,
        qtde: count(sales.id),
        // total: sum(sales.valorTotal),
    }).from(sales).groupBy(sales.parceiro)

    const orderedSalesGroupedByPartner = salesGroupedByPartner.sort((a, b) => (b.qtde || 0) - (a.qtde || 0))
    res.status(200).json(orderedSalesGroupedByPartner)
};

export default apiHandler({
    GET: handleTesting,
});
