/* 
* @Author: Phenix
* @Date:   2015-11-24 11:09:55
* @Last Modified time: 2015-11-25 11:48:29
*/

/*
design note:
scenario 1:
    Process: 
        A,B,C = idle; A start talking, A stop talking ;
    Actions:
        1, A checks talking list,if no one in the talking list, the list should be empty
        2, A applies the first talking request to others
        A.send({from:A,to:ALL,cmd:'req'});
        3, A starts first timer (T1 = 100ms) to send talking request for the second time when no one response;
        4, T1 timer arrive, no one responses, A sends second talking request;
        A.send({from:A,to:ALL,cmd:'req'});
        5, A starts second timer (T2 = 200ms) to  send request for talking;
        6, T2 timer arrive, no one response, starts casting callback to active media casting;
        7, A informs all others the casting list change.
        A.send({from:A, to:ALL, cmd:'list',list:[A]});
        8, A wants to end talking
        A.send({from:A, to:ALL, cmd:'list',list:[]});


scenario 2:
    process:
        A,B,C = idle; A start casting; B require casting; A stop casting; B start casting;

    Actions:
        1, A applies talking request to others
        A.send({from:A,to:ALL,cmd:'req'});
        A.send({from:A,to:ALL,cmd:'req'});
        2, informs casting list
        A.send({from:A, to:ALL, cmd:'list',list:[A]});
        3, A is talking
        4, B wants to talk, send talking req to all others,
        B.send({from:B,to:A,cmd:'req'});
        5, A receives talking req from B, and feeds back
        A.send({from:A,to:ALL,cmd:'list',list:[A,B]});
        6, B stop timers, waits casting list change
        7, A finishes talking, sends casting list to ALL
        A.send({from:A, to:ALL, cmd:'list',list:[B,...]});
        8, B fins he is the first one in the castling list, start media casting;

scenario 3:
    process:
        A,B,C = idle, A and B start casting at the same time; one gets talking in the end the other stays in pending list
    Actions:
        1, A and B applied for casting right
        A.send({from:A,to:ALL,cmd:'req'});
        B.send({from:B,to:ALL,cmd:'req'});
        2, A received request from B, set T3 timer (2.0~3.x timeout) , A restart request;
        3, B received requst from A, set T3, A restart request
        4, A T3 timeout, send request;
        5, B received A.req, B, keep A in the pendinglist, B become silence and  wait someone send casting list;
        6, A after T1+T2 timer, do not received casting list, A send others the casting list;
        7, B received casting list; found he is still requiring casting list, he starts req again.

scenario 4:
    process:
        A = talking; B, C = idle; A lost connection, B requrie talking;
    Action:
        1, B apply tokcen: B check casting list is not empty;
        B.send({from:B, to:All, cmd='req',...})
        and start two timer to start talking;
        2, timeout, B inform the casting list
        B.send({from:B, to:ALL, cmd:'list',list:[B,...]});

scenario 5:
    process:
        A = talking; B = waiting; new peer C join into the room;
    Actions:
        1, After C setup datachannel, 
        c.send({from:C, to:ALL, cmd:'hello'});
        2, A hold token ,so he will inform C casting list;

scenario 6:
    process:
        A = talking; B,C = idle; B want to talk, before A finished, B abandon talk;
    Actions:
        1,after A talking, 
        B.send({from:B,to:All,cmd:'req'});
        2,A send casting list
        A.informCastList();
        3,B cancel talking request
        B.send({from:B, to:A, cmd:'rls'});
        4,B go to idle;
        5, A remove B from  castList
        A.informCastList(); 

 */


var assert = require("assert");
var CastCtrl = require('../js/castctrl');

var ids = [0,1,2];
var casts = [];
var a,b,c;

var _proto;
function extend(func){
        var base = function(){};
        base.prototype = func.prototype;
        return new base();
}

function MediaCast(id){
    CastCtrl.call(this,id);
    this.enRecv = true;
}

_proto = MediaCast.prototype = extend(CastCtrl);



_proto.onSend = function(s){
    var delay = Math.ceil(Math.random()*50);
    var self =this;
    console.log(this.id + ' send ', s);
    setTimeout(function(){
        var others,i;
        others = [];
        for(i=0;i<casts.length;i++){
            others[i] = casts[i];
        }
        others.splice(others.indexOf(self),1);
        others.forEach(function(p){
            if(p.enRecv)p.hdlMsg(s);
        });

    }, delay);
};

_proto.onCastList = function(s){
    this.spkList = s;
    console.log(this.id + ' speaking list is ',s);
}

_proto.disconnect = function(){
    this.enRecv = false;
}

beforeEach(function(){
    ids.forEach(function(id){
        casts[id] = new MediaCast(id);
    });
    a = casts[0];
    b = casts[1];
    c = casts[2];
});

describe('Scenario 1 and 2',function(){
    this.timeout(2000);
    it('No.1 A start talking and stop talking',function(done){
        a.start(function(){
            console.log(this.id + ' Talking ');
        });
        setTimeout(function(){
            a.stop(function(){
                console.log(this.id + ' End Talking');
            });

        },450);
        setTimeout(done,600);
    });

    it('No.2 A start talking and B require talking; A stop talking, B start talking', function(done){
        a.start(function(){
            console.log(this.id + ' Talking ');
        });
        setTimeout(function(){
            b.start(function(){
                console.log(this.id + ' Talking ');
            });
        },500);
        setTimeout(function(){
            a.stop(function(){
                console.log(this.id + ' End Talking');
            });
        },600);

        setTimeout(done,800);

    });

});

describe('Scenario 3',function(){
    this.timeout(3000);

    it('A and B want to talk at same time', function(done){
        a.start(function(){
            console.log(this.id + ' Talking ');
        });
        b.start(function(){
            console.log(this.id + ' Talking ');
        });
        setTimeout(done,2000);

    });

});

describe('Scenario 4',function(){
    this.timeout(3000);

    it('A talking, A lost connection, B require talking', function(done){
        a.start(function(){
            console.log(this.id + ' Talking ');
        });
        setTimeout(function(){
            a.disconnect();
        }, 500);
        setTimeout(function(){
            b.start(function(){
                console.log(this.id + ' Talking ');
            });
        }, 800);

        setTimeout(done,1500);

    });
    it('A talking, B pending, A lost connection, c require talking', function(done){
        a.start(function(){
            console.log(this.id + ' Talking ');
        });
        setTimeout(function(){
            b.start(function(){
                console.log(this.id + ' Talking ');
            });
        }, 500);
        setTimeout(function(){
            a.disconnect();
        }, 600);
        setTimeout(function(){
            c.start(function(){
                console.log(this.id + ' Talking ');
            });
        }, 650);

        setTimeout(done,1500);

    });


});

describe('Scenario 5',function(){
    this.timeout(3000);

    it('A talking, B waiting, c join', function(done){
        var d; 
        a.start(function(){
            console.log(this.id + ' Talking ');
        });
        setTimeout(function(){
            b.start(function(){
                console.log(this.id + ' Talking ');
            });
        }, 500);
        setTimeout(function(){
            d = casts[3] = new MediaCast(3);
            d.login();
        }, 600);
        setTimeout(done,2000);

    });

});

describe('Scenario 6',function(){
    this.timeout(3000);

    it('A talking, B waiting, B quit', function(done){
        a.start(function(){
            console.log(this.id + ' Talking ');
        });
        setTimeout(function(){
            b.start(function(){
                console.log(this.id + ' Talking ');
            });
        }, 500);
        setTimeout(function(){
            b.stop(function(){
                console.log(this.id + ' leaving ');
            });
        }, 600);
        setTimeout(done,2000);

    });

});


