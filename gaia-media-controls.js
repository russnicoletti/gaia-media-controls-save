/**
 * Dependencies
 */
var Component = require('gaia-component');

/*
** MediaControlsImpl object
*/
function MediaControlsImpl(mediaControlsElement, shadowRoot) {
  this.mediaControlsElement = mediaControlsElement;
  this.touchStartID = null;
  this.isPausedWhileDragging = null;
  this.dragging = false;
  this.sliderRect = null;
  this.endedTimer = null;
  this.playedUntilEnd = false;
  this.isLongPressing = false;
  this.intervalId = null;
  this.pausedAtEndWhilePlaying = false;
  this.mediaPlayer = document.getElementById(mediaControlsElement.mediaPlayerId);

  this.els = {
    durationText: shadowRoot.getElementById('duration-text'),
    elapsedText: shadowRoot.getElementById('elapsed-text'),
    elapsedTime: shadowRoot.getElementById('elapsed-time'),
    play: shadowRoot.getElementById('play'),
    playHead: shadowRoot.getElementById('playHead'),
    seekForward: shadowRoot.getElementById('seek-forward'),
    seekBackward: shadowRoot.getElementById('seek-backward'),
    sliderWrapper: shadowRoot.getElementById('slider-wrapper')
  };

  this.isDevice = (this.els.sliderWrapper.clientWidth <= 200);

  this.addEventListeners(shadowRoot);
}

MediaControlsImpl.prototype.addEventListeners = function(shadowRoot) {
  shadowRoot.addEventListener('click', this);
  shadowRoot.addEventListener('contextmenu', this);
  shadowRoot.addEventListener('touchstart', this);
  shadowRoot.addEventListener('touchend', this);
  shadowRoot.addEventListener('touchmove', this);
  shadowRoot.addEventListener('mousedown', this);
  shadowRoot.addEventListener('mouseup', this);
  shadowRoot.addEventListener('mousemove', this);
  
  this.mediaPlayer.addEventListener('loadedmetadata', this.handleMediaEvent.bind(this));
  this.mediaPlayer.addEventListener('play', this.handleMediaEvent.bind(this));
  this.mediaPlayer.addEventListener('pause', this.handleMediaEvent.bind(this));
  this.mediaPlayer.addEventListener('timeupdate', this.handleMediaEvent.bind(this));
  this.mediaPlayer.addEventListener('seeked', this.handleMediaEvent.bind(this));
  this.mediaPlayer.addEventListener('ended', this.handleMediaEvent.bind(this));
};

MediaControlsImpl.prototype.handleEvent = function(e) {

  var videoToolbar = this.els.seekForward.parentElement;

  switch(e.target) {
    case this.els.play:
      if (e.type === 'click') {
        this.handlePlayButton();
      }
    break;
    case this.els.seekForward:
      if (e.type === 'click') {
        this.handleSeekForward();
      }
    break;
    case this.els.seekBackward:
      if (e.type === 'click') {
        this.handleSeekBackward();
      }
    break;
    case videoToolbar:
      if (e.type === 'contextmenu') {
        this.handleStartLongPressing(e);
      }
      else if (e.type === 'touchend') {
        this.handleLongPressStop();
      }
    break;
    case this.els.sliderWrapper:
      switch(e.type) {
        case 'touchstart':
          this.handleSliderMoveStart(e);
          break;
        case 'mousedown':
          this.handleMouseDown(e);
          break;
        case 'touchmove':
          this.handleSliderMove(e);
          break;
        case 'mousemove':
          this.handleMouseMove(e);
          break;
        case 'touchend':
          this.handleSliderMoveEnd(e);
          break;
        case 'mouseup':
          this.handleMouseUp(e);
          break;
      }
      break;
  }
};

MediaControlsImpl.prototype.handleMediaEvent = function(e) {

  switch(e.type) {
    case 'loadedmetadata':
      this.handleLoadedMetadata();
      break;
    case 'play':
      this.handleMediaPlaying();
      break;
    case 'pause':
      this.handleMediaPaused();
      break;
    case 'timeupdate':
      this.handleMediaTimeUpdated();
      break;
    case 'seeked':
      this.handleMediaSeeked();
      break;
    case 'ended':
      this.handlePlayerEnded();
      break;
  }
};

/*
** Functions handling events.
*/

MediaControlsImpl.prototype.handleSeekForward = function() {
  this.startFastSeeking(1);
};

MediaControlsImpl.prototype.handleSeekBackward = function() {
  this.startFastSeeking(-1);
};

MediaControlsImpl.prototype.handleLongPressForward = function() {
  this.isLongPressing = true;
  this.startFastSeeking(1);
};

MediaControlsImpl.prototype.handleLongPressBackward = function() {
  this.isLongPressing = true;
  this.startFastSeeking(-1);
};

MediaControlsImpl.prototype.handleLongPressStop = function() {
  this.stopFastSeeking();
};

MediaControlsImpl.prototype.handlePlayButton = function() {
  this.mediaControlsElement.dispatchEvent(
    new CustomEvent('play-button-click'));
};

MediaControlsImpl.prototype.handleStartLongPressing = function(event) {

  if (event.target.id === this.els.seekForward.id) {
    this.handleLongPressForward();
  } else if (event.target.id === this.els.seekBackward.id) {
    this.handleLongPressBackward();
  } else {
    return;
  }
};

MediaControlsImpl.prototype.handleMediaPlaying = function() {

  this.els.play.classList.remove('paused');
  this.els.play.setAttribute('data-l10n-id', 'playbackPlay');
};

MediaControlsImpl.prototype.handleMediaPaused = function() {

  this.els.play.classList.add('paused');
  this.els.play.setAttribute('data-l10n-id', 'playbackPause');

  // If the paused event comes when the media is at the end,
  // set our 'played-till-end' flag. The one exception is when
  // the paused event comes from the forwardRewindController
  // pausing the media when the forward button was used to seek
  // to the end while the media was playing. In this case, we
  // don't consider the media being played until the end.
  if (this.mediaPlayer.currentTime === this.mediaPlayer.duration) {
    if (this.pausedAtEndWhilePlaying) {
      this.pausedAtEndWhilePlaying = false;
    }
    else {
      this.playedUntilEnd = true;
    }
  }
};

MediaControlsImpl.prototype.handleMediaSeeked = function() {
  this.updateMediaControlSlider();
};

MediaControlsImpl.prototype.handlePlayerEnded = function() {
  this.playerEnded();
};

/*
** End event handling functions.
*/

/*
** "Worker" functions.
*/
// Update the progress bar and play head as the video plays
MediaControlsImpl.prototype.handleMediaTimeUpdated = function() {
  if (!this.mediaControlsElement.hidden) {
    // We can't update a progress bar if we don't know how long
    // the video is. It is kind of a bug that the <video> element
    // can't figure this out for ogv videos.
    if (this.mediaPlayer.duration === Infinity || this.mediaPlayer.duration === 0) {
      return;
    }

    this.updateMediaControlSlider();
  }

  // Since we don't always get reliable 'ended' events, see if
  // we've reached the end this way.
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=783512
  // If we're within 1 second of the end of the video, register
  // a timeout a half a second after we'd expect an ended event.
  if (!this.endedTimer) {
    if (!this.dragging && this.mediaPlayer.currentTime >= this.mediaPlayer.duration - 1) {
      var timeUntilEnd = (this.mediaPlayer.duration - this.mediaPlayer.currentTime + .5);
      this.endedTimer = setTimeout(this.playerEnded.bind(this), timeUntilEnd * 1000);
    }
  } else if (this.dragging &&
             this.mediaPlayer.currentTime < this.mediaPlayer.duration - 1) {
    // If there is a timer set and we drag away from the end, cancel the timer
    clearTimeout(this.endedTimer);
    this.endedTimer = null;
  }
};

MediaControlsImpl.prototype.updateMediaControlSlider = function() {

  // We update the slider when we get a 'seeked' event.
  // Don't do updates while we're seeking because the position we fastSeek()
  // to probably isn't exactly where we requested and we don't want jerky
  // updates
  if (this.mediaPlayer.seeking) {
    return;
  }

  var percent = (this.mediaPlayer.currentTime / this.mediaPlayer.duration) * 100;
  if (isNaN(percent)) {
    return;
  }

  percent += '%';
  this.els.elapsedText.textContent = this.formatDuration(this.mediaPlayer.currentTime);
  this.els.elapsedTime.style.width = percent;

  // Don't move the play head if the user is dragging it.
  if (!this.dragging) {
    this.movePlayHead(percent);
  }
};

MediaControlsImpl.prototype.movePlayHead = function(percent) {
  if (!navigator.mozL10n || navigator.mozL10n.language.direction === 'ltr') {
    this.els.playHead.style.left = percent;
  }
  else {
    this.els.playHead.style.right = percent;
  }
};

MediaControlsImpl.prototype.playerEnded = function() {
  // Ignore ended events that occur while the user is dragging the slider
  if (this.dragging) {
    return;
  }

  if (this.endedTimer) {
    clearTimeout(this.endedTimer);
    this.endedTimer = null;
  }

  if (this.playedUntilEnd) {
    this.mediaPlayer.currentTime = 0;
    this.playedUntilEnd = false;
  }
};

MediaControlsImpl.prototype.handleMouseDown = function(event) {
  console.log('handleMouseDown, this.mockChangedTouches: ' + this.mockChangedTouches);

  // This is a mouse down event. If we've already had a mouse down
  // event, we don't need others.
  if (this.mockChangedTouches) {
    return;
  }

  // Create the API necessary to mock a touch event.
  // The 'identifiedTouch' function needs to return a 'Touch'
  // object, which corresponds to the event object received
  // from the mouse event.
	this.mockChangedTouches = { 
    mockTouch: null,
    item: function(index) {
 
      if (index !== 0) {
        return;
      }
 
      var touchItem = { 'identifier' : mockTouchId };
      return touchItem;
    },

    identifiedTouch: function(touchIdentifier) {
      if (touchIdentifier !== mockTouchId) {
        return;
      }

      return mockTouch;
    },

    setMockTouch: function(mt) {
      mockTouch = mt;
    }
  }; 

  var mockTouchId = Date.now();
  this.mockChangedTouches.setMockTouch(event);
  event.changedTouches = this.mockChangedTouches;
  this.handleSliderMoveStart(event);
};

MediaControlsImpl.prototype.handleMouseMove = function(event) {
  if (!this.mockChangedTouches) {
    return;
  }

  this.mockChangedTouches.setMockTouch(event);
  event.changedTouches = this.mockChangedTouches;
  this.handleSliderMove(event);
};

MediaControlsImpl.prototype.handleMouseUp = function(event) {
  if (!this.mockChangedTouches) {
    return;
  }

  event.changedTouches = this.mockChangedTouches;
  this.handleSliderMoveEnd(event);
  this.mockChangedTouches = null;
};

MediaControlsImpl.prototype.handleSliderMoveStart = function(event) {
  // If we already have a touch start event, we don't need others.
  if (null != this.touchStartID) {
    return false;
  }

  // Getting the touch start ID enables us to ensure we are tracking the
  // same touch throughout the slider movement.
  this.touchStartID = event.changedTouches.item(0).identifier;

  // We can't do anything if we don't know our duration
  if (this.mediaPlayer.duration === Infinity) {
    return false;
  }

  this.dragging = true;

  // Save the state of whether the media element is paused or not.
  // If it is not paused, pause it.
  if (this.mediaPlayer.paused) {
    this.isPausedWhileDragging = true;
  }
  else {
    this.isPausedWhileDragging = false;
    this.mediaPlayer.pause();
  }

  // calculate the slider wrapper size for slider dragging.
  this.sliderRect = this.els.sliderWrapper.getBoundingClientRect();

  this.handleSliderMove(event);
};

MediaControlsImpl.prototype.handleSliderMove = function(event) {
  var touch = event.changedTouches.identifiedTouch(this.touchStartID);

  // We don't care the event not related to touchStartID
  if (!touch) {
    return;
  }

  function getTouchPos() {
    return (!navigator.mozL10n ||
             navigator.mozL10n.language.direction === 'ltr') ?
       (touch.clientX - this.sliderRect.left) :
       (this.sliderRect.right - touch.clientX);
  }

  var touchPos = getTouchPos.call(this);
  var pos = touchPos / this.sliderRect.width;
  pos = Math.max(pos, 0);
  pos = Math.min(pos, 1);

  // Update the slider to match the position of the user's finger.
  // Note, however, that we don't update the displayed time until
  // we actually get a 'seeked' event.
  var percent = pos * 100 + '%';
  this.els.playHead.classList.add('active');
  this.movePlayHead(percent);
  this.els.elapsedTime.style.width = percent;

  this.moveMediaPlayerPosition(this.mediaPlayer.duration * pos);
};

MediaControlsImpl.prototype.handleSliderMoveEnd = function(event) {

    // We don't care the event not related to touchStartID
  if (!event.changedTouches.identifiedTouch(this.touchStartID)) {
    return false;
  }

  this.touchStartID = null;

  this.dragging = false;

  this.els.playHead.classList.remove('active');

  // If the media was playing when the user began dragging the slider
  // (and the slider was not dragged to the end), begin playing the
  // media.
  if (!(this.isPausedWhileDragging ||
        this.mediaPlayer.currentTime === this.mediaPlayer.duration)) {
    this.mediaPlayer.play();
  }
};

MediaControlsImpl.prototype.handleLoadedMetadata = function() {
  this.els.durationText.textContent = this.formatDuration(this.mediaPlayer.duration);
};

MediaControlsImpl.prototype.formatDuration = function(duration) {
  function padLeft(num, length) {
    var r = String(num);
    while (r.length < length) {
      r = '0' + r;
    }
    return r;
  }

  duration = Math.round(duration);
  var minutes = Math.floor(duration / 60);
  var seconds = duration % 60;
  if (minutes < 60) {
    return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
  }
  var hours = Math.floor(minutes / 60);
  minutes = Math.floor(minutes % 60);
  return hours + ':' + padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
};

MediaControlsImpl.prototype.startFastSeeking = function(direction) {

  // direction can be 1 or -1, 1 means forward and -1 means rewind.
  var offset = direction * 10;

  if (this.isLongPressing) {
    this.intervalId = window.setInterval(function() {
      this.seekVideo(this.mediaPlayer.currentTime + offset);
    }, 1000);
  } else {
    this.seekVideo(this.mediaPlayer.currentTime + offset);
  }
};

MediaControlsImpl.prototype.stopFastSeeking = function() {
  if (this.isLongPressing && this.intervalId) {
     window.clearInterval(this.intervalId);
     this.intervalId = null;
     this.isLongPressing = false;
  }
};

MediaControlsImpl.prototype.seekVideo = function(seekTime) {
  if (seekTime >= this.mediaPlayer.duration || seekTime < 0) {
    if (this.isLongPressing) {
      this.stopFastSeeking();
    }
    if (seekTime >= this.mediaPlayer.duration) {
      seekTime = this.mediaPlayer.duration;
      // If the user tries to seek past the end of the media while the media
      // is playing, pause the playback.
      //
      // Also, set a flag so the media controls will know the media wasn't
      // played until the end and therefore does not skip back to the
      // beginning.
      if (!this.mediaPlayer.paused) {
        this.mediaPlayer.pause();
        this.pausedAtEndWhilePlaying = true;
      }
    }
    else {
      seekTime = 0;
    }
  }

  this.moveMediaPlayerPosition(seekTime);
};

MediaControlsImpl.prototype.moveMediaPlayerPosition = function(pos) {
  if (this.isDevice) {
    this.mediaPlayer.fastSeek(pos);
  }
  else {
    this.mediaPlayer.currentTime = pos;
  }
};

var MediaControls = Component.register('gaia-media-controls', {
  /**
   * 'createdCallback' is called when the element is first created.
   */
  created: function() {
    console.log(Date.now() + '--' + 'creating gaia-media-controls web component...');

    var shadowRoot = this.setupShadowRoot();
    this.mediaPlayerId = this.getAttribute('media-player-id');
    this.mediaControlsImpl = new MediaControlsImpl(this, shadowRoot);
  },

  template: `

  <style>

  @font-face {
  	font-family: "gaia-icons";
  	src: url("fonts/gaia-icons.ttf") format("truetype");
  	font-weight: 500;
  	font-style: normal;
  }

  [data-icon]:before {
  	font-family: "gaia-icons";
  	content: attr(data-icon);
  	display: inline-block;
  	font-weight: 500;
  	font-style: normal;
  	text-decoration: inherit;
  	text-transform: none;
  	text-rendering: optimizeLegibility;
  	font-size: 30px;
  	-webkit-font-smoothing: antialiased;
  }

  footer {
    background: rgba(0, 0, 0, 0.75);
    height: 4rem;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1;
  }

  /* video bar -- duration, time slider, elapsed time */
  #video-bar {
    position: absolute;
    bottom: 4.4rem;
    height: 4rem;
    font-size: 0;
    border-bottom: 0.1rem solid rgba(255,255,255, 0.1);
    background-color: rgba(0,0,0, 0.85);
    white-space: nowrap;
    z-index: 10;
  }

  /* Support for web-based demo */
/*
  @media screen and (min-width: 600px) and (max-width: 2000px) {
    footer {
      left: 25%;
      right: 25%;
      bottom: 25%;
    }
    #video-bar {
      bottom: calc(25% + 4.4rem);
    }
  }
*/
  #video-bar:last-child {
    bottom: 0;
  }

::content #video-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

::content #media-player {
  /* size and position are set in JS depending on*/
  /* video size and screen orientation */
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  z-index: 11;
}

  #elapsed-text,
  #timeSlider,
  #slider-wrapper,
  #duration-text {
    display: inline-block;
    position: relative;
    line-height: 4.2rem;
    vertical-align: top;
  }

  #elapsed-text, #duration-text {
    color: #ffffff;
    font-size: 1.4rem;
  }

  /* elapsed-text and duration-text have padding on left and right
     to support ltr and rtl locales */
  #elapsed-text {
    width: 3.8rem;
    padding: 0 1.5rem;
    text-align: center;
  }

  #duration-text {
    width: 3.8rem;
    padding: 0 1.5rem;
    text-align: center;
  }

  /* time slider */
  #timeSlider {
    position: relative;
    width: 100%;
    z-index: 10;
  }

  #slider-wrapper {
    /* Take into account width and padding of elapsed and duration text */
    width: calc(100% - 13.6rem);
    height: 4.2rem;
  }

  #slider-wrapper div {
    position: absolute;
    pointer-events: none;
  }

  .progress {
    height: 0.3rem;
    width: 0;
    top: 50%;
    margin-top: -0.1rem;
  }

  #elapsed-time {
    background-color: #00caf2;
    z-index: 30;
    margin-top: -0.2rem;
  }

  #buffered-time {
    background-color: blue;
    z-index: 20;
  }

  #time-background {
    width: 100%;
    height: 0.1rem;
    background-color: #a6b4b6;
    z-index: 10;
  }

  #playHead {
    position: absolute;
    top: calc(50% - 1.15rem);
    width: 2.3rem;
    height: 2.3rem;

    /* For LTR langauges, position the playhead 1.15 rems to the left 
     * so that the center of the playhead aligns with the beginning of
     * the time slider.
     */
    margin-left: -1.15rem;

    /* For RTL langauges, position the playhead 1.15 rems to the right 
     * so that the center of the playhead aligns with the end of
     * the time slider.
     */
    margin-right: -1.15rem;

    border: none;
    background: none;
    pointer-events: none;
    z-index: 40;
  }

  #playHead:after {
    content: "";
    position: absolute;
    top: calc(50% - 1.15rem);
    left: calc(50% - 1.15rem);
    width: 2.3rem;
    height: 2.3rem;
    border-radius: 50%;
    background-color: #fff;
  }

  #playHead.active:before {
    content: "";
    position: absolute;
    top: calc(50% - 3.05rem);
    left: calc(50% - 3.05rem);
    width: 6.1rem;
    height: 6.1rem;
    border-radius: 50%;
    background-color: #00CAF2;
  }

  /* video control bar -- rewind, pause/play, forward */
  #video-control-bar {
    height: 4.5rem;
  }
  #video-control-bar {
    height: 4.5rem;
  }

  #video-tool-bar {
    position: relative;
    height: 4.8rem;
    font-size: 0;
    vertical-align: top;
    border-top: 0.1rem solid rgba(255,255,255, 0.1);
    background-color: #000;
    overflow: hidden;
    direction: ltr
  }

  #seek-backward,
  #seek-forward,
  #play {
    position: relative;
    height: 100%;
    padding: 0;
    font-weight: 500;
    background-position: center center;
    background-repeat: no-repeat;
    background-size: 3rem;
  }

  #seek-backward,
  #seek-forward {
    width: 33%;
  }

  #play {
    width: 34%;
  }

  #play.paused:before {
    content: 'play';
    padding-left: 4px;
  }

  .player-controls-button {
    color: #FFFFFF;
    border: none;
    border-radius: 0;
    background: transparent;
  }

  .player-controls-button:hover {
    background: transparent;
  }

  .player-controls-button:active {
    background: #00caf2;
  }

  .player-controls-button:disabled {
    opacity: 0.3;
  }

  .player-controls-button:disabled:active {
    background: transparent;
  }

  </style>

  <content select="#video-container"></content>
  <footer id="video-bar">
    <div id="timeSlider">
      <span id="elapsed-text"></span>
      <div id="slider-wrapper">
        <div id="elapsed-time" class="progress"></div>
        <div id="buffered-time" class="progress"></div>
        <div id="time-background" class="progress"></div>
        <button id="playHead"></button>
      </div>
      <span id="duration-text"></span>
    </div>
  </footer>
  <footer id="video-control-bar">
    <div id="video-tool-bar">
      <button id="seek-backward" class="player-controls-button" data-icon="skip-back"></button>
      <button id="play" class="player-controls-button" data-icon="pause"></button>
      <button id="seek-forward" class="player-controls-button" data-icon="skip-forward"></button>
    </div>
  </footer>`
});


