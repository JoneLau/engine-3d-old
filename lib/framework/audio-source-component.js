import { Component } from '../ecs';
import AudioClip from '../assets/audio-clip';

// TODO
let CC_WECHATGAME = false;
let CC_QQPLAY = false;
let touchBinded = false;
let touchPlayList = [
    //{ instance: Audio, offset: 0, audio: audio }
];
let Audio = {};
/**
* !#en Audio state.
* !#zh 声音播放状态
* @enum audioEngine.AudioState
* @memberof cc
*/
// TODO - At present, the state is mixed with two states of users and systems, and it is best to split into two types. A 'loading' should also be added to the system state.
Audio.State = {
  /**
  * @property {Number} ERROR
  */
  ERROR : -1,
  /**
  * @property {Number} INITIALZING
  */
  INITIALZING: 0,
  /**
  * @property {Number} PLAYING
  */
  PLAYING: 1,
  /**
  * @property {Number} PAUSED
  */
  PAUSED: 2
};

/**
 * A representation of a single audio source,
 * contains basic functionalities like play, pause and stop.
 */
export default class AudioSourceComponent extends Component {
  constructor() {
    super();
    this._element = null;
    this._nextTime = 0;  // playback position to set
    this._state = Audio.State.INITIALZING;
  }

  onInit() {
    this._system.add(this);
    /**
     * **@schema** The AudioClip to play
     * @type {AudioClip}
     */
    this.clip = this._clip;
    /**
     * **@schema** Is the audio clip looping?
     * @type {boolean}
     */
    this.loop = this._loop;
    /**
     * **@schema** The volume of the audio source (0.0 to 1.0).
     * @type {number}
     */
    this.volume = this._volume;
    /**
     * **@schema** If set to true, the audio source will automatically start playing on awake.
     * @type {boolean}
     */
    this.playOnAwake = this._playOnAwake;
  }

  onDestroy() {
    this._system.remove(this);
  }

  /**
   * Plays the clip
   */
  play() {
    // marked as playing so it will playOnLoad
    this._state = Audio.State.PLAYING;

    if (!this._element) {
      return;
    }

    this._bindEnded();
    this._element.play();

    if (!(CC_QQPLAY || CC_WECHATGAME) && this._clip && this._clip.loadMode === AudioClip.DOM_AUDIO && this._element.paused) {
      touchPlayList.push({ instance: this, offset: 0, audio: this._element });
    }

    if (touchBinded) return;
    touchBinded = true;

    // Listen to the touchstart body event and play the audio when necessary.
    window.addEventListener('touchstart', function () {
      let item = touchPlayList.pop();
      while (item) {
        item.audio.play(item.offset);
        item = touchPlayList.pop();
      }
    });
  }

  /**
   * Pause the clip
   */
  pause() {
    if (!this._element) return;
    this._unbindEnded();
    this._element.pause();
    this._state = Audio.State.PAUSED;
  }

  /**
   * Resume the clip
   */
  resume() {
    if (!this._element || this._state === Audio.State.PLAYING) return;
    this._bindEnded();
    this._element.play();
    this._state = Audio.State.PLAYING;
  }

  /**
   * Stop the clip
   */
  stop() {
    if (!this._element) return;
    try {
      this._element.currentTime = 0;
    } catch (error) { console.log(error); }
    this._element.pause();
    // remove touchPlayList
    for (let i=0; i<touchPlayList.length; i++) {
      if (touchPlayList[i].instance === this) {
        touchPlayList.splice(i, 1);
        break;
      }
    }
    this._unbindEnded();
    this._state = Audio.State.PAUSED;
  }

  /**
   * set the current time, in seconds
   * @param {number} num time you want to jump to 
   */
  set currentTime(num) {
    if (this._element) {
      this._nextTime = 0;
    }
    else {
      this._nextTime = num;
      return;
    }

    this._unbindEnded();
    if (!(CC_QQPLAY || CC_WECHATGAME)) {
      this._bindEnded(function () {
        this._bindEnded();
      }.bind(this));
    }
    try {
      this._element.currentTime = num;
    }
    catch (err) {
      let _element = this._element;
      if (_element.addEventListener) {
        let func = function () {
          _element.removeEventListener('loadedmetadata', func);
          _element.currentTime = num;
        };
        _element.addEventListener('loadedmetadata', func);
      }
    }
  }

  /**
   * get the current time, in seconds
   * @return {number} time current played time
   */
  get currentTime() {
    return this._element ? this._element.currentTime : 0;
  }

  /**
   * get the audio duration, in seconds
   * @return {number} audio duration
   */
  get duration() {
    return this._element ? this._element.duration : 0;
  }

  /**
   * get the audio duration, in seconds
   * @return {number} audio duration
   */
  get state() {
    if (!CC_WECHATGAME) {
      let elem = this._element;
      if (elem && Audio.State.PLAYING === this._state && elem.paused) {
        this._state = Audio.State.PAUSED;
      }
    }
    return this._state;
  }

  /**
   * is the audio currently paused?
   * @return {boolean} paused?
   */
  get paused() {
    return this._element ? this._element.paused : true;
  }

  _bindEnded(callback) {
    callback = callback || this._onended;
    if (this._clip && this._clip.loadMode === AudioClip.DOM_AUDIO) {
      this._element.addEventListener('ended', callback);
    } else {
      this._element.onended = callback;
    }
  }

  _unbindEnded() {
    if (this._clip && this._clip.loadMode === AudioClip.DOM_AUDIO) {
      this._element.removeEventListener('ended', this._onended);
    } else {
      this._element.onended = null;
    }
  }

  _onLoaded() {
    let elem = this._clip.nativeAsset;
    if (this._clip.loadMode === AudioClip.DOM_AUDIO || CC_QQPLAY || CC_WECHATGAME) {
      this._element = elem;
    }
    else {
      this._element = new WebAudioElement(elem, this);
    }

    this.volume = this._volume;
    this.loop = this._loop;
    if (this._nextTime !== 0) {
      this.setCurrentTime(this._nextTime);
    }
    if (this._state === Audio.State.PLAYING || this._playOnAwake) {
      this.play();
    }
    else {
      this._state = Audio.State.INITIALZING;
    }
  }
}

AudioSourceComponent.schema = {
  clip: {
    type: 'asset',
    default: null,
    set(val) {
      if (val) {
        this._clip = val;
        if (val._loaded) {
          this._onLoaded();
        }
        else {
          val.once('load', function () {
            if (val === this._clip) {
              this._onLoaded();
            }
          }.bind(this));
        }
      }
      else {
        this._clip = null;
        this._element = null;
        this._state = Audio.State.INITIALZING;
      }
      return val;
    },
  },
  loop: {
    type: 'boolean',
    default: false,
    set(val) {
      this._loop = val;
      if (this._element) {
        this._element.loop = val;
      }
    },
  },
  playOnAwake: {
    type: 'boolean',
    default: true,
    set(val) {
      this._playOnAwake = val;
      if (val) this._state = Audio.State.PLAYING;
    },
  },
  volume: {
    type: 'number',
    default: 1,
    set(val) {
      this._volume = val;
      if (this._element) {
        this._element.volume = val;
      }
    },
  },
};

// possible TODO: everything below could be moved into AudioClip
// so that the component could be agnostic about the clip being played
// and behave uniformly across clips. Let AudioClip worry about its LoadMode.

// Encapsulated WebAudio interface
let WebAudioElement = function (buffer, audio) {
  this._audio = audio;
  this._context = this._audio._system.__audioSupport.context;
  this._buffer = buffer;

  this._gainObj = this._context['createGain']();
  this._volume = 1;
  // https://www.chromestatus.com/features/5287995770929152
  if (this._gainObj['gain'].setTargetAtTime) {
    this._gainObj['gain'].setTargetAtTime(this._volume, this._context.currentTime, 0.01);
  } else {
    this._gainObj['gain'].value = this._volume;
  }
  this._gainObj['connect'](this._context['destination']);

  this._loop = false;
  // The time stamp on the audio time axis when the recording begins to play.
  this._startTime = -1;
  // Record the currently playing 'Source'
  this._currentSource = null;
  // Record the time has been played
  this.playedLength = 0;

  this._currextTimer = null;

  this._endCallback = function () {
    if (this.onended) {
      this.onended(this);
    }
  }.bind(this);
};

(function (proto) {
  proto.play = function (offset) {
    // If repeat play, you need to stop before an audio
    if (this._currentSource && !this.paused) {
      this._currentSource.onended = null;
      this._currentSource.stop(0);
      this.playedLength = 0;
    }

    let audio = this._context['createBufferSource']();
    audio.buffer = this._buffer;
    audio['connect'](this._gainObj);
    audio.loop = this._loop;

    this._startTime = this._context.currentTime;
    offset = offset || this.playedLength;
    if (offset) {
      this._startTime -= offset;
    }
    let duration = this._buffer.duration;

    let startTime = offset;
    let endTime;
    if (this._loop) {
      if (audio.start)
        audio.start(0, startTime);
      else if (audio['notoGrainOn'])
        audio['noteGrainOn'](0, startTime);
      else
        audio['noteOn'](0, startTime);
    } else {
      endTime = duration - offset;
      if (audio.start)
        audio.start(0, startTime, endTime);
      else if (audio['notoGrainOn'])
        audio['noteGrainOn'](0, startTime, endTime);
      else
        audio['noteOn'](0, startTime, endTime);
    }

    this._currentSource = audio;

    audio.onended = this._endCallback;

    // If the current audio context time stamp is 0 and audio context state is suspended
    // There may be a need to touch events before you can actually start playing audio
    if ((!audio.context.state || audio.context.state === 'suspended') && this._context.currentTime === 0) {
      let self = this;
      clearTimeout(this._currextTimer);
      this._currextTimer = setTimeout(function () {
        if (!(CC_QQPLAY || CC_WECHATGAME) && self._context.currentTime === 0) {
          touchPlayList.push({
            instance: self._audio,
            offset: offset,
            audio: self
          });
        }
      }, 10);
    }
  };

  proto.pause = function () {
    clearTimeout(this._currextTimer);
    if (this.paused) return;
    // Record the time the current has been played
    this.playedLength = this._context.currentTime - this._startTime;
    // If more than the duration of the audio, Need to take the remainder
    this.playedLength %= this._buffer.duration;
    let audio = this._currentSource;
    this._currentSource = null;
    this._startTime = -1;
    if (audio)
      audio.stop(0);
  };

  proto.__defineGetter__('paused', function () {
    // If the current audio is a loop, paused is false
    if (this._currentSource && this._currentSource.loop)
      return false;

    // startTime default is -1
    if (this._startTime === -1)
      return true;

    // Current time -  Start playing time > Audio duration
    return this._context.currentTime - this._startTime > this._buffer.duration;
  });

  proto.__defineGetter__('loop', function () { return this._loop; });
  proto.__defineSetter__('loop', function (bool) {
    if (this._currentSource)
      this._currentSource.loop = bool;

    return this._loop = bool;
  });

  proto.__defineGetter__('volume', function () {
    return this._volume;
  });
  proto.__defineSetter__('volume', function (num) {
    this._volume = num;
    if (this._gainObj['gain'].setTargetAtTime) {
      this._gainObj['gain'].setTargetAtTime(this._volume, this._context.currentTime, 0.01);
    } else {
      this._volume['gain'].value = num;
    }
    if (this._audio._system.os === this._audio._system.OS_IOS && !this.paused && this._currentSource) {
      // IOS must be stop webAudio
      this._currentSource.onended = null;
      this.pause();
      this.play();
    }
    return num;
  });

  proto.__defineGetter__('currentTime', function () {
    if (this.paused) {
      return this.playedLength;
    }
    // Record the time the current has been played
    this.playedLength = this._context.currentTime - this._startTime;
    // If more than the duration of the audio, Need to take the remainder
    this.playedLength %= this._buffer.duration;
    return this.playedLength;
  });
  proto.__defineSetter__('currentTime', function (num) {
    if (!this.paused) {
      this.pause();
      this.playedLength = num;
      this.play();
    } else {
      this.playedLength = num;
    }
    return num;
  });

  proto.__defineGetter__('duration', function () {
    return this._buffer.duration;
  });

})(WebAudioElement.prototype);
