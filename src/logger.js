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
    // probe formatting
    formatProbe = x => {
        const
            // extract
            // eslint-disable-next-line no-unused-vars
            {host, audio, video, target} = x;
        // eslint-disable-next-line prefer-template
        return  `\x1b[32mFROM : ${ host }\x1b[0m\n` +
                `---------------------------------\n` +
                `AUDIO STREAM ${ audio[`index`] }\n` +
                `SOURCE : ${ audio[`_mediaLocation`] }\n` +
                `TYPE : ${ audio[`codec_long_name`] }\n` +
                `SAMPLE RATE : ${ isNaN(audio[`sample_rate`]) ? `N/A` : audio[`sample_rate`] / 1000 } kHz\n` +
                `BIT RATE : ${ isNaN(audio[`bit_rate`]) ? `N/A` : audio[`bit_rate`] / 1000 } kbps\n` +
                `LAYOUT : ${ audio[`channel_layout`] }\n` +
                `DURATION : ${ audio[`duration`] }\n` +
                `---------------------------------\n` +
                `VIDEO STREAM ${ video[`index`] }\n` +
                `SOURCE : ${ video[`_mediaLocation`] }\n` +
                `TYPE : ${ video[`codec_long_name`] }\n` +
                `RESOLUTION : ${ video[`width`] }x${ video[`height`] }\n` +
                `BIT RATE : ${ isNaN(video[`bit_rate`]) ? `N/A` : video[`bit_rate`] / 1000 } kbps\n` +
                `DURATION : ${ video[`duration`] }\n` +
                `---------------------------------\n` +
                `\x1b[31mSAVED AS : ${ target }\x1b[0m\n` +
                `---------------------------------\n`;
    };

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

module.exports = {logger, formatProbe};