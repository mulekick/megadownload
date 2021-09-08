/* eslint-disable lines-between-class-members */
'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    // load modules
    {createInterface} = require(`readline`),
    {createWriteStream, createReadStream} = require(`fs`),
    {program} = require(`commander`),
    chalk = require(`chalk`),
    progress = require(`cli-progress`),
    // ---------------------------------------------------------------------------------
    // Config module
    {CLI_PROBE_COLOR, CLI_SAVE_COLOR, MIN_MEDIA_DURATION, MIN_NB_OF_STREAMS, LOG_FILE, PATH_RGX, ISOLATION_RGX} = require(`./config`),
    // ---------------------------------------------------------------------------------
    // file system writable options
    wsopts = {
        // write fails if path exists
        flags: `wx`,
        // encoding
        encoding: `utf8`,
        // close fd automatically
        autoClose: true,
        // emit close event
        emitClose: true
    },
    // file system readable options
    rsopts = {
        // read only
        flags: `r`,
        // encoding
        encoding: `utf8`,
        // close fd automatically
        autoClose: true,
        // emit close event
        emitClose: true
    },
    // ---------------------------------------------------------------------------------
    // CLI options validation
    validFilePath = p => {
        if (PATH_RGX.test(p) === false)
            throw new Error(`invalid path ${ p }`);
        return p;
    },
    validMinDuration = d => {
        if (d.length === 0 || isNaN(d))
            throw new Error(`invalid minimum duration ${ d }`);
        return Number(d);
    },
    validMinStreams = n => {
        if (n.length === 0 || isNaN(n))
            throw new Error(`invalid minimum number of streams ${ n }`);
        return Number(n);
    },
    // ---------------------------------------------------------------------------------
    // async url isolation
    extractUrls = file =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise((resolve, reject) => {
            const
                urls = [],
                // create readable
                rs = createReadStream(file, rsopts);
            rs
                // set event handlers
                .on(`error`, err => reject(err));
            // read file
            createInterface({
                input: rs,
                crlfDelay: Infinity
            })
                // set event handlers
                .on(`line`, line => {
                    const
                        // extract urls
                        m = line.match(ISOLATION_RGX);
                    // store matches in array
                    if (m !== null)
                        urls.push(...m);
                })
                .on(`close`, () => resolve(urls));
        });
    // ---------------------------------------------------------------------------------

class grabber {
    // ---------------------------------------------------------------------------------
    constructor({input = null, options = null}) {
        // inline caching optimization
        Object.assign(this, {input, options});
        // double-check input
        if (this.input instanceof Array)
            this.options = program
                .name(`grab-media`)
                // required
                .requiredOption(`-i, --input-files <inputFiles...>`, `http session/HAR input files`)
                .requiredOption(`-o, --output-dir <outputDir>`, `downloads/logs output directory`, validFilePath)
                // other
                .option(`-d, --min-duration <minDuration>`, `minimum media duration in seconds`, validMinDuration, MIN_MEDIA_DURATION)
                .option(`-n, --min-streams <minStreams>`, `minimum number of streams in media`, validMinStreams, MIN_NB_OF_STREAMS)
                .option(`-a, --audio`, `select audio streams only`, false)
                // debug
                .option(`-v, --verbose`, `output process and download logs`, false)
                .option(`-f, --log-file <logFile>`, `process log file`, validFilePath, LOG_FILE)
                // init
                .parse(this.input)
                .opts();
        // validate input files list
        this.options[`inputFiles`]
            .forEach(x => validFilePath(x));
    }
    // ---------------------------------------------------------------------------------
    getOptions() {
        return this.options;
    }
    // ---------------------------------------------------------------------------------
}

class output {
    // ---------------------------------------------------------------------------------
    constructor({progressBars = null}) {
        // inline caching optimization
        Object.assign(this, {progressBars});
    }
    // ---------------------------------------------------------------------------------
    // eslint-disable-next-line class-methods-use-this
    formatProbe(x, i) {
        // probe formatting
        const
            // eslint-disable-next-line no-unused-vars
            {referer, audio, video, target} = x;
        // eslint-disable-next-line prefer-template
        return  chalk.rgb(...CLI_PROBE_COLOR)(`MEDIA ${ i } FROM : ${ referer }\n`) +
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
                chalk.rgb(...CLI_SAVE_COLOR)(`SAVED AS : ${ target }\n`) +
                `---------------------------------\n`;
    }
    // ---------------------------------------------------------------------------------
    barstart() {
        // create new container for progress bars
        this.progressBars = new progress.MultiBar({
            format: `${ chalk.rgb(...CLI_SAVE_COLOR)(`{bar}`) } | ${ chalk.rgb(...CLI_PROBE_COLOR)(`{file}`) } | {value}/{total} s`,
            stream: process.stdout,
            stopOnComplete: false,
            clearOnComplete: false,
            barsize: 80,
            barCompleteChar: `\u2588`,
            barIncompleteChar: `\u2591`
        });
    }
    // ---------------------------------------------------------------------------------
    bar(total, file) {
        // create a new progress bar
        return this.progressBars
            .create(total, 0, {file: file});
    }
    // ---------------------------------------------------------------------------------
    barstop() {
        // stop all progress bars
        return this.progressBars.stop();
    }
    // ---------------------------------------------------------------------------------
}

class logger {
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
    log(data) {
        if (this.logWritable)
            // write to file
            return this.logWritable.write(`${ String(data) }\n`);
        return null;
    }
    // ---------------------------------------------------------------------------------
    done(finalWrite, cbEnd) {
        if (this.logWritable)
            // signal EOF (note that cbEnd can be undefined...)
            return this.logWritable.end(finalWrite, cbEnd);
        else if (cbEnd)
            // always execute callback
            return cbEnd();
        return null;
    }
    // ---------------------------------------------------------------------------------
    finished() {
        if (this.logWritable)
            // writes completed
            return new Promise(resolve => {
                this.logWritable.once(`close`, () => resolve());
            });
        return Promise.resolve();
    }
    // ---------------------------------------------------------------------------------
}

module.exports = {output, logger, grabber, extractUrls};