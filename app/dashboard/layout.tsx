import AppHeader from "@/components/Layouts/HeaderApp";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";

const MainLayout = async ({ children }: { children: ReactNode }) => {
	const user = await getCurrentSession();
	if (!user || !user.membership) redirect("/auth/signin");
	return (
		<SidebarProvider className="font-raleway">
			<AppSidebar user={user.user} organization={user.membership.organizacao} />
			<Suspense fallback={<LoadingComponent />}>
				<SidebarInset className="overflow-y-auto p-6 flex flex-col gap-3">
					<AppHeader />
					{children}
				</SidebarInset>
			</Suspense>
		</SidebarProvider>
	);
};

export default MainLayout;
