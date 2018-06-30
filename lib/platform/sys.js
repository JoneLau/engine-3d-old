var sysKey = {
  // browser type
  BROWSER_TYPE_WECHAT: "wechat",
  BROWSER_TYPE_WECHAT_GAME: "wechatgame",
  BROWSER_TYPE_WECHAT_GAME_SUB: "wechatgamesub",
  BROWSER_TYPE_QQ_PLAY: "qqplay",
  BROWSER_TYPE_ANDROID: "androidbrowser",
  BROWSER_TYPE_IE: "ie",
  BROWSER_TYPE_QQ: "qqbrowser",
  BROWSER_TYPE_MOBILE_QQ: "mqqbrowser",
  BROWSER_TYPE_UC: "ucbrowser",
  BROWSER_TYPE_UCBS: "ucbs",
  BROWSER_TYPE_360: "360browser",
  BROWSER_TYPE_BAIDU_APP: "baiduboxapp",
  BROWSER_TYPE_BAIDU: "baidubrowser",
  BROWSER_TYPE_MAXTHON: "maxthon",
  BROWSER_TYPE_OPERA: "opera",
  BROWSER_TYPE_OUPENG: "oupeng",
  BROWSER_TYPE_MIUI: "miuibrowser",
  BROWSER_TYPE_FIREFOX: "firefox",
  BROWSER_TYPE_SAFARI: "safari",
  BROWSER_TYPE_CHROME: "chrome",
  BROWSER_TYPE_LIEBAO: "liebao",
  BROWSER_TYPE_QZONE: "qzone",
  BROWSER_TYPE_SOUGOU: "sogou",
  BROWSER_TYPE_UNKNOWN: "unknown",
  // os
  OS_UNKNOWN: "Unknown",
  OS_IOS: "iOS",
  OS_ANDROID: "Android",
  OS_WINDOWS: "Windows",
  OS_MARMALADE: "Marmalade",
  OS_LINUX: "Linux",
  OS_BADA: "Bada",
  OS_BLACKBERRY: "Blackberry",
  OS_OSX: "OS X",
  OS_WP8: "WP8",
  OS_WINRT: "WINRT",
};

export default class Sys {
  constructor() {
    this._key = sysKey;
    this._isMobile = false;
    this._os = this._key.BROWSER_TYPE_UNKNOWN;
    this._osVersion = '';
    this._browserType = this._key.BROWSER_TYPE_UNKNOWN;
    this._browserVersion = "";
    this._audioSupport = null;
    this._init();
  }

  _init() {
    this._checkWebGLSupport();
    let sys = this;
    let nav = window.navigator;
    let ua = nav.userAgent.toLowerCase();
    let isAndroid = false, iOS = false, osVersion = '';

    sys._isMobile = /mobile|android|iphone|ipad/.test(ua);

    let uaResult = /android (\d+(?:\.\d+)+)/i.exec(ua) || /android (\d+(?:\.\d+)+)/i.exec(nav.platform);
    if (uaResult) {
      isAndroid = true;
      osVersion = uaResult[1] || "";
    }
    uaResult = /(iPad|iPhone|iPod).*OS ((\d+_?){2,3})/i.exec(ua);
    if (uaResult) {
      iOS = true;
      osVersion = uaResult[2] || "";
    } else if (/(iPhone|iPad|iPod)/.exec(nav.platform)) {
      iOS = true;
      osVersion = "";
    }

    // Get the os of system
    let osName = this._key.OS_UNKNOWN;
    if (nav.appVersion.indexOf("Win") !== -1) {
      osName = this._key.OS_WINDOWS;
    } else if (iOS) {
      osName = this._key.OS_IOS;
    } else if (nav.appVersion.indexOf("Mac") !== -1) {
      osName = this._key.OS_OSX;
    } else if (isAndroid) {
      osName = this._key.OS_ANDROID;
    } else if (nav.appVersion.indexOf("Linux") !== -1 || ua.indexOf("ubuntu") !== -1 || nav.appVersion.indexOf("X11") !== -1) {
      osName = this._key.OS_LINUX;
    }

    sys._os = osName;
    sys._osVersion = osVersion;

    // Determine the browser type
    (function () {
      let typeReg1 = /mqqbrowser|micromessenger|qq|sogou|qzone|liebao|maxthon|ucbs|360 aphone|360browser|baiduboxapp|baidubrowser|maxthon|mxbrowser|miuibrowser/i;
      let typeReg2 = /qqbrowser|ucbrowser/i;
      let typeReg3 = /chrome|safari|firefox|trident|opera|opr\/|oupeng/i;
      let browserTypes = typeReg1.exec(ua);
      if (!browserTypes) browserTypes = typeReg2.exec(ua);
      if (!browserTypes) browserTypes = typeReg3.exec(ua);

      var browserType = browserTypes
        ? browserTypes[0].toLowerCase()
        : this._key.BROWSER_TYPE_UNKNOWN;
      // TODO: add wechatgame and qqplay
      if (browserType === "micromessenger") {
        browserType = sys._key.BROWSER_TYPE_WECHAT;
      } else if (browserType === "safari" && isAndroid) {
        browserType = sys._key.BROWSER_TYPE_ANDROID;
      } else if (browserType === "qq" && ua.match(/android.*applewebkit/i)) {
        browserType = sys._key.BROWSER_TYPE_ANDROID;
      } else if (browserType === "trident") {
        browserType = sys._key.BROWSER_TYPE_IE;
      } else if (browserType === "360 aphone") {
        browserType = sys._key.BROWSER_TYPE_360;
      } else if (browserType === "mxbrowser") {
        browserType = sys._key.BROWSER_TYPE_MAXTHON;
      } else if (browserType === "opr/") {
        browserType = sys._key.BROWSER_TYPE_OPERA;
      }

      sys._browserType = browserType;
    })();

    // Determine the browser version number
    (function () {
      var versionReg1 = /(mqqbrowser|micromessenger|qq|sogou|qzone|liebao|maxthon|uc|ucbs|360 aphone|360|baiduboxapp|baidu|maxthon|mxbrowser|miui)(mobile)?(browser)?\/?([\d.]+)/i;
      var versionReg2 = /(qqbrowser|chrome|safari|firefox|trident|opera|opr\/|oupeng)(mobile)?(browser)?\/?([\d.]+)/i;
      var tmp = ua.match(versionReg1);
      if (!tmp) tmp = ua.match(versionReg2);
      sys._browserVersion = tmp ? tmp[4] : "";
    })();

    // get audio support
    let _audioSupport;
    (function () {
      let supportWebAudio = !!(window.AudioContext || window.webkitAudioContext || window.mozAudioContext);
      _audioSupport = { ONLY_ONE: false, WEB_AUDIO: supportWebAudio, DELAY_CREATE_CTX: false };
      if (sys._os === sys._key.OS_IOS) {
        _audioSupport.USE_LOADER_EVENT = "loadedmetadata";
      }

      if (sys._browserType === sys._key.BROWSER_TYPE_FIREFOX) {
        _audioSupport.DELAY_CREATE_CTX = true;
        _audioSupport.USE_LOADER_EVENT = "canplay";
      }

      if (sys._os === sys._key.OS_ANDROID) {
        if (sys._browserType === sys._key.BROWSER_TYPE_UC) {
          _audioSupport.ONE_SOURCE = true;
        }
      }
    })();

    try {
      if (_audioSupport.WEB_AUDIO) {
        _audioSupport.context = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext)();
        if (_audioSupport.DELAY_CREATE_CTX) {
          setTimeout(function () {
            _audioSupport.context = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext)();
          }, 0);
        }
      }
    } catch (error) {
      _audioSupport.WEB_AUDIO = false;
    }

    function detectAudioFormat() {
      var formatSupport = [];
      var audio = document.createElement("audio");
      if (audio.canPlayType) {
        var ogg = audio.canPlayType('audio/ogg; codecs="vorbis"');
        if (ogg) formatSupport.push(".ogg");
        var mp3 = audio.canPlayType("audio/mpeg");
        if (mp3) formatSupport.push(".mp3");
        var wav = audio.canPlayType('audio/wav; codecs="1"');
        if (wav) formatSupport.push(".wav");
        var mp4 = audio.canPlayType("audio/mp4");
        if (mp4) formatSupport.push(".mp4");
        var m4a = audio.canPlayType("audio/x-m4a");
        if (m4a) formatSupport.push(".m4a");
      }
      return formatSupport;
    }
    _audioSupport.format = detectAudioFormat();
    sys._audioSupport = _audioSupport;
  }

  _checkWebGLSupport() { 
    let supportWebGL = false;
    let create3DContext = function (canvas, opt_attribs, opt_contextType) {
      if (opt_contextType) {
        try {
          return canvas.getContext(opt_contextType, opt_attribs);
        } catch (e) {
          return null;
        }
      }
      else {
        return create3DContext(canvas, opt_attribs, "webgl") ||
          create3DContext(canvas, opt_attribs, "experimental-webgl") ||
          create3DContext(canvas, opt_attribs, "webkit-3d") ||
          create3DContext(canvas, opt_attribs, "moz-webgl") ||
          null;
      }
    };

    if (window.WebGLRenderingContext) {
      if (create3DContext(document.createElement('CANVAS'))) {
        supportWebGL = true;
      }

      if (supportWebGL && this._os === this._key.OS_ANDROID) {
        var browserVer = parseFloat(this._browserVersion);
        switch (this._key.browserType) {
          case this._key.BROWSER_TYPE_MOBILE_QQ:
          case this._key.BROWSER_TYPE_BAIDU:
          case this._key.BROWSER_TYPE_BAIDU_APP:
            // QQ & Baidu Brwoser 6.2+ (using blink kernel)
            if (browserVer >= 6.2) {
              supportWebGL = true;
            } else {
              supportWebGL = false;
            }
            break;
          case this._key.BROWSER_TYPE_ANDROID:
            // Android 5+ default browser
            if (this._key.osMainVersion && this._key.osMainVersion >= 5) {
              supportWebGL = true;
            }
            break;
          case this._key.BROWSER_TYPE_CHROME:
            // Chrome on android supports WebGL from v. 30
            if (browserVer >= 30.0) {
              supportWebGL = true;
            } else {
              supportWebGL = false;
            }
            break;
          case this._key.BROWSER_TYPE_UC:
            if (browserVer > 11.0) {
              supportWebGL = true;
            } else {
              supportWebGL = false;
            }
            break;
          case this._key.BROWSER_TYPE_360:
            supportWebGL = false;
        }
      }
    }

    if (supportWebGL === false) {
      console.error("The current browser does not support webgl");
    }
  }

  get isMobile() {
    return this._isMobile;
  }

  get browserType() {
    return this._browserType;
  }

  get browserVersion() {
    return this._browserVersion;
  }

  get os() {
    return this._os;
  }

  get osVersion() {
    return this._osVersion;
  }

  get audioSupport() {
    return this._audioSupport;
  }
}
