const axios = require('axios');
const tokens = require('./utils/tokens')

exports.spotifyAuth = async (req,res,next)=>{
    const token = await (tokens.getSpotifyToken())
    req.sp_api_headers = {
        'Authorization': `Bearer ${token}`
    }
    console.log(token)
    next();
}

exports.searchAlbumSpotify = async (req,res)=>{
    const albumName = req.params.name.replace(" ", "%20");

    let api_req_url = `${process.env.SPOTIFY_API_URL}/search?q=album:${albumName}&type=album&limit=5`

    const sp_search = await axios.get(api_req_url,{
        headers: req.sp_api_headers
    })

    res.status(200).json({
        statusCode: 200,
        data: sp_search.data
    })
}

exports.getFirstAlbumSpotify = async (req,res)=>{
    const albumName = req.params.name.replace(" ", "%20");

    let api_req_url = `${process.env.SPOTIFY_API_URL}/search?q=album:${albumName}&type=album&limit=5`

    const sp_search = await axios.get(api_req_url,{
        headers: req.sp_api_headers
    })

    try{
        album_id = sp_search.data['albums']['items'][0]['id']
    }catch(e){
        return res.status(400).json({
            statusCode: 400,
            data: "Not found"
        })
    }

    api_req_url=`${process.env.SPOTIFY_API_URL}/albums/${album_id}`

    const sp_album = await axios.get(api_req_url,{
        headers: req.sp_api_headers
    })

    res.status(200).json({
        statusCode: 200,
        data: sp_album.data
    })
}

exports.getAlbumSpotify = async (req,res)=>{
    let album_id=req.params.id;

    api_req_url=`${process.env.SPOTIFY_API_URL}/albums/${album_id}`

    const sp_album = await axios.get(api_req_url,{
        headers: req.sp_api_headers
    })

    res.status(200).json({
        statusCode: 200,
        data: sp_album.data
    })
}