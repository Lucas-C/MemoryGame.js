var PULSE_DURATION = 1000;

var MemoryGame = function () {
    'use strict';
    var lvls = {
        'easy':   {'rows': 3, 'cols': 4, 'requiredMatches': 2, 'simultaneouslyRevealed': 1},
        'medium': {'rows': 4, 'cols': 7, 'requiredMatches': 2, 'simultaneouslyRevealed': 1, 'panicMode': true},
        'hard':   {'rows': 5, 'cols': 6, 'requiredMatches': 5, 'simultaneouslyRevealed': 2},
    }

    this.changeLevel = function (btn, levelName) {
        // We update the buttons states:
        [].forEach.call(document.getElementsByClassName('lvlButton'), function(btn) {
            btn.disabled = false;
        });
        btn.disabled = true;

        // We remove the old Level:
        var playfieldWrapper = document.getElementById('playfield-wrapper');
        playfieldWrapper.childNodes[0] = document.createTextNode('&nbsp;');
        playfieldWrapper.className = '';

        // We initialize the new Level:
        var lvl = lvls[btn.textContent];
        var currentLvl = new Level(lvl);

        // We set the help message
        var infoTextNode = document.getElementById('game-info');
        infoTextNode.innerHTML = 'Click the cards to reveal <strong>' + lvl.requiredMatches + '</strong> matches';

        // We set the victory message
        currentLvl.onwin = function (clicks, prc) {
            infoTextNode.innerHTML = 'You\'ve found all matches in <strong>' + clicks + '</strong> clicks with <strong>' + prc + '%</strong> efficiency';
        };
    }
    
    var firstLvlButton = document.getElementsByClassName('lvlButton')[0];
    this.changeLevel(firstLvlButton);
};

var Level = function (lvlParams) {
    "use strict";
    
    var cardsList            = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVW[\\]^_`abcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜ'.split(''),
        playfieldWrapper     = document.getElementById('playfield-wrapper'),
        playfield            = document.createElement('div'),
        cards                = [],
        self                 = this,
        matchCount           = 0,
        openCards            = [],
        lastPanicTranslation = 'vertical',
        prepare = function () {
            for (var i = 0; i < (lvlParams.rows * lvlParams.cols) / lvlParams.requiredMatches; i++) {
                for (var j = 0; j < lvlParams.requiredMatches; j++) {
                    cards.push(new Card(cardsList[i], i, self));
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
                    card.domElement.style.top = (i * 90) + 'px';
                    card.domElement.style.left = '-1000px'; // Initially positionned outside the screen, on the left
                    playfieldFrag.appendChild(card.domElement);
                    // Triggering the arrival transitions, waterfall-style
                    setTimeout(function (card, j) {
                        card.domElement.style.left = (j * 90) + 'px';
                    }, 100 * cardIndex, card, j);
                }
            }

            playfield.appendChild(playfieldFrag);
            playfieldWrapper.replaceChild(playfield, playfieldWrapper.childNodes[0]); // replace TextNode('&nbsp;')
        },
        play = function (event) {
            var srcElement = event.srcElement;
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
                        while (openCards.length > lvlParams.simultaneouslyRevealed
                               && openCards.some(function (c) { return c.pair != card.pair})) {
                            var cardToHideIndex = openCards.findIndex(function (c) { return c.pair != card.pair});
                            openCards[cardToHideIndex].flip('faceDown');
                            openCards.splice(cardToHideIndex, 1); // remove card from array
                        }
                    }, 300);
                }

            }
            if (card.state === 'faceDown') {
                card.flip('faceUp');
            }

            if (matchCount === (lvlParams.rows * lvlParams.cols) / lvlParams.requiredMatches) {
                playfieldWrapper.className = 'win';
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
        // - update their style.left
        triggerHorizontalTranslation = function (rowY) {
            var rowYcards = cards.slice(rowY * lvlParams.cols, rowY * lvlParams.cols + lvlParams.cols);
            rowYcards.forEach(function (card) {
                var oldCardIndex = card.domElement.getAttribute('idx'),
                    oldX = oldCardIndex % lvlParams.cols,
                    newX = (oldX + 1) % lvlParams.cols,
                    newCardIndex = rowY * lvlParams.cols + newX;
                cards[newCardIndex] = card;
                card.domElement.setAttribute('idx', newCardIndex);
                card.domElement.style.left = (newX * 90) + 'px';
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
                card.domElement.style.top = (newY * 90) + 'px';
            });
        };

    if (lvlParams.simultaneouslyRevealed >= lvlParams.requiredMatches) {
        throw new Error('Incorrect level parameters');
    } else if ((lvlParams.rows * lvlParams.cols) / lvlParams.requiredMatches > cardsList.length) {
        throw new Error('There are not enough cards to display the playing field');
    } else if ((lvlParams.rows * lvlParams.cols) % lvlParams.requiredMatches !== 0) {
        throw new Error('$rows x $cols is not a multiple of $requiredMatches');
    }

    playfield.className = 'play-field';
    playfield.style.left = '-' + (lvlParams.cols * 45) + 'px';
    playfield.onmousedown = play;

    cardsList.shuffle();

    self.totalClicksCount = 0;
    self.onwin = function () {};

    prepare();
    draw();
};

var Card = function (text, pair, lvl) {
    this.state      = 'faceDown';
    this.freezed    = 0;
    this.text       = text;
    this.pair       = pair;
    this.clicksCnt     = 0;

    var flipper = null,
        front   = null,
        back    = null,
        clicks  = null;

    this.draw = function () {
        var txt = document.createTextNode(this.text);

        this.domElement = document.createElement('div');

        flipper = this.domElement.cloneNode(false);

        front   = this.domElement.cloneNode(false);
        back    = this.domElement.cloneNode(false);
        clicks  = this.domElement.cloneNode(false);

        this.domElement.className = 'card';
        flipper.className = 'flipper';
        front.className = 'front face icon';
        back.className = 'back face';
        clicks.className = 'clicks';
        clicks.appendChild(document.createTextNode('\xA0'));

        front.appendChild(txt);
        front.appendChild(clicks);

        txt = txt.cloneNode(false);
        txt.nodeValue = '\xA0';

        back.appendChild(txt);

        flipper.appendChild(back);
        flipper.appendChild(front);

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
