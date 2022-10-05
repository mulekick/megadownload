/* eslint-disable lines-between-class-members */

// import modules
import {program} from "commander";
import {validFilePath, validMinDuration, validMinStreams} from "./utils.js";
import {MEDIA_MIN_DURATION, MEDIA_MIN_STREAMS, DEFAULT_DOWNLOAD_DIR} from "./config.js";

class Megadownload {
    // ---------------------------------------------------------------------------------
    constructor({input = null, options = null}) {
        // inline caching optimization
        Object.assign(this, {input, options});
        // double-check input
        if (this.input instanceof Array) {
            this.options = program
                .name(`megadownload`)
                // required
                .requiredOption(`-i, --input-files <inputFiles...>`, `space-separated list of input files (http sessions or HAR files)`)
                .requiredOption(`-o, --output-dir <outputDir>`, `downloaded files / logs directory path`, validFilePath, DEFAULT_DOWNLOAD_DIR)
                // other
                .option(`-d, --min-duration <minDuration>`, `minimum duration in seconds for a media to be downloaded`, validMinDuration, MEDIA_MIN_DURATION)
                .option(`-n, --min-streams <minStreams>`, `minimum number of streams in a media to be downloaded`, validMinStreams, MEDIA_MIN_STREAMS)
                .option(`-a, --audio-only`, `download only audio streams from all media and output audio files`, false)
                .option(`-e, --extensive`, `download as much media as possible, including duplicates`, false)
                // debug
                .option(`-u, --dump-urls`, `parse input files, list urls selected for probing and exit`, false)
                .option(`-v, --verbose`, `write log files for main process as well as for download/transcode processes`, false)
                // init
                .parse(this.input)
                .opts();
        }
        // validate input files list
        this.options[`inputFiles`]
            .forEach(validFilePath);
    }
    // ---------------------------------------------------------------------------------
    getOptions() {
        return this.options;
    }
    // ---------------------------------------------------------------------------------
}

export default Megadownload;