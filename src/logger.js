'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    {createWriteStream} = require(`fs`),
    chalk = require(`chalk`),
    progress = require(`cli-progress`),
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
        return  chalk.green(`MEDIA ${ i } FROM : ${ referer }\n`) +
                `---------------------------------\n` +
                `AUDIO STREAM ${ audio[`index`] }\n` +
                // `SOURCE : ${ audio[`_mediaLocation`] }\n` +
                `ENCODING : ${ audio[`codec_long_name`] }\n` +
                `SAMPLE RATE : ${ isNaN(audio[`sample_rate`]) ? `N/A` : audio[`sample_rate`] / 1000 } kHz\n` +
                `BIT RATE : ${ isNaN(audio[`bit_rate`]) ? `N/A` : audio[`bit_rate`] / 1000 } kbps\n` +
                `LAYOUT : ${ audio[`channel_layout`] }\n` +
                `DURATION : ${ audio[`duration`] }\n` +
                `---------------------------------\n` +
                `VIDEO STREAM ${ video[`index`] }\n` +
                // `SOURCE : ${ video[`_mediaLocation`] }\n` +
                `ENCODING : ${ video[`codec_long_name`] }\n` +
                `RESOLUTION : ${ video[`width`] }x${ video[`height`] }\n` +
                `BIT RATE : ${ isNaN(video[`bit_rate`]) ? `N/A` : video[`bit_rate`] / 1000 } kbps\n` +
                `DURATION : ${ video[`duration`] }\n` +
                `---------------------------------\n` +
                chalk.rgb(255, 95, 0)(`SAVED AS : ${ target }\n`) +
                `---------------------------------\n`;
    };

class logger {
    constructor(logfile, cbError) {
        // create writable stream to local path
        this.logger = createWriteStream(logfile, wsopts);
        // set event listeners for logger
        this.logger.on(`error`, cbError);
    }

    barstart() {
        // create new container for progress bars
        this.progressBars = new progress.MultiBar({
            format: `${ chalk.rgb(255, 95, 0)(`{bar}`) } | ${ chalk.green(`{file}`) } | {value}/{total} s`,
            stream: process.stdout,
            stopOnComplete: false,
            clearOnComplete: false,
            barsize: 80,
            barCompleteChar: `\u2588`,
            barIncompleteChar: `\u2591`
        });
    }

    bar(total, file) {
        // create a new progress bar
        return this.progressBars
            .create(total, 0, {file: file});
    }

    barstop() {
        // stop all progress bars
        this.progressBars.stop();
    }

    log(data) {
        // write to file
        return this.logger.write(`${ String(data) }\n`);
    }

    done(finalWrite, cbEnd) {
        // signal EOF
        this.logger.end(finalWrite, cbEnd);
    }

    finished() {
        // writes completed
        return new Promise(resolve => {
            this.logger.once(`close`, () => resolve());
        });
    }
}

module.exports = {logger, formatProbe};