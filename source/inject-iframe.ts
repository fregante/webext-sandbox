import pDefer from 'p-defer';
import pTimeout from 'p-timeout';
import shadowWrap from './shadow-wrap.js';
import {sleep} from './utils.js';

export async function waitForBody(): Promise<void> {
	while (!document.body) {
		// eslint-disable-next-line no-await-in-loop -- Polling pattern
		await sleep(20);
	}
}

const timeout = 3000;

export const hiddenIframeStyle = {
	position: 'absolute',
	bottom: '105%',
	right: '105%',
	visibility: 'hidden',
} as const satisfies Partial<CSSStyleDeclaration>;

/** Injects an iframe into the host page via ShadowDom */
async function _injectIframe(
	url: string,
	/** The style is required because you never want an unstyled iframe */
	style: Partial<CSSStyleDeclaration>,
): Promise<HTMLIFrameElement> {
	const iframe = document.createElement('iframe');
	const {promise: iframeLoad, resolve} = pDefer();
	iframe.addEventListener('load', resolve);
	iframe.src = url;
	Object.assign(iframe.style, style);

	// The body might not be available yet
	await waitForBody();
	document.body.append(shadowWrap(iframe));

	await iframeLoad;

	return iframe;
}

const injectIframe: typeof _injectIframe = async (url, style) =>
	pTimeout(_injectIframe(url, style), {
		milliseconds: timeout,
		message: `The iframe did not load within ${
			timeout / 1000
		} seconds: ${url}`,
	});

export default injectIframe;
