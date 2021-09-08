#!/usr/bin/env node

'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    {grabber} = require(`./src/utils`),
    {processInputs} = require(`./src/process-inputs`);
    // ---------------------------------------------------------------------------------

try {

    const
        // ---------------------------------------------------------------------------------
        grab = new grabber({input: process.argv}),
        opts = grab.getOptions();
        // ---------------------------------------------------------------------------------

    // launch
    processInputs(opts);

} catch (err) {

    // output message to stderr
    process.stderr.write(`\n---------------------------------`);
    process.stderr.write(`\nerror occured: ${ err.message }`);
    process.stderr.write(`\n`);

    // return error code
    process.exit(1);

}