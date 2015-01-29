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

function ForwardRewindController() {
  this.isLongPressing = false;
  this.intervalId = null;
  this.player = null;
  this.pausedAtEndWhilePlaying = false;
}

ForwardRewindController.prototype = {

  init: function(mediaPlayer) {
    this.player = mediaPlayer;
  },

  uninit: function(mediaPlayer) {
    this.player = null;
  },

  handleSeekForward: function() {
    startFastSeeking.call(this, 1);
  },

  handleSeekBackward: function() {
    startFastSeeking.call(this, -1);
  },

  handleLongPressForward: function() {
    this.isLongPressing = true;
    startFastSeeking.call(this, 1);
  },

  handleLongPressBackward: function() {
    this.isLongPressing = true;
    startFastSeeking.call(this, -1);
  },

  handleLongPressStop: function() {
    stopFastSeeking.call(this);
  },
};

function startFastSeeking(direction) {

  // direction can be 1 or -1, 1 means forward and -1 means rewind.
  var offset = direction * 10;

  if (this.isLongPressing) {
    this.intervalId = window.setInterval(function() {
      seekVideo.call(this, this.player.currentTime + offset);
    }, 1000);
  } else {
    seekVideo.call(this, this.player.currentTime + offset);
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
  if (seekTime >= this.player.duration || seekTime < 0) {
    if (this.isLongPressing) {
      stopFastSeeking.call(this);
    }
    if (seekTime >= this.player.duration) {
      seekTime = this.player.duration;
      // If the user tries to seek past the end of the media while the media
      // is playing, pause the playback.
      //
      // Also, set a flag so the media controls will know the media wasn't
      // played until the end and therefore does not skip back to the
      // beginning.
      if (!this.player.paused) {
        this.player.pause();
        this.pausedAtEndWhilePlaying = true;
      }
    }
    else {
      seekTime = 0;
    }
  }

  this.player.fastSeek(seekTime);
}

module.exports = ForwardRewindController;

