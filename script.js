const video = document.getElementById('video');
const videoSrc = 'http://localhost:8000/master.m3u8';

// UI Elements
const currentQualitySpan = document.getElementById('currentQuality');
const bandwidthSpan = document.getElementById('bandwidth');
const bufferHealthSpan = document.getElementById('bufferHealth');

let hls;

// Bandwidth thresholds (in bits per second)
const QUALITY_THRESHOLDS = {
  '720p': 2500000,  // 2.5 Mbps
  '540p': 1200000,  // 1.2 Mbps
  '360p': 600000    // 600 Kbps
};

function initializePlayer() {
  if (Hls.isSupported()) {
    hls = new Hls({
      // Configure HLS.js for better bandwidth detection
      abrEwmaDefaultEstimate: 1000000, // Initial bandwidth estimate (1 Mbps)
      abrEwmaSlowVoD: 3,              // Slow response for VoD
      abrEwmaFastVoD: 3,              // Fast response for VoD
      abrMaxWithRealBitrate: false,    // Use estimated bitrate
      maxBufferLength: 30,             // Max buffer length in seconds
      maxMaxBufferLength: 600,         // Absolute max buffer
    });

    hls.loadSource(videoSrc);
    hls.attachMedia(video);

    // Event listeners
    hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
    hls.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
    hls.on(Hls.Events.ERROR, onError);
    
    // Monitor bandwidth and buffer
    setInterval(updateStats, 1000);
    
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
    currentQualitySpan.textContent = 'Native HLS (Safari)';
  } else {
    alert('Your browser does not support HLS.');
  }
}

function onManifestParsed(event, data) {
  console.log('Available levels:', data.levels);
  // Let HLS.js handle automatic quality selection
}

function onLevelSwitched(event, data) {
  const level = hls.levels[data.level];
  if (level) {
    currentQualitySpan.textContent = `${level.height}p (${Math.round(level.bitrate / 1000)} kbps)`;
  }
}

function onError(event, data) {
  console.error('HLS Error:', data);
  if (data.fatal) {
    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        console.log('Network error, trying to recover...');
        hls.startLoad();
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        console.log('Media error, trying to recover...');
        hls.recoverMediaError();
        break;
      default:
        console.log('Fatal error, destroying HLS instance');
        hls.destroy();
        break;
    }
  }
}

function updateStats() {
  if (hls) {
    // Update bandwidth display
    const bandwidth = hls.bandwidthEstimate;
    if (bandwidth) {
      bandwidthSpan.textContent = `${Math.round(bandwidth / 1000)} kbps`;
    }

    // Update buffer health
    const buffered = video.buffered;
    if (buffered.length > 0) {
      const bufferEnd = buffered.end(buffered.length - 1);
      const currentTime = video.currentTime;
      const bufferHealth = Math.max(0, bufferEnd - currentTime);
      bufferHealthSpan.textContent = `${bufferHealth.toFixed(1)}s`;
    }
  }
}

// Initialize player when page loads
initializePlayer();