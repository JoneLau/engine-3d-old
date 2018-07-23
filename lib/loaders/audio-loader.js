import AudioClip from '../assets/audio-clip';
let sys = null;

/**
 * Load the audio resource at the specified URL
 * @param {App} app the global app instance
 * @param {{bin:string}} urls URL where the resource is located
 * @param {function(e:Error, c:AudioClip)} callback the callback after resource loaded or failed
 * @return {?Error} error message if there is one
 */
export default function (app, urls, callback) {
  sys = app.system('audio');

  if (sys.__audioSupport.format.length === 0) {
    return new Error('no audio file format available.');
  }
  let audioID = sys.getIDByURL(urls.bin);
  if (audioID) {
    sys._getClipByID(audioID).once('load', function () {
      callback(null, sys._getClipByID(audioID));
    });
    return;
  }

  let loader = null;
  if (!sys.__audioSupport.WEB_AUDIO) {
    // If WebAudio is not supported, load using DOM mode
    loader = loadDomAudio;
  }
  else {
    // TODO: urls end with ?useDom=1
    loader = loadWebAudio;
  }
  urls.url = urls.bin;
  loader(urls, callback);
}

// TODO: merge with resl solution
function loadDomAudio (item, callback) {
  let dom = document.createElement('audio');
  dom.src = item.url;

  // if (CC_WECHATGAME) {
  //   callback(null, dom);
  //   return;
  // }

  let clearEvent = function () {
    clearTimeout(timer);
    dom.removeEventListener('canplaythrough', success, false);
    dom.removeEventListener('error', failure, false);
    if(sys.__audioSupport.USE_LOADER_EVENT)
      dom.removeEventListener(sys.__audioSupport.USE_LOADER_EVENT, success, false);
  };
  let timer = setTimeout(function () {
    if (dom.readyState === 0)
      failure();
    else
      success();
  }, 8000);
  let clip = new AudioClip();
  clip.url = item.url;
  sys.addClip(item.url, clip);
  let success = function () {
    clearEvent();
    clip.nativeAsset = dom;
    clip.loadMode = AudioClip.DOM_AUDIO;
    clip.emit('load');
    callback(null, clip);
  };
  let failure = function () {
    clearEvent();
    let message = 'load audio failure - ' + item.url;
    console.log(message);
    sys.removeClip(item.url);
    callback(message);
  };
  dom.addEventListener('canplaythrough', success, false);
  dom.addEventListener('error', failure, false);
  if(sys.__audioSupport.USE_LOADER_EVENT)
    dom.addEventListener(sys.__audioSupport.USE_LOADER_EVENT, success, false);
}

function loadWebAudio (item, callback) {
  if (!sys.__audioSupport.context) callback(new Error('audio context not found.'));

  let request = getXMLHttpRequest();
  request.open('GET', item.url, true);
  request.responseType = 'arraybuffer';

  // fist add reference to audio system
  let clip = new AudioClip();
  clip.url = item.url;
  sys.addClip(item.url, clip);
  // Our asynchronous callback
  request.onload = function () {
    sys.__audioSupport.context['decodeAudioData'](request.response, function(buffer){
      clip.nativeAsset = buffer;
      //success
      clip.emit('load');
      callback(null, clip);
    }, function(){
      //error
      sys.removeClip(item.url);
      callback('decode error', null);
    });
  };

  request.onerror = function(){
    sys.removeClip(item.url);
    callback('request error', null);
  };

  request.send();
}

function getXMLHttpRequest () {
  return window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject('MSXML2.XMLHTTP');
}
