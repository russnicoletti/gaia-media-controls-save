/* exported ForwardRewindController */
/* globals pause */

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
  console.log('ForwardRewindController constructor');
}

ForwardRewindController.prototype = {

  init: function(video) {
    player = video;
  },

  uninit: function(video) {
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
      pause();
    }
    else {
      seekTime = 0;
    }
  }

  player.fastSeek(seekTime);
}

module.exports = ForwardRewindController;

