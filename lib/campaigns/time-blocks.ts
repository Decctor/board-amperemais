import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export const INTERACTIONS_CRON_TIMEZONE = process.env.INTERACTIONS_CRON_TIMEZONE ?? "America/Sao_Paulo";

export const INTERACTIONS_CRON_TIME_BLOCKS = [
	"00:00",
	"01:00",
	"02:00",
	"03:00",
	"04:00",
	"05:00",
	"06:00",
	"07:00",
	"08:00",
	"09:00",
	"10:00",
	"11:00",
	"12:00",
	"13:00",
	"14:00",
	"15:00",
	"16:00",
	"17:00",
	"18:00",
	"19:00",
	"20:00",
	"21:00",
	"22:00",
	"23:00",
] as const;

export type TInteractionCronTimeBlock = (typeof INTERACTIONS_CRON_TIME_BLOCKS)[number];

export function getTimeBlockMinutes(block: TInteractionCronTimeBlock): number {
	const [hour, minute] = block.split(":").map(Number);
	return hour * 60 + minute;
}

export function getCurrentTimeBlock(currentTime = dayjs()): TInteractionCronTimeBlock {
	const currentTotalMinutes = currentTime.hour() * 60 + currentTime.minute();

	let closestBlock: TInteractionCronTimeBlock = INTERACTIONS_CRON_TIME_BLOCKS[0];
	for (const block of INTERACTIONS_CRON_TIME_BLOCKS) {
		if (getTimeBlockMinutes(block) <= currentTotalMinutes) {
			closestBlock = block;
			continue;
		}
		break;
	}

	return closestBlock;
}

export function scheduledBlockHasArrived(scheduledBlock: TInteractionCronTimeBlock, currentBlock: TInteractionCronTimeBlock): boolean {
	return getTimeBlockMinutes(scheduledBlock) <= getTimeBlockMinutes(currentBlock);
}

export function getArrivedTimeBlocksForDate(currentBlock: TInteractionCronTimeBlock): TInteractionCronTimeBlock[] {
	const currentBlockMinutes = getTimeBlockMinutes(currentBlock);
	return INTERACTIONS_CRON_TIME_BLOCKS.filter((block) => getTimeBlockMinutes(block) <= currentBlockMinutes);
}
