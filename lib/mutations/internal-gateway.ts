import type {
	TInitializeInternalGatewayInput,
	TInitializeInternalGatewayOutput,
	TDeleteInternalGatewayOutput,
} from "@/app/api/whatsapp-connections/internal-gateway/route";
import axios from "axios";

export async function initializeInternalGatewayConnection(
	input: TInitializeInternalGatewayInput,
) {
	const { data } = await axios.post<TInitializeInternalGatewayOutput>(
		"/api/whatsapp-connections/internal-gateway",
		input,
	);
	return data;
}

export async function disconnectInternalGateway(connectionId: string) {
	const { data } = await axios.delete<TDeleteInternalGatewayOutput>(
		`/api/whatsapp-connections/internal-gateway?id=${connectionId}`,
	);
	return data;
}

export async function reconnectInternalGateway(connectionId: string) {
	// For reconnection, we first disconnect then reinitialize
	// The UI should handle showing the QR flow again
	await disconnectInternalGateway(connectionId);
	// The caller will need to reinitialize with phone details
}
