/** Wrap the element in a shadow and return the shadow container, which can then attach to your document */
export default function shadowWrap(element: HTMLElement): HTMLElement {
	const wrapper = document.createElement('div');
	const root = wrapper.attachShadow({mode: 'closed'});
	root.append(element);
	return wrapper;
}
