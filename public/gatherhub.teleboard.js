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
	// Properties Prototype Declaration
	SvgCanvas.prototype.z = 1;  // zoom ratio, 0.1 <= z <= 10
	SvgCanvas.prototype.m = 5;  // canvas margin
	SvgCanvas.prototype.x = 0;  // canvas viewBox_x
	SvgCanvas.prototype.y = 0;  // canvas viewBox_y
	SvgCanvas.prototype.w = 0;  // canvas viewBox_w
	SvgCanvas.prototype.h = 0;  // canvas viewBox_h
	SvgCanvas.prototype.zcenterX = 0.5;  // Zoom center X % in current screen
	SvgCanvas.prototype.zcenterY = 0.5;  // Zoom center Y % in current screen
	SvgCanvas.prototype.canvas;

	// Fucntions Prototype Declaration
	SvgCanvas.prototype.toString = function() {
		return this.canvas.html();
	}

	SvgCanvas.prototype.pinchSensitivity = function(s) {
		this.canvas[0].pinchSensitivity = s;
	}
	
	SvgCanvas.prototype.bgcolor = function(color) {
		this.canvas.css('background-color', color);
	}
	
	SvgCanvas.prototype.clear = function() {
		while (this.canvas.children().length > 0) this.canvas.children().last().remove();
	}

	SvgCanvas.prototype.calibration = function() {
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
		this.canvas.append(path);
	}

	SvgCanvas.prototype.appendTo = function(elem) {
		if ($(elem).length) $(elem).append(this.canvas);
	}

	SvgCanvas.prototype.offset = function(axis, offset) {
		if ($.isNumeric(offset)) {
			if (axis == 'x') this.x = precision(this.x - offset / this.z, 3);
			if (axis == 'y') this.y = precision(this.y - offset / this.z, 3);
			// when there are upper case letter in attribute name, 
			// we must use native javascript setAttribute() instead of 
			// JQuery .attr() which always convert attribute name to lower case
			this.canvas[0].setAttribute('viewBox', this.x + ' ' + this.y + ' ' + this.w + ' ' + this.h);
		}
		if (axis == 'x') return this.x;
		if (axis == 'y') return this.y;
	}

	SvgCanvas.prototype.zoom = function(z) {
		if (z >= 0.1 && z <= 10) {
			var zx = this.zcenterX * this.w + this.x;
			var zy = this.zcenterY * this.h + this.y;
			this.w = this.width() / z;
			this.h = this.height() / z;
			this.x = precision(zx - this.zcenterX * this.w, 3);
			this.y = precision(zy - this.zcenterY * this.h, 3);
			this.z = precision(z, 1);
			// when there are upper case letter in attribute name, 
			// we must use native javascript setAttribute() instead of 
			// JQuery .attr() which always convert attribute name to lower case
			this.canvas[0].setAttribute('viewBox', this.x + ' ' + this.y + ' ' + this.w + ' ' + this.h);
		}
		console.log('zoom=' + this.z);
		return this.z;
	}

	SvgCanvas.prototype.margin = function(m) {
		if (m > 0) this.m = m;
		return this.m;
	}

	SvgCanvas.prototype.width = function(w) {
		if (w - this.m > 0) this.canvas.attr('width', precision(w - this.m, 3));
		return this.canvas.attr('width');
	}

	SvgCanvas.prototype.height = function(h) {
		if (h - this.m > 0) this.canvas.attr('height', precision(h - this.m, 3));
		return this.canvas.attr('height');
	}

	SvgCanvas.prototype.fit = function(pw, ph) {
		var w = pw || window.innerWidth;
		var h = ph || window.innerHeight;
		this.w = this.width(w);
		this.h = this.height(h);
		this.canvas[0].setAttribute('viewBox', this.x + ' ' + this.y + ' ' + this.w + ' ' + this.h);
	}

	// Constructor
	function SvgCanvas(w, h) {
		this.canvas = $(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
		this.fit(w, h);
		this.canvas[0].creator = this;
	}
	
	// Append to Namespace
	gatherhub.SvgCanvas = SvgCanvas;
})();

(function(){
	VisualPad.prototype = new gatherhub.SvgCanvas();  	// Inherit from SvgCanvas
	VisualPad.prototype.constructor = VisualPad;	  	// Assign constructor

	// Properties Prototype Declaration
	VisualPad.prototype.sc = {};  // Source Canvas
	
	// Fucntions Prototype Declaration
	VisualPad.prototype.hide = function() {
		this.canvas.css('display', 'none');
	}
	
	VisualPad.prototype.show = function() {
		this.canvas.css('display', 'block');
	}
	
	VisualPad.prototype.moveTo = function(pos, px) {
		if ((pos == 'top' || pos == 'bottom' || pos == 'left' || pos == 'right') && $.isNumeric(px)) {
			this.canvas.css(pos, px + 'px');
		}
	}
	
	VisualPad.prototype.refresh = function() {
		if (this.sc.length) {
			this.x = this.sc[0].getBBox().x;
			this.y = this.sc[0].getBBox().y;
			this.w = this.sc[0].getBBox().width;
			this.h = this.sc[0].getBBox().height;
			this.canvas[0].setAttribute('viewBox', this.x + ' ' + this.y + ' ' + this.w + ' ' + this.h);
			this.offset('x', -this.x);
			this.offset('y', -this.y);			
		}
	}
	
	VisualPad.prototype.src = function(src) {
		if ($(src).length) {
			this.canvas.html('<use xlink:href=' + src + '/>');
			this.sc = $(src);			
		}
	}
	
	// Constructor
	function VisualPad(w, h, src){
		gatherhub.SvgCanvas.call(this, w, h);
		this.canvas.css('position', 'absolute');
		this.bgcolor('#FFE')
;		this.src(src);
		this.moveTo('bottom', 0);
		this.moveTo('right', 0);
		this.refresh();
		this.show();
		
		// Mouse / Touch event handlers
		this.canvas[0].defaultWidth = this.canvas.attr('width');
		this.canvas[0].defaultHeight = this.canvas.attr('height');
		this.canvas[0].size = 1;
		this.pinchSensitivity(3);
		
		this.canvas[0].mousedownHdl = function(x, y) {
			if ($.now() - this.logtime < 400) {
				if ($(this).attr('width') == this.defaultWidth) {
					$(this).attr('width' , window.innerWidth);
					$(this).attr('height', window.innerHeight);					
				}
				else {
					$(this).attr('width' , this.defaultWidth);
					$(this).attr('height', this.defaultHeight);					
				}
			}
			else {
				this.dragging = true;
				this.mouseX = x;
				this.mouseY = y;				
			}
			this.logtime = $.now();			
		};
		
		this.canvas[0].mouseupHdl = function() {
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
		};
		
		this.canvas[0].mousemoveHdl = function(x, y) {
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
		};

		this.canvas[0].mousewheelHdl = function(delta) {
			var r = 0.1;
			var w =	this.defaultWidth;
			var h =	this.defaultHeight;
			var dx = r * w / 2;
			var dy = r * h / 2;

			if (delta > 0) {
				if ($(this).attr('width') >= window.innerWidth) return;
				this.size += r;
				dx *= -1;
				dy *= -1
			}
			else if (this.size > 1){
				this.size -= r;
			}
			else {
				return;
			}
			
			w *= this.size;
			h *= this.size;
			$(this).css('bottom', 'auto');
			$(this).css('right', 'auto');
			$(this).css('top', $(this).position().top + dy);
			$(this).css('left', $(this).position().left + dx);
			$(this).attr('width' , w > window.innerWidth ? window.innerWidth : w);
			$(this).attr('height', h > window.innerHeight ? window.innerHeight : h);						
		};
		
		// Bind event handlers to Mouse events
		this.canvas.on('mousedown touchstart', function(evt){
			var e = evt.originalEvent;
			var x = e.touches ? e.touches[0].pageX : e.pageX;
			var y = e.touches ? e.touches[0].pageY : e.pageY;
			e.preventDefault();
			if (e.touches) {
				if (e.touches.length == 2) {
					this.pinchDelta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2);
					this.pinch = 1;
				}
				if (e.touches.length > 1) {
					this.mouseupHdl();
					return;
				}
			}
			this.mousedownHdl(x, y);			
		});
		this.canvas.on('mouseup mouseleave touchend',function(evt){
			var e = evt.originalEvent;
			e.preventDefault();
			this.mouseupHdl();
		});
		this.canvas.on('mousemove touchmove', function(evt){
			var e = evt.originalEvent;
			var x = e.touches ? e.touches[0].pageX : e.pageX;
			var y = e.touches ? e.touches[0].pageY : e.pageY;
			e.preventDefault();
			if (e.touches) {
				if (e.touches.length == 2) {
					this.pinch += 1;
					if (this.pinch > this.pinchSensitivity) {
						var delta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2) - this.pinchDelta;
						this.mousewheelHdl(delta);
						this.pinchDelta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2);
						this.pinch = 0;
					}
				}
				if (e.touches.length > 1) return;
			}
			this.mousemoveHdl(x, y);
		});
		this.canvas.on('mousewheel DOMMouseScroll', function (evt){
			var e = evt.originalEvent;
			var delta = e.wheelDelta > 0 || e.detail < 0 ? 1 : -1;
			e.preventDefault();
			this.mousewheelHdl(delta);
		});
	}
	
	// Append to Namespace
	gatherhub.VisualPad = VisualPad;
})();

(function(){
	SketchPad.prototype = new gatherhub.SvgCanvas();  	// Inherit from SvgCanvas
	SketchPad.prototype.constructor = SketchPad;	  	// Assign constructor

	// Properties Prototype Declaration
	SketchPad.prototype.penColor = 'black';
	SketchPad.prototype.penWidth = 5;
	SketchPad.prototype.penShape = 'round';
		
	// Fucntions Prototype Declaration
	SketchPad.prototype.id = function(){return this.canvas[0].pathholder.attr('id')};
	
	// Constructor
	function SketchPad(w, h, id){
		gatherhub.SvgCanvas.call(this, w, h);
		
		// Mouse / Touch event handlers
		var pathholder = this.canvas[0].pathholder = $(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
		pathholder.attr('id', id);
		this.canvas.append(pathholder);
		this.canvas[0].redocache = $(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
		this.canvas[0].activepath = -1;
		this.pinchSensitivity(3);
		
		this.canvas[0].drawStart =  function(x, y){
			x = precision(x * this.creator.w / this.creator.width() + this.creator.x, 3);
			y = precision(y * this.creator.h / this.creator.height() + this.creator.y, 3);

			var $node =  $(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
			$node.attr('stroke-width', this.creator.penWidth);
			$node.attr('stroke-linecap', this.creator.penShape);
			$node.attr('stroke', this.creator.penColor);
			$node.attr('fill', 'none');
			$node.attr('d', 'M' + x + ',' + y);

			this.pathholder.append($node);
			//clearPathsCache();
			this.activepath = this.pathholder.children('path').length - 1;
		}

		this.canvas[0].drawPath = function(x, y){
			if (this.activepath >= 0) {
				x = precision(x * this.creator.w / this.creator.width() + this.creator.x, 3);
				y = precision(y * this.creator.h / this.creator.height() + this.creator.y, 3);
				this.pathholder.children('path').eq(this.activepath).attr('d', this.pathholder.children('path').eq(this.activepath).attr('d') + 'L' + x + ',' + y);
			}
		}

		this.canvas[0].drawEnd = function(){
			if (this.activepath >= 0) {
				var $node = this.pathholder.children('path').eq(this.activepath);
				var move = $node.attr('d').split('L').length;
				this.activepath = -1;
				
				if (move < 2 || (falseTouch && move < 3)) {
					this.pathholder.children('path').eq(this.activepath).remove();
					return;
				}
				
				//updateVispad();
				
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
		
		this.canvas[0].mousedownHdl = function(x, y) {
			this.logtime = $.now();			
		};
		
		this.canvas[0].mouseupHdl = function() {
		};
		
		this.canvas[0].mousemoveHdl = function(x, y) {
		};

		this.canvas[0].mousewheelHdl = function(delta) {
			if (delta > 0) {
				this.creator.zoom(this.creator.z + (this.creator.z < 1 ? 0.1 : 1));
			}
			else {
				this.creator.zoom(this.creator.z - (this.creator.z <= 1 ? 0.1 : 1));
			}
		};
		
		// Bind event handlers to Mouse events
		this.canvas.on('mousedown touchstart', function(evt){
			var e = evt.originalEvent;
			var x = e.touches ? e.touches[0].pageX : e.pageX;
			var y = e.touches ? e.touches[0].pageY : e.pageY;
			e.preventDefault();

			this.mouseX = x;
			this.mouseY = y;				

			if (e.button==0) this.bBtnLeft = true;
			if (e.button==1) this.bBtnMiddle = true;
			if (e.button==2) this.bBtnRight = true;

			if (e.touches) {
				if (e.touches.length == 2){
					this.pinchDelta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2);
					this.pinch = 1;
				}
				if (e.touches.length > 1) {
					this.mouseupHdl();
					return;
				}
			}
			this.mousedownHdl(x, y);			
		});
		this.canvas.on('mouseup mouseleave touchend',function(evt){
			var e = evt.originalEvent;
			e.preventDefault();
			if (e.button==0) this.bBtnLeft = false;
			if (e.button==1) this.bBtnMiddle = false;
			if (e.button==2) this.bBtnRight = false;
			this.mouseupHdl();
		});
		this.canvas.on('mousemove touchmove', function(evt){
			var e = evt.originalEvent;
			var x = e.touches ? e.touches[0].pageX : e.pageX;
			var y = e.touches ? e.touches[0].pageY : e.pageY;
			e.preventDefault();
			this.mouseX = x;
			this.mouseY = y;
			if (this.bBtnMiddle || (this.bBtnLeft && this.bBtnRight)) {
				this.creator.offset('x', precision(e.pageX, 3) - this.mouseX);
				this.creator.offset('y', precision(e.pageY, 3) - this.mouseY);
			}
			if (e.touches) {
				if (e.touches.length == 2) {
					this.pinch += 1;
					if (this.pinch > this.pinchSensitivity) {
						var delta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2) - this.pinchDelta;
						this.mousewheelHdl(delta);
						this.pinchDelta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2);
						this.pinch = 0;
					}
				}
				if (e.touches.length > 1) {
					return;
				}
			}
			this.mousemoveHdl(x, y);
		});
		this.canvas.on('mousewheel DOMMouseScroll', function (evt){
			var e = evt.originalEvent;
			var delta = e.wheelDelta > 0 || e.detail < 0 ? 1 : -1;
			var x = e.touches ? e.touches[0].pageX : e.pageX;
			var y = e.touches ? e.touches[0].pageY : e.pageY;
			e.preventDefault();
			this.creator.zcenterX = x / this.creator.width();
			this.creator.zcenterY = y / this.creator.height();
			this.mousewheelHdl(delta);
		});
	}
	
	// Append to Namespace
	gatherhub.SketchPad = SketchPad;
})();