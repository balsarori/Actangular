Actangular
==========

![alt tag](http://3.bp.blogspot.com/-jSjgwJGTT4g/VFKvUwXboFI/AAAAAAAAAGE/O7Xzr9IXFjc/s1600/task-list.png)

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


## What features are currently available?
Some of the features currently available are
* Login and logout with remember me feature support
* Managing tasks i.e. listing, sorting, creating/editing/claiming/completing/deleting, posting comments, adding/deleting identity links, uploading attachments, etc..
* Managing process instances i.e. listing, sorting, starting/deleting, adding/deleting identity links, listing related tasks, etc..
* Historic tasks and process instances listing and sorting
* Form rendering and submitting, supports string, date, boolean, and long form property types
* Task and process instance variables, supports string, date, and long variable types
* Managing models i.e. listing, creating/editing/deleting models
* Modeler integration enables modeling, converting to BPMN and deploying from the Modeler
* Process diagrams rendering using SVG (client side) and PNG (sever side)
* Multi-language, currently English and Arabic (with RTL support)


## External Resources
http://sarori.blogspot.com/2014/11/introduction-to-actangular.html
