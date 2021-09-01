'use strict';

class resolver {
    constructor({url = null, fetched = null, probed = null, errmsg = null, mediaLocation = null, locationReferer = null, contentType = null, contentLength = null, contentEncoding = null, metadata = null} = {}) {
        // eslint-disable-next-line object-curly-newline
        Object.assign(this, {url, fetched, probed, errmsg, mediaLocation, locationReferer, contentType, contentLength, contentEncoding, metadata});
    }
}

const
    // ---------------------------------------------------------------------------------
    // load modules
    {FetchStream, fetchUrl} = require(`fetch`),
    ffmpeg = require(`fluent-ffmpeg`),
    // ---------------------------------------------------------------------------------
    // Config module
    {USER_AGENT, REFERER_RGX} = require(`./config`),
    // ---------------------------------------------------------------------------------
    // content type (odoklassniki/soundcloud band-aid lol)
    // eslint-disable-next-line no-confusing-arrow
    bandAid = x => x === `audio/x-hx-aac-adts` ? `audio/aac` : /.*(?:x-mpegurl|audio\/mpegurl).*$/ui.test(x) ? `application/vnd.apple.mpegurl` : x,
    // ---------------------------------------------------------------------------------
    probeMedia = url =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise(resolve => {
            const
                // extract host
                [ referer ] = url.match(REFERER_RGX).slice(1),
                // create request
                // eslint-disable-next-line prefer-object-spread
                readbl = new FetchStream(url, {
                    headers: {
                        Connection: `keep-alive`,
                        Referer: `${ referer }`,
                        'User-Agent': USER_AGENT
                    }
                });
            // set event listeners for readable
            readbl
                .on(`meta`, metafetch => {
                    // server accepts request
                    if (metafetch[`status`] === 200) {
                        const
                            // extract headers and final url from response
                            {responseHeaders, finalUrl} = metafetch,
                            // content type (odoklassniki/soundcloud band-aid lol)
                            contentType = bandAid(responseHeaders[`content-type`]),
                            // probe media source ...
                            launchProbe = (origUrl, resolvedUrl, resolvedType, resolvedHeaders) => {
                                ffmpeg
                                    // probe input (provide input options as second argument)
                                    .ffprobe(resolvedUrl, [ `-user_agent`, `'${ USER_AGENT }'`, `-headers`, `'Referer: ${ referer }'` ], (err, metaprobe) => {
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
                                                // referer for the url
                                                locationReferer: referer,
                                                // resource type
                                                contentType: resolvedType,
                                                // resource size
                                                contentLength: resolvedHeaders[`content-length`],
                                                // resource bytes range
                                                contentRange: resolvedHeaders[`content-range`],
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
                            if (contentType === `text/plain`) {
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
                                                launchProbe(url, meta[`finalUrl`], bandAid(meta[`responseHeaders`][`content-type`]), meta[`responseHeaders`]);
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