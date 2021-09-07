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
    {logger} = require(`./utils`),
    // ---------------------------------------------------------------------------------
    // Config module
    {USER_AGENT, EVENT_RGX} = require(`./config`),
    // ---------------------------------------------------------------------------------
    fetchMedia = (media, debug) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise(resolve => {
            const
                // extract referer, streams, target, options and progress bar
                {referer, audio, video, target, options, bar} = media,
                // log file
                logfileName = `${ target }.log`,
                // transcoding log
                tLog = new logger({
                    // logger being instantiated with null as logFile will result in logs being discarded ...
                    logFile: debug ? logfileName : null,
                    cbError: err => rm(`${ target }.log`, {force: true}, () => {
                        resolve(new resolver({audioSrc: audio[`_mediaLocation`], videoSrc: video[`_mediaLocation`], transcodeSuccessful: false, errmsg: `error opening log file: ${ err[`message`] }`}));
                    })
                }),
                // create ffmpeg command
                // mp4 format needs a 'seekable' target, so we can't pipe to a writable and have to use ffmpeg's builtins
                // output format is mandatory for the wrapper, can't set it through the options
                ffcmd = ffmpeg()
                    .input(audio[`_mediaLocation`]
                        .replace(/&(?:range|bytes)=\d+-\d+/u, ``))
                    .inputOptions([ `-user_agent`, `'${ USER_AGENT }'`/* , `-headers`, `'Referer: ${ referer }'`*/ ])
                    .input(video[`_mediaLocation`]
                        .replace(/&(?:range|bytes)=\d+-\d+/u, ``))
                    .inputOptions([ `-user_agent`, `'${ USER_AGENT }'`/* , `-headers`, `'Referer: ${ referer }'`*/ ])
                    .outputOptions(options)
                    .output(target);

            // set event listeners for command
            ffcmd
                // CLI command output
                .on(`start`, cmd => tLog.log(`\nffmpeg spawned:\n${ cmd }`))
                // input codec data
                .on(`codecData`, o => tLog.log(`\ninput codec data: ${ JSON.stringify(o) }`))
                // transcoding events
                .on(`stderr`, msg => {
                    const
                        // transcoded duration
                        match = msg.match(EVENT_RGX);
                    // if found
                    if (match !== null) {
                        const
                            // extract transcoded time, convert in seconds
                            [ h, m, s ] = match[4].split(`:`).map(x => Number(x));
                        // update progress bar
                        bar.update(s + m * 6e1 + h * 3.6e3);
                    }
                    // log
                    tLog.log(`${ msg }`);
                })
                // transcoding done
                .on(`end`, () => {
                    // update and stop progress bar
                    bar.update(video[`_duration`]);
                    bar.stop();
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