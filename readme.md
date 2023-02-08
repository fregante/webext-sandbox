# webext-sandbox [![][badge-gzip]][link-bundlephobia]

[badge-gzip]: https://img.shields.io/bundlephobia/minzip/webext-sandbox.svg?label=gzipped
[link-bundlephobia]: https://bundlephobia.com/result?p=webext-sandbox

> Helper to create and communicate to a sandboxed iframe in Web Extensions

## Install

You can download the [standalone bundle](https://bundle.fregante.com/?pkg=webext-sandbox) and include it in your `manifest.json`.

```sh
npm install webext-sandbox
```

```js
import 'webext-sandbox';
```

## Usage

The sandbox receiver must live in its own HTML and JS file, so create these two files:

```sh
/
|-- manifest.json
|-- sandbox.js
|-- sandbox.html
|-- contentscript.js # or any other context that requires a sandbox
```

### Manifest.json

```json
{
	"manifest_version": 3,
	"name": "Sandboxed Runner",
	"sandbox": {
		"pages": ["sandbox.html"]
	},
	"web_accessible_resources": [
		"sandbox.html"
	],
	"content_security_policy": {
		// Set the native default CSP
		// https://developer.chrome.com/docs/extensions/mv3/manifest/sandbox/
		"sandbox":
			"sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'self';"
	}
}
```

### sandbox.html

```html
<!DOCTYPE html>
<meta charset="utf-8" />
<script src="sandbox.js"></script>
```

### sandbox.js

```js
import { addPostMessageListener } from "webext-sandbox";

export default function registerMessenger(): void {
	// Example, to test it out
  addPostMessageListener("PING", async payload => "pong");

	// Add as many as needed
  addPostMessageListener("SOME_UNSAFE_CALL", yourOwnUnsafeComputation);
}
```

### contentscript.js

```js
import {Sandbox} from "webext-sandbox";

const sandbox = new Sandbox({
	// Optional
	url: chrome.runtime.getURL("sandbox.html")
});

// Called automatically later, but you can preload it this way
sandbox.load();

sandbox.postMessage({
	type: "PING",
}).then(response => {
	console.log({response}); // {response: 'pong'}
})

sandbox.postMessage({
	type: "SOME_UNSAFE_CALL",
	payload: {
		any: "serializable",
		content: [1, "is supported"]
	}
}).then(response => {
	console.log({response}); // {response: 'your response'}
})
```

## License

MIT © [Federico Brigante](https://fregante.com)
