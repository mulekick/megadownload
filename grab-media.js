/* eslint-disable no-warning-comments */
/* eslint-disable implicit-arrow-linebreak */
'use strict';

let
    // init empty file url buffer
    filerequest = Buffer.from(``);

const
    // ---------------------------------------------------------------------------------
    // input line validation regex
    filergx = /^(?<url>(?:ftp|http|https):\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(?::\d+)?\/[^ "]+)\s(?<title>.+)$/u,
    // ---------------------------------------------------------------------------------
    // download + logs directory
    [ downloaddir, logsdir ] = process.argv.slice(2),
    // ---------------------------------------------------------------------------------
    // load modules
    {FetchStream} = require(`fetch`),
    mime = require(`mime-types`),
    // ---------------------------------------------------------------------------------
    fetchHeaders = (url, title) =>
        new Promise((resolve, reject) => {
            const
                // http readable options
                rsopts =  {},
                // create request
                readbl = new FetchStream(url, rsopts);
            // set event listeners for readable
            readbl
                .on(`meta`, meta => {
                    // server accepts request
                    if (meta[`status`] === 200) {
                        const
                            // extract headers and final url from response
                            {responseHeaders, finalUrl} = meta,
                            // init resolving object
                            res = {
                                // url to feed ffmpeg
                                source: finalUrl,
                                // resource type (odoklassniki band-aid lol)
                                type: /.*x-mpegurl.*$/ui.test(responseHeaders[`content-type`]) ? `m3u8` : mime.extension(responseHeaders[`content-type`]),
                                // resource size
                                size: responseHeaders[`content-length`],
                                // encoding
                                encoding: responseHeaders[`content-encoding`],
                                // path to file
                                target: `${ downloaddir }/${ title }`,
                                // path to log file
                                logfile: `${ logsdir }/${ title }.log`
                            };
                        // reject if type evaluates to false ...
                        if (!res[`type`])
                            reject(new TypeError(`unable to retrieve content type for ${ url }`));
                        // resolve
                        resolve(res);
                        // close connection
                        readbl.destroy();
                    // server refuses request
                    } else {
                        // no http readable retrieved, reject
                        reject(new ReferenceError(`\nunable to retrieve response headers: remote server returned code ${ meta[`status`] }`));
                    }
                })
                .on(`error`, err => reject(err));
        }),
    // ---------------------------------------------------------------------------------
    // load modules
    ffmpeg = require(`fluent-ffmpeg`),
    {createWriteStream, rm} = require(`fs`),
    // ---------------------------------------------------------------------------------
    fetchVideo = v =>
        new Promise((resolve, reject) => {
            const
                // extract source, target, type and log
                {source, target, type, logfile} = v,
                // init output options
                outputOpts = [];
            let
                // init output format
                outputFormat = null;
            // select options depending on source type
            switch (type) {
            // m3u8 playlist --> mp4 file
            case `m3u8` :
                // audio: aac_adtstoasc, video: copy
                outputOpts.push(`-bsf:a aac_adtstoasc`, `-c copy`);
                outputFormat = `mp4`;
                break;
            case `mp4` :
                // audio: copy, video: copy
                outputOpts.push(`-c copy`);
                outputFormat = `mp4`;
                break;
            default :
                // reject
                reject(new TypeError(`unknown resource type for ${ source }: ${ type }`));
                break;
            }
            const
                // target full path
                file = `${ target }.${ outputFormat }`,
                // file system writable options
                wsopts = {
                    // write fails if path exists
                    flags: `wx`,
                    // close fd automatically
                    autoClose: true,
                    // do not emit close event
                    emitClose: false
                },
                // create writable stream to local path
                logger = createWriteStream(logfile, wsopts);

            // set event listeners for logger
            logger
                // eslint-disable-next-line max-nested-callbacks
                .on(`error`, err => rm(logfile, {force: true}, () => reject(err)));

            const
                // create ffmpeg command
                ffcmd = ffmpeg()
                    .input(source)
                    .outputFormat(outputFormat)
                    .outputOptions(outputOpts)
                    .output(file);

            // set event listeners for command
            ffcmd
                .on(`start`, cmd => logger.write(`\nffmpeg spawned:\n${ cmd }`))
                // input codec data
                .on(`codecData`, o => logger.write(`\ninput codec data: ${ JSON.stringify(o) }`))
                // transcoding events
                .on(`stderr`, msg => logger.write(`\n${ msg }`))
                // eslint-disable-next-line no-unused-vars
                .on(`end`, (stdout, stderr) => logger.write(`\nreadable: transcoding succeed, readable closing`), resolve(file))
                // eslint-disable-next-line no-unused-vars
                .on(`error`, (err, stdout, stderr) => rm(file, {force: true}, () => reject(err)));

            // run
            ffcmd
                .run();

        }),
    // ---------------------------------------------------------------------------------
    processRequests = async requests => {

        try {

            let
                // init array for asynchronous functions processing
                promisesArray = [];

            // for each file to process
            for (let counter = 0; counter < requests.length; counter++) {
                const
                    // test requested file url
                    match = requests[counter].match(filergx);
                // invalid url
                if (match === null)
                    throw new TypeError(`invalid fetching request: ${ requests[counter] }`);
                const
                    // extract url and title
                    [ url, title ] = match.slice(1);
                // output message to stdout
                process.stdout.write(`\n---------------------------------`);
                process.stdout.write(`\nfetching ${ title }`);
                process.stdout.write(`\nfrom ${ url }`);
                // start async function immediately
                promisesArray.push(fetchHeaders(url, title));
            }

            let
                // await the resolution of all promises
                resultsArray = await Promise.all(promisesArray);

            // output message to stdout
            process.stdout.write(`\n---------------------------------`);
            process.stdout.write(`\nretrieved headers for all requests`);
            process.stdout.write(`\n[${ resultsArray.map(x => JSON.stringify(x)).join(`\n`) }]`);

            // empty promises array
            promisesArray = [];

            // for each file to process
            for (let counter = 0; counter < resultsArray.length; counter++)
                // start async function immediately
                promisesArray.push(fetchVideo(resultsArray[counter]));

            // await the resolution of all promises
            resultsArray = await Promise.all(promisesArray);

            // output message to stdout
            process.stdout.write(`\n---------------------------------`);
            process.stdout.write(`\n[${ resultsArray.join(`,`) }]`);
            process.stdout.write(`\n---------------------------------`);
            process.stdout.write(`\ndownloads completed.`);

        } catch (err) {
            // output message to stdout
            process.stdout.write(`\n---------------------------------`);
            process.stderr.write(`\nerror occured: ${ err.message }`);
            process.stdout.write(`\n`);
            // return error code
            process.exit(1);
        } finally {
            // return success code
            // !!! NEVER USE THIS WHEN PROMISES ARE STILL PENDING !!!
            // !!! FURTHERMORE INSIDE A FUNCTION !!!
            // !!! USELESS AND DANGEROUS !!!
            // !!! PENDING PROMISES WILL BE WIPED OFF !!!
            // !!! SINCE NO ERROR OCCURED THE PROCESS WILL EXIT WITH 0 ANYWAY !!!
            // process.exit(0);
            process.stdout.write(`\n`);
        }

    },
    // ---------------------------------------------------------------------------------
    // load module
    {Writable} = require(`stream`),
    // init member array
    files = [],
    // ---------------------------------------------------------------------------------
    // writable stream
    linesextractor = new Writable({
        // encode incoming strings into buffers
        decodeStrings: true,
        // utf8 encoding
        defaultEncoding: `utf8`,
        // only strings allowed
        objectMode: false,
        // emit close
        emitClose: true,
        // process incoming buffer
        write: (buf, encoding, callback) => {
            let bytes = buf;
            // if there's at least a new line in buffer
            if (bytes.indexOf(0x0a) >= 0) {
                let i = null;
                // isolate lines
                while ((i = bytes.indexOf(0x0a)) >= 0) {
                    // add line remainder to file url buffer
                    filerequest = Buffer.concat([ filerequest, bytes.slice(0, i) ]);
                    // decode to UTF-8, push into member array
                    files.push(filerequest.toString(`utf8`));
                    // reset file url buffer to empty
                    filerequest = Buffer.from(``);
                    // remove line remainder
                    bytes = bytes.slice(i + 1);
                }
            }
            // Add beginning of last line to file url buffer
            filerequest = Buffer.concat([ filerequest, bytes ]);
            // Success
            callback(null);
        },
        // call files fetching function
        final: callback => {
            // decode to UTF-8, push into member array
            files.push(filerequest.toString(`utf8`));
            // success
            callback();
        }
    });
    // ---------------------------------------------------------------------------------

linesextractor
    // add handler
    .on(`close`, () => {
        // output message to stdout
        process.stdout.write(`\n---------------------------------`);
        process.stdout.write(`\nprocessing downloads ...`);
        // launch
        processRequests(files);
    });

// pipe stdin to lines extractor
process.stdin
    .pipe(linesextractor);