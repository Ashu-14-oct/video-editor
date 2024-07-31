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

const controller = {
    getVideos,
    uploadVideo,
    getVideoAsset
}

module.exports = controller;