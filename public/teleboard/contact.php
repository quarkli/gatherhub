<?php
$msgsent = 'false';
if (isset($_POST['email'])) {
	$sender = $_POST['sender'];
	$email = $_POST['email'];
	$subject = $_POST['subject'];
	$message = $sender . " said: \r\n\r\n" . $_POST['message'];
	$to      = 'qli@gatherhub.com, quarkli@gmail.com';
	$headers = 'From: ' . $email . "\r\n" .
		'Reply-To: ' . $email . "\r\n" .
		'X-Mailer: PHP/' . phpversion();
	$headers .= "MIME-Version: 1.0" . "\r\n";
	$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";

	mail($to, $subject, $message, $headers);
	$msgsent = 'true';
}
?>
<!DOCTYPE html>
<html>
<head>
	<title>Gatherhub - FAQ</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
	<link rel="icon" href="images/ghub-logo-c.png">
    <link rel="stylesheet" href="css/bootstrap.min.css">
	<script src="scripts/jquery.min.js"></script>
    <script src="js/bootstrap.min.js"></script>
  </head>
  <style>
  .vcenter {
    position: relative;
    top: 50%;
    transform: translateY(-50%);
  }
  </style>
  <script>
  $(function(){
	  if (<?= $msgsent ?>) $('#msgok').show();
  });
  </script>
<body>
  <nav class="navbar navbar-default">
    <div class="container-fluid">
      <div class="navbar-header">
        <a class="navbar-brand" href="/"><div class="vcenter" style="display: inline-block; float: left;">
		  <img src="images/ghub-logo-c.png" width="40"/>
		  <img src="images/ghub-banner.png" height="60"/>
		</div></a>
      </div>
      <div>
        <ul class="nav navbar-nav pull-right">
          <li><a href="/">Home</a></li>
          <li><a href="faq.html">FAQ</a></li>
          <li><a href="about.html">About</a></li>
          <li class="active"><a href="contact.php">Contact</a></li>
          <li><a href="disclaimer.html">Disclaimer</a></li>
        </ul>
      </div>
    </div>
  </nav>
  <div class="container">
    <div class="row">
      <div class="col-sm-2"></div>
      <div class="col-sm-8">
		<div id="msgok" class="alert alert-success" style="display: none">
		  <strong>Success!</strong> Your message have been submitted!
		</div>
	  </div>
      <div class="col-sm-2"></div>
	</div>
    <div class="row">
      <div class="col-sm-2"></div>
      <div class="col-sm-8">
	    <p>If there is any suggestion, question, or issue you want to submit, please kindly fill out below form  or send email directly to <a href="mailto:qli@gatherhub.com">qli@gatherhub.com</a></p>
		<form id="newHub" role="form" method="post" action="contact.php">
		  <div class="form-group">
			<label>Your Name:</label>
			<input type="text" class="form-control" id="sender" name="sender">
		  </div>
		  <div class="form-group">
			<label>Your Email:</label>
			<input type="email" class="form-control" id="email" name="email">
		  </div>
		  <div class="form-group">
			<label>Subject:</label>
			<input type="text" class="form-control" id="subject" name="subject">
		  </div>
		  <div class="form-group">
			<label>Message:</label>
			<textarea class="form-control" id="message" name="message" rows="6" style="resize: none"></textarea>
		  </div>
		  <div class="form-group" style="text-align: right;">
			  <button type="submit" class="btn btn-default">Submit</button>
		  </div>
		</form>
      </div>
      <div class="col-sm-2"></div>
    </div>
  </div>
</body>
</html>
