/* eslint-disable lines-between-class-members */

// import primitives
import {createWriteStream} from "node:fs";

// import modules
import {wsopts} from "./utils.js";

class Logger {
    // ---------------------------------------------------------------------------------
    constructor({logFile = null, cbError = null, logWritable = null}) {
        // inline caching optimization
        Object.assign(this, {logFile, cbError, logWritable});
        // init log
        if (this.logFile && this.cbError) {
            // create writable stream to local path
            this.logWritable = createWriteStream(this.logFile, wsopts);
            // set event listeners for logWritable
            this.logWritable.on(`error`, this.cbError);
        }
    }
    // ---------------------------------------------------------------------------------
    writeLog(data) {
        if (this.logWritable)
            // write to file
            return this.logWritable.write(`${ String(data) }\n`);
        return null;
    }
    // ---------------------------------------------------------------------------------
    closeLog(finalWrite, cbEnd) {
        if (this.logWritable)
            // signal EOF (note that cbEnd can be undefined...)
            return this.logWritable.end(finalWrite, cbEnd);
        else if (cbEnd)
            // always execute callback
            return cbEnd();
        return null;
    }
    // ---------------------------------------------------------------------------------
    writesCompleted() {
        if (this.logWritable)
            // writes completed
            return new Promise(resolve => { this.logWritable.once(`close`, () => resolve()); });
        return Promise.resolve();
    }
    // ---------------------------------------------------------------------------------
}

export default Logger;