// Polyfills from https://developer.mozilla.org/en-US/docs/Web
if (!('remove' in Element.prototype)) {
    Element.prototype.remove = function() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    };
}
if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function(predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.findIndex called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return i;
      }
    }
    return -1;
  };
}

var PULSE_DURATION = 1000,
    DISPLAY_CHARS = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVW[\\]^_`abcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜ'.split('');
var MemoryGame = function (gameData) {
    'use strict';

    var changeLevel = function () {
        var btn = this;
        // We update the buttons states:
        [].forEach.call(document.getElementsByClassName('lvlButton'), function(btn) {
            btn.disabled = false;
        });
        btn.disabled = true;

        // We remove the old Level:
        var playfieldWrapper = document.getElementById('playfield-wrapper');
        if (playfieldWrapper.childNodes.length > 1) {
            playfieldWrapper.childNodes[1].remove();
        }

        // We initialize the new Level:
        var lvlParams = gameData.lvls[btn.textContent],
            currentLvl = new Level(lvlParams, gameData.pics, gameData.cardDimensions);

        // We set the help message
        if (gameData.labels.instructions) {
            var infoTextNode = document.getElementById('game-info');
            infoTextNode.innerHTML = gameData.labels.instructions.replace('{{requiredMatches}}', lvlParams.requiredMatches);
        }

        // We set the victory message
        if (gameData.labels.stats) {
            currentLvl.onwin = function (clicks, sucessPercent) {
                infoTextNode.innerHTML = gameData.labels.stats.replace('{{clicks}}', clicks).replace('{{sucessPercent}}', sucessPercent);
            };
        }
    };

    if (gameData.labels.title) {
        document.getElementsByTagName('title')[0].innerHTML = gameData.labels.title;
    }
    if (gameData.labels.header) {
        document.getElementsByTagName('h1')[0].innerHTML = gameData.labels.header;
    }
    if (gameData.labels.footer) {
        document.getElementsByTagName('footer')[0].innerHTML = gameData.labels.footer;
    }
     if (gameData.labels.victory) {
        document.getElementsByClassName('win-text')[0].innerHTML = gameData.labels.victory;
    }

    var lvlList = document.getElementsByClassName('lvlList')[0];
    Object.keys(gameData.lvls).forEach(function (levelName) {
        var button = document.createElement('button');
        button.className = 'lvlButton';
        button.onclick = changeLevel;
        button.textContent = levelName;
        lvlList.appendChild(button);
    });

    var firstLvlButton = document.getElementsByClassName('lvlButton')[0];
    firstLvlButton.click();
};

var Level = function (lvlParams, pics, cardDimensions) {
    "use strict";

    var playfieldWrapper     = document.getElementById('playfield-wrapper'),
        playfield            = document.createElement('div'),
        cards                = [],
        self                 = this,
        matchCount           = 0,
        openCards            = [],
        lastPanicTranslation = 'vertical',
        prepare = function () {
            var picsOrChars = DISPLAY_CHARS;
            if (pics) {
                picsOrChars = pics;
            }
            if ((lvlParams.rows * lvlParams.cols) / lvlParams.requiredMatches > picsOrChars.length) {
                throw new Error('There are not enough cards to display the playing field');
            }
            picsOrChars.shuffle();
            for (var i = 0; i < (lvlParams.rows * lvlParams.cols) / lvlParams.requiredMatches; i++) {
                for (var j = 0; j < lvlParams.requiredMatches; j++) {
                    cards.push(new Card(picsOrChars[i], i, self, cardDimensions));
                }
            }
            cards.shuffle();
        },
        draw = function () {
            var playfieldFrag = document.createDocumentFragment();

            for (var i = 0; i < lvlParams.rows; i++) {
                for (var j = 0; j < lvlParams.cols; j++) {
                    var cardIndex = i * lvlParams.cols + j,
                        card = cards[cardIndex];
                    card.draw(cardIndex);
                    card.domElement.setAttribute('idx', cardIndex);
                    card.domElement.style.top = (i * (cardDimensions.height + cardDimensions.gutter)) + cardDimensions.unit;
                    card.domElement.style.left = '-1000px'; // Initially positionned outside the screen, on the left
                    playfieldFrag.appendChild(card.domElement);
                    // Triggering the arrival transitions, waterfall-style
                    setTimeout(function (card, j) {
                        card.domElement.style.left = (j * (cardDimensions.width + cardDimensions.gutter)) + cardDimensions.unit;
                    }, 100 * cardIndex, card, j);
                }
            }

            playfield.appendChild(playfieldFrag);
            playfieldWrapper.appendChild(playfield);
        },
        play = function (event) {
            var srcElement = event.target;
            if (srcElement.classList.contains('face')) {
                srcElement = srcElement.parentNode;
            }
            if (srcElement.classList.contains('flipper')) {
                srcElement = srcElement.parentNode;
            }
            if (!srcElement.classList.contains('card')) {
                return;
            }

            var cardIndex = srcElement.getAttribute('idx');
            var card = cards[cardIndex];

            if (card.domElement !== srcElement) {
                throw new Error('Incoherent card index: ' + cardIndex);
            }

            if (card.freezed === 1 || openCards.contains(card)) {
                return;
            }

            openCards.push(card);

            if (openCards.length > 1) {
                var lastOpenCard = openCards[openCards.length - 2];
                if (lastOpenCard.pair === card.pair && openCards.length == lvlParams.requiredMatches) { // Pair found !
                    card.flip('faceUp');
                    for (var i = 0; i < openCards.length; i++) {
                        openCards[i].freezed = 1;
                        openCards[i].pulse();
                    }
                    matchCount++;
                    openCards = [];
                    if (lvlParams.panicMode) {
                        if (lastPanicTranslation == 'vertical') {
                            setTimeout(function (cardIndex) {
                                var rowY = Math.floor(cardIndex / lvlParams.cols);
                                triggerHorizontalTranslation(rowY);
                            }, PULSE_DURATION, cardIndex);
                            lastPanicTranslation = 'horizontal';
                        } else {
                            setTimeout(function (cardIndex) {
                                var colX = cardIndex % lvlParams.cols;
                                triggerVerticalTranslation(colX);
                            }, PULSE_DURATION, cardIndex);
                            lastPanicTranslation = 'vertical';
                        }
                    }
                } else {
                    window.setTimeout(function () { // delayed after the face flip
                        if (lvlParams.keptRevealed === 0 && !openCards.every(function (c) { return c.pair == card.pair})) {
                            // Mark Rolich original version behaviour
                            openCards.forEach(function(c) { c.flip('faceDown'); });
                            openCards = [];
                        } else {
                            while (openCards.length > lvlParams.keptRevealed && openCards.some(function (c) { return c.pair != card.pair})) {
                                var cardToHideIndex = openCards.findIndex(function (c) { return c.pair != card.pair});
                                openCards[cardToHideIndex].flip('faceDown');
                                openCards.splice(cardToHideIndex, 1); // remove card from array
                            }
                        }
                    }, 300);
                }

            }
            if (card.state === 'faceDown') {
                card.flip('faceUp');
            }

            if (matchCount === (lvlParams.rows * lvlParams.cols) / lvlParams.requiredMatches) {
                playfieldWrapper.style.top = (lvlParams.rows * (cardDimensions.height + cardDimensions.gutter) / 2) + cardDimensions.unit;
                window.setTimeout(function () {
                    playfield.className = 'play-field win';
                    self.onwin(self.totalClicksCount, Math.round(((lvlParams.rows * lvlParams.cols) * 100) / self.totalClicksCount));
                    playfieldWrapper.className = '';
                }, 1500);

            }
        },
        // Those 2 functions do 3 important things :
        // - update the cards position inside $cards
        // - update their idx attributes
        // - update their style.left/.top
        triggerHorizontalTranslation = function (rowY) {
            var rowYcards = cards.slice(rowY * lvlParams.cols, rowY * lvlParams.cols + lvlParams.cols);
            rowYcards.forEach(function (card) {
                var oldCardIndex = card.domElement.getAttribute('idx'),
                    oldX = oldCardIndex % lvlParams.cols,
                    newX = (oldX + 1) % lvlParams.cols,
                    newCardIndex = rowY * lvlParams.cols + newX;
                cards[newCardIndex] = card;
                card.domElement.setAttribute('idx', newCardIndex);
                card.domElement.style.left = (newX * (cardDimensions.width + cardDimensions.gutter)) + cardDimensions.unit;
            });
        },
        triggerVerticalTranslation = function (colX) {
            var colXcards = cards.map(function (card, cardIndex) {
                    if (cardIndex % lvlParams.cols == colX) {
                        return card;
                    }
                }).filter(function (card) { return card; });
            colXcards.forEach(function (card) {
                var oldCardIndex = card.domElement.getAttribute('idx'),
                    oldY = Math.floor(oldCardIndex / lvlParams.cols),
                    newY = (oldY + 1) % lvlParams.rows,
                    newCardIndex = newY * lvlParams.cols + colX;
                cards[newCardIndex] = card;
                card.domElement.setAttribute('idx', newCardIndex);
                card.domElement.style.top = (newY * (cardDimensions.height + cardDimensions.gutter)) + cardDimensions.unit;
            });
        };

    if (lvlParams.keptRevealed >= lvlParams.requiredMatches) {
        throw new Error('Incorrect level parameters');
    } else if ((lvlParams.rows * lvlParams.cols) % lvlParams.requiredMatches !== 0) {
        throw new Error('$rows x $cols is not a multiple of $requiredMatches');
    }

    playfield.className = 'play-field';
    playfield.style.left = '-' + (lvlParams.cols * (cardDimensions.width + cardDimensions.gutter) / 2) + cardDimensions.unit;
    playfield.onmousedown = play;

    self.totalClicksCount = 0;
    self.onwin = function () {};

    prepare();
    draw();
};

var Card = function (picOrChar, pair, lvl, cardDimensions) {
    this.state      = 'faceDown';
    this.freezed    = 0;
    this.picOrChar  = picOrChar;
    this.pair       = pair;
    this.clicksCnt  = 0;

    var flipper = null,
        front   = null,
        back    = null,
        clicks  = null;

    this.draw = function () {
        this.domElement = document.createElement('div');

        back = this.domElement.cloneNode(false);
        back.className = 'back face';

        front = this.domElement.cloneNode(false);
        front.className = 'front face';
        if (this.picOrChar.length === 1) {
            var txt = document.createTextNode(this.picOrChar);
            front.appendChild(txt);
        } else {
            front.style['background-image'] = 'url("' + this.picOrChar + '")';
        }

        clicks = this.domElement.cloneNode(false);
        clicks.className = 'clicks';
        clicks.appendChild(document.createTextNode('\xA0')); // newline
        front.appendChild(clicks);

        flipper = this.domElement.cloneNode(false);
        flipper.className = 'flipper';
        flipper.appendChild(back);
        flipper.appendChild(front);

        this.domElement.className = 'card';
        this.domElement.style.width = cardDimensions.width + cardDimensions.unit;
        this.domElement.style.height = cardDimensions.height + cardDimensions.unit;

        this.domElement.appendChild(flipper);
    };

    this.flip = function (state) {
        if (state === 'faceUp') {
            flipper.className = 'flipper flipfront';
            front.style.opacity = 1;
            back.style.opacity = 0;

            this.state = 'faceUp';
            this.clicksCnt++;

            clicks.childNodes[0].nodeValue = this.clicksCnt;

            lvl.totalClicksCount++;
        } else if (state === 'faceDown') {
            flipper.className = 'flipper flipback';
            front.style.opacity = 0;
            back.style.opacity = 1;
            this.state = 'faceDown';
        }
    };

    this.pulse = function () {
        flipper.className = 'flipper flipfront pulse';
        window.setTimeout(function () {
            flipper.parentNode.style.opacity = '0.3';
        }, PULSE_DURATION);
    };
};

Array.prototype.shuffle = function () {
    var temp, j, i;

    for (temp, j, i = this.length; i; ) {
        j = parseInt(Math.random () * i);
        temp = this[--i];
        this[i] = this[j];
        this[j] = temp;
    }
};

Array.prototype.contains = function (value) {
    var i, result = false;

    for (i = 0; i < this.length; i++) {
        if (this[i] === value) {
            result = true;
        }
    }

    return result;
};
