/* global document, window, XMLHttpRequest, JSManipulate, Promise */
'use strict';

let _scriptLines;
const _htmlEls = ['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'b', 'base', 'basefont', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'command', 'data', 'datalist', 'dd', 'details', 'dfn', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'header', 'hgroup', 'hr', 'i', 'iframe', 'input', 'isindex', 'kbd', 'keygen', 'label', 'legend', 'li', 'listing', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meta', 'meter', 'multicol', 'nav', 'nextid', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'plaintext', 'pre', 'progress', 'q', 'rp', 's', 'samp', 'section', 'select', 'shadow', 'slot', 'small', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'xmp'];
const _imgFilters = ['circlesmear', 'diffusion', 'dither', 'noise', 'pixelate', 'posterize']; // 'invert', 'sepia', 'solarize'
const _finalCharDeltaLookup = [10, 22, 13, 19, 16, 21, 23, 14, 24, 20, 24, 15, 11, 17, 20, 21, 23, 12, 16, 22, 21, 11, 14, 19, 16, 18, 22, 21, 24, 11, 15, 18, 23, 13, 18, 19, 19, 23, 16, 15, 16, 13, 10, 12, 22, 22, 17, 23, 23, 14];
// const _finalCharDeltaLookup = new Array(40).fill(1);

const _phrases = [
  'Holy fuck', 'Conscientious objector', 'Unreasonable behaviour', 'Magnificent void', 'Reasonable doubt', 'Sound advice',
  'Questionable content', 'Conventional wisdom', 'Political agenda', 'Unusual predicament', 'Unique situation', 'Naughty nature',
  'Beautiful losers', 'Suspicious activity', 'Complete ass', 'Heavenly creatures', 'Manufacturing consent', 'Vengeful god',
];
const _unicodeBrackets = {
  0: ['0020', '60'],
  1: ['0020', '2AD'],
  2: ['0020', 'FFD'],
  3: ['0020', 'FFD'],
  4: ['1000', 'FFF'],
  5: ['2000', 'FFF'],
  6: ['3000', '7FFF'],
  7: ['A000', 'FFF'],
  8: ['B000', '3FFF'],
  9: ['FB00', '5FF'],
};

const _audioTitleByKey = {
  1: 'Amen breakdown',
  2: 'Descent',
  3: 'In the mist',
  4: 'Irie abstraction',
  5: 'Isn\'t rearrangement rave',
  6: 'Know that I am god',
  7: 'Little red fox',
  8: 'Newage bullshit',
  // 9: 'Scratchy tape town',
  10: 'Stereo checkout',
};

const LEVEL = {
  'prestart': 0,
  'whackmole': 1,
  'revealphrase': 2,
  'gameover': 3,
};
const CHARS_BASE_COLOR = 'aliceblue';
const DECELLERATION_INTERVAL = 1500;
const MOMENTUM_BONUS_THRESHOLD = 15;
const ANSWER_CLICK_TIMEOUT = 20000;
const TIME_BONUS_THRESHOLD = 80;
const HIGH_SCORE_COOKIE = 'alltimehigh';
const VERSION = '1.2.2';

function init() {
  const state = {
    momentum: 0,
    score: 0,
    level: 0,
  };

  initScriptLines();

  state.initialQuestion = generateQuestion(true);
  state.currentAudioKey = calculateCurrentAudioKey(state.initialQuestion);
  state.nextAudioKey = generateNextAudioKey(state.initialQuestion);

  state.questionCharElByCharIndex = drawInitialQuestion(state.initialQuestion);

  const initGameOver = getInitGameOver(state);
  const revealWordHandler = getRevealWordHandler(state, initGameOver);
  const initRevealWordLevel = getInitRevealWordLevel(state, revealWordHandler);
  const whackMoleHandler = getWhackMoleHandler(state, initRevealWordLevel);

  state.answerCharElByCharIndex = initWhackMoleLevel(whackMoleHandler);

  drawBackgroundImage(state.initialQuestion, state.currentAudioKey);
  addKonamiCodeListener(() => {
    state.cheat = true;
    initRevealWordLevel();
  });
}

function initScriptLines() {
  fetchFromUrl('https://deaconmeek.github.io/experientialradio/script.js')
    .then((script) => {
      _scriptLines = script.split('\n');
    }).catch((err) => {
      _scriptLines = ['?????????????????????????'];
    });
}

function generateQuestion(allowFromQueryParams) {
  let queryQuestion;
  if (document.location.search) {
    const params = document.location.search.substr(1).split('&');
    for (const param of params) {
      if (param.split('=')[0] === 'q') {
        queryQuestion = decodeURIComponent(param.split('=')[1]);
        break;
      }
    }
  }
  if (allowFromQueryParams && queryQuestion) {
    return queryQuestion;
  }
  const queryQuestionComponents = queryQuestion ? queryQuestion.split(' ') : [null];
  const lastAdjective = queryQuestionComponents[0];
  const lastNoun = queryQuestionComponents[queryQuestionComponents.length - 1];

  let adjective;
  let noun;
  while (!adjective || adjective === lastAdjective) {
    adjective = _phrases[getRandomInt(_phrases.length)].split(' ')[0];
  }
  while (!noun || noun === lastNoun) {
    noun = _phrases[getRandomInt(_phrases.length)].split(' ')[1];
  }
  return `${adjective} ${noun}`;
}

function calculateCurrentAudioKey(currentQuestion) {
  if (Object.values(_audioTitleByKey).indexOf(currentQuestion) >= 0) {
    return Object.keys(_audioTitleByKey)[Object.values(_audioTitleByKey).indexOf(currentQuestion)];
  } else {
    return '0';
  }
}

function generateNextAudioKey(currentQuestion) {
  let audioTitle;
  let audioKey;
  while (!audioTitle || audioTitle === currentQuestion) {
    audioKey = getRandomInt(Object.keys(_audioTitleByKey).length) + 1;
    audioTitle = _audioTitleByKey[audioKey];
  }
  return audioKey;
}

function drawInitialQuestion(question) {
  const nextQuestion = encodeURIComponent(generateQuestion());
  const nextHref = document.location.href.substr(0, document.location.href.indexOf('?')) + '?q=' + nextQuestion;
  const questionClickHandler = () => document.location.replace(nextHref);
  return drawChars(question + '?', 'question', 1000, questionClickHandler);
}

function initWhackMoleLevel(whackMoleHandler) {
  const answer = 'Experiential radio.';
  return drawChars(answer, 'answer', 2000, whackMoleHandler);
}

function drawChars(string, type, displayDelay, clickHandler) {
  const charElByCharIndex = {};
  let containerEl;
  let className;
  if (type === 'question') {
    containerEl = document.getElementById('question-subcontainer');
  } else if (type === 'answer') {
    containerEl = document.getElementById('answer-subcontainer');
  } else if (type === 'score') {
    containerEl = document.getElementById('answer-subcontainer');
    className = 'preformatted';
  }

  containerEl.innerHTML = '';
  for (const [i, char] of [...string].entries()) {
    const spanEl = document.createElement('span');
    spanEl.innerHTML =  char === ' ' ? '&nbsp;' : char;
    spanEl.classList.add('chars');
    if (className) {
      spanEl.classList.add(className);
    }
    if (clickHandler) {
      spanEl.style.cursor = 'pointer';
      spanEl.addEventListener('click', clickHandler);
    }
    containerEl.appendChild(spanEl);
    charElByCharIndex[i] = spanEl;
  }
  window.setTimeout(() => {
    for (const i of Object.keys(charElByCharIndex)) {
      charElByCharIndex[i].style.opacity = 1;
    }
  }, displayDelay);

  return charElByCharIndex;
}

function getWhackMoleHandler(state, initRevealWordLevel) {
  const whackMoleHandler = function (e) {
    const el = e.target;
    if (el.style.color === 'black') {
      return;
    }
    if (!state.gameTimeStart) {
      state.gameTimeStart = new Date();
      state.level = LEVEL.whackmole;
    }
    playBeep();
    el.style.color = 'black';
    const answerCharEls = Object.values(state.answerCharElByCharIndex);
    const activateGame = answerCharEls.every(o => o.innerHTML === '&nbsp;' || o.style.color === 'black');
    if (activateGame) {
      for (const spanEl of answerCharEls) {
        spanEl.removeEventListener('click', whackMoleHandler);
      }
      initRevealWordLevel();
    }
    window.setTimeout(() => {
      el.style.color = CHARS_BASE_COLOR;
    }, Math.max(getRandomInt(ANSWER_CLICK_TIMEOUT), 2000));
  };
  return whackMoleHandler;
}

function playBeep() {
  const beepEl = document.getElementById('beep');
  beepEl.play();
}

function getRevealWordHandler(state, initGameOver) {
  return function() {
    if (state.level !== LEVEL.revealphrase) {
      return;
    }

    state.momentum = updateMomentum(state.momentum, 1);
    window.setTimeout(() => {
      state.momentum = updateMomentum(state.momentum, -1);
      // console.log(state.momentum);
    }, DECELLERATION_INTERVAL);

    const scoreDelta = (state.momentum * state.momentum) + 1;
    state.score = Math.max(state.score + scoreDelta, 0);
    const scoreString = getBinaryScore(state.score);
    drawNewScore(scoreString, state.answerCharElByCharIndex, true);

    const changeColor = state.momentum >= MOMENTUM_BONUS_THRESHOLD;
    drawNewRandomLetter(state.questionDeltaByCharIndex, state.questionCharElByCharIndex, state.nextAudioTitlePadded, state.momentum, changeColor)
      .then(() => {
        if (isGameOver(state.questionDeltaByCharIndex) && state.level !== LEVEL.gameover) {
          initGameOver();
        }
      });
  };
}

function updateMomentum(momentum, delta) {
  return Math.max(momentum + delta, 0);
}

function drawNewScore(string, charElByCharIndex, animate) {
  // Assumes string is of same length as state.answerCharElByCharIndex
  const charEls = Object.values(charElByCharIndex);
  for (const [i, char] of [...string].entries()) {
    const spanEl = charEls[i];
    if (spanEl.innerHTML === char) {
      continue;
    }
    drawNewLetter(spanEl, char, CHARS_BASE_COLOR, animate);
  }
}

function drawNewRandomLetter(deltaByCharIndex, charElByCharIndex, newWord, momentum, changeColor) {
  return new Promise((resolve) => {
    let newChar;
    let charIndex;
    let finalCharDelta;
    while (!Number.isInteger(charIndex)) {
      const nextCharIndex = getRandomInt(Object.keys(deltaByCharIndex).length);
      finalCharDelta = _finalCharDeltaLookup[nextCharIndex];
      if (deltaByCharIndex[nextCharIndex] < finalCharDelta) {
        charIndex = nextCharIndex;
      } else if (isGameOver(deltaByCharIndex)) {
        return resolve();
      }
    }
    if (deltaByCharIndex[charIndex] === (finalCharDelta - 1)) {
      newChar = newWord[charIndex];
      drawGlitch();
    } else {
      newChar = getRandomChar(momentum);
    }
    deltaByCharIndex[charIndex] += 1;
    const spanEl = charElByCharIndex[charIndex];
    const newColor = changeColor ? getRandomColor() : CHARS_BASE_COLOR;
    drawNewLetter(spanEl, newChar, newColor, true, resolve);
  });
}

function isGameOver(deltaByCharIndex) {
  return (Object.keys(deltaByCharIndex).every((charIndex) => {
    return deltaByCharIndex[charIndex] === _finalCharDeltaLookup[charIndex];
  }));
}

function drawGlitch() {
  altBackground(2);
  playGlitch(300);
  mungeHtml();
}

function mungeHtml() {
  const codeContainerEl = document.getElementById('code-container');
  let codeString = codeContainerEl.innerText !== '' ? codeContainerEl.innerText : 'v' + VERSION;
  codeContainerEl.innerText = codeString + '\n' + getScriptSnippet(_scriptLines);

  document.getElementsByTagName('body')[0].append(getRandomHtmlEl());
}

function getScriptSnippet(_scriptLines) {
  let snippet;
  while (!snippet || snippet.length < 5) {
    snippet = _scriptLines[getRandomInt(_scriptLines.length)].trim();
  }
  return snippet;
}

function getRandomHtmlEl() {
  const allEls = document.getElementsByTagName('*');
  let randomEl;
  while (!randomEl || !randomEl.id) {
    randomEl = allEls[getRandomInt(allEls.length)];
  }
  const clonedEl = deepCloneEl(randomEl);

  const color = getRandomColor();
  const screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  const x = getRandomInt(screenWidth - 100);
  const y = getRandomInt(screenHeight - 100);
  const w = getRandomInt(screenWidth - x) + 100;
  const h = getRandomInt(screenHeight - y) + 100;
  const size = getRandomInt(100);

  let randomElType = _htmlEls[getRandomInt(_htmlEls.length)];
  let el = document.createElement(randomElType);
  el.appendChild(clonedEl);
  el.setAttribute('style', 'z-index:1;font-size:' + size + 'px;color:' + color + ';position:absolute;top:' + y + ';left:' + x + ';width:' + w + ';height:' + h + ';');
  return el;
}

function deepCloneEl(el) {
  const elAttributes = {};
  const clonedEl = cloneEl(el, elAttributes);
  let childEl = clonedEl;
  while (childEl) {
    if (childEl.tagName === 'CANVAS' && elAttributes.imageData) {
      childEl.getContext('2d').putImageData(elAttributes.imageData, 0, 0);
    } else if (childEl.tagName === 'AUDIO' && elAttributes.src) {
      childEl.setAttribute('src', elAttributes.src);
      childEl.setAttribute('autoplay', true);
    } else if (childEl.tagName === 'IFRAME') {
      childEl.setAttribute('src', 'index.html');
    }
    childEl = (childEl.hasChildNodes() && childEl.firstChild.tagName) ? childEl.firstChild : null;
  }
  return clonedEl;
}

function cloneEl(el, elAttributes) {
  elAttributes = elAttributes || {};
  if (el.tagName === 'CANVAS') {
    elAttributes.imageData = el.getContext('2d').getImageData(0, 0, el.width, el.height);
  } else if (el.tagName === 'AUDIO') {
    elAttributes.src = el.getAttribute('src');
  }

  const clonedEl = el.cloneNode();
  clonedEl.innerHTML = el.innerHTML ? el.innerHTML.replace(/id="[^"]+"/g, '') : ''; //.replace(/class="[^"]+"/g, '') : '';
  clonedEl.id = '';
  clonedEl.setAttribute('style', '');
  if (clonedEl.hasChildNodes() && clonedEl.firstChild.tagName) {
    clonedEl.appendChild(cloneEl(clonedEl.firstChild, elAttributes));
  }
  return clonedEl;
}

function altBackground(flashes) {
  let flashCount = 0;
  const timer = window.setInterval(() => {
    if (flashCount % 2) {
      document.getElementById('bg').style['display'] = 'none';
      document.getElementById('bg-alt').style['display'] = 'block';
    } else {
      document.getElementById('bg').style['display'] = 'block';
      document.getElementById('bg-alt').style['display'] = 'none';
    }
    if (flashCount >= flashes) {
      window.clearInterval(timer);
    }
    flashCount += 1;
  }, 100);
}

function getRandomInt(range) {
  return Math.floor(Math.random() * range);
}

function getRandomChar(momentum) {
  const unicodeBracket = _unicodeBrackets[getRandomInt(Math.min(momentum, 10))];
  const startingInt = parseInt(unicodeBracket[0], 16);
  const range = parseInt(unicodeBracket[1], 16);
  const randomInt = startingInt + getRandomInt(range);
  return String.fromCharCode(randomInt);
}

function drawNewLetter(el, char, color, shouldAnimate, callback) {
  char = char === ' ' ? '&nbsp;' : char;
  if (!shouldAnimate) {
    el.innerHTML = char;
    return callback();
  }

  // el.classList.add('notransition'); // Disable transitions
  el.style.color = 'black';
  el.offsetHeight; // Trigger a reflow, flushing the CSS changes
  // el.classList.remove('notransition'); // Re-enable transitions
  addTransitionEndListener(el, 150, () => {
    el.innerHTML = char;
    el.style.color = color;
    addTransitionEndListener(el, 150, () => {
      if (callback) {
        return callback();
      }
    });
  });
}

function addTransitionEndListener(el, timeout, callback) {
  let done = false;
  let errorHandler;
  let callbackHandler = () => {
    if (!done) {
      done = true;
      window.clearTimeout(errorHandler);
      return callback();
    }
  };
  errorHandler = window.setTimeout(callbackHandler, timeout);
  el.addEventListener('transitionend', callbackHandler, {once: true});
}

function getInitRevealWordLevel(state, revealWordHandler) {
  return function initRevealWordLevel() {
    const codeContainerEl = document.getElementById('code-container');
    const tunesEl = document.getElementById('tunes');

    let audioFile;
    audioFile = 'audio/' + state.currentAudioKey + '.mp3';
    tunesEl.setAttribute('src', audioFile);
    tunesEl.play();

    const scoreString = getBinaryScore(state.score);
    state.answerCharElByCharIndex = drawChars(scoreString, 'score', 1000);
    drawFlashingBackground(5);
    playGlitch(1000);

    codeContainerEl.addEventListener('click', revealWordHandler);
    codeContainerEl.style.cursor = 'pointer';

    let questionToPad = state.initialQuestion + '?'
    let audioTitleToPad = _audioTitleByKey[state.nextAudioKey];
    if (audioTitleToPad.length > questionToPad.length) {
      questionToPad = padWord(questionToPad, audioTitleToPad.length);
    } else {
      audioTitleToPad = padWord(audioTitleToPad, questionToPad.length);
    }
    state.questionCharElByCharIndex = drawChars(questionToPad, 'question', 0);
    state.questionDeltaByCharIndex = {};
    for (const charIndex of Object.keys(state.questionCharElByCharIndex)) {
      state.questionDeltaByCharIndex[charIndex] = 0;
    }
    state.nextAudioTitlePadded = audioTitleToPad;
    state.level = LEVEL.revealphrase;
  };
}

function padWord(word, length) {
  while (word.length < length) {
    if ((length - word.length) % 2) {
      word = ' ' + word;
    } else {
      word = word + ' ';
    }
  }
  return word;
}

function getBinaryScore(currentScore) {
  let scoreString = currentScore.toString(2);
  while (scoreString.length < 20) {
    scoreString = '0' + scoreString;
  }
  return scoreString;
}

function drawFlashingBackground(flashes) {
  const bgEl = document.getElementById('bg');
  const htmlEl = document.getElementsByTagName('html')[0];
  const originalColor = htmlEl.getAttribute('background-color');

  bgEl.style['display'] = 'none';
  let flashCount = 0;
  const timer = window.setInterval(() => {
    htmlEl.style['background-color'] = getRandomColor();
    if (flashCount > flashes) {
      window.clearInterval(timer);
      bgEl.style['display'] = 'block';
      htmlEl.style['background-color'] = originalColor;
    }
    flashCount += 1;
  }, 100);
}

function getRandomColor() {
  return '#'+((Math.random()*0x777777) + 0x666666).toString(16).slice(-6);
}

function playGlitch(duration) {
  const glitchEl = document.getElementById('glitch');
  glitchEl.currentTime = getRandomInt(glitchEl.duration - (duration / 1000));
  window.setTimeout(() => {
    glitchEl.play();
    window.setTimeout(() => {
      glitchEl.pause();
    }, duration);
  }, 100);
}

function drawBackgroundImage(question, audioKey) {
  Promise.resolve().then(() => {
    if (audioKey !== '0') {
      return Promise.resolve('https://deaconmeek.github.io/experientialradio/img/' + audioKey + '.jpg');
    } else {
      return getImageUrlFromQuestion();
    }
  }).then((imageUrl) => {
    buildImageData(imageUrl).then((imageData) => {
      if (audioKey === '0') {
        filterImageData(imageData, 'blur', {amount: 1});
        filterImageData(imageData);
      }
      const mainCanvasEl = document.getElementById('main-image');
      mainCanvasEl.getContext('2d').putImageData(imageData,0,0);
      const imageContainerEl = document.getElementById('bg');
      imageContainerEl.style.opacity = 1;

      const mainCanvasAltEl = document.getElementById('main-image-alt');
      mainCanvasAltEl.height = mainCanvasEl.height;
      mainCanvasAltEl.width = mainCanvasEl.width;
      filterImageData(imageData, 'invert');
      mainCanvasAltEl.getContext('2d').putImageData(imageData,0,0);
    })
  });
}

function getImageUrlFromQuestion(question) {
  const url = `https://us-central1-dazzling-inferno-8250.cloudfunctions.net/fetchImageUrl?question=${encodeURIComponent(question)}`;
  // const url = `http://localhost:5000/dazzling-inferno-8250/us-central1/fetchImageUrl?question=${encodeURIComponent(queryString)}`;
  return fetchFromUrl(url)
    .catch(() => {
      return 'https://deaconmeek.github.io/experientialradio/img/waaat.jpg';
    });
}

function buildImageData(url) {
  return new Promise((resolve) => {
    const sourceEl = document.createElement('img');
    // const canvasEl = document.createElement('canvas');
    const mainCanvasEl = document.getElementById('main-image');
    sourceEl.crossOrigin = "Anonymous";
    sourceEl.onload = () => {
      mainCanvasEl.height = sourceEl.height;
      mainCanvasEl.width = sourceEl.width;
      const context = mainCanvasEl.getContext('2d');
      context.drawImage(sourceEl, 0, 0);
      const imageData = context.getImageData(0,0,mainCanvasEl.width, mainCanvasEl.height);
      mainCanvasEl.getContext('2d').putImageData(imageData,0,0);
      resolve(imageData);
    };
    sourceEl.setAttribute('src', url);
  });
}

function filterImageData(imageData, filterToApply, props) {
  props = props || {};
  if (!filterToApply) {
    filterToApply = _imgFilters[getRandomInt(_imgFilters.length)];
  }
  // console.log('filter', filterToApply);
  JSManipulate[filterToApply].filter(imageData, props);
}

function fetchFromUrl(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(xhr.status);
        }
      }
    };
    xhr.send();
  });
}

function getInitGameOver(state) {
  return function () {
    state.level = LEVEL.gameover;
    const nextAudioTitle = _audioTitleByKey[state.nextAudioKey];
    const nextHref = document.location.href.substr(0, document.location.href.indexOf('?')) +
      '?q=' + encodeURIComponent(nextAudioTitle.trim());
    const questionClickHandler = () => document.location = nextHref;
    for (const spanEl of Object.values(state.questionCharElByCharIndex)) {
      spanEl.style.cursor = 'pointer';
      spanEl.addEventListener('click', questionClickHandler);
    }
    const codeEl = document.getElementById('code-container');
    codeEl.style.cursor = 'pointer';
    codeEl.addEventListener('click', () => {
      codeEl.style.color = codeEl.style.color === 'black' ? 'white' : 'black';
    });
    altBackground(Number.MAX_SAFE_INTEGER);
    state.score = finalizeScore(state.score, state.cheat, state.gameTimeStart);
  };
}

function finalizeScore(score, cheat, gameTimeStart) {
  const totalTime = ((new Date() - gameTimeStart) / 1000)|0;
  const timeBonus = cheat ? 0 : 2000 * Math.abs(Math.min((totalTime - TIME_BONUS_THRESHOLD), 0));
  score += timeBonus;

  if (score > getHighScore()) {
    document.cookie = HIGH_SCORE_COOKIE + '=' + score + '; path=/';
  }

  document.getElementById('code-container').innerText = document.getElementById('code-container').innerText +
    '\nTIME TAKEN: ' + totalTime + 's' +
    '\nTIME BONUS: ' + timeBonus +
    '\nSCORE: ' + score +
    '\nALL TIME HIGH: ' + getHighScore();

  return score;
}

function getHighScore() {
  let highScore;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const key = cookie.trim().split('=')[0];
    if (key === HIGH_SCORE_COOKIE) {
      highScore = cookie.split('=')[1];
      break;
    }
  }
  return parseInt(highScore, 10) || 0;
}

function addKonamiCodeListener(callback) {
  let keyInput = '';
  const code = '38384040373937396665';
  document.addEventListener('keydown', function (e) {
    keyInput += String(e.keyCode);
    if (keyInput === code) {
      callback();
      return;
    }
    if (code.indexOf(keyInput) === 0) {
      return;
    }
    keyInput = String(e.keyCode);
  });
}

// Loader
if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
}
