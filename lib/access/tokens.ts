import type { TAccessCredentialTypeEnum } from "@/schemas/enums";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";

// Formato do token: rcm_<ambiente>_<tipo>_<id-publico>_<segredo>
// O id público localiza a credencial sem varrer hashes; apenas o SHA-256 do segredo é persistido.
const CREDENTIAL_TYPE_TOKEN_SEGMENTS: Record<TAccessCredentialTypeEnum, string> = {
	TOKEN_DISPOSITIVO: "dvc",
	CHAVE_API: "key",
};

function getEnvironmentSegment() {
	return process.env.NODE_ENV === "production" ? "live" : "test";
}

// Segredos são gerados pela plataforma com alta entropia (256 bits), então SHA-256 é o hash
// correto: barato o bastante para verificar o Bearer token contra o banco em TODA requisição,
// preservando revogação imediata. Bcrypt/argon2 são para senhas humanas — não usar aqui (§9.3).
export function hashAccessSecret(secret: string) {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(secret)));
}

type TGeneratedAccessCredential = {
	token: string;
	idPublico: string;
	prefixoExibicao: string;
	hashSegredo: string;
};
export function generateAccessCredentialToken({ tipo }: { tipo: TAccessCredentialTypeEnum }): TGeneratedAccessCredential {
	const publicIdBytes = new Uint8Array(8);
	crypto.getRandomValues(publicIdBytes);
	const idPublico = encodeBase32LowerCaseNoPadding(publicIdBytes);

	const secretBytes = new Uint8Array(32);
	crypto.getRandomValues(secretBytes);
	const segredo = encodeBase32LowerCaseNoPadding(secretBytes);

	const prefixoExibicao = `rcm_${getEnvironmentSegment()}_${CREDENTIAL_TYPE_TOKEN_SEGMENTS[tipo]}_${idPublico}`;
	return {
		token: `${prefixoExibicao}_${segredo}`,
		idPublico,
		prefixoExibicao,
		hashSegredo: hashAccessSecret(segredo),
	};
}

type TParsedAccessCredentialToken = {
	idPublico: string;
	segredo: string;
};
export function parseAccessCredentialToken(token: string): TParsedAccessCredentialToken | null {
	const segments = token.split("_");
	if (segments.length !== 5) return null;
	const [prefix, environment, typeSegment, idPublico, segredo] = segments;
	if (prefix !== "rcm") return null;
	if (environment !== "live" && environment !== "test") return null;
	if (!Object.values(CREDENTIAL_TYPE_TOKEN_SEGMENTS).includes(typeSegment)) return null;
	if (!idPublico || !segredo) return null;
	return { idPublico, segredo };
}

// Comparação em tempo constante sobre os hashes (strings hex de mesmo comprimento).
export function constantTimeEqual(a: string, b: string) {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let index = 0; index < a.length; index++) {
		result |= a.charCodeAt(index) ^ b.charCodeAt(index);
	}
	return result === 0;
}
