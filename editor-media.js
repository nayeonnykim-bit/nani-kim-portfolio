/* Local, dependency-free media processing. Originals are never uploaded to a server. */
(() => {
  'use strict';
  const MB = 1024 * 1024;
  const profiles = {
    small: { edge: 1440, quality: .66, target: 300 * 1024, video: 960, bitrate: 1000000 },
    balanced: { edge: 1920, quality: .78, target: 600 * 1024, video: 1280, bitrate: 1800000 },
    detail: { edge: 2560, quality: .88, target: MB, video: 1920, bitrate: 3500000 }
  };
  const abortError = () => new DOMException('Upload cancelled. Your page was not changed.', 'AbortError');
  const check = signal => { if (signal?.aborted) throw abortError(); };
  const bytes = n => !n ? '0 KB' : n >= MB ? `${(n / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
  const event = (target, name, signal, timeout = 20000) => new Promise((resolve, reject) => {
    const finish = error => { clearTimeout(timer); target.removeEventListener(name, success); target.removeEventListener('error', failure); signal?.removeEventListener('abort', cancel); error ? reject(error) : resolve(); };
    const success = () => finish();
    const failure = () => finish(new Error('This media could not be decoded. Try a browser-compatible PNG, JPEG, WebP, MP4, or WebM.'));
    const cancel = () => finish(abortError());
    const timer = setTimeout(() => finish(new Error('Media decoding timed out. Try a smaller file.')), timeout);
    target.addEventListener(name, success, { once: true }); target.addEventListener('error', failure, { once: true }); signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
  });
  const canvasBlob = (canvas, quality) => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The browser could not encode this image.')), 'image/webp', quality));
  const extension = type => ({ 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav' })[type.split(';')[0]] || 'bin';
  const identify = async file => {
    const b = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    const text = new TextDecoder().decode(b);
    if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
    if (b[0] === 0x89 && text.slice(1, 4) === 'PNG') return 'image/png';
    if (text.startsWith('GIF8')) return 'image/gif';
    if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') return 'image/webp';
    if (text.slice(4, 8) === 'ftyp') {
      if (/avif|avis/.test(text.slice(8, 40))) return 'image/avif';
      if (/heic|heix|hevc|hevx|heim|heis|mif1/.test(text.slice(8, 40))) throw new Error('Export HEIC/HEIF as JPEG, PNG, or WebP before importing.');
      return file.type === 'audio/mp4' ? 'audio/mp4' : /quicktime/.test(file.type) ? 'video/quicktime' : 'video/mp4';
    }
    if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm';
    if (text.startsWith('ID3') || b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return 'audio/mpeg';
    if (text.startsWith('OggS')) return 'audio/ogg';
    if (text.startsWith('RIFF') && text.slice(8, 12) === 'WAVE') return 'audio/wav';
    throw new Error('Unsupported file. Use JPEG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV, MP3, OGG, or WAV. Export SVG/HEIC to a web image first.');
  };
  async function image(file, type, profile, signal, progress) {
    if (file.size > 32 * MB) throw new Error('Image limit: 32 MB. Resize this original before importing.');
    // Never flatten an animated file into a single frame without the user's consent.
    const header = new TextDecoder('latin1').decode(await file.slice(0, MB).arrayBuffer());
    if (type === 'image/gif' || type === 'image/png' && header.includes('acTL') || type === 'image/webp' && header.includes('ANIM') || type === 'image/avif' && header.slice(8, 64).includes('avis')) {
      if (file.size > 8 * MB) throw new Error('Animated images must be under 8 MB. Export a short MP4/WebM for better performance.');
      return { blob: file.slice(0, file.size, type), warning: 'Animation preserved; not recompressed. A short video usually uses less bandwidth.' };
    }
    const url = URL.createObjectURL(file), img = new Image();
    let canvas;
    try {
      const ready = event(img, 'load', signal); img.src = url; await ready; check(signal);
      if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 64000000) throw new Error('Image exceeds the 64-megapixel safety limit. Resize the original first.');
      const ratio = Math.min(1, profile.edge / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.max(1, Math.round(img.naturalWidth * ratio)), height = Math.max(1, Math.round(img.naturalHeight * ratio));
      canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Image processing is unavailable in this browser.');
      context.drawImage(img, 0, 0, width, height); progress(.4, 'Compressing image…');
      let quality = profile.quality, blob = await canvasBlob(canvas, quality);
      while (blob.size > profile.target && quality > .46) { check(signal); quality -= .1; const candidate = await canvasBlob(canvas, quality); if (candidate.size < blob.size) blob = candidate; }
      check(signal);
      // Preserve the original if re-encoding increases its file size. No upscaling.
      const smaller = blob.size < file.size;
      return { blob: smaller ? blob : file.slice(0, file.size, type), width: smaller ? width : img.naturalWidth, height: smaller ? height : img.naturalHeight, warning: smaller ? '' : 'Original was already smaller; kept without quality loss.' };
    } finally { URL.revokeObjectURL(url); img.src = ''; if (canvas) { canvas.width = 1; canvas.height = 1; } }
  }
  async function video(file, type, profile, signal, progress) {
    if (file.size > 100 * MB) throw new Error('Video limit: 100 MB. Export a smaller MP4 or use a hosted video URL for long films.');
    const video = document.createElement('video'); video.preload = 'metadata'; video.muted = true; video.playsInline = true;
    const url = URL.createObjectURL(file); let canvas, stream, audioContext, recorder, timer, frame, watchdog;
    try {
      const ready = event(video, 'loadedmetadata', signal); video.src = url; await ready; check(signal);
      if (!Number.isFinite(video.duration) || !video.videoWidth || video.videoWidth * video.videoHeight > 34000000) throw new Error('This video cannot be processed safely. Use a standard MP4/WebM up to 8K.');
      const candidates = ['video/mp4;codecs=avc1.42001E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const codec = typeof MediaRecorder !== 'undefined' && candidates.find(mime => MediaRecorder.isTypeSupported(mime));
      if (!codec || !HTMLCanvasElement.prototype.captureStream) throw new Error('Video compression is not supported here. Try Chrome/Edge, or import a pre-compressed MP4. No file was inserted.');
      if (video.duration > 120) throw new Error('Automatic video compression supports clips up to 2 minutes. Use a hosted video URL or a pre-compressed short clip.');
      if (document.hidden) throw new Error('Keep this tab visible during video compression, then try again.');
      const ratio = Math.min(1, profile.video / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(2, Math.round(video.videoWidth * ratio / 2) * 2), height = Math.max(2, Math.round(video.videoHeight * ratio / 2) * 2);
      canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false }); if (!context) throw new Error('Video canvas unavailable.');
      stream = canvas.captureStream(24);
      // Route audio into the recording, not the speakers. Do not silently strip sound.
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Audio-preserving compression is unavailable. Use a pre-compressed MP4.');
      audioContext = new Audio();
      await Promise.race([audioContext.resume(), new Promise((_, reject) => setTimeout(() => reject(new Error('Click Upload again to allow audio processing.')), 4000))]);
      if (audioContext.state !== 'running') throw new Error('Allow audio processing and try again.');
      const source = audioContext.createMediaElementSource(video), destination = audioContext.createMediaStreamDestination(); source.connect(destination);
      // Muting the source element also mutes its captured audio in Chromium.
      // It is safe to unmute here: this graph is connected only to the recorder,
      // never to audioContext.destination (the speakers).
      video.muted = false;
      destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
      const chunks = []; let recordedBytes = 0;
      recorder = new MediaRecorder(stream, { mimeType: codec, videoBitsPerSecond: profile.bitrate, audioBitsPerSecond: 96000 });
      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = error => { if (settled) return; settled = true; clearInterval(timer); clearTimeout(watchdog); signal?.removeEventListener('abort', cancel); document.removeEventListener('visibilitychange', visibility); error ? reject(error) : resolve(); };
        const cancel = () => finish(abortError());
        const visibility = () => { if (document.hidden) finish(new Error('Video compression paused because the tab was hidden. Keep the tab visible and retry.')); };
        signal?.addEventListener('abort', cancel, { once: true }); document.addEventListener('visibilitychange', visibility);
        recorder.ondataavailable = e => { if (e.data.size) { chunks.push(e.data); recordedBytes += e.data.size; if (recordedBytes > 64 * MB) finish(new Error('Compressed output is too large. Use a shorter clip or hosted URL.')); } };
        recorder.onerror = () => finish(new Error('Video encoder failed. Try a smaller MP4 or a different browser.'));
        recorder.onstop = () => finish(); video.onended = () => { if (recorder.state !== 'inactive') recorder.stop(); };
        const draw = () => { if (settled) return; context.drawImage(video, 0, 0, width, height); frame = requestAnimationFrame(draw); };
        recorder.start(1000); video.play().then(draw).catch(() => finish(new Error('Video playback was blocked. Click Upload again.')));
        timer = setInterval(() => progress(Math.min(.96, video.currentTime / video.duration), `Compressing video ${Math.round(video.currentTime)} / ${Math.ceil(video.duration)}s — keep this tab visible`), 300);
        watchdog = setTimeout(() => finish(new Error('Video processing timed out. Try a shorter clip.')), (video.duration + 25) * 1000);
        if (signal?.aborted) cancel();
      });
      check(signal);
      const blob = new Blob(chunks, { type: recorder.mimeType.split(';')[0] });
      if (!blob.size) throw new Error('The video encoder returned an empty file.');
      const compatibleOriginal = ['video/mp4', 'video/webm'].includes(type);
      const smaller = blob.size < file.size || !compatibleOriginal;
      return { blob: smaller ? blob : file.slice(0, file.size, type), width: smaller ? width : video.videoWidth, height: smaller ? height : video.videoHeight, duration: video.duration, warning: smaller ? '' : 'Original was already smaller; kept without re-encoding.' };
    } finally {
      clearInterval(timer); clearTimeout(watchdog); cancelAnimationFrame(frame);
      video.pause(); video.onended = null;
      if (recorder?.state !== 'inactive' && recorder) recorder.stop();
      stream?.getTracks().forEach(track => track.stop());
      if (audioContext && audioContext.state !== 'closed') await audioContext.close().catch(() => {});
      video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url);
      if (canvas) { canvas.width = 1; canvas.height = 1; }
    }
  }
  async function optimize(file, preset = 'balanced', signal, progress = () => {}) {
    if (!file?.size) throw new Error('This file is empty.');
    check(signal); progress(.02, 'Checking media…');
    const type = await identify(file), profile = profiles[preset] || profiles.balanced;
    let result;
    if (preset === 'original') {
      const limit = type.startsWith('image/') ? 32 : type.startsWith('audio/') ? 12 : 100;
      if (file.size > limit * MB) throw new Error(`Original file exceeds the ${limit} MB safety limit. Use a smaller file or a hosted media URL.`);
      result = { blob: file.slice(0, file.size, type), warning: 'Original kept by your choice; no compression applied. Check its size before publishing.' };
    }
    else if (type.startsWith('image/')) result = await image(file, type, profile, signal, progress);
    else if (type.startsWith('video/')) result = await video(file, type, profile, signal, progress);
    else { if (file.size > 12 * MB) throw new Error('Audio must be under 12 MB. Export MP3/AAC before uploading.'); result = { blob: file.slice(0, file.size, type), warning: 'Audio preserved as supplied. Export MP3/AAC for smaller files.' }; }
    check(signal);
    return { ...result, name: file.name, originalSize: file.size, size: result.blob.size, kind: result.blob.type.split('/')[0], type: result.blob.type, ext: extension(result.blob.type), savedAt: new Date().toISOString() };
  }
  // Store compressed binary once; undo snapshots contain only asset references.
  const connections = new Map();
  function openDB(store) {
    const name = store === 'assets' ? 'nani-portfolio-media' : 'nani-portfolio-editor';
    if (connections.has(name)) return connections.get(name);
    const promise = new Promise((resolve, reject) => {
      // Opening the existing version avoids an upgrade blocked by older editor tabs.
      // Binary media uses a separate database; old drafts keep their original store.
      const request = indexedDB.open(name);
      request.onupgradeneeded = () => { const table = store === 'assets' ? 'assets' : 'drafts'; if (!request.result.objectStoreNames.contains(table)) request.result.createObjectStore(table); };
      request.onerror = () => { connections.delete(name); reject(request.error); };
      request.onblocked = () => { connections.delete(name); reject(new Error('Another tab is changing local storage. Close that editor tab and retry.')); };
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); connections.delete(name); }; resolve(db); };
    });
    connections.set(name, promise); return promise;
  }
  async function transaction(store, mode, action, legacy = false) {
    const db = await openDB(legacy ? 'drafts' : store);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode); let value;
      const request = action(tx.objectStore(store));
      request.onsuccess = () => { value = request.result; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () => reject(tx.error || request.error || new Error('Local storage transaction failed.'));
    });
  }
  const storage = {
    async get(store, key) {
      const result = await transaction(store, 'readonly', s => s.get(key));
      if (result !== undefined || store !== 'assets') return result;
      const legacy = await openDB('drafts');
      return legacy.objectStoreNames.contains('assets') ? transaction('assets', 'readonly', s => s.get(key), true) : undefined;
    },
    put: (store, key, value) => transaction(store, 'readwrite', s => s.put(value, key)),
    delete: (store, key) => transaction(store, 'readwrite', s => s.delete(key)),
    async all(store) {
      const current = await transaction(store, 'readonly', s => s.getAll());
      if (store !== 'assets') return current;
      const legacy = await openDB('drafts');
      const previous = legacy.objectStoreNames.contains('assets') ? await transaction('assets', 'readonly', s => s.getAll(), true) : [];
      return [...new Map([...previous, ...current].map(asset => [asset.id, asset])).values()];
    },
    keys: store => store === 'assets' ? storage.all(store).then(list => list.map(asset => asset.id)) : transaction(store, 'readonly', s => s.getAllKeys())
  };
  // A store-only ZIP writer: media is already compressed, so no extra library or WASM download.
  const crcTable = Uint32Array.from({ length: 256 }, (_, value) => { let n = value; for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1; return n >>> 0; });
  const crc32 = data => { let crc = -1; for (const b of data) crc = crcTable[(crc ^ b) & 255] ^ crc >>> 8; return (crc ^ -1) >>> 0; };
  async function zip(files) {
    const chunks = [], directory = []; let offset = 0, directorySize = 0;
    for (const file of files) {
      const name = new TextEncoder().encode(file.name), data = new Uint8Array(await file.blob.arrayBuffer()), crc = crc32(data);
      const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true); lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true); local.set(name, 30);
      const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
      chunks.push(local, data); directory.push(central); offset += local.length + data.length; directorySize += central.length;
    }
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
    return new Blob([...chunks, ...directory, end], { type: 'application/zip' });
  }
  window.PortfolioMedia = { optimize, storage, bytes, zip, extension, maxUpload: 100 * MB };
})();
