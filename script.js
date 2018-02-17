/* global document, window, XMLHttpRequest, JSManipulate, Promise */
'use strict';

let _scriptLines;
let _cssValuesByCssProperty;
const _htmlEls = ['a', 'basefont', 'big', 'blink', 'blockquote', 'b', 'button', 'center', 'code', 'em', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'iframe', 'kbd', 'li', 'marquee', 'ol', 'q', 'samp', 'small', 'strikeout', 'strong', 'sub', 'sup', 'textarea', 'tt', 'u', 'ul'];
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
  9: 'Stereo checkout',
  // 10: 'Scratchy tape town',
};

const LEVEL = {
  'prestart': 0,
  'levelone': 1,
  'leveltwo': 2,
  'gameover': 3,
};
const CHARS_BASE_COLOR = 'aliceblue';
const DECELLERATION_INTERVAL = 1500;
const MOMENTUM_BONUS_THRESHOLD = 15;
const ANSWER_CLICK_TIMEOUT = 15000;
const TIME_BONUS_THRESHOLD = 80;
const COOKIE_HIGH_SCORE = 'all-time-high';
const COOKIE_HIGH_SCORE_BY_AUDIO_KEY = 'high-by-tune';
const VERSION = '1.5.1';

function init() {
  const state = {
    momentum: 0,
    score: 0,
    level: 0,
  };

  initScriptLines();
  initCssProperties();
  initCodeContainer();

  state.initialQuestion = generateQuestion(true);
  state.currentAudioKey = calculateCurrentAudioKey(state.initialQuestion);
  state.nextAudioKey = generateNextAudioKey(state.initialQuestion);
  drawBackgroundImage(state.initialQuestion, state.currentAudioKey);

  state.level = LEVEL.prestart;

  runLevelOne(state)
    .then(runLevelTwo)
    .then(runGameOver);
}

function runLevelOne(state) {
  return new Promise((finish) => {
    drawChars(state.initialQuestion + '?', 'question', 1000);
    const nextQuestion = generateQuestion();
    const nextHref = document.location.href.substr(0, document.location.href.indexOf('?')) + '?q=' + encodeURIComponent(nextQuestion);
    addClickHandlerToCharEls('question', () => document.location.replace(nextHref));
    const answer = 'Experiential radio.';
    drawChars(answer, 'answer', 2000);

    addKonamiCodeListener(() => {
      state.cheat = true;
      finish(state);
    });

    state.levelOneClickCounter = 0;
    state.gameTimeStart = null;

    const completionCheck = function () {
      const charEls = getCharElsForType('answer');
      const isComplete = charEls.every(o => o.innerHTML === '&nbsp;' || o.style.color === 'black');
      if (isComplete) {
        removeClickHandlerFromCharEls('answer', actionHandler);
        finish(state);
      }
      return isComplete;
    };

    const actionHandler = getLevelOneActionHandler(state, completionCheck);
    addClickHandlerToCharEls('answer', actionHandler);
  });
}

function getLevelOneActionHandler(state, completionCheck) {
  const hideCharFn = function (charEl, hideTime) {
    charEl.style.color = 'black';
    window.setTimeout(() => {
      charEl.style.color = CHARS_BASE_COLOR;
    }, hideTime);
    completionCheck();
  };

  return function (e) {
    const el = e.target;
    if (el.style.color === 'black') {
      return;
    }
    if (!state.gameTimeStart) {
      state.gameTimeStart = new Date();
      state.level = LEVEL.levelone;
    }

    playBeep();
    state.levelOneClickCounter += 1;
    const minHideTime = (state.levelOneClickCounter * 300) + 2000;
    const hideTime = Math.max(getRandomInt(ANSWER_CLICK_TIMEOUT), minHideTime);
    hideCharFn(el, hideTime);

    // Hide adjacent els with a slight delay
    const siblingEls = [];
    const charElByCharIndex = getCharElsForType('answer');
    for (let [charIndex, spanEl] of charElByCharIndex.entries()) {
      if (el === spanEl) {
        if (charIndex > 0) {
          siblingEls.push(charElByCharIndex[charIndex - 1]);
        }
        if (charIndex < (Object.keys(charElByCharIndex).length - 1)) {
          siblingEls.push(charElByCharIndex[charIndex + 1]);
        }
        break;
      }
    }
    for (const siblingEl of siblingEls) {
      if (siblingEl.style.color !== 'black') {
        window.setTimeout(() => {
          const hideTime = Math.max(getRandomInt(ANSWER_CLICK_TIMEOUT / 1.5), minHideTime) | 0;
          hideCharFn(siblingEl, hideTime);
        }, 50);
      }
    }
  };
}

function runLevelTwo(state) {
  return new Promise((finish) => {
    const tunesEl = document.getElementById('tunes');

    let audioFile;
    audioFile = 'audio/' + state.currentAudioKey + '.mp3';
    tunesEl.setAttribute('src', audioFile);
    tunesEl.play();

    const scoreString = getBinaryScore(state.score);
    drawChars(scoreString, 'score', 1000);
    drawFlashingBackground(5);
    playGlitch(1000);

    let questionToPad = state.initialQuestion + '?'
    let audioTitleToPad = _audioTitleByKey[state.nextAudioKey];
    if (audioTitleToPad.length > questionToPad.length) {
      questionToPad = padWord(questionToPad, audioTitleToPad.length);
    } else {
      audioTitleToPad = padWord(audioTitleToPad, questionToPad.length);
    }
    drawChars(questionToPad, 'question', 0);
    state.questionDeltaByCharIndex = {};
    for (const [charIndex] of getCharElsForType('question').entries()) {
      state.questionDeltaByCharIndex[charIndex] = 0;
    }
    state.nextAudioTitlePadded = audioTitleToPad;
    state.level = LEVEL.leveltwo;

    const completionCheck = () => {
      const isComplete = (Object.keys(state.questionDeltaByCharIndex).every((charIndex) => {
        return state.questionDeltaByCharIndex[charIndex] === _finalCharDeltaLookup[charIndex];
      }));
      if (isComplete && state.level !== LEVEL.gameover) {
        document.getElementById('play-container').style.display = 'none';
        finish(state);
      }
      return isComplete;
    };
    const actionHandler = getLevelTwoActionHandler(state, completionCheck);
    document.getElementById('play-container').addEventListener('click', actionHandler);
    document.getElementById('play-container').style['display'] = 'block';
  });
}

function getLevelTwoActionHandler(state, completionCheck) {
  return function () {
    if (state.level !== LEVEL.leveltwo) {
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
    const scoreColor = (state.momentum >= MOMENTUM_BONUS_THRESHOLD) ? getRandomColor() : CHARS_BASE_COLOR;
    drawNewScore(scoreString, scoreColor, true);

    const deltaByCharIndex = state.questionDeltaByCharIndex;
    let newChar;
    let charIndex;
    let finalCharDelta;
    let letterColor = CHARS_BASE_COLOR;
    while (!Number.isInteger(charIndex)) {
      const nextCharIndex = getRandomInt(Object.keys(deltaByCharIndex).length);
      finalCharDelta = _finalCharDeltaLookup[nextCharIndex];
      if (deltaByCharIndex[nextCharIndex] < finalCharDelta) {
        charIndex = nextCharIndex;
      } else if (completionCheck()) {
        return;
      }
    }
    if (deltaByCharIndex[charIndex] === (finalCharDelta - 1)) {
      newChar = state.nextAudioTitlePadded[charIndex];
      if (newChar !== ' ') {
        letterColor = getRandomColor();
        drawGlitch();
      }
    } else {
      newChar = getRandomChar(state.momentum);
    }
    deltaByCharIndex[charIndex] += 1;
    const spanEl = getCharElsForType('question')[charIndex];
    drawNewLetter(spanEl, newChar, letterColor, true, completionCheck);
  };
}

function runGameOver(state) {
  state.level = LEVEL.gameover;
  const nextAudioTitle = _audioTitleByKey[state.nextAudioKey];
  const nextHref = document.location.href.substr(0, document.location.href.indexOf('?')) +
    '?q=' + encodeURIComponent(nextAudioTitle.trim());
  const questionClickHandler = () => document.location = nextHref;
  const charEls = getCharElsForType('question');
  for (const spanEl of charEls) {
    spanEl.style.cursor = 'pointer';
    spanEl.addEventListener('click', questionClickHandler);
  }
  // addIframe();
  altBackground(Number.MAX_SAFE_INTEGER);
  state.score = finalizeScore(state.score, state.currentAudioKey, state.cheat, state.gameTimeStart);
  const scoreString = getBinaryScore(state.score);
  drawNewScore(scoreString, CHARS_BASE_COLOR, true);
}

function addClickHandlerToCharEls(type, clickHandler) {
  const charEls = getCharElsForType(type);
  for (const el of charEls) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', clickHandler);
  }
}

function removeClickHandlerFromCharEls(type, clickHandler) {
  const charEls = getCharElsForType(type);
  for (const el of charEls) {
    el.style.cursor = 'default';
    el.removeEventListener('click', clickHandler);
  }
}

function initScriptLines() {
  fetchFromUrl('https://deaconmeek.github.io/experientialradio/script.js')
    .then((script) => {
      _scriptLines = script.split('\n');
    }).catch(() => {
    _scriptLines = ['?????????????????????????'];
  });
}

function initCssProperties() {
  fetchFromUrl('https://deaconmeek.github.io/experientialradio/valuesByCssProperty.json')
    .then((json) => {
      _cssValuesByCssProperty = JSON.parse(json);
    }).catch(() => {
    _scriptLines = {};
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

function drawChars(string, type, displayDelay) {
  const charEls = [];
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
  for (const char of [...string]) {
    const spanEl = document.createElement('span');
    spanEl.innerHTML =  char === ' ' ? '&nbsp;' : char;
    spanEl.classList.add('chars');
    if (className) {
      spanEl.classList.add(className);
    }
    containerEl.appendChild(spanEl);
    charEls.push(spanEl);
  }
  window.setTimeout(() => {
    for (const charEl of charEls) {
      charEl.style.opacity = 1;
    }
  }, displayDelay);
}

function getCharElsForType(type) {
  if (type === 'question') {
    return [...document.getElementById('question-subcontainer').children];
  } else if (type === 'answer' || type === 'score') {
    return [...document.getElementById('answer-subcontainer').children];
  }
}

function playBeep() {
  const beepEl = document.getElementById('beep');
  beepEl.play();
}

function updateMomentum(momentum, delta) {
  return Math.max(momentum + delta, 0);
}

function drawNewScore(string, color, animate) {
  // Assumes string is of same length as charEls
  const charEls = getCharElsForType('score');
  for (const [i, char] of [...string].entries()) {
    const spanEl = charEls[i];
    if (spanEl.innerHTML === char) {
      continue;
    }
    drawNewLetter(spanEl, char, color, animate);
  }
}

function drawGlitch() {
  altBackground(2);
  playGlitch(300);
  mungeHtml();
  logCode();
}

function mungeHtml() {
  const glitchContainerEl = document.getElementById('glitch-container');
  glitchContainerEl.appendChild(getRandomHtmlEls());
}

function logCode() {
  const codeContainerEl = document.getElementById('code-container');
  let codeString = codeContainerEl.innerText !== '' ? codeContainerEl.innerText : 'v' + VERSION;
  codeContainerEl.innerText = codeString + '\n' + getScriptSnippet(_scriptLines);
}

function getScriptSnippet(_scriptLines) {
  let snippet;
  let i = 0;
  while (_scriptLines.length && i < 10 && (!snippet || snippet.length < 1)) {
    snippet = _scriptLines[getRandomInt(_scriptLines.length)].trim();
    i += 1;
  }
  return snippet;
}

function getRandomHtmlEls(forceType) {
  const allEls = document.getElementsByTagName('*');
  let randomEl;
  while (!randomEl || !randomEl.id) {
    randomEl = allEls[getRandomInt(allEls.length)];
  }
  const clonedEl = deepCloneEl(randomEl);

  const color = getRandomColor();
  const containerDimensions = document.getElementById('glitch-container').getBoundingClientRect();
  const minHeight = 100;
  const minWidth = 100;
  const x = getRandomInt(containerDimensions.width - minWidth);
  const y = getRandomInt(containerDimensions.height - minHeight);
  const w = getRandomInt(containerDimensions.width - x) + minWidth;
  const h = getRandomInt(containerDimensions.height - y) + minHeight;

  let el = getRandomHtmlEl(forceType)
  let subEl = getRandomHtmlEl();
  subEl.appendChild(clonedEl);
  el.appendChild(clonedEl);
  el.style['position'] = 'absolute';
  el.style['top'] = y;
  el.style['left'] = x;
  el.style['width'] = w;
  el.style['height'] = h;
  el.style['color'] = color;
  el.style['background-color'] = 'rgba(0,0,0,0)';
  return el;
}

function getRandomHtmlEl(forceType) {
  let randomElType = forceType ? forceType : _htmlEls[getRandomInt(_htmlEls.length)];
  const el = document.createElement(randomElType);
  const cssPropertyByName = getRandomCssProperties(20);
  for (const propertyName of Object.keys(cssPropertyByName)) {
    el.style[propertyName] = cssPropertyByName[propertyName];
  }
  if (el.tagName === 'IFRAME') {
    el.setAttribute('src', 'index.html');
  } else if (el.tabName === 'IMG') {
    const randomKey = Object.keys(_audioTitleByKey)[getRandomInt(Object.keys(_audioTitleByKey).length)];
    el.setAttribute('src', 'https://deaconmeek.github.io/experientialradio/img/' + randomKey + '.jpg');
  }
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
  // clonedEl.innerText = getScriptSnippet((clonedEl.innerText || '').split('\n'));
  clonedEl.id = '';
  clonedEl.className = '';
  if (clonedEl.hasChildNodes() && clonedEl.firstChild.tagName) {
    clonedEl.appendChild(cloneEl(clonedEl.firstChild, elAttributes));
  }
  return clonedEl;
}

function getRandomCssProperties(count) {
  const valueByProperty = {};
  for (let i = 0; i < count; i += 1) {
    const randomKeyIndex = getRandomInt(Object.keys(_cssValuesByCssProperty).length);
    const cssPropertyName = Object.keys(_cssValuesByCssProperty)[randomKeyIndex];
    valueByProperty[cssPropertyName] = getRandomCssPropertyValue(cssPropertyName);
  }
  return valueByProperty;
}

function getRandomCssPropertyValue(cssPropertyName) {
  const values = _cssValuesByCssProperty[cssPropertyName];
  const randomValueIndex = getRandomInt(values.length);
  let value = values[randomValueIndex];
  if (value.indexOf('<') === 0) {
    const [type, min, max] = getCssTypeMinMaxFromValue(value);
    if (type === 'length') {
      value = Array(min + (max - min)).fill().map(() => getRandomInt(30) + 'px').join(' ');
    } else if (type === 'integer') {
      value = Array(min + (max - min)).fill().map(() => getRandomInt(30)).join(' ');
    } else if (type === 'color') {
      value = Array(min + (max - min)).fill().map(() => getRandomColor(true)).join(' ');
    } else if (_cssValuesByCssProperty[type]) {
      value = getRandomCssPropertyValue(type, true);
    }
  } else if (['initial', 'unset', 'inherit'].includes(value)) {
    value = '';
  }
  return value;
}

function getCssTypeMinMaxFromValue(value) {
  const type = value.substr(1, (value.indexOf('>') - 1));
  let rangeStr = value.indexOf('{') > -1 ? value.substr(value.indexOf('{')) : '';
  rangeStr = rangeStr.substr(1, (rangeStr.length - 2));
  const min = rangeStr ? rangeStr.split(',')[0] : 1;
  const max = rangeStr ? rangeStr.split(',')[1] : 1;
  return [type, min, max];
}

function altBackground(flashes) {
  let flashCount = 0;
  const timer = window.setInterval(() => {
    if (flashCount % 2) {
      document.getElementById('image-container').style['display'] = 'none';
      document.getElementById('alt-image-container').style['display'] = 'block';
    } else {
      document.getElementById('image-container').style['display'] = 'block';
      document.getElementById('alt-image-container').style['display'] = 'none';
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
  const imageContainerEl = document.getElementById('image-container');
  const htmlEl = document.getElementsByTagName('html')[0];
  const originalColor = htmlEl.getAttribute('background-color');

  imageContainerEl.style['display'] = 'none';
  let flashCount = 0;
  const timer = window.setInterval(() => {
    htmlEl.style['background-color'] = getRandomColor();
    if (flashCount > flashes) {
      window.clearInterval(timer);
      imageContainerEl.style['display'] = 'block';
      htmlEl.style['background-color'] = originalColor;
    }
    flashCount += 1;
  }, 100);
}

function getRandomColor(allowTransparency) {
  let rgba;
  const hex = '#'+(Math.floor((Math.random()*0x777777)) + 0x888888).toString(16).slice(-6);
  if (allowTransparency) {
    const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/.exec(hex);
    if (!result) {
      return hex;
    }
    const rgbaInts = [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), Math.random()];
    rgba = 'rgba(' + rgbaInts.join(',') + ')';
  }
  return rgba || hex;
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
      const imageContainerEl = document.getElementById('image-container');
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

function finalizeScore(score, audioKey, cheat, gameTimeStart) {
  gameTimeStart = gameTimeStart || new Date();
  const totalTime = ((new Date() - gameTimeStart) / 1000)|0;
  const timeBonus = cheat ? 77.77 : 2000 * Math.abs(Math.min((totalTime - TIME_BONUS_THRESHOLD), 0));
  score += parseInt(timeBonus);

  let highScore = getCookie(COOKIE_HIGH_SCORE) || 0;
  const highScoreByAudioKey = getCookie(COOKIE_HIGH_SCORE_BY_AUDIO_KEY) || {};
  let highScoreForTune = highScoreByAudioKey[audioKey] || 0;

  if (score > highScore) {
    highScore = score;
    setCookie(COOKIE_HIGH_SCORE, score);
  }
  if (score > highScoreForTune) {
    highScoreByAudioKey[audioKey] = score;
    highScoreForTune = score;
    setCookie(COOKIE_HIGH_SCORE_BY_AUDIO_KEY, highScoreByAudioKey);
  }

  const codeContainerEl = document.getElementById('code-container');
  codeContainerEl.innerText = codeContainerEl.innerText +
    '\nTIME TAKEN: ' + totalTime + 's' +
    '\nTIME BONUS: ' + timeBonus +
    '\nSCORE: ' + score +
    '\nHIGH SCORE FOR TUNE: ' + highScoreForTune;
    '\nALL TIME HIGH: ' + highScore;

  return score;
}

function initCodeContainer() {
  const codeEl = document.getElementById('code-container');
  codeEl.addEventListener('click', () => {
    codeEl.style.color = codeEl.style.color === 'black' ? 'white' : 'black';
  });
}

// function addIframe() {
//   const iframeEls = document.getElementsByTagName('iframe');
//   if (iframeEls.length === 0) {
//     document.getElementsByTagName('body')[0].append(getRandomHtmlEls('iframe'));
//   }
// }

function getCookie(key) {
  let value;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const nextKey = cookie.trim().split('=')[0];
    if (nextKey === key) {
      value = cookie.split('=')[1];
      break;
    }
  }
  return value ? JSON.parse(value) : null;
}

function setCookie(key, value) {
  document.cookie = key + '=' + JSON.stringify(value) + '; path=/';
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

// function inIframe() {
//   try {
//     return window.self !== window.top;
//   } catch (e) {
//     return true;
//   }
// }

// Loader
if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
}
