$(function(){
	var sp = new Gatherhub.SketchPad();
	sp.floating('absolute').borderwidth(10).bordercolor('#BAB').bgcolor('#FFFFFE').appendto('#layer1');
	//sp.calibration();

	var vp = new Gatherhub.VisualPad();
	vp.draggable = true;
	vp.floating('absolute').bgcolor('#FFF').bordercolor('#333').borderwidth(3);
	vp.defsize(sp.width()/4, sp.height()/4).minimize().appendto('body');
	//vp.showresol();

	sp.attachvp(vp);

	window.onresize = function(){
		vp.defsize(sp.width()/4, sp.height()/4).minimize();
		sp.width(sp.width()).height(sp.width()).maximize().zoom(sp.zoom());
		btnMenu.onclick();
		if (!btngrppen.key.is(':hidden')) btngrppen.key.hide();
		if (!btngrpsize.key.is(':hidden')) btngrpsize.key.hide();
		if (!btnZoomin.pad.is(':hidden')) btnZoomin.pad.hide();
		if (!btnZoomout.pad.is(':hidden')) btnZoomout.pad.hide();
		if (!btnFit.pad.is(':hidden')) btnFit.pad.hide();
		if (!btnClear.pad.is(':hidden')) btnClear.pad.hide();
		btnMenu.moveto('top', 9999).moveto('left', 9999);
	};
	  
	var aryPen = [['pen', 'black'], ['pen', 'red'], ['pen', 'green'], ['pen', 'blue'], ['eraser', 'black']];
	var btnPen = [{}];
	var btngrppen = {};
	btngrppen.key = $('<div/>').css({'position': 'absolute', 'top': '500px', 'left': '390px'}).appendTo('body');
	btngrppen.list = $('<div/>').css({'position': 'absolute', 'font-size': '0px'}).appendTo('body');

	var arySize = [['circle', 0.1, 1], ['circle', 0.25, 5], ['circle', 0.6, 11], ['circle', 1.1, 21]];
	var btnSize = [{}];
	var btngrpsize = {};
	btngrpsize.key = $('<div/>').css('position', 'absolute').appendTo('body');
	btngrpsize.key.css('left', btngrppen.key.position().left).css('top', btngrppen.key.position().top + btngrppen.key.height() - 5)
	btngrpsize.list = $('<div/>').css({'position': 'absolute', 'font-size': '0px'}).appendTo('body');
	  
	var btnZoomin = new Gatherhub.SvgButton(50, 50).floating('absolute').appendto('body');
	btnZoomin.canvas.css('fill', '#99D').html(svgicon.zoomin);
	btnZoomin.bordercolor('#99D').borderwidth(2).borderradius(.25).bgcolor('#FFF').fitcontent();
	btnZoomin.onclick = function(){
		if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
		if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();
		sp.zcenter.x = sp.zcenter.y = 0.5;
		if (sp.zrate < 1) sp.zoom(sp.zrate + 0.1);
		else sp.zoom(sp.zrate + 1);
	};
	btnZoomin.pad.hide();

	var btnFit = new Gatherhub.SvgButton(50, 50).floating('absolute').appendto('body');
	btnFit.canvas.css('fill', '#99D').html(svgicon.fit);
	btnFit.bordercolor('#99D').borderwidth(2).borderradius(.25).bgcolor('#FFF').fitcontent();
	btnFit.onclick = function(){
		if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
		if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();
		sp.fitcontent();
	};
	btnFit.pad.hide();

	var btnZoomout = new Gatherhub.SvgButton(50, 50).floating('absolute').appendto('body');
	btnZoomout.canvas.css('fill', '#99D').html(svgicon.zoomout);
	btnZoomout.bordercolor('#99D').borderwidth(2).borderradius(.25).bgcolor('#FFF').fitcontent();
	btnZoomout.onclick = function(){
		if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
		if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();
		sp.zcenter.x = sp.zcenter.y = 0.5;
		if (sp.zrate > 1) sp.zoom(sp.zrate - 1);
		else sp.zoom(sp.zrate - 0.1);
	};
	btnZoomout.pad.hide();

	var btnClear = new Gatherhub.SvgButton(50, 50).floating('absolute').appendto('body');
	btnClear.canvas.css('fill', '#99D').html(svgicon.clear);
	btnClear.bordercolor('#99D').borderwidth(2).borderradius(.25).bgcolor('#FFF').fitcontent();
	btnClear.onclick = function(){
		if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
		if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();
		sp.clearcanvas();
	};
	btnClear.pad.hide();

	var btnMenu = new Gatherhub.SvgButton(50, 50).floating('absolute').appendto('body');
	btnMenu.canvas.css('fill', '#99D').html(svgicon.menu);
	btnMenu.bordercolor('#99D').borderwidth(2).borderradius(.25).bgcolor('#FFF').fitcontent();
	btnMenu.moveto('top', 9999).moveto('left', 9999);
	btnMenu.onclick = function(){
		if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
		if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();

		btnClear.moveto('top', btnMenu.pad.position().top - 50).moveto('left', 9999);
		btnClear.pad.toggle();
		btnFit.moveto('top', btnClear.pad.position().top - 50).moveto('left', 9999);
		btnFit.pad.toggle();
		btnZoomout.moveto('top', btnFit.pad.position().top - 50).moveto('left', 9999);
		btnZoomout.pad.toggle();
		btnZoomin.moveto('top', btnZoomout.pad.position().top - 50).moveto('left', 9999);
		btnZoomin.pad.toggle();
		btngrpsize.key.css('left', btnZoomin.pad.position().left);
		btngrpsize.key.css('top', btnZoomin.pad.position().top - 50);
		btngrpsize.key.toggle();
		btngrpsize.key.toggled = true;
		btngrppen.key.css('left', btngrpsize.key.position().left);
		btngrppen.key.css('top', btngrpsize.key.position().top - 50);
		btngrppen.key.toggle();
		btngrppen.key.toggled = true;
	};

	for (var i=0; i < arySize.length; i++){
	    btnSize[i] = {};
		btnSize[i].btn = new Gatherhub.SvgButton(50, 50).appendto(btngrpsize.list);
	    btnSize[i].btn.floating('auto').canvas.css('fill', 'black').html(svgicon[arySize[i][0]]);
	    btnSize[i].btn.bordercolor('#99D').borderwidth(2).borderradius(.25).bgcolor('#FFF').fitcontent().zoom(arySize[i][1]);
	    btnSize[i].btn.onclick = function(){
			if (btngrpsize.key.children().eq(0)[0] == this.pad[0]) {
				if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
				if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();
				if (btngrpsize.key.position().top + btngrpsize.list.height() > $(window).height()) {
					btngrpsize.list.css('top', btngrpsize.key.position().top - btngrpsize.list.height() + btngrpsize.key.height() - 5);
				}
				else {
					btngrpsize.list.css('top', btngrpsize.key.position().top);
				}
				if (btngrpsize.key.position().left / $(window).width() >= 0.5) {
					btngrpsize.list.css('left', btngrpsize.key.position().left - btngrpsize.key.width());
				}
				else {
					btngrpsize.list.css('left', btngrpsize.key.position().left + btngrpsize.key.width());
				}
			}
			else {
				for (var i=0; i<arySize.length; i++) {
					if (btnSize[i].btn === this) {
						btnSize[i].btn.appendto(btngrpsize.key);
						sp.penwidth(arySize[i][2]);
						if (arySize[i][0] == 'eraser') sp.pencolor('white');
					}
					else {
						btnSize[i].btn.appendto(btngrpsize.list);
					}
				}
			}
			btngrpsize.list.toggle();
		};
	}
	btnSize[0].btn.onclick();
	btngrpsize.key.hide();

	  
	for (var i=0; i < aryPen.length; i++){
		btnPen[i] = {};
		btnPen[i].btn = new Gatherhub.SvgButton(50, 50).appendto(btngrppen.list);
		btnPen[i].btn.floating('auto').canvas.css('fill', aryPen[i][1]).html(svgicon[aryPen[i][0]]);
		btnPen[i].btn.bordercolor('#99D').borderwidth(2).borderradius(.25).bgcolor('#FFF').fitcontent();
		btnPen[i].btn.onclick = function(){
			if (btngrppen.key.children().eq(0)[0] == this.pad[0]) {
				if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
				if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();
				if (btngrppen.key.position().top + btngrppen.list.height() > $(window).height()) {
					btngrppen.list.css('top', btngrppen.key.position().top - btngrppen.list.height() + btngrppen.key.height() - 5);
				}
				else {
					btngrppen.list.css('top', btngrppen.key.position().top);
				}
				if (btngrppen.key.position().left / $(window).width() >= 0.5) {
					btngrppen.list.css('left', btngrppen.key.position().left - btngrppen.key.width());
				}
				else {
					btngrppen.list.css('left', btngrppen.key.position().left + btngrppen.key.width());
				}
			}
			else {
				for (var i=0; i<aryPen.length; i++) {
					if (btnPen[i].btn === this) {
						btnPen[i].btn.appendto(btngrppen.key);
						sp.pencolor(aryPen[i][1]);
						if (aryPen[i][0] == 'eraser') sp.pencolor('white');
					}
					else {
						btnPen[i].btn.appendto(btngrppen.list);
					}
				}
			}
			btngrppen.list.toggle();
		};
	}
	btnPen[0].btn.onclick();
	btngrppen.key.hide();
	  
});
