/** Mesma lógica da campanha CAMPEÕES — ritmo vertical vs altura 1080×1350 */
export function getNoticiaBoaScale(height: number) {
	const t = (height * 1.2) / 1350;
	return {
		t,
		padX: Math.max(40, Math.round(48 * t)),
		padTop: Math.round(44 * t),
		padBottom: Math.round(130 * t),
		sectionGap: Math.round(22 * t),
		radiusLg: Math.round(20 * t),
		radiusMd: Math.round(16 * t),
	};
}

export type NoticiaBoaLayoutTokens = ReturnType<typeof getNoticiaBoaScale>;
