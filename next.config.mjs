/** @type {import('next').NextConfig} */
const nextConfig = {
	reactCompiler: true,
	reactStrictMode: true,
	async redirects() {
		return [
			// A página de lotes foi movida para dentro do módulo de Estoque.
			{
				source: "/dashboard/operational/stock-lots",
				destination: "/dashboard/operational/stocks/lots",
				permanent: true,
			},
			{
				source: "/dashboard/operational/stock-lots/:path*",
				destination: "/dashboard/operational/stocks/lots/:path*",
				permanent: true,
			},
		];
	},
	serverExternalPackages: ["@resvg/resvg-js"],
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
				hostname: "acdn-us.mitiendanube.com",
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
				protocol: "https",
				hostname: "upload.wikimedia.org",
			},
			{
				protocol: "http",
				hostname: "localhost",
			},
		],
	},
};

export default nextConfig;
