/** @type {import('next').NextConfig} */
const nextConfig = {
	reactCompiler: true,
	reactStrictMode: true,
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		minimumCacheTTL: 2678400, // 31 days
		remotePatterns: [
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				protocol: "https",
				hostname: "firebasestorage.googleapis.com",
			},
			{
				protocol: "https",
				hostname: "sc-erp.s3.amazonaws.com",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "wawrqfehfafrrnfsycgs.supabase.co",
			},
			{
				protocol: "https",
				hostname: "static.saipos.com",
			},
			{
				protocol: "https",
				hostname: "storage.googleapis.com",
			},
			{
				protocol: "https",
				hostname: "brave-warbler-898.convex.cloud",
			},
			{
				protocol: "https",
				hostname: "image.mux.com",
			},
			{
				protocol: "http",
				hostname: "localhost",
			},
		],
	},
};

export default nextConfig;
