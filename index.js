
var sys = require('sys'),
    fs = require('fs'),
    http = require('http'),
    url = require('url'),
    rawjs = require('raw.js');

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// start server

http.createServer(function (req, res) {
    var url_parts = url.parse(req.url);
    sys.puts(url_parts.pathname);

    setTimeout(function () {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Hello World\n');

    }, 2000);
}).listen(config.port);

var reddit = new rawjs("raw.js example script");

var callbackUrl = "http://localhost:" + config.port + "/";
reddit.setupOAuth2(config.appId, config.appSecret, callbackUrl);


console.log("Running local server on: " + callbackUrl);

// We're ready. Ask user to authenticate!
var loginUrl = reddit.authUrl("some_random_state", ['identity','edit','history']);
console.log ("Login URL: " + loginUrl);
