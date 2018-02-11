/* global document, window, XMLHttpRequest, lodash, console, JSManipulate */
'use strict';

const hexChars = '0123456789ABCDEF';
const htmlEls = ['a', 'abbr', 'acronym', 'address', 'applet', 'area', 'article', 'aside', 'audio', 'b', 'base', 'basefont', 'bdi', 'bdo', 'bgsound', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'command', 'content', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'frame', 'frameset', 'h1', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'image', 'img', 'input', 'ins', 'isindex', 'kbd', 'keygen', 'label', 'legend', 'li', 'link', 'listing', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meta', 'meter', 'multicol', 'nav', 'nextid', 'nobr', 'noembed', 'noframes', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'plaintext', 'pre', 'progress', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'script', 'section', 'select', 'shadow', 'slot', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr', 'xmp'];
const imgFilters = ['circlesmear', 'diffusion', 'dither', 'invert', 'noise', 'pixelate', 'posterize', 'sepia', 'solarize'];

const adjectives = [
  'Sweet', 'Sour', 'Naughty', 'Boiling', 'Freezing', 'Questionable', 'Sound', 'Experimental',
  'Reasonable', 'Magnificent', 'Conventional', 'Unusual', 'Unreasonable',
];
const nouns = [
  'tit', 'rabbits', 'predicament', 'content', 'nature', 'god', 'advice', 'doubt', 'grapes',
  'fuck', 'ass', 'shit', 'gripes',
];
const audioMeta = {
  1: 'Amen breakdown',
  2: 'Desent',
  3: 'In the mist',
  4: 'Irie abstraction',
  5: 'Isn\'t rearrangement rave',
  6: 'Know that I am god',
  7: 'Little red fox',
  8: 'Newage bullshit',
  9: 'Scratchy tape town',
  10: 'Stereo checkout',
};

const DECELLERATION_FACTOR = 8;
const MUNGE_LEVEL_1 = 700;

let _question;
let _answer = 'Experiential radio.';
let _imageUrl;
let _mungeRate = 9;
let _mungeMomentum = 0;
let _mungeStopTimer;
let _score;

function getRandomColor() {
  let color = '#';
  for (let i = 0; i < 6; i += 1) {
    color += hexChars[(Math.random() * 16)|0];
  }
  return color;
}

function getRandomHtmlEl() {
  const type = htmlEls[(Math.random() * htmlEls.length)|0];
  const el = document.createElement(type);
  const color = getRandomColor();
  const screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  const w = (Math.random() * screenWidth)|0;
  const h = (Math.random() * screenHeight)|0;
  const x = (Math.random() * screenWidth)|0;
  const y = (Math.random() * screenHeight)|0;
  const size = (Math.random() * 100)|0;
  el.setAttribute('style', 'z-index:10;font-size:' + size + 'px;color:' + color + ';position:absolute;top:' + y + ';left:' + x + ';width:' + w + ';height:' + h + ';');
  el.innerHTML = String.fromCharCode((Math.random() * Number.MAX_SAFE_INTEGER)|0);
  return el;
}

function playSound(sound, callback) {
  document.getElementById(sound).play();
  document.getElementById(sound).onended = callback;
}

function munge() {
  if (_mungeMomentum > 1000) {
    mungeQuestion();
    mungeAnswer();
  } else {
    mungeAnswerLetter();
  }
  updateMomentum();
  const oldScore = _score;
  updateScore();
  if (!oldScore && _score) {
    mungeBackground();
  }
  if (oldScore % 100000 > _score % 100000) {
    mungeHtml();
  }
}

function mungeBackground() {
  const bgEl = document.getElementById('bg');
  const htmlEl = document.getElementsByTagName('html')[0];
  const originalColor = htmlEl.getAttribute('background-color');
  playSound('glitch2', function () {
    bgEl.style['display'] = 'block';
    htmlEl.style['background-color'] = originalColor;
    window.clearInterval(timer);
  });
  bgEl.style['display'] = 'none';
  const timer = window.setInterval(function () {
    htmlEl.style['background-color'] = getRandomColor();
  }, 100);
}

function mungeHtml() {
  playSound('glitch');
  const el = getRandomHtmlEl();
  document.getElementsByTagName('html')[0].prepend(el);
}

function mungeQuestion() {
  document.getElementById('question').setAttribute('style', 'color:' + getRandomColor());
}

function mungeAnswer() {
  let newAnswer = '';
  const randInt = Math.random() * 10|0;
  for (let char of [..._answer]) {
    newAnswer += String.fromCharCode(char.charCodeAt() + randInt);
  }
  document.getElementById('answer').innerHTML = newAnswer;
  _answer = newAnswer;
}

function mungeAnswerLetter() {
  const randInt1 = (Math.random() * _answer.length)|0;
  const randInt2 = (Math.random() * 10)|0;
  _answer = _answer.substr(0, randInt1) + String.fromCharCode(_answer[randInt1].charCodeAt() + randInt2) + _answer.substr(randInt1 + 1);
  document.getElementById('answer').innerHTML = _answer;
}

function updateMomentum() {
  setMomentum(_mungeMomentum + (_mungeRate * _mungeRate)|0);
  const newMungeRate =  Math.min(Math.max(((1000 - _mungeMomentum) / 100)|0, 2), 9);
  if (_mungeRate !== newMungeRate) {
    _mungeRate = newMungeRate;
    updateDebounceMungeHandler();
  }
  updateDecellerationHandler();
}

function updateDecellerationHandler(decellerating) {
  let timeout;
  window.clearTimeout(_mungeStopTimer);
  timeout = _mungeRate * 50;
  if (decellerating) {
    setMomentum(Math.max(_mungeMomentum - (((_mungeMomentum / DECELLERATION_FACTOR)|0) + 1), 0));
    if (_mungeMomentum === 0) {
      return;
    }
  }
  _mungeStopTimer = window.setTimeout(() => {
    updateDecellerationHandler(true);
  }, timeout);
}

function setMomentum(newMomentum) {
  _mungeMomentum = newMomentum;
  const redness = Math.min(((_mungeMomentum / 1000) * 255|0), 255);
  document.getElementById('answer').setAttribute('style', 'color:rgb(' + redness + ',0,0)');
  // console.log('_mungeMomentum', _mungeMomentum, '_mungeRate', _mungeRate);
}

function updateScore() {
  if (!_score) {
    if (_mungeMomentum > MUNGE_LEVEL_1) {
      document.getElementById('score').classList.remove('hidden');
      _score = 1000;
    }
    return;
  }
  const mungeScore = ((_mungeMomentum * _mungeMomentum / 10000)|0) * 10;
  _score += mungeScore;
  document.getElementById('score').innerHTML = _score;
}

function toggleAudio() {
  const muted = !document.getElementById('beatz').muted;
  const playImg = muted ? 'img/tape2.png' : 'img/tape2.gif';
  document.getElementById('beatz').muted = muted;
  document.getElementById('play-icon').setAttribute('src', playImg);
}

function setImage(url, callback) {
  const sourceEl = document.getElementById('source');
  const canvasEl = document.getElementById('piccy');
  sourceEl.crossOrigin = "Anonymous";
  sourceEl.onload = () => {
    canvasEl.height = sourceEl.height;
    canvasEl.width = sourceEl.width;
    const context = canvasEl.getContext('2d');
    context.drawImage(sourceEl, 0, 0);
    const data = context.getImageData(0,0,canvasEl.width, canvasEl.height);
    const randomFilter = imgFilters[(Math.random() * imgFilters.length)|0];
    console.log('randomFilter', randomFilter);
    JSManipulate.blur.filter(data, {amount: 1});
    JSManipulate[randomFilter].filter(data);
    context.putImageData(data,0,0);
    canvasEl.style.opacity = 1;

    document.getElementById('question').classList.add('stroke');
    document.getElementById('answer').classList.add('stroke');
    document.getElementById('score').classList.add('stroke');
    if (callback) {
      callback();
      return;
    }
  };
  sourceEl.setAttribute('src', url);
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
    adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  }
  while (!noun || noun === lastNoun) {
    noun = nouns[Math.floor(Math.random() * nouns.length)];
  }
  return `${adjective} ${noun}`;
}

function generateImageUrl(callback) {
  const xhr = new XMLHttpRequest();
  // const url = `https://us-central1-dazzling-inferno-8250.cloudfunctions.net/fetchImage?question=${question}`;
  const url = `http://localhost:5000/dazzling-inferno-8250/us-central1/fetchImageUrl?question=${encodeURIComponent(_question)}`;
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function () {
    if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      callback(xhr.responseText);
      return;
    }
  };
  xhr.send();
}

function initWords() {
  const questionEl = document.getElementById('question');
  const answerEl = document.getElementById('answer');
  const answerLinkEl = document.getElementById('answer-link');
  questionEl.innerHTML = _question + '?';
  answerEl.innerHTML = _answer;
  const nextQuestion = encodeURIComponent(generateQuestion());
  const nextHref = document.location.href.substr(0, document.location.href.indexOf('?')) + '?q=' + nextQuestion;
  answerLinkEl.setAttribute('href', nextHref);
}

function initAudio() {
  const beatzEl = document.getElementById('beatz');
  const playEl = document.getElementById('play');
  const playIconEl = document.getElementById('play-icon');
  const questionEl = document.getElementById('question');

  const randomInt = Math.floor(Math.random() * Object.keys(audioMeta).length) + 1;
  const audioFile = 'audio/' + randomInt + '.mp3';
  const audioImgUrl = 'img/' + randomInt + '.jpg';
  const audioTitle = audioMeta[randomInt];

  beatzEl.setAttribute('src', audioFile);
  playIconEl.setAttribute('src', 'img/tape2.gif');

  window.addEventListener('keydown', (e) => {
    if (e.keyCode === 32) {
      toggleAudio();
    }
  });

  playEl.onclick = (e) => {
    e.preventDefault();
    toggleAudio();
  };

  playIconEl.addEventListener('mouseenter', () => {
    setImage(audioImgUrl, () => {
      questionEl.innerHTML = audioTitle + '?';
    });
  });
  playIconEl.addEventListener('mouseleave', () => {
    setImage(_imageUrl, () => {
      questionEl.innerHTML = _question;
    });
  });
  playIconEl.addEventListener('touchstart', () => {
    setImage(audioImgUrl, () => {
      questionEl.innerHTML = audioTitle + '?';
    });
  });
  playIconEl.addEventListener('touchend', () => {
    setImage(_imageUrl, () => {
      questionEl.innerHTML = _question;
    });
  });
}

function initImage() {
  generateImageUrl((imageUrl) => {
    _imageUrl = imageUrl || 'img/waaat.jpg';
    // var imageUrl = 'https://c1.staticflickr.com/5/4595/24610547237_32bf1ed085.jpg';
    setImage(_imageUrl);
  });
}

function updateDebounceMungeHandler () {
  const trailing = _mungeRate <= 5;
  document.getElementById('answer').onmousemove =
    lodash.debounce(munge, (_mungeRate * 10), { leading: true, trailing: trailing });
  document.getElementById('answer').ontouchmove =
    lodash.debounce(munge, (_mungeRate * 10), { leading: true, trailing: trailing });
}

function initMunger() {
  updateDebounceMungeHandler();
}

function init() {
  _question = generateQuestion(true);
  initWords();
  initAudio();
  initImage();
  initMunger();
}
if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
}