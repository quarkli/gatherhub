#gather hub communication engine

##Setup Environment ( if there is no "node.js" in your vm, do below process).
1, Install nvm (run once when there is no nvm/npm on your system)
check the git site https://github.com/creationix/nvm to
$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.29.0/install.sh | bash-
close terminal and restart it.

2,install node.js 
$nvm isntall 0.12
$ npm install -g browserify

3, install dependence libs
$ npm install 

4, package the source files
$ ./build.sh

