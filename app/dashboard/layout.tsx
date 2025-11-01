import { SidebarInset } from "@/components/ui/sidebar";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getUserSession } from "@/lib/auth/app-session";
import { Suspense, type ReactNode } from "react";
import AppHeader from "@/components/Layouts/HeaderApp";

const MainLayout = async ({ children }: { children: ReactNode }) => {
	const user = await getUserSession();
	return (
		<SidebarProvider>
			<AppSidebar user={user} />
			<Suspense fallback={<LoadingComponent />}>
				<SidebarInset className="overflow-y-auto p-6">
					<AppHeader />
					{children}
				</SidebarInset>
			</Suspense>
		</SidebarProvider>
	);
};

export default MainLayout;
