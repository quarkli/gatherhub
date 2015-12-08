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
		var s = 1;
		if (num < 0) {s = -1; num *= s;}
		var n = num < 1 ? 0 : Math.floor(Math.log10(num)) + 1;
		return (0 | (num * Math.pow(10, p - n))) / Math.pow(10, p - n) * s;
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
			if (r >= 0 && r <= 1) {
				var s = this.width() < this.height ? this.width() : this.height();
				this.canvas[0].style['border-radius'] = (s * r / 8) + 'px';
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
				this.pad[0].style['position'] = 'static';
				this.movable = false;
			} 
			return this;
		};
		_proto.moveto = function(axis, p) {
			if (this.movable) {
				var b;
				if (axis == 'left') {
					b = (this.parent && this.parent.width()) ? this.parent.width() : $(window).width();
					b = b - this.width() - this.borderpadding() / 2;
				} 
				else if (axis == 'top') {
					b = (this.parent && this.parent.height()) ? this.parent.height() : $(window).height();
					b = b - this.height() - this.borderpadding() / 2;
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
				var max = (this.parent && this.parent.width()) ? this.parent.width() : $(window).width();
				if (w > max) w = max;
				this.canvas.attr('width', w);
				this.canvasvbox.w = precision((this.canvas.attr('width') - this.borderpadding()) / this.zrate, 5);
				if (this.pad.position().left + this.canvas.attr('width') * 1 + this.borderpadding() / 2 > max) this.moveto('left', 9999);
			}
			return this;
		};
		_proto.height = function(h) {
			if (h === undefined) return this.canvas.attr('height');
			if (this.resizable && $.isNumeric(h)) {
				var max = (this.parent && this.parent.height()) ? this.parent.height() : $(window).height();
				if (h > max) h = max;
				this.canvas.attr('height', h);
				this.canvasvbox.h = precision((this.canvas.attr('height') - this.borderpadding()) / this.zrate, 5);
				if (this.pad.position().top + this.canvas.attr('height') * 1 + this.borderpadding() / 2 > max) this.moveto('top', 9999);
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

			z = $.isNumeric(z) ? (z > 100 ? 100 : z < 0.01 ? 0.01 : precision(z, 5)) : this.zrate;
			this.zrate = z;
			var x = this.zcenter.x * this.canvasvbox.w + this.canvasvbox.x;
			var y = this.zcenter.y * this.canvasvbox.h + this.canvasvbox.y;
			this.canvasvbox.w = precision((this.width() - this.borderpadding()) / this.zrate, 5);
			this.canvasvbox.h = precision((this.height() - this.borderpadding()) / this.zrate, 5);
			this.canvasvbox.x = precision(x - this.zcenter.x * this.canvasvbox.w, 5);
			this.canvasvbox.y = precision(y - this.zcenter.y * this.canvasvbox.h, 5);
			this.refreshvbox();
			return this;
		};
		_proto.offsetcanvas = function(axis, offset) {
			if ($.isNumeric(offset)) {
				if (axis == 'x') this.canvasvbox.x = precision(this.canvasvbox.x - offset / this.zrate, 5);
				if (axis == 'y') this.canvasvbox.y = precision(this.canvasvbox.y - offset / this.zrate, 5);
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
			this.parent = this.pad.parent();
			if (this.parent.width() && this.width() > this.parent.width()) this.width(this.parent.width());
			if (this.parent.height() && this.height() > this.parent.height()) this.height(this.parent.height());
			this.refreshvbox();
			this.moveto('left', this.pad.position().left);
			this.moveto('top', this.pad.position().top);
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
			this.psize = -1;
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
						if (pinch > self.pinchlevel) {
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
		_proto.pinchlevel = 3;
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
				if (this.psize == -1) {
					this.top = this.pad.position().top;
					this.left = this.pad.position().left;
					this.pwidth = this.width();
					this.pheight = this.height();
					this.maximize().fitcontent();
					this.psize = this.size = this.width() / this.defaultWidth;
				}
				else {
					this.width(this.pwidth).height(this.pheight).moveto('left', this.left).moveto('top', this.top);
					this.size = this.width() / this.defaultWidth;
					this.psize = -1;
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
			var r = -0.1;
			if (delta > 0) r *= -1;
			this.size += r;
			if (this.size >= 1) {
				var w = this.defaultWidth * this.size;
				var h = this.defaultHeight * this.size;
				var x = this.pad.position().left - this.defaultWidth * r / 2;
				var y = this.pad.position().top - this.defaultHeight * r / 2;
				this.width(w).height(h).moveto('left', x).moveto('top', y);
			}
			else {
				this.size = 1;
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
			return {x: precision(canvasxy.x / this.zrate + this.canvasvbox.x, 5),
					y: precision(canvasxy.y / this.zrate + this.canvasvbox.y, 5)};
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
			var pw = this.pc == self.bgcolor() ?  30 / this.zrate : this.pw / this.zrate * 1.1;
			var path =  $(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
			path.attr('id', this.gid + '-' + this.seq++);
			path.attr('class', this.gid);
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
			if (this.dispatch) {
				this.dispatch({
					id: path.attr('id'),
					x: point.x,
					y: point.y,
					c: this.pc
				}, 'drawing');
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

				if (this.dispatch) {
					this.dispatch(path2obj(path), 'graph');
				}
			}
		}
		function path2obj(p) {
			var obj = {};
			obj.tagName = p.prop('tagName');
			$.each(p[0].attributes, function(i, attr) {
				obj[attr.name] = attr.value;
			});
			return obj;
		}
		function flush(sp) {
			if (sp) {
				sp.vpad.fitcontent();
				sp.zoom(sp.zrate);
			}			
		}
		function randcolor() {
			var c = '#';
			while (c.length < 7) {
				if (c.length % 2) {
					c += ((0 | Math.random() * 8) + 7).toString(16);
				}
				else {
					c += (0 | Math.random() * 16).toString(16);					
				}
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
			this.repcolor = randcolor();
			this.gid = this.repcolor.slice(1,7);

			this.pad.on('mousedown touchstart', function(evt){
				var e = evt.originalEvent;
				var t = e.touches ? e.touches : null;
				var x = t ? t[0].pageX : e.pageX;
				var y = t ? t[0].pageY : e.pageY;
				x -= self.pad.parent().position().left;
				y -= self.pad.parent().position().top;
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
				x -= self.pad.parent().position().left;
				y -= self.pad.parent().position().top;
				e.preventDefault();
				if (bBtnMiddle || (bBtnLeft && bBtnRight)) {
					self.offsetcanvas('x', x - mouseX);
					self.offsetcanvas('y', y - mouseY);
				}
				if (t) {
					if (t.length == 2) {
						pinch += 1;
						if (pinch > self.pinchlevel) {
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
				x -= self.pad.parent().position().left;
				y -= self.pad.parent().position().top;
				e.preventDefault();
				self.zcenter.x = x / self.width();
				self.zcenter.y = y / self.height();
				self.mousewheelHdl(delta);
			});
		}
		
		// Prototypes
		var _proto = SketchPad.prototype = extend(g.SvgPad);	// Inheritance
		_proto.constructor = SketchPad;							// Overload constructor
		_proto.dispatch = null;
		_proto.gid = null;
		_proto.repcolor = '#FFF';
		_proto.vpad = null;
		_proto.pathholder = null;
		_proto.redocache = null;
		_proto.seq = 0;
		_proto.pc = 'black';
		_proto.pw = 5;
		_proto.ps = 'round';
		_proto.activepath = null;
		_proto.pinchlevel = 7;
		_proto.dragging = false;
		_proto.dragmode = false;
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
		_proto.showdrawing = function(data) {
			var point = {x: data.x, y: data.y};
			var scnxy = vbox2scn.call(this, point);
			var left = scnxy.x == 0 ? 1 : (scnxy.x / this.width() > 0.5) ? scnxy.x - this.width() : scnxy.x;
			var top = scnxy.y == 0 ? 1 : (scnxy.y / this.height() > 0.5) ? scnxy.y - this.height() : scnxy.y;
			var i = data.id.split('-', 1);
			var r = $('<span/>').attr('id', i).html(data.name).appendTo('body');
			r.css({'position': 'absolute', 'color': data.c, 'border-width': 1, 'border-style': 'solid'});
			if (left > 0) r.css('left', left);
			else r.css('right', -left);
			if (top > 0) r.css('top', top );
			else r.css('bottom', -top);
			setTimeout(function(){$('#' + i).remove();}, 2000);			
		};
		_proto.appendpath = function(p) {
			var path;
			$.each(p, function(k, v){
				if (k == 'tagName') {
					path = $(document.createElementNS('http://www.w3.org/2000/svg', v));
				}
				else {
					path.attr(k, v);
				}
			});
			path.appendTo(this.pathholder);
			flush(this);
			
			return this;
		};
		_proto.syncgraph = function(dst) {
			var self = this;
			$.each($('.' + this.gid), function(i, p) {
				self.dispatch(path2obj($(p)), 'graph', dst);
			});
		};
		_proto.clearall = function() {
			if (this.dispatch) this.dispatch({}, 'clear');
			this.clearcanvas();
			this.redocache.empty();
			flush(this);
			return this;
		};
		_proto.undoall = function() {
			while ($('.' + this.gid).length) this.undo();
			return this;
		};
		_proto.undo = function() {
			var path = $('.' + this.gid).length ? $('.' + this.gid).last() : null;
			if (path && path.attr('id').indexOf(this.gid) == 0) {
				path.appendTo(this.redocache);
				if (this.dispatch) this.dispatch({id: path.attr('id')}, 'undo');
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
			if (path && this.dispatch) {
				this.dispatch(path2obj(path), 'graph');
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
			this.defaultWidth = 50;
			this.defaultHeight = 50;
			this.resize = .8;
			this.borderwidth(1);
			this.borderradius(.25);
			this.bgcolor(opt.bgcolor || 'white');
			this.bordercolor(opt.bordercolor || 'black');
			this.iconcolor(opt.iconcolor || 'black');
			this.icon(opt.icon || '');
			this.pad.attr('title', opt.tip || '');
			if (opt === undefined) opt = {};
			if ($.isNumeric(opt.w)) this.defaultWidth = opt.w;
			if ($.isNumeric(opt.h)) this.defaultHeight = opt.h;
			if ($.isNumeric(opt.resize)) this.resize = opt.resize;
			if ($.isNumeric(opt.borderwidth)) this.borderwidth(opt.borderwidth);
			if ($.isNumeric(opt.borderradius)) this.borderradius(opt.borderradius);
			this.minimize();
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
			
			var self = this;

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
				if (sub.is(':hidden')) {
					self.collapseall();
					sub.show();
				}
				else {sub.hide();}
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
		}

		// Prototypes
		var _proto = BtnMenu.prototype;
		_proto.constructor = BtnMenu;
		_proto.collapseall = function() {
			this.root.children().each(function(e,k) {
				var sub = $('#' + $(this).children().last().attr('class'));
				if (sub.length == 0) sub = $('.' + $(this).attr('id'));
				if (!sub.is(':hidden')) sub.hide();
			});
		};
	})();
})();