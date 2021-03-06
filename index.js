'use strict';

var fs = require('fs');
var express = require('express');
var cookieParser = require('cookie-parser');
var app = express();
app.use(cookieParser());
var Snoocore = require('snoocore');

// configuration

var Config = require("./config").config;
var configProvider = new Config("config.json",{
    "appId":"your appId here",
    "appSecret": "your appSecret here",
    "port":8000
});
var config = configProvider.load();

// prepare objects

var appUrl = "http://localhost:" + config.port;
var authPage = "/auth";
var callbackUrl = appUrl + authPage;

var reddit = new Snoocore({
    userAgent: 'reddit comment cleaner',
    oauth: {
        type: 'explicit',
        duration: 'permanent',
        key: config.appId,
        secret: config.appSecret,
        redirectUri: callbackUrl,
        scope: [ 'identity', 'edit', 'history' ]
    }
});
var pollInterval = 10000;

// configuration pages, for first time running of application.

app.get('/', function (req, res) {
    return res.send('<h1>Please log in to reddit</h1><p><a href="' + reddit.getAuthUrl() + '">Login</a>');
});

// does not account for hitting "deny" / etc. Assumes that
// the user has pressed "allow"
app.get(authPage, function (req, res) {
    // In a real app, you would save the refresh token in
    // a database / etc for use later so the user does not have
    // to allow your app every time...
    return reddit.auth(req.query.code).then(function (refreshToken) {
        // Store the account (Snoocore instance) into the accounts hash
        config.refresh_token = refreshToken;
        configProvider.save(config);

        // redirect to the authenticated route
        return res.redirect('/done');
    });
});

app.get('/done', function (req, res) {
    runApp();
    res.send("Application configured and running. Restart to disable configuration interface.");
});

// actual application-logic

function errorHandler(err) {
    console.log("Error sending request to reddit:");
    console.log(err);
    console.log("Retrying later.");
    scheduleLoop();
}

function getUserName() {
    return reddit('/api/v1/me').get().then(function (result) {
        var username = result.name;
        console.log("Logged in as: " + username);
        console.log("Monitoring reddit for items to clean.");
        return username;
    });
}

function getLastCommentToKeep(user, numToKeep) {
    return reddit('/user/' + user + '/comments/').listing({
        limit: numToKeep
    }).then(function (slice) {
        if (slice.empty) {
            console.log("No comments returned when trying to get last to keep!");
            return null;
        } else {
            var numItems = slice.allChildren.length;
            // console.log("Number of comments/posts found: ", numItems);
            var lastComment = slice.allChildren[numItems - 1];
            var lastId = lastComment.kind + "_" + lastComment.data.id;
            // console.log("Last comment to keep: " + lastId);
            return lastId;
        }
    }).catch(errorHandler);
}

function deleteCommentsFromEntity(comments) {
    // all done
    if (comments.length === 0) {
        scheduleLoop();
    } else {
        var first = comments[0];
        var rest = comments.slice(1);

        var id = first.kind + "_" + first.data.id;
        var date = new Date(first.data.created * 1000);
        console.log("Deleting comment " + id + " from " + date.toString()  + ".");
        var commentBody = first.data.body;
        if (commentBody !== undefined) {
            console.log(commentBody);
        }

        reddit('/api/del').post({
            id: id
        }).then(function () {
            setTimeout(function () {
                deleteCommentsFromEntity(rest);
            }, 500);
        }).catch(errorHandler);
    }
}

function deleteComments(user, lastKeepId) {
    return reddit('/user/' + user).listing({
        after: lastKeepId,
        limit: 10
    }).then(function (slice) {
        if (slice.empty) {
            scheduleLoop();
            return null;
        } else {
            console.log("Processing " + slice.allChildren.length + " comments.");
            return deleteCommentsFromEntity(slice.allChildren);
        }
    }).catch(errorHandler);
}

var user = null;

function scheduleLoop() {
    setTimeout(function () {
        runLoop();
    }, pollInterval);
}

function runLoop() {
    return getLastCommentToKeep(user, 100).then(function (lastId) {
        if (lastId === null || lastId === undefined) {
            // no id, means deleting NEWEST comments. this is bad.
            // bail out!
            scheduleLoop();
        } else {
            return deleteComments(user, lastId);
        }
    });
}

function runApp() {
    // Print out stats about the user, that's it.
    getUserName().then(function (me) {
        user = me;
        return runLoop();
    });
}

// start configuration app-server or start app.

if (config.refresh_token === undefined) {
    app.listen(config.port, function () {
        console.log('Please go to the following URL to configure the app: ' + appUrl);
    });
} else {
    reddit.refresh(config.refresh_token).then(function () {
        runApp();
    });
}
