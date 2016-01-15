<?php
$hub = '';
$peer = '';
if(isset($_POST['hub'])) $hub = $_POST['hub'];
if(isset($_POST['peer'])) $peer = $_POST['peer'];
if (isset($_GET['hub'])) $hub = $_GET['hub'];
if (isset($_GET['peer'])) $peer = $_GET['peer'];
if(isset($_POST['email']) && isset($_POST['sendMail'])) {
	$to      = $_POST['email'];
	$subject = 'Gatherhub: Your hub is created';
	$headers = 'From: qli@gatherhub.com' . "\r\n" .
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
<!DOCTYPE html>
<html>
<head>
	<title>Gatherhub Teleboard</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
	<link rel="icon" href="images/ghub-logo-c.png">
    <link rel="stylesheet" href="css/bootstrap.min.css">
	<style>
	body {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	#pad {
		position: absolute;
		left: 55px;
		width: 100%;
		height: 100%;
		margin: 0px auto;
		padding: 0px;
		text-align: center;
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
		background-color: #448;
		overflow: hidden;
		z-index: 99;
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
		left: -300px;
		width: 300px;
		height: 100%;
		padding: 0px;
		margin: 0px;
		margin-bottom: -10px
		border-style: solid;
		border-width: 1px;
		border-color: #CCC;
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
	#plist {
		font-size: 16px;
		overflow-x: hidden;
		overflow-y: auto;
		z-index: 90;
	}
	#msg {
		font-size: 16px;
		overflow: hidden;
		z-index: 90;
	}
	#msgbox {
		position: absolute;
		top: 0;
		height: 90%;
		width: 100%;
		overflow-x: hidden;
		overflow-y: auto;
	}
	.leftbubble {
		max-width: 290px;
		position: relative;
		margin: 5px; 
		border-style: solid;
		-moz-border-radius: 10px;
		-webkit-border-radius: 10px;
		border-radius: 5px;
	} 
	.leftbubble:before {
		position: absolute;
		bottom: 100%; 
		left: 5; 
		width: 0; 
		height: 0; 
		border-bottom: 13px solid #AFA; 
		border-right: 13px solid transparent; 
		border-left: 0px solid transparent;
	}
	.rightbubble {
		max-width: 290px;
		position: relative;
		margin: 5px; 
		border-style: solid;
		-moz-border-radius: 10px;
		-webkit-border-radius: 10px;
		border-radius: 5px;
	} 
	.rightbubble:before {
		position: absolute;
		bottom: 100%; 
		right: 0; 
		width: 0; 
		height: 0; 
		border-bottom: 13px solid #AAF; 
		border-right: 0px solid transparent; 
		border-left: 13px solid transparent;
	}
	#tibox {
		position: absolute;
		top: 0;
		left: 0;
		display: none;
		font-size: 24px;
		border-style: none;
	}
	#tmsg {
		width: 230px;
	}
	#ts {
		position: absolute;
		bottom: 0;
		margin: 2px;
		padding: 2px;
		height: 30px;
		width: 100%;
		border-top-style: solid;
		border-top-width: 1px;
		border-top-color: #CCC;
		overflow: hidden;
	}
	</style>
  </head>
  <body>
	<div id="pad"></div>
	<div id="exp">
		<div id="plist" class="panel"></div>
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
				  <button id="btnok" type="Button" class="btn btn-default">OK</button>
			  </div>
			</div>
		  </div>
		</div>
	</div>
	<div id="cfmclr" class="modal fade" role="dialog">
		<div class="modal-dialog">
		  <div class="modal-content">
			<div class="modal-header">
			  <h4 class="modal-title">Clear Canvas</h4>
			</div>
			<div class="modal-body alert alert-danger">
			    <strong>Warning!</strong>
				All peers' canvas will be cleared and cannot be reversed, are you sure?
				<br><br>
			  <div class="form-group" style="text-align: center">
				  <button id="btnclr" type="Button" class="btn btn-default" onclick="cfmClear(1)">Clear</button>
				  <button id="btncancel" type="Button" class="btn btn-default" onclick="cfmClear(0);">Cancel</button>
			  </div>
			</div>
		  </div>
		</div>
	</div>
    <script src="scripts/jquery.min.js"></script>
    <script src="js/bootstrap.min.js"></script>
    <script src="scripts/jquery.nicescroll.min.js"></script>
    <script src="scripts/Autolinker.min.js"></script>
    <script src="scripts/svgicons.js"></script>
    <script src="scripts/gatherhub.js"></script>
    <script src="scripts/teleboard.js"></script>
	<script>
	var hub = '<?= $hub ?>';
	var peer = '<?= $peer ?>';
	</script>
  </body>
</html>
