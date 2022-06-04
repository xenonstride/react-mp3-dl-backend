const axios = require('axios');

exports.getGdriveAccessToken = async ()=>{
    const res = await axios.post(`https://oauth2.googleapis.com/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${process.env.REFRESH_TOKEN}`)
    return res.data['access_token']
}

exports.getSpotifyToken = async ()=>{
    const sp_auth = await axios.post(process.env.SPOTIFY_OAUTH_URL,new URLSearchParams({
        grant_type: 'client_credentials'
    }),{
        headers: {
            'Authorization': 'Basic '+(new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')),
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    return sp_auth.data['access_token'];
}