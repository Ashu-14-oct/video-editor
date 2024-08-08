const {spawn} = require('node:child_process');
const { resolve } = require('node:path');

const makeThumbnail = (fullPath, thumbnailPath) => {
    // ffmpeg -i video.mp4 -ss 5 -vframes 1 thumbnail.jpg
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
            "-i", 
            fullPath,
            "-ss",
            "5",
            "-vframes",
            "1",
            thumbnailPath
        ])

        ffmpeg.on("close", (code) => {
            if(code === 0){
                resolve();
            } else {
                reject(`ffmpeg exited with code ${code} while creating thumbnail`);
            }
        });
    })
}

const getDimensions = (fullPath) => {
    // ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 video.mp4
    return new Promise((resolve, reject) => {
        const ffprobe = spawn("ffprobe", [
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0",
            fullPath 
        ]);

        let dimensions = "";
        ffprobe.stdout.on("data", (data) => {
            dimensions += data.toString("utf8");
        });

        ffprobe.on("close", (code) => {
            if(code === 0){
                dimensions = dimensions.replace(/\s/g, "");
                console.log(dimensions);
                resolve({
                    width: Number(dimensions[0]),
                    height: Number(dimensions[1])
                });
            } else {
                reject(`ffprobe exited with code ${code} in dimension`);
            }
        }) 
    })
}

const extractAudio = (originalPath, targetPath) => {
    return new Promise((resolve, reject) => {
        
        const ffmpeg = spawn("ffmpeg", [
            "-i",
            originalPath,
            "-vn",
            "-c:a",
            "copy",
            targetPath,
        ]);
        
        ffmpeg.on("close", (code) => {
            if(code === 0){
                resolve(); 
            } else {
                reject(`ffmpeg exited with code ${code} while extracting audio`);
            }
        })

        ffmpeg.on("error", (error) => {
            reject(error);
        })
    })
}

module.exports = {makeThumbnail, getDimensions, extractAudio};

module.exports = {makeThumbnail, getDimensions, extractAudio};