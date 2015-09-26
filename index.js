'use strict';

var sys = require('sys'),
    fs = require('fs'),
    http = require('http'),
    url = require('url'),
    Rawjs = require('raw.js');

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

var reddit = new Rawjs("web-privacy reddit-module");

var appUrl = "http://localhost:" + config.port;
var callbackUrl = appUrl + "/auth";
reddit.setupOAuth2(config.appId, config.appSecret, callbackUrl);
var loginUrl = reddit.authUrl("some_random_state", ['identity', 'edit', 'history'], true);

// functions

var get_param = function (req, name) {
    var url_parts = url.parse(req.url);
    var kvp = url_parts.query.split("&").filter(function (i) { return i.indexOf(name) === 0; })[0];
    var value = kvp.substring("code".length + 1);
    return value;
};

// pages

var page_error = function (req, res, code, text) {
    res.writeHead(code, {'Content-Type': 'text/html'});
    res.end('<h1>' + code + ' ' + text + '</h1>');
};

var page_redirect = function (req, res, location) {
    res.writeHead(301, {'Location': appUrl + location});
    res.end();
};

var page_content = function (req, res, html) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(html);
};

var page_welcome = function (req, res) {
    page_content(req, res, '<h1>Please log in to reddit</h1><p><a href="' + loginUrl + '">Login</a>');

};

var page_default = function (req, res) {
    // configured?
    if (config.refresh_token) {
        reddit.refreshToken = config.refresh_token;

        // authenticated?
        reddit.auth(function (err, authRes) {
            if (err) {
                page_welcome(req, res);
            } else {
                page_redirect(req, res, "/posts");
            }
        });
    } else {
        page_welcome(req, res);
    }
};

var page_auth = function (req, res) {
    var code = get_param(req, "code");
    console.log("Authentication-code: " + code);

    reddit.auth({"code": code }, function (err, response) {
        if (err) {
            page_error(req, res, 500, err);
        } else {
            config.access_token = response.access_token;
            config.refresh_token = response.refresh_token;
            save_config(config);

            page_redirect(req, res, "/posts");
        }
    });
};

var page_posts = function (req, res) {
    var posts = reddit.userComments({
        limit: 25,
        count: 0
    }, function (err, apiRes) {
        if (err) {
            page_error(req, res, 501, err);
        } else {
            page_content(req, res, apiRes);
        }
    });
};

var page_404 = function (req, res) {
    page_error(res, req, 404, "File not found");
};

// start server

http.createServer(function (req, res) {
    var url_parts = url.parse(req.url);
    sys.puts(url_parts.pathname);

    switch (url_parts.pathname) {
    case "/":
        page_default(req, res);
        break;

    case "/auth":
        page_auth(req, res);
        break;

    case "/posts":
        page_posts(res, req);
        break;

    default:
        page_404(res, req);
        break;
    }
}).listen(config.port);



console.log("Running local server on: " + appUrl);
