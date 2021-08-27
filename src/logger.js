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
            // eslint-disable-next-line no-unused-vars
            {url, target, fetched, probed, errmsg, mediaLocation, contentType, contentLength, metadata, host, height, width, bit_rate} = x;
        // eslint-disable-next-line prefer-template
        return  `\x1b[32mFROM : ${ host }\x1b[0m\n` +
                // `ORIG. URL : ${ url }\n` +
                // `FETCH URL : ${ mediaLocation }\n` +
                `FETCH TYPE : ${ contentType }\n` +
                `FETCH SIZE : ${ contentLength }\n` +
                // `STATUS: ${ fetched ? `FETCHED` : `NOT FETCHED` }/${ probed ? `PROBED` : `NOT PROBED` }\n` +
                // `ERROR MESSAGE: ${ errmsg }\n` +
                (metadata ?
                // eslint-disable-next-line indent
                `PROBE TYPE : ${ metadata[`format`][`format_long_name`] }\n` +
                `PROBE SIZE : ${ metadata[`format`][`size`] }\n` +
                // `NUMBER OF STREAMS : ${ metadata[`format`][`nb_streams`] }\n` +
                `DURATION : ${ metadata[`format`][`duration`] }\n` : ``) +
                (target ?
                // eslint-disable-next-line indent
                `RESOLUTION : ${ width }x${ height }\n` +
                `VIDEO BITRATE : ${ isNaN(bit_rate) ? `N/A` : bit_rate / 1000 } kbps\n` +
                `\x1b[31mSAVED AS : ${ target }\x1b[0m\n` : ``) +
                `---------------------------------\n`;
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