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

const controller = {
    getVideos,
    uploadVideo
}

module.exports = controller;