'use strict';

var sys = require('sys'),
    fs = require('fs'),
    http = require('http'),
    url = require('url'),
    rawjs = require('raw.js');

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// configure objects

var reddit = new rawjs("raw.js example script");

var appUrl = "http://localhost:" + config.port;
var callbackUrl = appUrl + "/auth";
reddit.setupOAuth2(config.appId, config.appSecret, callbackUrl);
var loginUrl = reddit.authUrl("some_random_state", ['identity','edit','history']);

// pages

var page_welcome = function(req,res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<h1>Please log in to reddit</h1><p><a href="' + loginUrl + '">Login</a>');
};

var page_404 = function(req,res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('Not found\n');
};


// start server

http.createServer(function (req, res) {
    var url_parts = url.parse(req.url);
    sys.puts(url_parts.pathname);
    
    switch (url_parts.pathname) {
    case "/":
        page_welcome(req,res);
        break;

    case "/auth":
        page_oauth(req,res);
        break;

    case "/delete":
        page_delete(res,req);
        break;

    default:
        page_404(res, req);
        break;
    }
}).listen(config.port);



console.log("Running local server on: " + appUrl);


