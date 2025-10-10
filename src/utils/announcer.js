// Simple announcer utility that uses the browser SpeechSynthesis API.
// Exports helpers to unlock speech, check availability, and speak a message multiple times.

let voicesReadyPromise;
function waitForVoices(timeoutMs = 2000) {
	if (typeof window === 'undefined' || !window.speechSynthesis) {
		return Promise.resolve();
	}
	if (voicesReadyPromise) return voicesReadyPromise;
	voicesReadyPromise = new Promise((resolve) => {
		const voices = window.speechSynthesis.getVoices();
		if (voices && voices.length > 0) return resolve();
		const onVoices = () => {
			window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
			resolve();
		};
		window.speechSynthesis.addEventListener('voiceschanged', onVoices);
		// Fallback timeout
		setTimeout(() => {
			try { window.speechSynthesis.removeEventListener('voiceschanged', onVoices); } catch {}
			resolve();
		}, timeoutMs);
	});
	return voicesReadyPromise;
}

export function isSpeechAvailable() {
	return typeof window !== 'undefined' && !!window.speechSynthesis;
}

export function unlockSpeech() {
	if (!isSpeechAvailable()) return;
	try {
		window.speechSynthesis.cancel();
		window.speechSynthesis.resume();
		const u = new SpeechSynthesisUtterance('');
		u.volume = 0;
		window.speechSynthesis.speak(u);
	} catch {}
}

export async function beepFallback(durationMs = 250, frequency = 800, volume = 0.3) {
	try {
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtx) return;
		const ctx = new AudioCtx();
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = 'sine';
		o.frequency.value = frequency;
		g.gain.value = volume;
		o.connect(g);
		g.connect(ctx.destination);
		o.start();
		await new Promise(r => setTimeout(r, durationMs));
		o.stop();
		ctx.close();
	} catch {}
}

export async function speechSelfTest() {
	if (!isSpeechAvailable()) return false;
	try {
		await speakOnce('');
		return true;
	} catch {
		return false;
	}
}

async function speakOnce(text, { lang = 'en-US', rate = 1, pitch = 1, volume = 1, voiceName } = {}) {
	if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve();

	await waitForVoices();
	return new Promise((resolve) => {
		const utter = new SpeechSynthesisUtterance(text);
		utter.lang = lang;
		utter.rate = rate;
		utter.pitch = pitch;
		utter.volume = Math.min(1, Math.max(0, volume));
		try {
			if (voiceName) {
				const v = window.speechSynthesis.getVoices().find(v => v.name === voiceName);
				if (v) utter.voice = v;
			}
		} catch {}
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
		await speakOnce(text, opts);
	}
}
