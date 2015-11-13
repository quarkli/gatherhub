// getScreenMedia helper by @HenrikJoreteg
// modified by phenix
// var getUserMedia = require('getusermedia');

'use strict';

// cache for constraints and callback
var cache = {};
var getUMedia = function(constraints,cb){
    getUserMedia(constraints, function (stream) {
            cb(null, stream);
        }, function (err) {
            var error;
            // coerce into an error object since FF gives us a string
            // there are only two valid names according to the spec
            // we coerce all non-denied to "constraint not satisfied".
            console.log('getUserMedia','error'+err.name);
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
                        getUMedia(constraints, callback);
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
                    getUMedia(constraints, callback);
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
            getUMedia(constraints, callback);
        } else {
            // chrome 34+ way requiring an extension
            var pending = window.setTimeout(function () {
                error = new Error('NavigatorUserMediaError');
                error.name = 'EXTENSION_UNAVAILABLE';
                return callback(error);
            }, 1000);
            cache[pending] = [callback, hasConstraints ? constraint : null];
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
            getUMedia(constraints, function (err, stream) {
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
            getUMedia(constraints, callback);
        }
    } else if (event.data.type == 'getScreenPending') {
        window.clearTimeout(event.data.id);
    }
});
