(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Dependencies
 */

var MediaControls = require('./lib/media_controls');

function registerComponent(name, props) {
  console.log('registering element ' + name);

  var baseElement = Object.create(HTMLElement.prototype);
  var elemProto = Object.assign(baseElement, props);
  
  var elem = document.registerElement(name, { prototype: elemProto });
  return elem;
}

var gaiaMediaControls = registerComponent('gaia-media-controls', {
  /**
   * 'createdCallback' is called when the element is first created.
   */
  createdCallback: function() {
    console.log('creating gaia-media-controls web component...');
    
    var shadowRoot = this.createShadowRoot();
    shadowRoot.innerHTML = this.template;

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

    dom.mediaControlsComponent = this;

    this.mediaControls = new MediaControls(dom);
    console.log('done instantiating MediaControls');
  },

  initialize: function(playerElement) {
    this.mediaControls.initialize(playerElement);
  },

  updateSlider: function() {
    this.mediaControls.updateSlider();
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
    margin-left: -1.15rem;
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

module.exports = gaiaMediaControls;

},{"./lib/media_controls":3}],2:[function(require,module,exports){
/* exported ForwardRewindController */
/*
 * This file is used for forward and rewind funtionality of Gaia Video app.
 *
 * If the user taps the forward or rewind icons,
 * the video will jump forward or back by 10 seconds.
 *
 * When the user presses and holds on the forward or rewind icons,
 * the video time will move foward or back at 10 times the regular speed.
 */

'use strict';
var isLongPressing = false;
var intervalId = null;
var player = null;

function ForwardRewindController() {
}

ForwardRewindController.prototype = {

  init: function(videoPlayer) {
    player = videoPlayer;
  },

  uninit: function(videoPlayer) {
    player = null;
  },

  handleSeekForward: function() {
    startFastSeeking(1);
  },

  handleSeekBackward: function() {
    startFastSeeking(-1);
  },

  handleLongPressForward: function() {
    isLongPressing = true;
    startFastSeeking(1);
  },

  handleLongPressBackward: function() {
    isLongPressing = true;
    startFastSeeking(-1);
  },

  handleLongPressStop: function() {
    stopFastSeeking();
  },
};

function startFastSeeking(direction) {

  // direction can be 1 or -1, 1 means forward and -1 means rewind.
  var offset = direction * 10;

  if (isLongPressing) {
    intervalId = window.setInterval(function() {
      seekVideo(player.currentTime + offset);
    }, 1000);
  } else {
    seekVideo(player.currentTime + offset);
  }
}

function stopFastSeeking() {
  if (isLongPressing && intervalId) {
     window.clearInterval(intervalId);
     intervalId = null;
     isLongPressing = false;
  }
}

function seekVideo(seekTime) {
  if (seekTime >= player.duration || seekTime < 0) {
    if (isLongPressing) {
      stopFastSeeking();
    }
    if (seekTime >= player.duration) {
      seekTime = player.duration;
      // If the user tries to seek past the end then pause playback
      // because otherwise when we get the 'ended' event we'll skip
      // to the beginning of the movie. Even though we pause, we'll
      // still get the ended event, but the handler sees that we're
      // paused and does not skip back to the beginning.
      player.pause();
    }
    else {
      seekTime = 0;
    }
  }

  player.fastSeek(seekTime);
}

module.exports = ForwardRewindController;


},{}],3:[function(require,module,exports){
/* exported MediaControls */
'use strict';

/**
 * Dependencies
 */
var ForwardRewindController = require('./forward_rewind_controller.js');

var dom = {};
var player = null;
var forwardRewindController;
 
function MediaControls(domElements) {
  this.touchStartID = null;
  this.isPausedWhileDragging = null;
  this.dragging = false;
  this.sliderRect = null;
  this.endedTimer = null;

  dom = domElements;
  forwardRewindController = new ForwardRewindController();
}

MediaControls.prototype = {

  initialize: function(playerElement) {

    player = playerElement;
    forwardRewindController.init(player);

    /*
    ** play/rewind/forward events
    */
    dom.play.addEventListener('click', handlePlayButtonClick);
    dom.seekForward.addEventListener('click',
                                     forwardRewindController.handleSeekForward);
    dom.seekBackward.addEventListener('click',
                                     forwardRewindController.handleSeekBackward);
    var videoToolbar = dom.seekForward.parentElement;
    videoToolbar.addEventListener('contextmenu', handleStartLongPressing);
    videoToolbar.addEventListener('touchend', handleStopLongPressing);

    /*
    ** slider
    */
    dom.sliderWrapper.addEventListener('touchstart', handleSliderTouchStart.bind(this));
    dom.sliderWrapper.addEventListener('touchmove', handleSliderTouchMove.bind(this));
    dom.sliderWrapper.addEventListener('touchend', handleSliderTouchEnd.bind(this));

    /*
    ** The fullscreen button
    */
    dom.fullscreenButton.addEventListener('click', handleFullscreenButtonClick);

    /*
    ** Media loading
    */
    player.addEventListener('loadedmetadata', handleLoadedMetadata);

    /*
    ** Media player begins playing
    */
    player.addEventListener('play', handleMediaPlaying);

    /*
    ** Media player is paused
    */
    player.addEventListener('pause', handleMediaPaused);

    /*
    ** The current playback time of the media has changed
    */
    player.addEventListener('timeupdate', handleMediaTimeUpdated.bind(this));

    /*
    ** Media player seek operation
    */
    player.addEventListener('seeked', handleMediaSeeked.bind(this));//updateVideoControlSlider);

    /*
    ** Media player playback stopped
    */ 
    player.addEventListener('ended', handlePlayerEnded.bind(this));
  }
};

/*
** Functions handling events.
*/
function handlePlayButtonClick() {
  dom.mediaControlsComponent.dispatchEvent(
    new CustomEvent('play-button-click'));
}

function handleStartLongPressing(event) {

  if (event.target.id === dom.seekForward.id) {
    forwardRewindController.handleLongPressForward();
  } else if (event.target.id === dom.seekBackward.id) {
    forwardRewindController.handleLongPressBackward();
  } else {
    return;
  }
}

function handleStopLongPressing(event) {
  forwardRewindController.handleLongPressStop();
}

function handleFullscreenButtonClick(event) {
  dom.mediaControlsComponent.dispatchEvent(
    new CustomEvent('fullscreen-button-click', {detail: event}));
}

function handleMediaPlaying() {
  dom.play.classList.remove('paused');
}

function handleMediaPaused() {
  dom.play.classList.add('paused');
}

function handleMediaTimeUpdated() {
  mediaTimeUpdated.call(this);
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
function mediaTimeUpdated() {
  if (!dom.mediaControlsComponent.hidden) {
    // We can't update a progress bar if we don't know how long
    // the video is. It is kind of a bug that the <video> element
    // can't figure this out for ogv videos.
    if (player.duration === Infinity || player.duration === 0) {
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
    if (!this.dragging && player.currentTime >= player.duration - 1) {
      var timeUntilEnd = (player.duration - player.currentTime + .5);
      this.endedTimer = setTimeout(playerEnded, timeUntilEnd * 1000);
    }
  } else if (this.dragging && player.currentTime < player.duration - 1) {
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
  if (player.seeking) {
    return;
  }

  var percent = (player.currentTime / player.duration) * 100;
  if (isNaN(percent)) {
    return;
  }

  percent += '%';

  dom.elapsedText.textContent =
                  formatDuration(player.currentTime);
  dom.elapsedTime.style.width = percent;

  // Don't move the play head if the user is dragging it.
  if (!this.dragging) {
    movePlayHead(percent);
  }
}

function movePlayHead(percent) {
  if (navigator.mozL10n.language.direction === 'ltr') {
    dom.playHead.style.left = percent;
  }
  else {
    dom.playHead.style.right = percent;
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

  // If we are still playing when this 'ended' event arrives, then the
  // user played the video all the way to the end, and we skip to the
  // beginning and pause so it is easy for the user to restart. If we
  // reach the end because the user fast forwarded or dragged the slider
  // to the end, then we will have paused the video before we get this
  // event and in that case we will remain paused at the end of the video.
  if (!this.paused) {
    player.currentTime = 0;
    player.pause();
  }
}

function handleSliderTouchStart(event) {

  // We can't do anything if we don't know our duration
  if (player.duration === Infinity) {
    return false;
  }

  // If we have a touch start event, we don't need others.
  if (null != this.touchStartID) {
    return false;
  }

  this.dragging = true;
  this.touchStartID = event.changedTouches[0].identifier;

  // Save the state of whether the media element is paused or not
  // and if it is not, pause it.
  if (player.paused) {
    this.isPausedWhileDragging = true;
  }
  else {
    this.isPausedWhileDragging = false;
    player.pause();
  }
  
  // calculate the slider wrapper size for slider dragging.
  this.sliderRect = dom.sliderWrapper.getBoundingClientRect();

  handleSliderTouchMove.call(this, event);
}

function handleSliderTouchMove(event) {

  var touch = event.changedTouches.identifiedTouch(this.touchStartID);

  // We don't care the event not related to touchStartID
  if (!touch) {
    return;
  }

  function getTouchPos() {
    return (navigator.mozL10n.language.direction === 'ltr') ?
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
  dom.playHead.classList.add('active');
  movePlayHead(percent);
  dom.elapsedTime.style.width = percent;
  player.fastSeek(player.duration * pos);
}

function handleSliderTouchEnd(event) {

  // We don't care the event not related to touchStartID
  if (!event.changedTouches.identifiedTouch(this.touchStartID)) {
    return false;
  }

  this.dragging = false;
  this.touchStartID = null;

  dom.playHead.classList.remove('active');

  // If the media was playing when the user began dragging the slider
  // (and the slider was not dragged to the end), begin playing the
  // media.
  if (!(this.isPausedWhileDragging ||
        player.currentTime === player.duration)) {
    player.play();
  }
}

function handleLoadedMetadata() {
  dom.durationText.textContent = formatDuration(player.duration);
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

module.exports = MediaControls;


},{"./forward_rewind_controller.js":2}]},{},[1]);
