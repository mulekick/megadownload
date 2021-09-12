'use strict';

class resolver {
    constructor({url = null, fetched = null, probed = null, errmsg = null, mediaLocation = null, locationReferer = null, metadata = null} = {}) {
        // eslint-disable-next-line object-curly-newline
        Object.assign(this, {url, fetched, probed, errmsg, mediaLocation, locationReferer, metadata});
    }
}

const
    // ---------------------------------------------------------------------------------
    // load modules
    {FetchStream, fetchUrl} = require(`fetch`),
    ffmpeg = require(`fluent-ffmpeg`),
    // ---------------------------------------------------------------------------------
    // Config module
    {odoklassnikiHeaderbandAid, removeRangeBandAid, USER_AGENT, REFERER_RGX} = require(`./config`),
    // ---------------------------------------------------------------------------------
    probeMedia = (url, bar) =>
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
                        // The cons of using the referer header outweigh the pros at the moment, so it will be disabled until further notice ...
                        // Referer: `${ referer }`,
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
                            contentType = odoklassnikiHeaderbandAid(responseHeaders[`content-type`]),
                            // probe media source ...
                            launchProbe = (origUrl, resolvedUrl, progBar) => {
                                ffmpeg
                                    // probe input (provide input options as second argument)
                                    // The cons of using the referer header outweigh the pros at the moment, so it will be disabled until further notice ...
                                    // .ffprobe(resolvedUrl, [ `-user_agent`, `'${ USER_AGENT }'`, `-headers`, `'Referer: ${ referer }'` ], (err, metaprobe) => {
                                    .ffprobe(resolvedUrl, [ `-user_agent`, `'${ USER_AGENT }'` ], (err, metaprobe) => {
                                        if (err) {
                                            // reject
                                            resolve(new resolver({url: origUrl, fetched: true, probed: false, errmsg: `failed to probe: ${ err[`message`] }`}));
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
                                                // probe metadata
                                                metadata: metaprobe
                                            }));
                                        }
                                        // increment progress bar
                                        progBar.increment();
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
                                                // reject
                                                resolve(new resolver({url: url, fetched: false, probed: false, errmsg: err[`message`]}));
                                                // increment progress bar
                                                bar.increment();
                                            } else {
                                                // launch probe on resolved url
                                                // apply range removal band aid
                                                // because YT adds it a 2nd time ...
                                                launchProbe(url, removeRangeBandAid(meta[`finalUrl`]), bar);
                                            }
                                        });
                                    });
                            } else {
                                // ditch data
                                readbl.resume();
                                // launch probe on resolved url
                                // apply range removal band aid
                                // so ffprobe doesn't throw an
                                // 'Invalid data found when processing input' error ...
                                launchProbe(url, removeRangeBandAid(finalUrl), bar);
                            }
                        } else {
                            // ditch data
                            readbl.resume();
                            // reject
                            resolve(new resolver({url: url, fetched: true, probed: false, errmsg: `failed to retrieve content type`}));
                            // increment progress bar
                            bar.increment();
                        }
                    // server refuses request
                    } else {
                        // no http readable retrieved, reject
                        resolve(new resolver({url: url, fetched: false, probed: false, errmsg: `failed to retrieve response headers: remote server returned code ${ metafetch[`status`] }`}));
                        // increment progress bar
                        bar.increment();
                    }
                })
                .on(`error`, err => {
                    // reject
                    resolve(new resolver({url: url, fetched: false, probed: false, errmsg: err[`message`]}));
                    // increment progress bar
                    bar.increment();
                });
        });

module.exports = {probeMedia};