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
    pullMedia = (media, verbose) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise(resolve => {
            const
                // extract referer, streams, target, options and progress bar
                {referer, duration, audio, video, target, options, bar} = media,
                // log file
                logfileName = `${ target }.log`,
                // transcoding log
                tLog = new logger({
                    // logger being instantiated with null as logFile will result in logs being discarded ...
                    logFile: verbose ? logfileName : null,
                    cbError: err => rm(`${ target }.log`, {force: true}, () => {
                        resolve(new resolver({audioSrc: audio ? audio[`_mediaLocation`] : null, videoSrc: video ? video[`_mediaLocation`] : null, transcodeSuccessful: false, errmsg: `error opening log file: ${ err[`message`] }`}));
                    })
                }),
                // create ffmpeg command
                ffcmd = ffmpeg();

            if (audio)
                ffcmd
                    .input(audio[`_mediaLocation`])
                    .inputOptions([
                        `-user_agent`, `${ USER_AGENT }`,
                        `-referer`, `${ referer }/`
                    ]);
                // wrapper option parsing behavior needs to be fixed before this is enabled
                /*
                    .inputOptions([
                        `-headers`, `'Connection: keep-alive'`,
                        `-headers`, `'Pragma: no-cache'`,
                        `-headers`, `'Cache-Control: no-cache'`,
                        `-headers`, `'User-Agent: ${ USER_AGENT }'`,
                        `-headers`, `'Referer: ${ referer }/'`
                    ]);
                */

            if (video)
                ffcmd
                    .input(video[`_mediaLocation`])
                    .inputOptions([
                        `-user_agent`, `${ USER_AGENT }`,
                        `-referer`, `${ referer }/`
                    ]);
                // wrapper option parsing behavior needs to be fixed before this is enabled
                /*
                    .inputOptions([
                        `-headers`, `'Connection: keep-alive'`,
                        `-headers`, `'Pragma: no-cache'`,
                        `-headers`, `'Cache-Control: no-cache'`,
                        `-headers`, `'User-Agent: ${ USER_AGENT }'`,
                        `-headers`, `'Referer: ${ referer }/'`
                    ]);
                */

            ffcmd
                // mp4 format needs a 'seekable' target, so we can't pipe to a writable and have to use ffmpeg's builtins
                .outputOptions(options)
                // output format is mandatory for the wrapper, can't set it through the options
                .output(target);

            // set event listeners for command
            ffcmd
                // CLI command output
                .on(`start`, cmd => tLog.writeLog(`\nffmpeg spawned:\n${ cmd }`))
                // input codec data
                .on(`codecData`, o => tLog.writeLog(`\ninput codec data: ${ JSON.stringify(o) }`))
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
                    tLog.writeLog(`${ msg }`);
                })
                // transcoding done
                .on(`end`, () => {
                    // update and stop progress bar
                    bar.update(duration);
                    bar.stop();
                    // ensure all writes to log file are completed
                    tLog.closeLog(`\ntranscoding succeeded.`, () => {
                        resolve(new resolver({audioSrc: audio ? audio[`_mediaLocation`] : null, videoSrc: video ? video[`_mediaLocation`] : null, transcodeSuccessful: true, savedFile: target, logFile: logfileName}));
                    });
                })
                // transcoding error
                .on(`error`, err => rm(target, {force: true}, () => {
                    // ensure all writes to log file are completed
                    // eslint-disable-next-line max-nested-callbacks
                    tLog.closeLog(`\ntranscoding error occured: ${ err[`message`] }`, () => {
                        resolve(new resolver({audioSrc: audio ? audio[`_mediaLocation`] : null, videoSrc: video ? video[`_mediaLocation`] : null, transcodeSuccessful: false, errmsg: err[`message`], logFile: logfileName}));
                    });
                }));

            // run
            ffcmd
                .run();
        });

module.exports = {pullMedia};