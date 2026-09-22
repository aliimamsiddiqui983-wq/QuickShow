// Function to check availability of slected seats of a movie

import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import axios from "axios";
import { inngest } from "../inngest/index.js";

// Rebuilds a show's occupiedSeats directly from whatever Booking documents
// actually exist in the DB right now, and saves it back on the Show.
//
// Why this is needed: occupiedSeats used to be updated only inside
// createBooking() / the Inngest auto-cancel job. If a booking is ever
// removed any other way (e.g. deleted manually from MongoDB Atlas/Compass),
// nothing tells the Show to free those seats, so they stay stuck as
// "occupied" forever even though the booking is gone.
//
// Calling this before we read/check occupiedSeats makes the Show
// self-heal: it always reflects the bookings that currently exist in
// the DB, no matter how a booking was deleted.
const syncOccupiedSeats = async (showId) => {
  const showData = await Show.findById(showId);
  if (!showData) return null;

  const bookings = await Booking.find({ show: showId });

  const freshOccupiedSeats = {};
  bookings.forEach((booking) => {
    booking.bookedSeats.forEach((seat) => {
      freshOccupiedSeats[seat] = booking.user;
    });
  });

  showData.occupiedSeats = freshOccupiedSeats;
  showData.markModified("occupiedSeats");
  await showData.save();

  return showData;
};

const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await syncOccupiedSeats(showId);
    if (!showData) return false;

    const occupiedSeats = showData.occupiedSeats;

    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);
    return !isAnySeatTaken;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;

    // Check if the seat is available for the selected show
    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);

    if (!isAvailable) {
      return res.json({
        success: false,
        message: "Selected seats are not available.....",
      });
    }

    // Get shows details
    const showData = await Show.findById(showId).populate("movie");

    // Create Cashfree order ID first
    const orderId = `order_${Date.now()}`;

    // Create a new booking
    const booking = await Booking.create({
      user: userId,
      show: showId,
      number: Date.now(),
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
      orderId: orderId,
    });

    selectedSeats.map((seat) => {
      showData.occupiedSeats[seat] = userId;
    });

    showData.markModified("occupiedSeats");

    await showData.save();

    // Cashfree Gateway

    booking.orderId = orderId;

    const cashfreeResponse = await axios.post(
      "https://sandbox.cashfree.com/pg/orders",
      {
        order_id: orderId,
        order_amount: booking.amount,
        order_currency: "INR",

        customer_details: {
          customer_id: userId,
          customer_phone: "9999999999",
        },

        order_meta: {
          return_url: `${origin}/my-bookings?order_id=${orderId}`,
          notify_url: `${process.env.BACKEND_URL}/api/webhooks/cashfree`,
        },
      },
      {
        headers: {
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json",
        },
      },
    );

    const paymentSessionId = cashfreeResponse.data.payment_session_id;

    booking.paymentLink = paymentSessionId;

    await booking.save();

    // Run Inngest Scheduler Function to check payment status after 10 minutes

    await inngest.send({
      name: "app/checkpayment",
      data: {
        bookingId: booking._id.toString()
      },
    });

    

    res.json({
      success: true,
      payment_session_id: paymentSessionId,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;

    // Re-sync with the DB before responding, so seats freed by a
    // manually-deleted booking show up correctly here too.
    const showData = await syncOccupiedSeats(showId);

    if (!showData) {
      return res.json({ success: false, message: "Show not found" });
    }

    const occupiedSeats = Object.keys(showData.occupiedSeats);

    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};