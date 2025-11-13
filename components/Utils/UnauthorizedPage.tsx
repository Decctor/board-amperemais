import Unauthenticated from "@/utils/svgs/unauthorized-unauthenticated.svg";
import Image from "next/image";
import Link from "next/link";
function UnauthorizedPage() {
	return (
		<div className="flex h-full w-full grow flex-col items-center justify-center gap-2 p-6">
			<div className="w-[250px] h-[250px] relative lg:w-[500px] lg:h-[500px]">
				<Image src={Unauthenticated} fill={true} alt="Não autenticado." />
			</div>
			<p className="text-sm font-medium italic text-gray-500 text-center">Oops, aparentemente você não possui permissão para acessar essa área.</p>
		</div>
	);
}

export default UnauthorizedPage;
