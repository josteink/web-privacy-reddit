'use strict';

var fs = require('fs');
var express = require('express');
var cookieParser = require('cookie-parser');
var app = express();
app.use(cookieParser());
var Snoocore = require('snoocore');

var uniqId = 0; // unique id for our user
var accounts = {}; // Snoocore instances. Each instance is a different account

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

function getInstance(accountId) {

    // Check if we already have an instance with this id. If
    // so, use this instance
    if (accounts[accountId]) {
        return accounts[accountId];
    }

    // Else, return a new instance
    return new Snoocore({
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
}


// pages

app.get('/', function (req, res) {
    var accountId = req.cookies ? req.cookies.account_id : void 0;

    // We have an account, redirect to the authenticated route
    if (accountId && typeof accounts[accountId] === 'function') {
        return res.redirect('/posts');
    }

    var reddit = getInstance();
    return res.send('<h1>Please log in to reddit</h1><p><a href="' + reddit.getAuthUrl() + '">Login</a>');
});

// does not account for hitting "deny" / etc. Assumes that
// the user has pressed "allow"
app.get(authPage, function(req, res) {
    var accountId = ++uniqId; // an account id for this instance
    var instance = getInstance(); // an account instance

    console.log(req.query.code);

    // In a real app, you would save the refresh token in
    // a database / etc for use later so the user does not have
    // to allow your app every time...
    return instance.auth(req.query.code).then(function(refreshToken) {
        // Store the account (Snoocore instance) into the accounts hash
        accounts[accountId] = instance;

        config.refresh_token = refreshToken;
        save_config(config);

        // Set the account_id cookie in the users browser so that
        // later calls we can refer to the stored instance in the
        // account hash

        console.log(accounts);
        res.cookie('account_id', String(accountId), { maxAge: 900000, httpOnly: true });

        // redirect to the authenticated route
        return res.redirect('/posts');
    });
});

app.get('/posts', function(req, res) {

    var accountId = req.cookies ? req.cookies.account_id : void 0;

    // If the user has not authenticated bump them back to the main route
    if (!accountId || typeof accounts[accountId] === 'undefined') {
        return res.redirect('/');
    }

    // Print out stats about the user, that's it.
    return accounts[accountId]('/api/v1/me').get().then(function(result) {
        var me = JSON.stringify(result, null, 4);

        return accounts[accountId]('/user/' + result.name + '/comments/').get().then(function (result2) {
            var comments = JSON.stringify(result2, null, 4);
            return res.send("ME: " + me + " COMMENTS:" + comments);
        });

        // TODO: display POSTS!
    });
});

// start server

var server = app.listen(config.port, function () {
  console.log('Example app listening at ' + appUrl);
});
