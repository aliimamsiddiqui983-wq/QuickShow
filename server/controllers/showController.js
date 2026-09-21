// import axios from "axios";
// import Movie from "../models/Movie.js";
// import Show from "../models/Show.js";

// API to get now playing movies from TMDB API
// export const getNowPlayingMovies = async (req, res) => {
//   try {
//     const { data } = await axios.get(
//       "https://api.themoviedb.org/3/movie/now_playing",
//       {
//         headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
//       },
//     );

//     const movies = data.results;
//     res.json({ success: true, movies: movies });
//   } catch (error) {
//     console.error(error);
//     res.json({ success: false, message: error.message });
//   }
// };

import axios from "axios";
import https from "https";
import fs from "fs";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";

const httpsAgent = new https.Agent({ family: 4, keepAlive: false });
const CACHE_FILE = "./nowPlayingCache.json";
const TTL = 10 * 60 * 1000; // 10 minute
let memCache = { data: null, time: 0 };

const fetchNowPlaying = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.get(
        "https://api.themoviedb.org/3/movie/now_playing",
        {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
          httpsAgent,
          timeout: 8000, // 8 sec se zyada nahi rukna
        }
      );
      return data.results;
    } catch (err) {
      console.log(`TMDB attempt ${attempt} failed:`, err.code || err.message);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
};

export const getNowPlayingMovies = async (req, res) => {
  const start = Date.now();
  try {
    // 1. memory cache fresh h to TMDB ko call hi mat karo
    if (memCache.data && Date.now() - memCache.time < TTL) {
      return res.json({ success: true, movies: memCache.data });
    }

    // 2. TMDB se lao (retry ke saath)
    const movies = await fetchNowPlaying();
    memCache = { data: movies, time: Date.now() };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(movies)); // disk backup

    console.log("TMDB ok in", Date.now() - start, "ms");
    return res.json({ success: true, movies });
  } catch (error) {
    console.error("TMDB failed after", Date.now() - start, "ms |", error.code || error.message);

    // 3. TMDB fail hua to purana saved data de do
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      return res.json({ success: true, movies: cached, fromCache: true });
    }
    return res.status(502).json({ success: false, message: error.code || error.message });
  }
};

// API to add new show to databse

export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);

    if (!movie) {
      console.log("Movie ID:", movieId);
      console.log("TMDB KEY exists:", !!process.env.TMDB_API_KEY);

      const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          },
        }),

        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          },
        }),
      ]);

      console.log("Movie API response received");
      console.log("Credits API response received");
      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      const movieDetails = {
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      //   Add movie to the database
      movie = await Movie.create(movieDetails);
    }

    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movie: movieId,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats: {},
        });
      });
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    res.json({ success: true, message: "Show Added Successfully..." });
  } catch (error) {
    console.error("ERROR MESSAGE:", error.message);
    console.error("ERROR CODE:", error.code);
    console.error("ERROR RESPONSE:", error.response?.data);
    console.error("ERROR STATUS:", error.response?.status);
    res.json({ success: false, message: error.message });
  }
};

// API to get all shows from the database

export const getShows = async (req, res) => {
  try {
    // const shows = (await Show.find({showDateTime: {$gte: new Date()}}).populate('movie')).toSorted({showDateTime: 1});
    const shows = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate("movie")
      .sort({ showDateTime: 1 });

    // filter unique shows
    const uniqueShows = new Set(shows.map((show) => show.movie));

    res.json({ success: true, shows: Array.from(uniqueShows) });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get a single show from the database

export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    // get all upcoming shows for the movie
    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() },
    });

    const movie = await Movie.findById(movieId);
    const dateTime = {};

    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0];
      if (!dateTime[date]) {
        dateTime[date] = [];
      }
      dateTime[date].push({ time: show.showDateTime, showId: show._id });
    });

    res.json({ success: true, movie, dateTime });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
