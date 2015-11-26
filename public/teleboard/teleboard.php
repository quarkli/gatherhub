<?php
$hub = mt_rand(1000000,9999999);
$peer = '';
if(isset($_POST['hub'])) $hub = $_POST['hub'];
if(isset($_POST['peer'])) $peer = $_POST['peer'];
if (isset($_GET['hub'])) $hub = $_GET['hub'];
if (isset($_GET['peer'])) $peer = $_GET['peer'];
if(isset($_POST['email']) && isset($_POST['sendMail'])) {
	$to      = $_POST['email'];
	$subject = 'Gatherhub: Your hub is created';
	$headers = 'From: qlli@gatherhub.com' . "\r\n" .
	    'Reply-To: qli@gatherhub.com' . "\r\n" .
	    'X-Mailer: PHP/' . phpversion();
	$headers .= "MIME-Version: 1.0" . "\r\n";
	$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
	$message = '
	<html><body style="font-family: arial">
	Your hub is created at http://gatherhub.com/teleboard.php?hub='.$hub.'<br/>
	You may invite others to join your hub by forwarding this email. Enjoy the ride!<br/><br/>
	gatherhub.com
	</body><html>';
	mail($to, $subject, $message, $headers);
}
?>
<!--
teleboard.html is distributed under the permissive MIT License:

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
-->
<!DOCTYPE html>
<html>
<head>
	<title>Gatherhub Teleboard</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
	<link rel="icon" href="images/ghub-logo.png">
    <link rel="stylesheet" href="css/bootstrap.min.css">
    <script src="scripts/jquery.min.js"></script>
    <script src="js/bootstrap.min.js"></script>
    <script src="scripts/jquery.nicescroll.min.js"></script>
    <script src="scripts/svgicons.js"></script>
    <script src="scripts/gatherhub.js"></script>
    <script src="scripts/teleboard.js"></script>
	<script>
	var hub = '<?= $hub ?>';
	var peer = '<?= $peer ?>';

	$(function(){
		var mycolor = "#7FD";
		$('#plist').niceScroll();
		$('#msgbox').niceScroll();
		$('#pad').width($(window).width() - 55);
		mvp.moveto('left', 9999);

		var btnUser = new Gatherhub.SvgButton({icon: svgicon.user, w: 40, h: 40, borderradius: 1, bgcolor: '#CCC'});
		btnUser.pad.css('padding', '5px');
		btnUser.onclick = function(){toggleexp('#plist');};
		btnUser.appendto('#bgroup');
		var btnMsg = new Gatherhub.SvgButton({icon: svgicon.chat, w: 40, h: 40, resize: .7, borderradius: 1, bgcolor: '#CCC'});
		btnMsg.pad.css('padding', '5px');
		btnMsg.onclick = function(){toggleexp('#msg');};
		btnMsg.appendto('#bgroup');
		var btnSpk = new Gatherhub.SvgButton({icon: svgicon.mic, w: 40, h: 40, borderradius: 1, bgcolor: '#CCC'});
		btnSpk.pad.css('padding', '5px');
		btnSpk.onclick = function(){toggleexp('#plist');};
		btnSpk.appendto('#bgroup');
		
		function toggleexp(exp) {
			if ($(exp).position().left == 55) {
				$(exp).animate({left: -250});
			}
			else {
				$(exp).parent().children().each(function(){
					$(this).animate({left: -250});
				});
				$(exp).animate({left: 55});
			}
		}

		$('#tmsg').keyup(function(e){
			if(e.keyCode == 13){
				$('#send').click();
			}
		});		

		$('#send').on('click', function(){
			msp.sendmsg($('#tmsg').val());
			appendMsg('#msgbox', 'Me', $('#tmsg').val(), msp.repcolor);
			$('#tmsg').val('').focus();
		});
		
		$(window).on('resize', function(){
			$('#msgbox').height($(window).height() - parseInt($('#ts').css('height')) - 10);
			$('#pad').width($(window).width() - 55);
		});
		
		$("#joinhub").on('shown.bs.modal', function(){
			$(this).find('#peer').focus();
		});		
	});

	function rgb2hex(rgb) {
		rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
		function hex(x) {
			return ("0" + parseInt(x).toString(16)).slice(-2);
		}
		return '#' + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
	}

	function appendMsg(elem, sender, msg, color) {
		var lr = sender == 'Me' ? 'right' : 'left';
		var d1 = '<div class="panel-body" style="background-color: ' + color + '; text-align: ' + lr + ';">'; 
		var s1 = '<span style="font-size: 10px; color: #333">';
		var s2 = '<span style="font-weight: bold;">';

		color = color.toLowerCase();
		if (color[0] == '#' && color.length == 4) color = color.slice(0,2) + color.slice(1,3) + color.slice(2,4) + color[3];
		if ($(elem).children().length > 0 && rgb2hex($(elem).children().last().css('background-color')) == color) {
			$(elem).children().last().append($('<br>'));
			$(elem).children().last().append($(s2).html(msg));
		}
		else {
			var d = $(d1).appendTo(elem);
			$(s1).html(sender + ':').appendTo(d);
			$('<br>').appendTo(d);
			$(s2).html(msg).appendTo(d);
		}

		$(elem).height($(window).height() - parseInt($('#ts').css('height')) - 10);
		$(elem).scrollTop($(elem)[0].scrollHeight);
	}
	</script>
	<style>
	body {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: black;
	}
	#pad {
		position: absolute;
		left: 55px;
		width: 100%;
		height: 100%;
		margin: 0px auto;
		padding: 0px;
		text-align: center;
		background-color: #44F;
		overflow: hidden;
	}
	#bgroup {
		position: absolute;
		left: 0px;
		width: 55px;
		height: 100%;
		margin: 0px auto;
		padding: 0px;
		text-align: center;
		background-color: #CCC;
		overflow: hidden;
	}
	.panel.parent {
		position: absolute; 
		left: 53px; 
		margin: 0px auto; 
		padding: 0px; 
		height: 100%
	}
	.panel {
		position: absolute;
		left: -250px;
		width: 250px;
		height: 100%;
		padding: 0px;
		margin: 0px;
		margin-bottom: -10px
		border-style: solid;
		border-width: 1px;
		border-top-right-radius:5px;
		border-bottom-right-radius:5px;
		background-color: auto;
		overflow-x: hidden;
		overflow-y: auto;
	}
	.collapse.width {
		left: 0px;
		-webkit-transition: .75s;
		-moz-transition: .75s;
		-o-transition: .75s;
		transition: .75s;
	}
	.panel-body {
		padding: 6px;
		margin: 0px; 
	}
	#msgbox {
		position: absolute;
		top: 0;
		height: 90%;
		width: 100%;
	}
	#ts {
		position: absolute;
		bottom: 0;
		margin: 2px;
		padding: 2px;
		height: 30px;
		width: 100%;
	}
	</style>
  </head>
  <body>
	<div id="pad"></div>
	<div id="exp">
		<div id="plist" class="panel">
			<div class="panel-body" style="background-color: #AAF">
				<span style="margin: 10px; font-weight: bold;">Pheix Cai</span>
			</div>
			<div class="panel-body" style="background-color: #BA8">
				<span style="margin: 10px; font-weight: bold;">Quark Li</span>
			</div>
		</div>
		<div id="msg" class="panel">
			<div id="msgbox"></div>
			<div id="ts">
				<input id="tmsg" type="text">
				<button id="send" type="button">Send</button>
			</div>
		</div>
	</div>
	<div id="bgroup"></div>
	<div id="joinhub" class="modal fade" role="dialog">
		<div class="modal-dialog">
		  <div class="modal-content">
			<div class="modal-header">
			  <h4 class="modal-title">Join hub</h4>
			</div>
			<div class="modal-body">
			  <div class="form-group">
				<label for="text">Your Name:</label>
				<input type="text" class="form-control" id="peer" name="peer">
			  </div>
			  <div class="form-group" style="text-align: right;">
				<div class="checkbox">
				  <label><input type="checkbox" id="cacheOn">Remember me</label>
				</div>
				  <button type="Button" class="btn btn-default" onclick="return validateInput()">OK</button>
			  </div>
			</div>
		  </div>
	</div>
	</div>
  </body>
</html>
