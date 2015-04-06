## Overview
The gaia-media-controls component provides the standard functionality for controlling HTML video and audio elements. It provides play, pause, rewind, forward, and the ability to dynamically seek by dragging a slider.

## Installation

```bash
$ bower install gaia-components/gaia-media-controls
```

## Demo

- [demo](http://russnicoletti.github.io/media-controls/)

## Example html
```html
  <div id="player-container">
    <video src="about:blank" id="player"></video>
    <gaia-media-controls id="media-controls"></gaia-media-controls>
  </div>
```

## Example javascript 
```html
    var controls = document.getElementById('media-controls');
    var player = document.getElementById('player');

    controls.initialize(player);
    player.preload = 'metadata';
    player.onloadedmetadata = onLoadedMetadata;
    player.src = '...';

    function onLoadedMetadata() {
      player.play();
    }

    controls.addEventListener('play-button-click', function() {
      if (player.paused) {
        player.play();
      }
      else {
        player.pause();
      }
    }
```

