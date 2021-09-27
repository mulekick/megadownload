'use strict';

class resolver {
    constructor({url = null, fetched = null, probed = null, errmsg = null, mediaLocation = null, mediaReferer = null, metadata = null} = {}) {
        // eslint-disable-next-line object-curly-newline
        Object.assign(this, {url, fetched, probed, errmsg, mediaLocation, mediaReferer, metadata});
    }
}

const
    // ---------------------------------------------------------------------------------
    // load modules
    {FetchStream} = require(`fetch`),
    ffmpeg = require(`fluent-ffmpeg`),
    // ---------------------------------------------------------------------------------
    // Config module
    {odoklassnikiHeaderBandAid, removeRangeBandAid, USER_AGENT, REFERER_RGX} = require(`./config`),
    // ---------------------------------------------------------------------------------
    fetchMediaUrl = url =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise(resolve  => {
            const
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
            readbl
                .on(`meta`, metafetch => {
                    // server accepts request
                    if (metafetch[`status`] === 200) {
                        const
                            // extract headers and final url from response
                            {responseHeaders, finalUrl} = metafetch,
                            // content type (odoklassniki/soundcloud band-aid lol)
                            contentType = odoklassnikiHeaderBandAid(responseHeaders[`content-type`]);
                        // fetch fails if content type is not retrieved/evaluates to false ...
                        if (contentType) {
                            // in this case, the response body contains a redirection url
                            // so we have to read it before resolving the promise
                            if (contentType === `text/plain`) {
                                let
                                    // reset to string
                                    payloadUrl = ``;
                                // ATTACH HANDLERS HERE
                                readbl
                                    // eslint-disable-next-line no-return-assign
                                    .on(`data`, chunk => payloadUrl += chunk.toString(`utf8`))
                                    // resolve with an array containing content type and redirection url
                                    .on(`end`, () => resolve([ contentType, payloadUrl ]));
                            } else {
                                // ditch data
                                readbl.resume();
                                // resolve with an array containing content type and final url
                                resolve([ contentType, finalUrl ]);
                            }
                        } else {
                            // ditch data
                            readbl.resume();
                            // reject
                            resolve(new resolver({url: url, fetched: true, probed: false, errmsg: `failed to retrieve content type`}));
                        }
                    // server refuses request
                    } else {
                        // no http readable retrieved, reject
                        resolve(new resolver({url: url, fetched: false, probed: false, errmsg: `failed to retrieve response headers: remote server returned code ${ metafetch[`status`] }`}));
                    }
                })
                .on(`error`, err => {
                    // reject
                    resolve(new resolver({url: url, fetched: false, probed: false, errmsg: err[`message`]}));
                });
        }),
    // ---------------------------------------------------------------------------------
    probeMediaUrl = (referer, origUrl, resolvedUrl, progBar) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise(resolve  => {
            // probe media source ...
            ffmpeg
                // probe input (provide input options as second argument)
                // The cons of using the referer header outweigh the pros at the moment, so it will be disabled until further notice ...
                .ffprobe(resolvedUrl, [ `-user_agent`, `'${ USER_AGENT }'`/* , `-headers`, `'Referer: ${ referer }'`*/ ], (err, metaprobe) => {
                    // increment progress bar
                    progBar.increment();
                    // return final result
                    if (err)
                        // reject
                        return resolve(new resolver({url: origUrl, fetched: true, probed: false, errmsg: `failed to probe: ${ err[`message`] }`}));
                    // resolve
                    return resolve(new resolver({
                        // original url
                        url: origUrl,
                        // success fetch
                        fetched: true,
                        // success probe
                        probed: true,
                        // url to feed ffmpeg
                        mediaLocation: resolvedUrl,
                        // referer for the url
                        mediaReferer: referer,
                        // probe metadata
                        metadata: metaprobe
                    }));
                });
        }),
    // ---------------------------------------------------------------------------------
    probeMedia = async(url, bar) => {
        const
            match = url.match(REFERER_RGX),
            // extract host
            [ referer ] = match === null ? [ `unknown` ] : match.slice(1),
            // await media url resolution
            fetchResult = await fetchMediaUrl(url);

        // url resolution fails
        if (fetchResult instanceof resolver) {
            // increment progress bar
            bar.increment();
            // return resolved promise and exit
            return Promise.resolve(fetchResult);
        }

        // url resolution succeeds
        if (fetchResult instanceof Array && fetchResult[0] !== `text/plain`) {
            // launch probe on resolved url
            // apply range removal band aid
            // so ffprobe doesn't throw an
            // 'Invalid data found when processing input' error ...
            return probeMediaUrl(referer, url, removeRangeBandAid(fetchResult[1]), bar);
        }

        // yt returns a 2xx text/plain payload containing the media url
        // however the GET for said url never happens client-side ...
        // so we have to fetch a 2nd time and trigger a recursive call.
        return probeMedia(fetchResult[1], bar);
    };

module.exports = {probeMedia};