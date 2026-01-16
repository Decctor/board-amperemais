import ErrorComponent from "@/components/Layouts/ErrorComponent";
import FullScreenWrapper from "@/components/Layouts/FullScreenWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getMagicLinkById } from "@/lib/authentication/actions";
import dayjs from "dayjs";
import Link from "next/link";
import MagicLinkVerifyWaitingPageForm from "./magic-link-page";

async function MagicLinkVerifyWaitingPage({ searchParams }: { searchParams: { id: string; error?: string; details?: string } }) {
	const searchParamsValues = await searchParams;

	console.log(searchParamsValues);
	if (searchParamsValues.error) return <ErrorComponent msg={searchParamsValues.error} />;

	const id = searchParamsValues.id;

	if (!id) return <ErrorComponent msg="ID de verificação não informado." />;
	const token = await getMagicLinkById(id);
	if (!token) return <ErrorComponent msg="Oops, código não encontrado ou expirado." />;

	const expiresInMinutes = dayjs(token.dataExpiracao).diff(dayjs(), "minutes");

	return (
		<FullScreenWrapper>
			<div className="flex h-full w-full items-center justify-center">
				<Card className="w-full max-w-md border-none lg:border-solid">
					<CardHeader className="text-center">
						<CardTitle>Acesso ao RecompraCRM</CardTitle>
						<CardDescription>Email de acesso enviado !</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{searchParamsValues.details ? (
							<p className="w-full text-center font-bold text-blue-800 text-sm tracking-tight">{searchParamsValues.details}</p>
						) : null}
						<p className="w-full text-center font-medium text-primary/80 text-sm tracking-tight">
							Clique no link de acesso enviado para o email: <strong>{token?.usuarioEmail}</strong>
						</p>
						<div className="my-4 flex items-center">
							<div className="grow border-muted border-t" />
							<div className="mx-2 text-muted-foreground">ou</div>
							<div className="grow border-muted border-t" />
						</div>
						<MagicLinkVerifyWaitingPageForm verificationTokenId={token.id} />
						<p className="w-full text-center font-medium text-primary/80 text-sm tracking-tight">
							O link expira em: <strong>{expiresInMinutes.toFixed(0)} minutos.</strong>
						</p>
					</CardContent>
					<CardFooter>
						<Button asChild className="p-0" size={"sm"} variant={"link"}>
							<Link href={`/magic-link/send?userId=${token.usuarioId}`} prefetch={false}>
								Não recebeu, ou o código expirou ? Clique aqui.
							</Link>
						</Button>
					</CardFooter>
				</Card>
			</div>
		</FullScreenWrapper>
	);
}

export default MagicLinkVerifyWaitingPage;
