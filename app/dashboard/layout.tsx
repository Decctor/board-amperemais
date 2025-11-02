import AppHeader from "@/components/Layouts/HeaderApp";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getUserSession } from "@/lib/auth/app-session";
import { type ReactNode, Suspense } from "react";

const MainLayout = async ({ children }: { children: ReactNode }) => {
	const user = await getUserSession();
	return (
		<SidebarProvider className="font-raleway">
			<AppSidebar user={user} />
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
