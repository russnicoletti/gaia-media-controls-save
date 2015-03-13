/**
 * Dependencies
 */
var Component = require('gaia-component');

/*
** MediaControlsImpl object
*/
function MediaControlsImpl(mediaControlsElement, shadowRoot) {
  this.mediaControlsElement = mediaControlsElement;
  this.shadowRoot = shadowRoot;
  this.touchStartID = null;
  this.isPausedWhileDragging = null;
  this.dragging = false;
  this.sliderRect = null;
  this.playedUntilEnd = false;
  this.intervalId = null;
  this.pausedAtEndWhilePlaying = false;
  this.mediaPlayer = null;
  this.seekIncrement = 10; // Seek forward/backward in 10 second increments

  this.els = {
    durationText: this.shadowRoot.getElementById('duration-text'),
    elapsedText: this.shadowRoot.getElementById('elapsed-text'),
    elapsedTime: this.shadowRoot.getElementById('elapsed-time'),
    play: this.shadowRoot.getElementById('play'),
    playHead: this.shadowRoot.getElementById('play-head'),
    seekForward: this.shadowRoot.getElementById('seek-forward'),
    seekBackward: this.shadowRoot.getElementById('seek-backward'),
    sliderWrapper: this.shadowRoot.getElementById('slider-wrapper')
  };

  // FastSeek appears to not work well in the browser...
  this.useFastSeek = /mobile/i.test(navigator.userAgent);

  this.addEventListeners();

  if (mediaControlsElement.mediaPlayerId) {
    this.onMediaPlayerChanged();
  }
}

MediaControlsImpl.prototype.addEventListeners = function() {
  this.shadowRoot.addEventListener('contextmenu', this);
  this.shadowRoot.addEventListener('touchend', this);
  this.shadowRoot.addEventListener('click', this);
  this.shadowRoot.addEventListener('touchstart', this);
  this.shadowRoot.addEventListener('touchmove', this);
  this.shadowRoot.addEventListener('touchend', this);
  this.shadowRoot.addEventListener('mousedown', this);
};

MediaControlsImpl.prototype.addMediaPlayerEventListeners = function() {
  this.mediaPlayer.addEventListener('loadedmetadata', this);
  this.mediaPlayer.addEventListener('play', this);
  this.mediaPlayer.addEventListener('pause', this);
  this.mediaPlayer.addEventListener('timeupdate', this)
  this.mediaPlayer.addEventListener('seeked', this);
  this.mediaPlayer.addEventListener('ended', this);
};

MediaControlsImpl.prototype.removeMediaPlayerEventListeners = function() {
  this.mediaPlayer.removeEventListener('loadedmetadata', this);
  this.mediaPlayer.removeEventListener('play', this);
  this.mediaPlayer.removeEventListener('pause', this);
  this.mediaPlayer.removeEventListener('timeupdate', this)
  this.mediaPlayer.removeEventListener('seeked', this);
  this.mediaPlayer.removeEventListener('ended', this);
};

MediaControlsImpl.prototype.handleEvent = function(e) {

  switch(e.type) {

    case 'click':
      switch(e.target) {
        case this.els.play:
          //
          // Let the 'play' and 'pause' handlers take care of changing
          // the icon and setting the l10n-id (for the screen reader).
          //
          if (this.mediaPlayer.paused) {
            this.mediaPlayer.play();
          }
          else {
            this.mediaPlayer.pause();
          }
          break;

        case this.els.seekForward:
          this.seekVideo(this.mediaPlayer.currentTime + this.seekIncrement);
          break;

        case this.els.seekBackward:
          this.seekVideo(this.mediaPlayer.currentTime - this.seekIncrement);
          break;
      }
      break;

    case 'loadedmetadata':
      //
      // Metadata has been loaded, now we can set the duration of the media
      //
      this.els.durationText.textContent = this.formatDuration(this.mediaPlayer.duration);
      break;

    case 'play':
      //
      // Media is playing, display 'paused' icon
      //
      this.els.play.classList.remove('paused');

      // Update l10n-id for the benefit of the screen reader
      this.els.play.setAttribute('data-l10n-id', 'playbackPlay');
      break;

    case 'pause':
      //
      // Media is paused, display 'play' icon
      //
      this.els.play.classList.add('paused');

      // Update l10n-id for the benefit of the screen reader
      this.els.play.setAttribute('data-l10n-id', 'playbackPause');

      // If the paused event comes when the media is at the end,
      // set our 'played-till-end' flag. The one exception is when
      // the paused event comes from pausing the media when the
      // forward button was used to seek to the end while the media
      // was playing. In this case, we don't consider the media being
      // played until the end.
      if (this.mediaPlayer.currentTime === this.mediaPlayer.duration) {
        if (this.pausedAtEndWhilePlaying) {
          this.pausedAtEndWhilePlaying = false;
        }
        else {
          this.playedUntilEnd = true;
        }
      }
      break;

    case 'timeupdate':
      //
      // Update the progress bar and play head as the video plays
      //
      if (!this.mediaControlsElement.hidden) {
        // We can't update a progress bar if we don't know how long
        // the video is.
        if (this.mediaPlayer.duration === Infinity || this.mediaPlayer.duration === 0) {
          return;
        }

        this.updateMediaControlSlider();
      }
      break;

    case 'seeked':
      //
      // Update the position of the slider when the video position has been
      // moved.
      //
      this.updateMediaControlSlider();
      break;

    case 'ended':
      //
      // Ignore ended events that occur while the user is dragging the slider
      //
      if (this.dragging) {
        return;
      }

      // If the media was played until the end (as opposed to being forwarded
      // to the end, position the player at the beginning of the video.
      if (this.playedUntilEnd) {
        this.mediaPlayer.currentTime = 0;
        this.playedUntilEnd = false;
      }
      break;

    case 'contextmenu':
      //
      // Handle long-press forward or backward
      //
      // If we're already handling a long-press, don't process other
      // seeking events
      if (this.intervalId) {
        return;
      }

      var direction = null;

      if (e.target === this.els.seekForward) {
        direction = 1;
      } else if (e.target === this.els.seekBackward) {
        direction = -1;
      } else {
        return;
      }

      var offset = direction * 10;

      var seekOnInterval = function () {
          this.seekVideo(this.mediaPlayer.currentTime + offset);
      };

      this.intervalId = window.setInterval(seekOnInterval.bind(this), 1000);
  }

  if (e.target === this.els.sliderWrapper && (e.type === 'touchstart' || e.type === 'mousedown' ||
           e.type === 'touchmove') ||
           e.type === 'mousemove') {

    function getClientX(event) {
      if (event instanceof MouseEvent) {
        return event.clientX;
      }
      else if (event instanceof TouchEvent) {
        return event.changedTouches[0].clientX;
      }
    }

    switch(e.type) {
      case 'touchstart':
      case 'mousedown':
        if (e.type === 'mousedown') {
          window.addEventListener('mousemove', this, true);
          window.addEventListener('mouseup', this, true);
        }

        this.handleSliderMoveStart(getClientX(e));
        break;

      case 'touchmove':
      case 'mousemove':
        this.handleSliderMove(getClientX(e));
        break;
    }
  }
  else if (e.type === 'touchend') {
    switch (e.target) {
      // If ending a long-press forward or backward, clear timer
      case this.els.seekForward:
      case this.els.seekBackward:
        if (this.intervalId) {
           window.clearInterval(this.intervalId);
           this.intervalId = null;
        }
        break;
      // If ending a movement of the slider
      case this.els.sliderWrapper:
        this.handleSliderMoveEnd();
        break;
    }
  }
  else if (e.type === 'mouseup') {
    this.handleSliderMoveEnd();

    // Don't need to listen for mousemove and mouseup until we get a mousedown
    window.removeEventListener('mousemove', this, true);
    window.removeEventListener('mouseup', this, true);
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

MediaControlsImpl.prototype.handleSliderMoveStart = function(clientX) {

  // If we already have a touch start event, we don't need others.
  if (this.dragging) {
    return false;
  }

  this.dragging = true;

  // We can't do anything if we don't know our duration
  if (this.mediaPlayer.duration === Infinity) {
    return false;
  }

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

  this.handleSliderMove(clientX);
};

MediaControlsImpl.prototype.handleSliderMove = function(clientX) {

  // If the user is not dragging the slider, noop
  if (!this.dragging) {
    return false;
  }

  var self = this;
  function getTouchPos() {
    return (!navigator.mozL10n ||
             navigator.mozL10n.language.direction === 'ltr') ?
       (clientX - self.sliderRect.left) :
       (self.sliderRect.right - clientX);
  }

  var touchPos = getTouchPos();
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

  // If the user is not dragging the slider, noop
  if (!this.dragging) {
    return false;
  }

  this.dragging = false;
  this.sliderRect = null;

  this.els.playHead.classList.remove('active');

  // If the media was playing when the user began dragging the slider
  // (and the slider was not dragged to the end), begin playing the
  // media.
  if (!(this.isPausedWhileDragging ||
        this.mediaPlayer.currentTime === this.mediaPlayer.duration)) {
    this.mediaPlayer.play();
  }
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

MediaControlsImpl.prototype.seekVideo = function(seekTime) {
  //
  // If seeking will move the media position before the beginning or past
  // the end, stop the auto-seeking and position the media accordingly.
  //
  if (seekTime >= this.mediaPlayer.duration || seekTime < 0) {
    window.clearInterval(this.intervalId);
    this.intervalId = null;

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
  if (this.useFastSeek) {
    this.mediaPlayer.fastSeek(pos);
  }
  else {
    this.mediaPlayer.currentTime = pos;
  }
};

MediaControlsImpl.prototype.attachPlayer = function(player) {
  if (this.mediaPlayer) {
    this.removeMediaPlayerEventListeners();
  }

  this.mediaPlayer = player;
  this.addMediaPlayerEventListeners();
};

MediaControlsImpl.prototype.detachPlayer = function(player) {
  if (this.mediaPlayer) {
    this.removeMediaPlayerEventListeners();
  }

  this.mediaPlayer = null;
};

MediaControlsImpl.prototype.onMediaPlayerChanged = function() {
  if (this.mediaPlayer) {
    this.removeMediaPlayerEventListeners();
  }

  this.mediaPlayer =
    document.getElementById(this.mediaControlsElement.mediaPlayerId);

  this.addMediaPlayerEventListeners();
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

  attachPlayer: function(player) {
    this.mediaPlayerImpl.attachPlayer(player);
  },

  detachPlayer: function() {
    this.mediaPlayerImpl.detachPlayer();
  },

  /**
   * Known attribute property descriptors.
   *
   * These setters get called when matching
   * attributes change on the element.
   *
   * @type {Object}
   */
  attrs: {
    mediaPlayerId: {
      get: function() { return this._mediaPlayerId || false; },
      set: function(value) {

        if (value === this.mediaPlayerId) { return; }
        this._mediaPlayerId = value;

        // If the media player id attribute changed after the media controls
        // element has been created, notify the implementation object so that
        // the new player can be loaded.
        if (this.mediaControlsImpl) {
          this.mediaControlsImpl.onMediaPlayerChanged();
        }
      }
    }
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

  #media-controls-container {
    background-color: rgba(0,0,0, 0.85);
    display: flex;
    flex-flow: column;
    align-items: flex-start;
  }

  /* video bar -- duration, time slider, elapsed time */
  #time-slider-bar {
    display: flex;
    flex-flow: row;
    justify-content: center;
    font-size: 0;
    border-bottom: 0.1rem solid rgba(255,255,255, 0.1);
    white-space: nowrap;
    z-index: 10;
    width: 100%;
  }

  /* Support for web-based demo */
  @media screen and (min-width: 600px) and (max-width: 2000px) {
    #media-controls-container {
      width: 50%;
    }
  }

  #elapsed-text,
  #slider-wrapper,
  #duration-text {
    /* The slider elements do not grow and shrink via the flexbox. The slider
       bar grows and shrinks via the dynamic width of the slider. */
    flex-grow: 0;
    flex-shrink: 0;

    line-height: 4.2rem;
  }

  /* 1. elapsed-text and duration-text have padding on left and right
        to support ltr and rtl locales */
  #elapsed-text, #duration-text {
    color: #ffffff;
    font-size: 1.4rem;
    padding: 0 1.5rem; /* 1 */
    text-align: center;
    width: 3.8rem;
    margin-top: 0.3rem;
  }

  #elapsed-text {
	  order: 1;
  }

  #slider-wrapper {
    order: 2;
    /* Take into account width and padding of elapsed and duration text */
    width: calc(100% - 13.6rem);
    height: 4.2rem;
  }

  #duration-text {
	  order: 3;
  }

  #slider-wrapper div {
    position: relative;
    pointer-events: none;
  }

  .progress {
    height: 0.3rem;
    width: 0;
    top: 50%;
  }

  #elapsed-time {
    background-color: #00caf2;
    z-index: 30;
  }

  #buffered-time {
    background-color: blue;
    z-index: 20;
  }

  #time-background {
    width: 100%;
    height: 0.1rem;
    margin-top: -0.5rem;
    background-color: #a6b4b6;
    z-index: 10;
  }

  #play-head {
    position: relative;
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

  #play-head:after {
    content: "";
    position: absolute;
    top: calc(50% - 1.15rem);
    left: calc(50% - 1.15rem);
    width: 2.3rem;
    height: 2.3rem;
    border-radius: 50%;
    background-color: #fff;
  }

  #play-head.active:before {
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
    display: flex;
    flex-flow: row;
    justify-content: center;
    opacity: 0.95;
    height: 4.8rem;
    width: 100%;
    font-size: 0;
    border-top: 0.1rem solid rgba(255,255,255, 0.1);
    background-color: #000;
    overflow: hidden;
    direction: ltr;
    z-index: 10;
  }

  #seek-backward,
  #seek-forward,
  #play {
    /* All three elements grow and shrink together by the same proportion */
    flex-grow: 1;
    flex-shrink: 1;

    padding: 0;
    font-weight: 500;
    background-position: center center;
    background-repeat: no-repeat;
    background-size: 3rem;
  }

  #seek-backward {
    order: 1;
    width: 33%;
  }

  #play {
    order: 2;
    width: 34%;
  }

  #seek-forward {
    order: 3;
    width: 33%;
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

  <div id="media-controls-container">
    <div id="time-slider-bar">
      <span id="elapsed-text"></span>
      <div id="slider-wrapper">
        <div id="elapsed-time" class="progress"></div>
        <div id="buffered-time" class="progress"></div>
        <div id="time-background" class="progress"></div>
        <button id="play-head"></button>
      </div>
      <span id="duration-text"></span>
    </div>
    <div id="video-control-bar">
      <button id="seek-backward" class="player-controls-button" data-icon="skip-back"></button>
      <button id="play" class="player-controls-button" data-icon="pause"></button>
      <button id="seek-forward" class="player-controls-button" data-icon="skip-forward"></button>
    </div>
  </div>`
});


