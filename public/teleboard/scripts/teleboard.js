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
	var svr = ws1 = 'minichat.gatherhub.com';
	var ws2 = '192.168.11.123';
	var port = 55688;

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
	
	var btnUser = addBtnToMenu({icon: svgicon.user, iconcolor: '#FFF', w: 40, h: 40, borderwidth: 2, bordercolor: '#FFF', borderradius: 1, bgcolor: '#448'}, '#plist');
	var btnMsg = addBtnToMenu({icon: svgicon.chat, iconcolor: '#FFF', w: 40, h: 40, resize: .7, borderwidth: 2, bordercolor: '#FFF', borderradius: 1, bgcolor: '#448'}, '#msg');
	var btnSpk = addBtnToMenu({icon: svgicon.mic, iconcolor: '#FFF', w: 40, h: 40, borderwidth: 2, bordercolor: '#FFF', borderradius: 1, bgcolor: '#448'}, '#media');
	
	var sp = msp = new Gatherhub.SketchPad();
	sp.floating('absolute').pencolor(sp.repcolor).penwidth(1).appendto('#pad');
	sp.canvas.css('opacity', 0.75);	
	sp.pad.on('mouseenter', function(){$(this).css('cursor', 'crosshair');});

	var vp = mvp = new Gatherhub.VisualPad().moveto('left', 9999);
	vp.draggable = true;
	vp.floating('absolute').bgcolor('#FFF').bordercolor('#888').borderwidth(3);
	vp.defsize(sp.width()/4, sp.height()/4).minimize().appendto('#pad');

	sp.attachvp(vp);
	arrangemenu();

	var w = h = parseInt($(window).height() / 24) * 2;
	var rootdir = 'v0';
	var subdir = 'h0';
	if ($(window).height() / $(window).width() > 1) {
		rootdir = 'h0';
		subdir = 'v0';
		w = h = parseInt($(window).width() / 24) * 2;
	}
	if (w < 40) w = h = 40;
	var penList = [
		{btn: {w: w, h: h, icon: svgicon.pen, iconcolor: sp.repcolor, tip: 'User Pen'}, act: function(){sp.dragmode = false;sp.pencolor(sp.repcolor);}},
		{btn: {w: w, h: h, icon: svgicon.pen, tip: 'Black Pen'}, act: function(){sp.dragmode = false;sp.pencolor('black');}},
		{btn: {w: w, h: h, icon: svgicon.pen, iconcolor: 'red', tip: 'Red Pen'}, act: function(){sp.dragmode = false;sp.pencolor('red');}},
		{btn: {w: w, h: h, icon: svgicon.pen, iconcolor: 'green', tip: 'Green Pen'}, act: function(){sp.dragmode = false;sp.pencolor('green');}},
		{btn: {w: w, h: h, icon: svgicon.pen, iconcolor: 'blue', tip: 'Blue Pen'}, act: function(){sp.dragmode = false;sp.pencolor('blue');}},
		{btn: {w: w, h: h, icon: svgicon.eraser, tip: 'Eraser'}, act: function(){sp.dragmode = false;;sp.pencolor(sp.bgcolor());}},
		{btn: {w: w, h: h, icon: svgicon.move, tip: 'Move Canvas'}, act: function(){sp.dragmode = true;}}
	];
	var sizeList = [
		{btn: {w: w, h: h, icon: svgicon.circle, resize: 0.15, tip: 'Small (1px)'},	act: function(){sp.penwidth(1)}},
		{btn: {w: w, h: h, icon: svgicon.circle, resize: 0.45, tip: 'Midium (11px)'}, act: function(){sp.penwidth(11)}},
		{btn: {w: w, h: h, icon: svgicon.circle, resize: 0.65, tip: 'Large (21px)'}, act: function(){sp.penwidth(21)}}	
	];
	var zoomList = [
		{btn: {w: w, h: h, icon: svgicon.zoomout, tip: 'Zoom Out'},	act: function(){sp.zoom(sp.zrate / 1.1);}},
		{btn: {w: w, h: h, icon: svgicon.fit, tip: 'Fit Content'}, act: function(){sp.fitcontent();}},
		{btn: {w: w, h: h, icon: svgicon.zoomin, tip: 'Zoom In'}, act: function(){sp.zoom(sp.zrate * 1.1);}}
	];
	var settingList = [
		{btn: {w: w, h: h, icon: svgicon.clear, tip: 'Clear Canvas'}, act: function(){
			if (confirm('This will clear everything on the whiteboard of all peers. Are you sure?')) sp.clearall();
		}},
		{btn: {w: w, h: h, icon: svgicon.redo, tip: 'Redo'}, act: function(){sp.redo();}},
		{btn: {w: w, h: h, icon: svgicon.undo, tip: 'Undo'}, act: function(){sp.undo();}}
	];	
	var mainBtn = [
		{sublist: penList, direction: subdir},
		{sublist: sizeList, direction: subdir},
		{btn: {w: w, h: h, icon: svgicon.zoom, tip: 'Zoom'}, sublist: zoomList, direction: subdir},
		{btn: {w: w, h: h, icon: svgicon.setting, tip: 'Settings'},	sublist: settingList, direction: subdir}
	];
	var rootList = {rootlist: mainBtn, direction: rootdir};
	var toolBar = mbmenu = new Gatherhub.BtnMenu(rootList);
	toolBar.root.css({'position': 'absolute', 'bottom': 0, 'right': 0});

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

	function connect() {
		var wsready = false, pulse = null;
		var ws = new WebSocket('ws://' + svr + ':' + port);
		
		sp.dispatch = dispatch = function(data, type, dst, p, c) {
			if (wsready) {
				data.name = p || peer;
				data.color = c || sp.repcolor;
				if (dst) ws.send(JSON.stringify({hub: hub, peer: peerid, action: type, data: data, dst: dst}));
				else ws.send(JSON.stringify({hub: hub, peer: peerid, action: type, data: data}));
			}
		};
		
		ws.onerror = function(){
			console.log("Message Router Connecting Error!");
			if (svr == ws1) svr = ws2;
			else svr = ws1;
		};
		ws.onopen = function(){
			console.log("Message Router Connected.");
			wsready = true;
			dispatch({}, 'hello');
			pulse = setInterval(function(){if (wsready) dispatch({},'heartbeat',peerid);}, 25000);
			appendUser('#plist', peerid, peer + '(Me)', sp.repcolor);
			showpop = true;
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
						setTimeout(function(){showpop = true;}, 30000);
					}
					break;
				case 'bye':
					console.log(ctx.name + ': bye!');
					popupMsg(ctx.name + ' has left this hub.', 'grey');
					$('#plist').children().each(function(){
						if ($(this).attr('id') == ctx.peer) $(this).remove();
					});
					break;
				case 'message':
					appendMsg('#msgbox', ctx.peer, data.name, data.msg, data.color, data.tid);
					if (showpop && ($('#msg').position().top < 0 || $('#msg').position().left < 0)) {
						popupMsg(data.name + ': ' + data.msg, data.color);
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
						var color = rgb2hex(mbody.css('background-color'));
						if (pname == 'Me') pname = peer;
						dispatch({msg: mbody.html(), tid: $(this).attr('tid')}, 'message', ctx.peer, pname, color);
					});
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
	var lr = sender == 'Me' ? 'right' : 'left';
	var prev = $(elem).children().last();
	var prevlr = prev.length ? prev.children().last().css('float') : '';
	var pp = $('<div class="tmsg_' + pid + '" style="clear: ' + prevlr + '">'); 
	var ph = $('<div class="panel-heading" style="color: #000; margin: 0; padding: 0; text-align: ' + lr + '">');
	var pb = $('<div class="panel-body" style="float: ' + lr + '; max-width: 290px; word-break: break-all; border-radius: 5px; margin: 5px; font-weight: bold; background-color: #FFF; border-width: 2px; border-style: solid; border-color: ' + color + ';">');
	
	pp.attr('tid', tid);
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
