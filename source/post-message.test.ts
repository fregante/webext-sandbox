/**
 * @jest-environment-options {"resources": "usable", "runScripts": "dangerously"}
 */

import polyfill from 'node:worker_threads';
import {serializeError} from 'serialize-error';
import {sleep} from './utils.js';
import postMessage, {
	addPostMessageListener,
	type RequestPacket,
} from './post-message.js';

(global as any).MessageChannel = polyfill.MessageChannel;
(global as any).MessagePort = polyfill.MessagePort;

afterEach(jest.restoreAllMocks);

describe('postMessage', () => {
	test('post message and receive answer', async () => {
		const channel = {
			postMessage(message: unknown, _: string, [port]: MessagePort[]): void {
				expect(message).toStrictEqual({
					type: 'SANDBOX_PING',
					payload: undefined,
				});
				expect(port).toBeInstanceOf(MessagePort);
				port!.postMessage({response: 'pong'});
			},
		};

		await expect(
			postMessage({
				type: 'SANDBOX_PING',
				recipient: channel as Window,
			}),
		).resolves.toBe('pong');
	});

	test('post message and receive error', async () => {
		const channel = {
			postMessage(_: unknown, __: string, [port]: MessagePort[]): void {
				port!.postMessage({
					error: serializeError(new Error('No balls found')),
				});
			},
		};

		await expect(
			postMessage({
				type: 'SANDBOX_PING',
				recipient: channel as Window,
			}),
		).rejects.toMatchInlineSnapshot('[Error: No balls found]');
	});
});

describe('addPostMessageListener', () => {
	// TODO: Skip due to lack of jsdom support for Transfer
	//   https://github.com/jsdom/jsdom/issues/3287
	//   For this reason, we have to mock the whole native postMessage API
	test.skip('handle received packet (real API)', async () => {
		const controller = new AbortController();
		const {signal} = controller;

		const callback = jest.fn();
		const packet: RequestPacket = {type: 'SANDBOX_PING', payload: 'ball'};
		const privateChannel = new MessageChannel();
		addPostMessageListener('SANDBOX_PING', callback, {signal});
		window.postMessage(packet, '*', [privateChannel.port2]);

		await sleep(100);
		expect(callback).toHaveBeenCalledWith('ball');

		// Cleanup listener
		controller.abort();
	});

	test('handle received packet (mocked API)', async () => {
		const callback = jest.fn();
		const packet: RequestPacket = {type: 'SANDBOX_PING', payload: 'ball'};

		const privateChannel = new MessageChannel();
		jest
			.spyOn(window, 'addEventListener')
			.mockImplementation((type, listener: EventListenerOrEventListenerObject) => {
				if (type === 'message') {
					(listener as EventListener)(
						new MessageEvent('message', {
							data: packet,
							ports: [privateChannel.port2],
						}),
					);
				}
			});
		addPostMessageListener('SANDBOX_PING', callback);

		// Implied by `addEventListener`’s mock
		// window.postMessage(packet, "*", [privateChannel.port2]);

		await sleep(100);
		expect(callback).toHaveBeenCalledWith('ball');
	});

	test('ignores unrelated packets', async () => {
		const controller = new AbortController();
		const {signal} = controller;

		const callback = jest.fn();
		const packet: RequestPacket = {type: 'SANDBOX_CASTLE', payload: 1583};
		addPostMessageListener('SANDBOX_PING', callback, {signal});
		window.postMessage(packet, '*');

		await sleep(100);
		expect(callback).not.toHaveBeenCalled();

		// Cleanup listener
		controller.abort();
	});

	test('ignores unrelated messages', async () => {
		const controller = new AbortController();
		const {signal} = controller;

		const callback = jest.fn();
		addPostMessageListener('SANDBOX_PING', callback, {signal});
		window.postMessage('Give me all you got', '*');

		await sleep(100);
		expect(callback).not.toHaveBeenCalled();

		// Cleanup listener
		controller.abort();
	});
});
