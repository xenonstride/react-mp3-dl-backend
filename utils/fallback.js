const SpotifyToYoutube = require('spotify-to-youtube')
const SpotifyWebApi = require('spotify-web-api-node');
const similarity = require('./similar');
const tokens = require('./tokens')

exports.getFallbackLink = async (spotifyTrackId)=>{
    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(await (tokens.getSpotifyToken()));
    const spotifyToYoutube = SpotifyToYoutube(spotifyApi);
    const fallbackId = await spotifyToYoutube(`spotify:track:${spotifyTrackId}`);
    const ytLink = `https://www.youtube.com/watch?v=${fallbackId}`
    return ytLink;
}

exports.checkSimilarity = (title,checkTitle)=>{
    if(title.replace(' ','').toLowerCase().includes(checkTitle.replace(' ','').toLowerCase())){
        return true;
    }
    else if(similarity(title,checkTitle)>=0.4){
        console.log(title,checkTitle,similarity(title,checkTitle));
        return true;
    }
    
    return false;
}