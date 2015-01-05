/* exported VideoControls */
'use strict';

/**
 * Dependencies
 */
//var MediaUtils = require('./media_utils.js');

var dom = {};
var touchStartID = null;
var isPausedWhileDragging;
var sliderRect;

function VideoControls(domElements) {
  dom = domElements;

  dom.play.addEventListener('click', handlePlayButtonClick);
  dom.seekForward.addEventListener('click', handleSeekForward);
  dom.seekBackward.addEventListener('click', handleSeekBackward);
  var videoToolbar = dom.seekForward.parentElement;
  videoToolbar.addEventListener('contextmenu', handleStartLongPressing);
  videoToolbar.addEventListener('touchend', handleStopLongPressing);
  
  console.log('VideoControls constructor -- after first set of listeners');

  /*
  ** Add slider events (slider dragging)
   */
  dom.sliderWrapper.addEventListener('touchstart', handleSliderTouchStart);
  dom.sliderWrapper.addEventListener('touchmove', handleSliderTouchMove);
  dom.sliderWrapper.addEventListener('touchend', handleSliderTouchEnd);

  console.log('VideoControls constructor -- after second set of listeners');

  console.log('end VideoControls constructor');
}

VideoControls.prototype = {

  foo: function() {
    console.log('foo foo foo foo foo foo foo foo foo foo foo'); 
  },

  enablePlayButton: function() {
    enablePlayButton();
  },

  enablePauseButton: function() {
    enablePauseButton();
  },

  setMediaDurationText: function(duration) {
    dom.durationText.textContent = MediaUtils.formatDuration(duration);
  },

  updateSlider: function(player) {
    updateSlider(player);
  },

  sliderTouchStart: function(event, player) {
    console.log(Date.now() + '--sliderTouchStart begin'); 
    console.log(Date.now() + '--event: ' + event);
    console.log(Date.now() + '--player: ' + player);
    console.log(Date.now() + '--event.changedTouches: ' + event.changedTouches);
    console.log(Date.now() + '--passing touch start event to worker function');
    doSliderTouchStart(event, player);
  },

  sliderTouchMove: function(event, player) {
    sliderTouchMove(event, player);
  },

  sliderTouchEnd: function(event, player, pause) {
    sliderTouchEnd(event, player, pause);
  }
};

/*
** Functions dispatching events to app based on clicks of elements owned by
** this component.
*/
function handlePlayButtonClick() {
  window.dispatchEvent(new CustomEvent('play-button-click'));
  console.log('dispatching play-button-click event');
}

function handleSeekForward() {
  window.dispatchEvent(new CustomEvent('seek-forward-button-click'));
  console.log('dispatching seek-forward-button-click event');
}

function handleSeekBackward() {
  window.dispatchEvent(new CustomEvent('seek-backward-button-click'));
  console.log('dispatching seek-backward-button-click event');
}

function handleStartLongPressing(event) {

  if (event.target.id === dom.seekForward.id) {
    console.log('dispatching longpress-forward-button-click event');
    window.dispatchEvent(new CustomEvent('longpress-forward-button-click'));
  } else if (event.target.id === dom.seekBackward.id) {
    console.log('dispatching longpress-backward-button-click event');
    window.dispatchEvent(new CustomEvent('longpress-backward-button-click'));
  } else {
    return;
  }
}

function handleStopLongPressing(event) {
  console.log('dispatching longpress-stop event');
  window.dispatchEvent(new CustomEvent('longpress-stop', event));
}

function handleSliderTouchStart(event) {
  window.dispatchEvent(new CustomEvent('slider-touch-start', {detail: event}));
}

function handleSliderTouchMove(event) {
  window.dispatchEvent(new CustomEvent('slider-touch-move', {detail: event}));
}

function handleSliderTouchEnd(event) {
  window.dispatchEvent(new CustomEvent('slider-touch-end', {detail: event}));
}
/*
** End functions dispatching events to app based on clicks of elements owned by
** this component.
*/

/*
** "Worker" functions.
*/
function enablePlayButton() {
  dom.play.classList.remove('paused');
}

function enablePauseButton() {
  dom.play.classList.add('paused');
}

function updateSlider(player, dragging) {
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
                  MediaUtils.formatDuration(player.currentTime);
  dom.elapsedTime.style.width = percent;

  // Don't move the play head if the user is dragging it.
  if (!dragging) {
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

/*
** Function returns true when slider movement has been started.
**          returns false when slider movement has not been started.
*/
function doSliderTouchStart(event, player) {
  // We can't do anything if we don't know our duration
  if (player.duration === Infinity) {
    return false;
  }

  // If we have a touch start event, we don't need others.
  if (null != touchStartID) {
    return false;
  }

  touchStartID = event.changedTouches[0].identifier;

  isPausedWhileDragging = player.paused;

  // calculate the slider wrapper size for slider dragging.
  sliderRect = dom.sliderWrapper.getBoundingClientRect();

  if (!isPausedWhileDragging) {
    player.pause();
  }

  sliderTouchMove(event);

  return true;
}

function sliderTouchMove(event) {
  var touch = event.changedTouches.identifiedTouch(touchStartID);
  // We don't care the event not related to touchStartID
  if (!touch) {
    return;
  }

  function getTouchPos() {
    return (navigator.mozL10n.language.direction === 'ltr') ?
       (touch.clientX - sliderRect.left) :
       (sliderRect.right - touch.clientX);
  }

  var touchPos = getTouchPos();

  var pos = touchPos / sliderRect.width;
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

function sliderTouchEnd(event, player, pause) {

  // We don't care the event not related to touchStartID
  if (!event.changedTouches.identifiedTouch(touchStartID)) {
    return false;
  }

  touchStartID = null;

  dom.playHead.classList.remove('active');

  if (player.currentTime === player.duration) {
    pause();
  } else if (!isPausedWhileDragging) {
    player.play();
  }

  return true;
}

module.exports = VideoControls;

