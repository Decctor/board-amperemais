export const EXCEPTIONAL_PRESENCE_JUSTIFICATION_MIN_LENGTH = 30;
export const EXCEPTIONAL_PRESENCE_JUSTIFICATION_MAX_LENGTH = 1_000;

export type TExceptionalPresenceRestrictionCode =
  | "AUTOMATIC_EMISSION"
  | "DISABLED"
  | "MISSING_PERMISSION"
  | "NOT_DELIVERY";

export function getExceptionalPresenceRestriction({
  origem,
  habilitada,
  podeConfigurarFiscal,
  entregaModalidade,
}: {
  origem: "AUTOMATICA" | "MANUAL";
  habilitada: boolean;
  podeConfigurarFiscal: boolean;
  entregaModalidade: string | null | undefined;
}): { code: TExceptionalPresenceRestrictionCode; message: string } | null {
  if (origem !== "MANUAL") {
    return {
      code: "AUTOMATIC_EMISSION",
      message:
        "A classificação presencial excepcional só pode ser usada em uma emissão manual.",
    };
  }
  if (!habilitada) {
    return {
      code: "DISABLED",
      message:
        "A classificação presencial excepcional não está habilitada para esta organização.",
    };
  }
  if (!podeConfigurarFiscal) {
    return {
      code: "MISSING_PERMISSION",
      message:
        "Você não possui permissão para usar a classificação presencial excepcional.",
    };
  }
  if (entregaModalidade !== "ENTREGA") {
    return {
      code: "NOT_DELIVERY",
      message:
        "A classificação presencial excepcional está disponível somente para vendas com entrega.",
    };
  }
  return null;
}
