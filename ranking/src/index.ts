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
			const pathname = new URL(request.url).pathname;
			if (pathname === '/ranking') {
				// ランキング情報を返す
				const result = await env.DB.prepare(
					`SELECT bsky_handle, bsky_display_name, bsky_icon_url, score, score_accumulated, last_updated_at FROM ranking ORDER BY score DESC LIMIT 100`
				).all();
				const ranking = [];
				let prevScore = 0;
				let prevRank = 0;
				let count = 0;
				let displayRank = 1; // 表示用のrank
				for (const row of result.results) {
					count++;
					if (prevScore === null || row.score !== prevScore) {
						displayRank = prevRank + 1;
						prevScore = Number(row.score);
					}
					ranking.push({
						rank: displayRank,
						name: row.bsky_display_name,
						account: row.bsky_handle,
						score: Number(row.score),
						score_accumulated: Number(row.score_accumulated),
						icon_url: row.bsky_icon_url,
					});
					prevRank = displayRank;
				}
				const json = { ranking };
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
				const account = request.url.split('/').pop();
				const result = await env.DB.prepare(
					`SELECT bsky_handle, bsky_display_name, bsky_icon_url, score, score_accumulated, last_updated_at FROM ranking WHERE bsky_handle = ?`
				)
					.bind(account)
					.first();
				// 指定アカウントのスコアが何番目に高いものかを取得
				const rankResult = await env.DB.prepare(
					`SELECT rank FROM (SELECT ROW_NUMBER() OVER (ORDER BY score DESC) AS rank, score FROM ranking GROUP BY score) WHERE score = (SELECT score FROM ranking WHERE bsky_handle = ? LIMIT 1)`
				)
					.bind(account)
					.first();
				if (!result) {
					return new Response('Not Found', {
						status: 404,
					});
				}
				// rankResultを順位としてresultに追加
				result['rank'] = rankResult ? rankResult.rank : null;
				return new Response(JSON.stringify(result), {
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
				console.log(
					`handle: ${post.author.handle}, displayName: ${displayName}, did: ${post.author.did}, createdAt: ${post.record.createdAt}`
				);
				const unixTime = new Date(post.record.createdAt).getTime();
				// didをキーにしてポスト日時をKVに保存
				env.KV.put(post.author.did, unixTime.toString());
			});
			// 【動作確認用】KVに保存したデータ（UNIX時間）を取得、日時に変換してコンソールに出力
			// const date = new Date(Number(await env.KV.get('project-grimoire.dev')));
			// console.log(`project-grimoire.dev: ${date.toISOString()}`);
		} else if (event.cron === '0 18 * * *') {
			// 毎日18時(日本時間で3時)にランキングを集計してDBに保存
			console.log('Daily ranking aggregation start.');
			// KVから全てのキーを取得
			const keys = await env.KV.list();
			// keysのキー名を使ってD1のrankingテーブルを検索
			const handleList = keys.keys.map((key) => key.name).filter(Boolean);
			console.log(`handleList: ${JSON.stringify(handleList)}`);
			let result;
			if (handleList.length > 0) {
				result = await env.DB.prepare(`SELECT bsky_did FROM ranking WHERE bsky_did IN (${handleList.map(() => '?').join(',')})`)
					.bind(...handleList)
					.all();
			} else {
				result = { results: [] };
			}
			console.log(`result: ${JSON.stringify(result)}`);
			// resultに含まれない項目をINSERTするためのキーを抽出
			const existingHandles = new Set(result.results.map((row) => row.bsky_did));
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
					// BlueskyのAPIを叩いてhandle, display_name, icon_urlを取得する
					const profile = await agent.app.bsky.actor.getProfile({ actor: key.name });

					// INSERT文を実行
					await env.DB.prepare(
						'INSERT INTO ranking (bsky_did, bsky_handle, bsky_display_name, bsky_icon_url, score, score_accumulated, last_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
					)
						.bind(
							key.name ?? '',
							profile.data.handle ?? '', // bsky_handle
							profile.data.displayName ?? '',
							profile.data.avatar ?? '',
							1, // スコアは1で初期化
							1, // スコア累積は1で初期化
							formattedDate // last_updated_at
						)
						.run();
				}
			});
			await Promise.all(insertPromises);

			// resultでループして含まれる項目のスコア更新
			const updatePromises = result.results.map(async (row) => {
				const did = String(row.bsky_did);
				const value = await env.KV.get(did);
				// valueはUNIX時間の文字列、24時間以内に更新されたもののみスコアを更新
				if (value && new Date(Number(value)) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
					const unixTime = Number(value);
					const date = new Date(unixTime);
					const formattedDate = date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
					// BlueskyのAPIを叩いてhandle, display_name, icon_urlを取得する
					const profile = await agent.app.bsky.actor.getProfile({ actor: did });
					// スコアを1増やして、スコア累積も1増やす
					// ついでにhandle,display_name,icon_urlも最新化
					await env.DB.prepare(
						'UPDATE ranking SET score = score + 1, score_accumulated = score_accumulated + 1, last_updated_at = ?, bsky_handle = ?, bsky_display_name = ?, bsky_icon_url = ? WHERE bsky_did = ?'
					)
						.bind(formattedDate, profile.data.handle ?? '', profile.data.displayName ?? '', profile.data.avatar ?? '', did)
						.run();
				}
				// 48時間以上更新されていない場合はスコアを-1（マイナスにはならない）、スコア累積はそのまま
				else if (value && new Date(Number(value)) < new Date(Date.now() - 48 * 60 * 60 * 1000)) {
					const unixTime = Number(value);
					const date = new Date(unixTime);
					const formattedDate = date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
					await env.DB.prepare('UPDATE ranking SET score = MAX(score - 1, 0), last_updated_at = ? WHERE bsky_did = ?')
						.bind(formattedDate, did)
						.run();
				}
			});
			await Promise.all(updatePromises);
		}
	},
} satisfies ExportedHandler<Env>;
