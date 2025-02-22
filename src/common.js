export function customEncodeURIComponent(str) {
	return str.replace(/ /g, '_').replace(
		/[^/_\w():&"'\.,!\+\-]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
	);
}
