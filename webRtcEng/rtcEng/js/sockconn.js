/* 
* @Author: Phenix
* @Date:   2015-11-13 17:25:58
* @Last Modified time: 2015-11-27 16:08:52
*/

'use strict'
var io = require('socket.io-client');
var sockConnection;
(function(){
    var _proto;
    function SockConnection(config){
        this.s = io.connect(config.url);
    }
    _proto = SockConnection.prototype;
    _proto.on = function(e,fn){
        this.s.on(e,fn);
    };
    _proto.emit =  function(t,v){
        // this.s.emit.apply(this.s, arguments);
        this.s.emit(t, v);
    };
    sockConnection = SockConnection;
})();
module.exports = sockConnection;