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
	// Debug Info:
	// L0 = none
	// L1 = Constructor and Getters
	// L2 = Setters
	// L3 = Operations
	// L4 = User Activity
	var L0 = 0, L1 = 1, L2 = 2, L3 = 4, L4 = 8; 
	var debug = L0; 
	var trace = function(lvl,s){if(lvl&debug)console.log(s);};
	
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
		
		// Gatherhub.SvgPadd
		g.SvgPad = SvgPad;
		
		// Constructor
		function SvgPad() {
			this.pad = $('<div/>');
			this.canvas = $(document.createElementNS('http://www.w3.org/2000/svg', 'svg')).appendTo(this.pad);
			this.canvasVbox = {x: 0, y: 0, w: 0, h: 0};
			this.zcenter = {x: 0.5, y: 0.5};
			
			// DO NOT REMOVE, must set the width and height to set initial values 
			this.fit();
		}

		// Prototypes
		var _proto = SvgPad.prototype;
		_proto.zrate = 1;
		_proto.zcenter = {};
		_proto.canvasVbox = {};
		_proto.screenxy = function(x, y) {return {x: x, y: y};};
		_proto.canvasxy = function(screnXY) {
			return {x: screnXY.x - this.pad.position().left - this.borderpadding() / 2, 
					y: screnXY.y - this.pad.position().top - this.borderpadding() / 2};
		};
		_proto.vboxxy = function(canvasxy) {
			return {x: precision(canvasxy.x / this.zrate + this.canvasVbox.x, 3),
					y: precision(canvasxy.y / this.zrate + this.canvasVbox.y, 3)};
		};
		_proto.nocontext = function() {
			this.pad.on('contextmenu', function(){return false;});
		};
		_proto.bgcolor = function(c) {
			if (c) this.canvas[0].style['background-color'] = c;
			return this.canvas[0].style['background-color'];
		};
		_proto.bordercolor = function(c) {
			if (c) {
				this.canvas[0].style['border-style'] = 'solid';
				this.canvas[0].style['border-color'] = c;
			}
			return this.canvas[0].style['border-color'];
		};
		_proto.borderwidth = function(w) {
			if ($.isNumeric(w)) this.canvas[0].style['border-width'] = w + 'px';
			return $.isNumeric(parseInt(this.canvas[0].style['border-width'])) ? parseInt(this.canvas[0].style['border-width']) : 0;
		};
		_proto.borderpadding = function() {
			return (this.canvas[0].style['border-style'] == 'solid') ?	this.borderwidth() * 2 : 0;
		};
		_proto.show = function(t) {
			if (t !== undefined) this.pad[0].style['display'] = t ? 'block' : 'none';
			return this.pad[0].style['display'] != 'none';
		};
		_proto.fixposition = function(t) {
			if (t !== undefined) this.pad[0].style['position'] = t ? 'absolute' : 'relative';
			return this.pad[0].style['position'] == 'absolute';
		};
		_proto.moveto = function(axis, p) {
			var b;
			if (axis == 'left') {
				b = $(window).width() - this.width() - this.borderpadding() / 2 - 6;
			} 
			else if (axis == 'top') {
				b = $(window).height() - this.height() - this.borderpadding() / 2 - 7;
			}
			else {
				return;
			}
			if (p > b) p = b;
			if (p < 0) p = 0;
			this.pad[0].style[axis] = p + 'px';
		};
		_proto.refreshvbox = function() {
			// $()[0] returns selector's native object
			// $.attr() converts attribute name to lower case, use native setAttribute() instead
			this.canvas[0].setAttribute('viewBox', this.canvasVbox.x + ' ' + 
				this.canvasVbox.y + ' ' + this.canvasVbox.w + ' ' + this.canvasVbox.h );
		};
		_proto.width = function(w) {
			if ($.isNumeric(w)) {
				if (w > $(window).width() - 6) w = $(window).width() - 6;
				this.canvas.attr('width', w);
				this.canvasVbox.w = precision((this.canvas.attr('width') - this.borderpadding()) / this.zrate, 3);
				if (this.pad.position().left + this.canvas.attr('width') * 1 + this.borderpadding() / 2 + 6 > $(window).width()) this.moveto('left', 9999);
			}
			return this.canvas.attr('width');
		};
		_proto.height = function(h) {
			if ($.isNumeric(h)) {
				if (h > $(window).height() - 7) h = $(window).height() - 7;
				this.canvas.attr('height', h);
				this.canvasVbox.h = precision((this.canvas.attr('height') - this.borderpadding()) / this.zrate, 3);
				if (this.pad.position().top + this.canvas.attr('height') * 1 + this.borderpadding() / 2 + 7 > $(window).height()) this.moveto('top', 9999);
			}
			return this.canvas.attr('height');
		};
		_proto.fit = function() {
			this.width($(window).width());
			this.height($(window).height());
			this.refreshvbox();
		};
		_proto.calibration = function() {
			var w = this.width() - this.borderpadding();
			var h = this.height() - this.borderpadding();
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
			this.canvas.append(path);
		};
		_proto.clearcanvas = function() {
			while (this.canvas.children().length > 0) this.canvas.children().last().remove();
		};
		_proto.offsetcanvas = function(axis, offset) {
			if ($.isNumeric(offset)) {
				if (axis == 'x') this.canvasVbox.x = precision(this.canvasVbox.x - offset / this.zrate, 3);
				if (axis == 'y') this.canvasVbox.y = precision(this.canvasVbox.y - offset / this.zrate, 3);
				this.refreshvbox();
			}
		};
		_proto.zoom = function(z) {
			if (this.canvasVbox.w == 0) this.canvasVbox.w = this.width();
			if (this.canvasVbox.h == 0) this.canvasVbox.h = this.height();
			if (z >= 0.1 && z <= 10) {
				this.zrate = precision(z, 1);
				var x = this.zcenter.x * this.canvasVbox.w + this.canvasVbox.x;
				var y = this.zcenter.y * this.canvasVbox.h + this.canvasVbox.y;
				this.canvasVbox.w = precision((this.width() - this.borderpadding()) / this.zrate, 3);
				this.canvasVbox.h = precision((this.height() - this.borderpadding()) / this.zrate, 3);
				this.canvasVbox.x = precision(x - this.zcenter.x * this.canvasVbox.w, 3);
				this.canvasVbox.y = precision(y - this.zcenter.y * this.canvasVbox.h, 3);
				this.refreshvbox();
			}
			return this.zrate;
		};
		_proto.appendto = function(obj) {
			if ($(obj).length) this.pad.appendTo($(obj));
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
				if (self.width() == defaultWidth) {
					size = precision($(window).width() / self.width(), 1);
					self.fit();
				}
				else {
					size = 1;
					self.minimize();
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
		}
		function mousemoveHdl(x, y) {
			if (dragging == true) {
				var top = pad.position().top + y - mouseY;
				var left = pad.position().left + x - mouseX;
								
				self.moveto('top', top);
				self.moveto('left', left);
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
			if (w <= $(window).width() && h <= $(window).height() ) {
				if (pad.position().top + h > $(window).height()) self.moveto('top',  $(window).height() - h);	
				if (pad.position().left + w > $(window).width()) self.moveto('left',  $(window).width() - w);
				self.width(w);
				self.height(h);
				size = precision(s, 1);
			}
		}

		// Gatherhub.VisualPad
		g.VisualPad = VisualPad;
		// Constructor
		function VisualPad(srcid) {
			trace(L1, this.constructor.name + '.VisualPad' +
				'(' + Array.prototype.slice.call(arguments) + ')');
			g.SvgPad.call(this);
			self = this;
			pad = this.pad;
			canvas = this.canvas;
			defaultWidth = this.width();
			defaultHeight = this.height();
			this.fixposition(true);
			this.nocontext();
			this.src(srcid);
			
			pad.on('mousedown touchstart', function(evt){
				var e = evt.originalEvent;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				e.preventDefault();
				if (e.button==0) bBtnLeft = true;
				if (e.button==1) bBtnMiddle = true;
				if (e.button==2) bBtnRight = true;

				if (t) {
					if (t.length == 2) {
						pinchDelta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2);
						pinch = 1;
					}
					if (t.length > 1) {
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
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				e.preventDefault();
				if (t) {
					if (t.length == 2) {
						pinch += 1;
						if (pinch > pinchSensitivity) {
							var delta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2) - pinchDelta;
							mousewheelHdl(delta);
							pinchDelta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2);
							pinch = 0;
						}
					}
					if (t.length > 1) return;
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
			src = (srcid && srcid[0] == '#' ? $(srcid) : $('#' + srcid));
			if (src.length)	canvas.html('<use xlink:href="#' + src.attr('id') +'"/>');
			else src = null;
		};
		_proto.defsize = function(w, h) {
			defaultWidth = w;
			defaultHeight = h;
		};
		_proto.minimize = function() {
			this.width(defaultWidth);
			this.height(defaultHeight);
			this.fetchsrc();
		}
		_proto.fetchsrc = function() {
			if (src) {
				this.canvasVbox.x = src[0].getBBox().x - 5;
				this.canvasVbox.y = src[0].getBBox().y - 5;
				this.canvasVbox.w = src[0].getBBox().width + 10;
				this.canvasVbox.h = src[0].getBBox().height + 10;
				this.refreshvbox();
			}
		};
	})();

	// Object Prototype: SketchPad
	(function(){
		// Private
		var self, pad, canvas, vpad, pathholder, redocache;
		var pc = 'black', pw = 5, ps = 'round';
		var pinch = 0, pinchDelta = 0, pinchSensitivity = 7, dragging = false;
		var activepath = -1, falseTouch = false;
		var mouseX = 0, mouseY = 0, bBtnLeft = false, bBtnMiddle = false, bBtnRight = false;
		var bWsReady = false;
		
		function drawStart(x, y){
			//trace(L4, self.constructor.name + '.drawStart' +
			//	'(' + Array.prototype.slice.call(arguments) + ')');
			var vboxxy = self.vboxxy(self.canvasxy(self.screenxy(x, y)));
			x = vboxxy.x;
			y = vboxxy.y;

			var $node =  $(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
			$node.attr('stroke-width', pw);
			$node.attr('stroke-linecap', ps);
			$node.attr('stroke', pc);
			$node.attr('fill', 'none');
			$node.attr('d', 'M' + x + ',' + y);

			pathholder.append($node);
			//clearPathsCache();
			activepath = pathholder.children('path').length - 1;
			falseTouch = true;
			setTimeout(function(){falseTouch=false;}, 5);
		}
		function drawPath(x, y){
			//trace(L4, self.constructor.name + '.drawPath' +
			//	'(' + Array.prototype.slice.call(arguments) + ')');
			if (activepath >= 0) {
				var vboxxy = self.vboxxy(self.canvasxy(self.screenxy(x, y)));
				x = vboxxy.x;
				y = vboxxy.y;
				pathholder.children('path').eq(activepath).attr('d', pathholder.children('path').eq(activepath).attr('d') + 'L' + x + ',' + y);
			}
		}
		function drawEnd(){
			//trace(L4, self.constructor.name + '.drawEnd' +
			//	'(' + Array.prototype.slice.call(arguments) + ')');
			if (activepath >= 0) {
				var $node = pathholder.children('path').eq(activepath);
				var move = $node.attr('d').split('L').length;
				activepath = -1;
				
				if (move < 2 || (falseTouch && move < 3)) {
					pathholder.children('path').eq(activepath).remove();
					return;
				}
				
				if (vpad) {
					vpad.fetchsrc.call(vpad);
					self.zoom(self.zrate);
				}
				
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
		
		function mousedownHdl(x, y) {
			//trace(L4, self.constructor.name + '.mousedownHdl' +
			//	'(' + Array.prototype.slice.call(arguments) + ')');
			drawStart(x, y);
			//trace(L4, 'window=' + $(window).width() + 'x' + $(window).height());
			//trace(L4, 'cavasvbox=' + self.canvasVbox.x + ' ' + self.canvasVbox.y + ' ' + self.canvasVbox.w + ' ' + self.canvasVbox.h);
			//trace(L4, 'viewBox=' + self.canvas[0].getAttribute('viewBox'));
			trace(L4, 'screenXY=' + x + ', ' + y);
			trace(L4, 'canvasxy=' + self.canvasxy(self.screenxy(x,y)).x + ', ' + self.canvasxy(self.screenxy(x,y)).y);
			trace(L4, 'vboxxy=' + self.vboxxy(self.canvasxy(self.screenxy(x,y))).x + ', ' + self.vboxxy(self.canvasxy(self.screenxy(x,y))).y);
		};
		function mouseupHdl() {
			drawEnd();
			dragging = false;
		};
		function mousemoveHdl(x, y) {
			if (dragging) {
				self.offsetcanvas('x', x - mouseX);
				self.offsetcanvas('y', y - mouseY);
			}
			else {
				drawPath(x, y);
			}
		};
		function mousewheelHdl(delta) {
			if (delta > 0) {
				self.zoom(self.zoom() + (self.zoom() < 1 ? 0.1 : 1));
			}
			else {
				self.zoom(self.zoom() - (self.zoom() <= 1 ? 0.1 : 1));
			}
		};
		
		// Gatherhub.SketchPad
		g.SketchPad = SketchPad;
		// Constructor
		function SketchPad() {
			g.SvgPad.call(this);
			self = this;
			pad = this.pad;
			canvas = this.canvas;
			pathholder = $(document.createElementNS('http://www.w3.org/2000/svg', 'g')).attr('id', 'g' + (0 | Math.random() * 1000)).appendTo(canvas);
			redocache = $(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
			this.nocontext();

			pad.on('mousedown touchstart', function(evt){
				var e = evt.originalEvent;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				e.preventDefault();

				mouseX = x;
				mouseY = y;

				if (e.button==0) bBtnLeft = true;
				if (e.button==1) bBtnMiddle = true;
				if (e.button==2) bBtnRight = true;

				if (t) {
					if (t.length == 2){
						self.zcenter.x = (x - (x - t[1].pageX) / 2) / self.width();
						self.zcenter.y = (y - (y - t[1].pageY) / 2) / self.height();
						pinchDelta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2);
						pinch = 1;
					}
					if (t.length > 1) {
						mouseupHdl();
						if (t.length == 3) dragging = true;
						return;
					}
				}
				
				if (bBtnMiddle || bBtnRight) {
					mouseupHdl();
				}
				else {
					mousedownHdl(x, y);
				}			
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
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				e.preventDefault();
				if (bBtnMiddle || (bBtnLeft && bBtnRight)) {
					self.offsetcanvas('x', precision(e.pageX, 3) - mouseX);
					self.offsetcanvas('y', precision(e.pageY, 3) - mouseY);
				}
				if (t) {
					if (t.length == 2) {
						pinch += 1;
						if (pinch > pinchSensitivity) {
							var delta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2) - pinchDelta;
							mousewheelHdl(delta);
							pinchDelta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2);
							pinch = 0;
						}
					}
					if (t.length > 1) {
						if (t.length != 3) return;
					}
				}
				mousemoveHdl(x, y);
				mouseX = x;
				mouseY = y;
			});
			pad.on('mousewheel DOMMouseScroll', function(evt){
				var e = evt.originalEvent;
				var delta = e.wheelDelta > 0 || e.detail < 0 ? 1 : -1;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				e.preventDefault();
				self.zcenter.x = x / self.width();
				self.zcenter.y = y / self.height();
				mousewheelHdl(delta);
			});
		}
		
		// Prototypes
		var _proto = SketchPad.prototype = extend(g.SvgPad);	// Inheritance
		_proto.constructor = SketchPad;							// Overload constructor
		_proto.attachvp = function(vp) {
			if (Object.getPrototypeOf(vp) === g.VisualPad.prototype) {
				vp.src(pathholder.attr('id'));
				vp.fetchsrc();
				vpad = vp;
			}			
		}
		_proto.pencolor = function(c) {pc = c;};
		_proto.penwidth = function(w) {pw = w;};
		_proto.penshape = function(s) {ps = s;};
		
	})();
})();