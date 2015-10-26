/*
gatherhub.js is distributed under the permissive MIT License:

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

// Module Namespace：Gatherhub, all functions / 
// object prototypes will be under Gatherhub.xxx
var Gatherhub = Gatherhub || {};

(function(){
	var g = Gatherhub;

	// Internal functions
	function precision(num, p) {
		return Math.round(num * Math.pow(10,p)) / Math.pow(10,p);
	}

	function extend(func){
			var base = function(){};
			base.prototype = func.prototype;
			return new base();
	}

	// Object Prototype: SvgPad
	(function(){
		// Private
		var pad, canvas;
		var z = 1;  // zoom ratio, 0.1 <= z <= 10
		var x = 0;  // canvas viewBox_x
		var y = 0;  // canvas viewBox_y
		var w = 0;  // canvas viewBox_w
		var h = 0;  // canvas viewBox_h
		var zcenterX = 0.5;  // Zoom center X % in current screen
		var zcenterY = 0.5;  // Zoom center Y % in current screen
		
		// Gatherhub.SvgPadd
		g.SvgPad = SvgPad;
		
		// Constructor
		function SvgPad() {
			console.log('new SvgPad()');
			pad = $('<div/>');
			canvas = $(document.createElementNS('http://www.w3.org/2000/svg', 'svg')).appendTo(pad);
			this.fit();
		}

		// Prototypes
		var _proto = SvgPad.prototype;
		_proto.pad = function() {
			return pad;
		};
		_proto.canvas = function() {
			return canvas;
		};
		_proto.nocontext = function() {
			pad.on('contextmenu', function(){return false;});
		};
		_proto.bgcolor = function(c) {
			pad.css('background-color', c);
		};
		_proto.bordercolor = function(c) {
			pad.css('border-color', c);
			pad.css('border-style', 'solid');
			return pad.css('border-color');
		};
		_proto.borderwidth = function(w) {
			var bw;
			if (!isNaN(w)) pad.css('border-width', w + 'px');
			return isNaN(bw = parseInt(pad.css('border-width'))) ? 0 : bw;
		};
		_proto.show = function(t) {
			pad.css('display', t ? 'block' : 'none');
		};
		_proto.fixposition = function(t) {
			pad.css('position', t ? 'absolute' : 'relative');
		};
		_proto.moveTo = function(axis, p) {
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
		_proto.viewport = function(px, py, pw, ph) {
			x = px ? px : x;
			y = py ? py : y;
			w = pw ? pw : w;
			h = ph ? ph : h;
			// $()[0] returns selector's native object
			// $.attr() converts attribute name to lower case, use native setAttribute() instead
			canvas[0].setAttribute('viewBox', x + ' ' + y + ' ' + w + ' ' + h);
		};
		_proto.width = function(w) {
			var bw = (pad.css('border-style') == 'solid') ? this.borderwidth() * 3 : this.borderwidth() * 2;
			if (w - bw > 0) {
				pad.width(w - bw);
				canvas.width(w - 5);	
				if (pad.position().left + pad.width() + bw > window.innerWidth) this.moveTo('left', window.innerWidth);
			}
			return pad.width() + bw;
		};
		_proto.height = function(h) {
			var bw = (pad.css('border-style') == 'solid') ? this.borderwidth() * 3 : this.borderwidth() * 2;
			if (h - bw > 0) {
				pad.height(h - bw);
				canvas.height(h - 5);	
				if (pad.position().top + pad.height() + bw > window.innerHeight) this.moveTo('top', window.innerHeight);
			}
			return pad.height() + bw;
		};
		_proto.fit = function() {
			w = this.width(window.innerWidth);
			h = this.height(window.innerHeight);
			this.viewport();
		};
		_proto.calibration = function() {
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
		};
		_proto.clearcanvas = function() {
			while (canvas.children().length > 0) canvas.children().last().remove();
		};
		_proto.offsetcanvas = function(axis, offset) {
			if ($.isNumeric(offset)) {
				if (axis == 'x') x = precision(x - offset / z, 3);
				if (axis == 'y') y = precision(y - offset / z, 3);
				this.viewport();
			}
			if (axis == 'x') return x;
			if (axis == 'y') return y;
		};
		_proto.zoom = function(z) {
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
		};
	})();

	// Object Prototype: VisualPad
	(function(){
		// Private
		var src, pad, canvas, self;
		var size = 1, dragging = false, logtime = $.now();
		var bBtnLeft = false, bBtnMiddle = false, bBtnRight = false;
		var mouseX = 0, mouseY = 0;
		var pinch = 0, pinchDelta = 0, pinchSensitivity = 3;
		var defaultWidth, defaultHeight;
		
		function mousedownHdl(x, y) {
			if ($.now() - logtime < 400) {
				if (self.width() == window.innerWidth) {
					size = 1;
					self.minimize();
				}
				else {
					size = precision(window.innerWidth / self.width(), 1);
					self.width(window.innerWidth);
					self.height(window.innerHeight);
				}
			}
			else {
				dragging = true;
				mouseX = x;
				mouseY = y;
			}
			if (bBtnLeft) logtime = $.now();
		}
		function mouseupHdl() {
			dragging = false;
			pinch = 0;
		}
		function mousemoveHdl(x, y) {
			if (dragging == true) {
				var top = pad.position().top + y - mouseY;
				var left = pad.position().left + x - mouseX;
								
				self.moveTo('top', top);
				self.moveTo('left', left);
				mouseX = x;
				mouseY = y;
			}			
		}
		function mousewheelHdl(delta) {
			var r = 0.1;
			var s = size;
			var x = pad.position().top;
			var y = pad.position().left;

			if (delta > 0) {
				s += r;
			}
			else if (s - r >= 1){
				s -= r;
			}
			var w = defaultWidth * s;
			var h = defaultHeight * s;
			if (w <= window.innerWidth && h <= window.innerHeight ) {
				if (pad.position().top + h > window.innerHeight) self.moveTo('top',  window.innerHeight - h);	
				if (pad.position().left + w > window.innerWidth) self.moveTo('left',  window.innerWidth - w);
				self.width(w);
				self.height(h);
				size = precision(s, 1);
			}
		}

		// Gatherhub.VisualPad
		g.VisualPad = VisualPad;
		// Constructor
		function VisualPad(srcid) {
			console.log('new VisualPad()');
			g.SvgPad.call(this);
			self = this;
			pad = this.pad();
			canvas = this.canvas();
			defaultWidth = this.width();
			defaultHeight = this.height();
			this.fixposition(true);
			this.src(srcid);
			
			pad.on('mousedown touchstart', function(evt){
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
			pad.on('mouseup mouseleave touchend',function(evt){
				var e = evt.originalEvent;
				e.preventDefault();
				if (e.button==0) bBtnLeft = false;
				if (e.button==1) bBtnMiddle = false;
				if (e.button==2) bBtnRight = false;
				mouseupHdl();
			});
			pad.on('mousemove touchmove', function(evt){
				var e = evt.originalEvent;
				var x = e.touches ? e.touches[0].pageX : e.pageX;
				var y = e.touches ? e.touches[0].pageY : e.pageY;
				e.preventDefault();
				if (e.touches) {
					if (e.touches.length == 2) {
						pinch += 1;
						if (pinch > pinchSensitivity) {
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
			pad.on('mousewheel DOMMouseScroll', function(evt){
				var e = evt.originalEvent;
				var delta = e.wheelDelta > 0 || e.detail < 0 ? 1 : -1;
				e.preventDefault();
				mousewheelHdl(delta);
			});
		}
		
		// Prototypes
		var _proto = VisualPad.prototype = extend(g.SvgPad);	// Inheritance
		_proto.constructor = VisualPad;							// Overload constructor
		_proto.src = function(srcid) {
			src = $(srcid).length ? $(srcid) : $('#' + srcid) ? $('#' + srcid) : src;
			canvas.html('<use xlink:href="#' + src.attr('id') +'"/>');
		};
		_proto.defsize = function(w, h) {
			defaultWidth = w;
			defaultHeight = h;
		};
		_proto.minimize = function() {
			this.width(defaultWidth);
			this.height(defaultHeight);
		}
		_proto.refresh = function() {
			if (src && src.length) {
				var x = src[0].getBBox().x - 5;
				var y = src[0].getBBox().y - 5;
				var w = src[0].getBBox().width + 10;
				var h = src[0].getBBox().height + 10;
				this.viewport(x, y, w, h);
			}
		};
	})();

	// Object Prototype: SketchPad
	(function(){
		// Private
		
		// Gatherhub.VisualPad
		g.SketchPad = SketchPad;
		// Constructor
		function SketchPad() {
			console.log('new SketchPad()');
			g.SvgPad.call(this);
			
		}
		
		// Prototypes
		var _proto = SketchPad.prototype = extend(g.SvgPad);	// Inheritance
		_proto.constructor = SketchPad;							// Overload constructor
	})();
})();