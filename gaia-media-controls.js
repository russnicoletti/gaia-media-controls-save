/**
 * Dependencies
 */
var Component = require('gaia-component');

var isDevice = null;
var mediaPlayer = null;

var MediaControls = Component.register('gaia-media-controls', {
  /**
   * 'createdCallback' is called when the element is first created.
   */
  created: function() {
    console.log('creating gaia-media-controls web component...');

    var shadowRoot = this.setupShadowRoot();

    var dom = {};
    var ids = [
        'bufferedTime', 'duration-text', 'elapsed-text', 'elapsedTime',
        'fullscreen-button', 'play', 'playHead', 'seek-backward',
        'seek-forward', 'slider-wrapper', 'timeBackground'
    ];

    function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    }

    ids.forEach(function createElementRef(name) {
      dom[toCamelCase(name)] = shadowRoot.getElementById(name);
    });

    this.mediaControlsImpl = new MediaControlsImpl(dom, this);
  },

  initialize: function(playerElement) {
    this.mediaControlsImpl.initialize(playerElement);
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
  #videoBar {
    position: absolute;
    right: 0;
    bottom: 4.4rem;
    left: 0;
    height: 4rem;
    font-size: 0;
    border-bottom: 0.1rem solid rgba(255,255,255, 0.1);
    background-color: rgba(0,0,0, 0.85);
    white-space: nowrap;
    z-index: 10;
  }

  #videoBar:last-child {
    bottom: 0;
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

  #elapsedTime {
    background-color: #00caf2;
    z-index: 30;
    margin-top: -0.2rem;
  }

  #bufferedTime {
    background-color: blue;
    z-index: 20;
  }

  #timeBackground {
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
  #videoControlBar {
    height: 4.5rem;
  }
  #videoControlBar {
    height: 4.5rem;
  }

  #videoToolBar {
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

  <footer id="videoBar">
    <div id="timeSlider">
      <span id="elapsed-text"></span>
      <div id="slider-wrapper">
        <div id="elapsedTime" class="progress"></div>
        <div id="bufferedTime" class="progress"></div>
        <div id="timeBackground" class="progress"></div>
        <button id="playHead"></button>
      </div>
      <span id="duration-text"></span>
    </div>
    <div id="fullscreen-button"></div>
  </footer>
  <footer id="videoControlBar">
    <div id="videoToolBar">
      <button id="seek-backward" class="player-controls-button" data-icon="skip-back"></button>
      <button id="play" class="player-controls-button" data-icon="pause"></button>
      <button id="seek-forward" class="player-controls-button" data-icon="skip-forward"></button>
    </div>
  </footer>`
});

exports.MediaControls = MediaControls;

/*
** MediaControlsImpl object
*/
function MediaControlsImpl(domElements, mediaControlsElement) {
  this.mediaControlsElement = mediaControlsElement;
  this.dom = domElements;
  this.touchStartID = null;
  this.isPausedWhileDragging = null;
  this.dragging = false;
  this.sliderRect = null;
  this.endedTimer = null;
  this.forwardRewindController = new ForwardRewindController();
  this.playedUntilEnd = false;
  this.mouseMoveStart = false;

  isDevice = (this.dom.sliderWrapper.clientWidth <= 200);
}

MediaControlsImpl.prototype.initialize = function(playerElement) {

  mediaPlayer = playerElement;

  /*
  ** play/rewind/forward events
  */
  this.dom.play.addEventListener(
    'click', handlePlayButton.bind(this));

  this.dom.seekForward.addEventListener('click',
    this.forwardRewindController.handleSeekForward.bind(
      this.forwardRewindController));

  this.dom.seekBackward.addEventListener('click',
    this.forwardRewindController.handleSeekBackward.bind(
      this.forwardRewindController));

  var videoToolbar = this.dom.seekForward.parentElement;
  videoToolbar.addEventListener(
    'contextmenu', handleStartLongPressing.bind(this));

  videoToolbar.addEventListener('touchend',
    this.forwardRewindController.handleLongPressStop.bind(
      this.forwardRewindController));

  /*
  ** slider
  */
  var sliderWrapper = this.dom.sliderWrapper;
  sliderWrapper.addEventListener(
    'touchstart', handleSliderMoveStart.bind(this));
  sliderWrapper.addEventListener(
    'mousedown', handleSliderMoveStart.bind(this));
  sliderWrapper.addEventListener(
    'touchmove', handleSliderMove.bind(this));
  sliderWrapper.addEventListener(
    'mousemove', handleSliderMove.bind(this));
  sliderWrapper.addEventListener(
    'touchend', handleSliderMoveEnd.bind(this));
  sliderWrapper.addEventListener(
    'mouseup', handleSliderMoveEnd.bind(this));

  /*
  ** The fullscreen button
  */
  this.dom.fullscreenButton.addEventListener(
    'click', handleFullscreenButton.bind(this));

  /*
  ** Media loading
  */
  mediaPlayer.addEventListener(
    'loadedmetadata', handleLoadedMetadata.bind(this));

  /*
  ** Media player begins playing
  */
  mediaPlayer.addEventListener(
    'play', handleMediaPlaying.bind(this));

  /*
  ** Media player is paused
  */
  mediaPlayer.addEventListener(
    'pause', handleMediaPaused.bind(this));

  /*
  ** The current playback time of the media has changed
  */
  mediaPlayer.addEventListener(
    'timeupdate', handleMediaTimeUpdated.bind(this));

  /*
  ** Media player seek operation
  */
  mediaPlayer.addEventListener(
    'seeked', handleMediaSeeked.bind(this));

  /*
  ** Media player playback stopped
  */
  mediaPlayer.addEventListener(
    'ended', handlePlayerEnded.bind(this));
};

/*
** Functions handling events.
*/
function handlePlayButton() {
  this.mediaControlsElement.dispatchEvent(
    new CustomEvent('play-button-click'));
}

function handleStartLongPressing(event) {

  if (event.target.id === this.dom.seekForward.id) {
    this.forwardRewindController.handleLongPressForward();
  } else if (event.target.id === this.dom.seekBackward.id) {
    this.forwardRewindController.handleLongPressBackward();
  } else {
    return;
  }
}

function handleFullscreenButton(event) {
  this.mediaControlsElement.dispatchEvent(
    new CustomEvent('fullscreen-button-click', {detail: event}));
}

function handleMediaPlaying() {
  this.dom.play.classList.remove('paused');
  this.dom.play.setAttribute('data-l10n-id', 'playbackPlay');
}

function handleMediaPaused() {
  this.dom.play.classList.add('paused');
  this.dom.play.setAttribute('data-l10n-id', 'playbackPause');

  // If the paused event comes when the media is at the end,
  // set our 'played-till-end' flag. The one exception is when
  // the paused event comes from the forwardRewindController
  // pausing the media when the forward button was used to seek
  // to the end while the media was playing. In this case, we
  // don't consider the media being played until the end.
  if (mediaPlayer.currentTime === mediaPlayer.duration) {
    if (this.forwardRewindController.pausedAtEndWhilePlaying) {
      this.forwardRewindController.pausedAtEndWhilePlaying = false;
    }
    else {
      this.playedUntilEnd = true;
    }
  }
}

function handleMediaSeeked() {
  updateMediaControlSlider.call(this);
}

function handlePlayerEnded() {
  playerEnded.call(this);
}

/*
** End event handling functions.
*/

/*
** "Worker" functions.
*/
// Update the progress bar and play head as the video plays
function handleMediaTimeUpdated() {
  if (!this.mediaControlsElement.hidden) {
    // We can't update a progress bar if we don't know how long
    // the video is. It is kind of a bug that the <video> element
    // can't figure this out for ogv videos.
    if (mediaPlayer.duration === Infinity || mediaPlayer.duration === 0) {
      return;
    }

    updateMediaControlSlider.call(this);
  }

  // Since we don't always get reliable 'ended' events, see if
  // we've reached the end this way.
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=783512
  // If we're within 1 second of the end of the video, register
  // a timeout a half a second after we'd expect an ended event.
  if (!this.endedTimer) {
    if (!this.dragging && mediaPlayer.currentTime >= mediaPlayer.duration - 1) {
      var timeUntilEnd = (mediaPlayer.duration - mediaPlayer.currentTime + .5);
      this.endedTimer = setTimeout(playerEnded.bind(this), timeUntilEnd * 1000);
    }
  } else if (this.dragging &&
             mediaPlayer.currentTime < mediaPlayer.duration - 1) {
    // If there is a timer set and we drag away from the end, cancel the timer
    clearTimeout(this.endedTimer);
    this.endedTimer = null;
  }
}

function updateMediaControlSlider() {

  // We update the slider when we get a 'seeked' event.
  // Don't do updates while we're seeking because the position we fastSeek()
  // to probably isn't exactly where we requested and we don't want jerky
  // updates
  if (mediaPlayer.seeking) {
    return;
  }

  var percent = (mediaPlayer.currentTime / mediaPlayer.duration) * 100;
  if (isNaN(percent)) {
    return;
  }

  percent += '%';
  this.dom.elapsedText.textContent = formatDuration(mediaPlayer.currentTime);
  this.dom.elapsedTime.style.width = percent;

  // Don't move the play head if the user is dragging it.
  if (!this.dragging) {
    movePlayHead.call(this, percent);
  }
}

function movePlayHead(percent) {
  if (!navigator.mozL10n || navigator.mozL10n.language.direction === 'ltr') {
    this.dom.playHead.style.left = percent;
  }
  else {
    this.dom.playHead.style.right = percent;
  }
}

function playerEnded() {
  // Ignore ended events that occur while the user is dragging the slider
  if (this.dragging) {
    return;
  }

  if (this.endedTimer) {
    clearTimeout(this.endedTimer);
    this.endedTimer = null;
  }

  if (this.playedUntilEnd) {
    mediaPlayer.currentTime = 0;
    this.playedUntilEnd = false;
  }
}

function handleSliderMoveStart(event) {
  // Determine if this is a touch event or a mouse event
  if (event.changedTouches) {

    // If we already have a touch start event, we don't need others.
    if (null != this.touchStartID) {
      return false;
    }

    // Getting the touch start ID enables us to ensure we are tracking the
    // same touch throughout the slider movement.
    this.touchStartID = event.changedTouches[0].identifier;
  }
  else {
    // This is a mouse down event. If we've already had a mouse move start
    // event, we don't need others.
    if (this.mouseMoveStart) {
      return;
    }

    this.mouseMoveStart = true;
  }

  // We can't do anything if we don't know our duration
  if (mediaPlayer.duration === Infinity) {
    return false;
  }

  this.dragging = true;

  // Save the state of whether the media element is paused or not.
  // If it is not paused, pause it.
  if (mediaPlayer.paused) {
    this.isPausedWhileDragging = true;
  }
  else {
    this.isPausedWhileDragging = false;
    mediaPlayer.pause();
  }

  // calculate the slider wrapper size for slider dragging.
  this.sliderRect = this.dom.sliderWrapper.getBoundingClientRect();

  handleSliderMove.call(this, event);
}

function handleSliderMove(event) {
  var xPos;

  // Determine if this is a touch event or a mouse event
  if (event.changedTouches) {
    // Ensure this touch movement is the same as the one where the
    // slider was initially started to move.
    var touch = event.changedTouches.identifiedTouch(this.touchStartID);

    // We don't care if the event is not related to touchStartID
    if (!touch) {
      return;
    }

    xPos = touch.clientX;
  }
  else {
    if (!this.mouseMoveStart) {
      return;
    }

    xPos = event.clientX;
  }

  function getTouchPos() {
    return (!navigator.mozL10n ||
             navigator.mozL10n.language.direction === 'ltr') ?
       (xPos - this.sliderRect.left) :
       (this.sliderRect.right - xPos);
  }

  var touchPos = getTouchPos.call(this);
  var pos = touchPos / this.sliderRect.width;
  pos = Math.max(pos, 0);
  pos = Math.min(pos, 1);

  // Update the slider to match the position of the user's finger.
  // Note, however, that we don't update the displayed time until
  // we actually get a 'seeked' event.
  var percent = pos * 100 + '%';
  this.dom.playHead.classList.add('active');
  movePlayHead.call(this, percent);
  this.dom.elapsedTime.style.width = percent;

  moveMediaPlayerPosition.call(this, mediaPlayer.duration * pos);
}

function handleSliderMoveEnd(event) {
  // Determine if this is a touch event or a mouse event
  if (event.changedTouches) {
    // We don't care the event not related to touchStartID
    if (!event.changedTouches.identifiedTouch(this.touchStartID)) {
      return false;
    }

    this.touchStartID = null;
  }
  else {
    // This is a mouse up event. If somehow we haven't had a mouse down
    // event, abort
    if (!this.mouseMoveStart) {
      return;
    }

    this.mouseMoveStart = false;
  }

  this.dragging = false;

  this.dom.playHead.classList.remove('active');

  // If the media was playing when the user began dragging the slider
  // (and the slider was not dragged to the end), begin playing the
  // media.
  if (!(this.isPausedWhileDragging ||
        mediaPlayer.currentTime === mediaPlayer.duration)) {
    mediaPlayer.play();
  }
}

function handleLoadedMetadata() {
  this.dom.durationText.textContent = formatDuration(mediaPlayer.duration);
}

function formatDuration(duration) {
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
}

/*
** ForwardRewindController object
*/
function ForwardRewindController() {
  this.isLongPressing = false;
  this.intervalId = null;
  this.pausedAtEndWhilePlaying = false;
}

ForwardRewindController.prototype.handleSeekForward = function() {
    startFastSeeking.call(this, 1);
};

ForwardRewindController.prototype.handleSeekBackward = function() {
    startFastSeeking.call(this, -1);
};

ForwardRewindController.prototype.handleLongPressForward = function() {
    this.isLongPressing = true;
    startFastSeeking.call(this, 1);
};

ForwardRewindController.prototype.handleLongPressBackward = function() {
    this.isLongPressing = true;
    startFastSeeking.call(this, -1);
};

ForwardRewindController.prototype.handleLongPressStop = function() {
    stopFastSeeking.call(this);
};

function startFastSeeking(direction) {

  // direction can be 1 or -1, 1 means forward and -1 means rewind.
  var offset = direction * 10;

  if (this.isLongPressing) {
    this.intervalId = window.setInterval(function() {
      seekVideo.call(this, mediaPlayer.currentTime + offset);
    }, 1000);
  } else {
    seekVideo.call(this, mediaPlayer.currentTime + offset);
  }
}

function stopFastSeeking() {
  if (this.isLongPressing && this.intervalId) {
     window.clearInterval(this.intervalId);
     this.intervalId = null;
     this.isLongPressing = false;
  }
}

function seekVideo(seekTime) {
  if (seekTime >= mediaPlayer.duration || seekTime < 0) {
    if (this.isLongPressing) {
      stopFastSeeking.call(this);
    }
    if (seekTime >= mediaPlayer.duration) {
      seekTime = mediaPlayer.duration;
      // If the user tries to seek past the end of the media while the media
      // is playing, pause the playback.
      //
      // Also, set a flag so the media controls will know the media wasn't
      // played until the end and therefore does not skip back to the
      // beginning.
      if (!mediaPlayer.paused) {
        mediaPlayer.pause();
        this.pausedAtEndWhilePlaying = true;
      }
    }
    else {
      seekTime = 0;
    }
  }

  moveMediaPlayerPosition.call(this, seekTime);
}

function moveMediaPlayerPosition(pos) {
  if (isDevice) {
    mediaPlayer.fastSeek(pos);
  }
  else {
    mediaPlayer.currentTime = pos;
  }
}

