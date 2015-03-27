/*global window,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true*/

function registerComponent(name, props) {
  var baseElement = Object.create(HTMLElement.prototype);
  var elemProto = Object.assign(baseElement, props);
  var elem = document.registerElement(name, { prototype: elemProto });
  return elem;
}

suite('GaiaMediaControls', function() {
  'use strict';

  var nativeMozL10n;
  var getBoundingClientRect;

  suiteSetup(function() {

    registerComponent('mock-video', {
      createdCallback: function() {
        console.log('creating mock-video web component...');
      },

      play: function() {},

      pause: function() {},

      fastSeek: function(pos) {
        this.currentTime = pos;
      }
    });

    nativeMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    this.clientRect = {'width': 100};
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  setup(function() {
    this.sinon = sinon.sandbox.create();
    this.clock = sinon.useFakeTimers();

    // DOM container to put test cases
    this.dom = document.createElement('div');
    this.dom.innerHTML = `<mock-video id="media-player"></mock-video>
                          <gaia-media-controls id="media-controls" media-player-id="media-player">
                          </gaia-media-controls>`;
    document.body.appendChild(this.dom);

    this.mediaControls = document.getElementById('media-controls');
    this.mediaPlayer = document.getElementById('media-player');
    this.mediaControls.attachTo(this.mediaPlayer);
    this.mediaControls.enableComponentTesting();
    this.sinon.spy(this.mediaPlayer, 'play');
    this.sinon.spy(this.mediaPlayer, 'pause');

    // Mock the getBoundingClientRect function so the test
    // can dictate the dimensions of the slider bar.
    getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    var self = this;
    var mockGetBoundingClientRect = function() {
      var clientRect = {'width': 100};
      if (navigator.mozL10n.language.direction === 'ltr') {
        clientRect.left = self.clientRect.left;
      }
      else if (navigator.mozL10n.language.direction === 'rtl') {
        clientRect.right = self.clientRect.right;
      }

      return clientRect;
   };
		HTMLElement.prototype.getBoundingClientRect = mockGetBoundingClientRect;
  });

  teardown(function() {
    this.sinon.restore();
    this.dom.remove();
    this.clock.restore();
    this.mediaControls.disableComponentTesting();
    HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;
  });

  test('play button plays (mouse)', function() {

    this.mediaPlayer.paused = true;

    this.mediaControls.triggerEvent({type: 'mousedown', target: 'play'});

    sinon.assert.calledOnce(this.mediaPlayer.play);
    sinon.assert.notCalled(this.mediaPlayer.pause);
  });

  test('play button plays (touch)', function() {

    this.mediaPlayer.paused = true;

    this.mediaControls.triggerEvent({type: 'touchstart', target: 'play'});

    sinon.assert.calledOnce(this.mediaPlayer.play);
    sinon.assert.notCalled(this.mediaPlayer.pause);
  });

  test('play button pauses (mouse)', function() {

    this.mediaPlayer.paused = false;

    this.mediaControls.triggerEvent({type: 'mousedown', target: 'play'});

    sinon.assert.notCalled(this.mediaPlayer.play);
    sinon.assert.calledOnce(this.mediaPlayer.pause);
  });

  test('play button pauses (touch)', function() {

    this.mediaPlayer.paused = false;

    this.mediaControls.triggerEvent({type: 'touchstart', target: 'play'});

    sinon.assert.notCalled(this.mediaPlayer.play);
    sinon.assert.calledOnce(this.mediaPlayer.pause);
  });

  test('seek-forward (mouse)', function() {

    this.mediaPlayer.currentTime = 0;
    this.mediaControls.triggerEvent({type: 'mousedown', target: 'seek-forward'});
    assert.equal(this.mediaPlayer.currentTime, 10);
  });

  test('seek-forward (touch)', function() {

    this.mediaPlayer.currentTime = 0;
    this.mediaControls.triggerEvent({type: 'touchstart', target: 'seek-forward'});
    assert.equal(this.mediaPlayer.currentTime, 10);
  });

  test('seek-backward (mouse)', function() {

    this.mediaPlayer.currentTime = 10;
    this.mediaControls.triggerEvent({type: 'mousedown', target: 'seek-backward'});
    assert.equal(this.mediaPlayer.currentTime, 0);
  });

  test('seek-backward (touch)', function() {

    this.mediaPlayer.currentTime = 10;
    this.mediaControls.triggerEvent({type: 'touchstart', target: 'seek-backward'});
    assert.equal(this.mediaPlayer.currentTime, 0);
  });

  test('long press forward (mouse)', function() {

    this.mediaPlayer.currentTime = 0;
    this.mediaControls.triggerEvent({type: 'mousedown', target: 'seek-forward'});

    // Advance the clock two seconds to simulate the user holding the
    // seek-forward button for two seconds -- player should seek
    // forward thirty seconds (10 for the initial press, 20 for holding
    // two seconds).
    this.clock.tick(2000);
    assert.equal(this.mediaPlayer.currentTime, 30);
  });

  test('long press forward (touch)', function() {

    this.mediaPlayer.currentTime = 0;
    this.mediaControls.triggerEvent({type: 'touchstart', target: 'seek-forward'});

    // Advance the clock two seconds to simulate the user holding the
    // seek-forward button for two seconds -- player should seek
    // forward thirty seconds (10 for the initial press, 20 for holding
    // two seconds).
    this.clock.tick(2000);
    assert.equal(this.mediaPlayer.currentTime, 30);
  });

  test('long press backward (mouse)', function() {

    this.mediaPlayer.currentTime = 30;
    this.mediaControls.triggerEvent({type: 'mousedown', target: 'seek-backward'});

    // Advance the clock two seconds to simulate the user holding the
    // seek-backward button for two seconds -- player should seek
    // backward thirty seconds (10 for the initial press, 20 for holding
    // two seconds).
    this.clock.tick(2000);
    assert.equal(this.mediaPlayer.currentTime, 0);

    this.sinon.spy(window, 'clearInterval');
    this.mediaControls.triggerEvent({type: 'mouseup', target: 'seek-backward'});
    sinon.assert.calledOnce(window.clearInterval);
  });

  test('long press backward (touch)', function() {

    this.mediaPlayer.currentTime = 30;
    this.mediaControls.triggerEvent({type: 'touchstart', target: 'seek-backward'});

    // Advance the clock two seconds to simulate the user holding the
    // seek-backward button for two seconds -- player should seek
    // backward thirty seconds (10 for the initial press, 20 for holding
    // two seconds).
    this.clock.tick(2000);
    assert.equal(this.mediaPlayer.currentTime, 0);

    this.sinon.spy(window, 'clearInterval');
    this.mediaControls.triggerEvent({type: 'touchend', target: 'seek-backward'});
    sinon.assert.calledOnce(window.clearInterval);
  });

  test('start moving slider (don\'nt know media duration)', function() {
    this.mediaPlayer.currentTime = 1;
    this.mediaPlayer.duration = Infinity;
    this.mediaControls.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 50}
    });

    assert.equal(this.mediaPlayer.currentTime, 1);
  });

  /*
   * Test for 'touchstart' on the slider while while the media is
   * playing and the text direation is 'ltr' (the 'clientX' property
   * of the 'touchstart' event is relative to the 'left' position of
   * the slider).
   * Media should be paused and media player should seek forward
   * the appropriate number of seconds.
   */
  test('start moving slider (media is playing), dir is ltr', function() {

    this.clientRect.left = 0;
    this.mediaPlayer.currentTime = 1;
    this.mediaPlayer.duration = 100;
    this.mediaPlayer.paused = false;
    navigator.mozL10n.language.direction = 'ltr';

    this.mediaControls.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 50} // *touch* is 50 pixels from the slider 'left'.
    });                     // Media player should seek 50% (to 50 secs)

    assert.equal(Math.floor(this.mediaPlayer.currentTime), 50);
    sinon.assert.notCalled(this.mediaPlayer.play);
    sinon.assert.calledOnce(this.mediaPlayer.pause);
  });

  /*
   * Same as 'touchstart' test above except with a 'mousedown' event
   */
  test('start moving slider (media is playing), dir is ltr', function() {

    this.clientRect.left = 0;
    this.mediaPlayer.currentTime = 1;
    this.mediaPlayer.duration = 100;
    this.mediaPlayer.paused = false;
    navigator.mozL10n.language.direction = 'ltr';

    this.mediaControls.triggerEvent({
      type: 'mousedown',
      target: 'slider-wrapper',
      detail: {clientX: 50} // *touch* is 50 pixels from the slider 'left'.
    });                     // Media player should seek 50% (to 50 secs)

    assert.equal(Math.floor(this.mediaPlayer.currentTime), 50);
    sinon.assert.notCalled(this.mediaPlayer.play);
    sinon.assert.calledOnce(this.mediaPlayer.pause);
  });

  /*
   * Test for 'touchstart' on the slider while the media is paused and
   * the text direation is 'ltr' (the 'clientX' property of the
   * 'touchstart' event is relative to the 'left' position of the
   * slider).
   * Media should remain paused and media player should seek forward
   * the appropriate number of seconds.
   */
  test('start moving slider (media is paused), dir is ltr', function() {

    this.clientRect.left = 0;
    this.mediaPlayer.currentTime = 1;
    this.mediaPlayer.duration = 100;
    this.mediaPlayer.paused = true;
    navigator.mozL10n.language.direction = 'ltr';

    this.mediaControls.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 25} // *touch* is 25 pixels from the slider 'left'.
    });                     // Media player should seek 25% (to 25 secs)

    assert.equal(Math.floor(this.mediaPlayer.currentTime), 25);
    sinon.assert.notCalled(this.mediaPlayer.play);
    sinon.assert.notCalled(this.mediaPlayer.pause);
  });

  /*
   * Test for 'touchstart' on the slider while the media is paused and
   * the text direation is 'rtl' (the 'clientX' property of the
   * 'touchstart' event is relative to the 'right' position of the
   * slider).
   * Media should remain paused and media player should seek forward
   * the appropriate number of seconds.
   */
  test('start moving slider (media is playing), dir is rtl', function() {

    this.clientRect.right = this.clientRect.width;
    this.mediaPlayer.currentTime = 1;
    this.mediaPlayer.duration = 100;
    this.mediaPlayer.paused = false;
    navigator.mozL10n.language.direction = 'rtl';

    this.mediaControls.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 95} // *touch* is 5 pixels from the slider 'right'.
    });                     // Media player should seek 5% (to 5 secs)

    assert.equal(Math.floor(this.mediaPlayer.currentTime), 5);
    sinon.assert.calledOnce(this.mediaPlayer.pause);
  });

  test('Moving slider, direction is ltr', function() {
    this.clientRect.left = 0;
    this.mediaPlayer.currentTime = 1;
    this.mediaPlayer.duration = 100;
    this.mediaPlayer.paused = false;
    navigator.mozL10n.language.direction = 'ltr';

    this.mediaControls.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 50}
    });
    this.mediaControls.triggerEvent({
      type: 'touchmove',
      target: 'slider-wrapper',
      detail: {clientX: 75}
    });

    assert.equal(Math.floor(this.mediaPlayer.currentTime), 75);
  });

  test('Moving slider, direction is rtl', function() {
    this.clientRect.right = this.clientRect.width;
    this.mediaPlayer.currentTime = 1;
    this.mediaPlayer.duration = 100;
    this.mediaPlayer.paused = false;
    navigator.mozL10n.language.direction = 'ltr';

    this.mediaControls.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 25}
    });
    this.mediaControls.triggerEvent({
      type: 'touchmove',
      target: 'slider-wrapper',
      detail: {clientX: 55}
    });

    assert.equal(Math.floor(this.mediaPlayer.currentTime), 55);
  });
 
  /*
   * Test for 'touchend' on the slider while the media was playing.
   * Slider has not been moved to the end of the video. Media should
   * be playing (since it was playing before the slider was moved and
   * it was not moved to the end of the media).
   */
  test('end moving slider (media was playing), position not at end', function() {

    this.clientRect.left = 0;
    this.mediaPlayer.currentTime = 1;
    this.mediaPlayer.duration = 100;
    this.mediaPlayer.paused = false;
    navigator.mozL10n.language.direction = 'ltr';

    this.mediaControls.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 50}
    });
    this.mediaControls.triggerEvent({
      type: 'touchend',
      target: 'slider-wrapper'
    });
    // 'pause' was invoked on media player during processing of 'touchstart'
    sinon.assert.calledOnce(this.mediaPlayer.pause);
    // 'play' was invoked on media player during processing of 'touchend'
    sinon.assert.calledOnce(this.mediaPlayer.play);
  });

  /*
   * End moving the slider while the media was playing. Slider
   * has been moved to the end of the video.
   * Media should not be playing (because the slider was moved to
   * the end of the media).
   */
  test('end moving slider (media was playing), position at end', function() {

    this.clientRect.left = 0;
    this.mediaPlayer.currentTime = 1;
    this.mediaPlayer.duration = 100;
    this.mediaPlayer.paused = false;
    navigator.mozL10n.language.direction = 'ltr';

    this.mediaControls.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 100}
    });
    this.mediaControls.triggerEvent({
      type: 'touchend',
      target: 'slider-wrapper',
    });
    // 'pause' was invoked on media player during processing of 'touchstart'
    sinon.assert.calledOnce(this.mediaPlayer.pause);
    sinon.assert.notCalled(this.mediaPlayer.play);
  })});
