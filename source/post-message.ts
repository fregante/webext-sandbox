/**
 * @file and security
 * 1. The content script generates an iframe with a local document.
 * 2. postMessage only works with `"*"` in this direction
 *    https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#using_window.postmessage_in_extensions_non-standard
 * 3. The iframe is safe because it's local and wrapped in a Shadow DOM,
 *    thus inaccessible/not-alterable by the host website.
 * 4. Each content script message includes a private channel port that the
 *    iframe can use to respond exclusively to the content script.
 * 5. The channel is closed immediately after the response.
 *
 * Prior art: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/IPJSfjNSgh8/m/Dh35-tZPAgAJ
 * Relevant discussion: https://github.com/w3c/webextensions/issues/78
 */

import pTimeout from 'p-timeout';
import {deserializeError, serializeError, type ErrorObject} from 'serialize-error';
import {type JsonValue} from 'type-fest';

const timeout = 3000;

type Payload = JsonValue | undefined;

const debug = (process.env as any).WEBEXT_MESSENGER_LOGGING === 'true' ? console.debug.bind(console, 'SANDBOX:') : () => {};

export type RequestPacket = {
	type: string;
	payload: Payload;
};

type ResponsePacket = {response: Payload} | {error: ErrorObject};

export type PostMessageInfo = {
	type: string;
	payload?: Payload;
	recipient: Window;
};

type PostMessageListener = (payload: Payload) => Promise<Payload>;

/** Use the postMessage API but expect a response from the target */
export default async function postMessage({
	type,
	payload,
	recipient,
}: PostMessageInfo): Promise<Payload> {
	const promise = new Promise<Payload>((resolve, reject) => {
		const privateChannel = new MessageChannel();
		privateChannel.port1.start(); // Mandatory to start receiving messages
		privateChannel.port1.addEventListener(
			'message',
			({data}: MessageEvent<ResponsePacket>): void => {
				if ('error' in data) {
					reject(deserializeError(data.error));
				} else {
					resolve(data.response);
				}
			},
			{once: true},
		);

		debug(type, 'Posting payload:', payload);

		const packet: RequestPacket = {
			type,
			payload,
		};
		// The origin must be "*". See note in @file
		recipient.postMessage(packet, '*', [privateChannel.port2]);
	});

	return pTimeout(promise, {
		milliseconds: timeout,
		message: `Message ${type} did not receive a response within ${
			timeout / 1000
		} seconds`,
	});
}

export function addPostMessageListener(
	type: string,
	listener: PostMessageListener,
	{signal}: {signal?: AbortSignal} = {},
): void {
	const rawListener = async ({
		data,
		ports: [source],
	}: MessageEvent<RequestPacket>): Promise<void> => {
		if (data?.type !== type) {
			return;
		}

		try {
			debug(type, 'Received payload:', data.payload);
			const response = await listener(data.payload);

			debug(type, 'Responding with', response);
			source!.postMessage({response} satisfies ResponsePacket);
		} catch (error) {
			debug(type, 'Throwing', error);
			source!.postMessage({
				error: serializeError(error),
			} satisfies ResponsePacket);
		}
	};

	window.addEventListener('message', rawListener, {signal});
}
