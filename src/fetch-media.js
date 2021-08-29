/* eslint-disable object-curly-newline */
'use strict';

class resolver {
    constructor({audioSrc = null, videoSrc = null, transcodeSuccessful = null, errmsg = null, savedFile = null, logFile = null} = {}) {
        // eslint-disable-next-line object-curly-newline
        Object.assign(this, {audioSrc, videoSrc, transcodeSuccessful, errmsg, savedFile, logFile});
    }
}

const
    // ---------------------------------------------------------------------------------
    // load modules
    ffmpeg = require(`fluent-ffmpeg`),
    {createWriteStream, rm} = require(`fs`),
    // ---------------------------------------------------------------------------------
    // Config module
    {USER_AGENT} = require(`./config`),
    // ---------------------------------------------------------------------------------
    // ffmpeg options
    FFMPEG_INPUT_OPTS = [ `-user_agent`, `'${ USER_AGENT }'` ],
    // ---------------------------------------------------------------------------------
    fetchMedia = media =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise(resolve => {
            const
                // extract source, target, type and log
                {audio, video, target, options} = media,
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
                    resolve(new resolver({audioSrc: audio[`_mediaLocation`], videoSrc: video[`_mediaLocation`], transcodeSuccessful: false, errmsg: `error opening log file: ${ err[`message`] }`}));
                }));

            const
                // create ffmpeg command
                // mp4 format needs a 'seekable' target, so we can't pipe to a writable and have to use ffmpeg's builtins
                // output format is mandatory for the wrapper, can't set it through the options
                ffcmd = ffmpeg()
                    .input(audio[`_mediaLocation`].replace(/&(?:range|bytes)=\d+-\d+/u, ``))
                    .inputOptions(FFMPEG_INPUT_OPTS)
                    .input(video[`_mediaLocation`].replace(/&(?:range|bytes)=\d+-\d+/u, ``))
                    .inputOptions(FFMPEG_INPUT_OPTS)
                    .outputOptions(options)
                    .output(target);

            // set event listeners for command
            ffcmd
                // CLI command output
                .on(`start`, cmd => logfile.write(`\nffmpeg spawned:\n${ cmd }`))
                // input codec data
                .on(`codecData`, o => logfile.write(`\ninput codec data: ${ JSON.stringify(o) }`))
                // transcoding events
                .on(`stderr`, msg => logfile.write(`\n${ msg }`))
                // transcoding done
                .on(`end`, () => {
                    // ensure all writes to log file are completed
                    logfile.end(`\ntranscoding succeed.`, () => resolve(new resolver({audioSrc: audio[`_mediaLocation`], videoSrc: video[`_mediaLocation`], transcodeSuccessful: true, savedFile: target, logFile: logfileName})));
                })
                // transcoding error
                .on(`error`, err => rm(target, {force: true}, () => {
                    // ensure all writes to log file are completed
                    // eslint-disable-next-line max-nested-callbacks
                    logfile.end(`\ntranscoding error occured: ${ err[`message`] }`, () => resolve(new resolver({audioSrc: audio[`_mediaLocation`], videoSrc: video[`_mediaLocation`], transcodeSuccessful: false, errmsg: err[`message`], logFile: logfileName})));
                }));

            // run
            ffcmd
                .run();
        });

module.exports = {fetchMedia};