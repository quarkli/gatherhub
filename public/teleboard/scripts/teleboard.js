var msp; // for debug use

$(function(){
	var sp = msp = new Gatherhub.SketchPad();
	sp.floating('absolute').pencolor(sp.repcolor).appendto('body');
	sp.canvas.css('opacity', 0.75);	
	sp.pad.on('mouseenter', function(){$(this).css('cursor', 'crosshair');});

	var vp = new Gatherhub.VisualPad();
	vp.draggable = true;
	vp.floating('absolute').bgcolor('#FFF').bordercolor('#888').borderwidth(3);
	vp.defsize(sp.width()/4, sp.height()/4).minimize().appendto('body');

	sp.attachvp(vp);
	sp.altsvr = '192.168.11.123';

	if (hub.length > 0) sp.hubid = hub;

	if (peer.length == 0) {
		if (getCookie('peer') && getCookie('peer').length > 0) {
			$('#peer').val(getCookie('peer'));
			$('#cacheOn').attr('checked', true);
		}
		$('#joinhub').modal('toggle');
	}
	else {
		sp.peername = peer;
		sp.connect('minichat.gatherhub.com', 55688);
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
	
	var toolBar = new Gatherhub.BtnMenu(rootList);
	toolBar.root.css({'position': 'absolute', 'bottom': 7, 'right': 6});

	window.onresize = function(){
		vp.defsize(sp.width()/4, sp.height()/4).minimize();
		sp.width(sp.width()).height(sp.width()).maximize().zoom(sp.zoom());
		toolBar.collapseall();
	};
});

function setCookie(key, value) {
	var expires = new Date();
	expires.setTime(expires.getTime() + (180 * 24 * 60 * 60 * 1000));
	document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
}

function getCookie(key) {
	var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
	return keyValue ? keyValue[2] : null;
}

function validateInput(){
	if ($('#peer').val().trim().length == 0) {
		alert('Please enter your name!');
		return false;
	}

	if ($('#cacheOn').is(':checked')) setCookie('peer', $('#peer').val());
	else setCookie('peer', '');

	peer = $('#peer').val();
	msp.peername = peer;
	msp.connect('minichat.gatherhub.com', 55688);
	$('#joinhub').modal('toggle');
	
	return true;
}
