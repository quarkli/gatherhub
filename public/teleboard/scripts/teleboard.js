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
	};

	var penList = [
		{btn: {icon: svgicon.pen, tip: 'Black Pen'}, act: function(){sp.dragmode = false;sp.pencolor('black');}},
		{btn: {icon: svgicon.pen, iconcolor: 'red', tip: 'Red Pen'}, act: function(){sp.dragmode = false;sp.pencolor('red');}},
		{btn: {icon: svgicon.pen, iconcolor: 'green', tip: 'Green Pen'}, act: function(){sp.dragmode = false;sp.pencolor('green');}},
		{btn: {icon: svgicon.pen, iconcolor: 'blue', tip: 'Blue Pen'}, act: function(){sp.dragmode = false;sp.pencolor('blue');}},
		{btn: {icon: svgicon.eraser, tip: 'Eraser'}, act: function(){sp.dragmode = false;sp.pencolor('white');}},
		{btn: {icon: svgicon.move, tip: 'Move Canvas'}, act: function(){sp.dragmode = true;}}
	];
	var sizeList = [
		{btn: {icon: svgicon.circle, resize: 0.15, tip: 'Small (5px)'},	act: function(){sp.penwidth(5)}},
		{btn: {icon: svgicon.circle, resize: 0.05, tip: 'Tiny (1px)'}, act: function(){sp.penwidth(1)}},
		{btn: {icon: svgicon.circle, resize: 0.35, tip: 'Midium (11px)'}, act: function(){sp.penwidth(11)}},
		{btn: {icon: svgicon.circle, resize: 0.65, tip: 'Large (21px)'}, act: function(){sp.penwidth(21)}}	
	];
	var zoomList = [
		{btn: {icon: svgicon.zoomout, tip: 'Zoom Out'},	act: function(){sp.zoom(sp.zrate / 1.1);}},
		{btn: {icon: svgicon.fit, tip: 'Fit Content'}, act: function(){sp.fitcontent();}},
		{btn: {icon: svgicon.zoomin, tip: 'Zoom In'}, act: function(){sp.zoom(sp.zrate * 1.1);}}
	];
	var settingList = [
		{btn: {icon: svgicon.clear, tip: 'Clear Canvas'}, act: function(){sp.clearcanvas();}},
		{btn: {icon: svgicon.redo, tip: 'Redo'}, act: function(){sp.redo();}},
		{btn: {icon: svgicon.undo, tip: 'Undo'}, act: function(){sp.undo();}}
	];	
	var mainBtn = [
		{sublist: penList, direction: 'horizontal'},
		{sublist: sizeList, direction: 'horizontal'},
		{btn: {icon: svgicon.zoom, tip: 'Zoom'}, sublist: zoomList, direction: 'horizontal'},
		{btn: {icon: svgicon.setting, tip: 'Settings'},	sublist: settingList, direction: 'horizontal'}
	];
	var rootList = {rootlist: mainBtn, direction: 'vertical'};
	
	var toolBar = new Gatherhub.BtnMenu(rootList);
	toolBar.root.css({'position': 'absolute', 'bottom': 7, 'right': 6});
});
