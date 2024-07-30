const fs = require("fs/promises");
const util = {};

//Delete a file if exists, if not the function will not throw anything
util.deleteFile = async (path) =>{
    try {
        await fs.unlink(path);
    } catch (error) {
        // do nothing
    }
}

//Delete a folder if exists, if not the function will not throw anything
util.deleteFolder = async (path) =>{
    try {
        await fs.rm(path, {recursive: true});
    } catch (error) {
        
    }
}

module.exports = util;