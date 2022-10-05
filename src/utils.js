/* eslint-disable lines-between-class-members */

// import primitives
import process from "node:process";
import {createInterface} from "node:readline";
import {createReadStream} from "node:fs";

// import modules
import {PATH_RGX, ISOLATION_RGX} from "./config.js";

const
    // ---------------------------------------------------------------------------------
    // file system writable options
    wsopts = {
        // write fails if path exists
        flags: `wx`,
        // encoding
        encoding: `utf8`,
        // close fd automatically
        autoClose: true,
        // emit close event
        emitClose: true
    },
    // file system readable options
    rsopts = {
        // read only
        flags: `r`,
        // encoding
        encoding: `utf8`,
        // close fd automatically
        autoClose: true,
        // emit close event
        emitClose: true
    },
    // ---------------------------------------------------------------------------------
    // CLI options validation
    validFilePath = p => {
        if (PATH_RGX.test(p) === false)
            throw new Error(`invalid path ${ p }`);
        return p;
    },
    validMinDuration = d => {
        if (d.length === 0 || isNaN(d))
            throw new Error(`invalid minimum duration ${ d }`);
        return Number(d);
    },
    validMinStreams = n => {
        if (n.length === 0 || isNaN(n))
            throw new Error(`invalid minimum number of streams ${ n }`);
        return Number(n);
    },
    // ---------------------------------------------------------------------------------
    // sort objects on properties
    numSort = (a, b, p) => {
        const
            // extract properties
            [ pa, pb ] = [ a[p], b[p] ];
        // if both values are known
        if (isNaN(pa) === false && isNaN(pb) === false)
            // sort highest value first
            return pb - pa;
        // value unknown for b
        else if (isNaN(pb))
            // sort a first
            return -1;
        // value unknown for a
        else if (isNaN(pa))
            // sort b first
            return 1;
        // both values unknown, keep a and b as is
        return 0;
    },
    alphaSort = (a, b, p) => {
        const
            // extract values
            [ pa, pb ] = [ a[p], b[p] ];
        if (typeof pa !== `string` || typeof pb !== `string`)
            // sort strings only
            return 0;
        let
            // init
            pos = 0;
        while (pa[pos] && pb[pos]) {
            const
                // sort according to UTF16 code units
                [ cua, cub ] = [ pa.charCodeAt(pos), pb.charCodeAt(pos) ];
            if (cua < cub)
                // sort a first
                return -1;
            else if (cua > cub)
                // sort b first
                return 1;
            pos++;
        }
        // if a is shorter than b, sort a first
        return pb[pos] ? -1 : pa[pos] ? 1 : 0;
    },
    // ---------------------------------------------------------------------------------
    // async url isolation
    extractUrls = file => new Promise((resolve, reject) => {
        const
            urls = [],
            // create readable
            rs = createReadStream(file, rsopts);
        rs
            // set event handlers
            .on(`error`, err => reject(err));
        // read file
        createInterface({
            input: rs,
            crlfDelay: Infinity
        })
            // set event handlers
            .on(`line`, line => {
                const
                    // extract urls
                    m = line.match(ISOLATION_RGX);
                // store matches in array
                if (m !== null)
                    urls.push(...m);
            })
            .on(`close`, () => resolve(urls));
    }),
    // ---------------------------------------------------------------------------------
    // user confirmation
    confirmDownloads = m => new Promise((resolve, reject) => {
        createInterface({
            input: process.stdin,
            output: process.stdout
        })
            .question(`${ m }\n\nDo you want to pull the above media to your hard drive ? (Y/n) ?\n`, ans => (ans === `Y` ? resolve() : reject(new Error(`operation canceled.`))));
    });
    // ---------------------------------------------------------------------------------

// never rename exports in modules
export {wsopts, rsopts, validFilePath, validMinDuration, validMinStreams, numSort, alphaSort, extractUrls, confirmDownloads};