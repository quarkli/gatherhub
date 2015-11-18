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

Author: quarkli@gmail.com
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
		function SvgPad(w, h) {
			this.pad = $('<div/>').css('font-size', 0);
			this.canvas = $(document.createElementNS('http://www.w3.org/2000/svg', 'svg')).appendTo(this.pad);
			this.zrate = 1;
			this.zcenter = {x: 0.5, y: 0.5};
			this.canvasvbox = {x: 0, y: 0, w: 0, h: 0};
			this.movable = false;
			this.resizable = true;
			this.defaultWidth = w || $(window).width();
			this.defaultHeight = h || $(window).height();
			this.bgcolor('white');
			
			// DO NOT REMOVE, must set the width and height to set initial values 
			this.maximize();
		}

		// Prototypes
		var _proto = SvgPad.prototype;
		_proto.nocontext = function() {
			this.pad.on('contextmenu', function(){return false;});
			return this;
		};
		_proto.bgcolor = function(c) {
			if (c) {
				this.canvas[0].style['background-color'] = c;
				return this;
			}
			return this.canvas[0].style['background-color'];
		};
		_proto.bordercolor = function(c) {
			if (c) {
				this.canvas[0].style['border-style'] = 'solid';
				this.canvas[0].style['border-color'] = c;
				return this;
			}
			return this.canvas[0].style['border-color'];
		};
		_proto.borderwidth = function(w) {
			if ($.isNumeric(w)) {
				this.canvas[0].style['border-width'] = w + 'px';
				return this;				
			}
			return $.isNumeric(parseInt(this.canvas[0].style['border-width'])) ? parseInt(this.canvas[0].style['border-width']) : 0;
		};
		_proto.borderradius = function(r) {
			if (r > 0 && r <= 1) {
				var s = this.width() < this.height ? this.width() : this.height();
				this.canvas[0].style['border-radius'] = (s * r / 2) + 'px';
			}
			return this;
		};
		_proto.borderpadding = function() {
			return (this.canvas[0].style['border-style'] == 'solid') ?	this.borderwidth() * 2 : 0;
		};
		_proto.show = function(t) {
			if (t !== undefined) {
				this.pad[0].style['display'] = t ? 'block' : 'none';
				return this;
			}
			return this.pad[0].style['display'] != 'none';
		};
		_proto.floating = function(pos) {
			if (pos) {
				this.pad[0].style['position'] = pos;
				this.movable = true;
			}
			else {
				this.pad[0].style['position'] = 'auto';
				this.movable = false;
			} 
			return this;
		};
		_proto.moveto = function(axis, p) {
			if (this.movable) {
				var b;
				if (axis == 'left') {
					b = $(window).width() - this.width() - this.borderpadding() / 2 - 6;
				} 
				else if (axis == 'top') {
					b = $(window).height() - this.height() - this.borderpadding() / 2 - 7;
				}
				else {
					return this;
				}
				if (p > b) p = b;
				if (p < 0) p = 0;
				this.pad[0].style[axis] = p + 'px';
			}
			return this;
		};
		_proto.width = function(w) {
			if (w === undefined) return this.canvas.attr('width');
			if (this.resizable && $.isNumeric(w)) {
				if (w > $(window).width() - 6) w = $(window).width() - 6;
				this.canvas.attr('width', w);
				this.canvasvbox.w = precision((this.canvas.attr('width') - this.borderpadding()) / this.zrate, 3);
				if (this.pad.position().left + this.canvas.attr('width') * 1 + this.borderpadding() / 2 + 6 > $(window).width()) this.moveto('left', 9999);
			}
			return this;
		};
		_proto.height = function(h) {
			if (h === undefined) return this.canvas.attr('height');
			if (this.resizable && $.isNumeric(h)) {
				if (h > $(window).height() - 7) h = $(window).height() - 7;
				this.canvas.attr('height', h);
				this.canvasvbox.h = precision((this.canvas.attr('height') - this.borderpadding()) / this.zrate, 3);
				if (this.pad.position().top + this.canvas.attr('height') * 1 + this.borderpadding() / 2 + 7 > $(window).height()) this.moveto('top', 9999);
			}
			return this;
		};
		_proto.maximize = function() {
			this.width($(window).width()).height($(window).height()).refreshvbox();
			return this;
		};
		_proto.minimize = function() {
			this.width(this.defaultWidth).height(this.defaultHeight).refreshvbox();
			return this;
		};
		_proto.fitcontent = function() {
			this.canvasvbox.x = this.canvas[0].getBBox().x;
			this.canvasvbox.y = this.canvas[0].getBBox().y;
			this.canvasvbox.w = this.canvas[0].getBBox().width;
			this.canvasvbox.h = this.canvas[0].getBBox().height;
			var zw = this.width() / (this.canvas[0].getBBox().width + 10);
			var zh = this.height() / (this.canvas[0].getBBox().height + 10);
			this.zrate = zw < zh ? zw : zh;
			this.zoom(this.zrate);

			return this;
		};		
		_proto.zoom = function(z) {
			if (z === undefined) return this.zrate;
			
			if (this.canvasvbox.w == 0) this.canvasvbox.w = this.width();
			if (this.canvasvbox.h == 0) this.canvasvbox.h = this.height();

			z = $.isNumeric(z) ? (z > 100 ? 100 : z < 0.01 ? 0.01 : precision(z, 3)) : this.zrate;
			this.zrate = z;
			var x = this.zcenter.x * this.canvasvbox.w + this.canvasvbox.x;
			var y = this.zcenter.y * this.canvasvbox.h + this.canvasvbox.y;
			this.canvasvbox.w = precision((this.width() - this.borderpadding()) / this.zrate, 3);
			this.canvasvbox.h = precision((this.height() - this.borderpadding()) / this.zrate, 3);
			this.canvasvbox.x = precision(x - this.zcenter.x * this.canvasvbox.w, 3);
			this.canvasvbox.y = precision(y - this.zcenter.y * this.canvasvbox.h, 3);
			this.refreshvbox();
			return this;
		};
		_proto.offsetcanvas = function(axis, offset) {
			if ($.isNumeric(offset)) {
				if (axis == 'x') this.canvasvbox.x = precision(this.canvasvbox.x - offset / this.zrate, 3);
				if (axis == 'y') this.canvasvbox.y = precision(this.canvasvbox.y - offset / this.zrate, 3);
				this.refreshvbox();
			}
			return this;
		};
		_proto.refreshvbox = function() {
			// $()[0] returns selector's native object
			// $.attr() converts attribute name to lower case, use native setAttribute() instead
			this.canvas[0].setAttribute('viewBox', this.canvasvbox.x + ' ' + 
				this.canvasvbox.y + ' ' + this.canvasvbox.w + ' ' + this.canvasvbox.h );
			return this;
		};
		_proto.appendto = function(obj) {
			if ($(obj).length) this.pad.appendTo($(obj));
			return this;
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
			return this;
		};
	})();

	// Object Prototype: VisualPad
	(function(){
		// Private
		var bBtnLeft = false, bBtnMiddle = false, bBtnRight = false;
		var mouseX = 0, mouseY = 0, logtime = 0;
		var pinch = 0, pinchDelta = 0;
		
		// Gatherhub.VisualPad
		g.VisualPad = VisualPad;
		// Constructor
		function VisualPad(w, h) {
			trace(L1, this.constructor.name + '.VisualPad' +
				'(' + Array.prototype.slice.call(arguments) + ')');
			var self = this;
			g.SvgPad.call(this);
			this.source = null;
			this.size = 1;
			this.dragging = false;
			this.resolution = false;
			this.defaultWidth = w || $(window).width() / 4;
			this.defaultHeight = h || $(window).height() / 4;
			this.floating(true).moveto('top', 0).moveto('left', 0).minimize().nocontext();
			
			this.pad.on('mousedown touchstart', function(evt){
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
						self.mouseupHdl();
						return;
					}
				}
				self.mousedownHdl(x, y);
				bBtnLeft = true;
			});
			this.pad.on('mouseup mouseleave touchend',function(evt){
				var e = evt.originalEvent;
				e.preventDefault();
				if (e.button==0) bBtnLeft = false;
				if (e.button==1) bBtnMiddle = false;
				if (e.button==2) bBtnRight = false;
				self.mouseupHdl();
			});
			this.pad.on('mousemove touchmove', function(evt){
				var e = evt.originalEvent;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				e.preventDefault();
				if (t) {
					if (t.length == 2) {
						pinch += 1;
						if (pinch > self.pinchSensitivity) {
							var delta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2) - pinchDelta;
							self.mousewheelHdl(delta);
							pinchDelta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2);
							pinch = 0;
						}
					}
					if (t.length > 1) return;
				}
				self.mousemoveHdl(x, y);
			});
			this.pad.on('mousewheel DOMMouseScroll', function(evt){
				var e = evt.originalEvent;
				var delta = e.wheelDelta > 0 || e.detail < 0 ? 1 : -1;
				e.preventDefault();
				self.mousewheelHdl(delta);
			});
		}
		
		// Prototypes
		var _proto = VisualPad.prototype = extend(g.SvgPad);	// Inheritance
		_proto.constructor = VisualPad;							// Overload constructor
		_proto.source;
		_proto.draggable = false;
		_proto.pinchSensitivity = 3;
		_proto.src = function(srcid) {
			this.source = (srcid && srcid[0] == '#' ? $(srcid) : $('#' + srcid));
			// this is a workaround method to resolve <svg> namespace issue that could not be display properly in some browser
			this.canvas.append($('<svg><use xlink:href="#' + this.source.attr('id') + '"/></svg>').children().eq(0));
			return this;
		};
		_proto.defsize = function(w, h) {
			this.defaultWidth = w;
			this.defaultHeight = h;
			return this;
		};
		_proto.mousedownHdl = function(x, y) {
			if ($.now() - logtime < 400) {
				if (this.width() == this.defaultWidth) {
					this.size = precision($(window).width() / this.width(), 1);
					this.maximize().fitcontent();
				}
				else {
					this.size = 1;
					this.minimize().fitcontent();
				}
			}
			else {
				this.dragging = true;
				mouseX = x;
				mouseY = y;
			}
			if (bBtnLeft) logtime = $.now();
		};
		_proto.mouseupHdl = function() {
			this.dragging = false;
		};
		_proto.mousemoveHdl = function(x, y) {
			if (this.draggable && this.dragging == true) {
				var top = this.pad.position().top + y - mouseY;
				var left = this.pad.position().left + x - mouseX;
								
				this.moveto('top', top).moveto('left', left);
				mouseX = x;
				mouseY = y;
			}			
		};
		_proto.mousewheelHdl = function(delta) {
			var r = 0.1;
			var s = this.size;
			var x = this.pad.position().top;
			var y = this.pad.position().left;

			if (delta > 0) {
				s += r;
			}
			else if (s - r >= 1){
				s -= r;
			}
			var w = this.defaultWidth * s;
			var h = this.defaultHeight * s;
			if (w <= $(window).width() && h <= $(window).height() ) {
				if (this.pad.position().top + h > $(window).height()) this.moveto('top',  $(window).height() - h);	
				if (this.pad.position().left + w > $(window).width()) this.moveto('left',  $(window).width() - w);
				this.width(w).height(h);
				this.size = precision(s, 1);
			}
		};
	})();

	// Object Prototype: SketchPad
	(function(){
		// Private
		var falseTouch = false, mouseX = 0, mouseY = 0, pinch = 0, pinchDelta = 0;
		var bBtnLeft = false, bBtnMiddle = false, bBtnRight = false;

		function screenxy(x, y) {return {x: x, y: y};}
		function canvasxy(screnXY) {
			return {x: screnXY.x - this.pad.position().left - this.borderpadding() / 2, 
					y: screnXY.y - this.pad.position().top - this.borderpadding() / 2};
		}
		function vboxxy(canvasxy) {
			return {x: precision(canvasxy.x / this.zrate + this.canvasvbox.x, 3),
					y: precision(canvasxy.y / this.zrate + this.canvasvbox.y, 3)};
		}
		function vbox2scn(vboxxy) {
			var x = (vboxxy.x - this.canvasvbox.x) * this.zrate;
			x = x < 0 ? 0 : x > this.width() ? this.width() : x;
			var y = (vboxxy.y - this.canvasvbox.y) * this.zrate;
			y = y < 0 ? 0 : y > this.height() ? this.height() : y;
			return {x: x, y: y};
		}
		function drawStart(x, y){
			//trace(L4, this.constructor.name + '.drawStart' +
			//	'(' + Array.prototype.slice.call(arguments) + ')');
			this.zoom(this.zrate);
			var point = vboxxy.call(this, canvasxy.call(this, screenxy(x, y)));
			x = point.x;
			y = point.y;
			
			var self = this;
			var pw = this.pc == 'white' ?  this.pw / this.zrate : this.pw;
			var path =  $(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
			path.attr('id', this.peername + '-' + this.seq++);
			path.attr('class', this.peername);
			path.attr('stroke-width', pw);
			path.attr('stroke-linecap', this.ps);
			path.attr('stroke', this.pc);
			path.attr('fill', 'none');
			path.attr('d', 'M' + x + ',' + y);
			path.on('click touchstart', function(){
				if (self.pc == self.bgcolor()) 
					$(this).clone().attr('stroke', self.bgcolor()).attr('stroke-width', 1 + $(this).attr('stroke-width') * 1).appendTo(self.pathholder);
			});

			this.pathholder.append(path);
			//clearPathsCache();
			this.activepath = path;
			falseTouch = true;
			setTimeout(function(){falseTouch=false;}, 5);
			if (this.wsready) {
				this.ws.send(
					JSON.stringify(
						{
							id: this.hubid,
							name: this.peername,
							action: 'path',
							pid: path.attr('id'),
							ops: 'start',
							x: point.x,
							y: point.y,
							c: this.repcolor
						}
					)
				);
			}
		}
		function drawPath(x, y){
			//trace(L4, this.constructor.name + '.drawPath' +
			//	'(' + Array.prototype.slice.call(arguments) + ')');
			if (this.activepath) {
				var point = vboxxy.call(this, canvasxy.call(this, screenxy(x, y)));
				x = point.x;
				y = point.y;
				this.activepath.attr('d', this.activepath.attr('d') + 'L' + x + ',' + y);
			}
		}
		function drawEnd(){
			//trace(L4, this.constructor.name + '.drawEnd' +
			//	'(' + Array.prototype.slice.call(arguments) + ')');
			if (this.activepath) {
				var path = this.activepath;
				var move = path.attr('d').split('L').length;
				this.activepath = null;
				
				if (move < 2 || (falseTouch && move < 3)) {
					path.remove();
					return;
				}
				this.redocache.empty();
				flush(this);

				if (this.wsready) {
					this.ws.send(
						JSON.stringify(
							{
								id: this.hubid,
								name: this.peername,
								action: 'path',
								pid: path.attr('id'),
								stroke: path.attr('stroke'),
								strokeWidth: path.attr('stroke-width'),
								strokeLinecap: path.attr('stroke-linecap'),
								fill: path.attr('fill'),
								d: path.attr('d')
							}
						)
					);
				}
			}
		}
		function flush(sp) {
			if (sp) {
				sp.vpad.fitcontent();
				sp.zoom(sp.zrate);
			}			
		}
		function randcolor() {
			var c = '#', m = 0 | Math.random() * 255;
			while (c.length < 7) {
				var n = 0 | Math.random() * 255;
				while (Math.abs(n - m) < 16) n = 0 | Math.random() * 255;
				m = n;
				c += n < 16 ? '0' + n.toString(16) : n.toString(16);
			}
			return c.toUpperCase();
		}
		
		// Gatherhub.SketchPad
		g.SketchPad = SketchPad;
		// Constructor
		function SketchPad() {
			var self = this;
			g.SvgPad.call(this);
			this.pathholder = $(document.createElementNS('http://www.w3.org/2000/svg', 'g')).attr('id', 'g' + (0 | Math.random() * 1000)).appendTo(this.canvas);
			this.redocache = $(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
			this.nocontext();
			this.peername = 'Peer' + (0 | Math.random() * 1000);
			this.repcolor = randcolor();

			this.pad.on('mousedown touchstart', function(evt){
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
						self.mouseupHdl();
						if (t.length == 3) self.dragging = true;
						return;
					}
				}
				
				if (bBtnMiddle || bBtnRight) {
					self.mouseupHdl();
				}
				else {
					self.mousedownHdl(x, y);
				}			
			});
			this.pad.on('mouseup mouseleave touchend',function(evt){
				var e = evt.originalEvent;
				e.preventDefault();
				if (e.button==0) bBtnLeft = false;
				if (e.button==1) bBtnMiddle = false;
				if (e.button==2) bBtnRight = false;
				self.mouseupHdl();
			});
			this.pad.on('mousemove touchmove', function(evt){
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
						if (pinch > self.pinchSensitivity) {
							var delta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2) - pinchDelta;
							self.mousewheelHdl(delta);
							pinchDelta = Math.pow(t[1].pageX - x, 2) + Math.pow(t[1].pageY - y, 2);
							pinch = 0;
						}
					}
					if (t.length > 1) {
						if (t.length != 3) return;
					}
				}
				self.mousemoveHdl(x, y);
				mouseX = x;
				mouseY = y;
			});
			this.pad.on('mousewheel DOMMouseScroll', function(evt){
				var e = evt.originalEvent;
				var delta = e.wheelDelta > 0 || e.detail < 0 ? 1 : -1;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				e.preventDefault();
				self.zcenter.x = x / self.width();
				self.zcenter.y = y / self.height();
				self.mousewheelHdl(delta);
			});
		}
		
		// Prototypes
		var _proto = SketchPad.prototype = extend(g.SvgPad);	// Inheritance
		_proto.constructor = SketchPad;							// Overload constructor
		_proto.svr = null;
		_proto.altsvr = null;
		_proto.port = null;
		_proto.altport = null;
		_proto.ws = null;
		_proto.wsready = false;
		_proto.hubid = 0;
		_proto.peername = null;
		_proto.repcolor = '#FFF';
		_proto.pulse = null;
		_proto.vpad = null;
		_proto.pathholder = null;
		_proto.redocache = null;
		_proto.seq = 0;
		_proto.pc = 'black';
		_proto.pw = 5;
		_proto.ps = 'round';
		_proto.activepath = null;
		_proto.pinchSensitivity = 7;
		_proto.dragging = false;
		_proto.dragmode = false;
		_proto.connect = function(svr, port) {
			var self = this;
			svr = svr || this.svr || '127.0.0.1';
			if (this.svr == null) this.svr = svr;
			port = port || this.port || 0;
			if (this.port == null) this.port = port;
			var ws = this.ws = new WebSocket('ws://' + svr + ':' + port);
			ws.onerror = function(){
				if (svr == self.svr) {
					svr = self.altsvr || svr;
					port = self.altport || port;
				}
				else {
					svr = self.svr || svr;
					port = self.port || port;
				}
				self.connect(svr, port);
			};
			ws.onopen = function(){
				ws.send(JSON.stringify({id: self.hubid, name: self.peername, action: 'connect'}));
				self.wsready = true;
				if (self.wsready) {
					self.pulse = setInterval(function(){if (self.wsready) ws.send('');}, 30000);
				}
			};
			ws.onmessage = function(msg){
				if (msg.data.match('path')){
					var ctx = JSON.parse(msg.data);
					if (ctx.id == self.hubid && ctx.name != self.peername){
						if (ctx.ops) {
							switch (ctx.ops) {
								case 'undo':
									$('#' + ctx.pid).remove();
									flush(self);
									break;
								case 'redo':
									break;
								case 'clear':
									self.clearcanvas();
									flush(self);
									break;
								case 'start':
									var point = {x: ctx.x, y: ctx.y};
									var scnxy = vbox2scn.call(self, point);
									var left = scnxy.x == 0 ? 1 : (scnxy.x / self.width() > 0.5) ? scnxy.x - self.width() : scnxy.x;
									var top = scnxy.y == 0 ? 1 : (scnxy.y / self.height() > 0.5) ? scnxy.y - self.height() : scnxy.y;
									var i = ctx.pid.split('-', 1);
									var r = $('<span/>').attr('id', i).html(i).appendTo('body');
									r.css({'position': 'absolute', 'color': ctx.c, 'border-width': 1, 'border-style': 'solid'});
									if (left > 0) r.css('left', left);
									else r.css('right', -left);
									if (top > 0) r.css('top', top );
									else r.css('bottom', -top);
									setTimeout(function(){$('#' + i).remove();}, 2000);
									break;
							}
						}
						else if (ctx.d) {
							var path = $(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
							path.attr('id', ctx.pid);
							path.attr('stroke-width', ctx.strokeWidth);
							path.attr('stroke', ctx.stroke);
							path.attr('stroke-linecap', ctx.strokeLinecap);
							path.attr('fill', ctx.fill);
							path.attr('d', ctx.d);
							path.appendTo(self.pathholder);
							flush(self);
							$('#' + ctx.pid.split('-', 1)).remove();
						}
					}
				}
				else {
					console.log(msg.data);
					if (msg.data.indexOf(this.peername) < 0 && msg.data.indexOf('has entered')) {
						self.undoall();
						self.redoall();
					}
				}
			};
			ws.onclose = function(){
				clearInterval(self.pulse);
				self.wsready = false;
			};
			return this;
		};
		_proto.sendmsg = function(msg, tgt) {
			if (this.wsready) {
				this.ws.send(JSON.stringify({id: this.hubid, name: this.peername, action: 'say', data: msg, target: tgt}));
			}
			return this;
		};
		_proto.attachvp = function(vp) {
			if (Object.getPrototypeOf(vp) === g.VisualPad.prototype) {
				vp.src(this.pathholder.attr('id'));
				vp.fitcontent();
				this.vpad = vp;
			}
			return this;			
		}
		_proto.pencolor = function(c) {
			if (c) {
				this.pc = c;
				return this;
			}
			return this.pc;
		};
		_proto.penwidth = function(w) {
			if (w) {
				this.pw = w;
				return this;
			}
			return this.pw;
		};
		_proto.penshape = function(s) {
			if (s) {
				this.ps = s;	
				return this;
			}
			return this.ps;
		};
		_proto.clearall = function() {
			if (this.wsready) {
				this.ws.send(
					JSON.stringify(
						{
							id: this.hubid,
							name: this.peername,
							action: 'path',
							ops: 'clear'
						}
					)
				);
			}
			this.clearcanvas();
			this.redocache.empty();
			flush(this);
			return this;
		};
		_proto.undoall = function() {
			while ($('.' + this.peername).length) this.undo();
			return this;
		};
		_proto.undo = function() {
			var path = $('.' + this.peername).length ? $('.' + this.peername).last() : null;
			if (path && path.attr('id').indexOf(this.peername) == 0) {
				path.appendTo(this.redocache);
				if (this.wsready) {
					this.ws.send(
						JSON.stringify(
							{
								id: this.hubid,
								name: this.peername,
								action: 'path',
								pid: path.attr('id'),
								ops: 'undo'
							}
						)
					);
				}
				flush(this);
			}
			return this;
		};
		_proto.redoall = function() {
			while (this.redocache.children().length) this.redo();
			return this;
		};
		_proto.redo = function() {
			if (this.redocache.children().length) var path = this.redocache.children().last().appendTo(this.pathholder);
			if (path && this.wsready) {
				this.ws.send(
					JSON.stringify(
						{
							id: this.hubid,
							name: this.peername,
							action: 'path',
							pid: path.attr('id'),
							stroke: path.attr('stroke'),
							strokeWidth: path.attr('stroke-width'),
							strokeLinecap: path.attr('stroke-linecap'),
							fill: path.attr('fill'),
							d: path.attr('d')
						}
					)
				);
			}
			flush(this);
			return this;
		};
		_proto.clearcanvas = function() {
			this.pathholder.empty();
			this.redocache.empty();
			return this;
		};
		_proto.mousedownHdl = function(x, y) {
			//trace(L4, this.constructor.name + '.mousedownHdl' +
			//	'(' + Array.prototype.slice.call(arguments) + ')');
			if (this.dragmode) {
				this.dragging = true;
				return;
			}
			drawStart.call(this, x, y);
			//trace(L4, 'window=' + $(window).width() + 'x' + $(window).height());
			//trace(L4, 'cavasvbox=' + this.canvasvbox.x + ' ' + this.canvasvbox.y + ' ' + this.canvasvbox.w + ' ' + this.canvasvbox.h);
			//trace(L4, 'viewBox=' + this.canvas[0].getAttribute('viewBox'));
			trace(L4, 'screenXY=' + x + ', ' + y);
			trace(L4, 'canvasxy=' + canvasxy.call(this, screenxy(x,y)).x + ', ' + canvasxy.call(this, screenxy(x,y)).y);
			trace(L4, 'vboxxy=' + vboxxy.call(this, canvasxy.call(this, screenxy(x, y))).x + ', ' + vboxxy.call(this, canvasxy.call(this, screenxy(x, y))).y);
		};
		_proto.mouseupHdl = function() {
			drawEnd.call(this);
			this.dragging = false;
		};
		_proto.mousemoveHdl = function(x, y) {
			if (this.dragging) {
				this.offsetcanvas('x', x - mouseX);
				this.offsetcanvas('y', y - mouseY);
			}
			else {
				drawPath.call(this, x, y);
			}
		};
		_proto.mousewheelHdl = function(delta) {
			var offset = Math.pow(10, Math.floor(Math.log10(this.zrate)));

			if (delta > 0) {
				this.zoom(this.zoom() + offset);
			}
			else {
				if (this.zoom() <= offset) offset /= 10;
				this.zoom(this.zoom() - offset);
			}
		};
	})();

	// Object Prototype: SvgButton
	(function(){
		// Private

		// Gatherhub.SvgButton
		g.SvgButton = SvgButton;
		// Constructor
		function SvgButton(opt) {
			trace(L1, this.constructor.name + '.SvgButton' +
				'(' + Array.prototype.slice.call(arguments) + ')');
			g.VisualPad.call(this);
			if (opt === undefined) opt = {};
			this.defaultWidth = opt.w || 50;
			this.defaultHeight = opt.h || 50;
			this.tip = opt.tip || '';
			this.resize = opt.resize || .8;
			this.minimize();
			this.bgcolor(opt.bgcolor || 'white');
			this.bordercolor(opt.bordercolor || 'black');
			this.borderwidth(opt.borderwidth || 1);
			this.borderradius(opt.borderradius || .25);
			this.iconcolor(opt.iconcolor || 'black');
			this.icon(opt.icon || '');
			this.pad.attr('title', opt.tip || '');
			this.resizable = false;
			
			this.pad.off('mouseleave');
		}
		
		// Prototypes
		var _proto = SvgButton.prototype = extend(g.VisualPad);	// Inheritance
		_proto.constructor = SvgButton;							// Overload constructor
		_proto.onclick = function(){};
		_proto.icon = function(svg) {
			$('<svg>'+svg+'</svg>').children().eq(0).appendTo(this.canvas);
		};
		_proto.iconcolor = function(c) {
			this.canvas.css('fill', c);
			return this;
		};
		_proto.appendto = function(target) {
			g.VisualPad.prototype.appendto.call(this, target);
			this.fitcontent().zoom(this.zrate * this.resize);
			return this;
		};
		_proto.mousedownHdl = function(x, y) {
			g.VisualPad.prototype.mousedownHdl.call(this, x, y);
			this.fitcontent().zoom(this.zrate * this.resize);
			this.prevborderwd = this.borderwidth();
			this.borderwidth(this.prevborderwd + 1);
		};
		_proto.mouseupHdl = function(x, y) {
			g.VisualPad.prototype.mouseupHdl.call(this, x, y);
			this.borderwidth(this.prevborderwd);
			this.onclick();
		};
	})();
	
	// Object Prototype: BtnMenu
	(function(){
		// Private
		function togglesub(){
			var w = $(this).width();
			var sub = $('#' + $(this).children().last().attr('class'));
			if (sub.length == 0) sub = $('.' + $(this).attr('id'));
			var top = $(this).parent().position().top + $(this).index() * w;
			var left = $(this).parent().position().left;
			if ($(this).parent().attr('dir') == 'h0' || $(this).parent().attr('dir') == 'h1') {
				top = $(this).parent().position().top;
				left = $(this).parent().position().left + $(this).index() * w;
			}
			
			if (sub.attr('dir') == 'h0' || sub.attr('dir') == 'h1') {
				if (sub.attr('dir') == 'h1') {
					top += w;
					if (top + w > $(window).height()) top -= 2 * w;
				}
				else {
					left += w;
				}
				if (left + w * sub.children().length > $(window).width()){
					left -= w * (sub.children().length + 1);
					if (sub.attr('dir') == 'h1') left += w * 2;
				}
			}
			else {
				if (sub.attr('dir') == 'v1') {
					left += w;
					if (left + w > $(window).width()) left -= 2 * w;
				}
				else {
					top += w;
				}
				if (sub.children().length * w + top > $(window).height()) {
					top -= w * (sub.children().length - 1);
					if (sub.attr('dir') == 'v0') top -= w * 2;
				}
			}
			sub.css({'top': top, 'left': left});
			if (sub.is(':hidden')) sub.show();
			else sub.hide();
		}
		
		function createMenu(list) {
			var m = $('<div/>').css('font-size', 0).appendTo('body');
			m.attr('id', 0 | (Math.random() * 10000));
			
			list.forEach(function(e){
				var id = e.id = 0 | (Math.random() * 10000);
				var slist = e.sublist;

				if (slist) {
					slist = createMenu(slist);
					slist.attr('dir', e.direction);
					if (e.direction == 'h0' || e.direction == 'h1') slist.children().css('float', 'left');
					slist.css('position', 'absolute').attr('class', id).appendTo('body').hide();
					slist.children().addClass(slist.attr('id'));
				}

				if (e.btn) {
					e.btn = new Gatherhub.SvgButton(e.btn).appendto(m).pad.attr('id', id);	
					if (e.act) {
						e.btn.on('click touchstart', function(){
							e.act();
							var btngrp = $('.' + $(this).attr('class'));
							if ($(this).parent().attr('id') == $(this).attr('class')) {
								for (var i = 0; i < btngrp.length; i++) {
									if ($(btngrp[i]).parent().attr('id') != $(this).attr('class')) {
										$(this).appendTo($(btngrp[i]).parent());
										$(btngrp[i]).appendTo($('#' + $(this).attr('class')));
										break;
									}
								}
							}
						});
					}
				}
				else {
					e.btn = $('<div/>').css('font-size', 0).attr('id', id).appendTo(m);
					if (slist.children().length > 0) slist.children().first().show().appendTo(e.btn);
				}
				
				if (slist) {
					e.btn.on('click touchstart', togglesub);
				}
			});
			return m;
		}

		// Gatherhub.BtnMenu
		g.BtnMenu = BtnMenu;
		
		// Constructor
		function BtnMenu(list) {
			var l = list.rootlist;
			if (l.length > 0) {
				var root = this.root = createMenu(l);
				var children = root.children();
				root.attr('dir', list.direction);
				if (list.direction == 'h0' || list.direction == 'h1') children.css('float', 'left');
				list.id = root.attr('id');
				children.addClass(list.id);
			}
		}

		// Prototypes
		var _proto = BtnMenu.prototype;
		_proto.constructor = BtnMenu;
	})();
})();