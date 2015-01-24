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

