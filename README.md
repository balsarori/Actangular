Actangular
==========

## Getting started
Download the source code and extract it, then run 
```
mvn clean package 
mvn -Pdemo -pl actangular-webapp jetty:deploy-war
```
On your browser go to http://localhost:8080/actangular

Login using Activiti's demo users:

UserId  | Password
------- | -------------
kermit  | kermit
gonzo   | gonzo
fozzie  | fozzie


## actangular-rest - The REST API

### Authentication
Uses a ChallengeScheme.CUSTOM authenticator which accepts HTTP_BASIC authentication and cookie based authentication. 
Note that the authentication does not send a challenge request instead sends back a 401 Unauthorized response.
This allows the client side to i.e. show a custom login form.


### Resources
##### /boot
Returns list of users, groups, process definitions, and, information about logged-in user (i.e groups user is member of)

TODO add more information


## actangular-webapp - The webapp

Uses AngularJS, AngularUI Bootstrap, Restangular, angular-translate, etc! in addition to actangular-js (AngularJS and Javascripts modules)

TODO add more information

## actangular-js - AngularJS and Javascripts modules

AngularJS and Javascripts modules which that provide useable services, directives, filters, etc! 
actangular-session, actangular-identity, actangular-task, actangular-process, actangular-diagram, actangular-form, actangular-ui