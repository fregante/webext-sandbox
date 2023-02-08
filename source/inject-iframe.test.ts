import injectIframe from './inject-iframe.js';

describe('injectIframe', () => {
	test('load simple iframe', async () => {
		const iframe = await injectIframe('data:text/html,<html>Good soup', {});
		expect(
			iframe.contentDocument!.documentElement.outerHTML,
		).toMatchInlineSnapshot(
			'"<html><head></head><body>Good soup</body></html>"',
		);
	});
});
