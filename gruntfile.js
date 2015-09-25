module.exports = function (grunt) {
    'use strict';

    grunt.loadNpmTasks('grunt-jslint');

    grunt.initConfig({
        jslint: {
            default: {
                src: [ '*.js' ],
                exclude: [],
                directives: { // example directives
                    node: true,
                    todo: true
                },
                options: {
                    edition: 'latest', // specify an edition of jslint or use 'dir/mycustom-jslint.js' for own path
                    //junit: 'out/server-junit.xml', // write the output to a JUnit XML
                    log: 'out/server-lint.log',
                    jslintXml: 'out/server-jslint.xml',
                    errorsOnly: true, // only display errors
                    failOnError: false, // defaults to true
                    checkstyle: 'out/server-checkstyle.xml' // write a checkstyle-XML
                }
            }
        }
    });

    grunt.registerTask("default", [ "jslint" ]);

};
