'use strict';

/*
run mime-type on 'content-type' response header to find the mime extension...

video/mp4                                      | .mp4
mp4                                            | .mp4
video/webm                                     | .webm
audio/webm                                     | .weba
application/x-mpegURL;charset=UTF-8            | .m3u8
application/x-mpegURL                          | .m3u8
application/x-mpegurl                          | .m3u8
application/vnd.apple.mpegurl; charset=UTF-8,  | .m3u8
application/vnd.apple.mpegurl                  | .m3u8
audio/x-mpegurl                                | .m3u8
video/mp2t                                     | ts
*/

const
    config = {

        // band aids
        vimeoUrlBandAid: x => x.replace(`.json?base64_init=1`, `.m3u8`),

        odoklassnikiHeaderBandAid: x => (x === `audio/x-hx-aac-adts` ? `audio/aac` : /.*(?:x-mpegurl|audio\/mpegurl).*$/ui.test(x) ? `application/vnd.apple.mpegurl` : x),

        // remove byte range from urls
        removeRangeBandAid: x => x.replace(/&(?:range|bytes)=\d*-\d*/u, ``),

        // return first matching response header name
        headerMatchName: (x, h) => x.find(y => Object.prototype.hasOwnProperty.call(h, y)),

        // CLI colors
        CLI_PROBE_COLOR: [ 0, 255, 0 ],

        CLI_SAVE_COLOR: [ 255, 95, 0 ],

        // default user agent (quote when using command line options because of ffmpeg wrapper parsing behavior)
        USER_AGENT: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36`,
        // USER_AGENT: `Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1`,

        // min. media duration (seconds)
        MEDIA_MIN_DURATION: 90,

        // min number of streams by media
        MEDIA_MIN_STREAMS: 1,

        // media formats (consider the probe a success if ffprobe returns those formats)
        MEDIA_FORMATS: [ `Apple HTTP Live Streaming`, `Dynamic Adaptive Streaming over HTTP`, `QuickTime / MOV`, `Matroska / WebM` ],

        // file extensions by encoder name (all support the -c copy option on ffmpeg) ...
        VIDEO_CODEC_FILE_EXT: {
            [`H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10`]: `mp4`,
            [`Alliance for Open Media AV1`]: `mp4`,
            [`Google VP9`]: `webm`
        },

        // audio only
        AUDIO_CODEC_FILE_EXT: {
            [`AAC (Advanced Audio Coding)`]: `adts`,
            [`Opus (Opus Interactive Audio Codec)`]: `opus`,
            [`MP3 (MPEG audio layer 3)`]: `mp3`
        },

        // default download directory
        DEFAULT_DOWNLOAD_DIR: process.cwd(),

        // file path validation
        PATH_RGX: /^\/?(?<path>(?:(?:[^/\s]+|'[^/']+'|"[^/"]+")\/)*)(?<file>[^/\s]+|'[^/']+'|"[^/"]+"){1}$/u,

        // referer isolation
        REFERER_RGX: /^(?<referer>http|https:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+)(?::\d+)?\/[^ "]+$/u,

        // url isolation
        ISOLATION_RGX: /(?:http|https):\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(?::\d+)?\/[^ '"\s]*(?:(?:\.|\/)m3u8|(?:\.|video_)mp4|\W\d{3,4}(?:(?:p\W)|\?)|videoplayback\?|\?expires=\d{13}&srcIp=|master\.json\?base64_init=1|\/streams\/|talk\/hls\/|\.mpd\W)[^ `'"\s\\\]]*/gu,

        // transcoding events
        EVENT_RGX: /(?:frame=\s*(?<frame>\d+)\sfps=\s*(?<fps>[0-9.]+)\sq=[0-9.-]+\sL?)?size=\s*(?<size>\d+)kB\stime=(?<time>\d{2}:\d{2}:\d{2}).\d{2}\sbitrate=\s*(?<bitrate>[0-9.]+)kbits\/s\sspeed=\s*(?<speed>[0-9.]+)x/u

    };

module.exports = config;