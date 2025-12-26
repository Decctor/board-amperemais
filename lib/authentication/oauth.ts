import * as arctic from "arctic";

export const FacebookOAuth = new arctic.Facebook(
	process.env.NEXT_PUBLIC_META_APP_ID as string,
	process.env.META_APP_SECRET as string,
	`${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/whatsapp/auth/callback`,
);
