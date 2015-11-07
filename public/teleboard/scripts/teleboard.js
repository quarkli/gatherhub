$(function(){
	var sp = new Gatherhub.SketchPad();
	sp.floating('absolute').appendto('#layer2');
	sp.canvas.css('opacity', 0.75);	
	//sp.calibration();
	$('<h5/>').css({width: '40%', margin: '0 auto', backgroundColor: '#FF8', textAlign: 'center', 'border-bottom-left-radius': '5px', 'border-bottom-right-radius': '5px', 'font-weight': 'bold', 'border-color': '#AAA', 'border-style': 'solid', 'border-width': '1px'}).appendTo('#layer1').html('Hub: 98141');
	$('<span/>').html('<h4>Show information and pop up at this layer</h4>').css({color: 'grey', textAlign: 'right'}).appendTo('#layer1');

	var vp = new Gatherhub.VisualPad();
	vp.draggable = true;
	vp.floating('absolute').bgcolor('#FFF').bordercolor('#888').borderwidth(3);
	vp.defsize(sp.width()/4, sp.height()/4).minimize().appendto('body');

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

	var btnList = [
		{
			btn: new Gatherhub.SvgButton({icon: svgicon.pen}),
			onclick: function(){sp.pencolor('black');}
		},
		{
			btn: new Gatherhub.SvgButton({icon: svgicon.pen, iconcolor: 'red'}),
			onclick: function(){sp.pencolor('red');}
		},
		{
			btn: new Gatherhub.SvgButton({icon: svgicon.pen, iconcolor: 'green'}),
			onclick: function(){sp.pencolor('green');}
		},
		{
			btn: new Gatherhub.SvgButton({icon: svgicon.pen, iconcolor: 'blue'}),
			onclick: function(){sp.pencolor('blue');}
		},
		{
			btn: new Gatherhub.SvgButton({icon: svgicon.eraser}),
			onclick: function(){sp.pencolor('white');}
		},
		{
			btn: new Gatherhub.SvgButton({icon: svgicon.zoom}),
			sublist: [
				{
					btn: new Gatherhub.SvgButton({icon: svgicon.zoomin}),
					onclick: function(){sp.zoom(sp.zoom() * 1.1);}
				},
				{
					btn: new Gatherhub.SvgButton({icon: svgicon.fit}),
					onclick: function(){sp.fitcontent();}
				},
				{
					btn: new Gatherhub.SvgButton({icon: svgicon.zoomout}),
					onclick: function(){sp.zoom(sp.zoom() * 0.9);}
				}
			]
		},
		{
			btn: new Gatherhub.SvgButton({icon: svgicon.setting, iconcolor: 'black'}),
			sublist: [
				{
					btn: new Gatherhub.SvgButton({icon: svgicon.undo, iconcolor: 'black'}),
					onclick: function(){sp.undo();}
				},
				{
					btn: new Gatherhub.SvgButton({icon: svgicon.redo, iconcolor: 'black'}),
					onclick: function(){sp.redo();}
				},
				{
					btn: new Gatherhub.SvgButton({icon: svgicon.clear, iconcolor: 'black'}),
					onclick: function(){sp.clearcanvas();}
				}
			]
		}
	];
	
	function createMenu(list) {
		var menu = $('<div/>').css({'position': 'absolute', 'bottom': 7, 'right': 6, 'font-size': 0}).appendTo('body');
		
		for  (var i = 0; i < list.length; i++)  {
			if (list[i].sublist) {
				list[i].submenu = createMenu(list[i].sublist).hide();
				list[i].btn.appendto(menu);
				list[i].btn.onclick = function() {
					for  (var i = 0; i < list.length; i++)  {
						if (list[i].btn === this) {
							var top = menu.position().top + this.pad.position().top;
							var left = menu.position().left - 150;
							list[i].submenu.children().css('float', 'left');
							list[i].submenu.css({'top': top, 'left': left, 'bottom': 'auto', 'right': 'auto'}).toggle();
							break;
						}
					}					
				};
			}
			else {
				list[i].btn.appendto(menu);
				list[i].btn.onclick = function() {
					for  (var i = 0; i < list.length; i++)  {
						if (list[i].btn === this) {
							list[i].onclick();
							break;
						}
					}
					
				};
			}
		}
		return menu;
	}
	
	var menu = createMenu(btnList);

/*	
	var aryPen = [['pen', 'black'], ['pen', 'red'], ['pen', 'green'], ['pen', 'blue'], ['eraser', 'black']];
	var btnPen = [{}];
	var btngrppen = {};
	btngrppen.key = $('<div/>').css({'position': 'absolute', 'top': '500px', 'left': '390px'}).appendTo('body');
	btngrppen.list = $('<div/>').css({'position': 'absolute', 'font-size': '0px'}).appendTo('body');

	var arySize = [['circle', 0.05, 1], ['circle', 0.15, 5], ['circle', 0.35, 11], ['circle', .65, 21]];
	var btnSize = [{}];
	var btngrpsize = {};
	btngrpsize.key = $('<div/>').css('position', 'absolute').appendTo('body');
	btngrpsize.key.css('left', btngrppen.key.position().left).css('top', btngrppen.key.position().top + btngrppen.key.height() - 5)
	btngrpsize.list = $('<div/>').css({'position': 'absolute', 'font-size': '0px'}).appendTo('body');
	  
	var btnZoomin = new Gatherhub.SvgButton({icon: svgicon.zoomin}).floating('absolute').appendto('body');
	btnZoomin.onclick = function(){
		var offset = Math.pow(10, Math.floor(Math.log10(sp.zrate)));
		if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
		if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();
		sp.zcenter.x = sp.zcenter.y = 0.5;
		sp.zoom(sp.zrate + offset);
	};
	btnZoomin.pad.hide();

	var btnFit = new Gatherhub.SvgButton({icon: svgicon.fit}).floating('absolute').appendto('body');
	btnFit.onclick = function(){
		if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
		if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();
		sp.fitcontent();
	};
	btnFit.pad.hide();

	var btnZoomout = new Gatherhub.SvgButton({icon: svgicon.zoomout}).floating('absolute').appendto('body');
	btnZoomout.onclick = function(){
		var offset = Math.pow(10, Math.floor(Math.log10(sp.zrate)));
		if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
		if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();
		sp.zcenter.x = sp.zcenter.y = 0.5;
		if (sp.zoom() <= offset) offset /= 10;
		sp.zoom(sp.zrate - offset);
	};
	btnZoomout.pad.hide();

	var btnClear = new Gatherhub.SvgButton({icon: svgicon.clear}).floating('absolute').appendto('body');
	btnClear.onclick = function(){
		if (!btngrppen.list.is(':hidden')) btngrppen.list.hide();
		if (!btngrpsize.list.is(':hidden')) btngrpsize.list.hide();
		sp.clearcanvas();
	};
	btnClear.pad.hide();

	var btnMenu = new Gatherhub.SvgButton({icon: svgicon.menu}).floating('absolute').appendto('body');
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
		btnSize[i].btn = new Gatherhub.SvgButton({icon: svgicon[arySize[i][0]], resize: arySize[i][1]}).appendto(btngrpsize.list);
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
		btnPen[i].btn = new Gatherhub.SvgButton({icon: svgicon[aryPen[i][0]], iconcolor: aryPen[i][1]}).appendto(btngrppen.list);
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
*/
});
