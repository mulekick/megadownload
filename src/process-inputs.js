/* eslint-disable no-confusing-arrow */
/* eslint-disable prefer-template */
'use strict';

class probedMedia {
    constructor({referer = null, duration = null, audio = null, video = null, target = null, options = null} = {}) {
        // eslint-disable-next-line object-curly-newline
        Object.assign(this, {referer, duration, audio, video, target, options});
    }
}

const
    // ---------------------------------------------------------------------------------
    // load modules
    {createInterface} = require(`readline`),
    {rm} = require(`fs`),
    {uniqueNamesGenerator, adjectives, colors, languages, starWars} = require(`unique-names-generator`),
    {probeMedia} = require(`./probe-media`),
    {pullMedia} = require(`./pull-media`),
    {extractUrls, output, logger} = require(`./utils`),
    // ---------------------------------------------------------------------------------
    // Config module
    {vimeoUrlBandAid, MEDIA_FORMATS, VIDEO_CODEC_FILE_EXT, AUDIO_CODEC_FILE_EXT} = require(`./config`),
    // ---------------------------------------------------------------------------------
    // user confirmation
    confirmFetch = m => new Promise((resolve, reject) => {
        createInterface({
            input: process.stdin,
            output: process.stdout
        })
            .question(`${ m }\nDo you want to pull the above media to your hard drive ? (Y/n) ?\n`, ans => ans === `Y` ? resolve() : reject(new Error(`operation canceled.`)));
    }),
    // ---------------------------------------------------------------------------------
    // program options
    // eslint-disable-next-line complexity
    processInputs = async({inputFiles, outputDir, minDuration, minStreams, audioOnly, dumpUrls, verbose, logFile}) => {

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
                [ promisesArray, resultsArray, eventLog ] = [ [], null, null ];

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
                // apply vimeo band aid so
                // fetch can resolve the correct file
                // and feed it to probe afterwards
                .map(x => vimeoUrlBandAid(x))
                // sort
                .sort();

            // log urls to process
            eventLog = `---------------------------------\n` +
                        `TOTAL URLS : ${ resultsArray.length }\n` +
                        `---------------------------------\n` +
                        resultsArray
                            .join(`\n`);

            // output
            pLog.writeLog(eventLog);

            if (dumpUrls) {

                // turn logger off
                pLog.closeLog();

                // wait for the logger to complete the writes ...
                await pLog.writesCompleted();

                // output eventlog
                process.stdout.write(`${ eventLog }\n`);

                // return success code
                process.exit(0);

            }

            process.stdout.write(`---------------------------------\n`);
            process.stdout.write(`probing the internet for media, please wait...\n`);

            const
                // init probes progress bar
                probeBar = pOut.startProbeBar(resultsArray.length);

            // init array for asynchronous functions processing
            promisesArray = [];

            // for each file to process
            for (let counter = 0; counter < resultsArray.length; counter++)
                // start async function immediately
                promisesArray.push(probeMedia(resultsArray[counter], probeBar));

            // await the resolution of all promises
            resultsArray = await Promise.all(promisesArray);

            const
                // logs
                [ failedFetches, failedProbes, invalidProbes, successfulProbes ] = [ [], [], [], [] ];

            // filter failed fetchings and default options
            resultsArray = resultsArray
                .filter(x => {
                    switch (true) {
                    case !x[`fetched`] :
                        failedFetches.push(`${ x[`url`] }\n${ x[`errmsg`] }\n`);
                        return false;
                    case !x[`probed`] :
                        failedProbes.push(`${ x[`url`] }\n${ x[`errmsg`] }\n`);
                        return false;
                    case x[`metadata`][`format`][`duration`] === `N/A` :
                        invalidProbes.push(`${ x[`url`] }\ninvalid probe: unknown media duration\n`);
                        return false;
                    case Number(x[`metadata`][`format`][`duration`]) < minDuration :
                        invalidProbes.push(`${ x[`url`] }\ninvalid probe: media duration is only ${ x[`metadata`][`format`][`duration`] } seconds\n`);
                        return false;
                    case Number(x[`metadata`][`format`][`nb_streams`]) < minStreams :
                        invalidProbes.push(`${ x[`url`] }\ninvalid probe: media only contains ${ x[`metadata`][`format`][`nb_streams`] } streams\n`);
                        return false;
                    case !MEDIA_FORMATS.includes(x[`metadata`][`format`][`format_long_name`]) :
                        invalidProbes.push(`${ x[`url`] }\ninvalid probe: media format/mime type is ${ x[`metadata`][`format`][`format_long_name`] }\n`);
                        return false;
                    default :
                        return true;
                    }
                });


            // log failed fetches and probes
            eventLog = `---------------------------------\n` +
                        `FAILED FETCHES : ${ failedFetches.length }\n` +
                        failedFetches
                            .join(`\n`) +
                        `---------------------------------\n` +
                        `FAILED PROBES : ${ failedProbes.length }\n` +
                        failedProbes
                            .join(`\n`) +
                        `---------------------------------\n` +
                        `INVALID PROBES : ${ invalidProbes.length }\n` +
                        invalidProbes
                            .join(`\n`);

            // output
            pLog.writeLog(eventLog);

            // media will be uniquely identified by referer and duration in seconds
            // we will virtually demux here by spreading the contents of metadata[`streams`]
            // then sort by duration, and let ffmpeg mux back the streams at a later stage
            resultsArray = resultsArray
                .reduce((r, x) => {
                    const
                        // extract url and duration
                        {mediaLocation, locationReferer, metadata: {format: {duration}, streams}} = x;
                    // add properties, spread, push in accumulator
                    r.push(...streams
                        // reminder: target object comes first ...
                        // also spread doesn't work on object literals ? (ES2018 noncompliant)
                        // so this rule has to be disabled
                        // eslint-disable-next-line prefer-object-spread
                        .map(stream => Object.assign({
                            // save url
                            _mediaLocation: mediaLocation,
                            // save referer
                            _mediaReferer: locationReferer,
                            // round stream durations
                            _mediaDuration: Math.ceil(Number(duration))
                        }, stream)));
                    // return
                    return r;
                }, [])
                // sort by referer
                .sort((a, b) => b[`_mediaReferer`] - a[`_mediaReferer`]);


            let
                // opting for a quadratic sorting in order to extract more media
                // streams will be ordered by referer, and then by duration
                // note : network latency will make time complexity irrelevant ...
                streamz = [];

            while (resultsArray[0]) {
                const
                    // current media referer
                    referer = resultsArray[0][`_mediaReferer`],

                    // next referer start index
                    nextRefererIndex = resultsArray.findIndex(x => x[`_mediaReferer`] !== referer),

                    referredStreams = resultsArray
                        // isolate current source streams
                        .splice(0, nextRefererIndex === -1 ? resultsArray.length : nextRefererIndex)
                        // sort by media duration (always known)
                        .sort((a, b) => b[`_mediaDuration`] - a[`_mediaDuration`]);

                // spread and push into streams ...
                streamz.push(...referredStreams);
            }

            if (audioOnly)
                streamz = streamz.filter(x => x[`codec_type`] === `audio`);

            // and isolate individual media
            while (streamz[0]) {

                const
                    // current media referer and duration
                    {_mediaReferer, _mediaDuration} = streamz[0],

                    // next media start index
                    // nextMediaIndex = streamz.findIndex(x => x[`_mediaReferer`] !== _mediaReferer || x[`_mediaDuration`] !== _mediaDuration),
                    // nextMediaIndex = streamz.findIndex(x => x[`_mediaReferer`] !== _mediaReferer || Math.abs(x[`_mediaDuration`] - _mediaDuration) > 1),
                    nextMediaIndex = audioOnly ?
                        streamz.findIndex(x => x[`_mediaReferer`] !== _mediaReferer || x[`_mediaDuration`] !== _mediaDuration) :
                        streamz.findIndex(x => x[`_mediaReferer`] !== _mediaReferer || Math.abs(x[`_mediaDuration`] - _mediaDuration) > 1),

                    // isolate media
                    mediaStreams = streamz.splice(0, nextMediaIndex === -1 ? streamz.length : nextMediaIndex),

                    // generate random name
                    fname = uniqueNamesGenerator({
                        dictionaries: [ adjectives, colors, languages, starWars ],
                        separator: ``,
                        style: `capital`,
                        length: 4
                    });

                // log media streams
                eventLog = `---------------------------------\n` +
                            `CURRENT MEDIA STREAMS : ${ mediaStreams.length }\n` +
                            mediaStreams
                                .map(x => `source: ${ x[`_mediaReferer`] }, ` +
                                          `duration: ${ x[`_mediaDuration`] }s, ` +
                                          `codec type: ${ x[`codec_type`] }, ${ x[`codec_type`] === `video` ? `frame size: ${ x[`width`] } x ${ x[`height`] }` : x[`codec_type`] === `audio` ? `sample rate: ${ x[`sample_rate`] }` : `unknown codec type` }, ` +
                                          `bit rate: ${ x[`bit_rate`] }, ` +
                                          `stream duration: ${ x[`duration`] }s`)
                                .join(`\n`);

                // output
                pLog.writeLog(eventLog);

                let
                    // init streams and options
                    [ vidStr, audStr, mapOpts, audOpts, vidOpts, fformat ] = [ null, null, [], [], [], null ];

                // isolate audio stream
                audStr = mediaStreams
                    // sort streams by highest bitrate
                    .sort((a, b) => {
                        // if both values are known
                        if (isNaN(a[`sample_rate`]) === false && isNaN(b[`sample_rate`]) === false)
                            // sort highest value first
                            return b[`sample_rate`] - a[`sample_rate`];
                        // value unknown for b
                        else if (isNaN(b[`sample_rate`]))
                            // sort a first
                            return -1;
                        // value unknown for a
                        else if (isNaN(a[`sample_rate`]))
                            // sort b first
                            return 1;
                        // both values unknown, keep a and b as is
                        return 0;
                    })[0];

                // audio stream options
                audOpts = [ `-c:a:0 copy`, `-strict experimental` ];

                if (audioOnly) {

                    // mapping options, audio only
                    mapOpts = [ `-map 0:${ audStr[`index`] }` ];

                    if (audStr[`codec_long_name`] in AUDIO_CODEC_FILE_EXT)
                        // save format ...
                        fformat = AUDIO_CODEC_FILE_EXT[audStr[`codec_long_name`]];
                    else
                        // throw error if extension is missing
                        throw new Error(`save file extension is not configured for audio codec ${ audStr[`codec_long_name`] }, aborting process.`);

                } else {

                    // isolate video stream
                    vidStr = mediaStreams
                        // sort streams by height
                        .sort((a, b) => {
                            // if both values are known
                            if (isNaN(a[`height`]) === false && isNaN(b[`height`]) === false)
                                // sort highest value first
                                return b[`height`] - a[`height`];
                            // value unknown for b
                            else if (isNaN(b[`height`]))
                                // sort a first
                                return -1;
                            // value unknown for a
                            else if (isNaN(a[`height`]))
                                // sort b first
                                return 1;
                            // both values unknown, keep a and b as is
                            return 0;
                        })[0];

                    // check that audio and video streams are present for current media, throw error if not
                    if (vidStr[`codec_type`] !== `video` || audStr[`codec_type`] !== `audio`)
                        // throw new Error(`\naudio: ${ audStr[`_mediaLocation`] }\nvideo: ${ vidStr[`_mediaLocation`] }\ncurrent media contains invalid streams, aborting process.`);
                        continue;

                    // mapping options, audio then video
                    mapOpts = [ `-map 0:${ audStr[`index`] }`, `-map 1:${ vidStr[`index`] }` ];

                    // video stream options, always copy
                    vidOpts = [ `-c:v:0 copy`, `-strict experimental` ];

                    if (vidStr[`codec_long_name`] in VIDEO_CODEC_FILE_EXT)
                        // save format ...
                        fformat = VIDEO_CODEC_FILE_EXT[vidStr[`codec_long_name`]];
                    else
                        // throw error if extension is missing
                        throw new Error(`save file extension is not configured for video codec ${ vidStr[`codec_long_name`] }, aborting process.`);

                }

                // create media
                successfulProbes
                    .push(new probedMedia({
                        referer: audioOnly ? audStr[`_mediaReferer`] : vidStr[`_mediaReferer`],
                        duration: audioOnly ? audStr[`_mediaDuration`] : vidStr[`_mediaDuration`],
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
            eventLog = `---------------------------------\n` +
                        `SUCCESSFUL PROBES: ${ successfulProbes.length }\n` +
                        `---------------------------------\n` +
                        successfulProbes
                            .map((x, i) => pOut.formatProbe(x, i))
                            .join(`\n`);

            // output
            pLog.writeLog(eventLog);

            // wait for user confirmation
            await confirmFetch(eventLog);

            // hold the line
            process.stdout.write(`\npulling media from the internet, please wait ...`);

            // start progress bars
            pOut.startDownloadBars();

            // empty promises array
            promisesArray = [];

            // for each file to process
            for (let counter = 0; counter < successfulProbes.length; counter++) {
                // assign progress bar to probe
                Object.assign(successfulProbes[counter], {
                    bar: pOut.downloadBar(successfulProbes[counter][`duration`], successfulProbes[counter][`referer`])
                });
                // start async function immediately
                promisesArray.push(pullMedia(successfulProbes[counter], audioOnly, verbose));
            }

            // await the resolution of all promises
            resultsArray = await Promise.all(promisesArray);

            // stop progress bars
            pOut.stopAllDownloadBars();

            // log successful fetches
            eventLog = `\n---------------------------------` +
                        `\n${ resultsArray
                            .map(x => x[`transcodeSuccessful`] ? x[`savedFile`] : x[`errmsg`])
                            .join(`\n`) }` +
                        `\n---------------------------------` +
                        `\ndownloads completed.`;

            // output
            pLog.writeLog(eventLog);

            // all logging is done
            pLog.closeLog();

            // wait for the logger to complete the writes ...
            await pLog.writesCompleted();

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
            pLog.writeLog(err.message);

            // all loging is done
            pLog.closeLog();

            // wait for the logger to complete the writes ...
            await pLog.writesCompleted();

            // return error code
            process.exit(1);
        }

    };
    // ---------------------------------------------------------------------------------

module.exports = {processInputs};