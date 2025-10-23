import { formatToPhone } from "../formatting";

export function formatPhoneAsWhatsappId(phone: string) {
	const onlyNumbers = phone.replace(/[^0-9]/g, "");
	return `55${onlyNumbers}`;
}
export function formatWhatsappIdAsPhone(whatsappId: string) {
	const stringWithoutCountryCode = whatsappId.replace(/^55/, "");
	return formatToPhone(stringWithoutCountryCode);
}
