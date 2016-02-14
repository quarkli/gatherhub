
$(function(){
	var sp = new Gatherhub.SketchPad();
	sp.appendto('#layer2');

	$(window).on('resize', function(){
		sp.width($(window).width()).height($(window).height());
	});
});