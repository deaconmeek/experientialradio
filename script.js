
if (document.readyState !== 'loading') {
  load();
} else {
  document.addEventListener('DOMContentLoaded', function () {
    load();
  });
}

function load() {
  var img = document.getElementsByTagName('img')[0];
  setMapCoords(img);
  img.onload = function(){
    setMapCoords(img);
  }
}

function setMapCoords(img) {
  var coords1 = [0, img.height * 0.75, img.width, img.height * 0.855];
  var coords2 = [0, img.height * 0.87, img.width, img.height * 0.97];
  document.getElementById("link1").setAttribute("coords", coords1.join(','));
  document.getElementById("link2").setAttribute("coords", coords2.join(','));
}

window.ga=function(){ga.q.push(arguments)};ga.q=[];ga.l=+new Date;
ga('create','UA-113501052-1','auto');ga('send','pageview')