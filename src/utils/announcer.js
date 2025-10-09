// Simple announcer utility that uses the browser SpeechSynthesis API.
// Exports a function that speaks a message a given number of times with a short gap.

function speakOnce(text, { lang = 'en-US', rate = 1, pitch = 1 } = {}) {
	if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve();

	return new Promise((resolve) => {
		const utter = new SpeechSynthesisUtterance(text);
		utter.lang = lang;
		utter.rate = rate;
		utter.pitch = pitch;
		utter.onend = () => resolve();
		utter.onerror = () => resolve();
		window.speechSynthesis.speak(utter);
	});
}

// Announce text `times` times in sequence. Returns a promise that resolves
// after all repeats finish.
export default async function announceTimes(text, times = 3, opts = {}) {
	if (typeof window === 'undefined' || !window.speechSynthesis) return;

	// Cancel any ongoing speech so announcements are predictable.
	try {
		window.speechSynthesis.cancel();
	} catch (e) {
		// ignore
	}

	// Small delay between repeats to make it easier to hear.
	for (let i = 0; i < Math.max(1, times); i++) {
		// If cancelled externally, break early.
		if (!window.speechSynthesis) break;
		// use await to ensure sequential playback
		// prepend a short pause on repeats for clarity
		if (i > 0) await new Promise(r => setTimeout(r, 300));
		// speak the message once
		// await speakOnce(`${text}`, opts);
		// Speak a short preface for accessibility (optional). Keep it concise.
		await speakOnce(text, opts);
	}
}
