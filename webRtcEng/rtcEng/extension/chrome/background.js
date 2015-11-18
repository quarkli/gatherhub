/* background page, responsible for actually choosing media */
chrome.runtime.onConnect.addListener(function (channel) {
    channel.onMessage.addListener(function (message) {
        switch(message.type) {
        case 'getScreen':
            var pending = chrome.desktopCapture.chooseDesktopMedia(message.options || ['screen', 'window'], 
                                                                   channel.sender.tab, function (streamid) {
                // communicate this string to the app so it can call getUserMedia with it
                message.type = 'gotScreen';
                message.sourceId = streamid;
                channel.postMessage(message);
            });
            // let the app know that it can cancel the timeout
            message.type = 'getScreenPending';
            message.request = pending;
            channel.postMessage(message);
            break;
        case 'cancelGetScreen':
            chrome.desktopCapture.cancelChooseDesktopMedia(message.request);
            message.type = 'canceledGetScreen';
            channel.postMessage(message);
            break;
        }
    });
});

chrome.runtime.onMessageExternal.addListener(
    function(message, sender, sendResponse) {
        console.log('fippo', navigator, navigator && navigator.userAgent, message.options);
        var options = message.options;
        if (!options) {
            // window sharing is broken on windows 10
            // https://code.google.com/p/chromium/issues/detail?id=526883
            if (navigator && navigator.userAgent.match(/Mozilla\/5.0 \(Windows NT 10.\d/)) {
                options = ['screen'];
            } else {
                options = ['screen', 'window'];
            }
        }
        switch(message.type) {
        case 'getScreen':
            var pending = chrome.desktopCapture.chooseDesktopMedia(options, sender.tab, function (streamid) {
                // communicate this string to the app so it can call getUserMedia with it
                message.type = 'gotScreen';
                message.sourceId = streamid;
                console.log('gotScn ',streamid);
                sendResponse(message);
            });
            console.log('getScreen ','pending='+pending);
            return true;
        case 'cancelGetScreen':
            chrome.desktopCapture.cancelChooseDesktopMedia(message.request);
            message.type = 'canceledGetScreen';
            sendResponse(message);
            break;
        }
        return false;
    }
);
