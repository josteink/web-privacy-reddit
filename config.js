
var config = function(filename, defaults) {
    var self = this;
    var fs = require("fs");

    self.load = function() {
        var config = defaults;
        
        try {
            config = JSON.parse(fs.readFileSync(filename, 'utf8'));
        }
        catch (error) {
            // if loading fails, we're probably missing the config-file.
            // write our defaults to disk to make them discoverable.
            self.save(config);
        }
        return config;
    };

    self.save = function(config) {
        var text = JSON.stringify(config);
        fs.writeFileSync(filename, text, 'utf8');
    };
};

exports.config = config;
