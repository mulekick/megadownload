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
    {rm} = require(`fs`),
    {logger} = require(`./logger`),
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
                // log file
                logfileName = `${ target }.log`,
                // transcoding log
                tLog = new logger(logfileName, err => rm(`${ target }.log`, {force: true}, () => {
                    resolve(new resolver({audioSrc: audio[`_mediaLocation`], videoSrc: video[`_mediaLocation`], transcodeSuccessful: false, errmsg: `error opening log file: ${ err[`message`] }`}));
                })),
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
                .on(`start`, cmd => tLog.log(`\nffmpeg spawned:\n${ cmd }`))
                // input codec data
                .on(`codecData`, o => tLog.log(`\ninput codec data: ${ JSON.stringify(o) }`))
                // transcoding events
                .on(`stderr`, msg => tLog.log(`\n${ msg }`))
                // transcoding done
                .on(`end`, () => {
                    // ensure all writes to log file are completed
                    tLog.done(`\ntranscoding succeeded.`, () => {
                        resolve(new resolver({audioSrc: audio[`_mediaLocation`], videoSrc: video[`_mediaLocation`], transcodeSuccessful: true, savedFile: target, logFile: logfileName}));
                    });
                })
                // transcoding error
                .on(`error`, err => rm(target, {force: true}, () => {
                    // ensure all writes to log file are completed
                    // eslint-disable-next-line max-nested-callbacks
                    tLog.done(`\ntranscoding error occured: ${ err[`message`] }`, () => {
                        resolve(new resolver({audioSrc: audio[`_mediaLocation`], videoSrc: video[`_mediaLocation`], transcodeSuccessful: false, errmsg: err[`message`], logFile: logfileName}));
                    });
                }));

            // run
            ffcmd
                .run();
        });

module.exports = {fetchMedia};