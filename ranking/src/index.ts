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

import { Agent } from '@atproto/api';
import { KVNamespace } from '@cloudflare/workers-types';
import { Post } from './types/data-models';

interface Env {
	KV: KVNamespace;
	DB: D1Database;
	SEARCH_QUERY: string;
	SEARCH_PERIOD_MIN: number;
}

const agent = new Agent({
	service: 'https://api.bsky.app',
});

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
			} else if (request.url.match(/\/ranking\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) {
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
	async scheduled(event, env, ctx): Promise<void> {
		if (event.cron === '*/5 * * * *') {
			// 5分毎にKVへの記録処理を実行
			console.log('save to KV start.');

			// 現在時刻を取得して、5分単位で切り捨て
			const now = new Date();
			const untilDate = new Date(now);
			untilDate.setMinutes(Math.floor(untilDate.getMinutes() / 5) * 5, 0, 0);

			// sinceはuntilの{SEARCH_PERIOD_MIN}分前
			const sinceDate = new Date(untilDate.getTime() - env.SEARCH_PERIOD_MIN * 60 * 1000);
			const since = sinceDate.toISOString().replace(/\.\d{3}Z$/, '.000Z');
			const until = untilDate.toISOString().replace(/\.\d{3}Z$/, '.999Z');

			const apires = await agent.app.bsky.feed.searchPosts({
				q: env.SEARCH_QUERY,
				since: since,
				until: until,
				sort: 'top',
				limit: 100, // 【TODO】100件超えたら正しく動かなくなるのでWARNING出したい
			});
			(apires.data.posts as Post[]).forEach((post) => {
				// postの中身からauthor.handle, author.displayName, record.createdAtをコンソールに出力
				const displayName = post.author.displayName ?? '';
				console.log(`handle: ${post.author.handle}, displayName: ${displayName}, createdAt: ${post.record.createdAt}`);
				const unixTime = new Date(post.record.createdAt).getTime();
				// handleをキーにしてポスト日時をKVに保存
				env.KV.put(post.author.handle, unixTime.toString());
			});
			// 【動作確認用】KVに保存したデータ（UNIX時間）を取得、日時に変換してコンソールに出力
			const date = new Date(Number(await env.KV.get('project-grimoire.dev')));
			console.log(`project-grimoire.dev: ${date.toISOString()}`);
		} else if (event.cron === '0 3 * * *') {
			// 毎日3時にランキングを集計してDBに保存
			console.log('Daily ranking aggregation start.');
			// KVから全てのキーを取得
			const keys = await env.KV.list();
			// keysのキー名を使ってD1のrankingテーブルを検索
			const handleList = keys.keys.map((key) => key.name);
			let result;
			if (handleList.length > 0) {
				result = await env.DB.prepare(`SELECT bsky_handle FROM ranking WHERE bsky_handle IN (${handleList.map(() => '?').join(',')})`)
					.bind(...handleList)
					.all();
			} else {
				result = { results: [] };
			}
			// resultに含まれない項目をINSERTするためのキーを抽出
			const existingHandles = new Set(result.results.map((row) => row.bsky_handle));
			// resultに含まれない項目を抽出
			const newKeys = keys.keys.filter((key) => !existingHandles.has(key.name));

			// resultに含まれない項目をINSERT
			const insertPromises = newKeys.map(async (key) => {
				const value = await env.KV.get(key.name);
				if (value) {
					const unixTime = Number(value);
					const date = new Date(unixTime);
					// console.log(key.name, unixTime);
					const formattedDate = date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
					// BlueskyのAPIを叩いてdid, display_name, icon_urlを取得する
					const profile = await agent.app.bsky.actor.getProfile({ actor: key.name });

					// INSERT文を実行
					await env.DB.prepare(
						'INSERT INTO ranking (bsky_did, bsky_handle, bsky_display_name, bsky_icon_url, score, score_accumulated, last_updated_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
					)
						.bind(
							profile.data.did,
							key.name, // bsky_handle
							profile.data.displayName,
							profile.data.avatar,
							1, // スコアは1で初期化
							formattedDate // last_updated_at
						)
						// .bind(key.name, 0, formattedDate) // スコアは0で初期化
						.run();
				}
			});
			await Promise.all(insertPromises);

			// 【TODO】resultに含まれる項目のスコア更新
		}
	},
} satisfies ExportedHandler<Env>;
