'use strict';

let
    // ---------------------------------------------------------------------------------
    // url storage
    urls = [];
    // ---------------------------------------------------------------------------------

const
    // ---------------------------------------------------------------------------------
    // load modules
    {createInterface} = require(`readline`),
    {uniqueNamesGenerator, adjectives, colors, languages, starWars} = require(`unique-names-generator`),
    {logger, formatmsg} = require(`./logger`),
    {probeMedia} = require(`./probe-media`),
    {fetchMedia} = require(`./fetch-media`),
    // ---------------------------------------------------------------------------------
    // Config module
    {MIN_MEDIA_DURATION, MIN_NB_OF_STREAMS, STREAM_FORMATS, DOWNLOAD_DIR, LOG_FILE, ISOLATION_RGX} = require(`./config`),
    // ---------------------------------------------------------------------------------
    // session file, download directory
    [ file, downloaddir = DOWNLOAD_DIR ] = process.argv.slice(2),
    // ---------------------------------------------------------------------------------
    // process log
    pLog = new logger(LOG_FILE),
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
                [ promisesArray, resultsArray, eventLog ] = [ null, null, null ];

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
                })
                // sort by duration
                .sort((a, b) => Number(a[`metadata`][`format`][`duration`]) - Number(b[`metadata`][`format`][`duration`]));

            // append attributes to media
            for (let counter = 0; counter < resultsArray.length; counter++) {
                const
                    // generate random name
                    fname = uniqueNamesGenerator({
                        dictionaries: [ adjectives, colors, languages, starWars ],
                        separator: ``,
                        style: `capital`,
                        length: 4
                    }),
                    // codecs options
                    codecOptions = resultsArray[counter][`metadata`][`format`][`format_long_name`] === `MPEG-TS (MPEG-2 Transport Stream)` ? [ `-bsf:a aac_adtstoasc`, `-c copy` ] :
                        resultsArray[counter][`metadata`][`format`][`format_long_name`] === `Apple HTTP Live Streaming` ? [ `-c copy` ] :
                            resultsArray[counter][`metadata`][`format`][`format_long_name`] === `QuickTime / MOV` ? [ `-c copy` ] :
                                [];
                // update media
                Object.assign(resultsArray[counter], {
                    // local file save path
                    target: `${ downloaddir }/${ fname.replace(/[^A-Za-z0-9]/gu, ``) }.mp4`,
                    options: codecOptions
                });
            }

            // log successful probes
            // eslint-disable-next-line prefer-template
            eventLog = `---------------------------------\n` +
                        `SUCCESSFUL PROBES: ${ resultsArray.length }\n` +
                        `---------------------------------\n` +
                        resultsArray
                            .map(x => formatmsg(x))
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
            for (let counter = 0; counter < resultsArray.length; counter++)
                // start async function immediately
                promisesArray.push(fetchMedia(resultsArray[counter]));

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

            process.stdout.write(`---------------------------------`);
            process.stdout.write(`\ndone.`);
            process.stdout.write(`\n`);

            // return success code
            process.exit(0);

        } catch (err) {
            // output message to stderr
            process.stderr.write(`---------------------------------`);
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