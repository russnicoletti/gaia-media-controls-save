(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
;(function(define){define(function(require,exports,module){
'use strict';

var textContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
var removeAttribute = HTMLElement.prototype.removeAttribute;
var setAttribute = HTMLElement.prototype.setAttribute;
var noop  = function() {};

/**
 * Detects presence of shadow-dom
 * CSS selectors.
 *
 * @return {Boolean}
 */
var hasShadowCSS = (function() {
  var div = document.createElement('div');
  try { div.querySelector(':host'); return true; }
  catch (e) { return false; }
})();

/**
 * Register a new component.
 *
 * @param  {String} name
 * @param  {Object} props
 * @return {constructor}
 * @public
 */
module.exports.register = function(name, props) {
  injectGlobalCss(props.globalCss);
  delete props.globalCSS;

  var proto = Object.assign(Object.create(base), props);
  var output = extractLightDomCSS(proto.template, name);
  var _attrs = Object.assign(props.attrs || {}, attrs);

  proto.template = output.template;
  proto.lightCss = output.lightCss;

  Object.defineProperties(proto, _attrs);

  // Register and return the constructor
  // and expose `protoytpe` (bug 1048339)
  var El = document.registerElement(name, { prototype: proto });
  return El;
};

var base = Object.assign(Object.create(HTMLElement.prototype), {
  attributeChanged: noop,
  attached: noop,
  detached: noop,
  created: noop,
  template: '',

  createdCallback: function() {
    this.injectLightCss(this);
    this.created();
  },

  /**
   * It is very common to want to keep object
   * properties in-sync with attributes,
   * for example:
   *
   *   el.value = 'foo';
   *   el.setAttribute('value', 'foo');
   *
   * So we support an object on the prototype
   * named 'attrs' to provide a consistent
   * way for component authors to define
   * these properties. When an attribute
   * changes we keep the attr[name]
   * up-to-date.
   *
   * @param  {String} name
   * @param  {String||null} from
   * @param  {String||null} to
   */
  attributeChangedCallback: function(name, from, to) {
    if (this.attrs && this.attrs[name]) { this[name] = to; }
    this.attributeChanged(name, from, to);
  },

  attachedCallback: function() { this.attached(); },
  detachedCallback: function() { this.detached(); },

  /**
   * Sets an attribute internally
   * and externally. This is so that
   * we can style internal shadow-dom
   * content.
   *
   * @param {String} name
   * @param {String} value
   */
  setAttr: function(name, value) {
    var internal = this.shadowRoot.firstElementChild;
    setAttribute.call(internal, name, value);
    setAttribute.call(this, name, value);
  },

  /**
   * Removes an attribute internally
   * and externally. This is so that
   * we can style internal shadow-dom
   * content.
   *
   * @param {String} name
   * @param {String} value
   */
  removeAttr: function() {
    var internal = this.shadowRoot.firstElementChild;
    removeAttribute.call(internal, name, value);
    removeAttribute.call(this, name, value);
  },

  /**
   * The Gecko platform doesn't yet have
   * `::content` or `:host`, selectors,
   * without these we are unable to style
   * user-content in the light-dom from
   * within our shadow-dom style-sheet.
   *
   * To workaround this, we clone the <style>
   * node into the root of the component,
   * so our selectors are able to target
   * light-dom content.
   *
   * @private
   */
  injectLightCss: function(el) {
    if (hasShadowCSS) { return; }
    this.lightStyle = document.createElement('style');
    this.lightStyle.setAttribute('scoped', '');
    this.lightStyle.innerHTML = el.lightCss;
    el.appendChild(this.lightStyle);
  }
});

var attrs = {
  textContent: {
    set: function(value) {
      var node = firstChildTextNode(this);
      if (node) { node.nodeValue = value; }
    },

    get: function() {
      var node = firstChildTextNode(this);
      return node && node.nodeValue;
    }
  }
};

function firstChildTextNode(el) {
  for (var i = 0; i < el.childNodes.length; i++) {
    var node = el.childNodes[i];
    if (node && node.nodeType === 3) { return node; }
  }
}

/**
 * Extracts the :host and ::content rules
 * from the shadow-dom CSS and rewrites
 * them to work from the <style scoped>
 * injected at the root of the component.
 *
 * @return {String}
 */
function extractLightDomCSS(template, name) {
  var regex = /(?::host|::content)[^{]*\{[^}]*\}/g;
  var lightCss = '';

  if (!hasShadowCSS) {
    template = template.replace(regex, function(match) {
      lightCss += match.replace(/::content|:host/g, name);
      return '';
    });
  }

  return {
    template: template,
    lightCss: lightCss
  };
}

/**
 * Some CSS rules, such as @keyframes
 * and @font-face don't work inside
 * scoped or shadow <style>. So we
 * have to put them into 'global'
 * <style> in the head of the
 * document.
 *
 * @param  {String} css
 */
function injectGlobalCss(css) {
  if (!css) return;
  var style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-component',this));
},{}],2:[function(require,module,exports){
(function(define){define(function(require,exports,module){
/*jshint laxbreak:true*/

/**
 * Exports
 */

var base = window.GAIA_ICONS_BASE_URL
  || window.COMPONENTS_BASE_URL
  || 'bower_components/';

// Load it if it's not already loaded
if (!isLoaded()) { load(base + 'gaia-icons/gaia-icons.css'); }

function load(href) {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  document.head.appendChild(link);
  exports.loaded = true;
}

function isLoaded() {
  return exports.loaded ||
    document.querySelector('link[href*=gaia-icons]') ||
    document.documentElement.classList.contains('gaia-icons-loaded');
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-icons',this));

},{}],3:[function(require,module,exports){
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

},{"./lib/video_controls":4,"gaia-component":1,"gaia-icons":2}],4:[function(require,module,exports){
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


},{}]},{},[3]);
