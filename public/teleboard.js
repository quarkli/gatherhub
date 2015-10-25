/*
gatherhub.teleboard.js is distributed under the permissive MIT License:

Copyright (c) 2015, Quark Li, quarkli@gmail.com
All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 
*/

'use strict'

// create gatherhub namespace
var gatherhub = gatherhub || {};

function precision(num, p) {
	return Math.round(num * Math.pow(10,p)) / Math.pow(10,p);
}

(function(){
	// Private Properties
	var pad, canvas;
	var z = 1;  // zoom ratio, 0.1 <= z <= 10
	var x = 0;  // canvas viewBox_x
	var y = 0;  // canvas viewBox_y
	var w = 0;  // canvas viewBox_w
	var h = 0;  // canvas viewBox_h
	var zcenterX = 0.5;  // Zoom center X % in current screen
	var zcenterY = 0.5;  // Zoom center Y % in current screen
	
	// Properties Prototype Declaration
	
	// Fucntions Prototype Declaration
	SvgPad.prototype.pad = function() {
		return pad;
	}
	SvgPad.prototype.canvas = function() {
		return canvas;
	}
	SvgPad.prototype.nocontext = function() {
		pad.on('contextmenu', function(){return false;});
	}
	SvgPad.prototype.bgcolor = function(c) {
		pad.css('background-color', c);
	}
	SvgPad.prototype.bordercolor = function(c) {
		pad.css('border-color', c);
		pad.css('border-style', 'solid');
		return pad.css('border-color');
	}
	SvgPad.prototype.borderwidth = function(w) {
		var bw;
		if (!isNaN(w)) pad.css('border-width', w + 'px');
		return isNaN(bw = parseInt(pad.css('border-width'))) ? 0 : bw;
	}
	SvgPad.prototype.show = function(t) {
		pad.css('display', t ? 'block' : 'none');
	}
	SvgPad.prototype.fixposition = function(t) {
		pad.css('position', t ? 'absolute' : 'relative');
	}
	SvgPad.prototype.moveTo = function(axis, p) {
		var b = 0;
		var bw = (pad.css('border-style') == 'solid') ? 0 : this.borderwidth();
		if (axis == 'left') {
			b = window.innerWidth - this.width();
		} 
		else if (axis == 'top') {
			b = window.innerHeight - this.height();
		}
		else {
			return;
		}
		b += bw;
		if (p > b) p = b;
		if (p < 0) p = 0;
		pad.css(axis, p + bw);
	};
	SvgPad.prototype.viewport = function(px, py, pw, ph) {
		x = px ? px : x;
		y = py ? py : y;
		w = pw ? pw : w;
		h = ph ? ph : h;
		// when there are upper case letter in attribute name, 
		// we must use native javascript setAttribute() instead of 
		// JQuery .attr() which always convert attribute name to lower case
		canvas[0].setAttribute('viewBox', x + ' ' + y + ' ' + w + ' ' + h);
	};
	SvgPad.prototype.width = function(w) {
		var bw = (pad.css('border-style') == 'solid') ? this.borderwidth() * 3 : this.borderwidth() * 2;
		if (w > 0) canvas.attr('width', w - bw);
		return canvas.attr('width');
	};
	SvgPad.prototype.height = function(h) {
		var bw = (pad.css('border-style') == 'solid') ? this.borderwidth() * 3 : this.borderwidth() * 2;
		if (h > 0) canvas.attr('height', h - bw);
		return canvas.attr('height');
	};
	SvgPad.prototype.fit = function() {
		w = this.width(window.innerWidth);
		h = this.height(window.innerHeight);
		this.viewport();
	};
	SvgPad.prototype.calibration = function() {
		var w = this.width();
		var h = this.height();
		var path = $(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
		path.attr('id', 'grid');
		path.attr('fill', 'none');
		path.attr('stroke', 'black');
		path.attr('d', 'M' + w/2 + ' 0v' + h + 'M0 ' + h/2 + 'h' + w
			+ 'M0 0h' + w + 'v' + h + 'h-' + w + 'v-' + h
			+ 'M' + w/4 + ' ' + h/4 + 'h' + w/2 + 'v' + h/2 + 'h-' + w/2 + 'v-' + h/2
			+ 'M' + w*3/8 + ' ' + h*3/8 + 'h' + w/4 + 'v' + h/4 + 'h-' + w/4 + 'v-' + h/4
			+ 'M' + w*7/16 + ' ' + h*7/16 + 'h' + w/8 + 'v' + h/8 + 'h-' + w/8 + 'v-' + h/8
		); 
		canvas.append(path);
	}
	SvgPad.prototype.clearcanvas = function() {
		while (canvas.children().length > 0) canvas.children().last().remove();
	}
	SvgPad.prototype.offsetcanvas = function(axis, offset) {
		if ($.isNumeric(offset)) {
			if (axis == 'x') x = precision(x - offset / z, 3);
			if (axis == 'y') y = precision(y - offset / z, 3);
			this.viewport();
		}
		if (axis == 'x') return x;
		if (axis == 'y') return y;
	}
	SvgPad.prototype.zoom = function(z) {
		if (z >= 0.1 && z <= 10) {
			var zx = zcenterX * w + x;
			var zy = zcenterY * h + y;
			w = this.width() / z;
			h = this.height() / z;
			x = precision(zx - zcenterX * w, 3);
			y = precision(zy - zcenterY * h, 3);
			z = precision(z, 1);
			this.viewport();
		}
		console.log('zoom=' + z);
		return z;
	}

	// Constructor
	function SvgPad() {
		console.log('new SvgPad()');
		pad = $('<div/>');
		canvas = $(document.createElementNS('http://www.w3.org/2000/svg', 'svg')).appendTo(pad);
		this.fit();
		this.nocontext();
	}
	
	// Append to Namespace
	gatherhub.SvgPad = SvgPad;
})();

(function(){
	var src;
	
	function mousedownHdl(x, y) {
		if ($.now() - this.logtime < 400) {
			if ($(this).attr('width') == this.defaultWidth) {
				this.size = precision(window.innerWidth / $(this).attr('width'), 1);
				$(this).attr('width' , window.innerWidth);
				$(this).attr('height', window.innerHeight);
			}
			else {
				this.size = 1;
				$(this).attr('width' , this.defaultWidth);
				$(this).attr('height', this.defaultHeight);
			}
		}
		else {
			this.dragging = true;
			this.mouseX = x;
			this.mouseY = y;
		}
		if (this.bBtnLeft) this.logtime = $.now();
	}
	
	function mouseupHdl() {
		var top = $(this).position().top;
		var left = $(this).position().left;
		if (top + $(this).height() - 5 > window.innerHeight) {
			$(this).css('top', 'auto');
			$(this).css('bottom', 	5);
		}
		else {
			$(this).css('bottom', 'auto');
			$(this).css('top', (top < 5) ? 0: top);
		}
		if (left + $(this).width() - 5> window.innerWidth) {
			$(this).css('left', 'auto');
			$(this).css('right', 5);
		}
		else {
			$(this).css('right', 'auto');
			$(this).css('left', (left < 5) ? 0 : left);
		}
		this.dragging = false;
		this.pinch = 0;
	}
	
	function mousemoveHdl(x, y) {
		if (this.dragging == true) {
			var top = $(this).position().top + y - this.mouseY;
			var left = $(this).position().left + x - this.mouseX;
							
			$(this).css('bottom', 'auto');
			$(this).css('right', 'auto');
			$(this).css('top', top);
			$(this).css('left', left);
			this.mouseX = x;
			this.mouseY = y;
		}			
	}

	function mousewheelHdl(delta) {
		var r = 0.1;
		var s = this.size;
		var x = $(this).position().top;
		var y = $(this).position().left;

		if (delta > 0) {
			s += r;
		}
		else if (s - r >= 1){
			s -= r;
		}
		
		w = this.defaultWidth * s;
		h = this.defaultHeight * s;
		if (w <= window.innerWidth && h <= window.innerHeight ) {
			if ($(this).position().top + h > window.innerHeight) {
				$(this).css('bottom', 'auto');
				$(this).css('top',  window.innerHeight - h);	
			}
			if ($(this).position().left + w > window.innerWidth) {
				$(this).css('right', 'auto');
				$(this).css('left',  window.innerWidth - w);
			}
			$(this).attr('width' , w);
			$(this).attr('height', h);
			this.size = precision(s, 1);
		}
	}

	VisualPad.prototype = (function(){
		var base = function(){};
		base.prototype = gatherhub.SvgPad.prototype;
		return new base();
	})();
	VisualPad.prototype.constructor = VisualPad;
	
	VisualPad.prototype.src = function(srcid) {
		src = $(srcid).length ? $(srcid) : $('#' + srcid) ? $('#' + srcid) : src;
		this.canvas().html('<use xlink:href="#' + src.attr('id') +'"/>');
	}

	VisualPad.prototype.refresh = function() {
		if (src && src.length) {
			var x = src[0].getBBox().x - 5;
			var y = src[0].getBBox().y - 5;
			var w = src[0].getBBox().width + 10;
			var h = src[0].getBBox().height + 10;
			this.viewport(x, y, w, h);
		}
	}

	function VisualPad(srcid) {
		console.log('new VisualPad()');
		gatherhub.SvgPad.call(this);
		this.src(srcid);
		
		this.pad.on('mousedown touchstart', function(evt){
			var e = evt.originalEvent;
			var x = e.touches ? e.touches[0].pageX : e.pageX;
			var y = e.touches ? e.touches[0].pageY : e.pageY;
			e.preventDefault();
			if (e.button==0) bBtnLeft = true;
			if (e.button==1) bBtnMiddle = true;
			if (e.button==2) bBtnRight = true;

			if (e.touches) {
				if (e.touches.length == 2) {
					pinchDelta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2);
					pinch = 1;
				}
				if (e.touches.length > 1) {
					mouseupHdl();
					return;
				}
			}
			mousedownHdl(x, y);
			bBtnLeft = true;
		});
		this.pad.on('mouseup mouseleave touchend',function(evt){
			var e = evt.originalEvent;
			e.preventDefault();
			if (e.button==0) bBtnLeft = false;
			if (e.button==1) bBtnMiddle = false;
			if (e.button==2) bBtnRight = false;
			mouseupHdl();
		});
		this.pad.on('mousemove touchmove', function(evt){
			var e = evt.originalEvent;
			var x = e.touches ? e.touches[0].pageX : e.pageX;
			var y = e.touches ? e.touches[0].pageY : e.pageY;
			e.preventDefault();
			if (e.touches) {
				if (e.touches.length == 2) {
					pinch += 1;
					if (.pinch > this.pinchSensitivity) {
						var delta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2) - pinchDelta;
						mousewheelHdl(delta);
						pinchDelta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2);
						pinch = 0;
					}
				}
				if (e.touches.length > 1) return;
			}
			mousemoveHdl(x, y);
		});
		this.pad.on('mousewheel DOMMouseScroll', function(evt){
			var e = evt.originalEvent;
			var delta = e.wheelDelta > 0 || e.detail < 0 ? 1 : -1;
			e.preventDefault();
			mousewheelHdl(delta);
		});
	}

	gatherhub.VisualPad = VisualPad;
})();

(function(){
	SketchPad.prototype = (function(){
		var base = function(){};
		base.prototype = gatherhub.SvgPad.prototype;
		return new base();
	})();
	SketchPad.prototype.constructor = SketchPad;
	
	function SketchPad() {
		console.log('new SketchPad()');
		gatherhub.SvgPad.call(this);
		
	}

	gatherhub.SketchPad = SketchPad;
})();