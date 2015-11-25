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
    <script src="scripts/gatherhub.js"></script>
    <script src="scripts/svgicons.js"></script>
    <script src="scripts/jquery.nicescroll.min.js"></script>
    <script src="scripts/teleboard.js"></script>
    <script>
      var hub = '<?= $hub ?>';
      var peer = '<?= $peer ?>';
    </script>
    <style>
	.scrollarea {
		background-color: auto;
		display: none;
		width: 250px;
		height: 100%;
		float: left;
		overflow-y: auto;
		border-style: solid;
		border-width: 1px;
		border-top-right-radius:5px;
		border-bottom-right-radius:5px;
	}
	.collapse.width {
		display: block;
		-webkit-transition: 0.5s ease-in-out;
		-moz-transition: 0.5s ease-in-out;
		-o-transition: 0.5s ease-in-out;
		transition: 0.5s ease-in-out;
	}
	.btn {
		padding: 5px;
	}
	#menu {
		float: left;
		height: 100%;
		width: 60px;
		font-size: 0px;
		text-align: center;
		margin: 0 auto;
		background-color: #CCC;
		overflow: hidden;
	}
	#list {
		float: left;
		height: 100%;
		width: 250px;
		font-size: 0px;
		text-align: center;
		background-color: auto;
		overflow-x: hidden;
		overflow-y: auto;
		border-style: solid;
		border-width: 1px;
		border-top-right-radius:5px;
		border-bottom-right-radius:5px;
		background-color: #00C;
	}
	#eboard {
		position: absolute;
		top: 50px;
		right: 50px;
		width: 640px;
		height: 480px;
		overflow: hidden;
		background-color: #C00;
	}
	body {
		overflow: hidden;
	}
	</style>
  </head>
  <body>
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
