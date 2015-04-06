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
    this.componentTestingHelper = this.mediaControls.enableComponentTesting();
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
    this.componentTestingHelper.disableComponentTesting();
    HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;
  });

  test('play button plays (mouse)', function() {

    this.mediaPlayer.paused = true;

    this.componentTestingHelper.triggerEvent({type: 'mousedown', target: 'play'});

    sinon.assert.calledOnce(this.mediaPlayer.play);
    sinon.assert.notCalled(this.mediaPlayer.pause);
  });
  test('play button plays (touch)', function() {

    this.mediaPlayer.paused = true;

    this.componentTestingHelper.triggerEvent({type: 'touchstart', target: 'play'});

    sinon.assert.calledOnce(this.mediaPlayer.play);
    sinon.assert.notCalled(this.mediaPlayer.pause);
  });

  test('play button pauses (mouse)', function() {

    this.mediaPlayer.paused = false;

    this.componentTestingHelper.triggerEvent({type: 'mousedown', target: 'play'});

    sinon.assert.notCalled(this.mediaPlayer.play);
    sinon.assert.calledOnce(this.mediaPlayer.pause);
  });

  test('play button pauses (touch)', function() {

    this.mediaPlayer.paused = false;

    this.componentTestingHelper.triggerEvent({type: 'touchstart', target: 'play'});

    sinon.assert.notCalled(this.mediaPlayer.play);
    sinon.assert.calledOnce(this.mediaPlayer.pause);
  });

  test('seek-forward (mouse)', function() {

    this.mediaPlayer.currentTime = 0;
    this.componentTestingHelper.triggerEvent({type: 'mousedown', target: 'seek-forward'});
    assert.equal(this.mediaPlayer.currentTime, 10);
  });

  test('seek-forward (touch)', function() {

    this.mediaPlayer.currentTime = 0;
    this.componentTestingHelper.triggerEvent({type: 'touchstart', target: 'seek-forward'});
    assert.equal(this.mediaPlayer.currentTime, 10);
  });

  test('seek-backward (mouse)', function() {

    this.mediaPlayer.currentTime = 10;
    this.componentTestingHelper.triggerEvent({type: 'mousedown', target: 'seek-backward'});
    assert.equal(this.mediaPlayer.currentTime, 0);
  });

  test('seek-backward (touch)', function() {

    this.mediaPlayer.currentTime = 10;
    this.componentTestingHelper.triggerEvent({type: 'touchstart', target: 'seek-backward'});
    assert.equal(this.mediaPlayer.currentTime, 0);
  });

  test('long press forward (mouse)', function() {

    this.mediaPlayer.currentTime = 0;
    this.componentTestingHelper.triggerEvent({type: 'mousedown', target: 'seek-forward'});

    // Advance the clock two seconds to simulate the user holding the
    // seek-forward button for two seconds -- player should seek
    // forward thirty seconds (10 for the initial press, 20 for holding
    // two seconds).
    this.clock.tick(2000);
    assert.equal(this.mediaPlayer.currentTime, 30);
  });

  test('long press forward (touch)', function() {

    this.mediaPlayer.currentTime = 0;
    this.componentTestingHelper.triggerEvent({type: 'touchstart', target: 'seek-forward'});

    // Advance the clock two seconds to simulate the user holding the
    // seek-forward button for two seconds -- player should seek
    // forward thirty seconds (10 for the initial press, 20 for holding
    // two seconds).
    this.clock.tick(2000);
    assert.equal(this.mediaPlayer.currentTime, 30);
  });

  test('long press backward (mouse)', function() {

    this.mediaPlayer.currentTime = 30;
    this.componentTestingHelper.triggerEvent({type: 'mousedown', target: 'seek-backward'});

    // Advance the clock two seconds to simulate the user holding the
    // seek-backward button for two seconds -- player should seek
    // backward thirty seconds (10 for the initial press, 20 for holding
    // two seconds).
    this.clock.tick(2000);
    assert.equal(this.mediaPlayer.currentTime, 0);

    this.sinon.spy(window, 'clearInterval');
    this.componentTestingHelper.triggerEvent({type: 'mouseup', target: 'seek-backward'});
    sinon.assert.calledOnce(window.clearInterval);
  });

  test('long press backward (touch)', function() {

    this.mediaPlayer.currentTime = 30;
    this.componentTestingHelper.triggerEvent({type: 'touchstart', target: 'seek-backward'});

    // Advance the clock two seconds to simulate the user holding the
    // seek-backward button for two seconds -- player should seek
    // backward thirty seconds (10 for the initial press, 20 for holding
    // two seconds).
    this.clock.tick(2000);
    assert.equal(this.mediaPlayer.currentTime, 0);

    this.sinon.spy(window, 'clearInterval');
    this.componentTestingHelper.triggerEvent({type: 'touchend', target: 'seek-backward'});
    sinon.assert.calledOnce(window.clearInterval);
  });

  test('start moving slider (don\'nt know media duration)', function() {
    this.mediaPlayer.currentTime = 1;
    this.mediaPlayer.duration = Infinity;
    this.componentTestingHelper.triggerEvent({
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

    this.componentTestingHelper.triggerEvent({
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

    this.componentTestingHelper.triggerEvent({
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

    this.componentTestingHelper.triggerEvent({
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

    this.componentTestingHelper.triggerEvent({
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

    this.componentTestingHelper.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 50}
    });
    this.componentTestingHelper.triggerEvent({
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

    this.componentTestingHelper.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 25}
    });
    this.componentTestingHelper.triggerEvent({
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

    this.componentTestingHelper.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 50}
    });
    this.componentTestingHelper.triggerEvent({
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

    console.log('durationText: ' + this.componentTestingHelper.getElement('duration-text'));
    this.componentTestingHelper.triggerEvent({
      type: 'touchstart',
      target: 'slider-wrapper',
      detail: {clientX: 100}
    });
    this.componentTestingHelper.triggerEvent({
      type: 'touchend',
      target: 'slider-wrapper',
    });
    // 'pause' was invoked on media player during processing of 'touchstart'
    sinon.assert.calledOnce(this.mediaPlayer.pause);
    sinon.assert.notCalled(this.mediaPlayer.play);
  })

  test('\'loadedmetadata\' event', function() {
    var mediaDuration = 50;
    var expectedMediaDuration = '00:' + mediaDuration;
    this.mediaPlayer.duration = mediaDuration;

    this.componentTestingHelper.triggerEvent({
      type: 'loadedmetadata',
      target: 'media-player',
    });

    var durationTextContent =
      this.componentTestingHelper.getElement('duration-text').textContent;
    assert.equal(durationTextContent, expectedMediaDuration);
  });

  test('\'play\' event', function() {
    var playButton =
      this.componentTestingHelper.getElement('play');

    // Simulate media being paused
    playButton.classList.add('paused');

    this.componentTestingHelper.triggerEvent({
      type: 'play',
      target: 'media-player',
    });

    assert.isFalse(playButton.classList.contains('paused'));
    assert.equal(playButton.getAttribute('data-l10n-id'), 'playbackPlay');
  });

  test('\'pause\' event', function() {
    var playButton =
      this.componentTestingHelper.getElement('play');

    // Simulate media playing
    playButton.classList.remove('paused');

    this.componentTestingHelper.triggerEvent({
      type: 'pause',
      target: 'media-player',
    });

    assert.isTrue(playButton.classList.contains('paused'));
    assert.equal(playButton.getAttribute('data-l10n-id'), 'playbackPause');
  });

  /*
   * Test 'timeupdate' event where play head is moved from left to right
   */
  test('\'timeupdate\' event (ltr)', function() {
    var elapsedTextElement =
      this.componentTestingHelper.getElement('elapsed-text');
    var elapsedTimeElement =
      this.componentTestingHelper.getElement('elapsed-time');
    var playHeadElement =
      this.componentTestingHelper.getElement('play-head');

    var mediaDuration = 50;
    var currentTime = 10;
    this.mediaPlayer.duration = mediaDuration;
    this.mediaPlayer.currentTime = currentTime;
    var exptectedElapsedTimePercent = (currentTime / mediaDuration) * 100 + '%';
    var expectedElapsedText = '00:' + currentTime;
    navigator.mozL10n.language.direction = 'ltr';

    this.componentTestingHelper.triggerEvent({
      type: 'timeupdate',
      target: 'media-player',
    });

    assert.equal(elapsedTextElement.textContent, expectedElapsedText);
    assert.equal(elapsedTimeElement.style.width, exptectedElapsedTimePercent);
    assert.equal(playHeadElement.style.left, exptectedElapsedTimePercent);
  });

  /*
   * Test 'timeupdate' event where play head is moved from right to left
   */
  test('\'timeupdate\' event (rtl)', function() {
    var elapsedTextElement =
      this.componentTestingHelper.getElement('elapsed-text');
    var elapsedTimeElement =
      this.componentTestingHelper.getElement('elapsed-time');
    var playHeadElement =
      this.componentTestingHelper.getElement('play-head');

    var mediaDuration = 50;
    var currentTime = 10;
    this.mediaPlayer.duration = mediaDuration;
    this.mediaPlayer.currentTime = currentTime;
    var exptectedElapsedTimePercent = (currentTime / mediaDuration) * 100 + '%';
    var expectedElapsedText = '00:' + currentTime;
    navigator.mozL10n.language.direction = 'rtl';

    this.componentTestingHelper.triggerEvent({
      type: 'timeupdate',
      target: 'media-player',
    });

    assert.equal(elapsedTextElement.textContent, expectedElapsedText);
    assert.equal(elapsedTimeElement.style.width, exptectedElapsedTimePercent);
    assert.equal(playHeadElement.style.right, exptectedElapsedTimePercent);
  });

  test('\'timeupdate\' event (controls hidden)', function() {
    var elapsedTextElement =
      this.componentTestingHelper.getElement('elapsed-text');
    var elapsedTimeElement =
      this.componentTestingHelper.getElement('elapsed-time');
    var playHeadElement =
      this.componentTestingHelper.getElement('play-head');

    var exptectedElapsedTimePercent = '10%';
    var expectedElapsedText = '00:10';
    navigator.mozL10n.language.direction = 'ltr';

    elapsedTextElement.textContent = expectedElapsedText;
    elapsedTimeElement.style.width = exptectedElapsedTimePercent;
    playHeadElement.style.left = exptectedElapsedTimePercent;

    this.mediaPlayer.duration = 50;
    this.mediaPlayer.currentTime = 40;
    this.mediaControls.hidden = true;

    this.componentTestingHelper.triggerEvent({
      type: 'timeupdate',
      target: 'media-player',
    });

    assert.equal(elapsedTextElement.textContent, expectedElapsedText);
    assert.equal(elapsedTimeElement.style.width, exptectedElapsedTimePercent);
    assert.equal(playHeadElement.style.left, exptectedElapsedTimePercent);
  });

  /*
   * Test 'seeked' event where play head is moved from left to right
   */
  test('\'seeked\' event (ltr)', function() {
    var elapsedTextElement =
      this.componentTestingHelper.getElement('elapsed-text');
    var elapsedTimeElement =
      this.componentTestingHelper.getElement('elapsed-time');
    var playHeadElement =
      this.componentTestingHelper.getElement('play-head');

    var mediaDuration = 50;
    var currentTime = 10;
    this.mediaPlayer.duration = mediaDuration;
    this.mediaPlayer.currentTime = currentTime;
    var exptectedElapsedTimePercent = (currentTime / mediaDuration) * 100 + '%';
    var expectedElapsedText = '00:' + currentTime;
    navigator.mozL10n.language.direction = 'ltr';

    this.componentTestingHelper.triggerEvent({
      type: 'seeked',
      target: 'media-player',
    });

    assert.equal(elapsedTextElement.textContent, expectedElapsedText);
    assert.equal(elapsedTimeElement.style.width, exptectedElapsedTimePercent);
    assert.equal(playHeadElement.style.left, exptectedElapsedTimePercent);
  });

  /*
   * Test 'seeked' event where play head is moved from right to left
   */
  test('\'seeked\' event (rtl)', function() {
    var elapsedTextElement =
      this.componentTestingHelper.getElement('elapsed-text');
    var elapsedTimeElement =
      this.componentTestingHelper.getElement('elapsed-time');
    var playHeadElement =
      this.componentTestingHelper.getElement('play-head');

    var mediaDuration = 50;
    var currentTime = 10;
    this.mediaPlayer.duration = mediaDuration;
    this.mediaPlayer.currentTime = currentTime;
    var exptectedElapsedTimePercent = (currentTime / mediaDuration) * 100 + '%';
    var expectedElapsedText = '00:' + currentTime;
    navigator.mozL10n.language.direction = 'rtl';

    this.componentTestingHelper.triggerEvent({
      type: 'seeked',
      target: 'media-player',
    });

    assert.equal(elapsedTextElement.textContent, expectedElapsedText);
    assert.equal(elapsedTimeElement.style.width, exptectedElapsedTimePercent);
    assert.equal(playHeadElement.style.right, exptectedElapsedTimePercent);
  });

  /*
   * Test 'ended' event where media is played until the end
   */
  test('\'ended\' event (played until end)', function() {
    // Simulate playing the media until the end by setting currentTime
    // to the duration of the media and generating a 'pause' event
    this.mediaPlayer.duration = 10;
    this.mediaPlayer.currentTime = this.mediaPlayer.duration;
    this.componentTestingHelper.triggerEvent({
      type: 'pause',
      target: 'media-player',
    });

    this.componentTestingHelper.triggerEvent({
      type: 'ended',
      target: 'media-player',
    });

    assert.equal(this.mediaPlayer.currentTime, 0);
  });

  /*
   * Test 'ended' event where media is forwarded to pricisely to the
   * end of the media (currentTime is equal to duration)
   */
  test('\'ended\' event (forward to end exactly)', function() {
    // Simulate the media being forwarded to the end by setting
    // the position to where it will move to the end when
    // forwarded.
    var mediaDuration = 20;
    this.mediaPlayer.duration = mediaDuration;
    this.mediaPlayer.currentTime = 10;
    this.componentTestingHelper.triggerEvent({
      type: 'touchstart',
      target: 'seek-forward'
    });

    this.componentTestingHelper.triggerEvent({
      type: 'ended',
      target: 'media-player',
    });

    assert.equal(this.mediaPlayer.currentTime, mediaDuration);
  });

  /*
   * Test 'ended' event where media is forwarded such that it would
   * end up past the end based on the position of currentTime before
   * the forwarding.
   */
  test('\'ended\' event (forward to end -- past the end)', function() {
    // Simulate the media being forwarded to the end by setting
    // the position to where it will move to the end when
    // forwarded.
    var mediaDuration = 20;
    this.mediaPlayer.duration = mediaDuration;
    this.mediaPlayer.currentTime = (mediaDuration - 1);
    this.componentTestingHelper.triggerEvent({
      type: 'touchstart',
      target: 'seek-forward'
    });

    this.componentTestingHelper.triggerEvent({
      type: 'ended',
      target: 'media-player',
    });

    assert.equal(this.mediaPlayer.currentTime, mediaDuration);
  });
});
