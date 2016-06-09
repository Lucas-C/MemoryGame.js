var MemoryGame = function () {
    "use strict";
        var lvls = {
            'easy': {'rows': 3, 'cols': 4, 'matches': 2, 'simultaneouslyRevealed': 1},
            'hard': {'rows': 5, 'cols': 6, 'matches': 5, 'simultaneouslyRevealed': 2}
        },
        start = function (levelName) {
            var lvl = lvls[levelName];
            var currentLvl = new Level(lvl.rows, lvl.cols, lvl.matches, lvl.simultaneouslyRevealed);
            var info = document.getElementById('game-info');
            currentLvl.onwin = function (clicks, prc) {
                info.innerHTML = 'You\'ve found all matches in <strong>' + clicks + '</strong> clicks with <strong>' + prc + '%</strong> efficiency';
            };
            info.innerHTML = 'Click the cards to reveal <strong>' + lvl.matches + '</strong> matches';
        };

    this.changeLevel = function (btn, levelName) {
        [].forEach.call(document.getElementsByClassName('lvlButton'), function(btn) {
            btn.disabled = false;
        });
        start(btn.textContent);
        btn.disabled = true;
    }
    
    var firstLvlButton = document.getElementsByClassName('lvlButton')[0];
    this.changeLevel(firstLvlButton);
};

var Level = function (rows, cols, requiredMatchesCount, simultaneouslyRevealed) {
    "use strict";
    
    if (simultaneouslyRevealed >= requiredMatchesCount) {
        throw new Error('Incorrect level paremeters');
    }

    var cardsList           = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVW[\\]^_`abcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜ',
        playfieldWrapper    = document.getElementById('playfield-wrapper'),
        playfield           = document.createElement('table'),
        cards               = [],
        self                = this,
        clicksCnt           = 0,
        matchCount          = 0,
        openCards           = [],
        Card                = function (text, pair) {
            this.state      = 'faceDown';
            this.freezed    = 0;
            this.text       = text;
            this.pair       = pair;
            this.clicksCnt     = 0;

            var flipper = null,
                front   = null,
                back    = null,
                clicks  = null;

            this.draw = function (idx, container) {
                var card    = document.createElement('div'),
                    txt     = document.createTextNode(this.text);

                flipper = card.cloneNode(false);

                front   = card.cloneNode(false);
                back    = card.cloneNode(false);
                clicks  = card.cloneNode(false);

                card.className = 'card';
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

                flipper.setAttribute('idx', idx);

                card.appendChild(flipper);
                container.appendChild(card);
            };

            this.flip = function (state) {
                if (state === 'faceUp') {
                    flipper.className = 'flipper flipfront';
                    front.style.opacity = 1;
                    back.style.opacity = 0;

                    this.state = 'faceUp';
                    this.clicksCnt++;

                    clicks.childNodes[0].nodeValue = this.clicksCnt;

                    clicksCnt++;
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
                }, 1000);
            };
        },
        prepare = function () {
            for (var i = 0; i < (rows * cols) / requiredMatchesCount; i++) {
                for (var j = 0; j < requiredMatchesCount; j++) {
                    cards.push(new Card(cardsList[i], i));
                }
            }
            cards.shuffle();
        },
        draw = function () {
            var tbody       = document.createElement('tbody'),
                row         = document.createElement('tr'),
                cell        = document.createElement('td'),
                rowFrag     = document.createDocumentFragment(),
                cellFrag    = document.createDocumentFragment(),
                k           = 0;

            for (var i = 0; i < rows; i = i + 1) {
                row = row.cloneNode(false);

                for (var j = 0; j < cols; j = j + 1) {
                    cell = cell.cloneNode(false);

                    cards[k].draw(k, cell);
                    cellFrag.appendChild(cell);

                    k++;
                }

                row.appendChild(cellFrag);
                rowFrag.appendChild(row);
            }

            tbody.appendChild(rowFrag);
            playfield.appendChild(tbody);
            playfieldWrapper.replaceChild(playfield, playfieldWrapper.childNodes[0]);
        },
        play = function (event) {
            var srcElement = event.srcElement;
            if (srcElement.classList.contains('face')) {
                srcElement = srcElement.parentNode;
            }
            if (!srcElement.classList.contains('flipper')) {
                return;
            }

            var card = cards[srcElement.getAttribute('idx')];

            if (card.freezed === 1 || openCards.contains(card)) {
                return;
            }

            openCards.push(card);

            if (openCards.length > 1) {
                var lastOpenCard = openCards[openCards.length - 2];
                if (lastOpenCard.pair === card.pair && openCards.length == requiredMatchesCount) { // Pair found !
                    card.flip('faceUp');
                    for (var i = 0; i < openCards.length; i = i + 1) {
                        openCards[i].freezed = 1;
                        openCards[i].pulse();
                    }
                    matchCount++;
                    openCards = [];
                } else {
                    window.setTimeout(function () { // delayed after the face flip
                        while (openCards.length > simultaneouslyRevealed && openCards.some(function (c) { return c.pair != card.pair})) {
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

            if (matchCount === (rows * cols) / requiredMatchesCount) {
                playfieldWrapper.className = 'win';

                window.setTimeout(function () {
                    playfield.className = 'play-field win';
                    self.onwin(clicksCnt, Math.round(((rows * cols) * 100) / clicksCnt));
                    playfieldWrapper.className = '';
                }, 1500);

            }
        };

    if ((rows * cols) / requiredMatchesCount > cardsList.length) {
        throw ('There are not enough cards to display the playing field');
    } else if ((rows * cols) % requiredMatchesCount !== 0) {
        throw ('Out of bounds');
    }

    playfieldWrapper.className = '';
    playfield.className = 'play-field';

    cardsList = cardsList.split('');
    cardsList.shuffle();

    this.onwin = function () {};

    prepare();
    draw();

    playfield.onmousedown = play;
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

    for (i = 0; i < this.length; i = i + 1) {
        if (this[i] === value) {
            result = true;
        }
    }

    return result;
};
