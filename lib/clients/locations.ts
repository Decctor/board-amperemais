import { getCEPInfo } from "@/lib/utils";
import { BrazilianCitiesOptionsFromUF } from "@/utils/states-cities";
import { toast } from "sonner";

export type TClientLocationAddressByCEP = {
	localizacaoCep: string;
	localizacaoLogradouro: string | null;
	localizacaoBairro: string | null;
	localizacaoEstado: string | null;
	localizacaoCidade: string | null;
};

/**
 * Busca o endereço de um CEP e devolve os campos de localização já normalizados
 * para os valores canônicos de estado/cidade (utils/states-cities).
 *
 * Retorna null quando o CEP não é encontrado — getCEPInfo já notifica o erro.
 */
export async function getClientLocationAddressByCEP(cep: string): Promise<TClientLocationAddressByCEP | null> {
	const toastId = toast.loading("Buscando informações sobre o CEP...");

	const addressInfo = await getCEPInfo(cep);
	toast.dismiss(toastId);
	if (!addressInfo) return null;

	const localizacaoEstado = addressInfo.uf ? addressInfo.uf.toUpperCase() : null;
	const cidade = addressInfo.localidade ? addressInfo.localidade.toUpperCase() : null;
	const localizacaoCidade = cidade && BrazilianCitiesOptionsFromUF(localizacaoEstado).some((option) => option.value === cidade) ? cidade : null;

	toast.success("Dados do CEP buscados com sucesso.", { duration: 1000 });

	return {
		localizacaoCep: cep,
		localizacaoLogradouro: addressInfo.logradouro || null,
		localizacaoBairro: addressInfo.bairro || null,
		localizacaoEstado,
		localizacaoCidade,
	};
}
