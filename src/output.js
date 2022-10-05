/* eslint-disable lines-between-class-members */

// import primitives
import process from "node:process";

// import modules
import chalk from "chalk";
import progress from "cli-progress";
import {CLI_PROBE_COLOR, CLI_SAVE_COLOR} from "./config.js";

class Output {
    // ---------------------------------------------------------------------------------
    constructor({progressBar = null, progressBars = null}) {
        // inline caching optimization
        Object.assign(this, {progressBar, progressBars});
    }
    // ---------------------------------------------------------------------------------
    // eslint-disable-next-line class-methods-use-this
    formatProbe(x, i) {
        // probe formatting
        const
            {referer, duration, audio, video, target} = x;
        // eslint-disable-next-line prefer-template
        return chalk.rgb(...CLI_PROBE_COLOR)(
            `=================================\n` +
            `*********** PROBE ${ i + 1 } ************\n` +
            `=================================\n` +
            `source\t${ referer }\n`) +
            `length\t${ duration }s\n` +
            (video === null ? `` : `video\t${ video[`width`] }x${ video[`height`] } px, ${ isNaN(video[`bit_rate`]) ? `n/a` : video[`bit_rate`] / 1000 } kbps\n`) +
            (audio === null ? `` : `audio\t${ audio[`channel_layout`] }, ${ isNaN(audio[`sample_rate`]) ? `n/a` : audio[`sample_rate`] / 1000 } kHz\n`) +
            chalk.rgb(...CLI_SAVE_COLOR)(`file\t${ target }\n`);
    }
    // ---------------------------------------------------------------------------------
    startProbeBar(numProbes) {
        // create single progress bar for probes ...
        this.progressBar = new progress.SingleBar({
            format: `${ chalk.rgb(...CLI_PROBE_COLOR)(`{bar}`) } | {percentage}% | ETA: {eta}s | {value}/{total}`,
            stream: process.stdout,
            stopOnComplete: true,
            clearOnComplete: true,
            barsize: 80,
            barCompleteChar: `\u2588`,
            barIncompleteChar: `\u2591`,
            autopadding: true
        });
        // start the progress bar
        this.progressBar.start(numProbes, 0);
        // return
        return this.progressBar;
    }
    // ---------------------------------------------------------------------------------
    startDownloadBars() {
        // create new container for progress bars
        this.progressBars = new progress.MultiBar({
            format: `${ chalk.rgb(...CLI_SAVE_COLOR)(`{bar}`) } | {percentage}% | ${ chalk.rgb(...CLI_PROBE_COLOR)(`{file}`) }`,
            // format: `${ chalk.rgb(...CLI_SAVE_COLOR)(`{bar}`) } | ${ chalk.rgb(...CLI_PROBE_COLOR)(`{file}`) } | {value}/{total} s`,
            stream: process.stdout,
            stopOnComplete: true,
            clearOnComplete: true,
            barsize: 80,
            barCompleteChar: `\u2588`,
            barIncompleteChar: `\u2591`,
            autopadding: true
        });
    }
    // ---------------------------------------------------------------------------------
    downloadBar(total, file) {
        // create a new progress bar
        return this.progressBars
            .create(total, 0, {file: file});
    }
    // ---------------------------------------------------------------------------------
    stopAllDownloadBars() {
        // stop all progress bars
        return this.progressBars.stop();
    }
    // ---------------------------------------------------------------------------------
}

export default Output;