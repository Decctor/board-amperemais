import FullScreenWrapper from "@/components/Layouts/FullScreenWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type InviteErrorPageProps = {
	searchParams: { message?: string };
};

export default function InviteErrorPage({ searchParams }: InviteErrorPageProps) {
	const message = searchParams.message || "Não foi possível validar este convite.";
	return (
		<FullScreenWrapper>
			<div className="flex h-full w-full items-center justify-center">
				<Card className="w-full max-w-md border-none lg:border-solid">
					<CardHeader className="text-center">
						<CardTitle>Convite inválido</CardTitle>
						<CardDescription>{message}</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="w-full text-center font-medium text-primary/80 text-sm tracking-tight">
							Se você acredita que isto é um erro, solicite um novo convite ao administrador da organização.
						</p>
					</CardContent>
					<CardFooter className="flex justify-center">
						<Button asChild size="sm">
							<Link href="/auth/signin">Ir para o login</Link>
						</Button>
					</CardFooter>
				</Card>
			</div>
		</FullScreenWrapper>
	);
}
