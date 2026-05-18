import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import { z } from "zod";

export const ONLINE_SOFTWARE_SALES_API_URL = "https://onlinesistemas.net.br/planodecontas/apirestweb/vends/listvends.php";

export type TOnlineSoftwareConfig = {
	tipo: "ONLINE-SOFTWARE";
	url?: string;
	token: string;
};

export type TOnlineSoftwareSaleImportation = z.infer<typeof OnlineSoftwareSaleImportationSchema>;
export type TOnlineSoftwareSaleItemImportation = TOnlineSoftwareSaleImportation["itens"][number];

export type TOnlineSoftwareSalesApiResponse = {
	resultado: unknown;
};
