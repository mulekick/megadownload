'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    {createWriteStream} = require(`fs`),
    _colors = require(`colors`),
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
    formatProbe = (x, i) => {
        const
            // extract
            // eslint-disable-next-line no-unused-vars
            {referer, audio, video, target} = x;
        // eslint-disable-next-line prefer-template
        return  _colors.green(`MEDIA ${ i } FROM : ${ referer }\n`) +
                `---------------------------------\n` +
                `AUDIO STREAM ${ audio[`index`] }\n` +
                // `SOURCE : ${ audio[`_mediaLocation`] }\n` +
                `TYPE : ${ audio[`codec_long_name`] }\n` +
                `SAMPLE RATE : ${ isNaN(audio[`sample_rate`]) ? `N/A` : audio[`sample_rate`] / 1000 } kHz\n` +
                `BIT RATE : ${ isNaN(audio[`bit_rate`]) ? `N/A` : audio[`bit_rate`] / 1000 } kbps\n` +
                `LAYOUT : ${ audio[`channel_layout`] }\n` +
                `DURATION : ${ audio[`duration`] }\n` +
                `---------------------------------\n` +
                `VIDEO STREAM ${ video[`index`] }\n` +
                // `SOURCE : ${ video[`_mediaLocation`] }\n` +
                `TYPE : ${ video[`codec_long_name`] }\n` +
                `RESOLUTION : ${ video[`width`] }x${ video[`height`] }\n` +
                `BIT RATE : ${ isNaN(video[`bit_rate`]) ? `N/A` : video[`bit_rate`] / 1000 } kbps\n` +
                `DURATION : ${ video[`duration`] }\n` +
                `---------------------------------\n` +
                _colors.red(`SAVED AS : ${ target }\n`) +
                `---------------------------------\n`;
    };

class logger {
    constructor(logfile, cbError) {
        // create writable stream to local path
        this.logger = createWriteStream(logfile, wsopts);
        // set event listeners for logger
        this.logger.on(`error`, cbError);
    }

    // write to file
    log(data) {
        return this.logger.write(`${ String(data) }\n`);
    }

    // signal EOF
    done(finalWrite, cbEnd) {
        this.logger.end(finalWrite, cbEnd);
    }

    // writes completed
    finished() {
        return new Promise(resolve => {
            this.logger.once(`close`, () => resolve());
        });
    }
}

module.exports = {logger, formatProbe};