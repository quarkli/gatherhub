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
			if (axis == 'x') this.x = precision(this.x + offset, 3);
			if (axis == 'y') this.y = precision(this.y + offset, 3);
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
			this.w = precision(this.w / z, 3);
			this.h = precision(this.h / z, 3);
			this.x = precision((this.width() - this.w) / 2, 3);
			this.y = precision((this.height() - this.h ) / 2, 3);
			this.z = z;
			// when there are upper case letter in attribute name, 
			// we must use native javascript setAttribute() instead of 
			// JQuery .attr() which always convert attribute name to lower case
			this.canvas[0].setAttribute('viewBox', this.x + ' ' + this.y + ' ' + this.w + ' ' + this.h);
		}
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
	}
	
	// Append to Namespace
	gatherhub.SvgCanvas = SvgCanvas;
})();

(function(){
	// Properties Prototype Declaration
	VisualPad.prototype.sc = {};  // Source Canvas
	
	// Fucntions Prototype Declaration
	VisualPad.prototype = new gatherhub.SvgCanvas();  	// Inherit from SvgCanvas
	VisualPad.prototype.constructor = VisualPad;	  	// Assign constructor
	
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
		this.pinchSensitivity(8);
		
		this.canvas[0].mousedownHdl = function(x, y) {
			if ($.now() - this.logtime < 400) {
				if ($(this).attr('width') == this.defaultWidth) {
					console.log('maximize');
					$(this).attr('width' , window.innerWidth);
					$(this).attr('height', window.innerHeight);					
				}
				else {
					console.log('minimize');
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
			var x = Math.round(e.pageX + 0.1 || e.touches[0].pageX);
			var y = Math.round(e.pageY + 0.1 || e.touches[0].pageY);
			e.preventDefault();
			if (e.pageX + 0.1 || e.touches.length == 1) {
				this.mousedownHdl(x, y);
			}
			else if (e.touches.length == 2){
				this.pinchDelta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2);
				this.pinch = 1;
			}
			else {
				this.mouseupHdl();	
			}
		});
		this.canvas.on('mouseup mouseleave touchend',function(evt){
			var e = evt.originalEvent;
			e.preventDefault();
			this.mouseupHdl();
		});
		this.canvas.on('mousemove touchmove', function(evt){
			var e = evt.originalEvent;
			var x = Math.round(e.pageX + 0.1 || e.touches[0].pageX);
			var y = Math.round(e.pageY + 0.1 || e.touches[0].pageY);
			e.preventDefault();
			if (e.pageX + 0.1 || e.touches.length == 1) {
				this.mousemoveHdl(x, y);
			}
			else if (e.touches.length == 2) {
				this.pinch += 1;
				if (this.pinch > this.pinchSensitivity) {
					var delta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2) - this.pinchDelta;
					this.mousewheelHdl(delta);
					this.pinchDelta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2);
					this.pinch = 0;
				}
			}
		});
		this.canvas.on('mousewheel', function (evt){
			var e = evt.originalEvent;
			e.preventDefault();
			this.mousewheelHdl(e.wheelDelta);
		});
	}
	
	// Append to Namespace
	gatherhub.VisualPad = VisualPad;
})();

(function(){
	// Properties Prototype Declaration
	
	// Fucntions Prototype Declaration
	SketchPad.prototype = new gatherhub.SvgCanvas();  	// Inherit from SvgCanvas
	SketchPad.prototype.constructor = SketchPad;	  	// Assign constructor
	
	
	// Constructor
	function SketchPad(w, h){
		gatherhub.SvgCanvas.call(this, w, h);
		
		// Mouse / Touch event handlers
		this.canvas[0].defaultWidth = this.canvas.attr('width');
		this.canvas[0].defaultHeight = this.canvas.attr('height');
		this.canvas[0].size = 1;
		this.pinchSensitivity(8);
		
		this.canvas[0].mousedownHdl = function(x, y) {
			if ($.now() - this.logtime < 400) {
				if ($(this).attr('width') == this.defaultWidth) {
					console.log('maximize');
					$(this).attr('width' , window.innerWidth);
					$(this).attr('height', window.innerHeight);					
				}
				else {
					console.log('minimize');
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
			var x = Math.round(e.pageX + 0.1 || e.touches[0].pageX);
			var y = Math.round(e.pageY + 0.1 || e.touches[0].pageY);
			e.preventDefault();
			if (e.pageX + 0.1 || e.touches.length == 1) {
				this.mousedownHdl(x, y);
			}
			else if (e.touches.length == 2){
				this.pinchDelta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2);
				this.pinch = 1;
			}
			else {
				this.mouseupHdl();	
			}
		});
		this.canvas.on('mouseup mouseleave touchend',function(evt){
			var e = evt.originalEvent;
			e.preventDefault();
			this.mouseupHdl();
		});
		this.canvas.on('mousemove touchmove', function(evt){
			var e = evt.originalEvent;
			var x = Math.round(e.pageX + 0.1 || e.touches[0].pageX);
			var y = Math.round(e.pageY + 0.1 || e.touches[0].pageY);
			e.preventDefault();
			if (e.pageX + 0.1 || e.touches.length == 1) {
				this.mousemoveHdl(x, y);
			}
			else if (e.touches.length == 2) {
				this.pinch += 1;
				if (this.pinch > this.pinchSensitivity) {
					var delta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2) - this.pinchDelta;
					this.mousewheelHdl(delta);
					this.pinchDelta = Math.pow(e.touches[1].pageX - x, 2) + Math.pow(e.touches[1].pageY - y, 2);
					this.pinch = 0;
				}
			}
		});
		this.canvas.on('mousewheel', function (evt){
			var e = evt.originalEvent;
			e.preventDefault();
			this.mousewheelHdl(e.wheelDelta);
		});
	}
	
	// Append to Namespace
	gatherhub.SketchPad = SketchPad;
})();