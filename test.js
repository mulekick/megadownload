'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    {FetchStream, fetchUrl} = require(`fetch`),
    mime = require(`mime-types`),
    // ---------------------------------------------------------------------------------
    // http readable options
    rsopts =  {
        headers: {
            Connection: `keep-alive`,
            'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36`
        }
    },
    // ---------------------------------------------------------------------------------
    [ url ] = process.argv.slice(2),
    // ---------------------------------------------------------------------------------
    // create request
    readbl = new FetchStream(url, rsopts);
    // ---------------------------------------------------------------------------------
    // set event listeners for readable
readbl
    .on(`meta`, metafetch => {
        // server accepts request
        if (metafetch[`status`] === 200) {
            const
                // extract headers and final url from response
                {responseHeaders, finalUrl} = metafetch,
                // content type (odoklassniki/soundcloud band-aid lol)
                contentType = /.*(?:x-mpegurl|audio\/mpegurl).*$/ui.test(responseHeaders[`content-type`]) ? `m3u8` : mime.extension(responseHeaders[`content-type`]);
                // fetch fails if content type is not retrieved/evaluates to false ...
            if (contentType) {
                let
                    // set probe source
                    probeSrc = null;
                // IMPOSSIBLE TO PIPE M3U8 FILES TO FFPROBE/FFMPEG ==> USE URL
                if (contentType === `m3u8`) {
                    process.stdout.write(`probing url for ${ finalUrl }\n`);
                    // probe url
                    probeSrc = finalUrl;
                    // destroy readable TO BE CONFIRMED
                    // readbl.destroy();
                } else if (contentType === `txt`) {
                    // reset to string
                    probeSrc = ``;
                    // ATTACH HANDLERS HERE
                    readbl
                        // eslint-disable-next-line no-return-assign
                        .on(`data`, chunk => probeSrc += chunk.toString(`utf8`))
                        .on(`end`, () => process.stdout.write(`received url ${ probeSrc } in body, will probe it\n`));
                } else {
                    process.stdout.write(`probing readable for ${ finalUrl }\n`);
                    // probe readable
                    probeSrc = readbl;
                }

            } else {
                // reject
                process.stdout.write(`unable to retrieve content type for ${ url }\n`);
            }
            // server refuses request
        } else {
            // no http readable retrieved, reject
            process.stdout.write(`unable to retrieve response headers: remote server returned code ${ metafetch[`status`] }\n`);
        }
    })
    .on(`error`, err => process.stdout.write(`fetch stream error ${ err[`message`] }\n`));