/* exported MediaControls */
'use strict';

/**
 * Dependencies
 */
var ForwardRewindController = require('./forward_rewind_controller.js');

function MediaControls(domElements) {
  this.dom = domElements;
  this.touchStartID = null;
  this.isPausedWhileDragging = null;
  this.dragging = false;
  this.sliderRect = null;
  this.endedTimer = null;
  this.player = null;
  this.forwardRewindController = new ForwardRewindController();
  this.touchEndedTime = null;
  this.playedUntilEnd = false;
}

MediaControls.prototype = {

  initialize: function(playerElement) {

    this.player = playerElement;

    this.forwardRewindController.init(this.player);

    /*
    ** play/rewind/forward events
    */
    this.dom.play.addEventListener(
      'click', handlePlayButton.bind(this));
    this.dom.seekForward.addEventListener(
      'click', handleSeekForward.bind(this));
    this.dom.seekBackward.addEventListener(
      'click', handleSeekBackward.bind(this));

    var videoToolbar = this.dom.seekForward.parentElement;
    videoToolbar.addEventListener(
      'contextmenu', handleStartLongPressing.bind(this));
    videoToolbar.addEventListener(
      'touchend', handleStopLongPressing.bind(this));

    /*
    ** slider
    */
    var sliderWrapper = this.dom.sliderWrapper;
    sliderWrapper.addEventListener(
      'touchstart', handleSliderTouchStart.bind(this));
    sliderWrapper.addEventListener(
      'touchmove', handleSliderTouchMove.bind(this));
    sliderWrapper.addEventListener(
      'touchend', handleSliderTouchEnd.bind(this));

    /*
    ** The fullscreen button
    */
    this.dom.fullscreenButton.addEventListener(
      'click', handleFullscreenButton.bind(this));

    /*
    ** Media loading
    */
    this.player.addEventListener(
      'loadedmetadata', handleLoadedMetadata.bind(this));

    /*
    ** Media player begins playing
    */
    this.player.addEventListener(
      'play', handleMediaPlaying.bind(this));

    /*
    ** Media player is paused
    */
    this.player.addEventListener(
      'pause', handleMediaPaused.bind(this));

    /*
    ** The current playback time of the media has changed
    */
    this.player.addEventListener(
      'timeupdate', handleMediaTimeUpdated.bind(this));

    /*
    ** Media player seek operation
    */
    this.player.addEventListener(
      'seeked', handleMediaSeeked.bind(this));

    /*
    ** Media player playback stopped
    */ 
    this.player.addEventListener(
      'ended', handlePlayerEnded.bind(this));
  }
};

/*
** Functions handling events.
*/
function handlePlayButton() {
  this.dom.mediaControlsComponent.dispatchEvent(
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

function handleStopLongPressing(event) {
  this.forwardRewindController.handleLongPressStop();
}

function handleFullscreenButton(event) {
  this.dom.mediaControlsComponent.dispatchEvent(
    new CustomEvent('fullscreen-button-click', {detail: event}));
}

function handleMediaPlaying() {
  this.dom.play.classList.remove('paused');
}

function handleMediaPaused() {
  this.dom.play.classList.add('paused');
  // If the paused event comes when the media is at the end,
  // set our 'played-till-end' flag. The one exception is when
  // the paused event comes from the forwardRewindController
  // pausing the media when the forward button was used to seek
  // to the end while the media was playing. In this case, we
  // don't consider the media being played until the end.
  if (this.player.currentTime === this.player.duration) {
    if (this.forwardRewindController.pausedAtEndWhilePlaying) {
      this.forwardRewindController.pausedAtEndWhilePlaying = false;
    }
    else {
      this.playedUntilEnd = true;
    }
  }
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
  if (!this.dom.mediaControlsComponent.hidden) {
    // We can't update a progress bar if we don't know how long
    // the video is. It is kind of a bug that the <video> element
    // can't figure this out for ogv videos.
    if (this.player.duration === Infinity || this.player.duration === 0) {
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
    if (!this.dragging && this.player.currentTime >= this.player.duration - 1) {
      var timeUntilEnd = (this.player.duration - this.player.currentTime + .5);
      this.endedTimer = setTimeout(playerEnded, timeUntilEnd * 1000);
    }
  } else if (this.dragging &&
             this.player.currentTime < this.player.duration - 1) {
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
  if (this.player.seeking) {
    return;
  }

  var percent = (this.player.currentTime / this.player.duration) * 100;
  if (isNaN(percent)) {
    return;
  }

  percent += '%';

  this.dom.elapsedText.textContent = formatDuration(this.player.currentTime);
  this.dom.elapsedTime.style.width = percent;

  // Don't move the play head if the user is dragging it.
  if (!this.dragging) {
    movePlayHead.call(this, percent);
  }
}

function movePlayHead(percent) {
  if (navigator.mozL10n.language.direction === 'ltr') {
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
    this.player.currentTime = 0;
    this.playedUntilEnd = false;
  }
}

function handleSliderTouchStart(event) {

  // We can't do anything if we don't know our duration
  if (this.player.duration === Infinity) {
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
  if (this.player.paused) {
    this.isPausedWhileDragging = true;
  }
  else {
    this.isPausedWhileDragging = false;
    this.player.pause();
  }
  
  // calculate the slider wrapper size for slider dragging.
  this.sliderRect = this.dom.sliderWrapper.getBoundingClientRect();

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
  this.dom.playHead.classList.add('active');
  movePlayHead.call(this, percent);
  this.dom.elapsedTime.style.width = percent;
  this.player.fastSeek(player.duration * pos);
}

function handleSliderTouchEnd(event) {

  this.touchEndedTime = Date.now();

  // We don't care the event not related to touchStartID
  if (!event.changedTouches.identifiedTouch(this.touchStartID)) {
    return false;
  }

  this.touchStartID = null;
  this.dragging = false;

  this.dom.playHead.classList.remove('active');

  // If the media was playing when the user began dragging the slider
  // (and the slider was not dragged to the end), begin playing the
  // media.
  if (!(this.isPausedWhileDragging ||
        this.player.currentTime === this.player.duration)) {
    this.player.play();
  }
}

function handleLoadedMetadata() {
  this.dom.durationText.textContent = formatDuration(this.player.duration);
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

function handleSeekForward() {
  this.forwardRewindController.handleSeekForward();
}

function handleSeekBackward() {
  this.forwardRewindController.handleSeekBackward();
}

module.exports = MediaControls;

