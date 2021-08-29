'use strict';

class resolver {
    constructor({url = null, fetched = null, probed = null, errmsg = null, mediaLocation = null, contentType = null, contentLength = null, contentEncoding = null, metadata = null} = {}) {
        // eslint-disable-next-line object-curly-newline
        Object.assign(this, {url, fetched, probed, errmsg, mediaLocation, contentType, contentLength, contentEncoding, metadata});
    }
}

const
    // ---------------------------------------------------------------------------------
    // load modules
    {FetchStream, fetchUrl} = require(`fetch`),
    mime = require(`mime-types`),
    ffmpeg = require(`fluent-ffmpeg`),
    // ---------------------------------------------------------------------------------
    // Config module
    {USER_AGENT} = require(`./config`),
    // ---------------------------------------------------------------------------------
    // http readable options
    FETCH_OPTS =  {
        headers: {
            Connection: `keep-alive`,
            'User-Agent': USER_AGENT
        }
    },
    // ---------------------------------------------------------------------------------
    // ffprobe options
    FFMPEG_INPUT_OPTS = [ `-user_agent`, `'${ USER_AGENT }'` ],
    // ---------------------------------------------------------------------------------
    probeMedia = url =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise(resolve => {
            const
                // create request
                readbl = new FetchStream(url, FETCH_OPTS);
            // set event listeners for readable
            readbl
                .on(`meta`, metafetch => {
                    // server accepts request
                    if (metafetch[`status`] === 200) {
                        const
                            // extract headers and final url from response
                            {responseHeaders, finalUrl} = metafetch,
                            // content type (odoklassniki/soundcloud band-aid lol)
                            contentType = /.*(?:x-mpegurl|audio\/mpegurl).*$/ui.test(responseHeaders[`content-type`]) ? `m3u8` : mime.extension(responseHeaders[`content-type`]),
                            // probe media source ...
                            launchProbe = (origUrl, resolvedUrl, resolvedType, resolvedHeaders) => {
                                ffmpeg
                                    // probe input (provide input options as second argument)
                                    .ffprobe(resolvedUrl, FFMPEG_INPUT_OPTS, (err, metaprobe) => {
                                        if (err) {
                                            // reject
                                            resolve(new resolver({url: url, fetched: true, probed: false, errmsg: `unable to probe ${ url }: ${ err[`message`] }`}));
                                        } else {
                                            // resolve
                                            resolve(new resolver({
                                                // original url
                                                url: origUrl,
                                                // success fetch
                                                fetched: true,
                                                // success probe
                                                probed: true,
                                                // url to feed ffmpeg
                                                mediaLocation: resolvedUrl,
                                                // resource type
                                                contentType: resolvedType,
                                                // resource size
                                                contentLength: resolvedHeaders[`content-length`],
                                                // encoding
                                                contentEncoding: resolvedHeaders[`content-encoding`],
                                                // probe metadata
                                                metadata: metaprobe
                                            }));
                                        }
                                    });
                            };
                        // fetch fails if content type is not retrieved/evaluates to false ...
                        if (contentType) {
                            // yt returns a 2xx text/plain payload containg the media url
                            // however the GET for said url never happens client-side ...
                            // so we have to fetch a 2nd time
                            if (contentType === `txt`) {
                                let
                                    // reset to string
                                    payloadUrl = ``;
                                // ATTACH HANDLERS HERE
                                readbl
                                    // eslint-disable-next-line no-return-assign
                                    .on(`data`, chunk => payloadUrl += chunk.toString(`utf8`))
                                    .on(`end`, () => {
                                        // we can't escape a small pyramid of doom here ...
                                        fetchUrl(payloadUrl, (err, meta) => {
                                            // 2nd fetch fails ...
                                            if (err) {
                                                resolve(new resolver({url: url, fetched: false, probed: false, errmsg: err[`message`]}));
                                            } else {
                                                // launch probe on readable
                                                launchProbe(url, meta[`finalUrl`], mime.extension(meta[`responseHeaders`][`content-type`]), meta[`responseHeaders`]);
                                            }
                                        });
                                    });
                            } else {
                                // destroy readable (TBC)
                                readbl.destroy();
                                // launch probe on resolved url
                                launchProbe(url, finalUrl, contentType, responseHeaders);
                            }
                        } else {
                            // destroy readable (TBC)
                            readbl.destroy();
                            // reject
                            resolve(new resolver({url: url, fetched: true, probed: false, errmsg: `unable to retrieve content type for ${ url }`}));
                        }

                    // server refuses request
                    } else {
                        // no http readable retrieved, reject
                        resolve(new resolver({url: url, fetched: false, probed: false, errmsg: `unable to retrieve response headers: remote server returned code ${ metafetch[`status`] }`}));
                    }
                })
                .on(`error`, err => resolve(new resolver({url: url, fetched: false, probed: false, errmsg: err[`message`]})));
        });

module.exports = {probeMedia};