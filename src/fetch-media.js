'use strict';

class resolver {
    constructor({mediaLocation = null, transcodeSuccessful = null, errmsg = null, savedFile = null, logFile = null} = {}) {
        // eslint-disable-next-line object-curly-newline
        Object.assign(this, {mediaLocation, transcodeSuccessful, errmsg, savedFile, logFile});
    }
}

const
    // ---------------------------------------------------------------------------------
    // load modules
    {FetchStream} = require(`fetch`),
    ffmpeg = require(`fluent-ffmpeg`),
    {createWriteStream, rm} = require(`fs`),
    // ---------------------------------------------------------------------------------
    // http readable options
    rsopts =  {
        headers: {
            Connection: `keep-alive`,
            'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36`
            // 'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1`
        }
    },
    // ---------------------------------------------------------------------------------
    fetchMedia = media =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise(resolve => {
            const
                // extract source, target, type and log
                {target, mediaLocation, contentType} = media,
                // file system writable options
                wsopts = {
                    // write fails if path exists
                    flags: `wx`,
                    // close fd automatically
                    autoClose: true,
                    // do not emit close event
                    emitClose: false
                },
                // log file
                logfileName = `${ target }.log`,
                // create writable stream to local path
                logfile = createWriteStream(logfileName, wsopts);

            // set event listeners for logger
            logfile
                .on(`error`, err => rm(`${ target }.log`, {force: true}, () => {
                    resolve(new resolver({mediaLocation: mediaLocation, transcodeSuccessful: false, errmsg: `error opening log file: ${ err[`message`] }`}));
                }));

            let
                // set probe source
                fetchSrc = null;
            // IMPOSSIBLE TO PIPE M3U8 FILES TO FFPROBE/FFMPEG ==> USE URL
            if (contentType === `m3u8`)
                // probe url
                fetchSrc = mediaLocation;
            else
                // probe readable
                fetchSrc = new FetchStream(mediaLocation, rsopts);

            const
                // create ffmpeg command
                // mp4 format needs a 'seekable' target, so we can't pipe to a writable and have to use ffmpeg's builtins
                // output format is mandatory for the wrapper, can't set it through the options
                ffcmd = ffmpeg()
                    .input(fetchSrc)
                    // .outputOptions(options)
                    .output(target);

            // set event listeners for command
            ffcmd
                .on(`start`, cmd => logfile.write(`\nffmpeg spawned:\n${ cmd }`))
                // input codec data
                .on(`codecData`, o => logfile.write(`\ninput codec data: ${ JSON.stringify(o) }`))
                // transcoding events
                .on(`stderr`, msg => logfile.write(`\n${ msg }`))
                // transcoding done
                .on(`end`, () => {
                    logfile.write(`\ntranscoding succeed.`);
                    resolve(new resolver({mediaLocation: mediaLocation, transcodeSuccessful: true, savedFile: target, logFile: logfileName}));
                })
                // transcoding error
                .on(`error`, err => rm(target, {force: true}, () => {
                    logfile.write(`\ntranscoding error occured: ${ err[`message`] }`);
                    resolve(new resolver({mediaLocation: mediaLocation, transcodeSuccessful: false, errmsg: err[`message`], logFile: logfileName}));
                }));

            // run
            ffcmd
                .run();
        });
// ---------------------------------------------------------------------------------

module.exports = {fetchMedia};