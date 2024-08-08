const path = require("path");
const crypto = require("node:crypto");
const fs = require("fs/promises");
const {pipeline} = require("node:stream/promises");
const util = require("../../lib/util");
const DB = require("../DB");
const FF = require("../../lib/FF");

const getVideos = (req, res, handleErr) => {
    const videos = DB.videos.filter(video => video.userId === req.userId);
    res.status(200).json(videos);
};

const uploadVideo = async (req, res, handleErr) => {
    const specifiedFileName = req.headers.filename;
    const extension = path.extname(specifiedFileName).substring(1).toLowerCase();
    const name = path.parse(specifiedFileName).name;
    const videoId = crypto.randomBytes(4).toString("hex");

    const FORMATS_SUPPORTED = ["mp4", "mkv", "mov"];
    if(FORMATS_SUPPORTED.indexOf(extension) === -1){
        return handleErr({status: 400, message: "Invalid file format"});
    }

    try {
        await fs.mkdir(`./storage/${videoId}`);
        const fullPath = `./storage/${videoId}/original.${extension}`;
        const file = await fs.open(fullPath, "w");
        const fileStream = file.createWriteStream();
        const thumbnailPath = `./storage/${videoId}/thumbnail.jpg`;

        await pipeline(req, fileStream);

        await FF.makeThumbnail(fullPath, thumbnailPath);
        const dimensions = await FF.getDimensions(fullPath);

        DB.update();
        DB.videos.unshift({
            id: DB.videos.length,
            videoId,
            name,
            extension,
            userId: req.userId,
            dimensions,
            extractedAudio: false,
            resizes: {},
        });

        DB.save();
        res.status(200).json({status: "success", message: "Video uploaded successfully"});
        
    } catch (error) {
        util.deleteFolder(`./storage/${videoId}`);
        if(error.code !== "ECONNRESET") return handleErr(error);
    }
}

const extractAudio = async (req, res, handleErr) => {
    const videoId = req.params.get("videoId");

    DB.update();
    const video = DB.videos.find((video) => video.videoId === videoId);
    if(video.extractedAudio){
        return handleErr({
            status: 400,
            message: "the audio has already been extracted"
        })
    }
    try {
        const originalPath = `./storage/${videoId}/original.${video.extension}`;
        const targetPath = `./storage/${videoId}/audio.aac`;
        await FF.extractAudio(originalPath, targetPath);

        video.extractedAudio = true;
        DB.save();
        res.status(200).json({status: "success", message: "Audio extracted successfully"});
    } catch (error) {
        console.log(error);
        util.deleteFile(`./storage/${videoId}/audio.aac`);
    }
}

const getVideoAsset = async (req, res, handleErr) => {
    const videoId = req.params.get("videoId");
    const type = req.params.get("type");

    DB.update();
    const video = DB.videos.find((video) => video.videoId === videoId);

    if(!video){
        return handleErr( {
            status: 404,
            message: "Video not found"
        })
    }

    let file;
    let mimeType;
    switch(type){
        case "thumbnail":
            file = await fs.open(`./storage/${videoId}/thumbnail.jpg`, "r");
            mimeType = "image/jpeg";
            break;
        case "audio":
            file = await fs.open(`./storage/${videoId}/audio.aac`, "r");
            mimeType = "audio/aac";
            filename = `${video.name}-audio.aac`;
            break;
        case "resize":
            const dimensions = req.params.get("dimensions");
            file = await fs.open(`./storage/${videoId}/${dimensions}.${video.extension}`, "r");
            mimeType = "video/mp4";
            filename = `${video.name}-${dimensions}.${video.extension}`;
        case "original":
            file = await fs.open(`./storage/${videoId}/original.${video.extension}`, "r");
            mimeType = `video/${video.extension}`;
            filename = `${video.name}.${video.extension}`;
            break;
    }
    try {
        const stat = await file.stat();
        if(type !== "thumbnail"){
            res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        }
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Length", stat.size);
        res.status(200);
        await pipeline(file.createReadStream(), res);
        file.close();
    } catch (error) {
        console.log(error);
    }
}

const resizeVideo = async (req, res, handleErr) => {
    const videoId = req.body.videoId;
    const width = Number(req.body.width);
    const height = Number(req.body.height);

    DB.update();
    const video = DB.videos.find((video) => video.videoId === videoId);

    try {
        video.resizes[`${width}x${height}`] = {processing: true};
        const originalPath = `./storage/${video.videoId}/original.${video.extension}`;
        const targetPath = `./storage/${video.videoId}/${width}x${height}.${video.extension}`;

        await FF.resize(originalPath, targetPath, width, height);
        video.resizes[`${width}x${height}`] = {processing: false};
        DB.save();
        res.status(200).json({status: "success", message: "Video is being resized"});
    } catch (error) {
        util.deleteFile(`./storage/${video.videoId}/${width}x${height}.${video.extension}`);
        return handleErr(error);
    }
}

const controller = {
    getVideos,
    uploadVideo,
    getVideoAsset,
    extractAudio,
    resizeVideo
}

module.exports = controller;