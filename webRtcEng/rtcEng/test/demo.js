var assert = require("assert");

var t1;
function startTimer(){
    t1 = setTimeout(function(){
        console.log('t1 timeout');
    },400);
}

describe('Timer test', function(){
    this.timeout(5000);

    it('test timer', function(done){
        startTimer();
        setTimeout(function(){
            console.log('timer ',t1);
            clearTimeout(t1);
        },200);
        setTimeout(done,800);
    })
  
});
