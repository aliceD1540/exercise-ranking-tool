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
						{ rank: 1, name: 'Alice', account: 'alice.example.com', score: 1000 },
						{ rank: 2, name: 'Bob', account: 'bob.example.com', score: 990 },
						{ rank: 2, name: 'Charlie', account: 'charlie.example.com', score: 990 },
						{ rank: 4, name: 'David', account: 'david.example.com', score: 980 },
						{ rank: 5, name: 'Eve', account: 'eve.example.com', score: 960 },
						{ rank: 6, name: 'Frank', account: 'frank.example.com', score: 950 },
						{ rank: 7, name: 'Grace', account: 'grace.example.com', score: 940 },
						{ rank: 8, name: 'Heidi', account: 'heidi.example.com', score: 930 },
						{ rank: 9, name: 'Ivan', account: 'ivan.example.com', score: 920 },
						{ rank: 10, name: 'Judy', account: 'judy.example.com', score: 910 },
						{ rank: 11, name: 'Karl', account: 'karl.example.com', score: 900 },
						{ rank: 12, name: 'Leo', account: 'leo.example.com', score: 890 },
						{ rank: 13, name: 'Mallory', account: 'mallory.example.com', score: 880 },
						{ rank: 14, name: 'Nina', account: 'nina.example.com', score: 870 },
						{ rank: 15, name: 'Oscar', account: 'oscar.example.com', score: 860 },
						{ rank: 16, name: 'Peggy', account: 'peggy.example.com', score: 850 },
						{ rank: 17, name: 'Quentin', account: 'quentin.example.com', score: 840 },
						{ rank: 18, name: 'Rupert', account: 'rupert.example.com', score: 830 },
						{ rank: 19, name: 'Sybil', account: 'sybil.example.com', score: 820 },
						{ rank: 20, name: 'Trent', account: 'trent.example.com', score: 810 },
						{ rank: 21, name: 'Uma', account: 'uma.example.com', score: 800 },
						{ rank: 22, name: 'Victor', account: 'victor.example.com', score: 790 },
						{ rank: 23, name: 'Walter', account: 'walter.example.com', score: 780 },
						{ rank: 24, name: 'Xena', account: 'xena.example.com', score: 770 },
						{ rank: 25, name: 'Yara', account: 'yara.example.com', score: 760 },
						{ rank: 26, name: 'Zara', account: 'zara.example.com', score: 750 },
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
					rank: 1,
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
