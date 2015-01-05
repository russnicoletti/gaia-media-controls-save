/**
 * Dependencies
 */

var Component = require('gaia-component');
var VideoControls = require('./lib/video_controls');
  
// Load 'gaia-icons' font-family
require('gaia-icons');

function toCamelCase(str) {
  return str.replace(/\-(.)/g, function replacer(str, p1) {
    return p1.toUpperCase();
  });
}

var gaiaMediaControls = Component.register('gaia-media-controls', {
  /**
   * Called when the element is first created.
   *
   * Here we create the shadow-root and
   * inject our template into it.
   *
   * @private
   */
  created: function() {
    console.log('creating gaia-media-controls web component...');
    
    var shadowRoot = this.createShadowRoot();
    shadowRoot.innerHTML = this.template;

    var dom = {};
    var ids = [
        'elapsed-text', 'elapsedTime', 'bufferedTime', 'timeBackground', 'duration-text',
        'playHead', 'slider-wrapper', 'seek-backward', 'play', 'seek-forward'
    ];

    console.log('reading dom elements...');
    ids.forEach(function createElementRef(name) {
      dom[toCamelCase(name)] = shadowRoot.getElementById(name);
    });
    console.log('done reading dom elements...');

    this.videoControls = new VideoControls(dom);
    console.log('done instantiating VideoControls');
  },

  foo: function() {
    this.videoControls.foo(); 
  },

  enablePlayButton: function() {
    this.videoControls.enablePlayButton();
  },

  enablePauseButton: function() {
    this.videoControls.enablePauseButton();
  },

  setMediaDurationText: function(duration) {
    this.videoControls.setMediaDurationText(duration);
  },

  updateSlider: function(player) {
    this.videoControls.updateSlider(player);
  },

  handleSliderTouchStart: function(event, player) {
    console.log(Date.now() + '--gaia-media-controls, handleSliderTouchStart begin');
    console.log(Date.now() + '--event.changedTouches: ' + event.changedTouches);
    console.log(Date.now() + '--player: ' + player);
    console.log(Date.now() + '--Invoking VideoControls to handle touch start event');
    this.videoControls.sliderTouchStart(event, player);
  },

  handleSliderTouchMove: function(event, player) {
    this.videoControls.sliderTouchMove(event, player);
  },

  handleSliderTouchEnd: function(event, player, pause) {
    this.videoControls.sliderTouchEnd(event, player, pause);
  },

  template: `
 
  <style>

@font-face {
	font-family: "gaia-icons";
	src: url("fonts/gaia-icons.ttf") format("truetype");
	font-weight: 500;
	font-style: normal;
}

[data-icon]:before,
.ligature-icons {
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
