# GatherHub
Connect, Collaborate, Communicate

## Keywords: 
Open, On Demand, Collaboration, Communication, Conference, Shared Whiteboard, Application Casting, Screen Casting, Audio/Video Casting

## Orientation:
Web Application (HTML5 / RoR/ JS)
Apps (Android / IOS / Windows on PC/Tablet/Mobiles)

## Abstract:
There are more and more distributed communities who have the needs to collaborate in real-time over Internet besides social communications. With Gatherhub, any one can host an interactive conference or live broadcasting session online. The purpose of Gatherhub is to help to improve the distributed real-time communication over Internet and is for everyone to use whenever they need.

## How to setup working environment:
### 1. Install ruby and rails on centos.
If you want to modify, compile gatherhub source code on CentOs 6, you could read this document.
https://github.com/quarkli/gatherhub/blob/master/doc/how_to/setup_rails_on_centos.txt

### 2. Install ruby and rails on ubuntu.
If you work on Ubuntu 14/15 you could use this document to setup environment.
https://github.com/quarkli/gatherhub/blob/master/doc/how_to/setup_rails_on_ubuntu.txt

### 3.Download source code to local VM
$ git config --global user.name "Your Name"
$ git config --global user.email your.email@example.com
$ git clone https://github.com/quarkli/gatherhub.git

### 4, Run and test rails server
$ bundle install

$ rails server

### 5. Use Cloud9 IDE to read, modify and test gatherhub.
1) open cloud9 website https://c9.io/

2) Click icon button "Sign in with GitHub", a little cat icon on the top right of webpage.

3) Enter your account information on github and do some steps for registration.

4) Enter your personal webpage and click "Repositories" link on the left side of webpage.

5) Choose "gatherhub" and press the button "clone to edit"

6) wait for some seconds, an IDE with gatherhub workspace would be create. 

7) run "bundle install" in the terminal windows on the bottom side.  And Enjoy the IDE.

8) when you want to try your modification, run "rails s -b $IP -p $PORT, a simple rails server could be  create.
 
9) Got the test link address by clicking the "Share" button on the right top, and copy the "application address" from the second input text widget on the jumping up frame.

10) Open the copied link by your browser to view your gatherhub modification result.

## deploy gatherhub on heroku
1) register a Heroku acount on https://id.heroku.com/login

2) install heroku client on your VM, it does not need in Cloud9 

3) run command

$ heroku login

$ heroku keys:add

to enter into your heroku account

4) create directory on heroku to store application

$ heroku create

5) deploy your application

$ git commit -m " save change before deployment"

$ git push heroku master

6) check the result, find the http link to verify the deployment.



##How to notify the task on Asana the code update?

When you do a github commit, you can add a Asana task number (click on the task and copy it from the URL) as #<task_number> in commit comment and it will automatically add the commit comment to Asana task.




