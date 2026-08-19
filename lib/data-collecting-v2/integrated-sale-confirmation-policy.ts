import type { TSaleAttendanceStatusEnum, TSaleStatusEnum } from "@/schemas/enums";

export function shouldProcessIntegratedSaleConfirmation({
	statusVenda,
	statusAtendimento,
}: {
	statusVenda: TSaleStatusEnum | null;
	statusAtendimento: TSaleAttendanceStatusEnum;
}) {
	return statusVenda === null && statusAtendimento === "NAO_INICIADO";
}
