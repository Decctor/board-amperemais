import { api, internal } from "@/convex/_generated/api";
import type { TWhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";
import { getWhatsappTemplatePayload } from "@/lib/whatsapp/templates";
import { db } from "@/services/drizzle";
import { fetchMutation } from "convex/nextjs";
import dayjs from "dayjs";
import type { NextApiHandler } from "next";

const TIME_BLOCKS = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];

/**
 * Gets the most recent time block that has passed (or current if exact match)
 * @param currentTime - Optional dayjs object, defaults to now
 * @returns The closest time block (e.g., "09:00")
 */
function getCurrentTimeBlock(currentTime = dayjs()): (typeof TIME_BLOCKS)[number] {
	const currentHour = currentTime.hour();
	const currentMinute = currentTime.minute();
	const currentTotalMinutes = currentHour * 60 + currentMinute;

	// Convert time blocks to minutes for comparison
	const timeBlocksInMinutes = TIME_BLOCKS.map((block) => {
		const [hour, minute] = block.split(":").map(Number);
		return hour * 60 + minute;
	});

	// Find the most recent time block that has passed
	let closestBlock = TIME_BLOCKS[0]; // Default to "00:00"
	let closestMinutes = timeBlocksInMinutes[0];

	for (let i = 0; i < timeBlocksInMinutes.length; i++) {
		if (timeBlocksInMinutes[i] <= currentTotalMinutes) {
			closestBlock = TIME_BLOCKS[i];
			closestMinutes = timeBlocksInMinutes[i];
		} else {
			break; // Since blocks are sorted, we can break early
		}
	}

	return closestBlock;
}

const WHATSAPP_PHONE_NUMBER_ID = "893793573806565";

const processInteractionsHandler: NextApiHandler = async (req, res) => {
	try {
		const currentDateAsISO8601 = dayjs().format("YYYY-MM-DD");
		const currentTimeBlock = getCurrentTimeBlock();
		console.log("[INFO] [PROCESS_INTERACTIONS] Starting interactions processing", {
			currentDate: currentDateAsISO8601,
			currentTimeBlock,
		});

		const interactions = await db.query.interactions.findMany({
			where: (fields, { and, eq, isNull, isNotNull }) =>
				and(eq(fields.agendamentoDataReferencia, currentDateAsISO8601), isNotNull(fields.campanhaId), isNull(fields.dataExecucao)),
			with: {
				cliente: {
					columns: {
						id: true,
						nome: true,
						telefone: true,
						telefoneBase: true,
						email: true,
						analiseRFMTitulo: true,
					},
				},
				campanha: {
					columns: {
						autorId: true,
					},
				},
			},
		});

		const interactionsCampaignsIds = interactions.map((interaction) => interaction.campanhaId).filter((id) => id !== null);
		const campaigns = await db.query.campaigns.findMany({
			where: (fields, { inArray }) => inArray(fields.id, interactionsCampaignsIds),
			columns: {
				id: true,
			},
			with: {
				whatsappTemplate: true,
			},
		});

		for (const [index, interaction] of interactions.entries()) {
			if ((index + 1) % 10 === 0) {
				console.log(`[INFO] [PROCESS_INTERACTIONS] Processing interaction ${index + 1} of ${interactions.length}`);
			}
			const campaign = campaigns.find((campaign) => campaign.id === interaction.campanhaId);
			if (!campaign) continue;
			const whatsappTemplate = campaign.whatsappTemplate;
			if (!whatsappTemplate) continue;
			const whatsappTemplateVariablesValuesMap: Record<keyof TWhatsappTemplateVariables, string> = {
				clientEmail: interaction.cliente.email ?? "",
				clientName: interaction.cliente.nome,
				clientPhoneNumber: interaction.cliente.telefone,
				clientSegmentation: interaction.cliente.analiseRFMTitulo ?? "",
				clientFavoriteProduct: "",
				clientFavoriteProductGroup: "",
				clientSuggestedProduct: "",
			};

			const payload = getWhatsappTemplatePayload({
				template: {
					name: whatsappTemplate.nome,
					content: whatsappTemplate.componentes.corpo.conteudo,
					components: whatsappTemplate.componentes,
				},
				variables: whatsappTemplateVariablesValuesMap,
				toPhoneNumber: interaction.cliente.telefone,
			});

			await fetchMutation(api.mutations.messages.createTemplateMessage, {
				autor: {
					idApp: interaction.campanha?.autorId as string,
					tipo: "usuario",
				},
				cliente: {
					idApp: interaction.cliente.id,
					nome: interaction.cliente.nome,
					telefone: interaction.cliente.telefone,
					telefoneBase: interaction.cliente.telefone,
					email: interaction.cliente.email as string,
				},
				whatsappPhoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
				templateId: whatsappTemplate.id,
				templatePayloadData: payload.data,
				templatePayloadContent: payload.content,
			});
		}
		console.log("[INFO] [PROCESS_INTERACTIONS] Interactions processed successfully");

		return res.status(200).json({
			message: "Interactions processed successfully",
		});
	} catch (error) {
		console.error("[ERROR] [PROCESS_INTERACTIONS] Fatal error:", error);
		return res.status(500).json({
			error: "Failed to process interactions",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

export default processInteractionsHandler;
