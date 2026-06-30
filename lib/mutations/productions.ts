import type {
	TCreateProductionRecipeInput,
	TCreateProductionRecipeOutput,
	TDeleteProductionRecipeInput,
	TDeleteProductionRecipeOutput,
	TUpdateProductionRecipeInput,
	TUpdateProductionRecipeOutput,
} from "@/app/api/productions/recipes/route";
import axios from "axios";

export async function createProductionRecipe(input: TCreateProductionRecipeInput) {
	const { data } = await axios.post<TCreateProductionRecipeOutput>("/api/productions/recipes", input);
	return data;
}

export async function updateProductionRecipe(input: TUpdateProductionRecipeInput) {
	const { data } = await axios.put<TUpdateProductionRecipeOutput>("/api/productions/recipes", input);
	return data;
}

export async function deleteProductionRecipe(input: TDeleteProductionRecipeInput) {
	const { data } = await axios.delete<TDeleteProductionRecipeOutput>(`/api/productions/recipes?productionRecipeId=${input.productionRecipeId}`);
	return data;
}
