'use strict';

class probedMedia {
    constructor({host = null, audio = null, video = null, target = null, options = null} = {}) {
        // eslint-disable-next-line object-curly-newline
        Object.assign(this, {host, audio, video, target, options});
    }
}

let
    // ---------------------------------------------------------------------------------
    // url storage
    urls = [];
    // ---------------------------------------------------------------------------------

const
    // ---------------------------------------------------------------------------------
    // load modules
    {createInterface} = require(`readline`),
    {rm} = require(`fs`),
    {uniqueNamesGenerator, adjectives, colors, languages, starWars} = require(`unique-names-generator`),
    {logger, formatProbe} = require(`./logger`),
    {probeMedia} = require(`./probe-media`),
    {fetchMedia} = require(`./fetch-media`),
    // ---------------------------------------------------------------------------------
    // Config module
    {MIN_MEDIA_DURATION, MIN_NB_OF_STREAMS, STREAM_FORMATS, FILE_FORMATS, DOWNLOAD_DIR, LOG_FILE, ISOLATION_RGX, HOST_RGX} = require(`./config`),
    // ---------------------------------------------------------------------------------
    // session file, download directory
    [ file, downloaddir = DOWNLOAD_DIR ] = process.argv.slice(2),
    // ---------------------------------------------------------------------------------
    // process log
    pLog = new logger(LOG_FILE, err => rm(LOG_FILE, {force: true}, () => process.stderr.write(err[`message`]))),
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
    processUrls = async() => {

        try {

            let
                // variables
                [ promisesArray, resultsArray, successfulProbes, eventLog ] = [ null, null, [], null ];

            // log urls to process
            // eslint-disable-next-line prefer-template
            eventLog = `---------------------------------\n` +
                        `TOTAL URLS : ${ urls.length }\n` +
                        `---------------------------------\n` +
                        urls
                            .join(`\n`);

            // output
            pLog.log(eventLog);

            // init array for asynchronous functions processing
            promisesArray = [];

            // for each file to process
            for (let counter = 0; counter < urls.length; counter++)
                // start async function immediately
                promisesArray.push(probeMedia(urls[counter]));

            // await the resolution of all promises
            resultsArray = await Promise.all(promisesArray);

            // filter failed fetchings and default options
            resultsArray = resultsArray
                .filter(x => {
                    switch (true) {
                    case !x[`fetched`] :
                        return false;
                    case !x[`probed`] :
                        return false;
                    case x[`metadata`][`format`][`duration`] === `N/A` :
                        return false;
                    case Number(x[`metadata`][`format`][`duration`]) < MIN_MEDIA_DURATION :
                        return false;
                    case Number(x[`metadata`][`format`][`nb_streams`]) < MIN_NB_OF_STREAMS :
                        return false;
                    case !STREAM_FORMATS.includes(x[`metadata`][`format`][`format_long_name`]) :
                        return false;
                    default :
                        return true;
                    }
                });

            // media will be uniquely identified by their duration in seconds
            // we will virtually demux here by spreading the contents of metadata[`streams`]
            // then sort by duration, and let ffmpeg mux back the streams at a later stage
            resultsArray = resultsArray
                .reduce((r, x) => {
                    const
                        // extract url and duration
                        {mediaLocation, contentType, metadata: {format: {duration}, streams}} = x;
                    // add properties, spread, push in accumulator
                    r.push(...streams
                        // reminder: target object comes first ...
                        // also spread doesn't work on object literals ? (ES2018 noncompliant)
                        // so this rule has to be disabled
                        // eslint-disable-next-line prefer-object-spread
                        .map(stream => Object.assign({
                            // save url
                            _mediaLocation: mediaLocation,
                            // save format
                            _mediaFormat: contentType,
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
                    nextMediaIndex = resultsArray.findIndex(x => x[`_duration`] !== duration),

                    // isolate media
                    mediaStreams = resultsArray.splice(0, nextMediaIndex === -1 ? resultsArray.length : nextMediaIndex),

                    // isolate video stream
                    vid = mediaStreams
                        // sort streams by height
                        // eslint-disable-next-line no-confusing-arrow
                        .sort((a, b) => a[`height`] && b[`height`] ? b[`height`] - a[`height`] : a[`height`] ? -1 : b[`height`] ? 1 : 0)[0],

                    // isolate audio stream
                    aud = mediaStreams
                        // sort streams by highest bitrate
                        // eslint-disable-next-line no-confusing-arrow
                        .sort((a, b) => a[`sample_rate`] && b[`sample_rate`] ? b[`sample_rate`] - a[`sample_rate`] : a[`sample_rate`] ? -1 : b[`sample_rate`] ? 1 : 0)[0];

                // check that audio and video streams are present for current media, throw error if not
                if (vid[`codec_type`] !== `video` || aud[`codec_type`] !== `audio`)
                    throw new Error(`audio: ${ aud[`_mediaLocation`] }\nvideo: ${ vid[`_mediaLocation`] }\ncurrent media contains invalid streams, aborting process.`);

                const
                    // extract remote server
                    [ host ] = vid[`_mediaLocation`].match(HOST_RGX).slice(1),
                    // generate random name
                    fname = uniqueNamesGenerator({
                        dictionaries: [ adjectives, colors, languages, starWars ],
                        separator: ``,
                        style: `capital`,
                        length: 4
                    });

                // ceate media
                successfulProbes
                    .push(new probedMedia({
                        host: host,
                        audio: aud,
                        video: vid,
                        target: `${ downloaddir }/${ fname.replace(/[^A-Za-z0-9]/gu, ``) }.${ FILE_FORMATS[vid[`_mediaFormat`]] }`,
                        options: [ `-map 0:${ aud[`index`] }`, `-map 1:${ vid[`index`] }`, `-c:a:0 copy`, `-c:v:0 copy`, `-f ${ FILE_FORMATS[vid[`_mediaFormat`]] }` ]
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
                            .map(x => formatProbe(x))
                            .join(`\n`);

            // output
            pLog.log(eventLog);

            // wait for user confirmation
            await confirmFetch(eventLog);

            // hold the line
            process.stdout.write(`\nprocessing, please wait ...`);

            // empty promises array
            promisesArray = [];

            // for each file to process
            for (let counter = 0; counter < successfulProbes.length; counter++)
                // start async function immediately
                promisesArray.push(fetchMedia(successfulProbes[counter]));

            // await the resolution of all promises
            resultsArray = await Promise.all(promisesArray);

            // log successful fetchs
            eventLog = `\n---------------------------------` +
                        `\n${ resultsArray.join(`\n`) }` +
                        `\n---------------------------------` +
                        `\ndownloads completed.`;

            // output
            pLog.log(eventLog);

            // all loging is done
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

    },
    // ---------------------------------------------------------------------------------
    // load modules
    {createReadStream} = require(`fs`);
    // ---------------------------------------------------------------------------------
createInterface({
    input: createReadStream(file),
    crlfDelay: Infinity
})
    // set event handlers
    .on(`line`, line => {
        const
            // extract urls
            m = line.match(ISOLATION_RGX);
        // stor matches in array
        if (m !== null)
            urls.push(...m);
    })
    .on(`close`, () => {
        urls = urls
            // filter duplicates
            .filter((x, i, a) => a.indexOf(x) === i)
            // sort
            .sort();
        // process
        processUrls();
    });