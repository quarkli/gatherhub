// for debug use
var msp;
var mvp;
var mbmenu;

// global variables and functions
var td = 0;
var topmenu = false;
var showpop = false;
var needsync = true;
var dispatch = function() {};

$(function() {
    var peerid;
    var svr = ws1 = 'minichat.gatherhub.com';
    var ws2 = '192.168.11.123';
    var port = 55688;

    $('#plist').niceScroll();
    $('#msgbox').niceScroll();
    $('#pad').width($(window).width() - 55);

    function addBtnToMenu(config, toggle) {
        var btn = new Gatherhub.SvgButton(config);
        btn.pad.css('padding', '5px');
        if (toggle) btn.onclick = function() {
            toggleexp(toggle);
        };
        btn.appendto('#bgroup');
        return btn;
    }

    var btnUser = addBtnToMenu({
        tip: 'Peer List',
        icon: svgicon.user,
        iconcolor: '#448',
        w: 40,
        h: 40,
        borderwidth: 2,
        bordercolor: '#448',
        borderradius: 1,
        bgcolor: '#FFF'
    }, '#plist');
    var btnMsg = addBtnToMenu({
        tip: 'Text Chatroom',
        icon: svgicon.chat,
        iconcolor: '#448',
        w: 40,
        h: 40,
        resize: .7,
        borderwidth: 2,
        bordercolor: '#448',
        borderradius: 1,
        bgcolor: '#FFF'
    }, '#msg');

    var sp = msp = new Gatherhub.SketchPad();
    sp.floating('absolute').pencolor(sp.repcolor).penwidth(1).appendto('#pad');
    sp.canvas.css('opacity', 0.75);
    sp.geo = 'rect';
    var selcolor = sp.repcolor;

    var vp = mvp = new Gatherhub.VisualPad();
    vp.zmax = 1000000;
    vp.zmin = 1 / vp.zmax;
    vp.draggable = true;
    vp.floating('absolute').bgcolor('#FAFAFC').bordercolor('#888').borderwidth(3).borderradius(0.1);
    if (sp.width() * 1 > sp.height()) vp.defsize(sp.width() / 4, sp.width() / 4 * 9 / 16);
    else vp.defsize(sp.height() / 4, sp.height() / 4 * 9 / 16);
    vp.minimize().appendto('#pad');

    var vpbtn = {
        tip: 'Full Scope Viewing Window',
        icon: svgicon.picture,
        iconcolor: '#FFF',
        w: 50,
        h: 50,
        borderwidth: 0,
        borderradius: 1,
        bgcolor: '#CCC'
    };

    var vpon = new Gatherhub.SvgButton(vpbtn);
    vpon.floating('absolute').appendto('body')
    vpon.pad.css({top: 10, right: 10, left: '', 'border-radius': 50, 'box-shadow': '2px 3px 6px #888'}).toggle();
    vpon.pad.off('mousedown touchstart mousewheel DOMMouseScroll mouseup mouseleave touchend mousemove touchmove');
    vpon.pad.on('click', function() {
        vp.pad.toggle();
        sp.attachvp(vp);
        vpon.pad.toggle();
    });

    var clsbtn = {
        tip: 'Close',
        icon: svgicon.no,
        iconcolor: '#CCC',
        w: 40,
        h: 40,
        borderwidth: 0,
        bgcolor: 'transparent'
    };

    var vpoff = new Gatherhub.SvgButton(clsbtn);
    vpoff.floating('absolute').appendto(vp.pad);
    vpoff.pad.css({top: 0, right: 0, left: ''});
    vpoff.pad.off('mousedown touchstart mousewheel DOMMouseScroll mouseup mouseleave touchend mousemove touchmove');
    vpoff.pad.on('click touchend', function() {
        vp.pad.toggle();
        sp.attachvp(vp);
        vpon.pad.toggle();
    });

    sp.attachvp(vp);
    arrangemenu();

    function setPenColor(c) {
        selcolor = c;
        sp.pencolor(c);
        if (sp.mode == 'text') sp.tibox.css('color', c);
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
    var colorpalette = [{
        btn: {
            w: w,
            h: h,
            icon: svgicon.cpalette,
            iconcolor: sp.repcolor,
            tip: 'Peer Color'
        },
        act: function() {
            setPenColor(sp.repcolor);
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.cpalette,
            tip: 'Black'
        },
        act: function() {
            setPenColor('black');
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.cpalette,
            iconcolor: 'red',
            tip: 'Red'
        },
        act: function() {
            setPenColor('red');
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.cpalette,
            iconcolor: 'green',
            tip: 'Green'
        },
        act: function() {
            setPenColor('green');
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.cpalette,
            iconcolor: 'blue',
            tip: 'Blue'
        },
        act: function() {
            setPenColor('blue');
        }
    }];
    var pensz = [{
        btn: {
            w: w,
            h: h,
            icon: svgicon.brushl,
            resize: .45,
            tip: 'Thinner Paint'
        },
        act: function() {
            sp.penwidth(1)
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.brushl,
            tip: 'Thicker Paint'
        },
        act: function() {
            sp.penwidth(21)
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.brushl,
            resize: .65,
            tip: 'Regular Paint'
        },
        act: function() {
            sp.penwidth(11)
        }
    }];
    var geoshape = [{
        btn: {
            w: w,
            h: h,
            icon: svgicon.square,
            tip: 'Rectangle'
        },
        act: function() {
            sp.geo = 'rect';
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.line,
            tip: 'Line'
        },
        act: function() {
            sp.geo = 'line';
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.circle,
            tip: 'Circle'
        },
        act: function() {
            sp.geo = 'ellipse';
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.triangle,
            tip: 'Triangle'
        },
        act: function() {
            sp.geo = 'polygon';
        }
    }];
    var defratio = '<text x="0" y="0" style="font-size: 24px; fill: black;">1:1</text>';
    var zoomctrl = [{
        btn: {
            w: w,
            h: h,
            icon: defratio,
            tip: 'Default Ratio'
        },
        act: function() {
            sp.zoom(1);
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.fit,
            tip: 'Fit Content'
        },
        act: function() {
            sp.fitcontent();
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.zoomout,
            tip: 'Zoom Out'
        },
        act: function() {
            sp.zoom(sp.zrate / 1.1);
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.zoomin,
            tip: 'Zoom In'
        },
        act: function() {
            sp.zoom(sp.zrate * 1.1);
        }
    }];
    var canvasedit = [{
        btn: {
            w: w,
            h: h,
            icon: svgicon.download,
            tip: 'Save SVG'
        },
        act: function() {
            saveSVG(hub);
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.clear,
            tip: 'Clear Canvas'
        },
        act: function() {
            $('#cfmclr').modal('toggle');
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.undo,
            tip: 'Undo'
        },
        act: function() {
            sp.undo();
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.redo,
            tip: 'Redo'
        },
        act: function() {
            sp.redo();
        }
    }];
    var mainBtn = [{
        btn: {
            w: w,
            h: h,
            icon: svgicon.setting,
            tip: 'Settings'
        },
        sublist: canvasedit,
        direction: subdir
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.zoom,
            tip: 'Zoom'
        },
        sublist: zoomctrl,
        direction: subdir
    }, {
        sublist: pensz,
        direction: subdir
    }, {
        sublist: colorpalette,
        direction: subdir
    }, {
        sublist: geoshape,
        direction: subdir
    }];
    var rootList = {
        rootlist: mainBtn,
        direction: rootdir
    };
    var toolBar = mbmenu = new Gatherhub.BtnMenu(rootList);
    if (topmenu) toolBar.root.css({
        'position': 'absolute',
        'bottom': 0,
        'right': 80
    });
    else toolBar.root.css({
        'position': 'absolute',
        'bottom': 80,
        'right': 0
    });
    toolBar.root.children().eq(4).hide();

    var actBtns = [{
        btn: {
            w: w,
            h: h,
            icon: svgicon.pen,
            iconcolor: 'white',
            borderwidth: 3,
            bordercolor: 'white',
            borderradius: .15,
            bgcolor: 'red',
            resize: .6,
            tip: 'Free Hand Writing'
        },
        act: function() {
            sp.setmode('draw');
            toolBar.collapseall();
            toolBar.root.children().show();
            toolBar.root.children().eq(4).hide();
            setPenColor(selcolor);
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.cut,
            iconcolor: 'white',
            borderwidth: 3,
            bordercolor: 'white',
            borderradius: .15,
            bgcolor: 'red',
            resize: 1,
            tip: 'Cut Stroke'
        },
        act: function() {
            sp.setmode('cut');
            toolBar.collapseall();
            toolBar.root.children().hide();
            toolBar.root.children().eq(0).show();
            toolBar.root.children().eq(1).show();
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.eraser,
            iconcolor: 'white',
            borderwidth: 3,
            bordercolor: 'white',
            borderradius: .15,
            bgcolor: 'red',
            resize: .6,
            tip: 'Eraser'
        },
        act: function() {
            sp.setmode('draw');
            sp.pencolor(sp.bgcolor());
            toolBar.collapseall();
            toolBar.root.children().hide();
            toolBar.root.children().eq(0).show();
            toolBar.root.children().eq(1).show();
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.textinput,
            iconcolor: 'white',
            borderwidth: 3,
            bordercolor: 'white',
            borderradius: .15,
            bgcolor: 'red',
            resize: .6,
            tip: 'Text Input'
        },
        act: function() {
            sp.setmode('text');
            setPenColor(selcolor);
            toolBar.collapseall();
            toolBar.root.children().show();
            toolBar.root.children().eq(2).hide();
            toolBar.root.children().eq(4).hide();
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.move,
            iconcolor: 'white',
            borderwidth: 3,
            bordercolor: 'white',
            borderradius: .15,
            bgcolor: 'red',
            resize: .6,
            tip: 'Move Canvas'
        },
        act: function() {
            sp.setmode('drag');
            toolBar.collapseall();
            toolBar.root.children().hide();
            toolBar.root.children().eq(0).show();
            toolBar.root.children().eq(1).show();
        }
    }, {
        btn: {
            w: w,
            h: h,
            icon: svgicon.geometrical,
            iconcolor: 'white',
            borderwidth: 3,
            bordercolor: 'white',
            borderradius: .15,
            bgcolor: 'red',
            resize: .6,
            tip: 'Draw Geometrics'
        },
        act: function() {
            sp.setmode('geo');
            setPenColor(selcolor);
            toolBar.collapseall();
            toolBar.root.children().show();
            toolBar.root.children().eq(2).hide()
        }
    }];
    var mainActBtn = [{
        sublist: actBtns,
        direction: subdir
    }];
    var actList = {
        rootlist: mainActBtn,
        direction: rootdir
    };
    var actMenu = new Gatherhub.BtnMenu(actList);
    actMenu.autocollapse = true;
    if (topmenu) actMenu.root.css({
        'position': 'absolute',
        'bottom': 0,
        'right': 5
    });
    else actMenu.root.css({
        'position': 'absolute',
        'bottom': 5,
        'right': 0
    });

    if (topmenu) vpon.pad.css('top', 65);

    $(window).on('resize', function() {
        toolBar.collapseall();
        if (topmenu) {
            $('#msg').height($(window).height() - 55);
            $('#msgbox').height($(window).height() - parseInt($('#ts').css('height')) - 10 - (topmenu ? 55 : 0));
            $('#msgbox').scrollTop($('#msgbox')[0].scrollHeight);
            $('#pad').width($(window).width()).height($(window).height() - 55);
        } else {
            $('#pad').width($(window).width() - 55).height($(window).height());
        }
        sp.width($('#pad').width()).height($('#pad').height()).moveto('top', 0).moveto('left', 0).zoom(sp.zrate);
        vp.moveto('top', vp.pad.position().top).moveto('left', vp.pad.position().left);
    });
    $("#joinhub").on('shown.bs.modal', function() {
        $(this).find('#peer').focus();
    });
    $('#peer').keyup(function(e) {
        if (e.keyCode == 13) {
            $('#btnok').click();
        }
    });
    $('#btnok').on('click', function validateInput() {
        if ($('#peer').val().trim().length == 0) {
            alert('Please enter your name!');
            return false;
        }

        if ($('#cacheOn').is(':checked')) setCookie('peer', $('#peer').val());
        else setCookie('peer', '');

        peer = $('#peer').val();
        peerid = (peer + '_' + sp.gid).replace(/ /g, '');
        connect();
        $('#joinhub').modal('toggle');

        return true;
    });
    $('#tmsg').keyup(function(e) {
        if (e.keyCode == 13) {
            $('#send').click();
        }
    });
    $('#send').on('click', function() {
        if ($('#tmsg').val().length) appendMsg('#msgbox', peerid, 'Me', $('#tmsg').val(), sp.repcolor, $.now() - td);
        $('#tmsg').val('').focus();
    });

    if (hub.length == 0) hub = 1000;
    if (peer.length == 0) {
        if (getCookie('peer') && getCookie('peer').length > 0) {
            $('#peer').val(getCookie('peer'));
            $('#cacheOn').attr('checked', true);
        }
        $('#joinhub').modal('toggle');
    } else {
        peerid = (peer + '_' + sp.gid).replace(/ /g, '');
        connect();
    }

    var wsready = false,
        pulse = null;

    function connect() {
        var ws = new WebSocket('ws://' + svr + ':' + port);

        sp.dispatch = dispatch = function(data, type, dst, p, c) {
            if (wsready) {
                data.name = p || peer;
                data.color = c || sp.repcolor;
                if (dst) ws.send(JSON.stringify({
                    hub: hub,
                    peer: peerid,
                    action: type,
                    data: data,
                    dst: dst
                }));
                else ws.send(JSON.stringify({
                    hub: hub,
                    peer: peerid,
                    action: type,
                    data: data
                }));
            }
        };

        ws.onerror = function() {
            console.log("Connecting failed, try alternative server!");
            if (svr == ws1) svr = ws2;
            else svr = ws1;
        };
        ws.onopen = function() {
            console.log("Connected.");
            wsready = showpop = true;
            dispatch({}, 'hello');
            pulse = setInterval(function() {
                if (wsready) dispatch({}, 'heartbeat', peerid);
            }, 25000);
            appendUser('#plist', peerid, peer + '(Me)', sp.repcolor);
        };
        ws.onmessage = function(msg) {
            var ctx = JSON.parse(msg.data);
            var data = ctx.data;

            if ($('#plist').children('#' + ctx.peer).length == 0 && ctx.action != 'bye') {
                appendUser('#plist', ctx.peer, data.name, data.color);
                dispatch({}, 'welcome', ctx.peer);
            }

            switch (ctx.action) {
                case 'hello':
                    console.log(ctx.peer + ': hello!');
                    popupMsg(data.name + ' has entered this hub.', data.color);
                    dispatch({}, 'welcome', ctx.peer);
                    break;
                case 'welcome':
                    console.log(ctx.peer + ': welcome!');
                    appendUser('#plist', ctx.peer, data.name, data.color);
                    setTimeout(function() {
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
                    }
                    break;
                case 'message':
                    if (data.msg === undefined) {
                        showpop = true;
                    } else {
                        if (ctx.peer == peerid) data.name = 'Me';
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
                        var pname = mhead.html().slice(0, mhead.html().length - 1).replace('(Me)', '');
                        var color = rgb2hex(mbody.css('border-color'));
                        if (pname == 'Me') pname = peer;
                        dispatch({
                            msg: mbody.html(),
                            tid: $(this).attr('tid')
                        }, 'message', ctx.peer, pname, color);
                    });
                    dispatch({}, 'message', ctx.peer);
                    break;
                default:
                    //console.log(ctx);
                    break;
            }
        };
        ws.onclose = function() {
            clearInterval(pulse);
            wsready = false;
            showpop = false;
            needsync = true;
            ws = null;
            connect();
        };
    }

});

function arrangemenu() {
    if ($(window).height() / $(window).width() > 1) {
        $('#bgroup').children().css({
            float: 'left',
            clear: ''
        });
        $('#bgroup').css({
            height: 55,
            width: '100%'
        });
        $('#exp').children().css({
            left: 0,
            top: -$(window).height(),
            height: $(window).height() - 55
        });
        $('#pad').height($(window).height() - 55).width($(window).width()).css({
            top: 55,
            left: 0
        });
        msp.height(9999);
        msp.width(9999);
        mvp.moveto('top', 0);
        mvp.moveto('left', 9999);
        topmenu = true;
    } else {
        $('#bgroup').children().css({
            float: '',
            clear: 'left'
        });
        $('#bgroup').css({
            height: '100%',
            width: 55
        });
        $('#exp').children().css({
            top: 0,
            left: -$('#exp').children().width(),
            height: '100%'
        });
        $('#pad').height($(window).height()).width($(window).width() - 55).css({
            top: 0,
            left: 55
        });
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
            $(exp).animate({
                top: -9999
            });
        } else {
            if (parseInt($(exp).css('left')) != 0) $(exp).css({
                left: 0
            });
            $(exp).parent().children().each(function() {
                if ($(this).position().top > 0) $(this).animate({
                    top: -9999
                });
                $('#tmsg').blur();
            });
            $(exp).find('#tmsg').focus();
            $(exp).animate({
                top: 55
            });
        }
    } else {
        if ($(exp).position().left == 55) {
            $('#tmsg').blur();
            $(exp).animate({
                left: -300
            });
        } else {
            if (parseInt($(exp).css('top')) != 0) $(exp).css({
                top: 0
            });
            $(exp).parent().children().each(function() {
                if ($(this).position().left > 0) $(this).animate({
                    left: -300
                });
                $('#tmsg').blur();
            });
            $(exp).find('#tmsg').focus();
            $(exp).height($(window).height());
            $(exp).animate({
                left: 55
            });
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
    popmsg.css({
        position: 'absolute',
        top: y,
        left: x,
        opacity: 0
    });
    popmsg.html(msg).appendTo('body');
    popmsg.animate({
        opacity: 0.8,
        top: y - 80
    }, 1500);
    popmsg.animate({
        opacity: 0.8
    }, 1000);
    popmsg.animate({
        opacity: 0
    }, 1000, function() {
        popmsg.remove();
    });
}

function appendUser(elem, peerid, uname, color) {
    if ($('#' + peerid).length) return;
    var ph = '<div class="panel-heading" style="text-shadow: 1px 2px #444; color: #FFF; font-weight: bold; background-color:' + color + '" id="' + peerid + '" uname="' + uname + '">';
    $(ph).html(uname).appendTo(elem);
    $(elem).children().sort(function(a, b) {
        return $(a).attr('uname') > $(b).attr('uname');
    }).appendTo($(elem));
    $(elem).scrollTop($(elem)[0].scrollHeight);
}

function appendMsg(elem, pid, sender, msg, color, tid) {
    console.log(sender + '(' + tid + '): ' + msg);
    if ($('#msgbox').children().filter(function() {
            return $(this).attr('tid') == tid;
        }).length) return;
    var msg = Autolinker.link(msg, {
        newWindo: true,
        stripPrefix: false
    });
    var lr = 'left';
    var bcolor = '#AFA';
    if (sender == 'Me') {
        lr = 'right';
        bcolor = '#AAF';
    }
    var prev = $(elem).children().last();
    var prevlr = prev.length ? prev.children().last().css('float') : '';
    var pp = $('<div>');
    if (prevlr.length) pp.css('clear', prevlr);
    var ph = $('<div class="panel-heading" style="color: #000; margin: 0; padding: 0; text-align: ' + lr + '">');
    var pb = $('<div class="panel-body" style="float: ' + lr + '; max-width: 80%; word-break: break-all; border-radius: 5px; border-color: ' + bcolor + '; margin: 5px; background-color: ' + bcolor + ';">');
    if (lr == 'left') pb.addClass('leftbubble');
    else pb.addClass('rightbubble');

    pp.attr('tid', tid).append($('<br>'));
    ph.html((sender == 'Me' ? peer + '(Me)' : sender) + ':').appendTo(pp);
    pb.html(msg).appendTo(pp);
    var tgt = $(elem).children().last();
    while (tgt.attr('tid') > tid) {
        tgt = tgt.prev();
    }
    if (tgt.length) tgt.after(pp);
    else pp.appendTo(elem);


    $(elem).height($(window).height() - parseInt($('#ts').css('height')) - 10 - (topmenu ? 55 : 0));
    $(elem).scrollTop($(elem)[0].scrollHeight);
    if (sender == 'Me') dispatch({
        msg: $('#tmsg').val(),
        tid: pp.attr('tid')
    }, 'message');
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
    var svgfile = btoa(unescape(encodeURIComponent(xmlhead + svgctx)));
    window.open('data:image/svg+xml;base64,\n' + svgfile, fname + '.svg');
}

function cfmClear(ok) {
    if (ok) {
        msp.clearall();
    }
    $('#cfmclr').modal('toggle');
}
