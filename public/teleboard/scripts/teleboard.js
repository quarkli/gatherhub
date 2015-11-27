// for debug use
var msp;
var mvp;
var mbmenu;

$(function(){
	var svr = ws1 = 'minichat.gatherhub.com';
	var ws2 = '192.168.11.123';
	var port = 55688;
	var dispatch = function(){};

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
	
	var btnUser = addBtnToMenu({icon: svgicon.user, w: 40, h: 40, borderradius: 1, bgcolor: '#CCC'}, '#plist');
	var btnMsg = addBtnToMenu({icon: svgicon.chat, w: 40, h: 40, resize: .7, borderradius: 1, bgcolor: '#CCC'}, '#msg');
	var btnSpk = addBtnToMenu({icon: svgicon.mic, w: 40, h: 40, borderradius: 1, bgcolor: '#CCC'}, '');
	
	var sp = msp = new Gatherhub.SketchPad();
	sp.floating('absolute').pencolor(sp.repcolor).appendto('#pad');
	sp.canvas.css('opacity', 0.75);	
	sp.pad.on('mouseenter', function(){$(this).css('cursor', 'crosshair');});

	var vp = mvp = new Gatherhub.VisualPad().moveto('left', 9999);
	vp.draggable = true;
	vp.floating('absolute').bgcolor('#FFF').bordercolor('#888').borderwidth(3);
	vp.defsize(sp.width()/4, sp.height()/4).minimize().appendto('#pad');

	sp.attachvp(vp);

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
		{btn: {w: w, h: h, icon: svgicon.circle, resize: 0.15, tip: 'Small (5px)'},	act: function(){sp.penwidth(5)}},
		{btn: {w: w, h: h, icon: svgicon.circle, resize: 0.05, tip: 'Tiny (1px)'}, act: function(){sp.penwidth(1)}},
		{btn: {w: w, h: h, icon: svgicon.circle, resize: 0.35, tip: 'Midium (11px)'}, act: function(){sp.penwidth(11)}},
		{btn: {w: w, h: h, icon: svgicon.circle, resize: 0.65, tip: 'Large (21px)'}, act: function(){sp.penwidth(21)}}	
	];
	var zoomList = [
		{btn: {w: w, h: h, icon: svgicon.zoomout, tip: 'Zoom Out'},	act: function(){sp.zoom(sp.zrate / 1.1);}},
		{btn: {w: w, h: h, icon: svgicon.fit, tip: 'Fit Content'}, act: function(){sp.fitcontent();}},
		{btn: {w: w, h: h, icon: svgicon.zoomin, tip: 'Zoom In'}, act: function(){sp.zoom(sp.zrate * 1.1);}}
	];
	var settingList = [
		{btn: {w: w, h: h, icon: svgicon.clear, tip: 'Clear Canvas'}, act: function(){sp.undoall();}},
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
		$('#msgbox').height($(window).height() - parseInt($('#ts').css('height')) - 10);
		$('#pad').width($(window).width() - 55);
		vp.defsize(sp.width()/4, sp.height()/4).minimize();
		sp.width(sp.width()).height(sp.width()).maximize().zoom(sp.zoom());
		toolBar.collapseall();
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
		//sp.gid = peer;
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
		if ($('#tmsg').val().length) {
			dispatch({msg: $('#tmsg').val()}, 'message');
			appendMsg('#msgbox', 'Me', $('#tmsg').val(), sp.repcolor);
		}
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
		//sp.gid = peer;
		connect();
	}	

	function connect() {
		var wsready = false, pulse = null;
		var peerid = (peer + '_' + sp.gid).replace(/ /g,'');
		var ws = new WebSocket('ws://' + svr + ':' + port);
		
		sp.dispatch = dispatch = function(data, type, dst) {
			if (wsready) {
				data.name = peer;
				data.color = sp.repcolor;
				if (dst) ws.send(JSON.stringify({hub: hub, peer: peerid, action: type, data: data, dst: dst}));
				else ws.send(JSON.stringify({hub: hub, peer: peerid, action: type, data: data}));
			}
		};
		
		ws.onerror = function(){
			console.log("Message Router Connecting Error!");
			if (svr == ws1) svr = ws2;
			else svr = ws1;
			connect();
		};
		ws.onopen = function(){
			console.log("Message Router Connected.");
			wsready = true;
			dispatch({}, 'hello');
			pulse = setInterval(function(){
				if (wsready) ws.send('');
				else ws = new WebSocket('ws://' + svr + ':' + port);
			}, 30000);
			appendUser('#plist', peerid, peer, sp.repcolor);
		};
		ws.onmessage = function(msg){
			var ctx = JSON.parse(msg.data);
			var data = ctx.data;
			
			switch (ctx.action) {
				case 'hello':
					console.log(ctx.peer + ': hello!');
					appendUser('#plist', ctx.peer, data.name, data.color);
					dispatch({}, 'welcome', ctx.peer);
					//self.undoall();
					//self.redoall();
					break;
				case 'welcome':
					console.log(ctx.peer + ': welcome!');
					appendUser('#plist', ctx.peer, data.name, data.color);
					break;
				case 'bye':
					console.log(ctx.peer + ': bye!');
					$('#plist').children().each(function(){
						if ($(this).attr('id') == ctx.peer) $(this).remove();
					});
					break;
				case 'message':
					console.log(ctx.peer + ': ' + data.msg);
					appendMsg('#msgbox', data.name, data.msg, data.color);
					break;
				case 'undo':
					//$('#' + data.pid).remove();
					//flush(self);
					break;
				case 'clear':
					//self.clearcanvas();
					//flush(self);
					break;
				case 'drawing':
					sp.showdrawing(data);
					break;
				case 'graph':
					sp.appendpath(data);
					break;
			}
		};
		ws.onclose = function(){
			clearInterval(pulse);
			wsready = false;
		};
	}

});

function toggleexp(exp) {
	if ($(exp).position().left == 55) {
		$(exp).animate({left: -250});
	}
	else {
		$(exp).parent().children().each(function(){
			$(this).animate({left: -250});
		});
		$(exp).animate({left: 55});
	}
}

function rgb2hex(rgb) {
	rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	function hex(x) {
		return ("0" + parseInt(x).toString(16)).slice(-2);
	}
	return '#' + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function appendUser(elem, peerid, uname, color) {
	var d1 = '<div class="panel-body" style="background-color:' + color + '" id="' + peerid + '">';
	var s1 = '<span style="margin: 10px; font-weight: bold;">';
	$(s1).html(uname).appendTo($(d1).appendTo(elem));
	$(elem).scrollTop($(elem)[0].scrollHeight);
}

function appendMsg(elem, sender, msg, color) {
	var lr = sender == 'Me' ? 'right' : 'left';
	var d1 = '<div class="panel-body" style="background-color: ' + color + '; text-align: ' + lr + ';">'; 
	var s1 = '<span style="font-size: 10px; color: #333">';
	var s2 = '<span style="font-weight: bold;">';

	color = color.toLowerCase();
	if (color[0] == '#' && color.length == 4) color = color.slice(0,2) + color.slice(1,3) + color.slice(2,4) + color[3];
	if ($(elem).children().last().hasClass('panel-body') && rgb2hex($(elem).children().last().css('background-color')) == color) {
		$(elem).children().last().append($('<br>'));
		$(elem).children().last().append($(s2).html(msg));
	}
	else {
		var d = $(d1).appendTo(elem);
		$(s1).html(sender + ':').appendTo(d);
		$('<br>').appendTo(d);
		$(s2).html(msg).appendTo(d);
	}

	$(elem).height($(window).height() - parseInt($('#ts').css('height')) - 10);
	$(elem).scrollTop($(elem)[0].scrollHeight);
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
