#!/usr/bin/env node

// import primitives
import process from "node:process";

// import modules
import Megadownload from "./src/mg.js";
import processFiles from "./src/process-files.js";

try {

    const
        // ---------------------------------------------------------------------------------
        mgdl = new Megadownload({input: process.argv}),
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