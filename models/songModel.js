const mongoose = require('mongoose')

const songSchema = mongoose.Schema({
    spotifyId:{
        type: String,
        required: true,
    },
    gdriveId:{
        type: String,
        required: true,
    },
})

const songModel = mongoose.model('Song', songSchema)
module.exports = songModel