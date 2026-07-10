import type {
	TCreateSupplierProductMappingsInput,
	TCreateSupplierProductMappingsOutput,
} from "@/app/api/suppliers/product-mappings/route";
import type { TCreateSupplierInput, TCreateSupplierOutput, TUpdateSupplierInput, TUpdateSupplierOutput } from "@/app/api/suppliers/route";
import axios from "axios";

export async function createSupplier(info: TCreateSupplierInput) {
	const { data } = await axios.post<TCreateSupplierOutput>("/api/suppliers", info);
	return data;
}

export async function updateSupplier(info: TUpdateSupplierInput) {
	const { data } = await axios.put<TUpdateSupplierOutput>("/api/suppliers", info);
	return data;
}

export async function createSupplierProductMappings(info: TCreateSupplierProductMappingsInput) {
	const { data } = await axios.post<TCreateSupplierProductMappingsOutput>("/api/suppliers/product-mappings", info);
	return data;
}
