'use strict'

// create gatherhub namespace
var gatherhub = gatherhub || {};

function precision(num, p) {
	return Math.round(num * Math.pow(10,p)) / Math.pow(10,p);
}

(function(){

	function SvgCanvas(w, h) {
		this.z = 1;
		this.m = 5;
		this.x = 0;
		this.y = 0;
		this.w = w | window.innerWidth - this.m;
		this.h = h | window.innerHeight - this.m;
		this.canvas = $(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
		this.fit(w, h);
	}
	
	SvgCanvas.prototype.inserInto = function(elem) {
		if ($(elem)) {
			$(elem).append(this.canvas);
			return true;
		}
		return false;
	}

	SvgCanvas.prototype.width = function(w) {
		if (w > 0) {
			this.w = w;
			this.canvas.attr('width', this.w - this.m);
		}
		return this.canvas.attr('width');
	}

	SvgCanvas.prototype.height = function(h) {
		if (h > 0) {
			this.h = h;
			this.canvas.attr('height', this.h - this.m);
		}
		return this.canvas.attr('height');
	}

	SvgCanvas.prototype.margin = function(m) {
		if (m > 0) {
			this.m = m;
		}
		return this.m;
	}

	SvgCanvas.prototype.offset = function(axis, offset) {
		if ($.isNumeric(offset)) {
			if (axis == 'x') this.x += offset;
			if (axis == 'y') this.y += offset;
			this.canvas[0].setAttribute('viewBox', precision(this.x, 3) + ' ' + precision(this.y, 3) + ' ' + precision(this.w,3) + ' ' + precision(this.h,3));
		}
	}

	SvgCanvas.prototype.fit = function(pw, ph) {
		this.w = pw || window.innerWidth - this.m;
		this.h = ph || window.innerHeight - this.m;
		this.canvas.attr('width', this.w);
		this.canvas.attr('height',this.h);
		this.canvas[0].setAttribute('viewBox', precision(this.x, 3) + ' ' + precision(this.y, 3) + ' ' + precision(this.w, 3) + ' ' + precision(this.h, 3));
	}

	SvgCanvas.prototype.zoom = function(z) {
		if (z >= 0.1 && z <= 10) {
			this.w = this.canvas.attr('width') / z;
			this.h = this.canvas.attr('height') / z;
			this.x = (this.canvas.attr('width') - this.w) / 2;
			this.y = (this.canvas.attr('height') - this.h ) / 2;
			this.z = z;
			// when there are upper case letter in attribute name, 
			// we must use native javascript setAttribute() instead of 
			// JQuery .attr() which always convert attribute name to lower case
			this.canvas[0].setAttribute('viewBox', precision(this.x,3) + ' ' + precision(this.y,3) + ' ' + precision(this.w,3) + ' ' + precision(this.h,3));
		}
		return this.z;
	}

	SvgCanvas.prototype.calibration = function() {
		var w = this.canvas.attr('width');
		var h = this.canvas.attr('height');
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

	SvgCanvas.prototype.toString = function() {
		return this.canvas.html();
	}
	
	// add class SvgCanvas to the namespace
	gatherhub.SvgCanvas = SvgCanvas;
})();

(function(){
	function VisualPad(w, h){
		gatherhub.SvgCanvas.call(this, w, h);
	}
	
	VisualPad.prototype = new gatherhub.SvgCanvas();
	
	VisualPad.prototype.constructor = VisualPad;
	
	VisualPad.prototype.src = function(src) {
		this.canvas.html('<use xlink:href=' + src + '/>');
	}
	
	gatherhub.VisualPad = VisualPad;
})();