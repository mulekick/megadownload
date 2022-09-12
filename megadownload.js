#!/usr/bin/env node

// import modules
import {megadownload} from "./src/utils.js";
import {processFiles} from "./src/process-files.js";

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
    process.stderr.write(`---------------------------------\n`);
    process.stderr.write(`error occured: ${ err.message }\n`);
    process.stderr.write(`\n`);

    // return error code
    process.exit(1);

}