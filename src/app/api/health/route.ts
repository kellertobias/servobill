export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Liveness probe for Docker and Kubernetes. Does not touch the database so a
 * slow database does not get the web container restarted.
 */
export function GET() {
	return Response.json({ status: 'ok' });
}
