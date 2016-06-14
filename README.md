MemoryGame.js
=================

This is a fork of [Mark Rolich](https://github.com/mark-rolich/MemoryGame.js) original version so that I could insert images instead of simple font icons.

It also adds a "hard" difficulty mode.

Demo: https://chezsoi.org/lucas/MemoryGame/


### Pro tip

Using [`jq`](https://stedolan.github.io/jq), you can quickly generate a starting point for your own `MemoryGame.json` from a directory of images :

    $ ls pics/ | jq --raw-input --slurp '{pics: split("\n")[:-1]}' > MemoryGame.json

