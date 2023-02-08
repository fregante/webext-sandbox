import pMemoize from 'p-memoize';
import injectIframe, {hiddenIframeStyle} from './inject-iframe.js';
import postMessage, {type PostMessageInfo} from './post-message.js';

type SandboxOptions = {
	url?: string;
};

export default class Sandbox {
	options: SandboxOptions;

	// Uses pMemoize to allow retries after a failure
	load = pMemoize(async (): Promise<Window> => {
		const iframe = await injectIframe(
			chrome.runtime.getURL('sandbox.html'),
			hiddenIframeStyle,
		);
		return iframe.contentWindow!;
	});

	constructor(options: SandboxOptions = {}) {
		this.options = {
			url: chrome.runtime.getURL('sandbox.html'),
			...options,
		};
	}

	async postMessage(info: Exclude<PostMessageInfo, 'recipient'>) {
		return postMessage({...info, recipient: await this.load()});
	}
}
