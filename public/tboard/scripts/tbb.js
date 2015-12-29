(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// getScreenMedia helper by @HenrikJoreteg
var getUserMedia = require('getusermedia');

// cache for constraints and callback
var cache = {};

module.exports = function (constraints, cb) {
    var hasConstraints = arguments.length === 2;
    var callback = hasConstraints ? cb : constraints;
    var error;

    if (typeof window === 'undefined' || window.location.protocol === 'http:') {
        error = new Error('NavigatorUserMediaError');
        error.name = 'HTTPS_REQUIRED';
        return callback(error);
    }

    if (window.navigator.userAgent.match('Chrome')) {
        var chromever = parseInt(window.navigator.userAgent.match(/Chrome\/(.*) /)[1], 10);
        var maxver = 33;
        var isCef = !window.chrome.webstore;
        // "known" crash in chrome 34 and 35 on linux
        if (window.navigator.userAgent.match('Linux')) maxver = 35;

        // check that the extension is installed by looking for a
        // sessionStorage variable that contains the extension id
        // this has to be set after installation unless the contest
        // script does that
        if (sessionStorage.getScreenMediaJSExtensionId) {
            chrome.runtime.sendMessage(sessionStorage.getScreenMediaJSExtensionId,
                {type:'getScreen', id: 1}, null,
                function (data) {
                    if (!data || data.sourceId === '') { // user canceled
                        var error = new Error('NavigatorUserMediaError');
                        error.name = 'PERMISSION_DENIED';
                        callback(error);
                    } else {
                        constraints = (hasConstraints && constraints) || {audio: false, video: {
                            mandatory: {
                                chromeMediaSource: 'desktop',
                                maxWidth: window.screen.width,
                                maxHeight: window.screen.height,
                                maxFrameRate: 3
                            },
                            optional: [
                                {googLeakyBucket: true},
                                {googTemporalLayeredScreencast: true}
                            ]
                        }};
                        constraints.video.mandatory.chromeMediaSourceId = data.sourceId;
                        getUserMedia(constraints, callback);
                    }
                }
            );
        } else if (window.cefGetScreenMedia) {
            //window.cefGetScreenMedia is experimental - may be removed without notice
            window.cefGetScreenMedia(function(sourceId) {
                if (!sourceId) {
                    var error = new Error('cefGetScreenMediaError');
                    error.name = 'CEF_GETSCREENMEDIA_CANCELED';
                    callback(error);
                } else {
                    constraints = (hasConstraints && constraints) || {audio: false, video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            maxWidth: window.screen.width,
                            maxHeight: window.screen.height,
                            maxFrameRate: 3
                        },
                        optional: [
                            {googLeakyBucket: true},
                            {googTemporalLayeredScreencast: true}
                        ]
                    }};
                    constraints.video.mandatory.chromeMediaSourceId = sourceId;
                    getUserMedia(constraints, callback);
                }
            });
        } else if (isCef || (chromever >= 26 && chromever <= maxver)) {
            // chrome 26 - chrome 33 way to do it -- requires bad chrome://flags
            // note: this is basically in maintenance mode and will go away soon
            constraints = (hasConstraints && constraints) || {
                video: {
                    mandatory: {
                        googLeakyBucket: true,
                        maxWidth: window.screen.width,
                        maxHeight: window.screen.height,
                        maxFrameRate: 3,
                        chromeMediaSource: 'screen'
                    }
                }
            };
            getUserMedia(constraints, callback);
        } else {
            // chrome 34+ way requiring an extension
            var pending = window.setTimeout(function () {
                error = new Error('NavigatorUserMediaError');
                error.name = 'EXTENSION_UNAVAILABLE';
                return callback(error);
            }, 1000);
            cache[pending] = [callback, hasConstraints ? constraints : null];
            window.postMessage({ type: 'getScreen', id: pending }, '*');
        }
    } else if (window.navigator.userAgent.match('Firefox')) {
        var ffver = parseInt(window.navigator.userAgent.match(/Firefox\/(.*)/)[1], 10);
        if (ffver >= 33) {
            constraints = (hasConstraints && constraints) || {
                video: {
                    mozMediaSource: 'window',
                    mediaSource: 'window'
                }
            }
            getUserMedia(constraints, function (err, stream) {
                callback(err, stream);
                // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1045810
                if (!err) {
                    var lastTime = stream.currentTime;
                    var polly = window.setInterval(function () {
                        if (!stream) window.clearInterval(polly);
                        if (stream.currentTime == lastTime) {
                            window.clearInterval(polly);
                            if (stream.onended) {
                                stream.onended();
                            }
                        }
                        lastTime = stream.currentTime;
                    }, 500);
                }
            });
        } else {
            error = new Error('NavigatorUserMediaError');
            error.name = 'EXTENSION_UNAVAILABLE'; // does not make much sense but...
        }
    }
};

window.addEventListener('message', function (event) {
    if (event.origin != window.location.origin) {
        return;
    }
    if (event.data.type == 'gotScreen' && cache[event.data.id]) {
        var data = cache[event.data.id];
        var constraints = data[1];
        var callback = data[0];
        delete cache[event.data.id];

        if (event.data.sourceId === '') { // user canceled
            var error = new Error('NavigatorUserMediaError');
            error.name = 'PERMISSION_DENIED';
            callback(error);
        } else {
            constraints = constraints || {audio: false, video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    maxWidth: window.screen.width,
                    maxHeight: window.screen.height,
                    maxFrameRate: 3
                },
                optional: [
                    {googLeakyBucket: true},
                    {googTemporalLayeredScreencast: true}
                ]
            }};
            constraints.video.mandatory.chromeMediaSourceId = event.data.sourceId;
            getUserMedia(constraints, callback);
        }
    } else if (event.data.type == 'getScreenPending') {
        window.clearTimeout(event.data.id);
    }
});

},{"getusermedia":2}],2:[function(require,module,exports){
// getUserMedia helper by @HenrikJoreteg
var adapter = require('webrtc-adapter-test');

module.exports = function (constraints, cb) {
    var options, error;
    var haveOpts = arguments.length === 2;
    var defaultOpts = {video: true, audio: true};

    var denied = 'PermissionDeniedError';
    var altDenied = 'PERMISSION_DENIED';
    var notSatisfied = 'ConstraintNotSatisfiedError';

    // make constraints optional
    if (!haveOpts) {
        cb = constraints;
        constraints = defaultOpts;
    }

    // treat lack of browser support like an error
    if (!navigator.getUserMedia) {
        // throw proper error per spec
        error = new Error('MediaStreamError');
        error.name = 'NotSupportedError';

        // keep all callbacks async
        return window.setTimeout(function () {
            cb(error);
        }, 0);
    }

    // normalize error handling when no media types are requested
    if (!constraints.audio && !constraints.video) {
        error = new Error('MediaStreamError');
        error.name = 'NoMediaRequestedError';

        // keep all callbacks async
        return window.setTimeout(function () {
            cb(error);
        }, 0);
    }

    // testing support
    if (localStorage && localStorage.useFirefoxFakeDevice === "true") {
        constraints.fake = true;
    }

    navigator.getUserMedia(constraints, function (stream) {
        cb(null, stream);
    }, function (err) {
        var error;
        // coerce into an error object since FF gives us a string
        // there are only two valid names according to the spec
        // we coerce all non-denied to "constraint not satisfied".
        if (typeof err === 'string') {
            error = new Error('MediaStreamError');
            if (err === denied || err === altDenied) {
                error.name = denied;
            } else {
                error.name = notSatisfied;
            }
        } else {
            // if we get an error object make sure '.name' property is set
            // according to spec: http://dev.w3.org/2011/webrtc/editor/getusermedia.html#navigatorusermediaerror-and-navigatorusermediaerrorcallback
            error = err;
            if (!error.name) {
                // this is likely chrome which
                // sets a property called "ERROR_DENIED" on the error object
                // if so we make sure to set a name
                if (error[denied]) {
                    err.name = denied;
                } else {
                    err.name = notSatisfied;
                }
            }
        }

        cb(error);
    });
};

},{"webrtc-adapter-test":3}],3:[function(require,module,exports){
/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* jshint browser: true, camelcase: true, curly: true, devel: true,
   eqeqeq: true, forin: false, globalstrict: true, node: true,
   quotmark: single, undef: true, unused: strict */
/* global mozRTCIceCandidate, mozRTCPeerConnection, Promise,
mozRTCSessionDescription, webkitRTCPeerConnection, MediaStreamTrack */
/* exported trace,requestUserMedia */

'use strict';

var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;
var webrtcDetectedVersion = null;
var webrtcMinimumVersion = null;
var webrtcUtils = {
  log: function() {
    // suppress console.log output when being included as a module.
    if (typeof module !== 'undefined' ||
        typeof require === 'function' && typeof define === 'function') {
      return;
    }
    console.log.apply(console, arguments);
  },
  extractVersion: function(uastring, expr, pos) {
    var match = uastring.match(expr);
    return match && match.length >= pos && parseInt(match[pos]);
  }
};

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  if (window.performance) {
    var now = (window.performance.now() / 1000).toFixed(3);
    webrtcUtils.log(now + ': ' + text);
  } else {
    webrtcUtils.log(text);
  }
}

if (typeof window === 'object') {
  if (window.HTMLMediaElement &&
    !('srcObject' in window.HTMLMediaElement.prototype)) {
    // Shim the srcObject property, once, when HTMLMediaElement is found.
    Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
      get: function() {
        // If prefixed srcObject property exists, return it.
        // Otherwise use the shimmed property, _srcObject
        return 'mozSrcObject' in this ? this.mozSrcObject : this._srcObject;
      },
      set: function(stream) {
        if ('mozSrcObject' in this) {
          this.mozSrcObject = stream;
        } else {
          // Use _srcObject as a private property for this shim
          this._srcObject = stream;
          // TODO: revokeObjectUrl(this.src) when !stream to release resources?
          this.src = URL.createObjectURL(stream);
        }
      }
    });
  }
  // Proxy existing globals
  getUserMedia = window.navigator && window.navigator.getUserMedia;
}

// Attach a media stream to an element.
attachMediaStream = function(element, stream) {
  element.srcObject = stream;
};

reattachMediaStream = function(to, from) {
  to.srcObject = from.srcObject;
};

if (typeof window === 'undefined' || !window.navigator) {
  webrtcUtils.log('This does not appear to be a browser');
  webrtcDetectedBrowser = 'not a browser';
} else if (navigator.mozGetUserMedia && window.mozRTCPeerConnection) {
  webrtcUtils.log('This appears to be Firefox');

  webrtcDetectedBrowser = 'firefox';

  // the detected firefox version.
  webrtcDetectedVersion = webrtcUtils.extractVersion(navigator.userAgent,
      /Firefox\/([0-9]+)\./, 1);

  // the minimum firefox version still supported by adapter.
  webrtcMinimumVersion = 31;

  // The RTCPeerConnection object.
  window.RTCPeerConnection = function(pcConfig, pcConstraints) {
    if (webrtcDetectedVersion < 38) {
      // .urls is not supported in FF < 38.
      // create RTCIceServers with a single url.
      if (pcConfig && pcConfig.iceServers) {
        var newIceServers = [];
        for (var i = 0; i < pcConfig.iceServers.length; i++) {
          var server = pcConfig.iceServers[i];
          if (server.hasOwnProperty('urls')) {
            for (var j = 0; j < server.urls.length; j++) {
              var newServer = {
                url: server.urls[j]
              };
              if (server.urls[j].indexOf('turn') === 0) {
                newServer.username = server.username;
                newServer.credential = server.credential;
              }
              newIceServers.push(newServer);
            }
          } else {
            newIceServers.push(pcConfig.iceServers[i]);
          }
        }
        pcConfig.iceServers = newIceServers;
      }
    }
    return new mozRTCPeerConnection(pcConfig, pcConstraints); // jscs:ignore requireCapitalizedConstructors
  };

  // The RTCSessionDescription object.
  if (!window.RTCSessionDescription) {
    window.RTCSessionDescription = mozRTCSessionDescription;
  }

  // The RTCIceCandidate object.
  if (!window.RTCIceCandidate) {
    window.RTCIceCandidate = mozRTCIceCandidate;
  }

  // getUserMedia constraints shim.
  getUserMedia = function(constraints, onSuccess, onError) {
    var constraintsToFF37 = function(c) {
      if (typeof c !== 'object' || c.require) {
        return c;
      }
      var require = [];
      Object.keys(c).forEach(function(key) {
        if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
          return;
        }
        var r = c[key] = (typeof c[key] === 'object') ?
            c[key] : {ideal: c[key]};
        if (r.min !== undefined ||
            r.max !== undefined || r.exact !== undefined) {
          require.push(key);
        }
        if (r.exact !== undefined) {
          if (typeof r.exact === 'number') {
            r.min = r.max = r.exact;
          } else {
            c[key] = r.exact;
          }
          delete r.exact;
        }
        if (r.ideal !== undefined) {
          c.advanced = c.advanced || [];
          var oc = {};
          if (typeof r.ideal === 'number') {
            oc[key] = {min: r.ideal, max: r.ideal};
          } else {
            oc[key] = r.ideal;
          }
          c.advanced.push(oc);
          delete r.ideal;
          if (!Object.keys(r).length) {
            delete c[key];
          }
        }
      });
      if (require.length) {
        c.require = require;
      }
      return c;
    };
    if (webrtcDetectedVersion < 38) {
      webrtcUtils.log('spec: ' + JSON.stringify(constraints));
      if (constraints.audio) {
        constraints.audio = constraintsToFF37(constraints.audio);
      }
      if (constraints.video) {
        constraints.video = constraintsToFF37(constraints.video);
      }
      webrtcUtils.log('ff37: ' + JSON.stringify(constraints));
    }
    return navigator.mozGetUserMedia(constraints, onSuccess, onError);
  };

  navigator.getUserMedia = getUserMedia;

  // Shim for mediaDevices on older versions.
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {getUserMedia: requestUserMedia,
      addEventListener: function() { },
      removeEventListener: function() { }
    };
  }
  navigator.mediaDevices.enumerateDevices =
      navigator.mediaDevices.enumerateDevices || function() {
    return new Promise(function(resolve) {
      var infos = [
        {kind: 'audioinput', deviceId: 'default', label: '', groupId: ''},
        {kind: 'videoinput', deviceId: 'default', label: '', groupId: ''}
      ];
      resolve(infos);
    });
  };

  if (webrtcDetectedVersion < 41) {
    // Work around http://bugzil.la/1169665
    var orgEnumerateDevices =
        navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices = function() {
      return orgEnumerateDevices().then(undefined, function(e) {
        if (e.name === 'NotFoundError') {
          return [];
        }
        throw e;
      });
    };
  }
} else if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection) {
  webrtcUtils.log('This appears to be Chrome');

  webrtcDetectedBrowser = 'chrome';

  // the detected chrome version.
  webrtcDetectedVersion = webrtcUtils.extractVersion(navigator.userAgent,
      /Chrom(e|ium)\/([0-9]+)\./, 2);

  // the minimum chrome version still supported by adapter.
  webrtcMinimumVersion = 38;

  // The RTCPeerConnection object.
  window.RTCPeerConnection = function(pcConfig, pcConstraints) {
    // Translate iceTransportPolicy to iceTransports,
    // see https://code.google.com/p/webrtc/issues/detail?id=4869
    if (pcConfig && pcConfig.iceTransportPolicy) {
      pcConfig.iceTransports = pcConfig.iceTransportPolicy;
    }

    var pc = new webkitRTCPeerConnection(pcConfig, pcConstraints); // jscs:ignore requireCapitalizedConstructors
    var origGetStats = pc.getStats.bind(pc);
    pc.getStats = function(selector, successCallback, errorCallback) { // jshint ignore: line
      var self = this;
      var args = arguments;

      // If selector is a function then we are in the old style stats so just
      // pass back the original getStats format to avoid breaking old users.
      if (arguments.length > 0 && typeof selector === 'function') {
        return origGetStats(selector, successCallback);
      }

      var fixChromeStats = function(response) {
        var standardReport = {};
        var reports = response.result();
        reports.forEach(function(report) {
          var standardStats = {
            id: report.id,
            timestamp: report.timestamp,
            type: report.type
          };
          report.names().forEach(function(name) {
            standardStats[name] = report.stat(name);
          });
          standardReport[standardStats.id] = standardStats;
        });

        return standardReport;
      };

      if (arguments.length >= 2) {
        var successCallbackWrapper = function(response) {
          args[1](fixChromeStats(response));
        };

        return origGetStats.apply(this, [successCallbackWrapper, arguments[0]]);
      }

      // promise-support
      return new Promise(function(resolve, reject) {
        if (args.length === 1 && selector === null) {
          origGetStats.apply(self, [
              function(response) {
                resolve.apply(null, [fixChromeStats(response)]);
              }, reject]);
        } else {
          origGetStats.apply(self, [resolve, reject]);
        }
      });
    };

    return pc;
  };

  // add promise support
  ['createOffer', 'createAnswer'].forEach(function(method) {
    var nativeMethod = webkitRTCPeerConnection.prototype[method];
    webkitRTCPeerConnection.prototype[method] = function() {
      var self = this;
      if (arguments.length < 1 || (arguments.length === 1 &&
          typeof(arguments[0]) === 'object')) {
        var opts = arguments.length === 1 ? arguments[0] : undefined;
        return new Promise(function(resolve, reject) {
          nativeMethod.apply(self, [resolve, reject, opts]);
        });
      } else {
        return nativeMethod.apply(this, arguments);
      }
    };
  });

  ['setLocalDescription', 'setRemoteDescription',
      'addIceCandidate'].forEach(function(method) {
    var nativeMethod = webkitRTCPeerConnection.prototype[method];
    webkitRTCPeerConnection.prototype[method] = function() {
      var args = arguments;
      var self = this;
      return new Promise(function(resolve, reject) {
        nativeMethod.apply(self, [args[0],
            function() {
              resolve();
              if (args.length >= 2) {
                args[1].apply(null, []);
              }
            },
            function(err) {
              reject(err);
              if (args.length >= 3) {
                args[2].apply(null, [err]);
              }
            }]
          );
      });
    };
  });

  // getUserMedia constraints shim.
  var constraintsToChrome = function(c) {
    if (typeof c !== 'object' || c.mandatory || c.optional) {
      return c;
    }
    var cc = {};
    Object.keys(c).forEach(function(key) {
      if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
        return;
      }
      var r = (typeof c[key] === 'object') ? c[key] : {ideal: c[key]};
      if (r.exact !== undefined && typeof r.exact === 'number') {
        r.min = r.max = r.exact;
      }
      var oldname = function(prefix, name) {
        if (prefix) {
          return prefix + name.charAt(0).toUpperCase() + name.slice(1);
        }
        return (name === 'deviceId') ? 'sourceId' : name;
      };
      if (r.ideal !== undefined) {
        cc.optional = cc.optional || [];
        var oc = {};
        if (typeof r.ideal === 'number') {
          oc[oldname('min', key)] = r.ideal;
          cc.optional.push(oc);
          oc = {};
          oc[oldname('max', key)] = r.ideal;
          cc.optional.push(oc);
        } else {
          oc[oldname('', key)] = r.ideal;
          cc.optional.push(oc);
        }
      }
      if (r.exact !== undefined && typeof r.exact !== 'number') {
        cc.mandatory = cc.mandatory || {};
        cc.mandatory[oldname('', key)] = r.exact;
      } else {
        ['min', 'max'].forEach(function(mix) {
          if (r[mix] !== undefined) {
            cc.mandatory = cc.mandatory || {};
            cc.mandatory[oldname(mix, key)] = r[mix];
          }
        });
      }
    });
    if (c.advanced) {
      cc.optional = (cc.optional || []).concat(c.advanced);
    }
    return cc;
  };

  getUserMedia = function(constraints, onSuccess, onError) {
    if (constraints.audio) {
      constraints.audio = constraintsToChrome(constraints.audio);
    }
    if (constraints.video) {
      constraints.video = constraintsToChrome(constraints.video);
    }
    webrtcUtils.log('chrome: ' + JSON.stringify(constraints));
    return navigator.webkitGetUserMedia(constraints, onSuccess, onError);
  };
  navigator.getUserMedia = getUserMedia;

  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {getUserMedia: requestUserMedia,
                              enumerateDevices: function() {
      return new Promise(function(resolve) {
        var kinds = {audio: 'audioinput', video: 'videoinput'};
        return MediaStreamTrack.getSources(function(devices) {
          resolve(devices.map(function(device) {
            return {label: device.label,
                    kind: kinds[device.kind],
                    deviceId: device.id,
                    groupId: ''};
          }));
        });
      });
    }};
  }

  // A shim for getUserMedia method on the mediaDevices object.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      return requestUserMedia(constraints);
    };
  } else {
    // Even though Chrome 45 has navigator.mediaDevices and a getUserMedia
    // function which returns a Promise, it does not accept spec-style
    // constraints.
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(c) {
      webrtcUtils.log('spec:   ' + JSON.stringify(c)); // whitespace for alignment
      c.audio = constraintsToChrome(c.audio);
      c.video = constraintsToChrome(c.video);
      webrtcUtils.log('chrome: ' + JSON.stringify(c));
      return origGetUserMedia(c);
    };
  }

  // Dummy devicechange event methods.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (typeof navigator.mediaDevices.addEventListener === 'undefined') {
    navigator.mediaDevices.addEventListener = function() {
      webrtcUtils.log('Dummy mediaDevices.addEventListener called.');
    };
  }
  if (typeof navigator.mediaDevices.removeEventListener === 'undefined') {
    navigator.mediaDevices.removeEventListener = function() {
      webrtcUtils.log('Dummy mediaDevices.removeEventListener called.');
    };
  }

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    if (webrtcDetectedVersion >= 43) {
      element.srcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      webrtcUtils.log('Error attaching stream to element.');
    }
  };
  reattachMediaStream = function(to, from) {
    if (webrtcDetectedVersion >= 43) {
      to.srcObject = from.srcObject;
    } else {
      to.src = from.src;
    }
  };

} else if (navigator.mediaDevices && navigator.userAgent.match(
    /Edge\/(\d+).(\d+)$/)) {
  webrtcUtils.log('This appears to be Edge');
  webrtcDetectedBrowser = 'edge';

  webrtcDetectedVersion = webrtcUtils.extractVersion(navigator.userAgent,
      /Edge\/(\d+).(\d+)$/, 2);

  // the minimum version still supported by adapter.
  webrtcMinimumVersion = 12;
} else {
  webrtcUtils.log('Browser does not appear to be WebRTC-capable');
}

// Returns the result of getUserMedia as a Promise.
function requestUserMedia(constraints) {
  return new Promise(function(resolve, reject) {
    getUserMedia(constraints, resolve, reject);
  });
}

var webrtcTesting = {};
try {
  Object.defineProperty(webrtcTesting, 'version', {
    set: function(version) {
      webrtcDetectedVersion = version;
    }
  });
} catch (e) {}

if (typeof module !== 'undefined') {
  var RTCPeerConnection;
  if (typeof window !== 'undefined') {
    RTCPeerConnection = window.RTCPeerConnection;
  }
  module.exports = {
    RTCPeerConnection: RTCPeerConnection,
    getUserMedia: getUserMedia,
    attachMediaStream: attachMediaStream,
    reattachMediaStream: reattachMediaStream,
    webrtcDetectedBrowser: webrtcDetectedBrowser,
    webrtcDetectedVersion: webrtcDetectedVersion,
    webrtcMinimumVersion: webrtcMinimumVersion,
    webrtcTesting: webrtcTesting,
    webrtcUtils: webrtcUtils
    //requestUserMedia: not exposed on purpose.
    //trace: not exposed on purpose.
  };
} else if ((typeof require === 'function') && (typeof define === 'function')) {
  // Expose objects and functions when RequireJS is doing the loading.
  define([], function() {
    return {
      RTCPeerConnection: window.RTCPeerConnection,
      getUserMedia: getUserMedia,
      attachMediaStream: attachMediaStream,
      reattachMediaStream: reattachMediaStream,
      webrtcDetectedBrowser: webrtcDetectedBrowser,
      webrtcDetectedVersion: webrtcDetectedVersion,
      webrtcMinimumVersion: webrtcMinimumVersion,
      webrtcTesting: webrtcTesting,
      webrtcUtils: webrtcUtils
      //requestUserMedia: not exposed on purpose.
      //trace: not exposed on purpose.
    };
  });
}

},{}],4:[function(require,module,exports){
// created by @HenrikJoreteg
var prefix;
var version;

if (window.mozRTCPeerConnection || navigator.mozGetUserMedia) {
    prefix = 'moz';
    version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
} else if (window.webkitRTCPeerConnection || navigator.webkitGetUserMedia) {
    prefix = 'webkit';
    version = navigator.userAgent.match(/Chrom(e|ium)/) && parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);
}

var PC = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
var MediaStream = window.webkitMediaStream || window.MediaStream;
var screenSharing = window.location.protocol === 'https:' &&
    ((prefix === 'webkit' && version >= 26) ||
     (prefix === 'moz' && version >= 33))
var AudioContext = window.AudioContext || window.webkitAudioContext;
var videoEl = document.createElement('video');
var supportVp8 = videoEl && videoEl.canPlayType && videoEl.canPlayType('video/webm; codecs="vp8", vorbis') === "probably";
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia || navigator.mozGetUserMedia;

// export support flags and constructors.prototype && PC
module.exports = {
    prefix: prefix,
    browserVersion: version,
    support: !!PC && !!getUserMedia,
    // new support style
    supportRTCPeerConnection: !!PC,
    supportVp8: supportVp8,
    supportGetUserMedia: !!getUserMedia,
    supportDataChannel: !!(PC && PC.prototype && PC.prototype.createDataChannel),
    supportWebAudio: !!(AudioContext && AudioContext.prototype.createMediaStreamSource),
    supportMediaStream: !!(MediaStream && MediaStream.prototype.removeTrack),
    supportScreenSharing: !!screenSharing,
    // constructors
    AudioContext: AudioContext,
    PeerConnection: PC,
    SessionDescription: SessionDescription,
    IceCandidate: IceCandidate,
    MediaStream: MediaStream,
    getUserMedia: getUserMedia
};

},{}],5:[function(require,module,exports){
/* 
* @Author: Phenix
* @Date:   2015-12-28 12:34:55
* @Last Modified time: 2015-12-28 16:42:08
*/

'use strict';
var callCtrl;
(function(){
    var _proto, _debug;
    _debug = true;
    function CallCtrl(){
        this.id = 0;
        this.status = 'idle';
        this.dst = 0;
    }
    
    _proto = CallCtrl.prototype;
    callCtrl = CallCtrl;

    _proto.setId = function(id){
        this.id = id;
    };
    //calling part
    function callingEnd(){
        var err = {name: this.dst+' is busy, try it later'};
        this.onStartCb(err);
        this.status = 'idle';
    }
    _proto.start = function(type,peer,cb){
        var self = this;
        this.onCmdSend({cmd:'start',from:this.id,to:peer,type:type});
        this.status = 'trying';
        this.onStartCb = cb;
        this.dst = peer;
        this.timer =setTimeout(function(){
            callingEnd.call(self);
        }, 30000);
    };

    _proto.stop = function(cb){
        this.onCmdSend({cmd:'stop',from:id,to:peer});
        if(this.status == 'active'){
            if(cb)cb();
            this.status = 'close';
        }else{
            //trying
            this.status = 'idle';
        }
    };
    // called part
    _proto.answer = function(type){
        var peer = this.dst;
        if(type == 'deny'){
            this.onCmdSend({cmd:'deny',from:this.id,to:peer});
            this.status = 'idle';
        }else{
            this.onCmdSend({cmd:'accept',from:this.id,to:peer,type:type});
            this.status = 'active';
        }

    };

    _proto.reset = function(){
        this.status = 'idle';
    };

    _proto.hdlMsg = function(msg){
        var self = this;
        var peer = msg.from;
        var cmd = msg.cmd;

        if(_debug)console.log('call ',peer,' status is ',this.status, ' cmd is ',cmd);
        switch(this.status){
            case 'idle':
                switch(cmd){
                    case 'start':
                        if(this.onCallIn(peer,msg.type)){
                            this.dst = peer,
                            this.status = 'ringing';
                        }else{
                            this.onCmdSend({cmd:'deny',from:this.id,to:peer});
                        }
                    break;
                }
            break;
            case 'trying':
                switch(cmd){
                    case 'deny':
                        clearTimeout(this.timer);
                        callingEnd.call(this);
                    break;
                    case 'accept':
                        clearTimeout(this.timer);
                        this.onStartCb(null,msg.type);
                        this.status = 'active';
                    break;
                    default:
                        this.onCmdSend({cmd:'deny',from:this.id,to:peer});
                    break;
                }
            break;
            case 'ringing':
                if(cmd=='stop'){
                    this.onCallInEnd();
                    ths.status = 'idle';
                }
            break;
            case 'active':
                if(cmd == 'stop'){
                    this.onTalkEnd();
                    this.status = 'close';
                }
            break;

        }

    };
    _proto.onCmdSend = function(){};
    _proto.onCallIn = function(){};
    _proto.onCallInEnd = function(){};
    _proto.onCallStart = function(){};
    _proto.onTalkEnd = function(){};

})();

module.exports = callCtrl;
},{}],6:[function(require,module,exports){
/* 
* @Author: Phenix Cai
* @Date:   2015-11-22 10:02:34
* @Last Modified time: 2015-12-25 17:13:30
*/



var castCtrl;


(function(){
    var _proto, t1, t2, t3, _debug;
    // constant
    t1 = 150;
    t2 = 250;
    t3 = (t1+t2)*2;
    _debug = true;

    function objSetTimeout(obj,func,time){
        var t;
        t = setTimeout(function(){
            func.call(obj);
        },time);
        return t;
    }

    function CastCtrl(label,id){
        this.castList  = [];
        this.pendList = []; 
        this.label = label;
        this.id = id;
        this.reqTimer;
        this.reqCnt = 0;
        this.reqWait = 0;

    }

    _proto = CastCtrl.prototype;
    castCtrl = CastCtrl;
    // callback functions
    _proto.onSend = function(){};
    _proto.onCastList = function(){};
    _proto.onAddPr2Talk = function(){};


    // api functions
    _proto.login = function(){
        this.onSend({from:this.id, label: this.label, to:'All',cmd:'hello'});
    };

    _proto.rmPeer = function(id){
        this.hdlMsg({from:id, label:this.label, to:this.id, cmd:'rls'});
    };

    _proto.start = function(cb,type){
        this._startCb = cb;
        this.type = type;
        this._startCastReq();
    };

    _proto.stop = function(cb){
        this._stopCb  = cb;
        this._stopCastReq();
    };

    function getCastIdx(id){
        var idx = -1;
        for(var i=0;i<this.castList.length;i++){
            if(this.castList[i].id == id){
                idx = i;
                break;
            }
        }
        return idx;
    }

    _proto.hdlMsg =  function (msg){
        var myself, rid, delay, idx;
        myself = this.id;
        rid = msg.from;
        if(_debug)console.log(this.id +' hdlMsg ',msg);
        switch(msg.cmd)
        {
            case 'req':
                if(this.castList[0] && this.castList[0].id == myself){
                    this.castList.push({id:rid,type:msg.type});
                    this._infCastList();
                }else{
                    this.pendList.push(rid);
                }
            break;
            case 'rls':
                if(this.castList[0] && this.castList[0].id == rid && 
                    this.castList[1] && this.castList[1].id == myself){
                    this.castList.shift();
                    this._infCastList();
                    if(this._startCb)this._startCb();
                    return;
                }
                if(this.castList[0] && this.castList[0].id == myself){
                    idx = getCastIdx.call(this,rid); 
                    if(idx >= 0){
                        this.castList.splice(idx,1);
                        this._infCastList();
                    }
                }else{
                    idx = this.pendList.indexOf(rid);
                    if(idx >=0 )this.pendList.splice(idx,1);
                }
            break;
            case 'list':
                this.pendList = [];
                this.castList = msg.list;
                this.onCastList(this.castList);
                if(_debug)console.log('cmp '+ myself + ' vs ',this.castList[0]);

                if(this.castList[0] && this.castList[0].id == myself){
                    if(this._startCb)this._startCb();
                }else{
                    if(this.reqCnt > 0){
                        if(_debug)console.log(this.id+' stop timer');
                        clearTimeout(this.reqTimer);
                        this.reqCnt = 0;
                    }
                    if(this.reqWait == 1){
                        this._startCastReq();
                        this.reqWait = 0;
                    }
                }
            break;
            case 'hello':
                if(_debug)console.log('hello cmp '+ myself + ' vs ',this.castList[0]);
                if(this.castList[0] && this.castList[0].id == myself){
                    var type = this.castList[0].type;
                    this.onAddPr2Talk(rid,type);
                    this._infCastList();
                }
            break;
        }

    };

    //internal functions

    // _proto._startCb = function(){};
    // _proto._stopCb  = function(){};

    _proto._infCastList =  function(){
        var list, from, to;
        from = this.id;
        list = this.castList;
        to = 'All';
        this.onSend({from:from, label:this.label, to:to, cmd:'list',list:list});
        this.onCastList(list);
    };

    _proto._sendCastReq = function(){
        var from, to, type;
        from = this.id;
        to = 'All';
        type = this.type;
        this.onSend({from:from, label:this.label, to:to, cmd:'req', type:type});
    };

    _proto._cancelCastReq = function(){
        var from, to;
        from = this.id;
        to = 'All';
        this.onSend({from:from, label:this.label, to:to, cmd:'rls'});
    };

    _proto._reqTimerHdl = function(){
        if(_debug)console.log(this.id + ' _reqTimerHdl', this.reqCnt);
        this.reqCnt --;
        if(this.reqCnt > 0){
            this._sendCastReq();
            this.reqTimer = objSetTimeout(this,this._reqTimerHdl, t2);
        }else if (this.reqCnt == 0){
            if(this.pendList.length > 0){
                if(_debug)console.log('collision occurs');
                delay = t1 + Math.ceil(Math.random()*t3);
                this.reqTimer = objSetTimeout(this,this._startCastReq, delay);
                this.pendList = [];
                return;
            }
            if(this.castList.length > 0)this.castList.shift();
            this.castList.push({id:this.id,type:this.type});
            this._infCastList();
            if(this.castList[0].id == this.id){
                if(this._startCb)this._startCb();
            }
        }


    };


    _proto._startCastReq = function(){
        var self = this;
        if(this.pendList.length > 0){
            if(_debug)console.log(this.id + ' warn: there is some un-handled reqs here. ',this.pendList);
            this.reqWait = 1; 
            return;
        }
        this.reqCnt = 2; 
        this._sendCastReq();
        this.reqTimer = objSetTimeout(this,this._reqTimerHdl, t1);
    };

    _proto._stopCastReq = function(){
        if(this.castList[0] && this.castList[0].id == this.id){
            if(this._stopCb)this._stopCb();
            this.castList.shift();
            this._infCastList();
        }else{
            this._cancelCastReq();
            clearTimeout(this.reqTimer);
            this.reqCnt = 0;
        }
    };

})();

module.exports = castCtrl;
},{}],7:[function(require,module,exports){
/* 
* @Author: Phenix Cai
* @Date:   2015-11-13 14:44:49
* @Last Modified time: 2015-12-24 17:36:36
*/
'use strict';
var getUserMedia = require('getusermedia');
var getScreenMedia = require('getscreenmedia');
var localMedia;

(function(){
    var _proto;
    function muteStrm(s){
        if(s)s.getTracks().forEach(function(t){t.stop()});
    }

    //constructor
    function LocalMedia(opts){
        var options, item;
        options = opts || {};
        this.config = {
            media:{
                video: false,
                audio: true
            }
        };

        for(item in options){
            this.config[item] = options[item];
        }
        this.ss = [];

    }

    _proto = LocalMedia.prototype;
    _proto.mute = function(){
        var s = this.lcStrm;
        if(s)muteStrm(s);
    } 
    _proto.start = function (cs, cb){
        var constraints, self;
        self = this;
        constraints = (cs)? cs : this.config.media;
        /*stop previous local medias*/
        this.mute();
        getUserMedia(constraints, function(err,s){
            if(!err){
                self.lcStrm = s;
            }
            if(cb)cb(err,s);
        });
    };
    _proto.stop = function(cb){
        this.mute();
        if(cb)cb(this.lcStrm);
        this.lcStrm =  null;
    };
    _proto.getScn = function(cb){
        var s = this.scnStrm;
        var self = this;
        if(s)muteStrm(s);
        getScreenMedia(function(err,s){
           if(!err){
            self.scnStrm =s;
           } 
           if(cb)cb(err,s);
        });
    };
    _proto.rlsScn = function(cb){
        var s =  this.scnStrm;
        // console.log('this.scnStrm ',this.scnStrm);
        if(cb)cb(this.scnStrm);
        if(s)muteStrm(s);
        this.scnStrm = null;
    };
    _proto.getStrms =  function(){
        var ss = [];
        if(this.lcStrm)ss.push(this.lcStrm);
        if(this.scnStrm)ss.push(this.scnStrm);
        return ss;
    };
   
    localMedia = LocalMedia;
})();
module.exports = localMedia;
},{"getscreenmedia":1,"getusermedia":2}],8:[function(require,module,exports){
'use strict';
var adapter = require('webrtc-adapter-test');
var peerConn;

(function(){
    var _proto, _debug, _browser;
    _browser = adapter.webrtcDetectedBrowser;

    _debug = false;

    //constructors
    function PeerConn(opts){
        var self, options, item;
        options = opts || {};
        this.config = {
            ice : {
                // iceServers : [{'url': 'stun:chi2-tftp2.starnetusa.net'}]
                iceServers : [
                    {'url': 'stun:chi2-tftp2.starnetusa.net'},
                    {'url': 'stun:stun01.sipphone.com'},
                    {'url': 'stun:stun.fwdnet.net'},
                    {'url': 'stun:stun.voxgratia.org'},
                    {'url': 'stun:stun.xten.com'}
                ]
            },
            peerConstrs : {
                optional : [
                    {'DtlsSrtpKeyAgreement': true}
                ]
            },
            recvMedia :{
                mandatory: {
                    OfferToReceiveVideo:true, 
                    OfferToReceiveAudio:true
                }
            },
            room: 'default',
            type: '',
            id: 0
        };

        for(item in options){
            this.config[item] = options[item];
        }

        self = this;
        try{
            this.peer =  RTCPeerConnection(this.config.ice, this.config.peerConstrs);
        }catch(e){
            console.log(e.name);
            return;
        };

        this.peer.onicecandidate = onIce;
        this.peer.onaddstream = onRStrmAdd;
        this.peer.onremovestream = onRStrmRm;
        this.peer.ondatachannel =  this.hdlDatChanAdd.bind(this);
        this.ctyp = this.config.type;
        this.rmtStrms = [];
        this.locStrms = [];
        this.rtpTracks = [];
        this.datChans = {};
        this.ready =  false;

        //internal methods
        function onIce(event){
          if(_debug)console.log('onIce: ', event);
          if (event.candidate) {
            self.onCmdSend('msg',{
                    to: self.config.id,
                    mid: self.config.mid,
                    sdp: {
                  type: 'candidate',
                  label: event.candidate.sdpMLineIndex,
                  id: event.candidate.sdpMid,
                  candidate: event.candidate.candidate},
                    });
          } else {
            if(_debug)console.log('End of candidates.');
            // setTimeout(function(){
            //     if(self.ready == false){
            //         self.onConError('default',self.config.id);
            //     }
            // }, 5000);
          }
        }

        function onRStrmAdd(event){
            var s = event.stream;
            self.onAddRStrm(s);
            self.rmtStrms.push(s);
        }

        function onRStrmRm(event){
            var s =event.stream;
            self.onRmRStrm(s);
            self.rmtStrms.splice(self.rmtStrms.indexOf(s),1);
        }

    }

    //export obj
    peerConn = PeerConn;

 
    //prototype
    _proto = PeerConn.prototype ;
    //cb functions
    _proto.onCmdSend = function(){};
    _proto.onDcRecv = function(){};
    _proto.onAddRStrm = function(){};
    _proto.onRmRStrm = function(){};
    _proto.onConnReady = function(){};
    _proto.onConError = function(){};

    //api method
    _proto.makeOffer = function(opts){
        var self = this;
        var constrains = opts || this.config.recvMedia;
        this.ctyp = "calling";
        this.peer.createOffer(function(desc){
            /*it is very strange that createoffer would generate sendonly media when local stream is mute
            from my mind, it should be a=recevonly */
            var sdp = self.prePrcsSdp(desc.sdp);
            desc.sdp = sdp;
            if(_debug)console.log('makeOffer ',desc);
            self.peer.setLocalDescription(desc);
            self.onCmdSend('msg',{
                to:self.config.id, 
                mid:self.config.mid,
                oneway:self.config.oneway,
                sdp:desc
            });
        }, function(err){
            console.log('offer Error',err);
        }, constrains);
    };

    _proto.makeAnswer = function(opts){
        var self = this;
        var constrains = opts || this.config.recvMedia;
        this.ctyp = "called";
        this.peer.createAnswer(function(desc){
            var sdp = self.prePrcsSdp(desc.sdp);
            desc.sdp = sdp;
            if(_debug)console.log('makeAnswer ',desc);
            self.peer.setLocalDescription(desc);
            self.onCmdSend('msg',{
                to:self.config.id,
                mid: self.config.mid,
                sdp:desc
            });
        },function(err){
            console.log('answer Error',err);
        },constrains);
    };

    _proto.addStream =  function(stream){
        var self = this;
        if(_browser == 'firefox'){
            this.rtpTracks = [];
            stream.getTracks().forEach(function(t){
                self.rtpTracks.push(self.peer.addTrack(t,stream));
            });
        }else{
            this.peer.addStream(stream);            
        }        
        this.locStrms.push(stream);

    };

    _proto.removeStream = function(stream){
        var self = this;
        if(_browser == 'firefox'){
            stream.stop();
            this.rtpTracks.forEach(function(t){
                // FIXME: FF could not support mulit negotiation
                try{
                    self.peer.removeTrack(t);
                }catch(err){
                    console.log('remove track err ', err);
                };
            });
        }else{
            this.peer.removeStream(stream);            
        }
        this.locStrms.splice(this.locStrms.indexOf(stream),1);
    };

    _proto.setRmtDesc = function(desc){
        var sdp = new RTCSessionDescription(desc);
        this.peer.setRemoteDescription(sdp);
        if(_debug)console.log('setRemoteDescription ',sdp);
    };

    _proto.addIceCandidate = function(candidate){
        this.peer.addIceCandidate(candidate);
        if(_debug)console.log('addIceCandidate ',candidate);
    };

    _proto.close = function(){
        if(_debug)console.log('peerConnection close ',this.config.id);
        this.peer.close();
    };

    _proto.getId = function(){
        return this.config.id;
    };

    _proto._obsrvDatChan = function(ch){
        var self = this;
        ch.onclose = function(){
            if(_debug)console.log('dc chan close ',ch);
        };
        ch.onerror = function(){
            console.log('dc chan erro ',ch);
            self.onConError(ch.label,self.config.id);
        };
        ch.onopen =  function(){
            if(_debug)console.log('dc chan open ',ch);
            console.log('dc chan open ',ch);
            self.ready = true;
            self.onConnReady(ch.label,self.config.id);
        };
        ch.onmessage = function(ev){
            // if(_debug)console.log('peer recv '+ch.label,ev.data);
            if(ch.label=='castCtrl0')console.log('peer recv '+ch.label,ev.data);
            self.onDcRecv(ch.label,self.config.id,ev.data);
        };
    };
    _proto.getDatChan = function(name,opts){
        var chan = this.datChans[name];
        if(!opts) opts = {};
        if(chan) return chan;
        if(this.ctyp == 'calling'){
            chan = this.datChans[name] = this.peer.createDataChannel(name,opts);
            this._obsrvDatChan(chan);
        }
        return chan;
    };
    _proto.hdlDatChanAdd = function(ev){
        var ch = ev.channel;
        this.datChans[ch.label] = ch;
        this._obsrvDatChan(ch);
    };

    _proto.sendData = function(chan,data){
        var dc = this.getDatChan(chan);
        if(!dc || (dc.readyState != 'open')){
            console.log('Error','channel '+dc+' is not ready, could not send');
        }else{
            if(dc.label=='castCtrl0')console.log('send ',data);
            dc.send(data);
        }
    };

    /*some other functions*/
    _proto.prePrcsSdp = function(sdp){
        var auOn, scOn, sdps, nwSdp, cnt;
        auOn = false, scOn =false;
        this.locStrms.forEach(function(s){
            if(s.getAudioTracks().length > 0)auOn = true;
            if(s.getVideoTracks().length > 0)scOn = true;
        });
        nwSdp = '';
        sdps = sdp.split('m=');
        cnt = 0;
        if(_debug)console.log('parse sdp ','audio = '+auOn+' video = '+scOn);
        sdps.forEach(function(d){
            var ss;
            ss = (cnt > 0)? 'm=' + d : d;
            cnt ++;
            if(auOn == false && ss.search('m=audio')>=0){
                ss = ss.replace(/a=sendonly/g,'a=recvonly');
            }
            if(scOn == false && ss.search('m=video')>=0){
                ss = ss.replace(/a=sendonly/g,'a=recvonly');
            }
            nwSdp += ss;
        });
        return nwSdp;
    };



})();

module.exports = peerConn;

},{"webrtc-adapter-test":3}],9:[function(require,module,exports){
/* 
* @Author: Phenix
* @Date:   2015-12-21 10:01:29
* @Last Modified time: 2015-12-28 17:09:35
*/

'use strict';

var localMedia =  require('./localmedia');
var WebRtc = require('./webrtc');
var CastCtrl = require('./castctrl');
var rtc = require('webrtcsupport');
var adapter = require('webrtc-adapter-test');
var CallCtrl = require('./callctrl');

var teleCom;
(function(){
    var _proto, _debug, _browser;
    _debug = true;
    function TeleCom(){
        var self,config,w;
        self = this;
        config = {mid:'default',recvMedia:{}};
        this.support = rtc.support;
        w = this.webRtc = new WebRtc(config);
        this.myPid = 'default';
        this.streams = {default: w};
        this.castCtrls = []; //media controllers
        this.users = []; // array to store current peerids
        this.ready =  false;
        this.actMedia = {status:'idle'};
        this.actScn = {status:'idle'};
        this.midx = 0;
        this.media =  new localMedia(); 


        function updateCastList(){
            var list = [];
            var iflag = true;
            var video;

            self.castCtrls[0].castList.forEach(function(p){
                list.push({id:p.id,av:p.type,scn:false});
            });

            self.castCtrls[1].castList.forEach(function(p){
                for(var i=0;i<list.length;i++){
                    if(list[i].id == p.id){
                        list[i].scn = true;
                        return;
                    }
                }
                list.push({id:p.id,av:'none',scn:true});
            });
            if(_debug)console.log('update list ',list);
            self.onCastList(list);
        }

        function addPeer2Talk(peer,type){
            var am = (type=='scn')? self.actScn: self.actMedia;
            if(am.status == 'active'){
                var w = self.streams[am.mid];
                var s = am.strm;
                if(w&&s){
                    console.log('create peer');
                    w.addPeer(peer,'calling');
                    w.startCall(peer,s);
                }
            }
        }

        w.setDCRcvCb('default',function(from,data){
            var cmd =JSON.parse(data);
            self.hdlMsg(from, cmd);
        });
        w.onCmdSend =  function(h,d){
            var data, type, dst;
            type = 'rtc';
            dst = d.to;
            if(!dst){
                console.log('erro id ',d.to);
                return;
            }
            data = {media:d.mid,sdp:d.sdp};
            if(_debug)console.log('send msg to '+dst, data);
            self.dispatch(data,type,dst);
        };
        w.onReady = function(){
            if(self.ready == false){
                if(_debug)console.log('default rtc chan ready, now init cast controllers');
                for(var i = 0;i < 2; i++){
                    var m = self.castCtrls[i] = new CastCtrl(i,self.myPeer());
                    m.onSend = function(cmd){
                        var data = JSON.stringify(cmd);
                        w.sendData('castCtrl',data);
                    };
                    m.onCastList = function(list){
                        //TODO: 
                        updateCastList();
                    };
                    m.onAddPr2Talk = addPeer2Talk;
                    w.setDCRcvCb('castCtrl',function(from,data){
                        var cmd = JSON.parse(data);
                        var ctrl = self.castCtrls[cmd.label];
                        if(ctrl)ctrl.hdlMsg(cmd);
                    });
                }
                //init call controllers
                var cc = self.callCtrl = new CallCtrl();
                cc.onCallIn = function(peer,type){
                    if(self.actMedia.status != 'idle')return;
                    self.onCallRing(peer,type);
                    return true;
                };
                cc.onCallInEnd = function(){
                    self.onCallInEnd();
                };
                cc.onCmdSend = function(cmd){
                    var data = JSON.stringify(cmd);
                    w.sendData('default',data,cmd.to);
                };

                cc.onTalkEnd = function(){
                    self.media.stop(function(s){
                        if(s){
                            var wr = self.streams[cc.mid];
                            var p = cc.dst;
                            if(wr){
                                if(wr.type =='calling'){
                                    wr.stopCall(p,s);
                                    setTimeout(function(){
                                        wr.remove(p);
                                        delete self.streams[cc.mid];
                                        cc.reset();
                                    }, 3000);
                                }else{
                                    wr.setAnsStrm(s,'del');
                                }
                            }
                            // hide div ....
                        }
                    });
                };

                self.onReady();
                self.callCtrl.setId(self.myPeer());
                setTimeout(function(){
                    for(var i=0;i<2;i++){self.castCtrls[i].login();}
                }, 400);
            }
            self.ready = true;
            w.createDataChan('castCtrl');
        }

    }

    teleCom = TeleCom;
    _proto = TeleCom.prototype;

    _proto.addPeer = function(peer){
        self = this;
        if(!rtc.support || !peer) return;
        if(_debug)console.log('Another peer '+ peer + ' made a request to join hub');
        if(this.users.indexOf(peer)<0)this.users.push(peer);
        var w = this.streams['default'];
        w.addPeer(peer,'calling');
        w.createDataChan('default');
        w.startCall(peer);
        //TODO: ... when there is a casting stream, add particular partenner
    };

    function rlsMedia(type){
        var am = (type=='scn')? this.actScn: this.actMedia;
        if(am.status != 'close') return;
        if(am.strm){
            if(type == 'scn'){
                this.media.rlsScn();
            }else{
                this.media.stop();
            }
            delete(am.strm);
        }
        am.status = 'idle';
    }

    _proto.removePeer = function(peer){
        if(peer!=undefined){
            var m = this.streams;
            for(var i in m){
                m[i].rmPeer(peer);
                if(i.indexOf(peer)==0){
                    if(_debug)console.log('need remove stream ',i);
                    m[i].onRMedDel();
                    delete m[i];
                }
            }
            this.castCtrls.forEach(function(p){
                p.rmPeer(peer);
            });
            var idx = this.users.indexOf(peer);
            if(idx>=0)this.users.splice(idx,1);
            if(this.users.length == 0){
                if(_debug)console.log('no one in the hub');
                //TODO: 
                this.ready = false;
                this.onDisconnect();
                if(this.actMedia.status!='idle'){
                    this.actMedia.status = 'close';
                    rlsMedia.call(this,'audio');
                }
                if(this.actScn.status!='idle'){
                    this.actScn.status = 'close';
                    rlsMedia.call(this,'scn');
                }
            }

        }
    };

    function dcSendMsg(h,d){
        if(d.to == undefined) return;
        var data = JSON.stringify({media:d.mid,sdp:d.sdp});
        var w = this.streams.default;
        w.sendData('default',data,d.to);    
        // if(_debug)console.log('dc send msg ',data,d.to);  
    }

    _proto.hdlMsg = function(peer,data){
        var msg,mid,self,scn,oneway;
        if(!rtc.support) return;
        self = this;
        var cc = this.callCtrl;
       // if(_debug)console.log(peer,' recv msg ',data);
        if(this.users.indexOf(peer)<0)this.users.push(peer);
        mid = data.media;
        if(mid==undefined){
            // call ctrler msg;
            if(cc)cc.hdlMsg(data);
            return;
        }
        scn = mid.indexOf(peer+'-scn-');
        oneway = (data.oneway == false)? false: true;
        // console.log('mid is ',mid,' scn is ',scn);
        msg = {from:peer,mid:mid,sdp:data.sdp};
        if(mid!=undefined){
            if(this.streams[mid]==undefined){
                var config = {mid:mid,oneway:oneway};
                if(msg.sdp.type != 'offer'){
                    console.log('could not init webrtc from msg ',msg);
                    return;
                }
                var w = this.streams[mid] = new WebRtc(config);
                w.onCmdSend = dcSendMsg.bind(this);
                if(scn==0){
                    w.onRMedAdd = this.onFrScnAdd;
                    w.onRMedDel = this.onFrScnRm;
                }else{
                    w.onRMedAdd = this.onFrAvAdd;
                    w.onRMedDel = this.onFrAvRm;
                }
                if(oneway == false && cc && cc.status == 'active' && cc.strm){
                    cc.mid = mid;
                    w.setAnsStrm(cc.strm,'add');
                }
            }else{
                if(mid.indexOf(peer)==0 && msg.sdp.type == 'offer'){
                    //second offer, should be bye, destroy the streams[mid] after 3 seconds
                    if(_debug)console.log('recv msg with offer is ', msg);

                    setTimeout(function(){
                        if(_debug)console.log('destroy stream ',mid, ' after 3 seconds ');
                        if(cc.mid == mid)cc.reset();
                        delete self.streams[mid];
                    },3000);
                }
            }
            this.streams[mid].parseSigMsg(msg);
            var am = this.actMedia;
            if(mid ==  am.mid && am.status == 'close'&& msg.sdp.type == 'answer'){
                if(self.streams[am.mid].remove(peer)==0){
                    delete self.streams[am.mid];
                    am.status = 'idle';
                }
            }
            var as = this.actScn;
            if(mid == as.mid && as.status == 'close' && msg.sdp.type == 'answer'){
                if(self.streams[as.mid].remove(peer)==0){
                    delete self.streams[as.mid];
                    as.status = 'idle';
                }
            }
        };
    };

    _proto.myPeer = function(v){
        return (v==undefined)? this.myPid : this.myPid = v;
    };

    function startStream(type,oneway,strm,id){
        var mid = this.myPeer()+'-'+type+'-'+(this.midx++);
        var config = {mid:mid,oneway:oneway};
        var w = this.streams[mid] = new WebRtc(config);
        w.onCmdSend = dcSendMsg.bind(this);
        if(type == 'scn'){
            w.onRMedAdd = this.onFrScnAdd;
            w.onRMedDel = this.onFrScnRm;
        }else{
            w.onRMedAdd = this.onFrAvAdd;
            w.onRMedDel = this.onFrAvRm;
        }
        if(id){
            var pc = this.users[id];
            if(pc){
                w.addPeer(pc,'calling');
                w.startCall(pc,strm);
            }
        }else{
            this.users.forEach(function(p){
                w.addPeer(p,'calling');
                w.startCall(p,strm);
            });
        }
        return mid;
    }

    _proto.startAVCast = function(cfg,errCb){
        var self,cs,type;
        self = this;
        if(cfg.video) cs = { video: true, audio: true};
        type = (cfg.video)? 'video' : 'audio';
        var am = this.actMedia;
        var cc = this.callCtrl;
        if(am.status != 'idle'|| cc.status != 'idle')return;
        this.castCtrls[0].start(function(){
            am.status = 'trying';
            self.media.start(cs,function(err,s){
                if(!err){
                    am.strm = s;
                    self.onMyAvAdd(s);
                    am.mid = startStream.call(self,type,true,s);
                    am.status = 'active';

                }else{
                    am.status = 'idle';
                    if(errCb)errCb(err);
                }
            });
        }, type);
        return true;
    };

    _proto.stopAVCast = function(){
        var self = this;
        var c = this.castCtrls[0];
        var am = this.actMedia;
        var w = this.streams[am.mid];
        if(am.status == 'idle')return;
        c.stop(function(){
            self.media.stop(function(s){
                if(s){
                    self.users.forEach(function(p){
                        w.stopCall(p,s);
                    });
                }
                am.status = 'close';
                delete am.strm;
                setTimeout(function(){
                    rlsMedia.call(self,'audio');
                }, 2000);
            });
        });
    };

    _proto.startscnCast = function(errCb){
        var self = this;
        var as = this.actScn;
        var type = 'scn';
        if(as.status != 'idle')return;
        this.castCtrls[1].start(function(){
            as.status = 'trying';
            self.media.getScn(function(err,s){
                if(!err){
                    as.strm = s;
                    self.onMyScnAdd(s);
                    as.mid = startStream.call(self,type,true,s);
                    as.status = 'active';
                }else{
                    as.status = 'idle';
                    if(errCb)errCb(err);
                }
            });
        },type);
        return true;
    };

    _proto.stopscnCast = function(){
        var self = this;
        var as = this.actScn;
        var c = this.castCtrls[1];
        var w = this.streams[as.mid];
        // console.log('w is ',w, ' as.mid ',as.mid);
        if(as.status == 'idle')return;
        c.stop(function(){
            self.media.rlsScn(function(s){
                if(s){
                    self.users.forEach(function(p){
                        w.stopCall(p,s);
                    });
                }
                as.status = 'close';
                delete as.strm;
                setTimeout(function(){
                    rlsMedia.call(self,'scn');
                }, 2000);

            });
        });
    };

    _proto.startPrTalk = function(peer,type,errCb){
        var self,cs;
        self = this;
        var cc = this.callCtrl;
        var am = this.actMedia;
        if(cc.status != 'idle' || am.status != 'idle')return;
        cc.start(peer,type,function(err,type){
            if(err){
                if(_debug)console.log('call start failed : ',err.name);
                if(errCb)errCb(err);
            }else{
                if(type=='video') cs = { video: true, audio: true};
                self.media.start(cs,function(err,s){
                    if(err){
                        if(errCb)errCb(err);
                        cc.reset();
                    }else{
                        self.onMyAvAdd(s);
                        cc.mid = startStream.call(self,type,false,s,peer);
                    }
                });
            }
        });
    };

    _proto.stopPrTalk = function(){
        var cc = this.callCtrl;
        var w = this.streams[cc.mid];
        var p = cc.dst;
        if(cc.status == 'idle')return;
        cc.stop(function(){
            self.media.stop(function(s){
                if(w.type == 'calling'){
                    w.stopCall(p,s);
                    setTimeout(function(){
                        w.remove(p);
                        delete self.streams[cc.mid];
                        cc.reset();
                    }, 3000);
                }else{
                    w.setAnsStrm(s,'del');
                }
            });
        });
    }

    _proto.answerPrTalk = function(type){
        var cc = this.callCtrl;
        if(type=='deny'){
            cc.answer(type);
        }else{
            if(type=='video')cs = { video: true, audio: true};
            this.media.start(cs,function(err,s){
                if(err){
                    cc.answer('deny');
                }else{
                    self.onMyAvAdd(s);
                    cc.answer(type);
                    cc.strm = s;
                }
            });
        }

    };

    _proto.getRtcCap = function(infCb){
        var rc = false;
        var info;
        if(!this.support){
            info = 'Your browser could not support audio/video chatting. It could not support Screen Sharing or Casting either. Please use <a href="https://www.google.com/chrome/browser/desktop/index.html"> Chrome </a> instead.';
            infCb(info);
            return rc;
        }
        switch(_browser){
            case 'firefox':
                info = 'Your browser could not support to launch a audio/video chatting.It could not launch a screen sharing either. But it could receive them. Please use <a href="https://www.google.com/chrome/browser/desktop/index.html"> Chrome </a> instead.';
                if(infCb)infCb(info);
                return rc;
            break;
            default:
                info='';
                rc = true;
                break;
        }
        return rc;
    }

    _proto.checkExtension = function(infCb){
        if(!sessionStorage.getScreenMediaJSExtensionId){
            var info = 'If you want to share your screen with others, you would better to install <a href="https://chrome.google.com/webstore/detail/gatherhub-screen-capture/bdnieppldnkoaajefibbnpmemgfdkben"> Gatherhub Screen Capture </a>. After installation, the browser needs to be restarted.';
            if(infCb){infCb(info)};
            return false;
        }
        return true;
    };

    _proto.dispatch = function(){};
    _proto.onReady = function(){};
    _proto.onCastList = function(){};
    _proto.onMyAvAdd = function(){};
    _proto.onFrAvAdd = function(){};
    _proto.onFrAvRm = function(){};
    _proto.onMyScnAdd = function(){};
    _proto.onFrScnAdd = function(){};
    _proto.onFrScnRm = function(){};
    _proto.onDisconnect = function(){};
    _proto.onCallIn = function(){};
    _proto.onCallInEnd = function(){};

})();

module.exports = teleCom;


},{"./callctrl":5,"./castctrl":6,"./localmedia":7,"./webrtc":10,"webrtc-adapter-test":3,"webrtcsupport":4}],10:[function(require,module,exports){
/* 
* @Author: Phenix Cai
* @Date:   2015-11-13 19:14:00
* @Last Modified time: 2015-12-28 16:03:12
*/

'use strict';
var peerConn = require('./peerconn');


var webRtc;
(function(){
    var _proto, _debug;
    _debug = false;

    function WebRtc(opts){
        
        var options, item, self,  cn;
        self = this;
        options = opts || {};

        this.config = {oneway:true}; 
        this.peers = {};

        for(item in options){
            this.config[item] = options[item];
        }

        this.datChRecvCb = {};
    }
    // export obj
    webRtc = WebRtc;
    _proto = WebRtc.prototype;

    //parse signal messages from other peers
    _proto.parseSigMsg = function (msg){
        var id, pc, candidate;
        id = msg.from;
        pc = this.peers[id];
        if(_debug)console.log('Received msg:', msg);

        if (msg.sdp.type === 'offer') {
            //get invite from other side
            this.addPeer(id,'called',msg.sdp);
            
        } else if (msg.sdp.type === 'answer' ) {
            if(!pc){
                console.log("wrong answer id from "+id);
                return;
            }
            pc.setRmtDesc(msg.sdp);
            
        } else if (msg.sdp.type === 'candidate') {
            if(!pc){
                console.log("wrong candidate id from "+id);
                return;
            }
          candidate = new RTCIceCandidate({sdpMLineIndex:msg.sdp.label,
            candidate:msg.sdp.candidate});
          pc.addIceCandidate(candidate);
        } 
    };

    _proto.addPeer = function(id,type,sdp){
        // this._createPeer('calling',id,null);
        var pc, config;
        config = this.config;
        config.id = id;
        config.type = type;
        pc = this.peers[id];
        if(!pc){
            pc = new peerConn(config);
            if(!pc || !pc.peer){
                console.log('erro: create pc failed');
                this.onCrpErro(config);
                return;
            } // create peerconnection error
            this.peers[id] = pc;
            regPconnEvtCb.call(this,pc);
        }
        if(type=='called'){
            pc.setRmtDesc(sdp);
            var as =this.ansStrm;
            if(config.oneway == false && as){
                if(as.cmd=='add'){
                    pc.addStream(as.s);
                }else{
                    pc.removeStream(as.s);
                }
            }
            pc.makeAnswer();
        }
    };

    _proto.rmPeer = function(id){
        var pc;
        pc = this.peers[id];
        if(pc){
            pc.close();
            delete this.peers[id];
        }
    };

    _proto.sendData = function(chan,data,to){
        if(to){
            var pc = this.peers[to];
            if(pc)pc.sendData(chan, data);
        }else{
            for(var i in this.peers){
                this.peers[i].sendData(chan,data);
            }
        }
    };

    _proto.startCall = function(id,s){
        var pc = this.peers[id];
        if(!pc){
            console.log('wrong pc from id ',id);
            return;
        }
        if(s)pc.addStream(s);
        pc.makeOffer();
    };

    _proto.stopCall = function(id,s){
        var pc = this.peers[id];
        if(pc){
            if(s)pc.removeStream(s);
            pc.makeOffer();
        }
    };

    _proto.addAnsStrm = function(s,cmd){
        this.ansStrm = {s:s,cmd:cmd};
    };

    _proto.remove = function(id){
        var pc = this.peers[id];
        if(pc){
            pc.close();
            delete this.peers[id];
        }
        var length = 0;
        for(var i in this.peers){length++;}
        return length;
    }


    _proto.createDataChan = function(label,onRecv){
        if(onRecv)this.datChRecvCb[label] = onRecv.bind(this);
        for(var i in this.peers){
            this.peers[i].getDatChan(label);
        }
    };

    _proto.setDCRcvCb = function(label,onRecv){
        this.datChRecvCb[label] = onRecv.bind(this);
    };


    /*some callback fuctions*/
    _proto.onCmdSend = function(){};
    _proto.onRMedAdd = function(){};
    _proto.onRMedDel = function(){};
    _proto.onCrpErro = function(){};
    _proto.onReady = function(){};


    //internal api for webrtc
    //register callback functions for peerconnections
    function regPconnEvtCb(pc){
        var self = this;
        pc.onCmdSend = function(h,d){
            self.onCmdSend(h,d);
        };
        pc.onDcRecv = function (chan,from,data){
            var hdlData = self.datChRecvCb[chan];
            if(hdlData)hdlData(from,data);
        };
        pc.onAddRStrm = function (s){
            self.onRMedAdd(s);
        };
        pc.onRmRStrm = function(s){
            if(_debug)console.log('rmtStrmDel',s);
            self.onRMedDel(s);
        };
        pc.onConError = function(label,id){
            var config = self.config;
            console.log('peer',id+' connect error');
            self._removePeer(id);
            config.type = 'calling';
            config.id = id;
            self.onCrpErro(config);
        };
        pc.onConnReady = function(label,id){
            var ready = true;
            for(var i in self.peers){
                if(self.peers[i].ready == false){ready=false;break;}
            }
            if(ready)self.onReady();
        }
    };

    function isSdpWithAudio(s){
        var sdps,idx,sdp,ret;
        ret = false;
        sdps =s.split('m=');
        sdps.forEach(function(d){
            sdp = 'm=' +d;
            idx = sdp.search('m=audio');
            if(idx >=0){
                if(sdp.slice(idx).search('a=sendrecv')>=0){
                    ret = true;
                    return;
                }
            }
        });
        return ret;
    }


})();

module.exports = webRtc;


},{"./peerconn":8}],11:[function(require,module,exports){
/*
gatherhub.js is distributed under the permissive MIT License:

Copyright (c) 2015, Quark Li, quarkli@gmail.com
All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 

Author: quarkli@gmail.com
*/

'use strict'

// Module Namespace：Gatherhub, all functions / 
// object prototypes will be under Gatherhub.xxx
var Gatherhub = Gatherhub || {};

(function(){
	var g = Gatherhub;
	// Debug Info:
	// L0 = none
	// L1 = Constructor and Getters
	// L2 = Setters
	// L3 = Operations
	// L4 = User Activity
	var L0 = 0, L1 = 1, L2 = 2, L3 = 4, L4 = 8; 
	var debug = L0; 
	var trace = function(lvl,s){if(lvl&debug)console.log(s);};
	
	// Internal functions
	function precision(num, p) {
		var s = 1;
		if (num < 0) {s = -1; num *= s;}
		var n = num < 1 ? 0 : Math.floor(Math.log(num)/Math.log(10)) + 1;
		return (0 | (num * Math.pow(10, p - n))) / Math.pow(10, p - n) * s;
	}

	function extend(func){
			var base = function(){};
			base.prototype = func.prototype;
			return new base();
	}
	
	// Object Prototype: SvgPad
	(function(){
		// Private
		
		// Gatherhub.SvgPadd
		g.SvgPad = SvgPad;
		
		// Constructor
		function SvgPad(w, h) {
			this.pad = $('<div/>').css('font-size', 0);
			this.canvas = $(document.createElementNS('http://www.w3.org/2000/svg', 'svg')).appendTo(this.pad);
			this.zrate = 1;
			this.zcenter = {x: 0.5, y: 0.5};
			this.canvasvbox = {x: 0, y: 0, w: 0, h: 0};
			this.movable = false;
			this.resizable = true;
			this.defaultWidth = w || $(window).width();
			this.defaultHeight = h || $(window).height();
			this.bgcolor('white');
			
			// DO NOT REMOVE, must set the width and height to set initial values 
			this.maximize();
		}

		// Prototypes
		var _proto = SvgPad.prototype;
		_proto.nocontext = function() {
			this.pad.on('contextmenu', function(){return false;});
			return this;
		};
		_proto.bgcolor = function(c) {
			if (c) {
				this.canvas[0].style['background-color'] = c;
				return this;
			}
			return this.canvas[0].style['background-color'];
		};
		_proto.bordercolor = function(c) {
			if (c) {
				this.canvas[0].style['border-style'] = 'solid';
				this.canvas[0].style['border-color'] = c;
				return this;
			}
			return this.canvas[0].style['border-color'];
		};
		_proto.borderwidth = function(w) {
			if ($.isNumeric(w)) {
				this.canvas[0].style['border-width'] = w + 'px';
				return this;				
			}
			return $.isNumeric(parseInt(this.canvas[0].style['border-width'])) ? parseInt(this.canvas[0].style['border-width']) : 0;
		};
		_proto.borderradius = function(r) {
			if (r >= 0 && r <= 1) {
				var s = this.width() < this.height() ? this.width() : this.height();
				s = Math.round(s / 2 * r);
				this.canvas[0].style['border-radius'] = s + 'px';
			}
			return this;
		};
		_proto.borderpadding = function() {
			return (this.canvas[0].style['border-style'] == 'solid') ?	this.borderwidth() * 2 : 0;
		};
		_proto.show = function(t) {
			if (t !== undefined) {
				this.pad[0].style['display'] = t ? 'block' : 'none';
				return this;
			}
			return this.pad[0].style['display'] != 'none';
		};
		_proto.floating = function(pos) {
			if (pos) {
				this.pad[0].style['position'] = pos;
				this.movable = true;
			}
			else {
				this.pad[0].style['position'] = 'static';
				this.movable = false;
			} 
			return this;
		};
		_proto.moveto = function(axis, p) {
			if (this.movable) {
				var b;
				if (axis == 'left') {
					b = (this.parent && this.parent.width()) ? this.parent.width() : $(window).width();
					b = b - this.width() - this.borderpadding() / 2;
				} 
				else if (axis == 'top') {
					b = (this.parent && this.parent.height()) ? this.parent.height() : $(window).height();
					b = b - this.height() - this.borderpadding() / 2;
				}
				else {
					return this;
				}
				if (p > b) p = b;
				if (p < 0) p = 0;
				this.pad[0].style[axis] = p + 'px';
			}
			return this;
		};
		_proto.width = function(w) {
			if (w === undefined) return this.canvas.attr('width');
			if (this.resizable && $.isNumeric(w)) {
				var max = (this.parent && this.parent.width()) ? this.parent.width() : $(window).width();
				if (w > max) w = max;
				this.canvas.attr('width', w);
				this.canvasvbox.w = precision((this.canvas.attr('width') - this.borderpadding()) / this.zrate, 6);
				if (this.pad.position().left + this.canvas.attr('width') * 1 + this.borderpadding() / 2 > max) this.moveto('left', 9999);
			}
			return this;
		};
		_proto.height = function(h) {
			if (h === undefined) return this.canvas.attr('height');
			if (this.resizable && $.isNumeric(h)) {
				var max = (this.parent && this.parent.height()) ? this.parent.height() : $(window).height();
				if (h > max) h = max;
				this.canvas.attr('height', h);
				this.canvasvbox.h = precision((this.canvas.attr('height') - this.borderpadding()) / this.zrate, 6);
				if (this.pad.position().top + this.canvas.attr('height') * 1 + this.borderpadding() / 2 > max) this.moveto('top', 9999);
			}
			return this;
		};
		_proto.maximize = function() {
			this.width($(window).width()).height($(window).height()).refreshvbox();
			return this;
		};
		_proto.minimize = function() {
			this.width(this.defaultWidth).height(this.defaultHeight).refreshvbox();
			return this;
		};
		_proto.fitcontent = function() {
			this.canvasvbox.x = this.canvas[0].getBBox().x;
			this.canvasvbox.y = this.canvas[0].getBBox().y;
			this.canvasvbox.w = this.canvas[0].getBBox().width;
			this.canvasvbox.h = this.canvas[0].getBBox().height;
			var zw = this.width() / (this.canvas[0].getBBox().width + 10);
			var zh = this.height() / (this.canvas[0].getBBox().height + 10);
			this.zrate = zw < zh ? zw : zh;
			this.zoom(this.zrate);

			return this;
		};		
		_proto.zoom = function(z) {
			if (z === undefined) return this.zrate;
			
			if (this.canvasvbox.w == 0) this.canvasvbox.w = this.width();
			if (this.canvasvbox.h == 0) this.canvasvbox.h = this.height();

			z = $.isNumeric(z) ? (z > 100 ? 100 : z < 0.01 ? 0.01 : precision(z, 6)) : this.zrate;
			this.zrate = z;
			var x = this.zcenter.x * this.canvasvbox.w + this.canvasvbox.x;
			var y = this.zcenter.y * this.canvasvbox.h + this.canvasvbox.y;
			this.canvasvbox.w = precision((this.width() - this.borderpadding()) / this.zrate, 6);
			this.canvasvbox.h = precision((this.height() - this.borderpadding()) / this.zrate, 6);
			this.canvasvbox.x = precision(x - this.zcenter.x * this.canvasvbox.w, 6);
			this.canvasvbox.y = precision(y - this.zcenter.y * this.canvasvbox.h, 6);
			this.refreshvbox();
			return this;
		};
		_proto.offsetcanvas = function(axis, offset) {
			if ($.isNumeric(offset)) {
				if (axis == 'x') this.canvasvbox.x = precision(this.canvasvbox.x - offset / this.zrate, 6);
				if (axis == 'y') this.canvasvbox.y = precision(this.canvasvbox.y - offset / this.zrate, 6);
				this.refreshvbox();
			}
			return this;
		};
		_proto.refreshvbox = function() {
			// $()[0] returns selector's native object
			// $.attr() converts attribute name to lower case, use native setAttribute() instead
			this.canvas[0].setAttribute('viewBox', this.canvasvbox.x + ' ' + 
				this.canvasvbox.y + ' ' + this.canvasvbox.w + ' ' + this.canvasvbox.h );
			return this;
		};
		_proto.appendto = function(obj) {
			if ($(obj).length) this.pad.appendTo($(obj));
			this.parent = this.pad.parent();
			if (this.parent.width() && this.width() > this.parent.width()) this.width(this.parent.width());
			if (this.parent.height() && this.height() > this.parent.height()) this.height(this.parent.height());
			this.refreshvbox();
			this.moveto('left', this.pad.position().left);
			this.moveto('top', this.pad.position().top);
			return this;
		};
		_proto.calibration = function() {
			var w = this.width() - this.borderpadding();
			var h = this.height() - this.borderpadding();
			var path = $(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
			path.attr('id', 'grid');
			path.attr('fill', 'none');
			path.attr('stroke', 'black');
			path.attr('d', 'M' + w/2 + ' 0v' + h + 'M0 ' + h/2 + 'h' + w
				+ 'M0 0h' + w + 'v' + h + 'h-' + w + 'v-' + h
				+ 'M' + w/4 + ' ' + h/4 + 'h' + w/2 + 'v' + h/2 + 'h-' + w/2 + 'v-' + h/2
				+ 'M' + w*3/8 + ' ' + h*3/8 + 'h' + w/4 + 'v' + h/4 + 'h-' + w/4 + 'v-' + h/4
				+ 'M' + w*7/16 + ' ' + h*7/16 + 'h' + w/8 + 'v' + h/8 + 'h-' + w/8 + 'v-' + h/8
			); 
			this.canvas.append(path);
			return this;
		};
	})();

	// Object Prototype: VisualPad
	(function(){
		// Private
		var bBtnLeft = false, bBtnMiddle = false, bBtnRight = false;
		var mouseX = 0, mouseY = 0, logtime = 0;
		var pinch = 0, pinchDelta = 0;
		
		// Gatherhub.VisualPad
		g.VisualPad = VisualPad;
		// Constructor
		function VisualPad(w, h) {
			trace(L1, this.constructor.name + '.VisualPad' +
				'(' + Array.prototype.slice.call(arguments) + ')');
			var self = this;
			g.SvgPad.call(this);
			this.source = null;
			this.size = 1;
			this.psize = -1;
			this.dragging = false;
			this.resolution = false;
			this.defaultWidth = w || $(window).width() / 4;
			this.defaultHeight = h || $(window).height() / 4;
			this.floating(true).moveto('top', 0).moveto('left', 0).minimize().nocontext();
			
			this.pad.on('mousedown touchstart', function(evt){
				var e = evt.originalEvent;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				e.preventDefault();
				if (e.button==0) bBtnLeft = true;
				if (e.button==1) bBtnMiddle = true;
				if (e.button==2) bBtnRight = true;

				if (t) {
					if (t.length == 2) {
						pinchDelta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2);
						pinch = 1;
					}
					if (t.length > 1) {
						self.mouseupHdl();
						return;
					}
				}
				self.mousedownHdl(x, y);
				bBtnLeft = true;
			});
			this.pad.on('mouseup mouseleave touchend',function(evt){
				var e = evt.originalEvent;
				e.preventDefault();
				if (e.button==0) bBtnLeft = false;
				if (e.button==1) bBtnMiddle = false;
				if (e.button==2) bBtnRight = false;
				self.mouseupHdl();
			});
			this.pad.on('mousemove touchmove', function(evt){
				var e = evt.originalEvent;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				e.preventDefault();
				if (t) {
					if (t.length == 2) {
						pinch += 1;
						if (pinch > self.pinchlevel) {
							var delta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2) - pinchDelta;
							self.mousewheelHdl(delta);
							pinchDelta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2);
							pinch = 0;
						}
					}
					if (t.length > 1) return;
				}
				self.mousemoveHdl(x, y);
			});
			this.pad.on('mousewheel DOMMouseScroll', function(evt){
				var e = evt.originalEvent;
				var delta = e.wheelDelta > 0 || e.detail < 0 ? 1 : -1;
				e.preventDefault();
				self.mousewheelHdl(delta);
			});
		}
		
		// Prototypes
		var _proto = VisualPad.prototype = extend(g.SvgPad);	// Inheritance
		_proto.constructor = VisualPad;							// Overload constructor
		_proto.source;
		_proto.draggable = false;
		_proto.pinchlevel = 3;
		_proto.src = function(srcid) {
			this.source = (srcid && srcid[0] == '#' ? $(srcid) : $('#' + srcid));
			// this is a workaround method to resolve <svg> namespace issue that could not be display properly in some browser
			this.canvas.append($('<svg><use xlink:href="#' + this.source.attr('id') + '"/></svg>').children().eq(0));
			return this;
		};
		_proto.defsize = function(w, h) {
			this.defaultWidth = w;
			this.defaultHeight = h;
			return this;
		};
		_proto.mousedownHdl = function(x, y) {
			if ($.now() - logtime < 400) {
				if (this.psize == -1) {
					this.top = this.pad.position().top;
					this.left = this.pad.position().left;
					this.pwidth = this.width();
					this.pheight = this.height();
					this.maximize().fitcontent();
					this.psize = this.size = this.width() / this.defaultWidth;
				}
				else {
					this.width(this.pwidth).height(this.pheight).moveto('left', this.left).moveto('top', this.top);
					this.size = this.width() / this.defaultWidth;
					this.psize = -1;
				}
			}
			else {
				this.dragging = true;
				mouseX = x;
				mouseY = y;
			}
			if (bBtnLeft) logtime = $.now();
		};
		_proto.mouseupHdl = function() {
			this.dragging = false;
		};
		_proto.mousemoveHdl = function(x, y) {
			if (this.draggable && this.dragging == true) {
				var top = this.pad.position().top + y - mouseY;
				var left = this.pad.position().left + x - mouseX;
								
				this.moveto('top', top).moveto('left', left);
				mouseX = x;
				mouseY = y;
			}			
		};
		_proto.mousewheelHdl = function(delta) {
			var r = -0.1;
			if (delta > 0) r *= -1;
			this.size += r;
			if (this.size >= 1) {
				var w = this.defaultWidth * this.size;
				var h = this.defaultHeight * this.size;
				var x = this.pad.position().left - this.defaultWidth * r / 2;
				var y = this.pad.position().top - this.defaultHeight * r / 2;
				this.width(w).height(h).moveto('left', x).moveto('top', y);
			}
			else {
				this.size = 1;
			}
		};
	})();

	// Object Prototype: SketchPad
	(function(){
		// Private
		var falseTouch = false, mouseX = 0, mouseY = 0, pinch = 0, pinchDelta = 0;
		var bBtnLeft = false, bBtnMiddle = false, bBtnRight = false;

		function screenxy(x, y) {return {x: x, y: y};}
		function canvasxy(screnXY) {
			return {x: screnXY.x - this.pad.position().left - this.borderpadding() / 2, 
					y: screnXY.y - this.pad.position().top - this.borderpadding() / 2};
		}
		function vboxxy(canvasxy) {
			return {x: precision(canvasxy.x / this.zrate + this.canvasvbox.x, 6),
					y: precision(canvasxy.y / this.zrate + this.canvasvbox.y, 6)};
		}
		function vbox2scn(vboxxy) {
			var x = (vboxxy.x - this.canvasvbox.x) * this.zrate;
			x = x < 0 ? 0 : x > this.width() ? this.width() : x;
			var y = (vboxxy.y - this.canvasvbox.y) * this.zrate;
			y = y < 0 ? 0 : y > this.height() ? this.height() : y;
			return {x: x, y: y};
		}
		function drawStart(x, y){
			var path;
			this.zoom(this.zrate);
			var point = vboxxy.call(this, canvasxy.call(this, screenxy(x, y)));
			x = point.x;
			y = point.y;
			
			var self = this;
			var pw = this.pc == self.bgcolor() ?  30 / this.zrate : this.pw / this.zrate * 1.1;
			if (this.geomode) {
				pw = 5 / this.zrate;
				path = $(document.createElementNS('http://www.w3.org/2000/svg', this.geo));
				path.attr('id', this.gid + '-' + this.seq++);
				path.attr('class', this.gid);
				path.attr('stroke-width', pw);
				path.attr('stroke-linecap', this.ps);
				path.attr('stroke', this.pc);
				path.attr('fill', 'none');
				path.attr({x0: x, y0: y});
				if (this.geo == 'rect') {
					path.attr({x: x, y: y});
				}
				else if (this.geo == 'ellipse') {
					path.attr({cx: x, cy: y});
				}
			}
			else {
				path =  $(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
				path.attr('id', this.gid + '-' + this.seq++);
				path.attr('class', this.gid);
				path.attr('stroke-width', pw);
				path.attr('stroke-linecap', this.ps);
				path.attr('stroke', this.pc);
				path.attr('fill', 'none');
				path.attr('d', 'M' + x + ',' + y);
			}
			path.on('click touchstart', function(){
				if (self.pc == self.bgcolor()) 
					$(this).clone().attr('stroke', self.bgcolor()).attr('stroke-width', 1 + $(this).attr('stroke-width') * 1).appendTo(self.pathholder);
			});

			this.pathholder.append(path);
			//clearPathsCache();
			this.activepath = path;
			falseTouch = true;
			setTimeout(function(){falseTouch=false;}, 5);
			if (this.dispatch) {
				this.dispatch({
					id: path.attr('id'),
					x: point.x,
					y: point.y,
					c: this.pc
				}, 'drawing');
			}
		}
		function drawPath(x, y){
			//trace(L4, this.constructor.name + '.drawPath' +
			//	'(' + Array.prototype.slice.call(arguments) + ')');
			if (this.activepath) {
				var path = this.activepath;
				var point = vboxxy.call(this, canvasxy.call(this, screenxy(x, y)));
				x = point.x;
				y = point.y;
				if (this.geomode) {
					var x0 = path.attr('x0') * 1;
					var y0 = path.attr('y0') * 1;
					if (this.geo == 'rect') {
						if (x > x0) path.attr({width: x - x0});
						else path.attr({x: x, width: x0 - x});
						if (y > y0) path.attr({height: y - y0});
						else path.attr({y: y, height: y0 - y});
					}
					else if (this.geo == 'ellipse') {
						path.attr('rx', Math.abs(x - x0));
						path.attr('ry', Math.abs(y - y0));
						path.attr('cx', x);
						path.attr('cy', y);
					}
					else if (this.geo == 'line') {
						path.attr({x1: x0, y1: y0, x2: x, y2: y});
					}
					else {
						path.attr('points', x0 + ',' + y + ' ' + x + ',' + y + ' ' + (x + x0)/2 + ',' + y0);
					}
				}
				else {
					path.attr('d', this.activepath.attr('d') + 'L' + x + ',' + y);
				}
			}
		}
		function drawEnd(){
			//trace(L4, this.constructor.name + '.drawEnd' +
			//	'(' + Array.prototype.slice.call(arguments) + ')');
			if (this.activepath) {
				var path = this.activepath;
				var move = this.geomode ? 2 : path.attr('d').split('L').length;
				this.activepath = null;
				
				if (move < 2 || (falseTouch && move < 3)) {
					path.remove();
					return;
				}
				this.redocache.empty();
				flush(this);

				if (this.dispatch) {
					this.dispatch(path2obj(path), 'graph');
				}
			}
		}
		function path2obj(p) {
			var obj = {};
			obj.tagName = p.prop('tagName');
			$.each(p[0].attributes, function(i, attr) {
				obj[attr.name] = attr.value;
			});
			if (p.html().length) obj['html'] = p.html();
			return obj;
		}
		function flush(sp) {
			if (sp) {
				sp.vpad.fitcontent();
				sp.zoom(sp.zrate);
			}			
		}
		function randcolor() {
			var c = '#';
			var rc = [];
			for (var i = 0;i < 6;i++) {
				rc[i] = 0 | Math.random() * 16;
				if (i == 4) {
					if (Math.abs(rc[0] - rc[2]) > 4) {
						rc[4] = Math.max(rc[0], rc[2]) + Math.abs(rc[0] - rc[2]);
					}
					else {
						rc[4] = 0 | ((rc[0] + rc[2]) / 2 + Math.random() * 8);
					}
					if (rc[4] > 15) rc[4] -= 15;
				}
				c += rc[i].toString(16);
			}
			return c.toUpperCase();
		}
		
		// Gatherhub.SketchPad
		g.SketchPad = SketchPad;
		// Constructor
		function SketchPad() {
			var self = this;
			g.SvgPad.call(this);
			this.pathholder = $(document.createElementNS('http://www.w3.org/2000/svg', 'g')).attr('id', 'g' + (0 | Math.random() * 1000)).appendTo(this.canvas);
			this.redocache = $(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
			this.nocontext();
			this.repcolor = randcolor();
			this.gid = this.repcolor.slice(1,7);
			this.tibox = $('<input type="text" id="tibox">');
			this.txtedit(0);
			
			this.tibox.on('keyup', function(e){
				if(e.keyCode == 13){
					$(this).blur();
				}				
			});
			this.tibox.on('blur', function(){
				if ($(this).val().length > 0) {
					var point = vboxxy.call(self, canvasxy.call(self, screenxy(self.tibox.x, self.tibox.y + $(this).height()-8)));
					var t =  $(document.createElementNS('http://www.w3.org/2000/svg', 'text'));
					t.attr({id: self.gid + '-' + self.seq++, class: self.gid, x: point.x * self.zrate, y: point.y * self.zrate, transform: 'scale(' + 1 / self.zrate + ')'}).css({'font-size': 24, fill: self.pc}).html($(this).val()).appendTo(self.pathholder);
					if (self.dispatch) self.dispatch(path2obj(t), 'graph');
				}
				$(this).val('').hide();
			});

			this.pad.on('mousedown touchstart', function(evt){
				var e = evt.originalEvent;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				x -= self.pad.parent().position().left;
				y -= self.pad.parent().position().top;
				e.preventDefault();

				mouseX = x;
				mouseY = y;

				if (e.button==0) bBtnLeft = true;
				if (e.button==1) bBtnMiddle = true;
				if (e.button==2) bBtnRight = true;

				if (t) {
					if (t.length == 2){
						self.zcenter.x = (x - (x - t[1].pageX) / 2) / self.width();
						self.zcenter.y = (y - (y - t[1].pageY) / 2) / self.height();
						pinchDelta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2);
						pinch = 1;
					}
					if (t.length > 1) {
						self.mouseupHdl();
						if (t.length == 3) self.dragging = true;
						return;
					}
				}
				
				if (bBtnMiddle || bBtnRight) {
					self.mouseupHdl();
				}
				else {
					self.mousedownHdl(x, y);
				}			
			});
			this.pad.on('mouseup mouseleave touchend',function(evt){
				var e = evt.originalEvent;
				e.preventDefault();
				if (e.button==0) bBtnLeft = false;
				if (e.button==1) bBtnMiddle = false;
				if (e.button==2) bBtnRight = false;
				self.mouseupHdl();
			});
			this.pad.on('mousemove touchmove', function(evt){
				var e = evt.originalEvent;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				x -= self.pad.parent().position().left;
				y -= self.pad.parent().position().top;
				e.preventDefault();
				if (bBtnMiddle || (bBtnLeft && bBtnRight)) {
					self.offsetcanvas('x', x - mouseX);
					self.offsetcanvas('y', y - mouseY);
				}
				if (t) {
					if (t.length == 2) {
						pinch += 1;
						if (pinch > self.pinchlevel) {
							var delta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2) - pinchDelta;
							self.mousewheelHdl(delta);
							pinchDelta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2);
							pinch = 0;
						}
					}
					if (t.length > 1) {
						if (t.length != 3) return;
					}
				}
				self.mousemoveHdl(x, y);
				mouseX = x;
				mouseY = y;
			});
			this.pad.on('mousewheel DOMMouseScroll', function(evt){
				var e = evt.originalEvent;
				var delta = e.wheelDelta > 0 || e.detail < 0 ? 1 : -1;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				x -= self.pad.parent().position().left;
				y -= self.pad.parent().position().top;
				e.preventDefault();
				self.zcenter.x = x / self.width();
				self.zcenter.y = y / self.height();
				self.mousewheelHdl(delta);
			});
		}
		
		// Prototypes
		var _proto = SketchPad.prototype = extend(g.SvgPad);	// Inheritance
		_proto.constructor = SketchPad;							// Overload constructor
		_proto.dispatch = null;
		_proto.gid = null;
		_proto.repcolor = '#FFF';
		_proto.vpad = null;
		_proto.pathholder = null;
		_proto.redocache = null;
		_proto.seq = 0;
		_proto.pc = 'black';
		_proto.pw = 5;
		_proto.ps = 'round';
		_proto.activepath = null;
		_proto.tibox = null;
		_proto.pinchlevel = 7;
		_proto.geo = 'rect';
		_proto.geomode = false;
		_proto.dragging = false;
		_proto.dragmode = false;
		_proto.timode = false;
		_proto.drag = function(on) {
			if (on) {
				_proto.dragmode = true;
				this.pad.css('cursor', 'move');
			}
			else {
				_proto.dragmode = false;
				this.pad.css('cursor', 'crosshair');
			}
			return this;
		};
		_proto.txtedit = function(on) {
			if (on) {
				_proto.timode = true;
				this.pad.css('cursor', 'text');
			}
			else {
				_proto.timode = false;
				this.tibox.blur();
				this.pad.css('cursor', 'crosshair');
			}
			return this;
		};
		_proto.drawgeo = function(on) {
			if (on) _proto.geomode = true;
			else _proto.geomode = false;
			return this;
		};
		_proto.attachvp = function(vp) {
			if (Object.getPrototypeOf(vp) === g.VisualPad.prototype) {
				vp.src(this.pathholder.attr('id'));
				vp.fitcontent();
				this.vpad = vp;
			}
			return this;			
		}
		_proto.pencolor = function(c) {
			if (c) {
				this.pc = c;
				return this;
			}
			return this.pc;
		};
		_proto.penwidth = function(w) {
			if (w) {
				this.pw = w;
				return this;
			}
			return this.pw;
		};
		_proto.penshape = function(s) {
			if (s) {
				this.ps = s;	
				return this;
			}
			return this.ps;
		};
		_proto.showdrawing = function(data) {
			var point = {x: data.x, y: data.y};
			var scnxy = vbox2scn.call(this, point);
			var left = scnxy.x == 0 ? 1 : (scnxy.x / this.width() > 0.5) ? scnxy.x - this.width() : scnxy.x;
			var top = scnxy.y == 0 ? 1 : (scnxy.y / this.height() > 0.5) ? scnxy.y - this.height() : scnxy.y;
			var i = data.id.split('-', 1);
			var r = $('<span/>').attr('id', i).html(data.name).appendTo('body');
			r.css({'position': 'absolute', 'color': data.c, 'border-width': 1, 'border-style': 'solid'});
			if (left > 0) r.css('left', left);
			else r.css('right', -left);
			if (top > 0) r.css('top', top );
			else r.css('bottom', -top);
			setTimeout(function(){$('#' + i).remove();}, 2000);			
		};
		_proto.appendpath = function(p) {
			var path;
			$.each(p, function(k, v){
				if (k == 'tagName') {
					path = $(document.createElementNS('http://www.w3.org/2000/svg', v));
				}
				else if (k == 'html') {
					path.html(v);
				}
				else {
					path.attr(k, v);
				}
			});
			path.appendTo(this.pathholder);
			flush(this);
			
			return this;
		};
		_proto.syncgraph = function(dst) {
			var self = this;
			$.each(this.pathholder.children(), function(i, p) {
				self.dispatch(path2obj($(p)), 'graph', dst);
			});
		};
		_proto.clearall = function() {
			if (this.dispatch) this.dispatch({}, 'clear');
			this.clearcanvas();
			this.redocache.empty();
			flush(this);
			return this;
		};
		_proto.undoall = function() {
			while ($('.' + this.gid).length) this.undo();
			return this;
		};
		_proto.undo = function() {
			var path = $('.' + this.gid).length ? $('.' + this.gid).last() : null;
			if (path && path.attr('id').indexOf(this.gid) == 0) {
				path.appendTo(this.redocache);
				if (this.dispatch) this.dispatch({id: path.attr('id')}, 'undo');
				flush(this);
			}
			return this;
		};
		_proto.redoall = function() {
			while (this.redocache.children().length) this.redo();
			return this;
		};
		_proto.redo = function() {
			if (this.redocache.children().length) var path = this.redocache.children().last().appendTo(this.pathholder);
			if (path && this.dispatch) {
				this.dispatch(path2obj(path), 'graph');
			}
			flush(this);
			return this;
		};
		_proto.clearcanvas = function() {
			this.pathholder.empty();
			this.redocache.empty();
			return this;
		};
		_proto.mousedownHdl = function(x, y) {
			if (this.dragmode) {
				this.dragging = true;
			}
			else if (this.timode) {
				this.tibox.css({top: y - 6, left: x, color: this.pc}).appendTo(this.pad.parent()).show().focus();
				this.tibox.x = x;
				this.tibox.y = y - 6;
			}
			else {
				drawStart.call(this, x, y);
			}
			trace(L4, 'screenXY=' + x + ', ' + y);
			trace(L4, 'canvasxy=' + canvasxy.call(this, screenxy(x,y)).x + ', ' + canvasxy.call(this, screenxy(x,y)).y);
			trace(L4, 'vboxxy=' + vboxxy.call(this, canvasxy.call(this, screenxy(x, y))).x + ', ' + vboxxy.call(this, canvasxy.call(this, screenxy(x, y))).y);
		};
		_proto.mouseupHdl = function() {
			drawEnd.call(this);
			this.dragging = false;
		};
		_proto.mousemoveHdl = function(x, y) {
			if (this.dragging) {
				this.offsetcanvas('x', x - mouseX);
				this.offsetcanvas('y', y - mouseY);
			}
			else {
				drawPath.call(this, x, y);
			}
		};
		_proto.mousewheelHdl = function(delta) {
			var offset = Math.pow(10, Math.floor(Math.log10(this.zrate)));

			if (delta > 0) {
				this.zoom(this.zoom() + offset);
			}
			else {
				if (this.zoom() <= offset) offset /= 10;
				this.zoom(this.zoom() - offset);
			}
		};
	})();

	// Object Prototype: SvgButton
	(function(){
		// Private

		// Gatherhub.SvgButton
		g.SvgButton = SvgButton;
		// Constructor
		function SvgButton(opt) {
			trace(L1, this.constructor.name + '.SvgButton' +
				'(' + Array.prototype.slice.call(arguments) + ')');
			g.VisualPad.call(this);
			this.defaultWidth = 50;
			this.defaultHeight = 50;
			this.resize = .8;
			this.borderwidth(1);
			this.borderradius(.1);
			this.bgcolor(opt.bgcolor || 'white');
			this.bordercolor(opt.bordercolor || 'black');
			this.iconcolor(opt.iconcolor || 'black');
			this.icon(opt.icon || '');
			this.pad.attr('title', opt.tip || '');
			if (opt.type == 'flat') {
				this.canvas.css('border-style', 'none');
			}
			else {
				this.pad.css('cursor', 'pointer');
			}
			if (opt === undefined) opt = {};
			if ($.isNumeric(opt.w)) this.defaultWidth = opt.w;
			if ($.isNumeric(opt.h)) this.defaultHeight = opt.h;
			if ($.isNumeric(opt.resize)) this.resize = opt.resize;
			if ($.isNumeric(opt.borderwidth)) this.borderwidth(opt.borderwidth);
			if ($.isNumeric(opt.borderradius)) this.borderradius(opt.borderradius);
			this.minimize();
			this.resizable = false;
			
			this.pad.off('mouseleave');
		}
		
		// Prototypes
		var _proto = SvgButton.prototype = extend(g.VisualPad);	// Inheritance
		_proto.constructor = SvgButton;							// Overload constructor
		_proto.onclick = function(){};
		_proto.icon = function(svg) {
			$('<svg>'+svg+'</svg>').children().eq(0).appendTo(this.canvas);
		};
		_proto.iconcolor = function(c) {
			this.canvas.css('fill', c);
			return this;
		};
		_proto.appendto = function(target) {
			g.VisualPad.prototype.appendto.call(this, target);
			this.fitcontent().zoom(this.zrate * this.resize);
			return this;
		};
		_proto.mousedownHdl = function(x, y) {
			g.VisualPad.prototype.mousedownHdl.call(this, x, y);
			this.fitcontent().zoom(this.zrate * this.resize);
			this.prevborderwd = this.borderwidth();
			this.borderwidth(this.prevborderwd + 1);
		};
		_proto.mouseupHdl = function(x, y) {
			g.VisualPad.prototype.mouseupHdl.call(this, x, y);
			this.borderwidth(this.prevborderwd);
			this.onclick();
		};
	})();
	
	// Object Prototype: BtnMenu
	(function(){
		// Private

		// Gatherhub.BtnMenu
		g.BtnMenu = BtnMenu;
		
		// Constructor
		function BtnMenu(list) {
			var l = list.rootlist;
			if (l.length > 0) {
				var root = this.root = createMenu(l);
				var children = root.children();
				root.attr('dir', list.direction);
				if (list.direction == 'h0' || list.direction == 'h1') children.css('float', 'left');
				list.id = root.attr('id');
				children.addClass(list.id);
			}
			
			var self = this;

			function togglesub(){	
				var w = $(this).width();
				var hbtns = $(this).parent().children().slice(0, $(this).index()).filter(':hidden').length;
				var sub = $('#' + $(this).children().last().attr('class'));
				if (sub.length == 0) sub = $('.' + $(this).attr('id'));

				var top = $(this).parent().position().top + ($(this).index() - hbtns) * w;
				var left = $(this).parent().position().left;
				if ($(this).parent().attr('dir') == 'h0' || $(this).parent().attr('dir') == 'h1') {
					top = $(this).parent().position().top;
					left = $(this).parent().position().left + ($(this).index() - hbtns) * w;
				}
				
				if (sub.attr('dir') == 'h0' || sub.attr('dir') == 'h1') {
					if (sub.attr('dir') == 'h1') {
						top += w;
						if (top + w > $(window).height()) top -= 2 * w;
					}
					else {
						left += w;
					}
					if (left + w * sub.children().length > $(window).width()){
						left -= w * (sub.children().length + 1);
						if (sub.attr('dir') == 'h1') left += w * 2;
					}
				}
				else {
					if (sub.attr('dir') == 'v1') {
						left += w;
						if (left + w > $(window).width()) left -= 2 * w;
					}
					else {
						top += w;
					}
					if (sub.children().length * w + top > $(window).height()) {
						top -= w * (sub.children().length - 1);
						if (sub.attr('dir') == 'v0') top -= w * 2;
					}
				}
				sub.css({'top': top, 'left': left});
				if (sub.is(':hidden')) {
					self.collapseall();
					sub.show();
				}
				else {sub.hide();}
			}
			
			function createMenu(list) {
				var m = $('<div/>').css('font-size', 0).appendTo('body');
				m.attr('id', 0 | (Math.random() * 10000));
				
				list.forEach(function(e){
					var id = e.id = 0 | (Math.random() * 10000);
					var slist = e.sublist;

					if (slist) {
						slist = createMenu(slist);
						slist.attr('dir', e.direction);
						if (e.direction == 'h0' || e.direction == 'h1') slist.children().css('float', 'left');
						slist.css('position', 'absolute').attr('class', id).appendTo('body').hide();
						slist.children().addClass(slist.attr('id'));
					}

					if (e.btn) {
						e.btn = new Gatherhub.SvgButton(e.btn).appendto(m).pad.attr('id', id);	
						if (e.act) {
							e.btn.on('click touchstart', function(){
								e.act();
								var btngrp = $('.' + $(this).attr('class'));
								if ($(this).parent().attr('id') == $(this).attr('class')) {
									for (var i = 0; i < btngrp.length; i++) {
										if ($(btngrp[i]).parent().attr('id') != $(this).attr('class')) {
											$(this).appendTo($(btngrp[i]).parent());
											$(btngrp[i]).appendTo($('#' + $(this).attr('class')));
											$(this).click();
											break;
										}
									}
								}
							});
						}
					}
					else {
						e.btn = $('<div/>').css('font-size', 0).attr('id', id).appendTo(m);
						if (slist.children().length > 0) slist.children().first().show().appendTo(e.btn);
					}
					
					if (slist) {
						e.btn.on('click touchstart', togglesub);
					}
				});
				return m;
			}
		}

		// Prototypes
		var _proto = BtnMenu.prototype;
		_proto.constructor = BtnMenu;
		_proto.collapseall = function() {
			this.root.children().each(function(e,k) {
				var sub = $('#' + $(this).children().last().attr('class'));
				if (sub.length == 0) sub = $('.' + $(this).attr('id'));
				if (!sub.is(':hidden')) sub.hide();
			});
		};
	})();
})();

if (typeof module !== 'undefined') {
	module.exports = Gatherhub;
}
},{}],12:[function(require,module,exports){
var svgicon = {
	brushl: '<g><path d="M0.002,123.619C0,123.484,0,123.438,0.002,123.619L0.002,123.619z"/><path d="M134.563,5.449c0,0-7.158-0.347-10.589,3.085c-1.421,1.409-2.927,3.098-4.624,4.884c-6.754,7.176-15.693,16.809-24.558,26.519c-8.825,9.748-17.646,19.506-24.083,27c-3.234,3.733-5.933,6.838-7.821,9.012c-1.864,2.199-2.929,3.458-2.929,3.458c-2.169,2.555-2.258,6.376-0.04,9.047c2.485,2.983,6.922,3.39,9.907,0.908c0,0,1.266-1.059,3.483-2.901c2.194-1.866,5.324-4.537,9.081-7.74c7.551-6.375,17.382-15.105,27.206-23.846c9.784-8.78,19.497-17.635,26.728-24.33c1.802-1.679,3.502-3.17,4.923-4.578c3.18-3.014,3.18-7.529,3.18-8.885C144.436,11.628,142.333,6.109,134.563,5.449z"/><path d="M78.939,94.825c0,0-0.036-1.3-0.355-3.267c-0.146-0.896-0.765-1.646-1.615-1.962c-0.854-0.316-1.812-0.148-2.506,0.438l-2.382,2.017c-1.897,1.576-4.286,2.44-6.741,2.44c-3.142,0-6.094-1.383-8.104-3.793c-3.284-3.949-3.258-9.649,0.058-13.557l2.037-2.365c0.32-0.368,0.388-0.896,0.176-1.335c-0.216-0.442-0.671-0.714-1.161-0.691c0,0-36.537-0.976-38.566,30.112c-1.722,26.372-14.744,23.391-18.657,21.518c-0.107-0.05-0.234-0.043-0.332,0.021c-0.1,0.062-0.161,0.174-0.161,0.29c0,0.009,0,0.016,0,0.022c0,0.475,0.138,0.931,0.395,1.33c3.582,5.543,17.449,21.216,53.936,7.396C54.961,133.439,82.329,123.5,78.939,94.825z"/></g>',
	brushm: '<g><path d="M0.002,123.619C0,123.484,0,123.438,0.002,123.619L0.002,123.619z"/><path d="M134.563,5.449c0,0-7.158-0.347-10.589,3.085c-1.421,1.409-2.927,3.098-4.624,4.884    c-6.754,7.176-15.693,16.809-24.558,26.519c-8.825,9.748-17.646,19.506-24.083,27c-3.234,3.733-5.933,6.838-7.821,9.012c-1.864,2.199-2.929,3.458-2.929,3.458c-2.169,2.555-2.258,6.376-0.04,9.047c2.485,2.983,6.922,3.39,9.907,0.908    c0,0,1.266-1.059,3.483-2.901c2.194-1.866,5.324-4.537,9.081-7.74c7.551-6.375,17.382-15.105,27.206-23.846    c9.784-8.78,19.497-17.635,26.728-24.33c1.802-1.679,3.502-3.17,4.923-4.578c3.18-3.014,3.18-7.529,3.18-8.885    C144.436,11.628,142.333,6.109,134.563,5.449z"/><path d="m 72.48768,92.615878 c 0.40784,0.945103-0.50676,-3.448052 -3.035056,-1.372983 -2.930824,1.009578 -4.79992,1.054676 -6.347345,0.491883 -1.915869,-0.543873 -3.00474,-1.171317 -4.27879,-2.714067 -0.910774,-1.789793 -2.301132,-3.097255 -1.24592,-7.427848 0.705561,-2.002175 0.885635,-3.486644 -1.863616,-3.394171 0,0 -19.441263,-0.338794 -20.727353,19.562038 -1.0915,16.88191 -9.34553,14.97364 -11.8258,13.77465 -0.0678,-0.032 -0.14832,-0.0275 -0.21044,0.0134 -0.0634,0.0397 -0.10205,0.11139 -0.10205,0.18564 l 0,0.0141 c 0,0.30406 0.0875,0.59597 0.25037,0.85139 2.27046,3.54832 11.06011,13.58132 34.18751,4.73451 0,0 17.34729,-6.3624 15.19853,-24.71857 z"/></g>',
	brushs: '<g><path d="M0.002,123.619C0,123.484,0,123.438,0.002,123.619L0.002,123.619z"/><path d="M134.563,5.449c0,0-7.158-0.347-10.589,3.085c-1.421,1.409-2.927,3.098-4.624,4.884c-6.754,7.176-15.693,16.809-24.558,26.519c-8.825,9.748-17.646,19.506-24.083,27c-3.234,3.733-5.933,6.838-7.821,9.012c-1.864,2.199-2.929,3.458-2.929,3.458c-2.169,2.555-2.258,6.376-0.04,9.047c2.485,2.983,6.922,3.39,9.907,0.908c0,0,1.266-1.059,3.483-2.901c2.194-1.866,5.324-4.537,9.081-7.74c7.551-6.375,17.382-15.105,27.206-23.846c9.784-8.78,19.497-17.635,26.728-24.33c1.802-1.679,3.502-3.17,4.923-4.578c3.18-3.014,3.18-7.529,3.18-8.885C144.436,11.628,142.333,6.109,134.563,5.449z"/><path d="m 69.498945,91.220761 c -5.67405,2.170216 -6.700578,1.580298 -8.96519,0.524646 -3.305267,-2.580653 -3.521703,-4.387248 -3.521703,-4.387248 -1.036204,-4.523058 1.335305,-5.07741 -0.529875,-6.548374 -7.290282,1.073824 -11.137741,8.59222 -11.55976,12.453996 -0.67116,8.780609 -5.74655,7.788079 -7.27166,7.164459 -0.0417,-0.0166 -0.0912,-0.0143 -0.1294,0.007 -0.039,0.0207 -0.0627,0.0579 -0.0627,0.0966 l 0,0.007 c 0,0.15815 0.0538,0.30998 0.15395,0.44283 1.3961,1.84555 6.80085,7.0639 21.02185,2.46251 0,0 12.565554,-2.42313 11.244284,-11.970533 z"/></g>',
	center: '<g><path d="M468.467,222.168h-28.329c-9.712-89.679-80.46-161.18-169.71-172.258V24.135c0-13.338-10.791-24.134-24.134-24.134c-13.311,0-24.117,10.796-24.117,24.134V49.91C132.924,60.988,62.177,132.488,52.482,222.168H24.153C10.806,222.168,0,232.964,0,246.286c0,13.336,10.806,24.132,24.153,24.132h29.228c12.192,86.816,81.551,155.4,168.797,166.229v31.804c0,13.336,10.806,24.135,24.117,24.135c13.343,0,24.134-10.799,24.134-24.135v-31.804c87.228-10.829,156.607-79.413,168.775-166.229h29.264c13.33,0,24.122-10.796,24.122-24.132C492.589,232.964,481.797,222.168,468.467,222.168z M246.294,398.093c-85.345,0-154.804-69.453-154.804-154.813c0-85.363,69.459-154.813,154.804-154.813c85.376,0,154.823,69.45,154.823,154.813C401.117,328.639,331.671,398.093,246.294,398.093z"/><path d="M246.294,176.93c-36.628,0-66.34,29.704-66.34,66.349c0,36.635,29.711,66.349,66.34,66.349c36.66,0,66.34-29.713,66.34-66.349C312.634,206.635,282.955,176.93,246.294,176.93z"/></g>',
	chat: '<g id="svgChat"><path d="M 459,0 51,0 C 22.95,0 0.04149554,22.950031 0,51 L -0.45209283,356.60369 C -4.7678579,396.7181 16.37033,406.23711 36.399971,408.55808 L 34.106645,488.125 102,408 l 357,0 c 28.05,0 51,-22.95 51,-51 L 510,51 C 510,22.95 487.05,0 459,0 Z m -280.5,229.5 -51,0 0,-51 51,0 z m 102,0 -51,0 0,-51 51,0 z m 102,0 -51,0 0,-51 51,0 z"/></g>',
	chat2: '<g id="svgChat2"><path d="M406.975,205.046v5.087c0,46.294-37.663,83.958-83.958,83.958H201.071v10.472c0,22.139,17.946,40.084,40.083,40.084h101.938l46.158,45.411c1.645,1.617,3.828,2.477,6.047,2.477c1.123,0,2.254-0.221,3.33-0.67c3.204-1.344,5.289-4.479,5.289-7.951v-39.345c21.019-1.242,37.683-18.675,37.683-40.006V244.75C441.6,224.467,426.528,207.711,406.975,205.046z"/><path d="M383.787,208.459v-95.437c0-35.323-28.636-63.958-63.958-63.958H63.958C28.635,49.064,0,77.699,0,113.022v95.437c0,34.037,26.589,61.851,60.126,63.833v62.777c0,5.542,3.327,10.544,8.438,12.686c1.718,0.721,3.522,1.069,5.313,1.069c3.542,0,7.025-1.368,9.649-3.95l73.65-72.457h162.651C355.152,272.418,383.787,243.783,383.787,208.459z"/></g>',
	circle: '<g><path d="M230.339,460.678c61.525,0,119.369-23.959,162.875-67.465c43.505-43.505,67.464-101.35,67.464-162.874c0-61.525-23.959-119.369-67.464-162.875C349.708,23.959,291.864,0,230.339,0C168.814,0,110.97,23.959,67.464,67.464C23.959,110.97,0,168.814,0,230.339c0,61.524,23.959,119.369,67.464,162.875C110.97,436.719,168.814,460.678,230.339,460.678zM85.142,85.142C123.926,46.359,175.491,25,230.339,25c54.848,0,106.413,21.359,145.197,60.143c38.784,38.784,60.142,90.348,60.142,145.196c0,54.849-21.358,106.413-60.143,145.197s-90.349,60.142-145.196,60.142c-54.848,0-106.413-21.358-145.197-60.143C46.358,336.751,25,285.188,25,230.339C25,175.491,46.359,123.926,85.142,85.142z"/></g>',
	clear: '<g><path d="M42.735,121.521c-12.77-10.273-20.942-26.025-20.942-43.691c0-26.114,17.882-47.992,42.051-54.23V9.154C31.854,15.646,7.776,43.927,7.776,77.83c0,20.951,9.199,39.738,23.767,52.578C42.819,140.911,49.827,126.894,42.735,121.521zM123.589,24.746c-7.18-6.485-17.693,4.028-10.801,9.236c12.888,10.27,21.143,26.097,21.143,43.848c0,26.118-17.885,48-42.052,54.234v14.449c31.99-6.499,56.068-34.776,56.068-68.684C147.947,56.602,138.502,37.596,123.589,24.746z M70.037,35.707l22.813-13.661c3.319-1.988,3.326-5.226,0.018-7.228L69.844,0.883c-3.312-1.999-5.985-0.49-5.969,3.381l0.124,28.035C64.009,36.168,66.714,37.695,70.037,35.707z M85.883,120.029l-23.027,13.935c-3.311,2.002-3.304,5.239,0.019,7.228l22.811,13.662c3.319,1.984,6.03,0.462,6.047-3.412l0.12-28.034C91.865,119.54,89.188,118.03,85.883,120.029z"/></g>',
	conference: '<g><path d="M225.618,96.642c12.69-8.768,21.236-25.012,21.236-43.575c0-25.13-5.085-50.82-42.799-50.82s-42.799,25.69-42.799,50.82c0,18.563,8.546,34.807,21.236,43.575c-28.077,8.424-48.438,32.819-48.438,61.539c0,14.806,7.541,25.32,22.412,31.249c10.886,4.34,26.008,6.361,47.588,6.361c21.581,0,36.702-2.021,47.588-6.361c14.871-5.929,22.412-16.442,22.412-31.249C274.056,129.462,253.695,105.066,225.618,96.642z"/><path d="M91.565,286.688c12.688-8.769,21.234-25.013,21.234-43.575c0-25.13-5.085-50.82-42.8-50.82c-37.715,0-42.8,25.69-42.8,50.82c0,18.563,8.546,34.806,21.234,43.575C20.36,295.112,0,319.507,0,348.226c0,14.806,7.541,25.32,22.412,31.249c10.886,4.34,26.008,6.361,47.588,6.361c21.58,0,36.702-2.021,47.588-6.361C132.459,373.545,140,363.032,140,348.226C140,319.507,119.64,295.112,91.565,286.688z"/><path d="M359.677,286.688c12.689-8.769,21.234-25.013,21.234-43.575c0-25.13-5.085-50.82-42.8-50.82c-37.715,0-42.8,25.69-42.8,50.82c0,18.563,8.546,34.806,21.234,43.575c-28.074,8.424-48.435,32.819-48.435,61.538c0,14.806,7.541,25.32,22.412,31.249c10.886,4.34,26.008,6.361,47.588,6.361c21.58,0,36.702-2.021,47.588-6.361c14.871-5.929,22.412-16.442,22.412-31.249C408.111,319.507,387.751,295.112,359.677,286.688z"/><path d="M251.347,382.271c-0.492-1.231-1.453-2.217-2.672-2.74c-1.218-0.523-2.594-0.541-3.826-0.048c-10.751,4.294-24.094,6.382-40.793,6.382s-30.042-2.087-40.793-6.382c-1.23-0.492-2.607-0.474-3.826,0.048c-1.219,0.523-2.18,1.509-2.672,2.74l-3.709,9.286c-1.024,2.564,0.225,5.473,2.788,6.497c13.153,5.255,28.924,7.81,48.212,7.81s35.059-2.555,48.212-7.81c2.564-1.024,3.813-3.934,2.788-6.497L251.347,382.271z"/><path d="M56.635,166.908l9.19,3.942c0.643,0.275,1.312,0.406,1.97,0.406c1.938,0,3.784-1.135,4.597-3.03c4.564-10.639,12.523-21.55,24.33-33.357c11.811-11.808,22.722-19.767,33.358-24.331c1.219-0.523,2.18-1.508,2.672-2.74c0.491-1.231,0.475-2.608-0.049-3.827l-3.943-9.189c-1.089-2.539-4.03-3.712-6.566-2.623c-13.017,5.584-25.974,14.929-39.612,28.567c-13.64,13.639-22.984,26.597-28.568,39.615C52.923,162.879,54.098,165.819,56.635,166.908z"/><path d="M278.032,110.538c10.637,4.564,21.548,12.523,33.358,24.331c11.807,11.807,19.766,22.719,24.33,33.357c0.813,1.895,2.658,3.03,4.597,3.03c0.658,0,1.327-0.131,1.97-0.406l9.189-3.942c2.537-1.089,3.712-4.029,2.623-6.566c-5.584-13.018-14.929-25.977-28.568-39.615c-13.639-13.639-26.596-22.983-39.612-28.567c-2.536-1.089-5.477,0.084-6.566,2.623l-3.943,9.189c-0.523,1.219-0.54,2.595-0.049,3.827C275.853,109.03,276.814,110.015,278.032,110.538z"/></g>',
	cpalette: '<g><path d="M363.061,50.904c-17.052-25.867-44.2-42.01-80.69-47.98C270.513,0.985,258.701,0,247.261,0C187.198,0,134.355,26.518,94.447,76.686c-25.912,32.574-44.91,73.506-54.938,118.371c-9.581,42.863-10.104,87.063-1.475,124.459l0.068,0.285c7.519,30.072,34.704,72.422,71.603,72.422c11.282,0,28.049-4.225,43.876-24.332c6.559-8.203,11.931-16.471,16.672-23.766c12.632-19.436,18.416-26.779,29.127-26.779c2.522,0,5.394,0.387,8.565,1.148c8.888-26.43,17.542-51.732,20.466-58.869c2.947-7.197,8.42-17.166,16.255-29.627c-0.605-1.576-1.156-3.18-1.608-4.822c-3.976-14.438-2.146-31.67,5.291-49.83c7.28-17.773,18.703-32.693,33.033-43.152c12.951-9.451,27.58-14.744,41.19-14.906h0.208c2.38,0,4.7,0.455,6.899,1.357c3.811,1.559,7.007,4.4,9.006,7.998c3.247,5.824,3.037,12.961-0.557,18.604c-2.049,3.223-1.73,5.375,2.444,16.436c4.753,12.588,11.261,29.826,3.183,51.977c-9.528,26.123-24.521,37.445-35.494,42.348c-3.169,14.441-6.261,25.398-9.192,32.559c-0.872,2.129-2.524,5.787-4.733,10.529c13.363-10.164,26.267-23.42,38.113-39.41c27.22-36.742,45.494-83.537,48.884-125.18C383.98,101.959,377.663,73.051,363.061,50.904z M102.218,244.771c-16.567,0-29.998-13.432-29.998-29.998c0-16.567,13.431-30,29.998-30c16.568,0,29.999,13.432,29.999,30C132.217,231.34,118.787,244.771,102.218,244.771z M135.55,164.774c-16.567,0-29.998-13.43-29.998-29.998s13.431-29.998,29.998-29.998c16.568,0,29.999,13.43,29.999,29.998S152.119,164.774,135.55,164.774z M195.547,104.777c-16.567,0-29.998-13.432-29.998-29.998c0-16.568,13.431-30,29.998-30c16.567,0,29.999,13.432,29.999,30C225.546,91.346,212.115,104.777,195.547,104.777z M288.252,98.274c-16.566,0-29.997-13.43-29.997-29.998s13.431-29.998,29.997-29.998c16.569,0,30,13.43,30,29.998S304.822,98.274,288.252,98.274z"/><path d="M324.867,133.924c-0.357-0.643-0.919-1.129-1.577-1.398c-0.389-0.16-0.812-0.242-1.245-0.238c-19.627,0.232-46.938,15.584-60.522,48.744c-6.168,15.061-7.797,28.951-4.708,40.166c0.806,2.927,1.934,5.64,3.338,8.119l35.878,14.896c1.779-0.468,3.544-1.076,5.276-1.84c8.324-3.681,19.879-12.541,27.652-33.854c6.171-16.92,1.233-29.998-3.123-41.539c-4.164-11.029-7.453-19.742-1.063-29.791C325.401,136.199,325.437,134.947,324.867,133.924z M319.285,203.299c-0.033,0.648-1.007,16.012-17.269,26.248c-0.3,0.188-0.613,0.352-0.936,0.486c-2.887,1.209-6.193,0.164-7.861-2.486c-0.906-1.441-1.198-3.15-0.82-4.812c0.378-1.66,1.381-3.076,2.821-3.984c10.514-6.615,11.297-15.762,11.326-16.148c0.121-2.393,1.656-4.574,3.904-5.516c0.197-0.084,0.401-0.156,0.609-0.221c0.705-0.213,1.438-0.303,2.181-0.266C316.754,196.781,319.465,199.787,319.285,203.299z"/><path d="M241.585,265.311c-6.348,15.496-42.263,124.465-43.788,129.099c-2.431,7.379,1.259,15.383,8.449,18.328c7.189,2.944,15.435-0.173,18.878-7.138c2.165-4.379,53.083-107.402,59.355-122.719c3.137-7.658,6.188-19.807,8.596-30.863l-35.88-14.895C251.148,246.697,244.766,257.545,241.585,265.311z"/></g>',
	download: '<g><path d="M25.462,19.105v6.848H4.515v-6.848H0.489v8.861c0,1.111,0.9,2.012,2.016,2.012h24.967c1.115,0,2.016-0.9,2.016-2.012v-8.861H25.462z"/><path d="M14.62,18.426l-5.764-6.965c0,0-0.877-0.828,0.074-0.828s3.248,0,3.248,0s0-0.557,0-1.416c0-2.449,0-6.906,0-8.723c0,0-0.129-0.494,0.615-0.494c0.75,0,4.035,0,4.572,0c0.536,0,0.524,0.416,0.524,0.416c0,1.762,0,6.373,0,8.742c0,0.768,0,1.266,0,1.266s1.842,0,2.998,0c1.154,0,0.285,0.867,0.285,0.867s-4.904,6.51-5.588,7.193C15.092,18.979,14.62,18.426,14.62,18.426z"/><g>',
	eraser: '<g id="svgEraser"><path d="M348.994,102.946L250.04,3.993c-5.323-5.323-13.954-5.324-19.277,0l-153.7,153.701l118.23,118.23l153.701-153.7C354.317,116.902,354.317,108.271,348.994,102.946z"/><path d="M52.646,182.11l-41.64,41.64c-5.324,5.322-5.324,13.953,0,19.275l98.954,98.957c5.323,5.322,13.954,5.32,19.277,0l41.639-41.641L52.646,182.11z"/><polygon points="150.133,360 341.767,360 341.767,331.949 182.806,331.949"/></g>',
	fit: '<g><polygon points="250.591,228.464 171.41,149.283 251.091,69.602 274.684,93.195 297.566,0.695 204.046,22.558 228.464,46.976 148.783,126.656 69.103,46.976 93.521,22.558 0,0.695 22.883,93.195 46.476,69.602 126.156,149.283 46.976,228.464 22.883,204.371 0,296.871 93.521,275.009 69.603,251.091 148.783,171.91 227.964,251.091 204.046,275.009 297.566,296.871 274.684,204.371 "/></g>',
	geometrical: '<g><path d="M405.419,165.641V58.771H160.643v111.433l-8.251-14.295L0,419.859h260.975c29.303,32.634,71.032,51.317,114.736,51.317c85.051,0,154.236-69.191,154.236-154.235C529.959,243.019,477.732,179.791,405.419,165.641z M152.391,192.646l8.251,14.287v96.615h55.78l5.21,9.031l-0.042,0.898c-0.059,1.146-0.115,2.3-0.115,3.452c0,30.274,8.742,59.385,25.343,84.565H31.818L152.391,192.646zM387.048,77.139v208.038H179.01V77.139H387.048z M375.711,452.807c-74.912,0-135.864-60.952-135.864-135.865c0-1.844,0.104-3.659,0.192-5.479l0.033-0.573l1.034-1.312l-0.884-1.549c0.104-1.501,0.23-2.99,0.381-4.479h164.816V184.398c61.731,13.811,106.157,68.97,106.157,132.543C511.588,391.854,450.637,452.807,375.711,452.807z"/></g>',
	hangup:'<g><path d="M0,17.783l0.02,2.637l0.003,0.004c0.006,0.603,0.498,1.033,1.047,1.027l0.007,0.004l7.489-0.06	c0.578-0.005,1.028-0.476,1.022-1.043l-0.021-2.64l-0.366,0.005c0.114-1.096,1.444-1.354,4.096-1.647l6.383-0.055 c1.534,0.149,3.022,0.425,3.129,1.617l-0.205,0.001l0.021,2.637l0.001,0.004c0.005,0.605,0.499,1.033,1.049,1.028l0.006,0.005	l7.488-0.062c0.579-0.002,1.027-0.474,1.023-1.041l-0.022-2.64l-0.271,0.002c-0.264-1.604-2.91-6.78-15.413-6.828 c-12.975-0.047-16.012,5.323-16.17,7.043L0,17.783z"/></g>',
	line: '<line stroke-width="7" stroke-linecap="round" stroke="black" x1="150" y1="200" x2="250" y2="100"/>',
	logout: '<g><path d="M61.168,83.92H11.364V13.025H61.17c1.104,0,2-0.896,2-2V3.66c0-1.104-0.896-2-2-2H2c-1.104,0-2,0.896-2,2v89.623c0,1.104,0.896,2,2,2h59.168c1.105,0,2-0.896,2-2V85.92C63.168,84.814,62.274,83.92,61.168,83.92z"/><path d="M96.355,47.058l-26.922-26.92c-0.75-0.751-2.078-0.75-2.828,0l-6.387,6.388c-0.781,0.781-0.781,2.047,0,2.828l12.16,12.162H19.737c-1.104,0-2,0.896-2,2v9.912c0,1.104,0.896,2,2,2h52.644L60.221,67.59c-0.781,0.781-0.781,2.047,0,2.828l6.387,6.389c0.375,0.375,0.885,0.586,1.414,0.586c0.531,0,1.039-0.211,1.414-0.586l26.922-26.92c0.375-0.375,0.586-0.885,0.586-1.414C96.943,47.941,96.73,47.433,96.355,47.058z"/></g>',
	menu: '<g><path d="M89.834,1.75H3c-1.654,0-3,1.346-3,3v13.334c0,1.654,1.346,3,3,3h86.833c1.653,0,3-1.346,3-3V4.75C92.834,3.096,91.488,1.75,89.834,1.75z"/><path d="M89.834,36.75H3c-1.654,0-3,1.346-3,3v13.334c0,1.654,1.346,3,3,3h86.833c1.653,0,3-1.346,3-3V39.75C92.834,38.096,91.488,36.75,89.834,36.75z"/><path d="M89.834,71.75H3c-1.654,0-3,1.346-3,3v13.334c0,1.654,1.346,3,3,3h86.833c1.653,0,3-1.346,3-3V74.75C92.834,73.095,91.488,71.75,89.834,71.75z"/></g>',
	mic: '<g id="svgMic"><path d="M436.578,159.876c-35.857-6.394-69.801-23.349-96.838-50.344c-27.008-27.022-43.944-60.947-50.315-96.812c36.306-22.745,88.937-14.689,125.391,21.753C451.246,70.915,459.297,123.555,436.578,159.876z M411.525,184.934c-34.438-9.625-66.721-27.482-93.226-53.96c-26.476-26.505-44.337-58.787-53.914-93.211c-22.714,36.321-14.659,88.934,21.754,125.374C322.594,199.563,375.191,207.632,411.525,184.934z M267.331,346.338c-45.294,0-77.679,28.306-106.255,53.271c-31.571,27.601-58.936,51.533-99.197,39.124c-7.966-5.866-8.202-10.66-8.291-12.288c-0.564-10.902,12.644-25.529,19.131-30.92c0.8-0.653,1.255-1.54,1.881-2.338c10.631,3.701,22.845,1.563,31.362-6.931L312.2,216.486c-17.058-7.241-33.313-17.723-47.482-31.911c-14.192-14.186-24.643-30.459-31.872-47.485L63.093,343.347c-7.552,7.551-9.743,18.001-7.685,27.713c-0.637,0.388-1.349,0.564-1.941,1.041c-3.244,2.665-31.584,26.771-30.177,55.762c0.504,10.193,4.947,24.908,23.352,37.229l3.629,1.773c11.803,3.939,22.803,5.656,33.141,5.656c40.335,0,70.424-26.294,97.626-50.077c26.934-23.546,52.386-45.784,86.294-45.784c78.159,0,138.659,83.751,139.279,84.577c4.826,6.902,14.338,8.438,21.119,3.589c6.842-4.831,8.438-14.281,3.612-21.114C428.527,439.74,361.274,346.338,267.331,346.338z"/></g>',
	move: '<g><polygon points="502.675,251.321 398.38,147.07 398.38,215.427 287.269,215.427 287.269,104.295 355.605,104.295 251.332,0 147.016,104.295 215.438,104.295 215.438,215.427 104.306,215.427 104.306,147.07 0.011,251.321 104.306,355.637 104.306,287.215 215.438,287.215 215.438,398.434 147.016,398.434 251.332,502.686 355.605,398.434 287.269,398.434 287.269,287.215 398.38,287.215 398.38,355.637"/></g>',
	move2: '<g><polygon points="18,20 18,26 22,26 16,32 10,26 14,26 14,20"/><polygon points="14,12 14,6 10,6 16,0 22,6 18,6 18,12"/><polygon points="12,18 6,18 6,22 0,16 6,10 6,14 12,14 			"/><polygon points="20,14 26,14 26,10 32,16 26,22 26,18 20,18"/></g>',
	p2p: '<g><path d="M17.567,15.938l-2.859-2.702c0.333-0.605,0.539-1.29,0.539-2.029c0-2.342-1.897-4.239-4.24-4.239c-2.343,0-4.243,1.896-4.243,4.239c0,2.343,1.9,4.241,4.243,4.241c0.826,0,1.59-0.246,2.242-0.654l2.855,2.699C16.536,16.922,17.023,16.399,17.567,15.938z"/><path d="M29.66,15.6l3.799-6.393c0.374,0.107,0.762,0.184,1.169,0.184c2.347,0,4.244-1.898,4.244-4.241c0-2.342-1.897-4.239-4.244-4.239c-2.343,0-4.239,1.896-4.239,4.239c0,1.163,0.469,2.214,1.227,2.981l-3.787,6.375C28.48,14.801,29.094,15.169,29.66,15.6z"/><path d="M42.762,20.952c-1.824,0-3.369,1.159-3.968,2.775l-5.278-0.521c0,0.04,0.006,0.078,0.006,0.117c0,0.688-0.076,1.36-0.213,2.009l5.276,0.521c0.319,2.024,2.062,3.576,4.177,3.576c2.342,0,4.238-1.896,4.238-4.238C47,22.85,45.104,20.952,42.762,20.952z"/><path d="M28.197,37.624l-1.18-5.156c-0.666,0.232-1.359,0.398-2.082,0.481l1.182,5.157c-1.355,0.709-2.29,2.11-2.29,3.746c0,2.342,1.896,4.237,4.243,4.237c2.342,0,4.238-1.896,4.238-4.237C32.311,39.553,30.479,37.692,28.197,37.624z"/><path d="M14.357,25.37l-6.57,2.201c-0.758-1.158-2.063-1.926-3.548-1.926C1.896,25.645,0,27.542,0,29.884c0,2.345,1.896,4.242,4.239,4.242c2.341,0,4.242-1.897,4.242-4.242c0-0.098-0.021-0.188-0.029-0.284l6.591-2.207C14.746,26.752,14.51,26.077,14.357,25.37z"/><circle cx="23.83" cy="23.323" r="7.271"/></g>',
	pen: '<g id="svgPen"><path d="M328.883,89.125l107.59,107.589l-272.34,272.34L56.604,361.465L328.883,89.125z M518.113,63.177l-47.981-47.981c-18.543-18.543-48.653-18.543-67.259,0l-45.961,45.961l107.59,107.59l53.611-53.611C532.495,100.753,532.495,77.559,518.113,63.177z M0.3,512.69c-1.958,8.812,5.998,16.708,14.811,14.565l119.891-29.069L27.473,390.597L0.3,512.69z"/></g>',
	picture: '<g><path d="M31.622,5.663c0-0.84-0.683-1.521-1.521-1.521H1.521C0.681,4.142,0,4.823,0,5.663v20.295C0,26.8,0.681,27.48,1.521,27.48h28.581c0.84,0,1.521-0.682,1.521-1.521V5.663L31.622,5.663z M28.559,24.417H3.062V7.153h25.497V24.417z"/><path d="M15.528,23.014h11.777V18.32c-1.656-0.56-3.481-0.887-5.451-0.887c-1.033,0-2.026,0.087-2.981,0.251v-2.911c0-0.56-0.47-1.014-1.026-1.014c-0.559,0-1.029,0.454-1.029,1.014v3.393c-0.4,0.121-0.762,0.254-1.132,0.401c-0.364-1.459-1.127-2.764-2.13-3.795v-3.258c0-0.56-0.469-1.014-1.029-1.014s-1.029,0.454-1.029,1.014v1.769c-0.853-0.456-1.857-0.757-2.861-0.87v-1.435c0-0.56-0.444-1.014-1.004-1.014s-1.004,0.454-1.004,1.014v1.464c-0.853,0.118-1.606,0.359-2.359,0.697v9.874h6.051L15.528,23.014L15.528,23.014z"/><circle cx="23.454" cy="12.073" r="3.712"/></g>',
	redo: '<g><path d="M0.358,16.978C0.148,16.934,0,16.752,0,16.542c0-7.253,8.61-8.798,10.61-9.059V4.155c0-0.164,0.09-0.314,0.235-0.393c0.147-0.076,0.321-0.065,0.456,0.024l9.202,6.194c0.121,0.082,0.194,0.218,0.194,0.369c0,0.147-0.073,0.284-0.194,0.366l-9.197,6.193c-0.137,0.09-0.313,0.1-0.457,0.023c-0.146-0.078-0.236-0.229-0.236-0.394v-3.58c-1.447,0.009-2.645,0.073-3.642,0.193c-4.785,0.567-6.064,3.44-6.116,3.563l0,0c-0.071,0.165-0.233,0.271-0.41,0.271C0.415,16.986,0.385,16.984,0.358,16.978z"/></g>',
	save: '<g><path d="M50,734h634c27.6,0,50-22.4,50-50V202c0-19.9-7.9-39-22-53L563,0h-0.2v278h-397V0H50C22.4,0,0,22.4,0,50v469v165C0,711.6,22.4,734,50,734z"/><rect x="395.7" width="106.5" height="223.9"/></g>',
	scncast: '<g><path d="m228.101,288.368c0,-0.839 -0.685,-1.526 -1.524,-1.526l-32.514,0c-0.838,0 -1.523,0.686 -1.523,1.526l0,5.127c0,0.839 -0.685,1.526 -1.523,1.526l-23.238,0c-0.838,0 -1.523,0.686 -1.523,1.526l0,6.553c0,0.840 0.685,1.526 1.523,1.526l85.086,0c0.839,0 1.524,-0.685 1.524,-1.526l0,-6.553c0,-0.839 -0.685,-1.526 -1.524,-1.526l-23.236,0c-0.839,0 -1.524,-0.686 -1.524,-1.526l-0.000,-5.127l0,0z"/><path d="m307.388,119.010l-194.138,0c-6.754,0 -12.249,5.505 -12.249,12.271l0,135.151c0,6.766 5.495,12.271 12.249,12.271l194.139,0c6.754,0 12.249,-5.505 12.249,-12.271l0,-135.150c0,-6.767 -5.495,-12.272 -12.250,-12.272zm-194.138,9.288l194.139,0c1.614,0 2.979,1.366 2.979,2.983l0,119.815l-200.097,0l0,-119.815c0,-1.617 1.364,-2.983 2.979,-2.983zm91.550,134.281c0,-3.053 2.471,-5.529 5.518,-5.529c3.048,0 5.520,2.475 5.520,5.529s-2.472,5.529 -5.520,5.529c-3.047,-0.000 -5.518,-2.476 -5.518,-5.529z"/></g>',
	setting: '<g><path d="M18.622,8.371l-0.545-1.295c0,0,1.268-2.861,1.156-2.971l-1.679-1.639c-0.116-0.113-2.978,1.193-2.978,1.193l-1.32-0.533c0,0-1.166-2.9-1.326-2.9H9.561c-0.165,0-1.244,2.906-1.244,2.906L6.999,3.667c0,0-2.922-1.242-3.034-1.131L2.289,4.177C2.173,4.29,3.507,7.093,3.507,7.093L2.962,8.386c0,0-2.962,1.141-2.962,1.295v2.322c0,0.162,2.969,1.219,2.969,1.219l0.545,1.291c0,0-1.268,2.859-1.157,2.969l1.678,1.643c0.114,0.111,2.977-1.195,2.977-1.195l1.321,0.535c0,0,1.166,2.898,1.327,2.898h2.369c0.164,0,1.244-2.906,1.244-2.906l1.322-0.535c0,0,2.916,1.242,3.029,1.133l1.678-1.641c0.117-0.115-1.22-2.916-1.22-2.916l0.544-1.293c0,0,2.963-1.143,2.963-1.299v-2.32C21.59,9.425,18.622,8.371,18.622,8.371z M14.256,10.794c0,1.867-1.553,3.387-3.461,3.387c-1.906,0-3.461-1.52-3.461-3.387s1.555-3.385,3.461-3.385C12.704,7.41,14.256,8.927,14.256,10.794z"/><g>',
	square: '<g><path d="M0,0v533.333h533.333V0H0z M500,500H33.333V33.333H500V500z"/></g>',
	stopscn:'<g><path d="m2.715,204.184l0,0c0,-111.284 89.542,-201.499 199.999,-201.499l0,0c53.044,0 103.915,21.229 141.421,59.018c37.508,37.788 58.579,89.040 58.579,142.481l0,0c0,111.285 -89.542,201.500 -200.000,201.500l0,0c-110.456,0 -199.999,-90.214 -199.999,-201.500l0,0zm322.954,90.141l0,0c44.033,-60.969 37.488,-145.153 -15.431,-198.469c-52.919,-53.316 -136.477,-59.910 -196.990,-15.546l212.422,214.016l0,0zm-245.907,-180.280c-44.034,60.968 -37.488,145.153 15.430,198.468c52.919,53.316 136.476,59.911 196.990,15.547l-212.421,-214.015l0,0z"/><path d="m228.101,288.368c0,-0.839 -0.685,-1.526 -1.524,-1.526l-32.514,0c-0.838,0 -1.523,0.686 -1.523,1.526l0,5.127c0,0.839 -0.685,1.526 -1.523,1.526l-23.238,0c-0.838,0 -1.523,0.686 -1.523,1.526l0,6.553c0,0.840 0.685,1.526 1.523,1.526l85.086,0c0.839,0 1.524,-0.685 1.524,-1.526l0,-6.553c0,-0.839 -0.685,-1.526 -1.524,-1.526l-23.236,0c-0.839,0 -1.524,-0.686 -1.524,-1.526l-0.000,-5.127l0,0z"/><path d="m307.388,119.010l-194.138,0c-6.754,0 -12.249,5.505 -12.249,12.271l0,135.151c0,6.766 5.495,12.271 12.249,12.271l194.139,0c6.754,0 12.249,-5.505 12.249,-12.271l0,-135.150c0,-6.767 -5.495,-12.272 -12.250,-12.272zm-194.138,9.288l194.139,0c1.614,0 2.979,1.366 2.979,2.983l0,119.815l-200.097,0l0,-119.815c0,-1.617 1.364,-2.983 2.979,-2.983zm91.550,134.281c0,-3.053 2.471,-5.529 5.518,-5.529c3.048,0 5.520,2.475 5.520,5.529s-2.472,5.529 -5.520,5.529c-3.047,-0.000 -5.518,-2.476 -5.518,-5.529z"/></g>',
	textinput: '<g><polygon points="21,4 1,4 1,8 9,8 9,26 13,26 13,8 21,8"/><polygon points="27,2 27,0 21,0 21,2 23,2 23,26 21,26 21,28 27,28 27,26 25,26 25,2"/></g>',
	triangle: '<g><path d="M251.093,37.38c-2.235-3.859-6.357-6.235-10.816-6.235s-8.582,2.376-10.816,6.235L1.684,430.645c-2.24,3.867-2.245,8.636-0.013,12.507s6.361,6.257,10.83,6.257h455.553c4.469,0,8.598-2.386,10.83-6.257c2.231-3.871,2.227-8.641-0.014-12.507L251.093,37.38z M34.186,424.409L240.276,68.585l206.091,355.824H34.186L34.186,424.409z"/></g>',
	undo: '<g><path d="M26.105,21.891c-0.229,0-0.439-0.131-0.529-0.346l0,0c-0.066-0.156-1.716-3.857-7.885-4.59c-1.285-0.156-2.824-0.236-4.693-0.25v4.613c0,0.213-0.115,0.406-0.304,0.508c-0.188,0.098-0.413,0.084-0.588-0.033L0.254,13.815C0.094,13.708,0,13.528,0,13.339c0-0.191,0.094-0.365,0.254-0.477l11.857-7.979c0.175-0.121,0.398-0.129,0.588-0.029c0.19,0.102,0.303,0.295,0.303,0.502v4.293c2.578,0.336,13.674,2.33,13.674,11.674c0,0.271-0.191,0.508-0.459,0.562C26.18,21.891,26.141,21.891,26.105,21.891z"/></g>',
	user: '<g id="contact"><path d="M 98.404813,84.45 C 111.92281,75.353 121.23881,57.42 121.23881,41.268 121.23781,18.48 102.76381,0 79.975813,0 c -22.789,0 -41.273,18.474 -41.273,41.269 0,16.152 9.31,34.084 22.834,43.182 -32.33,8.202 -56.2849997,36.261 -56.2849997,57.062 0,12.288 37.3539997,18.426 74.7109997,18.426 l -20.925,-20.922 17.622,-42.601 -0.183,0 -6.844,-7.854 c 3.315,1.193 6.765,1.906 10.343,1.906 3.574,0 7.018,-0.713 10.317,-1.895 l -6.838,7.837 -0.173,0 17.617997,42.6 -20.924997,20.917 c 16.151,0 74.079437,-5.84767 74.708997,-18.77927 C 154.96489,112.30443 129.79657,95.195415 98.404813,84.45 Z"/></g>',
	vchat: '<g><polygon points="12,6.287 12,9.714 16,12 16,4"/><path d="M10,4H1C0.447,4,0,4.447,0,5v6c0,0.553,0.447,1,1,1h9c0.553,0,1-0.447,1-1v-1V9.143V6.857V6V5 C11,4.448,10.553,4,10,4z"/></g>',
	zoom: '<g><path d="M352.464,302.966l-90.374-90.373c-6.689-6.69-15.414-10.097-24.182-10.238c33.904-50.513,28.561-119.733-16.045-164.339c-50.688-50.687-133.161-50.687-183.848,0c-50.688,50.687-50.688,133.161,0,183.848c44.606,44.606,113.826,49.95,164.339,16.045c0.142,8.767,3.548,17.492,10.238,24.182l90.373,90.374c13.669,13.668,35.829,13.668,49.498,0C366.132,338.795,366.132,316.634,352.464,302.966z M193.579,193.579c-35.091,35.091-92.188,35.091-127.279,0c-35.091-35.091-35.091-92.188,0-127.279c35.091-35.091,92.188-35.091,127.279,0C228.67,101.39,228.67,158.488,193.579,193.579z"/></g>',
	zoomin: '<g><path d="M136.081,83.753h-22.326V61.427c0-8.284-6.716-15-15-15s-15,6.716-15,15v22.326H61.429c-8.284,0-15,6.716-15,15s6.716,15,15,15h22.326v22.326c0,8.284,6.716,15,15,15s15-6.716,15-15v-22.326h22.326c8.284,0,15-6.716,15-15S144.365,83.753,136.081,83.753z"/><path d="M267.306,230.535l-82.772-82.772c8.465-14.758,12.976-31.536,12.976-49.009C197.508,44.175,153.343,0,98.755,0C44.177,0,0.002,44.167,0,98.754c0,75.801,82.21,123.374,147.765,85.778l82.772,82.773c10.153,10.153,26.614,10.153,36.768,0C277.459,257.151,277.459,240.688,267.306,230.535z M30,98.755C30,60.756,60.751,30,98.755,30c37.997,0,68.755,30.749,68.755,68.754c0,18.365-7.151,35.631-20.138,48.616C103.897,190.846,30,159.43,30,98.755z"/></g>',
	zoomout: '<g><path d="M136.081,83.753H61.429c-8.284,0-15,6.716-15,15c0,8.284,6.716,15,15,15h74.652c8.284,0,15-6.716,15-15C151.081,90.469,144.365,83.753,136.081,83.753z"/><path d="M267.306,230.535l-82.771-82.771c8.465-14.76,12.976-31.537,12.976-49.01C197.508,44.175,153.343,0,98.755,0C44.177,0,0.002,44.166,0,98.754c0,54.58,44.167,98.755,98.755,98.755c17.473,0,34.25-4.512,49.01-12.976l82.772,82.772c10.153,10.153,26.614,10.153,36.768,0C277.459,257.151,277.459,240.689,267.306,230.535z M30,98.755C30,60.756,60.751,30,98.755,30c37.997,0,68.755,30.75,68.755,68.754c0,37.998-30.751,68.755-68.755,68.755C60.757,167.509,30,136.759,30,98.755z"/></g>'
};
if (typeof module !== 'undefined') {
	module.exports = svgicon;
}
},{}],13:[function(require,module,exports){
var Gatherhub = require('./gatherhub');
var svgicon = require('./svgicons');
var RtcCom = require('../rtc/telecom');
// for debug use
var msp;
var mvp;
var mbmenu;

// global variables and functions
var td = 0;
var topmenu = false;
var showpop = false;
var needsync = true;
var dispatch = function(){};

$(function(){
	var peerid;
	var svr = ws1 = 'gatherhub.xyz';
	var ws2 = '192.168.10.10';
	var port = 55688;
	// init webrtc module -- media casting feature
	var rtc = new RtcCom();

	$('#clist').niceScroll();
	$('#plist').niceScroll();
	$('#msgbox').niceScroll();
	$('#pad').width($(window).width() - 55);

	function addBtnToMenu(config, toggle) {
		var btn = new Gatherhub.SvgButton(config);
		btn.pad.css('padding', '5px');
		if (toggle) btn.onclick = function(){toggleexp(toggle);};
		btn.appendto('#bgroup');
		return btn;
	}
	
	var btnUser = addBtnToMenu({tip: 'Peer List', icon: svgicon.user, iconcolor: '#448', w: 40, h: 40, borderwidth: 2, bordercolor: '#448', borderradius: 1, bgcolor: '#FFF'}, '#mlist');
	var btnMsg = addBtnToMenu({tip: 'Text Chatroom', icon: svgicon.chat, iconcolor: '#448', w: 40, h: 40, resize: .7, borderwidth: 2, bordercolor: '#448', borderradius: 1, bgcolor: '#FFF'}, '#msg');
	var btnCast = addBtnToMenu({tip: 'Speaker Control Panel', icon: svgicon.mic, iconcolor: '#448', w: 40, h: 40, borderwidth: 2, bordercolor: '#448', borderradius: 1, bgcolor: '#FFF'}, '');
	var btnVP = addBtnToMenu({tip: 'Show/Hide View-window', icon: svgicon.picture, iconcolor: '#448', w: 40, h: 40, borderwidth: 2, bordercolor: '#448', borderradius: 1, bgcolor: '#FFF'}, '');
	btnCast.onclick = function(){toggleMedArea();}
	btnVP.onclick = function(){vp.pad.toggle();sp.attachvp(vp);};
		
	var sp = msp = new Gatherhub.SketchPad();
	sp.floating('absolute').pencolor(sp.repcolor).penwidth(1).appendto('#pad');
	sp.canvas.css('opacity', 0.75);
	sp.geo = 'rect';
	var selcolor = sp.repcolor;

	var vp = mvp = new Gatherhub.VisualPad();
	vp.draggable = true;
	vp.floating('absolute').bgcolor('#FCFCFC').bordercolor('#888').borderwidth(3).borderradius(0.1);
	vp.defsize(sp.width()/4, sp.height()/4).minimize().appendto('#pad');

	sp.attachvp(vp);
	arrangemenu();
	
	function setPenColor(c) {
		selcolor = c;
		sp.pencolor(c);
		if (sp.timode) sp.tibox.css('color', c);
	}

	var w = h = parseInt($(window).height() / 24) * 2;
	var rootdir = 'v0';
	var subdir = 'h0';
	if ($(window).height() / $(window).width() > 1) {
		rootdir = 'h0';
		subdir = 'v0';
		w = h = parseInt($(window).width() / 24) * 2;
	}
	if (w < 40) w = h = 40;
	var colorpalette = [
		{btn: {w: w, h: h, icon: svgicon.cpalette, iconcolor: sp.repcolor, tip: 'Peer Color'}, act: function(){setPenColor(sp.repcolor);}},
		{btn: {w: w, h: h, icon: svgicon.cpalette, tip: 'Black'}, act: function(){setPenColor('black');}},
		{btn: {w: w, h: h, icon: svgicon.cpalette, iconcolor: 'red', tip: 'Red'}, act: function(){setPenColor('red');}},
		{btn: {w: w, h: h, icon: svgicon.cpalette, iconcolor: 'green', tip: 'Green'}, act: function(){setPenColor('green');}},
		{btn: {w: w, h: h, icon: svgicon.cpalette, iconcolor: 'blue', tip: 'Blue'}, act: function(){setPenColor('blue');}}
	];
	var pensz = [
		{btn: {w: w, h: h, icon: svgicon.brushl, resize: .45, tip: 'Thinner Paint'},	act: function(){sp.penwidth(1)}},
		{btn: {w: w, h: h, icon: svgicon.brushl, tip: 'Thicker Paint'}, act: function(){sp.penwidth(21)}},
		{btn: {w: w, h: h, icon: svgicon.brushl, resize: .65, tip: 'Regular Paint'}, act: function(){sp.penwidth(11)}}
	];
	var geoshape = [
		{btn: {w: w, h: h, icon: svgicon.square, tip: 'Rectangle'},	act: function(){sp.geo = 'rect';}},
		{btn: {w: w, h: h, icon: svgicon.line, tip: 'Line'}, act: function(){sp.geo = 'line';}},
		{btn: {w: w, h: h, icon: svgicon.circle, tip: 'Circle'}, act: function(){sp.geo = 'ellipse';}},
		{btn: {w: w, h: h, icon: svgicon.triangle, tip: 'Triangle'}, act: function(){sp.geo = 'polygon';}}
	];
	var zoomctrl = [
		{btn: {w: w, h: h, icon: svgicon.zoomin, tip: 'Zoom In'}, act: function(){sp.zoom(sp.zrate * 1.1);}},
		{btn: {w: w, h: h, icon: svgicon.fit, tip: 'Fit Content'}, act: function(){sp.fitcontent();}},
		{btn: {w: w, h: h, icon: svgicon.zoomout, tip: 'Zoom Out'},	act: function(){sp.zoom(sp.zrate / 1.1);}}
	];
	var canvasedit = [
		{btn: {w: w, h: h, icon: svgicon.download, tip: 'Save SVG'}, act: function(){saveSVG(hub);}},
		{btn: {w: w, h: h, icon: svgicon.clear, tip: 'Clear Canvas'}, act: function(){$('#cfmclr').modal('toggle');}},
		{btn: {w: w, h: h, icon: svgicon.redo, tip: 'Redo'}, act: function(){sp.redo();}},
		{btn: {w: w, h: h, icon: svgicon.undo, tip: 'Undo'}, act: function(){sp.undo();}}
	];	
	var mainBtn = [
		{btn: {w: w, h: h, icon: svgicon.setting, tip: 'Settings'},	sublist: canvasedit, direction: subdir},
		{btn: {w: w, h: h, icon: svgicon.zoom, tip: 'Zoom'}, sublist: zoomctrl, direction: subdir},
		{sublist: pensz, direction: subdir},
		{sublist: colorpalette, direction: subdir},
		{sublist: geoshape, direction: subdir}
	];
	var rootList = {rootlist: mainBtn, direction: rootdir};
	var toolBar = mbmenu = new Gatherhub.BtnMenu(rootList);
	if (topmenu) toolBar.root.css({'position': 'absolute', 'bottom': 0, 'right': 80});
	else toolBar.root.css({'position': 'absolute', 'bottom': 80, 'right': 0});
	toolBar.root.children().eq(4).hide();
	
	var actBtns = [
		{btn: {w: w, h: h, icon: svgicon.pen, iconcolor: 'white', borderwidth: 3, bordercolor: 'white', borderradius: .15, bgcolor: 'red', resize: .6, tip: 'Free Hand Writing'}, act: function(){
			sp.drag(0);
			sp.txtedit(0);
			sp.drawgeo(0);
			toolBar.collapseall();
			toolBar.root.children().show();
			toolBar.root.children().eq(4).hide();
			setPenColor(selcolor);
		}},
		{btn: {w: w, h: h, icon: svgicon.eraser, iconcolor: 'white', borderwidth: 3, bordercolor: 'white', borderradius: .15, bgcolor: 'red', resize: .6, tip: 'Eraser'}, act: function(){
			sp.drag(0);
			sp.txtedit(0);
			sp.drawgeo(0);
			sp.pencolor(sp.bgcolor());
			toolBar.collapseall();
			toolBar.root.children().hide();
			toolBar.root.children().eq(0).show();
			toolBar.root.children().eq(1).show();
		}},
		{btn: {w: w, h: h, icon: svgicon.textinput, iconcolor: 'white', borderwidth: 3, bordercolor: 'white', borderradius: .15, bgcolor: 'red', resize: .6, tip: 'Text Input'},	act: function(){
			sp.drag(0);
			sp.drawgeo(0);
			sp.txtedit(1);
			setPenColor(selcolor);
			toolBar.collapseall();
			toolBar.root.children().show();
			toolBar.root.children().eq(2).hide();
			toolBar.root.children().eq(4).hide();
		}},
		{btn: {w: w, h: h, icon: svgicon.move, iconcolor: 'white', borderwidth: 3, bordercolor: 'white', borderradius: .15, bgcolor: 'red', resize: .6, tip: 'Move Canvas'}, act: function(){
			sp.txtedit(0);
			sp.drawgeo(0);
			sp.drag(1);
			toolBar.collapseall();
			toolBar.root.children().hide();
			toolBar.root.children().eq(0).show();
			toolBar.root.children().eq(1).show();
		}},
		{btn: {w: w, h: h, icon: svgicon.geometrical, iconcolor: 'white', borderwidth: 3, bordercolor: 'white', borderradius: .15, bgcolor: 'red', resize: .6, tip: 'Draw Geometrics'}, act: function(){
			sp.drag(0);
			sp.txtedit(0);
			sp.drawgeo(1);
			setPenColor(selcolor);
			toolBar.collapseall();
			toolBar.root.children().show();
			toolBar.root.children().eq(2).hide()
		}}
	];
	var mainActBtn = [{sublist: actBtns, direction: subdir}];
	var actList = {rootlist: mainActBtn, direction: rootdir};
	var actMenu = new Gatherhub.BtnMenu(actList);
	actMenu.autocollapse = true;
	if (topmenu) actMenu.root.css({'position': 'absolute', 'bottom': 0, 'right': 5});
	else actMenu.root.css({'position': 'absolute', 'bottom': 5, 'right': 0});
	
	
	$(window).on('resize', function(){
		toolBar.collapseall();
		if (topmenu) {
			$('#msg').height($(window).height() - 55);
			$('#msgbox').height($(window).height() - parseInt($('#ts').css('height')) - 10 - (topmenu ? 55 : 0));
			$('#msgbox').scrollTop($('#msgbox')[0].scrollHeight);
			$('#pad').width($(window).width()).height($(window).height() - 55);
		}
		else {
			$('#pad').width($(window).width() - 55).height($(window).height());
		}
		sp.width($('#pad').width()).height($('#pad').height()).moveto('top', 0).moveto('left', 0).zoom(sp.zrate);
		vp.moveto('top', vp.pad.position().top).moveto('left', vp.pad.position().left);
	});
	$("#joinhub").on('shown.bs.modal', function(){
		$(this).find('#peer').focus();
	});		
	$('#peer').keyup(function(e){
		if(e.keyCode == 13){
			$('#btnok').click();
		}
	});		
	$('#btnok').on('click', function validateInput(){
		if ($('#peer').val().trim().length == 0) {
			alert('Please enter your name!');
			return false;
		}

		if ($('#cacheOn').is(':checked')) setCookie('peer', $('#peer').val());
		else setCookie('peer', '');

		peer = $('#peer').val();
		peerid = (peer + '_' + sp.gid).replace(/ /g,'');
		connect();
		$('#joinhub').modal('toggle');
		
		return true;
	});
	$('#tmsg').keyup(function(e){
		if(e.keyCode == 13){
			$('#send').click();
		}
	});		
	$('#send').on('click', function(){
		if ($('#tmsg').val().length) appendMsg('#msgbox', peerid, 'Me', $('#tmsg').val(), sp.repcolor, $.now() - td);
		$('#tmsg').val('').focus();
	});
	
	// start to connect
	if (hub.length == 0) hub = 1000;
	if (peer.length == 0) {
		if (getCookie('peer') && getCookie('peer').length > 0) {
			$('#peer').val(getCookie('peer'));
			$('#cacheOn').attr('checked', true);
		}
		$('#joinhub').modal('toggle');
	}
	else {
		peerid = (peer + '_' + sp.gid).replace(/ /g,'');
		connect();
	}	

	// implement for webrtc

	function attachMediaStream (element, stream) {
	  element.srcObject = stream;
	}

	rtc.onMyAvAdd = function(s){
		var ln,m;
		if(s.getVideoTracks().length>0){
		    ln = '<video id="localMed"  width="292" height="220" autoplay muted></video>';
			var h = parseInt($('#mediaArea').css('height'))+220;
			$('#mediaArea').css({height:h});
		}else{
		    ln = "<audio id='localMed' autoplay muted></audio>";
		}

		$('#media').append(ln);
		m = document.querySelector('#localMed');
		attachMediaStream(m,s);
	};

	function rmMyAv(){
		var hs = parseInt($('#localMed').css('height'));
		if(hs>0){
			h = parseInt($('#mediaArea').css('height')) - hs;
			$('#mediaArea').css({height:h});
		}
		$('#localMed').remove();
	}

	rtc.onFrAvAdd = function(s){
		var ln,m;
		if(s.getVideoTracks().length>0){
		    ln = '<video id="remoteMed" width="292" height="220" autoplay></video>';
			var h = parseInt($('#mediaArea').css('height'))+220;
			$('#mediaArea').css({height:h});
		}else{
		    ln = "<audio id='remoteMed' autoplay></audio>";
		}

		$('#media').append(ln);
		m = document.querySelector('#remoteMed');
		attachMediaStream(m,s);
		toggleMedArea('show');
	};

	rtc.onFrAvRm = function(){
		console.log('remote stream deleted');
		var hs = parseInt($('#remoteMed').css('height'));
		if(hs>0){
			h = parseInt($('#mediaArea').css('height')) - hs;
			$('#mediaArea').css({height:h});
		}
		$('#remoteMed').remove();
	};

	rtc.onMyScnAdd = function(s){
		var ln,m;
		ln = "<video id='localScn' autoplay muted></video>";
		$('#scnshare').append(ln);
		m = document.querySelector('#localScn');
		attachMediaStream(m,s);
		$('#pad').css({opacity:'0.4'});
	};

	function rmMyScn(){
	    $('#localScn').remove();
		$('#pad').css({opacity:'1'});
	}

	rtc.onFrScnAdd = function(s){
		var ln,m;
		ln = "<video id='remoteScn' autoplay></video>";
		$('#scnshare').append(ln);
		m = document.querySelector('#remoteScn');
		attachMediaStream(m,s);
		$('#pad').css({opacity:'0.4'});
	};

	rtc.onFrScnRm = function(){
    	$('#remoteScn').remove();
		$('#pad').css({opacity:'1'});
	};

	rtc.onReady = function(){
		console.log('rtc on Ready')
		$('#btnSpk').show();
		$('#btnVchat').show();
		if(rtc.checkExtension()){$('#btnScn').show()};
	};

	rtc.onDisconnect = function(){
		$('#btnSpk').hide();
		$('#btnVchat').hide();
		$('#btnScn').hide();
		$('#btnMute').hide();
		$('#btnMuteS').hide();
		$('#localMed').remove();
		$('#remoteMed').remove();
	    $('#localScn').remove();
    	$('#remoteScn').remove();
		$('.prstatus').remove();
	};


	function appendCList(pid,type,scn){
		var item,av,sn,icnCfg,bgcolor;
		item = $('#'+pid);
		icnCfg = {iconcolor: '#FFF', w: 32, h: 32, borderwidth: 0, type: 'flat'};
		icnCfg.bgcolor = item.css('background-color');
		item.appendTo('#clist');
		$('#ih-'+pid).remove();
		$('<div id="ih-'+pid+'" class="prstatus">').appendTo('#'+pid);
		if(type != 'none'){
			if(type == 'video'){
				icnCfg.icon = svgicon.vchat;
			}else{
				icnCfg.icon = svgicon.mic;
			}
			av = new Gatherhub.SvgButton(icnCfg);
			av.canvas.css('border-style', 'none');
			av.pad.css('cursor', 'auto');
			av.appendto('#ih-'+pid);
		}
		if(scn){
			icnCfg.icon = svgicon.scncast;
			sn = new Gatherhub.SvgButton(icnCfg);
			sn.canvas.css('border-style', 'none');
			sn.pad.css('cursor', 'auto');
			sn.appendto('#ih-'+pid);
		}
		$('#ih-'+pid).css({float: 'right', clear: ''});
		$('#ih-'+pid).children().css({float: 'right', clear: ''});

	}

	rtc.onCastList = function(list){
		$('.prstatus').remove();
		$('#clist').children().appendTo('#plist');
		$('#plist').children().sort(function(a,b){
			return $(a).attr('uname') > $(b).attr('uname');
		}).appendTo('#plist');
		list.forEach(function(it){
			appendCList(it.id,it.av,it.scn);
		});
	};


	function addBtnToList(icon,id,cfg,func){
		var config = {iconcolor: '#FFF', w: 40, h: 40, borderwidth: 2, bordercolor: '#FFF', borderradius: 1, bgcolor: sp.repcolor};
		if(cfg){for(var i in cfg){config[i]=cfg[i]};};
		config.icon = icon;
		var btn = new Gatherhub.SvgButton(config);
		btn.pad.css('padding', '5px');
		btn.pad.attr('id', id);
		if (func) btn.onclick = func;
		btn.appendto('#mbtns');
		$('#'+id).hide();
		return btn;
	}
	var btnSpk = addBtnToList(svgicon.mic, 'btnSpk',{},function(){
		if(rtc.startAVCast({oneway:true,video:false},function(){
			console.log('start talking failed');
			$('#btnMute').hide();
			$('#btnSpk').show();
			$('#btnVchat').show();
		})){
			$('#btnSpk').hide();
			$('#btnVchat').hide();
			$('#btnMute').show();
		}
	});
	var btnMute = addBtnToList(svgicon.hangup,'btnMute',{bgcolor:'red'},function(){
		$('#btnMute').hide();
		$('#btnSpk').show();
		$('#btnVchat').show();
		rtc.stopAVCast();
		rmMyAv();
	});

	var btnVchat = addBtnToList(svgicon.vchat,'btnVchat',{},function(){
		if(rtc.startAVCast({oneway:true,video:true},function(){
			console.log('start video failed');
			$('#btnMute').hide();
			$('#btnSpk').show();
			$('#btnVchat').show();
		})){
			$('#btnSpk').hide();
			$('#btnVchat').hide();
			$('#btnMute').show();
		}
	});

	var btnScn = addBtnToList(svgicon.scncast,'btnScn',{},function(){
		if(rtc.startscnCast(function(err){
			console.log('start scn share failed');
			$('#btnMuteS').hide();
			$('#btnScn').show();
			if(err.name == 'EXTENSION_UNAVAILABLE')alert('Screen sharing needs to install Chrome extension');
		})){
			$('#btnScn').hide();
			$('#btnMuteS').show();
		}
	});
	var btnMuteS = addBtnToList(svgicon.stopscn,'btnMuteS',{bgcolor:'red'},function(){
			$('#btnMuteS').hide();
			$('#btnScn').show();
			rtc.stopscnCast();
			rmMyScn();
	});

	$('#mbtns').children().css({float: 'left', clear: ''});
	$('#btnInfo').click(function(){
		$('#showrtc').modal('toggle');
	});
	function showRtcInfo(){
		if(rtc.getRtcCap(function(inf){
			$('#rtcinfo').html(inf);
			$('#showrtc').modal('toggle');
		})){
			if(rtc.checkExtension(function(inf){
				$('#rtcinfo').html(inf);
				$('#showrtc').modal('toggle');

			})){
				// to do later...
			}
		}		
	}

	function toggleMedArea(act){
		var area = '#mediaArea';
		if(act == undefined){
			if($(area).position().left == 55){
				$(area).animate({left:-300});
				console.log('hide');
			}else{
				$(area).animate({left:55});
				console.log('show');
			}
		}else{
			if(act == 'show')$(area).animate({left:55});
			if(act == 'hide')$(area).animate({left:-300});
		}
	}

	$('#btnclr').click(function(){cfmClear(1);});
	$('#btncancel').click(function(){cfmClear(0)});

	//end of implement of webrtc


	var wsready = false, pulse = null;

	function connect() {
		var ws = new WebSocket('wss://' + svr + ':' + port);
		
		rtc.dispatch = sp.dispatch = dispatch = function(data, type, dst, p, c) {
			if (wsready) {
				data.name = p || peer;
				data.color = c || sp.repcolor;
				if (dst) ws.send(JSON.stringify({hub: hub, peer: peerid, action: type, data: data, dst: dst}));
				else ws.send(JSON.stringify({hub: hub, peer: peerid, action: type, data: data}));
			}
		};
		
		ws.onerror = function(){
			console.log("Connecting failed, try alternative server!");
			if (svr == ws1) svr = ws2;
			else svr = ws1;
		};
		ws.onopen = function(){
			console.log("Connected.");
			sp.canvas.children('g').first().empty();
			$('#plist').empty();
			$('#msgbox').empty();
			wsready = showpop = true;
			dispatch({rtc:rtc.support}, 'hello');
			pulse = setInterval(function(){if (wsready) dispatch({},'heartbeat',peerid);}, 25000);
			appendUser('#plist', peerid, peer + '(Me)', sp.repcolor);
			rtc.myPeer(peerid);
			showRtcInfo();
		};
		ws.onmessage = function(msg){
			var ctx = JSON.parse(msg.data);
			var data = ctx.data;
			
			switch (ctx.action) {
				case 'hello':
					console.log(ctx.peer + ': hello!');
					appendUser('#plist', ctx.peer, data.name, data.color);
					popupMsg(data.name + ' has entered this hub.', data.color);
					dispatch({}, 'welcome', ctx.peer);
					rtc.addPeer(ctx.peer);
					break;
				case 'welcome':
					console.log(ctx.peer + ': welcome!');
					appendUser('#plist', ctx.peer, data.name, data.color);
					setTimeout(function(){
						popupMsg(data.name + ' has entered this hub.', data.color);
					}, Math.random() * 2500);
					if (needsync) {
						dispatch({}, 'syncgraph', ctx.peer);
						dispatch({}, 'syncmsg', ctx.peer);
						showpop = needsync = false;
					}
					break;
				case 'bye':
					if (ctx.peer != peerid) {
						console.log(ctx.name + ': bye!');
						popupMsg(ctx.name + ' has left this hub.', 'grey');
						$('#' + ctx.peer).remove();
						rtc.removePeer(ctx.peer);
					}
					break;
				case 'message':
					if (data.msg === undefined) {
						showpop = true;
					}
					else {
						appendMsg('#msgbox', ctx.peer, data.name, data.msg, data.color, data.tid);
						if (showpop && ($('#msg').position().top < 0 || $('#msg').position().left < 0)) {
							popupMsg(data.name + ': ' + data.msg, data.color);
						}
					}
					break;
				case 'undo':
					if ($('#' + data.id).length) $('#' + data.id).remove();
					break;
				case 'clear':
					sp.clearcanvas();
					break;
				case 'drawing':
					sp.showdrawing(data);
					break;
				case 'graph':
					sp.appendpath(data);
					break;
				case 'sync':
					td = $.now() - (data.ts * 1000);
					break;
				case 'syncgraph':
					sp.syncgraph(ctx.peer);
					break;
				case 'syncmsg':
					$('#msgbox').children().each(function() {
						var mhead = $(this).children('.panel-heading').last();
						var mbody = $(this).children('.panel-body').last();
						var pname = mhead.html().slice(0, mhead.html().length - 1);
						var color = rgb2hex(mbody.css('border-color'));
						if (pname == 'Me') pname = peer;
						dispatch({msg: mbody.html(), tid: $(this).attr('tid')}, 'message', ctx.peer, pname, color);
					});
					dispatch({}, 'message', ctx.peer);
					break;
				case 'rtc':
					rtc.hdlMsg(ctx.peer,data);
					break;
				default:
					//console.log(ctx);
					break;
			}
		};
		ws.onclose = function(){
			clearInterval(pulse);
			wsready = false;
			showpop = false;
			ws = null;
			connect();
		};
	}

});

function arrangemenu () {
	if ($(window).height() / $(window).width() > 1)  {
		$('#bgroup').children().css({float: 'left', clear: ''});
		$('#bgroup').css({height: 55, width: '100%'});
		$('#exp').children().css({left: 0, top: -$(window).height(), height: $(window).height() - 55});
		$('#pad').height($(window).height() - 55).width($(window).width()).css({top: 55, left: 0});
		msp.height(9999);
		msp.width(9999);
		mvp.moveto('top', 0);
		mvp.moveto('left', 9999);
		topmenu = true;
	}
	else {
		$('#bgroup').children().css({float: '', clear: 'left'});
		$('#bgroup').css({height: '100%', width: 55});
		$('#exp').children().css({top: 0, left: -$('#exp').children().width(), height: '100%'});
		$('#pad').height($(window).height()).width($(window).width() - 55).css({top: 0, left: 55});
		msp.height(9999);
		msp.width(9999);
		mvp.moveto('top', 0);
		mvp.moveto('left', 9999);
		topmenu = false;
	}
}

function toggleexp(exp) {
	if (topmenu) {
		if ($(exp).position().top == 55) {
			$('#tmsg').blur();
			$(exp).animate({top:  -9999});
		}
		else {
			if (parseInt($(exp).css('left')) != 0) $(exp).css({left: 0});
			$(exp).parent().children().each(function(){
				if ($(this).position().top > 0) $(this).animate({top: -9999});
				$('#tmsg').blur();
			});
			$(exp).find('#tmsg').focus();
			$(exp).animate({top: 55});
		}
	}
	else {
		if ($(exp).position().left == 55) {
			$('#tmsg').blur();
			$(exp).animate({left: -300});
		}
		else {
			if (parseInt($(exp).css('top')) != 0) $(exp).css({top: 0});
			$(exp).parent().children().each(function(){
				if ($(this).position().left > 0) $(this).animate({left: -300});
				$('#tmsg').blur();
			});
			$(exp).find('#tmsg').focus();
			$(exp).height($(window).height());
			$(exp).animate({left: 55});
		}
	}
}

function rgb2hex(rgb) {
	rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	function hex(x) {
		return ("0" + parseInt(x).toString(16)).slice(-2);
	}
	return '#' + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function popupMsg(msg, color) {
	var x = 0 | (Math.random() * $(window).width() * .5) + $(window).width() * .25;
	var y = 0 | (Math.random() * $(window).height() * .5) + $(window).height() * .25;
	var popmsg = $('<div class="panel-body" style="max-width: 300px; border-radius: 5px; margin: 5px; font-weight: bold; border-style: solid; border-color: ' + color + ';">');
	popmsg.css({position: 'absolute', top: y, left: x, opacity: 0});
	popmsg.html(msg).appendTo('body');
	popmsg.animate({opacity: 0.8, top: y - 80}, 1500);
	popmsg.animate({opacity: 0.8}, 1000);
	popmsg.animate({opacity: 0}, 1000, function(){popmsg.remove();});
}

function appendUser(elem, peerid, uname, color) {
	var ph = '<div class="panel-heading" style="text-shadow: 1px 2px #444; color: #FFF; font-weight: bold; background-color:' + color + '" id="' + peerid + '" uname="' + uname + '">';
	$(ph).html(uname).appendTo(elem);
	$(elem).children().sort(function(a,b){
		return $(a).attr('uname') > $(b).attr('uname');
	}).appendTo($(elem));
	$(elem).scrollTop($(elem)[0].scrollHeight);
}

function appendMsg(elem, pid, sender, msg, color, tid) {
	console.log(sender + '(' + tid + '): ' + msg);
	var msg = Autolinker.link(msg, {newWindo: true, stripPrefix: false});
	var lr = sender == 'Me' ? 'right' : 'left';
	var prev = $(elem).children().last();
	var prevlr = prev.length ? prev.children().last().css('float') : '';
	var pp = $('<div>'); 
	if (prevlr.length) pp.css('clear', prevlr);
	var ph = $('<div class="panel-heading" style="color: #000; margin: 0; padding: 0; text-align: ' + lr + '">');
	var pb = $('<div class="panel-body" style="float: ' + lr + '; max-width: 290px; word-break: break-all; border-radius: 5px; margin: 5px; font-weight: bold; background-color: #FFF;">');
	if (lr == 'left') pb.addClass('leftbubble');
	else pb.addClass('rightbubble');
	
	pp.attr('tid', tid).append($('<br>'));
	ph.html(sender + ':').appendTo(pp);
	pb.html(msg).appendTo(pp);
	var tgt = $(elem).children().last();
	while(tgt.attr('tid') > tid) {tgt = tgt.prev();}
	if (tgt.length) tgt.after(pp);
	else pp.appendTo(elem);


	$(elem).height($(window).height() - parseInt($('#ts').css('height')) - 10 - (topmenu ? 55 : 0));
	$(elem).scrollTop($(elem)[0].scrollHeight);
	if (sender == 'Me') dispatch({msg: $('#tmsg').val(), tid: pp.attr('tid')}, 'message');
}

function setCookie(key, value) {
	var expires = new Date();
	expires.setTime(expires.getTime() + (180 * 24 * 60 * 60 * 1000));
	document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
}

function getCookie(key) {
	var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
	return keyValue ? keyValue[2] : null;
}

function saveSVG(fname) {
	var z = msp.zrate;
	msp.fitcontent();
	var w = msp.canvas.attr('width');
	var h = msp.canvas.attr('height');
	var vbox = msp.canvas[0].getAttribute('viewBox').split(' ');
	msp.canvas.attr('width', vbox[2]);
	msp.canvas.attr('height', vbox[3]);
	msp.canvas.attr('xmlns', 'http://www.w3.org/2000/svg');
	var svgctx = $('#pad').find('svg').get(0).outerHTML;
	msp.canvas.attr('width', w);
	msp.canvas.attr('height', h);
	msp.zoom(z);
	
	var xmlhead = '<?xml version="1.0" encoding="utf-8"?>';
	var svgfile = btoa(unescape(encodeURIComponent(xmlhead+svgctx)));
	window.open('data:image/svg+xml;base64,\n' + svgfile, fname + '.svg');
}

function cfmClear(ok) {
	if (ok) {
		msp.clearall();
	}
	$('#cfmclr').modal('toggle');
}


},{"../rtc/telecom":9,"./gatherhub":11,"./svgicons":12}]},{},[13]);
