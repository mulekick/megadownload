/* eslint-disable lines-between-class-members */
'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    {createInterface} = require(`readline`),
    {createWriteStream, createReadStream} = require(`fs`),
    {program} = require(`commander`),
    chalk = require(`chalk`),
    progress = require(`cli-progress`),
    // ---------------------------------------------------------------------------------
    // Config module
    {CLI_PROBE_COLOR, CLI_SAVE_COLOR, MIN_MEDIA_DURATION, MIN_NB_OF_STREAMS, PROCESS_LOG_FILE, PATH_RGX, ISOLATION_RGX} = require(`./config`),
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

class megadownload {
    // ---------------------------------------------------------------------------------
    constructor({input = null, options = null}) {
        // inline caching optimization
        Object.assign(this, {input, options});
        // double-check input
        if (this.input instanceof Array)
            this.options = program
                .name(`megadownload`)
                // required
                .requiredOption(`-i, --input-files <inputFiles...>`, `space-separated list of input files (http sessions or HAR files)`)
                .requiredOption(`-o, --output-dir <outputDir>`, `downloaded files / logs directory path`, validFilePath)
                // other
                .option(`-d, --min-duration <minDuration>`, `minimum duration in seconds for a media to be downloaded`, validMinDuration, MIN_MEDIA_DURATION)
                .option(`-n, --min-streams <minStreams>`, `minimum number of streams in a media to be downloaded`, validMinStreams, MIN_NB_OF_STREAMS)
                .option(`-a, --audio-only`, `download only audio streams from all media and output audio files`, false)
                // debug
                .option(`-u, --dump-urls`, `parse input files, list urls selected for probing and exit`, false)
                .option(`-v, --verbose`, `write log files for main process as well as for download/transcode processes`, false)
                .option(`-f, --log-file <logFile>`, `specify main process log file path`, validFilePath, PROCESS_LOG_FILE)
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
    constructor({progressBar = null, progressBars = null}) {
        // inline caching optimization
        Object.assign(this, {progressBar, progressBars});
    }
    // ---------------------------------------------------------------------------------
    // eslint-disable-next-line class-methods-use-this
    formatProbe(x, i) {
        // probe formatting
        const
            {referer, duration, audio, video, target} = x;
        // eslint-disable-next-line prefer-template
        return  chalk.rgb(...CLI_PROBE_COLOR)(`MEDIA ${ i } FROM : ${ referer }`) +
                `\n---------------------------------\n` +
                chalk.rgb(...CLI_PROBE_COLOR)(`MEDIA DURATION : ${ duration }s`) +
                `\n---------------------------------\n` +
                `AUDIO STREAM ${ audio[`index`] }\n` +
                // `SOURCE : ${ audio[`_mediaLocation`] }\n` +
                `ENCODING : ${ audio[`codec_long_name`] }\n` +
                `SAMPLE RATE : ${ isNaN(audio[`sample_rate`]) ? `N/A` : audio[`sample_rate`] / 1000 } kHz\n` +
                `BIT RATE : ${ isNaN(audio[`bit_rate`]) ? `N/A` : audio[`bit_rate`] / 1000 } kbps\n` +
                `LAYOUT : ${ audio[`channel_layout`] }\n` +
                // `DURATION : ${ audio[`duration`] }s\n` +
                `---------------------------------\n` +
            (video === null ? `` :
                `VIDEO STREAM ${ video[`index`] }\n` +
                // `SOURCE : ${ video[`_mediaLocation`] }\n` +
                `ENCODING : ${ video[`codec_long_name`] }\n` +
                `RESOLUTION : ${ video[`width`] }x${ video[`height`] }\n` +
                `BIT RATE : ${ isNaN(video[`bit_rate`]) ? `N/A` : video[`bit_rate`] / 1000 } kbps\n` +
                // `DURATION : ${ video[`duration`] }s\n` +
                `---------------------------------\n`) +
                chalk.rgb(...CLI_SAVE_COLOR)(`SAVED AS : ${ target }`) +
                `\n---------------------------------`;
    }

    // ---------------------------------------------------------------------------------
    startProbeBar(numProbes) {
        // create single progress bar for probes ...
        this.progressBar = new progress.SingleBar({
            format: `${ chalk.rgb(...CLI_PROBE_COLOR)(`{bar}`) } | {percentage}% | ETA: {eta}s | {value}/{total}`,
            stream: process.stdout,
            stopOnComplete: true,
            clearOnComplete: true,
            barsize: 80,
            barCompleteChar: `\u2588`,
            barIncompleteChar: `\u2591`,
            autopadding: true
        });
        // start the progress bar
        this.progressBar.start(numProbes, 0);
        // return
        return this.progressBar;
    }
    // ---------------------------------------------------------------------------------
    startDownloadBars() {
        // create new container for progress bars
        this.progressBars = new progress.MultiBar({
            format: `${ chalk.rgb(...CLI_SAVE_COLOR)(`{bar}`) } | {percentage}% | ${ chalk.rgb(...CLI_PROBE_COLOR)(`{file}`) }`,
            // format: `${ chalk.rgb(...CLI_SAVE_COLOR)(`{bar}`) } | ${ chalk.rgb(...CLI_PROBE_COLOR)(`{file}`) } | {value}/{total} s`,
            stream: process.stdout,
            stopOnComplete: true,
            clearOnComplete: true,
            barsize: 80,
            barCompleteChar: `\u2588`,
            barIncompleteChar: `\u2591`,
            autopadding: true
        });
    }
    // ---------------------------------------------------------------------------------
    downloadBar(total, file) {
        // create a new progress bar
        return this.progressBars
            .create(total, 0, {file: file});
    }
    // ---------------------------------------------------------------------------------
    stopAllDownloadBars() {
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
            return new Promise(resolve => {
                this.logWritable.once(`close`, () => resolve());
            });
        return Promise.resolve();
    }
    // ---------------------------------------------------------------------------------
}

module.exports = {extractUrls, megadownload, output, logger};