const axios = require('axios')
const spawn = require('await-spawn')
var ytdl = require('ytdl-core');
var ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const NodeID3 = require('node-id3')
const Song = require('./models/songModel');
const fallbackChecker = require('./utils/fallback')
const tokens = require('./utils/tokens')

// {
//     songs: [
//         {
//              track_id: 'ouwetugcbkadvc'
//             track_number: '1', 
//             track_name: 'Light Switch', 
//             track_artists: 'Charlie Puth', 
//             album_name:'Light Switch - Single',
//             art_url: 'https://i.scdn.co/image/ab67616d00001e025abf31f093c2b79eb18817f9'
//         }
//     ],
// }

// MAIN DOWNLOAD FUNCTION
exports.download = (socket,io) => async (data)=>{
    let {songs: tempSongs}=data;
    let resObj=[]

    let songs=[]
    for(let s of tempSongs){
        // IF PRESENT IN DB JUST SEND THE LINK (NO NEED TO DOWNLOAD AGAIN)
        const found = await Song.findOne({spotifyId: s['track_id']});
        if(found){
            // console.log(found.gdriveId)
            socket.emit('done',{
                id: s['track_id'],
                link: `https://drive.google.com/uc?export=download&id=${found.gdriveId}`,
                status: 'success'
            })
        }else{
            songs.push(s)
        }
    }

    // FIND ON SONG.LINK API
    for(let s of songs){
        const songlink_res = await axios.get(`https://api.song.link/v1-alpha.1/links?url=spotify%3Atrack%3A${s.track_id}&userCountry=IN`)
        try{
            s['yt_link']=songlink_res.data['linksByPlatform']['youtube']['url']
            console.log(s['yt_link'],'song.link')
            resObj.push({
                id: s.track_id,
                found: true
            })
        }catch(e){
            console.log('not found on song.link')
            try{
                const fallbackLink = await (fallbackChecker.getFallbackLink(s.track_id))
                const info = await ytdl.getInfo(fallbackLink)
                console.log(fallbackLink,'fallback')

                if(fallbackChecker.checkSimilarity(info.videoDetails.title,s['track_name'])){
                    s['yt_link'] = fallbackLink
                    resObj.push({
                        id: s.track_id,
                        found: true
                    })
                }
                // console.log(fallbackId,info.videoDetails.title);
                else{
                    resObj.push({
                        id: s.track_id,
                        found: false
                    })
                }
            }catch(e){
                // console.log(e)
                resObj.push({
                    id: s.track_id,
                    found: false
                })
            }
        }
    }

    // SEND TO FRONTEND IF FOUND OR NOT
    socket.emit('working', resObj)

    // REMOVE SONGS WHICH ARE NOT FOUND FROM THE MAIN SONGS OBJ
    songs = songs.filter(s=>"yt_link" in s)

    // GET GDRIVE ACCESS TOKEN
    const accessToken = await (tokens.getGdriveAccessToken())
    // console.log(accessToken)

    for(let s of songs){
        // console.log(s)
        let bufferStream = new stream.PassThrough();
        ffmpeg()
        .input(ytdl(s['yt_link']))
        .toFormat('mp3')
        .on('error',(err)=>{
            console.log('ytdl error',err)
            socket.emit('done',{
                id: s['track_id'],
                status: 'error'
            })
        })
        .on('end',()=>{
            // console.log('finished')
        })
        .writeToStream(bufferStream)

        // GET ALBUM ART AS BUFFER
        const imgData = await axios.get(s['art_url'],  { responseType: 'arraybuffer' })
        const imgbuffer = Buffer.from(imgData.data, "utf-8")
        
        // PUSH BUFFER CHUNKS TO buffers ARRAY
        const buffers = [];
        bufferStream.on('data', function (buf) {
            buffers.push(buf);  
        });

        // CONCAT ALL BUFFERS TO A SINGLE BUFFER TO GET THE VIDEO BUFFER
        bufferStream.on('end', async function () {
            const outputBuffer = Buffer.concat(buffers);
            // console.log(Buffer.byteLength(outputBuffer))

            if(Buffer.byteLength(outputBuffer)<1000){
                console.log('buffer error');
                socket.emit('done',{
                    id: s['track_id'],
                    status: 'error'
                })
                return;
            }
            //INIT TAGS FOR THE SONG
            const tags = {
                title: s['track_name'],
                artist: s['track_artists'],
                album: s['album_name'],
                APIC: imgbuffer,
                TRCK: String(s['track_number'])
            }

            // APPLY THE ID3 TAGS TO THE VIDEO BUFFER AND GET THE RESULT BUFFER
            const completeBuffer = NodeID3.write(tags, outputBuffer)

            //UPLOAD TO GDRIVE
            let res = await axios.post('https://www.googleapis.com/upload/drive/v3/files?uploadType=media',completeBuffer,{
                headers:{
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': `${Buffer.byteLength(completeBuffer)}`
                }
            })

            const fileId = res.data.id
            update_headers={
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
            //RENAME FILE
            rename_url=`https://www.googleapis.com/drive/v3/files/${fileId}`
            res = await axios.patch(rename_url,{
                'name': `${s['track_name']} [${s['album_name']}].mp3`
            },{headers: update_headers})

            //CHANGE PRIVACY
            privacy_url=`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`
            res = await axios.post(privacy_url,{
                "role": "reader",
                "type": "anyone"
            },{headers: update_headers})

            // SEND THE LINK TO FRONTEND
            socket.emit('done',{
                id: s['track_id'],
                link: `https://drive.google.com/uc?export=download&id=${fileId}`,
                status: 'success'
            })
            //console.log(`https://drive.google.com/uc?export=download&id=${fileId}`)

            //UPDATE DB WITH THE NEW SONG
            await Song.create({
                spotifyId: s['track_id'],
                gdriveId: fileId
            })
        });
    }
}
