/* global document, window, XMLHttpRequest, JSManipulate, Promise */
'use strict';

const hexChars = '0123456789ABCDEF';
const htmlEls = ['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'b', 'base', 'basefont', 'bdi', 'bdo', 'bgsound', 'big', 'blink', 'blockquote', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'command', 'data', 'datalist', 'dd', 'details', 'dfn', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'header', 'hgroup', 'hr', 'i', 'iframe', 'input', 'isindex', 'kbd', 'keygen', 'label', 'legend', 'li', 'listing', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meta', 'meter', 'multicol', 'nav', 'nextid', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'plaintext', 'pre', 'progress', 'q', 'rp', 's', 'samp', 'section', 'select', 'shadow', 'slot', 'small', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'xmp'];
const imgFilters = ['circlesmear', 'diffusion', 'dither', 'noise', 'pixelate', 'posterize']; // 'invert', 'sepia', 'solarize'
const finalCharDeltaLookup = [10, 22, 13, 19, 16, 21, 23, 23, 23, 14, 14, 24, 25, 24, 15, 11, 17, 20, 21, 23, 12, 16, 22, 21, 11, 14, 19, 16, 18, 22, 21, 24, 11, 15, 18, 23, 13, 18, 19, 19, 23, 16, 15, 16, 13, 10, 12, 22, 22, 17];

const phrases = [
  'Holy fuck', 'Conscientious objector', 'Unreasonable behaviour', 'Magnificent void', 'Reasonable doubt', 'Sound advice',
  'Questionable content', 'Conventional wisdom', 'Political agenda', 'Unusual predicament', 'Unique situation', 'Naughty nature',
  'Beautiful losers', 'Suspicious activity', 'Complete ass', 'Heavenly creatures', 'Manufacturing consent', 'Vengeful god',
];
const unicodeBrackets = {
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

const audioMeta = {
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

const DECELLERATION_INTERVAL = 1500;
const MOMENTUM_BONUS_THRESHOLD = 15;
const ANSWER_CLICK_TIMEOUT = 20000;
const TIME_BONUS_THRESHOLD = 80;
const HIGH_SCORE_COOKIE = 'alltimehigh';
const VERSION = '1.0.3';

let _scriptLines;
let _charsBaseColor;
let _initialQuestion;
let _nextAudioQuestion;
let _audioModeKey;
let _questionDeltaByCharIndex;
let _questionCharElByCharIndex;
let _answerCharElByCharIndex;
let _mungeMomentum = 0;
let _score = 0;
let _gameStart = false;
let _preGameOver = false;
let _gameOver = false;
let _gameTimeStart;

function getRandomColor() {
  let color = '#';
  for (let i = 0; i < 6; i += 1) {
    color += hexChars[(Math.random() * 16)|0];
  }
  return color;
}

function getRandomHtmlEl() {
  const allEls = document.getElementsByTagName('*');
  let randomEl;
  while (!randomEl || !randomEl.id) {
    randomEl = allEls[(Math.random() * allEls.length)|0];
  }
  const clonedEl = deepCloneEl(randomEl);

  const color = getRandomColor();
  const screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  const x = (Math.random() * (screenWidth - 100))|0;
  const y = (Math.random() * (screenHeight - 100))|0;
  const w = ((Math.random() * (screenWidth - x))|0) + 100;
  const h = ((Math.random() * (screenHeight - y))|0) + 100;
  const size = (Math.random() * 100)|0;

  let randomElType = htmlEls[(Math.random() * htmlEls.length)|0];
  let el = document.createElement(randomElType);
  el.appendChild(clonedEl);
  el.setAttribute('style', 'z-index:10;font-size:' + size + 'px;color:' + color + ';position:absolute;top:' + y + ';left:' + x + ';width:' + w + ';height:' + h + ';');
  el.addEventListener('click', munge);
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

function getScriptSnippet() {
  let snippet;
  while (!snippet || snippet.length < 5) {
    snippet = _scriptLines[(Math.random() * _scriptLines.length)|0].trim();
  }
  return snippet;
}

function playGlitch(duration) {
  const glitchEl = document.getElementById('glitch');
  glitchEl.currentTime = (Math.random() * (glitchEl.duration - (duration / 1000)))|0;
  window.setTimeout(() => {
    glitchEl.play();
    window.setTimeout(() => {
      glitchEl.pause();
    }, duration);
  }, 100);
}

function playBeep() {
  const beepEl = document.getElementById('beep');
  beepEl.play();
}

function munge() {
  if (!_gameStart || _gameOver) {
    return;
  }

  updateMomentum(1);
  createDecellerationTimeout();
  updateScore((_mungeMomentum * _mungeMomentum) + 1)

  const changeColor = _mungeMomentum >= MOMENTUM_BONUS_THRESHOLD;
  changeQuestionLetter(changeColor);
}

function glitch() {
  altBackground(2);
  playGlitch(300);
  mungeHtml();
}

function updateMomentum(delta) {
  _mungeMomentum = Math.max(_mungeMomentum + delta, 0);
}

function getBinaryScore() {
  let scoreString = _score.toString(2);
  while (scoreString.length < 20) {
    scoreString = '0' + scoreString;
  }
  return scoreString;
}

function updateScore(delta) {
  _score = Math.max(_score + delta, 0);
  const scoreString = getBinaryScore();
  updateAnswerChars(scoreString, true);
}

function flashBackground(flashes) {
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

function mungeHtml() {
  document.getElementsByTagName('body')[0].append(getRandomHtmlEl());
  document.getElementById('code-container').innerText = document.getElementById('code-container').innerText +
    '\n' + getScriptSnippet();
}

function finalizeScore() {

  const totalTime = ((new Date() - _gameTimeStart) / 1000)|0;
  const timeBonus = 2000 * Math.abs(Math.min((totalTime - TIME_BONUS_THRESHOLD), 0));
  _score += timeBonus;

  if (_score > getHighScore()) {
    document.cookie = HIGH_SCORE_COOKIE + '=' + _score + '; path=/';
  }

  document.getElementById('code-container').innerText = document.getElementById('code-container').innerText +
    '\nTIME TAKEN: ' + totalTime + 's' +
    '\nTIME BONUS: ' + timeBonus +
    '\nSCORE: ' + _score +
    '\nALL TIME HIGH: ' + getHighScore() +
    '\nv' + VERSION;
}

function changeQuestionLetter(changeColor) {
  if (_preGameOver) {
    return;
  }
  let newChar;
  let charIndex;
  let finalCharDelta;
  while (!Number.isInteger(charIndex)) {
    const nextCharIndex = (Math.random() * Object.keys(_questionDeltaByCharIndex).length)|0;
    finalCharDelta = finalCharDeltaLookup[nextCharIndex];
    if (_questionDeltaByCharIndex[nextCharIndex] <= finalCharDelta) {
      charIndex = nextCharIndex;
    }
  }
  if (_questionDeltaByCharIndex[charIndex] === finalCharDelta) {
    newChar = _nextAudioQuestion[charIndex];
    glitch();
  } else {
    newChar = getRandomChar();
  }
  _questionDeltaByCharIndex[charIndex] += 1;
  _preGameOver = (Object.keys(_questionDeltaByCharIndex).every((charIndex) => {
    const delta = _questionDeltaByCharIndex[charIndex];
    return delta > finalCharDeltaLookup[charIndex];
  }));
  const spanEl = _questionCharElByCharIndex[charIndex];
  animateCharEl(spanEl, () => {
    spanEl.innerHTML =  newChar === ' ' ? '&nbsp;' : newChar;
    spanEl.style.color = changeColor ? getRandomColor() : _charsBaseColor;
    if (_preGameOver) {
      spanEl.addEventListener("transitionend", () => {
        if (!_gameOver) {
          setGameOver();
        }
      }, {once: true});
    }
  });
}

function getRandomChar() {
  const unicodeBracket = unicodeBrackets[(Math.random() * Math.min(_mungeMomentum, 10))|0];
  const startingInt = parseInt(unicodeBracket[0], 16);
  const range = parseInt(unicodeBracket[1], 16);
  const randomInt = startingInt + ((Math.random() * range)|0);
  return String.fromCharCode(randomInt);
}

function createDecellerationTimeout() {
  window.setTimeout(() => {
    updateMomentum(-1);
    // console.log(_mungeMomentum);
  }, DECELLERATION_INTERVAL);
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
    filterToApply = imgFilters[(Math.random() * imgFilters.length)|0];
  }
  // console.log('filter', filterToApply);
  JSManipulate[filterToApply].filter(imageData, props);
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
    adjective = phrases[Math.floor(Math.random() * phrases.length)].split(' ')[0];
  }
  while (!noun || noun === lastNoun) {
    noun = phrases[Math.floor(Math.random() * phrases.length)].split(' ')[1];
  }
  return `${adjective} ${noun}`;
}

function generateImageUrl(queryString, callback) {
  const xhr = new XMLHttpRequest();
  const url = `https://us-central1-dazzling-inferno-8250.cloudfunctions.net/fetchImageUrl?question=${encodeURIComponent(queryString)}`;
  // const url = `http://localhost:5000/dazzling-inferno-8250/us-central1/fetchImageUrl?question=${encodeURIComponent(queryString)}`;
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function () {
    if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      callback(xhr.responseText);
      return;
    }
  };
  xhr.send();
}

function setGameStart() {
  const mainImageEl = document.getElementById('main-image');
  const tunesEl = document.getElementById('tunes');
  const scoreString = getBinaryScore();
  setChars(scoreString, 'score', 1000);
  flashBackground(5);
  playGlitch(1000);
  tunesEl.play();
  mainImageEl.addEventListener('click', munge);
  mainImageEl.style.cursor = 'pointer';

  let paddedQuestion = _initialQuestion + '?'
  if (_nextAudioQuestion.length > paddedQuestion.length) {
    paddedQuestion = padWord(paddedQuestion, _nextAudioQuestion.length);
  } else {
    _nextAudioQuestion = padWord(_nextAudioQuestion, paddedQuestion.length);
  }
  setChars(paddedQuestion, 'question', 0);
  _questionDeltaByCharIndex = {};
  for (const charIndex of Object.keys(_questionCharElByCharIndex)) {
    _questionDeltaByCharIndex[charIndex] = 0;
  }

  _gameStart = true;
}

function setGameOver() {
  _gameOver = true;
  const nextHref = document.location.href.substr(0, document.location.href.indexOf('?')) +
    '?q=' + encodeURIComponent(_nextAudioQuestion.trim());
  const questionClickHandler = () => document.location = nextHref;
  for (const spanEl of Object.values(_questionCharElByCharIndex)) {
    spanEl.style.cursor = 'pointer';
    spanEl.addEventListener('click', questionClickHandler);
  }
  const codeEl = document.getElementById('code-container');
  codeEl.style.cursor = 'pointer';
  codeEl.addEventListener('click', () => {
    codeEl.style.color = codeEl.style.color === 'black' ? 'white' : 'black';
  });
  altBackground(Number.MAX_SAFE_INTEGER);
  finalizeScore();
}

function getHighScore() {
  let highScore;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const key = cookie.trim().split('=')[0];
    if (key === 'alltimehigh') {
      highScore = cookie.split('=')[1];
      break;
    }
  }
  return parseInt(highScore, 10) || 0;
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

// Assumes string is of same length as _answerCharElByCharIndex
function updateAnswerChars(string, animate) {
  const charEls = Object.values(_answerCharElByCharIndex);
  for (const [i, char] of [...string].entries()) {
    const spanEl = charEls[i];
    if (spanEl.innerHTML === char) {
      continue;
    }
    if (animate) {
      animateCharEl(spanEl, () => {
        spanEl.innerHTML =  char === ' ' ? '&nbsp;' : char;
        spanEl.style.color = _charsBaseColor;
      });
    } else {
      spanEl.innerHTML =  char === ' ' ? '&nbsp;' : char;
    }
  }
}

function animateCharEl(el, callback) {
  // el.classList.add('notransition'); // Disable transitions
  el.style.color = 'black';
  el.offsetHeight; // Trigger a reflow, flushing the CSS changes
  // el.classList.remove('notransition'); // Re-enable transitions
  let done = false;
  let errorHandler;
  let callbackHandler = () => {
    if (!done) {
      done = true;
      window.clearTimeout(errorHandler);
      return callback();
    }
  }
  errorHandler = window.setTimeout(callbackHandler, 500);
  el.addEventListener("transitionend", callbackHandler, {once: true});
}

function setChars(string, type, displayDelay, clickHandler) {
  let containerEl;
  let charElByCharIndex;
  let className;
  if (type === 'question') {
    containerEl = document.getElementById('question-subcontainer');
    _questionCharElByCharIndex = {};
    charElByCharIndex = _questionCharElByCharIndex;
  } else if (type === 'answer') {
    containerEl = document.getElementById('answer-subcontainer');
    _answerCharElByCharIndex = {};
    charElByCharIndex = _answerCharElByCharIndex;
  } else if (type === 'score') {
    containerEl = document.getElementById('answer-subcontainer');
    _answerCharElByCharIndex = {};
    charElByCharIndex = _answerCharElByCharIndex;
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
}

function initPreGameElements() {
  const newQuestion = generateQuestion(true);

  // Init next audio title
  let audioTitle;
  while (!audioTitle || audioTitle === newQuestion) {
    const randomInt = Math.floor(Math.random() * Object.keys(audioMeta).length) + 1;
    audioTitle = audioMeta[randomInt];
  }
  _nextAudioQuestion = audioTitle;
  _initialQuestion = newQuestion;

  // Init question (relies on _nextAudioQuestion)
  const nextQuestion = encodeURIComponent(generateQuestion());
  const nextHref = document.location.href.substr(0, document.location.href.indexOf('?')) + '?q=' + nextQuestion;
  const questionClickHandler = () => document.location.replace(nextHref);
  setChars(_initialQuestion + '?', 'question', 1000, questionClickHandler);
  _charsBaseColor = _questionCharElByCharIndex[0].style.color;

  // Init answer
  const answerClickHandler = function (e) {
    const el = e.target;
    if (el.style.color === 'black') {
      return;
    }
    if (!_gameTimeStart) {
      _gameTimeStart = new Date();
    }
    playBeep();
    el.style.color = 'black';
    const answerCharEls = Object.values(_answerCharElByCharIndex);
    const activateGame = answerCharEls.every(o => o.innerHTML === '&nbsp;' || o.style.color === 'black');
    if (activateGame) {
      for (const spanEl of answerCharEls) {
        spanEl.removeEventListener('click', answerClickHandler);
      }
      setGameStart();
    }
    window.setTimeout(() => {
      el.style.color = _charsBaseColor;
    }, Math.max(((Math.random() * ANSWER_CLICK_TIMEOUT) | 0), 2000));
  };
  const answer = 'Experiential radio.';
  setChars(answer, 'answer', 2000, answerClickHandler);

  // Init current audio track (relies on _initialQuestion)
  if (Object.values(audioMeta).indexOf(_initialQuestion) >= 0) {
    _audioModeKey = Object.keys(audioMeta)[Object.values(audioMeta).indexOf(_initialQuestion)];
  } else {
    _audioModeKey = '0';
  }
  const tunesEl = document.getElementById('tunes');
  let audioFile;
  audioFile = 'audio/' + _audioModeKey + '.mp3';
  tunesEl.setAttribute('src', audioFile);

  // Init background image
  Promise.resolve().then(() => {
    if (_audioModeKey !== '0') {
      return Promise.resolve('https://deaconmeek.github.io/experientialradio/img/' + _audioModeKey + '.jpg');
    } else {
      return new Promise((resolve) => {
        generateImageUrl(_initialQuestion, (imageUrl) => {
          // console.log(imageUrl);
          resolve(imageUrl || 'https://deaconmeek.github.io/experientialradio/img/waaat.jpg');
        });
      });
    }
  }).then((imageUrl) => {
    buildImageData(imageUrl).then((imageData) => {
      if (_audioModeKey === '0') {
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

  // Init _scriptLines
  const client = new XMLHttpRequest();
  client.open('GET', 'https://deaconmeek.github.io/experientialradio/script.js');
  client.onreadystatechange = function() {
    _scriptLines = client.responseText.split('\n');
  };
  client.send();
}

// Loader
if (document.readyState !== 'loading') {
  initPreGameElements();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initPreGameElements();
  });
}
