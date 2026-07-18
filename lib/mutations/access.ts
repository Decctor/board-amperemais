import type { TRevokeAccessCredentialInput, TRevokeAccessCredentialOutput } from "@/app/api/access/credentials/revoke/route";
import type { TRotateAccessCredentialInput, TRotateAccessCredentialOutput } from "@/app/api/access/credentials/rotate/route";
import type { TCreateEnrollmentChallengeInput, TCreateEnrollmentChallengeOutput } from "@/app/api/access/enrollments/route";
import type { TUpdateAccessPrincipalInput, TUpdateAccessPrincipalOutput } from "@/app/api/access/principals/route";
import axios from "axios";

export async function createAccessEnrollmentChallenge(input: TCreateEnrollmentChallengeInput) {
	const { data } = await axios.post<TCreateEnrollmentChallengeOutput>("/api/access/enrollments", input);
	return data;
}

export async function updateAccessPrincipal(input: TUpdateAccessPrincipalInput) {
	const { data } = await axios.patch<TUpdateAccessPrincipalOutput>("/api/access/principals", input);
	return data;
}

export async function rotateAccessCredential(input: TRotateAccessCredentialInput) {
	const { data } = await axios.post<TRotateAccessCredentialOutput>("/api/access/credentials/rotate", input);
	return data;
}

export async function revokeAccessCredential(input: TRevokeAccessCredentialInput) {
	const { data } = await axios.post<TRevokeAccessCredentialOutput>("/api/access/credentials/revoke", input);
	return data;
}
