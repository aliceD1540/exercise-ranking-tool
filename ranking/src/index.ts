/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// GET
		if (request.method === 'GET') {
			if (request.url.endsWith('/ranking')) {
				// ランキング情報を返す
				const json = {
					ranking: [
						{ id: 1, name: 'Alice', score: 100 },
						{ id: 2, name: 'Bob', score: 90 },
						{ id: 3, name: 'Charlie', score: 80 },
					],
				};
				return new Response(JSON.stringify(json), {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type',
					},
				});
			} else {
				// 指定したアカウントのランキング情報を返す
				const id = request.url.split('/').pop();
				// テスト用JSONを返す
				const json = {
					id: 1,
					name: 'Alice',
					score: 100,
				};
				return new Response(JSON.stringify(json), {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type',
					},
				});
			}
		}
		return new Response('Method Not Allowed', {
			status: 405,
		});
	},
} satisfies ExportedHandler<Env>;
