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
    // http readable options
    rsopts =  {
        headers: {
            Connection: `keep-alive`,
            'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36`
            // 'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1`
        }
    },
    // ---------------------------------------------------------------------------------
    probeMedia = url =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise(resolve => {
            const
                // create request
                readbl = new FetchStream(url, rsopts);
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
                            launchProbe = (probeSource, origUrl, resolvedUrl, resolvedType, resolvedHeaders) => {
                                ffmpeg
                                    // probe input
                                    .ffprobe(probeSource, (err, metaprobe) => {
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
                                    probeSrc = ``;
                                // ATTACH HANDLERS HERE
                                readbl
                                    // eslint-disable-next-line no-return-assign
                                    .on(`data`, chunk => probeSrc += chunk.toString(`utf8`))
                                    .on(`end`, () => {
                                        // we can't escape a small pyramid of doom here ...
                                        fetchUrl(probeSrc, (err, meta) => {
                                            // 2nd fetch fails ...
                                            if (err) {
                                                resolve(new resolver({url: url, fetched: false, probed: false, errmsg: err[`message`]}));
                                            } else {
                                                // launch probe on readable
                                                launchProbe(meta[`finalUrl`], url, meta[`finalUrl`], mime.extension(meta[`responseHeaders`][`content-type`]), meta[`responseHeaders`]);
                                            }
                                        });
                                    });
                            } else {
                                // launch probe on resolved url
                                launchProbe(finalUrl, url, finalUrl, contentType, responseHeaders);
                            }
                        } else {
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