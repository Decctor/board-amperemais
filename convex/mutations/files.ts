import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

export const saveFileMetadata = mutation({
	args: {
		storageId: v.id("_storage"),
		filename: v.string(),
		mimeType: v.string(),
		fileSize: v.number(),
		fileType: v.union(v.literal("image"), v.literal("document"), v.literal("audio")),
	},
	handler: async (ctx, args) => {
		// For now, we just return the storage ID
		// In the future, you might want to save additional metadata in a separate table
		return {
			storageId: args.storageId,
			message: "Metadados do arquivo salvos com sucesso",
		};
	},
});

export const getFileUrl = mutation({
	args: {
		storageId: v.id("_storage"),
	},
	handler: async (ctx, args) => {
		return await ctx.storage.getUrl(args.storageId);
	},
});
