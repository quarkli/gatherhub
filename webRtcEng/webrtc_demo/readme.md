#gather hub communication engine

##Setup Environment ( if there is no "node.js" in your vm, do below process).
1, Install nvm
check the git site https://github.com/creationix/nvm to
$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.29.0/install.sh | bash-
close terminal and restart it.

2,install node.js
$nvm isntall 0.12

3, install socket.io node-static
$ npm install socket.io
$ npm install node-static

##Run the demo
$ node server.js

Then you could access http://your_vm_ip:2013 to check the app
