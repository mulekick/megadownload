'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    {createWriteStream, rm} = require(`fs`),
    // ---------------------------------------------------------------------------------
    // file system writable options
    wsopts = {
        // write fails if path exists
        flags: `wx`,
        // close fd automatically
        autoClose: true,
        // emit close event
        emitClose: true
    },
    // ---------------------------------------------------------------------------------
    // log formatting
    formatmsg = x => {
        const
            // extract
            {url, target, fetched, probed, errmsg, mediaLocation, contentType, contentLength, metadata} = x;
        // eslint-disable-next-line prefer-template
        return  `ORIG. URL : ${ url }\n` +
                `FETCH URL : ${ mediaLocation }\n` +
                `FETCH TYPE : ${ contentType }\n` +
                `FETCH SIZE : ${ contentLength }\n` +
                `STATUS: ${ fetched ? `FETCHED` : `NOT FETCHED` }/${ probed ? `PROBED` : `NOT PROBED` }\n` +
                `ERROR MESSAGE: ${ errmsg }\n` +
                `---------------------------------\n` +
                (metadata ?
                // eslint-disable-next-line indent
                `PROBE TYPE : ${ x[`metadata`][`format`][`format_long_name`] }\n` +
                `PROBE SIZE : ${ x[`metadata`][`format`][`size`] }\n` +
                `DURATION : ${ x[`metadata`][`format`][`duration`] }\n` +
                `NUMBER OF STREAMS : ${ x[`metadata`][`format`][`nb_streams`] }\n` +
                `---------------------------------\n` : ``) +
                (target ?
                // eslint-disable-next-line indent
                `SAVED AS : ${ target }\n` +
                `---------------------------------\n` : ``);
    };
    // ---------------------------------------------------------------------------------

class logger {
    constructor(logfile) {
        // create writable stream to local path
        this.logger = createWriteStream(logfile, wsopts);
        // set event listeners for logger
        this.logger.on(`error`, err => rm(logfile, {force: true}, () => process.stderr.write(err[`message`])));
    }

    // write to file
    log(data) {
        return this.logger.write(`${ String(data) }\n`);
    }

    // signal EOF
    done() {
        this.logger.end(``);
    }

    // writes completed
    finished() {
        return new Promise(resolve => {
            this.logger.once(`close`, () => resolve());
        });
    }
}

module.exports = {logger, formatmsg};