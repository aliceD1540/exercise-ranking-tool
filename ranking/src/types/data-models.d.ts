export type Post = {
	uri: string;
	cid: string;
	author: {
		did: string;
		handle: string;
		displayName: string;
		avatar: string;
		labels: any[];
		createdAt: string;
	};
	record: {
		$type: string;
		createdAt: string;
		embed?: any;
		facets?: any[];
		langs?: string[];
		text: string;
	};
	embed?: any;
	replyCount: number;
	repostCount: number;
	likeCount: number;
	quoteCount: number;
	indexedAt: string;
	labels: any[];
};
