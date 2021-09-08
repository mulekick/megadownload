'use strict';

class probedMedia {
    constructor({referer = null, audio = null, video = null, target = null, options = null} = {}) {
        // eslint-disable-next-line object-curly-newline
        Object.assign(this, {referer, audio, video, target, options});
    }
}

const
    // ---------------------------------------------------------------------------------
    // load modules
    {createInterface} = require(`readline`),
    {rm} = require(`fs`),
    {extension} = require(`mime-types`),
    {uniqueNamesGenerator, adjectives, colors, languages, starWars} = require(`unique-names-generator`),
    {probeMedia} = require(`./probe-media`),
    {fetchMedia} = require(`./fetch-media`),
    {output, logger, extractUrls} = require(`./utils`),
    // ---------------------------------------------------------------------------------
    // Config module
    {vimeoUrlBandAid, removeRangeBandAid, MEDIA_FORMATS, VIDEO_FORMAT_BY_MIME_TYPE, AUDIO_FORMAT_BY_MIME_TYPE} = require(`./config`),
    // ---------------------------------------------------------------------------------
    // user confirmation
    confirmFetch = m => new Promise((resolve, reject) => {
        createInterface({
            input: process.stdin,
            output: process.stdout
        })
            // eslint-disable-next-line no-confusing-arrow
            .question(`${ m }Do you want to fetch the above media (Y/n) ?\n`, ans => ans === `Y` ? resolve() : reject(new Error(`fetch aborted.`)));
    }),
    // ---------------------------------------------------------------------------------
    // program options
    processInputs = async({inputFiles, outputDir, minDuration, minStreams, audioOnly, verbose, logFile}) => {

        const
            // ---------------------------------------------------------------------------------
            // file system log
            pLog = new logger({
                // logger being instantiated with null as logFile will result in logs being discarded ...
                logFile: verbose ? logFile : null,
                cbError: err => rm(logFile, {force: true}, () => process.stderr.write(err[`message`]))
            }),
            // ---------------------------------------------------------------------------------
            // stdout log
            pOut = new output({});
            // ---------------------------------------------------------------------------------

        try {

            let
                // variables
                [ promisesArray, resultsArray, successfulProbes, eventLog ] = [ [], null, [], null ];

            // for each file to process
            for (let counter = 0; counter < inputFiles.length; counter++)
                // start async function immediately
                promisesArray.push(extractUrls(inputFiles[counter]));

            // await the resolution of all promises
            resultsArray = await Promise.all(promisesArray);

            // aggregate results
            resultsArray = resultsArray
                .reduce((r, x) => {
                    // spread and push elements
                    r.push(...x);
                    // return
                    return r;
                }, [])
                // filter duplicates
                .filter((x, i, a) => a.indexOf(x) === i)
                // apply vimeo band aid
                .map(x => vimeoUrlBandAid(x))
                // sort
                .sort();

            // log urls to process
            // eslint-disable-next-line prefer-template
            eventLog = `---------------------------------\n` +
                        `TOTAL URLS : ${ resultsArray.length }\n` +
                        `---------------------------------\n` +
                        resultsArray
                            .join(`\n`);

            // output
            pLog.log(eventLog);

            // init array for asynchronous functions processing
            promisesArray = [];

            // for each file to process
            for (let counter = 0; counter < resultsArray.length; counter++)
                // start async function immediately
                promisesArray.push(probeMedia(resultsArray[counter]));

            // await the resolution of all promises
            resultsArray = await Promise.all(promisesArray);

            const
                // logs
                [ failedFetches, failedProbes ] = [ [], [] ];

            // filter failed fetchings and default options
            resultsArray = resultsArray
                .filter(x => {
                    switch (true) {
                    case !x[`fetched`] :
                        failedFetches.push(x);
                        return false;
                    case !x[`probed`] :
                        failedProbes.push(x);
                        return false;
                    case x[`metadata`][`format`][`duration`] === `N/A` :
                        return false;
                    case Number(x[`metadata`][`format`][`duration`]) < minDuration :
                        return false;
                    case Number(x[`metadata`][`format`][`nb_streams`]) < minStreams :
                        return false;
                    case !MEDIA_FORMATS.includes(x[`metadata`][`format`][`format_long_name`]) :
                        return false;
                    default :
                        return true;
                    }
                });


            // log failed fetches and probes
            // eslint-disable-next-line prefer-template
            eventLog = `---------------------------------\n` +
                        `FAILED FETCHES : ${ failedFetches.length }\n` +
                        failedFetches
                            .map(x => `${ x[`url`] }\n${ x[`errmsg`] }\n`)
                            .join(`\n`) +
                        `---------------------------------\n` +
                        `FAILED PROBES : ${ failedProbes.length }\n` +
                        failedProbes
                            .map(x => `${ x[`url`] }\n${ x[`errmsg`] }\n`)
                            .join(`\n`);

            // output
            pLog.log(eventLog);

            // media will be uniquely identified by their duration in seconds
            // we will virtually demux here by spreading the contents of metadata[`streams`]
            // then sort by duration, and let ffmpeg mux back the streams at a later stage
            resultsArray = resultsArray
                .reduce((r, x) => {
                    const
                        // extract url and duration
                        {mediaLocation, locationReferer, contentType, contentLength, contentRange, metadata: {format: {duration}, streams}} = x;
                    // add properties, spread, push in accumulator
                    r.push(...streams
                        // reminder: target object comes first ...
                        // also spread doesn't work on object literals ? (ES2018 noncompliant)
                        // so this rule has to be disabled
                        // eslint-disable-next-line prefer-object-spread
                        .map(stream => Object.assign({
                            // save url
                            _mediaLocation: removeRangeBandAid(mediaLocation),
                            // save referer
                            _mediaReferer: locationReferer,
                            // save file extension
                            _mediaMimeType: extension(contentType),
                            // save length
                            _mediaByteLength: contentLength,
                            // save range
                            _mediaByteRange: contentRange,
                            // round stream durations
                            _duration: Math.ceil(Number(duration))
                        }, stream)));
                    // return
                    return r;
                }, [])
                // sort by duration
                .sort((a, b) => b[`_duration`] - a[`_duration`]);

            while (resultsArray[0]) {

                const
                    // current media duration
                    duration = resultsArray[0][`_duration`],

                    // next media start index
                    // nextMediaIndex = resultsArray.findIndex(x => x[`_duration`] !== duration),
                    nextMediaIndex = audioOnly ? resultsArray.findIndex(x => x[`_duration`] !== duration) : resultsArray.findIndex(x => Math.abs(x[`_duration`] - duration) > 1),

                    // isolate media
                    mediaStreams = resultsArray.splice(0, nextMediaIndex === -1 ? resultsArray.length : nextMediaIndex),

                    // generate random name
                    fname = uniqueNamesGenerator({
                        dictionaries: [ adjectives, colors, languages, starWars ],
                        separator: ``,
                        style: `capital`,
                        length: 4
                    });

                let
                    // init streams and options
                    [ vidStr, audStr, mapOpts, audOpts, vidOpts, fformat ] = [ null, null, [], [], [], null ];

                // isolate audio stream
                audStr = mediaStreams
                    // sort streams by highest bitrate
                    // eslint-disable-next-line no-confusing-arrow
                    .sort((a, b) => a[`sample_rate`] && b[`sample_rate`] ? b[`sample_rate`] - a[`sample_rate`] : a[`sample_rate`] ? -1 : b[`sample_rate`] ? 1 : 0)[0];

                if (audioOnly) {

                    // mapping options, audio only
                    mapOpts = [ `-map 0:${ audStr[`index`] }` ];

                    // save format ...
                    fformat = AUDIO_FORMAT_BY_MIME_TYPE[audStr[`_mediaMimeType`]];

                } else {

                    // isolate video stream
                    vidStr = mediaStreams
                        // sort streams by height
                        // eslint-disable-next-line no-confusing-arrow
                        .sort((a, b) => a[`height`] && b[`height`] ? b[`height`] - a[`height`] : a[`height`] ? -1 : b[`height`] ? 1 : 0)[0];

                    // check that audio and video streams are present for current media, throw error if not
                    if (vidStr[`codec_type`] !== `video` || audStr[`codec_type`] !== `audio`)
                        throw new Error(`audio: ${ audStr[`_mediaLocation`] }\nvideo: ${ vidStr[`_mediaLocation`] }\ncurrent media contains invalid streams, aborting process.`);

                    // mapping options, audio then video
                    mapOpts = [ `-map 0:${ audStr[`index`] }`, `-map 1:${ vidStr[`index`] }` ];
                    // audio stream options, copy if same file format as video stream (except for webm/weba) ...
                    audOpts = audStr[`_mediaMimeType`] === vidStr[`_mediaMimeType`] ? [ `-c:a:0 copy` ] : audStr[`_mediaMimeType`] === `weba` && vidStr[`_mediaMimeType`] === `webm` ? [ `-c:a:0 copy` ] : [];
                    // video stream options, always copy
                    vidOpts = [ `-c:v:0 copy` ];

                    // save format ...
                    fformat = VIDEO_FORMAT_BY_MIME_TYPE[vidStr[`_mediaMimeType`]];

                }

                // create media
                successfulProbes
                    .push(new probedMedia({
                        referer: audioOnly ? audStr[`_mediaReferer`] : vidStr[`_mediaReferer`],
                        audio: audStr,
                        video: vidStr,
                        target: `${ outputDir }/${ fname.replace(/[^A-Za-z0-9]/gu, ``) }.${ fformat }`,
                        options: [ ...mapOpts, ...audOpts, ...vidOpts, `-f ${ fformat }` ]
                    }));

            }

            // no successful probes, exit
            if (successfulProbes.length === 0)
                throw new Error(`no successful probes could be performed on the selected session, exiting.`);

            // log successful probes
            // eslint-disable-next-line prefer-template
            eventLog = `---------------------------------\n` +
                        `SUCCESSFUL PROBES: ${ successfulProbes.length }\n` +
                        `---------------------------------\n` +
                        successfulProbes
                            .map((x, i) => pOut.formatProbe(x, i))
                            .join(`\n`);

            // output
            pLog.log(eventLog);

            // wait for user confirmation
            await confirmFetch(eventLog);

            // hold the line
            // eslint-disable-next-line no-unreachable
            process.stdout.write(`\nprocessing, please wait ...`);

            // start progress bars
            pOut.barstart();

            // empty promises array
            promisesArray = [];

            // for each file to process
            for (let counter = 0; counter < successfulProbes.length; counter++) {
                // assign progress bar to probe
                Object.assign(successfulProbes[counter], {
                    bar: pOut.bar(audioOnly ? successfulProbes[counter][`audio`][`_duration`] : successfulProbes[counter][`video`][`_duration`], successfulProbes[counter][`referer`])
                });
                // start async function immediately
                promisesArray.push(fetchMedia(successfulProbes[counter], audioOnly, verbose));
            }

            // await the resolution of all promises
            resultsArray = await Promise.all(promisesArray);

            // stop progress bars
            pOut.barstop();

            // log successful fetches
            eventLog = `\n---------------------------------` +
                        `\n${ resultsArray.join(`\n`) }` +
                        `\n---------------------------------` +
                        `\ndownloads completed.`;

            // output
            pLog.log(eventLog);

            // all logging is done
            pLog.done();

            // wait for the logger to complete the writes ...
            await pLog.finished();

            process.stdout.write(`\n---------------------------------`);
            process.stdout.write(`\ndone.`);
            process.stdout.write(`\n`);

            // return success code
            process.exit(0);

        } catch (err) {
            // output message to stderr
            process.stderr.write(`\n---------------------------------`);
            process.stderr.write(`\nerror occured: ${ err.message }`);
            process.stderr.write(`\n`);

            // output
            pLog.log(err.message);

            // all loging is done
            pLog.done();

            // wait for the logger to complete the writes ...
            await pLog.finished();

            // return error code
            process.exit(1);
        }

    };
    // ---------------------------------------------------------------------------------

module.exports = {processInputs};