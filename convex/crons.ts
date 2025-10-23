import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check chat states every hour to expire conversations older than 24h
crons.interval(
	"check-chat-states",
	{ hours: 1 }, // Run every hour
	internal.mutations.chats.updateExpiredChats,
);

export default crons;
