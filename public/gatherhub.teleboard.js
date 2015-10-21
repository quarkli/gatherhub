'use strict'

// create gatherhub namespace
var gatherhub = gatherhub || {};

function precision(num, p) {
	return Math.round(num * Math.pow(10,p)) / Math.pow(10,p);
}

(function(){
	SvgCanvas.prototype.z = 1;  // zoom ratio, 0.1 <= z <= 10
	SvgCanvas.prototype.m = 5;  // canvas margin
	SvgCanvas.prototype.x = 0;  // canvas viewBox_x
	SvgCanvas.prototype.y = 0;  // canvas viewBox_y
	SvgCanvas.prototype.w = 0;  // canvas viewBox_w
	SvgCanvas.prototype.h = 0;  // canvas viewBox_h
	SvgCanvas.prototype.canvas;

	SvgCanvas.prototype.toString = function() {
		return this.canvas.html();
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
		if ($(elem)) $(elem).append(this.canvas);
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

	function SvgCanvas(w, h) {
		this.canvas = $(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
		this.fit(w, h);
	}
	
	// add class SvgCanvas to the namespace
	gatherhub.SvgCanvas = SvgCanvas;
})();

(function(){
	function VisualPad(w, h, src){
		gatherhub.SvgCanvas.call(this, w, h);
		if ($(src)) this.src(src);
		this.canvas.css('display', 'block');
		this.canvas.css('position', 'absolute');
		this.canvas.css('top', '0px');
		this.canvas.css('left', '0px');
	}
	
	VisualPad.prototype = new gatherhub.SvgCanvas();
	
	VisualPad.prototype.constructor = VisualPad;
	
	VisualPad.prototype.src = function(src) {
		this.canvas.html('<use xlink:href=' + src + '/>');
	}
	
	gatherhub.VisualPad = VisualPad;
})();