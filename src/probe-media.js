'use strict';

class resolver {
    constructor({url = null, fetched = null, probed = null, errmsg = null, mediaLocation = null, mediaReferer = null, metadata = null} = {}) {
        Object.assign(this, {url, fetched, probed, errmsg, mediaLocation, mediaReferer, metadata});
    }
}

const
    // ---------------------------------------------------------------------------------
    // load modules
    ffmpeg = require(`fluent-ffmpeg`),
    {Curl, CurlFeature} = require(`node-libcurl`),
    // features constants
    {StreamResponse} = CurlFeature,
    // options constants
    {URL, USERAGENT, FOLLOWLOCATION, AUTOREFERER, MAXREDIRS, CONNECTTIMEOUT, NOPROGRESS, VERBOSE} = Curl.option,
    // ---------------------------------------------------------------------------------
    // Config module
    {odoklassnikiHeaderBandAid, removeRangeBandAid, headerMatchName, USER_AGENT, REFERER_RGX} = require(`./config`),
    // ---------------------------------------------------------------------------------
    fetchMediaUrl = url =>
        new Promise(resolve  => {

            const
                // create instance
                curl = new Curl();

            // set options
            curl
                // target url
                .setOpt(URL, url)
                // user agent
                .setOpt(USERAGENT, USER_AGENT)
                // automatically follow redirections
                .setOpt(FOLLOWLOCATION, true)
                // automatically add referer header on redirection
                .setOpt(AUTOREFERER, true)
                // follow redirections ad infinitum
                .setOpt(MAXREDIRS, -1)
                // set timeout
                .setOpt(CONNECTTIMEOUT, 10)
                // no progress bar
                .setOpt(NOPROGRESS, true)
                // quiet
                .setOpt(VERBOSE, false);

            // stream response
            curl.enable(StreamResponse);

            curl
                // receive payload as a readable stream
                .on(`stream`, (readable, statusCode, headers) => {
                    // reverse headers
                    headers.reverse();
                    // server accepts request
                    if (statusCode === 200) {
                        const
                            // manage content type header name
                            contentTypeHeaderName = headerMatchName([ `Content-Type`, `content-type` ], headers[0]),
                            // fail if content type header is missing
                            contentType = typeof contentTypeHeaderName === `undefined` ? false : odoklassnikiHeaderBandAid(headers[0][contentTypeHeaderName]);
                        // fetch fails if content type is not retrieved/evaluates to false ...
                        if (contentType) {
                            // in this case, the response body contains a redirection url
                            // so we have to read it before resolving the promise
                            if (contentType === `text/plain`) {
                                let
                                    // reset to string
                                    payloadUrl = ``;
                                // ATTACH HANDLERS HERE
                                readable
                                    // read url
                                    .on(`data`, chunk => (payloadUrl += chunk))
                                    // resolve with an array containing content type and redirection url
                                    .on(`end`, () => {
                                        if (payloadUrl.length)
                                            // if payload length is not null, continue
                                            resolve([ contentType, payloadUrl ]);
                                        else
                                            // if payload length is null, fail
                                            resolve(new resolver({url: url, fetched: true, probed: false, errmsg: `failed to complete fetch: server returned an empty payload`}));
                                    })
                                    // done, terminate instance
                                    .on(`close`, () => curl.close())
                                    // setup error handler
                                    .on(`error`, err => {
                                        // if readable emits an error, fail
                                        resolve(new resolver({url: url, fetched: true, probed: false, errmsg: `failed to complete fetch: readable stream emitted ${ err[`message`] }`}));
                                        // done, terminate instance
                                        curl.close();
                                    });
                            } else {
                                const
                                    // extract final url from headers
                                    redirect = headers.find(x => x[`result`][`code`] === 302);
                                // no redirection occured
                                if (typeof redirect === `undefined`) {
                                    // resolve with an array containing content type and original url
                                    resolve([ contentType, url ]);
                                // request was redirected
                                } else {
                                    const
                                        // manage location header name
                                        locationHeaderName = headerMatchName([ `Location`, `location` ], redirect);
                                    // eslint-disable-next-line max-depth
                                    if (typeof locationHeaderName === `undefined`)
                                        // response header is missing, fail
                                        resolve(new resolver({url: url, fetched: true, probed: false, errmsg: `failed to retrieve location response header folowing redirection`}));
                                    else
                                        // resolve with an array containing content type and redirected url
                                        resolve([ contentType, redirect[locationHeaderName] ]);
                                }
                                // destroy readable to free internal resources and allow the process to end
                                readable.destroy();
                            }
                        } else {
                            // reject
                            resolve(new resolver({url: url, fetched: true, probed: false, errmsg: `failed to retrieve content type`}));
                            // destroy readable to free internal resources and allow the process to end
                            readable.destroy();
                        }
                    // server refuses request
                    } else {
                        // no http readable retrieved, reject
                        resolve(new resolver({url: url, fetched: false, probed: false, errmsg: `failed to retrieve response headers: remote server returned code ${ String(statusCode) }`}));
                        // done, terminate instance
                        curl.close();
                    }
                })
                .on(`error`, (err, code) => {
                    // ignore 'readable unexpectedly destroyed' errors since resolve() has already been called at this stage
                    if (code !== 42)
                        // reject
                        resolve(new resolver({url: url, fetched: false, probed: false, errmsg: err[`message`]}));
                    // done, terminate instance
                    curl.close();
                })
                // execute
                .perform();
        }),
    // ---------------------------------------------------------------------------------
    probeMediaUrl = (referer, origUrl, resolvedUrl, progBar) =>
        new Promise(resolve  => {
            // probe media source ...
            ffmpeg
                // probe input (provide input options as second argument)
                .ffprobe(resolvedUrl, [
                    `-headers`, `Connection: keep-alive`,
                    `-headers`, `Pragma: no-cache`,
                    `-headers`, `Cache-Control: no-cache`,
                    `-headers`, `User-Agent: ${ USER_AGENT }`,
                    `-headers`, `Referer: ${ referer }/`
                ], (err, metaprobe) => {
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