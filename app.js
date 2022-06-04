const express = require("express");
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path')
const fs = require('fs')
const catchAsync = require('./catchAsync')
const morgan = require('morgan')
const mongoose = require("mongoose")

const controller = require('./controller')
const socketController = require('./socket')
dotenv.config({ path: "./config.env" });

// app.use(express.static(path.join(__dirname,'public')));
app.use(cors())
app.use(express.json({ limit: "10kb" }));
app.use(morgan("dev"));

app.use(catchAsync(controller.spotifyAuth))

app.get('/api/v1/search/album/:name',catchAsync(controller.searchAlbumSpotify))

app.get('/api/v1/album/:id',catchAsync(controller.getAlbumSpotify))

app.get('/api/v1/first/album/:name', catchAsync(controller.getFirstAlbumSpotify))

const http = require('http')
const socketio = require('socket.io')
const tempServer = http.createServer(app);

const io = socketio(tempServer, {
    cors: {
      origin: '*',
      methods: ["GET", "POST"]
    }
  });

io.on("connection", (socket) => {
  // console.log('connected')
  socket.on('download',socketController.download(socket,io));
})

const DB_URL = process.env.DATABASE.replace(
  "<password>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB connection successful"));

const port = process.env.PORT || 3001;
const server = tempServer.listen(port,() => {
    console.log(`SERVER LISTENING ON PORT ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log("-----UNHANDLED REJECTION-----");
  console.log(err);
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (err) => {
  console.log("-----UNHANDLED EXCEPTION-----");
  console.log(err);
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});