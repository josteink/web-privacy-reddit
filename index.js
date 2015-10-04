'use strict';

var fs = require('fs');
var express = require('express');
var cookieParser = require('cookie-parser');
var app = express();
app.use(cookieParser());
var Snoocore = require('snoocore');

// configuration

var load_config = function () {
    var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    return config;
};

var save_config = function (config) {
    var text = JSON.stringify(config);
    fs.writeFileSync('config.json', text, 'utf8');
};

var config = load_config();

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

// configuration pages, for first time running of application.

app.get('/', function (req, res) {
    return res.send('<h1>Please log in to reddit</h1><p><a href="' + reddit.getAuthUrl() + '">Login</a>');
});

// does not account for hitting "deny" / etc. Assumes that
// the user has pressed "allow"
app.get(authPage, function(req, res) {
    // In a real app, you would save the refresh token in
    // a database / etc for use later so the user does not have
    // to allow your app every time...
    return reddit.auth(req.query.code).then(function(refreshToken) {
        // Store the account (Snoocore instance) into the accounts hash
        config.refresh_token = refreshToken;
        save_config(config);

        // redirect to the authenticated route
        return res.redirect('/done');
    });
});

app.get('/done', function(req, res) {
    runApp();
    res.send("Application configured and running. Restart to disable configuration interface.");
});

// actual application-logic

function getUserName() {
    return reddit('/api/v1/me').get().then(function(result) {
        var username = result.name;
        console.log("Logged in as: " + username);
        return username;
    });
};

function getLastCommentToKeep(user, numToKeep) {
    return reddit('/user/' + user + '/comments/').listing({
        limit: numToKeep
    }).then(function (slice) {
        if (slice.empty) {
            console.log("No comments returned when trying to get last to keep!");
            return null;
        } else {
            var lastComment = slice.allChildren[slice.allChildren.length - 1];
            var lastId = lastComment.data.id;
            console.log("Last comment to keep: " + lastId);
            return lastId;
        }
    });
}

function deleteComments(lastKeepId, user) {
    console.log('Fetching comment.');
    return reddit('/user/' + user + '/comments/').listing({
        after: lastKeepId,
        limit: 1
    }).then(function (slice) {
        if (slice.empty) {
            console.log('No comments to delete.');
            return null;
        }
        else {
            // actually delete comments
            // TODO!
            // reddit('/api/del').post({
            // });
        }
    });
}

function runApp() {
    // Print out stats about the user, that's it.
    var user = null;
    getUserName().then(function (me) {
        user = me;
        return getLastCommentToKeep(me, 10);
    }).then(function (lastId) {
        while (true) {
            var res = deleteComments(lastId, user);
            //res.wait(); ? how?
        }
        console.log("TODO: actually delete comments.");
    });
};

// start configuration app-server or start app.

if (config.refresh_token == 'undefined') {
    var server = app.listen(config.port, function () {
        console.log('Example app listening at ' + appUrl);
    });
} else {
    reddit.refresh(config.refresh_token).then(function() {
        runApp();
    });
}
