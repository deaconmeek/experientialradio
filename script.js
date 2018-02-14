/* global document, window, XMLHttpRequest, console, JSManipulate, Promise */
'use strict';

const hexChars = '0123456789ABCDEF';
const htmlEls = ['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'b', 'base', 'basefont', 'bdi', 'bdo', 'bgsound', 'big', 'blink', 'blockquote', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'command', 'data', 'datalist', 'dd', 'details', 'dfn', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'header', 'hgroup', 'hr', 'i', 'iframe', 'input', 'isindex', 'kbd', 'keygen', 'label', 'legend', 'li', 'listing', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meta', 'meter', 'multicol', 'nav', 'nextid', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'plaintext', 'pre', 'progress', 'q', 'rp', 's', 'samp', 'section', 'select', 'shadow', 'slot', 'small', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'xmp'];
const imgFilters = ['circlesmear', 'diffusion', 'dither', 'noise', 'pixelate', 'posterize', 'solarize']; // 'invert', 'sepia',

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
  9: 'Scratchy tape town',
  10: 'Stereo checkout',
};

const DECELLERATION_INTERVAL = 1500;
const MUNGE_START_SCORE = 5000;
const MOMENTUM_LEVEL_3 = 15;
const GLITCH_SCORE_MOD = 50000;
const CHAR_ITERATIONS = 15;

let _scriptLines;
let _question;
let _wordsBaseColor;
let _initialQuestion;
let _audioQuestion;
let _questionDeltaByCharIndex = {};
let _answer = 'Experiential radio.';
let _mungeMomentum = 0;
let _score = 0;
let _gameOver = false;
let _clickAnimationHandler;

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
  return el;
}

function deepCloneEl(el) {
  const elAttributes = {};
  const clonedEl = cloneEl(el, elAttributes);
  let traversedEl = clonedEl;
  while (traversedEl) {
    if (traversedEl.tagName === 'CANVAS' && elAttributes.imageData) {
      traversedEl.getContext('2d').putImageData(elAttributes.imageData, 0, 0);
    } else if (traversedEl.tagName === 'AUDIO' && elAttributes.src) {
      traversedEl.setAttribute('src', elAttributes.src);
      traversedEl.setAttribute('autoplay', true);
    } else if (traversedEl.tagName === 'IFRAME') {
      traversedEl.setAttribute('src', 'index.html');
    }
    traversedEl = (traversedEl.hasChildNodes() && traversedEl.firstChild.tagName) ? traversedEl.firstChild : null;
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
  clonedEl.className = '';
  if (clonedEl.hasChildNodes() && clonedEl.firstChild.tagName) {
    clonedEl.appendChild(cloneEl(clonedEl.firstChild, elAttributes));
  }
  return clonedEl;
}

function getScriptSnippet() {
  return _scriptLines[(Math.random() * _scriptLines.length)|0].trim();
}

function playGlitch(duration) {
  const glitchEl = document.getElementById('glitch');
  glitchEl.currentTime = (Math.random() * (glitchEl.duration - (duration / 1000)));
  glitchEl.volume = 0.8;
  window.setTimeout(() => {
    glitchEl.play();
    window.setTimeout(() => {
      glitchEl.pause();
    }, duration);
  }, 100);
}

function munge() {
  updateMomentum(1);
  createDecellerationTimeout();

  const oldScore = _score;
  _score += _mungeMomentum * _mungeMomentum * 10;

  // console.log('_score', _score);
  if (_score < MUNGE_START_SCORE) {
    return;
  }

  if (_gameOver) {
    return;
  }

  const wasGameOver = _gameOver;
  mungeQuestionLetter();
  // mungeAnswerLetter();
  if (!wasGameOver && _gameOver) {
    setGameOver();
    return;
  }

  if (oldScore < MUNGE_START_SCORE && _score >= MUNGE_START_SCORE) {
    setGameStart();
  }
  if (oldScore % GLITCH_SCORE_MOD > _score % GLITCH_SCORE_MOD) {
    altBackground(2);
    playGlitch(300);
    mungeHtml();
  }
}

function updateMomentum(delta) {
  const oldMomentum = _mungeMomentum;
  _mungeMomentum = Math.max(_mungeMomentum + delta, 0);
  if (_mungeMomentum >= MOMENTUM_LEVEL_3) {
    mungeQuestionColor(true);
  } else if (oldMomentum >= MOMENTUM_LEVEL_3) {
    mungeQuestionColor(false);
  }
}

function setGameStart() {
  if (_audioQuestion.length > _initialQuestion.length) {
    _initialQuestion = padWord(_initialQuestion, _audioQuestion.length);
  } else {
    _audioQuestion = padWord(_audioQuestion, _initialQuestion.length);
  }
  setQuestion(_initialQuestion);

  flashBackground(5);
  playGlitch(1000);
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
  document.getElementById('code-container').innerText = document.getElementById('code-container').innerText + '\n' + getScriptSnippet();
}

function mungeQuestionColor(multicolor) {
  document.getElementById('question').setAttribute('style', 'color:' + (multicolor ? getRandomColor() : _wordsBaseColor));
}

function mungeQuestionLetter() {
  let newChar;
  let charIndex;
  while (!Number.isInteger(charIndex) || (_questionDeltaByCharIndex[charIndex] && _questionDeltaByCharIndex[charIndex] > CHAR_ITERATIONS)) {
    charIndex = (Math.random() * _question.length)|0;
  }
  _questionDeltaByCharIndex[charIndex] = _questionDeltaByCharIndex[charIndex] || 0;
  if (_questionDeltaByCharIndex[charIndex] === CHAR_ITERATIONS) {
    newChar = _audioQuestion[charIndex];
  } else {
    newChar = getRandomChar();
  }
  _questionDeltaByCharIndex[charIndex] += 1;
  setQuestion(_question.substr(0, charIndex) + newChar + _question.substr(charIndex + 1));
  _gameOver = Object.values(_questionDeltaByCharIndex).every(o => o > CHAR_ITERATIONS);
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

function filterImageData(imageData, filterToApply) {
  if (!filterToApply) {
    filterToApply = imgFilters[(Math.random() * imgFilters.length)|0];
  }
  // console.log('filter', filterToApply);
  JSManipulate[filterToApply].filter(imageData, {amount: 1});
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

function generateImageUrl(callback) {
  const xhr = new XMLHttpRequest();
  const url = `https://us-central1-dazzling-inferno-8250.cloudfunctions.net/fetchImageUrl?question=${encodeURIComponent(_initialQuestion)}`;
  // const url = `http://localhost:5000/dazzling-inferno-8250/us-central1/fetchImageUrl?question=${encodeURIComponent(_initialQuestion)}`;
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function () {
    if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      callback(xhr.responseText);
      return;
    }
  };
  xhr.send();
}

function setGameOver() {
  const questionLinkEl = document.getElementById('question-link');
  const answerEl = document.getElementById('answer');
  const nextHref = document.location.href.substr(0, document.location.href.indexOf('?')) + '?q=' + encodeURIComponent(_audioQuestion.trim());
  questionLinkEl.setAttribute('href', nextHref);
  setQuestion(_audioQuestion.trim(), true);
  answerEl.style.cursor = 'default';
  answerEl.removeEventListener('click', _clickAnimationHandler);
  altBackground(Number.MAX_SAFE_INTEGER);
  // document.getElementById('question').setAttribute('style', 'background-color:black');
}

function setAudioMode(audioIndex) {
  const beatzEl = document.getElementById('beatz');
  let audioFile;
  if (audioIndex === '0') {
    audioFile = 'audio/' + audioIndex + '.wav';
  } else {
    audioFile = 'audio/' + audioIndex + '.mp3';
  }
  beatzEl.setAttribute('src', audioFile);
}

function setQuestion(question) {
  document.getElementById('question').innerHTML = question + '?';
  _question = question;
}
function setAnswer(answer) {
  document.getElementById('answer').innerHTML = answer;
  _answer = answer;
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

function init() {
  const questionLinkEl = document.getElementById('question-link');
  const answerEl = document.getElementById('answer');
  const answerContainerEl = document.getElementById('answer-container');
  _initialQuestion = generateQuestion(true);
  _wordsBaseColor = answerEl.style.color;
  const nextQuestion = encodeURIComponent(generateQuestion());
  const nextHref = document.location.href.substr(0, document.location.href.indexOf('?')) + '?q=' + nextQuestion;
  questionLinkEl.setAttribute('href', nextHref);
  setQuestion(_initialQuestion);
  setAnswer(_answer);

  while (!_audioQuestion || _audioQuestion === _initialQuestion) {
    const randomInt = Math.floor(Math.random() * Object.keys(audioMeta).length) + 1;
    _audioQuestion = audioMeta[randomInt];
  }

  let audioKey;
  if (Object.values(audioMeta).indexOf(_initialQuestion) >= 0) {
    audioKey = Object.keys(audioMeta)[Object.values(audioMeta).indexOf(_initialQuestion)];
  }

  _clickAnimationHandler = function () {
    // answerEl.classList.remove('fade');
    answerEl.classList.add('notransition'); // Disable transitions
    answerEl.style.color = 'black';
    answerEl.offsetHeight; // Trigger a reflow, flushing the CSS changes
    answerEl.classList.remove('notransition'); // Re-enable transitions
    answerEl.style.color = _wordsBaseColor;
  };

  answerContainerEl.addEventListener('click', munge);
  answerContainerEl.addEventListener('click', _clickAnimationHandler);
  answerContainerEl.addEventListener('click', () => {
    document.getElementById('beatz').play();
  }, {once: true});

  if (audioKey) {
    setAudioMode(audioKey);
  } else {
    setAudioMode('0');
  }
  Promise.resolve().then(() => {
    if (audioKey) {
      return Promise.resolve('https://deaconmeek.github.io/experientialradio/img/' + audioKey + '.jpg');
    } else {
      return new Promise((resolve) => {
        generateImageUrl((imageUrl) => {
          // console.log(imageUrl);
          resolve(imageUrl || 'https://deaconmeek.github.io/experientialradio/img/waaat.jpg');
        });
      });
    }
  }).then((imageUrl) => {
    buildImageData(imageUrl).then((imageData) => {
      if (!audioKey) {
        filterImageData(imageData, 'blur');
      }
      filterImageData(imageData);
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

  const client = new XMLHttpRequest();
  client.open('GET', 'https://deaconmeek.github.io/experientialradio/script.js');
  client.onreadystatechange = function() {
    _scriptLines = client.responseText.split('\n');
  };
  client.send();
}

if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
}