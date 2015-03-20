/*
 * This wrapping is necessary for the running the tests
 */
;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */
var Component = require('gaia-component');

/*
** MediaControlsImpl object
*/
function MediaControlsImpl(mediaControlsElement, shadowRoot, player) {
  this.mediaControlsElement = mediaControlsElement;
  this.shadowRoot = shadowRoot;
  this.touchStartID = null;
  this.isPausedWhileDragging = null;
  this.dragging = false;
  this.sliderRect = null;
  this.playedUntilEnd = false;
  this.intervalId = null;
  this.pausedAtEndWhilePlaying = false;
  this.mediaPlayer = player;
  this.seekIncrement = 10; // Seek forward/backward in 10 second increments
  this.mouseEventHandlerRegistered = false;

  this.els = {
    durationText: this.shadowRoot.querySelector('.duration-text'),
    elapsedText: this.shadowRoot.querySelector('.elapsed-text'),
    elapsedTime: this.shadowRoot.querySelector('.elapsed-time'),
    play: this.shadowRoot.querySelector('.play'),
    playHead: this.shadowRoot.querySelector('.play-head'),
    seekForward: this.shadowRoot.querySelector('.seek-forward'),
    seekBackward: this.shadowRoot.querySelector('.seek-backward'),
    sliderWrapper: this.shadowRoot.querySelector('.slider-wrapper')
  };

  // FastSeek appears to not work well in the browser...
  this.useFastSeek = /mobile/i.test(navigator.userAgent);

  this.addEventListeners();
}

MediaControlsImpl.prototype.addEventListeners = function() {
  this.shadowRoot.addEventListener('contextmenu', this);
  this.shadowRoot.addEventListener('touchend', this);
  this.shadowRoot.addEventListener('touchstart', this);
  this.shadowRoot.addEventListener('touchmove', this);
  this.shadowRoot.addEventListener('touchend', this);
  this.shadowRoot.addEventListener('mousedown', this);

  this.mediaPlayer.addEventListener('loadedmetadata', this);
  this.mediaPlayer.addEventListener('play', this);
  this.mediaPlayer.addEventListener('pause', this);
  this.mediaPlayer.addEventListener('timeupdate', this)
  this.mediaPlayer.addEventListener('seeked', this);
  this.mediaPlayer.addEventListener('ended', this);
};

MediaControlsImpl.prototype.removeEventListeners = function() {
  this.shadowRoot.removeEventListener('contextmenu', this);
  this.shadowRoot.removeEventListener('touchend', this);
  this.shadowRoot.removeEventListener('touchstart', this);
  this.shadowRoot.removeEventListener('touchmove', this);
  this.shadowRoot.removeEventListener('touchend', this);
  this.shadowRoot.removeEventListener('mousedown', this);

  this.mediaPlayer.removeEventListener('loadedmetadata', this);
  this.mediaPlayer.removeEventListener('play', this);
  this.mediaPlayer.removeEventListener('pause', this);
  this.mediaPlayer.removeEventListener('timeupdate', this)
  this.mediaPlayer.removeEventListener('seeked', this);
  this.mediaPlayer.removeEventListener('ended', this);

  if (this.mouseEventHandlerRegistered) {
    this.shadowRoot.removeEventListener('mousemove', this, true);
    this.shadowRoot.removeEventListener('mouseup', this, true);
  }

  this.mouseEventHandlerRegistered = false;
};

MediaControlsImpl.prototype.handleEvent = function(e) {

  // If we get a touchstart, don't process mouse events
  if (e.type === 'touchstart') {
    this.shadowRoot.removeEventListener('mousedown', this);
    this.shadowRoot.removeEventListener('mousemove', this);
    this.shadowRoot.removeEventListener('mouseup', this);
  }

  switch(e.type) {

    case 'mousedown':
      //
      // The component is listening to window 'mousemove' events so
      // that the slider movement will function even when the mouse
      // moves off the play head. However, if the component is always
      // listening to the window events, it would receive very many
      // spurious 'mousemove' events. To prevent this, the component
      // only listens to 'mousemove' events after receiving a 'mousedown'
      // event.
      window.addEventListener('mousemove', this, true);
      window.addEventListener('mouseup', this, true);
      this.mouseEventHandlerRegistered = true;

      // fall through to touchstart...

    case 'touchstart':
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
        case this.els.seekBackward:

          var direction = null;
          if (e.target === this.els.seekForward) {
            direction = 1;
          } else if (e.target === this.els.seekBackward) {
            direction = -1;
          } else {
            return;
          }

          var offset = direction * 10;
          this.seekBy(this.mediaPlayer.currentTime + offset);

          // Begin the "longpress" movement after a one second delay.
          var self = this;
          this.intervalId = window.setInterval(function() {
              self.seekBy(self.mediaPlayer.currentTime + offset);
            }, 1000);
          break;
      }
      break;

      case 'touchend':
      case 'mouseup':
        // If ending a long-press forward or backward, clear timer
        if (this.intervalId) {
           window.clearInterval(this.intervalId);
           this.intervalId = null;
        }
        else if (this.dragging) {
          // If ending a movement of the slider, end slider movement
          this.handleSliderMoveEnd();
        }

        if (e.type === 'mouseup') {
          // Don'listen for mousemove and mouseup until we get a mousedown
          window.removeEventListener('mousemove', this, true);
          window.removeEventListener('mouseup', this, true);
          this.mouseEventHandlerRegistered = false;
        }
        break;

    case 'loadedmetadata':
      //
      // Metadata has been loaded, now we can set the duration of the media
      //
      this.els.durationText.textContent = this.formatTime(this.mediaPlayer.duration);
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
  }

  if (e.target === this.els.sliderWrapper && (e.type === 'touchstart' || e.type === 'mousedown' ||
           e.type === 'touchmove') ||
           e.type === 'mousemove') {

    var clientX =
      (/mouse/.test(e.type)) ? e.clientX : e.changedTouches[0].clientX;

    switch(e.type) {
      case 'touchstart':
      case 'mousedown':
        if (e.type === 'mousedown') {
          window.addEventListener('mousemove', this, true);
          window.addEventListener('mouseup', this, true);
        }

        this.handleSliderMoveStart(clientX);
        break;

      case 'touchmove':
      case 'mousemove':
        this.handleSliderMove(clientX);
        break;
    }
  }
};

MediaControlsImpl.prototype.updateMediaControlSlider = function() {

  var percent = (this.mediaPlayer.currentTime / this.mediaPlayer.duration) * 100;
  if (isNaN(percent)) {
    return;
  }

  percent += '%';
  this.els.elapsedText.textContent = this.formatTime(this.mediaPlayer.currentTime);
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

  this.seekTo(this.mediaPlayer.duration * pos);
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
  if (!this.isPausedWhileDragging &&
      this.mediaPlayer.currentTime !== this.mediaPlayer.duration) {
    this.mediaPlayer.play();
  }
};

MediaControlsImpl.prototype.formatTime = function(duration) {
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

MediaControlsImpl.prototype.seekBy = function(seekTime) {
  //
  // If seeking will move the media position before the beginning or past
  // the end, stop the auto-seeking (if in progress) and position the media
  // accordingly.
  //
  if (seekTime >= this.mediaPlayer.duration || seekTime < 0) {
    if (this.intervalId) {
       window.clearInterval(this.intervalId);
       this.intervalId = null;
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

  this.seekTo(seekTime);
};

MediaControlsImpl.prototype.seekTo = function(pos) {
  if (this.useFastSeek) {
    this.mediaPlayer.fastSeek(pos);
  }
  else {
    this.mediaPlayer.currentTime = pos;
  }
};

MediaControlsImpl.prototype.unload = function(e) {
  this.removeEventListeners();
};

MediaControlsImpl.prototype.triggerEvent = function(e) {
  var event = document.createEvent("MouseEvents");
  event.initMouseEvent('mousedown', false, false, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
  console.log('dispatching ' + event.type + ' on ' + this.els[this.buttons[e.target]].id);
  this.els[this.buttons[e.target]].dispatchEvent(event);
};

var MediaControls = Component.register('gaia-media-controls', {
  /**
   * 'createdCallback' is called when the element is first created.
   */
  created: function() {
    console.log('creating gaia-media-controls web component...');
  },

  attachTo: function(player) {

    if (this.mediaPlayerImpl) {
      throw new Error('A media player is already attached to the media controls component');
    }

    if (!this.shadowRoot) {
      this.setupShadowRoot();
    }
    this.mediaControlsImpl = new MediaControlsImpl(this, this.shadowRoot, player);
  },

  detachFrom: function() {
    if (this.mediaPlayerImpl) {
      this.mediaPlayerImpl.unload();
      this.mediaPlayerImpl = null;
    }
  },

  triggerEvent: function(event) {
    this.mediaControlsImpl.triggerEvent(event);
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

  .media-controls-container {
    background-color: rgba(0,0,0, 0.85);
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: stretch;
    min-width: 30rem;
  }

  /* video bar -- duration, time slider, elapsed time */
  .time-slider-bar {
    display: flex;
    flex-flow: row;
    align-items: center;
    font-size: 0;
    border-bottom: 0.1rem solid rgba(255,255,255, 0.1);
    white-space: nowrap;
  }

  .elapsed-text,
  .slider-wrapper,
  .duration-text {

    line-height: 4.2rem;
  }

  /* 1. elapsed-text and duration-text have padding on left and right
        to support ltr and rtl locales */
  /* 2. The elapsed time and duration elements do not grow and shrink
        via the flexbox. They are fixed width */
  .elapsed-text, .duration-text {
    color: #ffffff;
    font-size: 1.4rem;
    padding: 0 1.5rem; /* 1 */
    flex-grow: 0;      /* 2 */
    text-align: center;
    flex-basis: 3.8rem;
    margin-top: 0.3rem;
  }


  /* 1. The slider element grows and shrinks via the flexbox */
  .slider-wrapper {
    height: 4.2rem;
    flex-grow: 1;   /* 1 */
  }

  .progress {
    position: relative;
    pointer-events: none;
    width: 0;
  }

  /* 1. Move up .2rem in order to be vertically centered
   *    with respect to elapsed-time (because time-background
   *    is being positioned below elapsed-time, and elapsed-time
   *    is .3 rem in height).
   *    TODO: why is time-background positioned below elapsed-
   *    time when time-background appears before elapsed-time
   *    in the markup?
   *
   * 2. Ensure the layering order of time background,
        elapsed time, and play head.
   */
  .time-background {
    width: 100%;
    height: 0.1rem;
    top: calc(50% - .2rem); /* 1 */
    background-color: #a6b4b6;
    z-index: 10; /* 2 */
  }

  .elapsed-time {
    height: 0.3rem;
    background-color: #00caf2;
    top: 50%;
    z-index: 20; /* 2 */
  }

  /*
   * 1. Center play-head vertically. play-head is positioned
   *    below elapsed-time, which is .3rem, so it needs to be
   *    moved up .2rem to be centered vertically relative to
   *    elapsed-time.
   *
   * 2. Ensure the layering order of time background,
   *    elapsed time, and play head.
   */
  .play-head {
    top: -0.2rem; /* 1 */
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
    z-index: 30; /* 2 */
  }

  /*
   * Define the 'normal' play-head graphic. Using the 'after' pseudo-element
   * here specifies that the 'normal' (smaller, white) play-head will
   * appear on top of the larger, blue 'active' play-head (specified using
   * the 'before' pseudo-element).
   */
  .play-head:after {
    content: "";
    position: absolute;
    top: calc(50% - 1.15rem);
    left: calc(50% - 1.15rem);
    width: 2.3rem;
    height: 2.3rem;
    border-radius: 50%;
    background-color: #fff;
  }

  /* Define the 'active' play-head graphic (blue, larger than the 'normal'
   * play-head). Using the 'before' pseudo-element specifies that the 'active'
   * play-head will appear under the 'normal' play-head.
   */
  .play-head.active:before {
    content: "";
    position: absolute;
    top: calc(50% - 3.05rem);
    left: calc(50% - 3.05rem);
    width: 6.1rem;
    height: 6.1rem;
    border-radius: 50%;
    background-color: #00CAF2;
  }

  /* video control bar -- rewind, pause/play, forward
   *
   * 1. The buttons should always display left-to-right.
   */
  .video-control-bar {
    display: flex;
    flex-direction: row;
    flex-basis: 4.8rem;
    border-top: 0.1rem solid rgba(255,255,255, 0.1);
    background-color: rgba(0,0,0, 0.95);
    overflow: hidden;
    direction: ltr; /* 1 */
    /*z-index: 10*/;
  }

  .seek-backward,
  .seek-forward,
  .play {
    /* All three elements grow and shrink together by the same proportion */
    flex-grow: 1;
    padding: 0;
  }

  .play.paused:before {
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

  <div class="media-controls-container">
    <div class="time-slider-bar">
      <span class="elapsed-text"></span>
      <div class="slider-wrapper">
        <div class="elapsed-time progress"></div>
        <div class="time-background progress"></div>
        <button class="play-head"></button>
      </div>
      <span class="duration-text"></span>
    </div>
    <div class="video-control-bar">
      <button class="seek-backward player-controls-button" data-icon="skip-back"></button>
      <button class="play player-controls-button" data-icon="pause"></button>
      <button class="seek-forward player-controls-button" data-icon="skip-forward"></button>
    </div>
  </div>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-media-controls',this));
