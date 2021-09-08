'use strict';

const
    config = {

        // CLI colors
        CLI_PROBE_COLOR: [ 0, 255, 0 ],

        CLI_SAVE_COLOR: [ 255, 95, 0 ],

        // default user agent (quote when using command line options because of ffmpeg wrapper parsing behavior)
        // USER_AGENT: `Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1`,
        USER_AGENT: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36`,

        // min. media duration (seconds)
        MIN_MEDIA_DURATION: 10,

        // min number of streams by media
        MIN_NB_OF_STREAMS: 1,

        // media formats
        STREAM_FORMATS: [ `Apple HTTP Live Streaming`, `QuickTime / MOV`, `Matroska / WebM` ],

        // saved files format (matching HTTP response content type header...)
        FILE_FORMATS: {
            // 'video/mp4' --> .mp4
            // 'mp4' --> .mp4
            [`mp4`]: `mp4`,
            // 'video/webm' --> .webm
            [`webm`]: `webm`,
            // 'application/x-mpegURL;charset=UTF-8', 'application/x-mpegURL', 'application/x-mpegurl' --> .m3u8
            // 'application/vnd.apple.mpegurl; charset=UTF-8,' 'application/vnd.apple.mpegurl' --> .m3u8
            // 'audio/x-mpegurl' --> .m3u8
            [`m3u8`]: `mp4`,
            // 'video/mp2t' --> ts
            [`ts`]: `mp4`
        },

        // default log file
        LOG_FILE: `logs/${ new Date().getTime() }.media.grab.log`,

        // file path validation
        PATH_RGX: /^\/?(?<path>(?:(?:[^/\s]+|'[^/']+'|"[^/"]+")\/)*)(?<file>[^/\s]+|'[^/']+'|"[^/"]+"){1}$/u,

        // referer isolation
        REFERER_RGX: /^(?<referer>http|https:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+)(?::\d+)?\/[^ "]+$/u,

        // url isolation
        ISOLATION_RGX: /(?:http|https):\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(?::\d+)?\/[^ '"\s]*(?:(?:\.|\/)m3u8|(?:\.|video_)mp4|\W\d{3,4}p\W|videoplayback\?|master\.json\?base64_init=1|\/streams\/|talk\/hls\/)[^ '"\s]*/gu,

        // transcoding events
        EVENT_RGX: /frame=\s*(?<frame>\d+)\sfps=\s*(?<fps>[0-9.]+)\sq=[0-9.-]+\sL?size=\s*(?<size>\d+)kB\stime=(?<time>\d{2}:\d{2}:\d{2}).\d{2}\sbitrate=\s*(?<bitrate>[0-9.]+)kbits\/s\sspeed=\s*(?<speed>[0-9.]+)x/u

    };

if (typeof module !== `undefined` && module.exports)
    module.exports = config;