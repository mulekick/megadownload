#!/usr/bin/env node

'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    {megadownload} = require(`./src/utils`),
    {processFiles} = require(`./src/process-files`);
    // ---------------------------------------------------------------------------------

try {

    const
        // ---------------------------------------------------------------------------------
        mgdl = new megadownload({input: process.argv}),
        opts = mgdl.getOptions();
        // ---------------------------------------------------------------------------------

    // launch
    processFiles(opts);

} catch (err) {

    // output message to stderr
    process.stderr.write(`\n---------------------------------`);
    process.stderr.write(`\nerror occured: ${ err.message }`);
    process.stderr.write(`\n`);

    // return error code
    process.exit(1);

}