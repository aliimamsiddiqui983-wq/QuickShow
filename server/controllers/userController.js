// API controller fuction to get user bookings
import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

export const getUserBookings = async (req, res) => {
  try {
    const user = req.auth().userId;
    const bookings = await Booking.find({ user })
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API controller function to upadte movie in clerk user metadata

export const updateFavourite = async (req, res) => {
  try {
    const { movieId } = req.body; // moiveId -> movieId
    const userId = req.auth().userId;
    const user = await clerkClient.users.getUser(userId);

    let favourites = (user.privateMetadata.favourites || []).filter(Boolean);

    if (!favourites.includes(movieId)) {
      favourites.push(movieId);
    } else {
      favourites = favourites.filter((item) => item !== movieId);
    }

    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: { ...user.privateMetadata, favourites },
    });

    res.json({ success: true, message: "Favourite movies updated..." });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Function to get favourite movies

export const getFavourites = async (req, res) => {
  try {
    const user = await clerkClient.users.getUser(req.auth().userId);
    const favourites = user.privateMetadata.favourites || []; // undefined hone pe crash na ho

    const movies = await Movie.find({ _id: { $in: favourites } });

    res.json({ success: true, movies });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};
