'use strict';

// SVG Section
var wMargin = 5;
var hMargin = 5;
var drawpadWidth = window.innerWidth - wMargin;
var drawpadHeight = window.innerHeight - hMargin;
var drawpadVBoxX = 0, drawpadVBoxY = 0;
var drawpadVBoxW = drawpadWidth;
var drawpadVBoxH = drawpadHeight;
var penColor = 'black', penWidth = 5, penShape = 'round';

var $pathsCache = $(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
var curPath = -1;
var visdivTap = false, taskVisdiv;
var vispadVBoxX = 0, vispadVBoxY = 0, vispadVBoxW = 160, vispadVBoxH = 90;
var drawpad, visdiv, vispad;

// Mouse and Touch Section
var startX = 0, startY = 0;
var cursorDiff = 0;  // Do not change this value
var bBtnLeft=false, bBtnMiddle=false, bBtnRight=false, bUseRBtnEraser = false;
var touchDist = 0, touchDistDelta = 0, pinchDelta = 60;
var touchFingerAdjustX = 14, touchFingerAdjustY = 24;
var touchPenAdjustX = 11, touchPenAdjustY = 11;
var touchAdjustX = touchPenAdjustX, touchAdjustY = touchPenAdjustY;
var touchCursorAdjustX = 0, touchCursorAdjustY = 45;  // Do not change these values
var touchCursor, curImg;
var holdDrawing =  false;
var falseTouch = false;

// WebSocket Section
var svraddr = 'minichat.gatherhub.com';
var hubid = 0 | Math.random() * 10000000;
var peername = 'Peer-' + (0 | Math.random() * 1000);
var bWsReady = false;
var taskKeepAlive = keepAlive();
var ws;

var bLog = true; // Set 'true' to turn on log message;
var popStartX = window.innerWidth - 250;
var popStartY = window.innerHeight - hMargin;

$(function(){
	drawpad = document.getElementById('sketchCanvas');
	visdiv = document.getElementById('visualBoard');
	vispad = document.getElementById('visualCanvas');
	touchCursor = document.getElementById('touchCursor');
	curImg = document.getElementById('curImg');

	drawpad.onmousedown = drawpadMouseDownHdl;
	drawpad.onmousemove = drawpadMouseMoveHdl;
	drawpad.onmouseup = drawpadMouseUpHdl;
	drawpad.onmouseenter = setDrawpadCursor;
	drawpad.onmouseleave = drawpadLostFocus;
	drawpad.onwheel = drawpadMouseWheelHdl;
	drawpad.oncontextmenu = function(){return false;};
	drawpad.addEventListener('touchstart', drawpadTouchStartHdl);
	drawpad.addEventListener('touchend', drawpadLostFocus);
	drawpad.addEventListener('touchmove', drawpadTouchMoveHdl);

	visdiv.onwheel = visdivWheelHdl;
	visdiv.onmousedown = visdivDblTapHdl;
	visdiv.addEventListener('touchstart', visdivDblTapHdl);
	setVisdivWH(160, 90);
	setVispadViewbox(vispadVBoxX, vispadVBoxY, vispadVBoxW, vispadVBoxH);
	setPenColor(penColor);
	setPenWidth(penWidth);
		
	window.onresize = resetDrawpad;
	window.onbeforeunload  = function(){if (bWsReady) ws.close(); drawpad.style.cursor = 'auto';};
	$('#txtMsg').keypress(function(e){
		if (e.which == 13) sendMsg();
	});
	$('#hubInfo').keyup(function(e){
		if (e.which == 13) $('#btnOK').click();
		if (e.which == 27) connectSvr('cancel');
	});
	$('#btnDisconn').hide();
	$('#msgSect').hide();
	resetDrawpad();
});

function precision(num, p) {
	return Math.round(num * Math.pow(10,p)) / Math.pow(10,p);
}

function getProperStyleAttr(attr){
    var root=document.documentElement;
    if ('-webkit-' + attr in root.style) return '-webkit-' + attr;
    if ('-khtml-' + attr in root.style) return '-khtml-' + attr;
    if ('-moz-' + attr in root.style) return '-moz-' + attr;
    if ('-ms-' + attr in root.style) return '-ms-' + attr;
    if ('-o-' + attr in root.style) return '-o-' + attr;
    if (attr in root.style) return attr;
}

function showDebug(msg){
	if (bLog) console.log(msg);
}

function keepAlive(){
	if (bWsReady) {
		return setInterval(function(){if (bWsReady) ws.send('');}, 30000);
	}
	return null;
}

function connectSvr(opt){
	if (opt == 'disconn') {
		ws.close();
		$('#btnDisconn').hide();
		$('#btnConn').show();
	}
	else if (opt == 'set') {
		$('#hubInfo').show();
		$('#svrAddr').val(svraddr);
		$('#hubId').val(hubid);
		$('#peerName').val(peername);
		$('#svrAddr').focus();
		$('#svrAddr').select();
	}
	else if (opt == 'go') {
		svraddr = $('#svrAddr').val();
		hubid = $('#hubId').val();
		peername = $('#peerName').val();

		ws = new WebSocket('ws://' + svraddr + ':55688');
		ws.onopen = function(){
			ws.send(JSON.stringify({id: hubid, name: peername, action: 'connect'}));
			bWsReady = true;
			taskKeepAlive = keepAlive();
			$('#btnDisconn').show();
			$('#btnConn').hide();
			$('#msgHead').html(peername + '@' + hubid + ':');
			$('#msgSect').show();
			hMargin = $('#toolbar').outerHeight();
			setDrawpadWH(window.innerWidth - wMargin, window.innerHeight - hMargin);
			$('#toolbar').css('top', window.innerHeight - hMargin + 'px');
		};
		ws.onmessage = function(msg){
			if (msg.data.match('path')){
				var ctx = JSON.parse(msg.data);
				if (ctx.id == hubid && ctx.name != peername){
					if (ctx.ops && ctx.ops == 'clear') {		
						clearDrawpad('');
						showDebug('Remote clear');
					}
					else {
						showDebug('>> ' + ctx.name + ' drawing:');
						showDebug('<path stroke="' + ctx.stroke + '" stroke-width="' + ctx.strokeWidth + '"\n stroke-linecap="' + ctx.strokeLinecap + '" fill="' + ctx.fill + '"\n d="' + ctx.d + '"/>');
						var $node = $(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
						$node.attr('stroke-width', ctx.strokeWidth);
						$node.attr('stroke', ctx.stroke);
						$node.attr('stroke-linecap', ctx.strokeLinecap);
						$node.attr('fill', ctx.fill);
						$node.attr('d', ctx.d);
						$('#paths').append($node);
						$('#btnUndo').attr('disabled', false);
						clearPathsCache();
						updateVispad();
					}
				}
			}
			else {
				popupMsg(msg.data);
				showDebug(msg.data);
			}
		};
		ws.onclose = function(){
			showDebug('Connection closed!');
			clearInterval(taskKeepAlive);
			bWsReady = false;
			$('#btnDisconn').hide();
			$('#btnConn').show();
			$('#msgSect').hide();
			hMargin = $('#toolbar').outerHeight();
			setDrawpadWH(window.innerWidth - wMargin, window.innerHeight - hMargin);
			$('#toolbar').css('top', window.innerHeight - hMargin + 'px');
		};
	}
}

function popupMsg(msg) {
	var tmpid = (0 | Math.random() * 10000);
	var divid = '#' + tmpid;
	var tmpAry = msg.split(' says : ');
	var dur = msg.length < 10 ? 2000 : msg.length / 3 * 1000;
	var nodeDiv = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
	var nodeSpan = document.createElementNS('http://www.w3.org/1999/xhtml', 'span');

	if ($('.chatbox').length == 0 || (popStartY - nodeDiv.offsetHeight) < 40) {
		popStartX = window.innerWidth - 250;
		popStartY = window.innerHeight - hMargin;
	}

	nodeDiv.setAttribute('class', 'chatbox');
	nodeDiv.setAttribute('id', tmpid);
	$('body').append(nodeDiv);

	if (tmpAry.length > 1) {
		if (tmpAry[0] == peername) nodeDiv.style['background'] = '#CCC';
		msg = tmpAry[0] + ':<br>' + tmpAry[1]
	}

	nodeSpan.innerHTML = msg;
	$(divid).append(nodeSpan);
	$(divid).css('top', popStartY);
	$(divid).css('left', popStartX);
	$(divid).css('opacity', 0);
	popStartY -= nodeDiv.offsetHeight;
	$(divid).animate({opacity: 0.8, top: popStartY}, 1000);
	$(divid).animate({opacity: 0.8}, dur);
	$(divid).animate({opacity: 0}, 1000, function(){$(divid).remove();});
}

function sendMsg() {
	if (bWsReady && $('#txtMsg').val().length > 0) {
		ws.send(JSON.stringify({id: hubid, name: peername, action: 'say', data: $('#txtMsg').val()}));
		$('#txtMsg').val('');
		$('#txtMsg').focus();
	}
}

function clearPathsCache() {
	while ($pathsCache.children().length > 0) $pathsCache.children().last().remove();
	$('#btnRedo').attr('disabled', true);
}

function resetDrawpad(){
	hMargin = $('#toolbar').outerHeight();
	setDrawpadWH(window.innerWidth - wMargin, window.innerHeight - hMargin);
	setDrawpadViewbox(0, 0, drawpadWidth, drawpadHeight);
	popStartX = window.innerWidth - 250;
	popStartY = window.innerHeight - hMargin;
	$('#toolbar').css('top', window.innerHeight - hMargin + 'px');
}

function clearDrawpad(msg){
	while (undo()) {};
	clearPathsCache();
	resetDrawpad();
	if (bWsReady && msg == 'ops') ws.send(JSON.stringify({id: hubid, name: peername, action: 'path', ops: 'clear'}));
}

function undo(){
	if ($('#paths').children('path').length > 0){
		$pathsCache.append($('#paths').children('path').last());
		$('#btnRedo').attr('disabled', false);
		if ($('#paths').children().length == 0) $('#btnUndo').attr('disabled', true);
		updateVispad();
		return true;
	}
	return false;
}

function redo(){
	if ($pathsCache.children('path').length > 0) {
		$('#paths').append($pathsCache.children('path').last());
		$('#btnUndo').attr('disabled', false);
		if ($pathsCache.children('path').length == 0) $('#btnRedo').attr('disabled', true);
		updateVispad();
	}
}

function setPenColor(c){
	penColor = c;

	$('#toolbar button').slice(0, 5).css('background', '');
	switch (c) {
		case 'black':
			$('#toolbar button:nth-child(1)').css('background', '#BBB');
			break;
		case 'red':
			$('#toolbar button:nth-child(2)').css('background', '#BBB');
			break;
		case 'green':
			$('#toolbar button:nth-child(3)').css('background', '#BBB');
			break;
		case 'blue':
			$('#toolbar button:nth-child(4)').css('background', '#BBB');
			break;
		case 'white':
			$('#toolbar button:nth-child(5)').css('background', '#BBB');
			break;
	}
	showDebug('Pen-color=' + c);
}

function setPenWidth(w){
	penWidth = w;

	$('#toolbar button').slice(5, 9).css('background', '');
	switch (w) {
		case 1:
			$('#toolbar button:nth-child(6)').css('background', '#BBB');
			break;
		case 5:
			$('#toolbar button:nth-child(7)').css('background', '#BBB');
			break;
		case 9:
			$('#toolbar button:nth-child(8)').css('background', '#BBB');
			break;
		case 21:
			$('#toolbar button:nth-child(9)').css('background', '#BBB');
			break;
	}
	showDebug('Pen-width=' + w);
}

function setPenShape(s){
	penShape = s;
	showDebug('Pen-shape=' + s);
}

function setVisdivWH(w, h){
	w = precision(w, 3);
	h = precision(h, 3);
	$('#visualBoard').css('width', w + 'px');
	$('#visualBoard').css('height', h + 'px');
	vispad.setAttribute('width', w);
	vispad.setAttribute('height', h);

	$('#vispadSizeH').css('top', parseInt($('#visualBoard').css('top')) + $('#vispadSizeH').html().length * 2 + 'px');
	$('#vispadSizeH').css('left', parseInt($('#visualBoard').css('width')) - parseInt($('#vispadSizeH').css('font-size')) - 12 + 'px');
	$('#vispadSizeW').css('top', parseInt($('#visualBoard').css('height')) - parseInt($('#vispadSizeW').css('font-size')) - 4 + 'px');
	$('#vispadSizeW').css('left', parseInt($('#visualBoard').css('left')) - 1 + 'px');
	showDebug('vispad width=' + w + ' height=' + h);
}

function setVispadViewbox(x, y, w, h){
	vispadVBoxX = precision(x, 3);
	vispadVBoxY = precision(y, 3);
	vispadVBoxW = precision(w, 3);
	vispadVBoxH = precision(h, 3);
	vispad.setAttribute('viewBox', vispadVBoxX + ' ' + vispadVBoxY + ' ' + vispadVBoxW + ' ' + vispadVBoxH);
	showDebug('vispad viewBox=' + vispad.getAttribute('viewBox'));
}

function updateVispad() {
	var needUpdate = false;
	var px = precision($('#paths')[0].getBBox().x, 3);
	var py = precision($('#paths')[0].getBBox().y, 3);
	var pw = precision($('#paths')[0].getBBox().width, 3);
	var ph = precision($('#paths')[0].getBBox().height, 3);

	if (px != vispadVBoxX) {
		vispadVBoxX = px;
		needUpdate = true;
	}
	if (py != vispadVBoxY) {
		vispadVBoxY = py;
		needUpdate = true;
	}
	if (needUpdate || pw != vispadVBoxW || ph != vispadVBoxH) {
		var scale = Math.ceil(pw / 16) > Math.ceil(ph / 9) ? Math.ceil(pw / 16) : Math.ceil(ph / 9);
		vispadVBoxW = scale * 16;
		vispadVBoxH = scale * 9;
		setVispadViewbox(vispadVBoxX, vispadVBoxY, vispadVBoxW, vispadVBoxH);
		$('#vispadSizeH').html(vispadVBoxH);
		$('#vispadSizeW').html(vispadVBoxW);
		$('#vispadSizeH').css('top', parseInt($('#visualBoard').css('top')) + $('#vispadSizeH').html().length * 2 + 'px');
		$('#vispadSizeH').css('left', parseInt($('#visualBoard').css('width')) - parseInt($('#vispadSizeH').css('font-size')) - $('#vispadSizeH').html().length * 3 + 'px');
		$('#vispadSizeW').css('top', parseInt($('#visualBoard').css('height')) - parseInt($('#vispadSizeW').css('font-size')) - 2 + 'px');
		$('#vispadSizeW').css('left', parseInt($('#visualBoard').css('left')) - 1 + 'px');
		$('#vispadSizeH').show();
		$('#vispadSizeW').show();
	}
}

function setDrawpadWH(w, h){
	drawpadWidth = precision(w, 3);
	drawpadHeight = precision(h - 10, 3);
	drawpad.setAttribute('width', drawpadWidth);
	drawpad.setAttribute('height', drawpadHeight);
	showDebug('drawpad width=' + drawpadWidth + ' height=' + drawpadHeight);
}

function setDrawpadViewbox(x, y, w, h){
	drawpadVBoxX = precision(x, 3);
	drawpadVBoxY = precision(y, 3);
	drawpadVBoxW = precision(w, 3);
	drawpadVBoxH = precision(h, 3);
	drawpad.setAttribute('viewBox', drawpadVBoxX + ' ' + drawpadVBoxY + ' ' + drawpadVBoxW + ' ' + drawpadVBoxH);
	showDebug('drawpad viewBox=' + drawpad.getAttribute('viewBox'));
}

function setDrawpadCursor(){
	drawpad.style.cursor = 'url(marker_' + penColor + (penColor != 'white' && penShape == 'round' ? '_round' : '') + '_' + penWidth + '.png), auto';
	if (bBtnMiddle || (bBtnLeft && bBtnRight)) drawpad.style.cursor = 'url(hand.png), auto';
	if (bUseRBtnEraser) drawpad.style.cursor = 'url(marker_white_' + penWidth + '.png), auto';
}

function drawpadSizeup(t){
	var r = (1 / 16);
	if (t){
		drawpadVBoxX += (drawpadVBoxW * r / 2);
		drawpadVBoxY += (drawpadVBoxH * r / 2);
		drawpadVBoxW /= (1 + r);
		drawpadVBoxH /= (1 + r);
	}
	else{
		drawpadVBoxX -= (drawpadVBoxW * r / 2);
		drawpadVBoxY -= (drawpadVBoxH * r / 2);
		drawpadVBoxW *= (1 + r);
		drawpadVBoxH *= (1 + r);
	}
	setDrawpadViewbox(drawpadVBoxX, drawpadVBoxY, drawpadVBoxW, drawpadVBoxH);
}

function drawpadShift(x, y){
	drawpadVBoxX += (startX - x);
	drawpadVBoxY += (startY - y);
	startX = x;
	startY = y;
	setDrawpadViewbox(drawpadVBoxX, drawpadVBoxY, drawpadVBoxW, drawpadVBoxH);
}

function visdivWheelHdl(e) {
	e.preventDefault();
	var w = parseInt(vispad.getAttribute('width'));
	var h = parseInt(vispad.getAttribute('height'));
	var wheelDelta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);

	if (wheelDelta < 0){
		w -= 80;
		h -= 45;
		if (w < 160 ) {
			w = 160;
			h = 90;
		}
	}
	else {
		w += 80;
		h += 45;
		if (w > window.innerWidth - 10) {
			w = window.innerWidth - 10;
			h = precision(w / 16 * 9, 3);
		}
		if (h > window.innerHeight - hMargin - 10) {
			h = window.innerHeight - hMargin - 10;
			w = precision(h / 9 * 16, 3);
		}
	}
	setVisdivWH(w, h);
}

function visdivDblTapHdl(e) {
	e.preventDefault();
	if (visdivTap) {
		var w = window.innerWidth - 10, h = precision(w / 16 * 9, 3);
		if (w / 16 * 9 > window.innerHeight - hMargin - 10) {
			h = window.innerHeight - hMargin - 10;
			w = precision(h / 9 * 16, 3);
		}
		if (parseInt($('#visualBoard').css('width')) != w && parseInt($('#visualBoard').css('height')) != h) setVisdivWH(w, h);
		else setVisdivWH(160, 90);
		visdivTap = false;
	}
	else {
		visdivTap = true;
		taskVisdiv = setTimeout(function(){visdivTap = false;}, 400);
	}
}

function drawpadMouseDownHdl(e){
	e.preventDefault();
	if (e.button==0) bBtnLeft = true;
	if (e.button==1) bBtnMiddle = true;
	if (e.button==2) bBtnRight = true;
	startX = precision(e.pageX - cursorDiff, 3);
	startY = precision(e.pageY - cursorDiff, 3);

	if (!bBtnLeft && !bBtnMiddle && bBtnRight) {
		bUseRBtnEraser = true;
	}
	else {
		bUseRBtnEraser = false;
	}

	setDrawpadCursor();
	if ((bBtnLeft && !bBtnMiddle && !bBtnRight) || (!bBtnLeft && !bBtnMiddle && bBtnRight)) {
		drawStart(startX, startY);
	}
}

function drawpadMouseMoveHdl(e){
	e.preventDefault();
	if (bBtnMiddle || (bBtnLeft && bBtnRight)) {
		drawpadShift(precision(e.pageX, 3), precision(e.pageY, 3));
	}
	else {
		drawPath(precision(e.pageX - cursorDiff, 3), precision(e.pageY - cursorDiff, 3));
	}
}

function drawpadMouseUpHdl(e) {
	if (e.button==0) bBtnLeft = false;
	if (e.button==1) bBtnMiddle = false;
	if (e.button==2) bBtnRight = false;

	e.preventDefault();
	if (curPath >= 0) drawEnd();
	if (!bBtnLeft && !bBtnMiddle && bBtnRight) {
		bUseRBtnEraser = true;
	}
	else {
		bUseRBtnEraser = false;
	}
	setDrawpadCursor();
}

function drawpadLostFocus(e) {
	e.preventDefault();
	bBtnLeft = bBtnMiddle = bBtnRight = false;
	touchDist = touchDistDelta = 0;
	if (curPath >= 0) drawEnd();
	drawpad.style.cursor = 'auto';
	touchCursor.style.display = 'none';
	drawpadTouchStartHdl(e);
	setTimeout(function(){holdDrawing = false;}, 200);
}

function drawpadMouseWheelHdl(e){
	e.preventDefault();
	var wheelDelta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);
	if ((bBtnLeft && !bBtnMiddle && !bBtnRight) || (!bBtnLeft && !bBtnMiddle && bBtnRight)) {
		if (wheelDelta < 0){
			if (parseInt(penWidth) < 9) penWidth = parseInt(penWidth) + 4;
			else penWidth = 21;
		}
		else {
			if (parseInt(penWidth) == 21) penWidth = 9;
			else if (parseInt(penWidth) != 1) penWidth = parseInt(penWidth) - 4;
		}
		setDrawpadCursor();
		if (curPath >= 0) drawEnd();
		if ((bBtnLeft && !bBtnMiddle && !bBtnRight) || (!bBtnLeft && !bBtnMiddle && bBtnRight)) {
			startX = precision(e.pageX, 3);
			startY = precision(e.pageY, 3);
			drawStart(startX, startY);
		}
	}
	else {
		if (wheelDelta > 0){
			drawpad.style.cursor = 'url(magnifier_plus.png), auto';
			drawpadSizeup(true);
		}
		else {
			drawpad.style.cursor = 'url(magnifier_minus.png), auto';
			drawpadSizeup(false);
		}
	}
}

function drawpadTouchStartHdl(e){
	e.preventDefault();
	$('#txtMsg').blur();
	
	if (e.touches){
		var t = e.touches;
		var t0_x = (t[0] && t[0].pageX) ? t[0].pageX - touchAdjustX : 0;
		var t0_y = (t[0] && t[0].pageY) ? t[0].pageY - touchAdjustY : 0;

		if (t.length == 3) {
			if (curPath >= 0) drawEnd();
			curImg.src = 'hand.png';
			curImg.style[getProperStyleAttr('transform')] = 'rotate(0deg)';
			touchCursor.style.display = 'block';
			touchCursor.style.top = t0_y - touchCursorAdjustY + 'px';
			touchCursor.style.left = t0_x - touchCursorAdjustX + 'px';
			holdDrawing = true;
		}
		else if (t.length == 2){
			if (curPath >= 0) drawEnd();
			curImg.src = 'magnifier_null.png';
			curImg.style[getProperStyleAttr('transform')] = 'rotate(0deg)';
			touchCursor.style.top = drawpadHeight / 2 + 'px';
			touchCursor.style.left = drawpadWidth / 2 + 'px';
			touchCursor.style.display = 'block';
			touchDist = Math.pow(t0_x - t[1].pageX, 2) + Math.pow(t0_y -t[1].pageY, 2);
			holdDrawing = true;
		}
		else if (t.length == 1 && !holdDrawing) {
			startX = t0_x;
			startY = t0_y;
			if (curPath < 0 &&  t.length == 1) {
				bBtnLeft = true;
				curImg.src = 'marker_' + penColor + (penColor != 'white' && penShape == 'round' ? '_round' : '') + '_' + penWidth + '.png';
				curImg.style[getProperStyleAttr('transform')] = 'rotate(270deg)';
				touchCursor.style.top = t0_y - touchCursorAdjustY + 'px';
				touchCursor.style.left = t0_x - touchCursorAdjustX + 'px';
				touchCursor.style.display = 'block';
				drawStart(startX, startY);
				falseTouch = true;
				setTimeout(function(){falseTouch=false;}, 5);
			}
		}
	}
}

function drawpadTouchMoveHdl(e){
	e.preventDefault();
	if (e.touches){
		var t = e.touches;
		var t0_x = (t[0] && t[0].pageX) ? t[0].pageX - touchAdjustX : 0;
		var t0_y = (t[0] && t[0].pageY) ? t[0].pageY - touchAdjustY : 0;

		if (t.length == 1) {
			bBtnLeft = true;
			touchCursor.style.top = t0_y - touchCursorAdjustY + 'px';
			touchCursor.style.left = t0_x - touchCursorAdjustX + 'px';
			drawPath(t0_x, t0_y);
		}
		else if (t.length == 2){
			if (curPath >= 0) drawEnd();
			var tmpDist = Math.pow(t0_x - t[1].pageX, 2) + Math.pow(t0_y - t[1].pageY, 2);
			touchDistDelta += (tmpDist - touchDist);
			touchDist = tmpDist;
			if (touchDistDelta > Math.pow(pinchDelta, 2)){
				curImg.src = 'magnifier_plus.png';
				drawpadSizeup(true);
				touchDistDelta = 0;
			}
			if (touchDistDelta < -Math.pow(pinchDelta, 2)){
				curImg.src = 'magnifier_minus.png';
				drawpadSizeup(false);
				touchDistDelta = 0;
			}
			touchCursor.style.display = 'block';
		}
		else if (t.length == 3){
			if (curPath >= 0) drawEnd();
			touchCursor.style.top = t0_y - touchCursorAdjustY + 'px';
			touchCursor.style.left = t0_x - touchCursorAdjustX + 'px';
			drawpadShift(t0_x, t0_y);
		}
	}
}

function drawStart(x, y){
	x = precision(x * drawpadVBoxW / drawpadWidth + drawpadVBoxX, 3);
	y = precision(y * drawpadVBoxH / drawpadHeight + drawpadVBoxY, 3);

	var $node =  $(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
	$node.attr('stroke-width', penWidth);
	$node.attr('stroke-linecap', penShape);
	(bUseRBtnEraser) ? $node.attr('stroke', 'white') : $node.attr('stroke', penColor);
	$node.attr('fill', 'none');
	$node.attr('d', 'M' + x + ',' + y);

	$('#paths').append($node);
	clearPathsCache();
	curPath = $('#paths').children('path').length - 1;
}

function drawPath(x, y){
	if (curPath >= 0) {
		x = precision(x * drawpadVBoxW / drawpadWidth + drawpadVBoxX, 3);
		y = precision(y * drawpadVBoxH / drawpadHeight + drawpadVBoxY, 3);
		$('#paths').children('path').eq(curPath).attr('d', $('#paths').children('path').eq(curPath).attr('d') + 'L' + x + ',' + y);
	}
}

function drawEnd(){
	if (curPath >=0) {
		var $node = $('#paths').children('path').eq(curPath);
		var move = $node.attr('d').split('L').length;
		curPath = -1;
		
		if (move < 2 || (falseTouch && move < 3)) {
			$('#paths').children('path').eq(curPath).remove();
			return;
		}
		
		updateVispad();
		$('#btnUndo').attr('disabled', false);

		if (bWsReady) {
			ws.send(
				JSON.stringify(
					{
						id: hubid,
						name: peername,
						action: 'path',
						stroke: $node.attr('stroke'),
						strokeWidth: $node.attr('stroke-width'),
						strokeLinecap: $node.attr('stroke-linecap'),
						fill: $node.attr('fill'),
						d: $node.attr('d')
					}
				)
			);
		}
	}
}