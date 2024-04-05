import type { APIRoute } from "astro";
import config from 'theme-ssg/config'

export const GET: APIRoute = async () => {
	return new Response(
		JSON.stringify(config),
	);
};
