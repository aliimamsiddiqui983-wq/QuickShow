
// Function to check availability of slected seats of a movie

import Booking from "../models/Booking.js";
import Show from "../models/Show.js"
import axios from "axios";

const checkSeatsAvailability = async (showId, selectedSeats) => {
    try {
     const showData = await Show.findById(showId);
     if(!showData) return false;

     const occupiedSeats = showData.occupiedSeats;

     const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);
     return !isAnySeatTaken;

    } catch (error) {
        console.log(error.message);
        return false;
    }
}

export const createBooking = async (req, res) => {
    try {
        const {userId} = req.auth();
        const {showId, selectedSeats} = req.body;
        const { origin } = req.headers;

        // Check if the seat is available for the selected show
        const isAvailable = await checkSeatsAvailability(showId, selectedSeats)

        if(!isAvailable){
            return res.json({success: false, message: "Selected seats are not available....."})
        }

        // Get shows details
        const showData = await Show.findById(showId).populate('movie');

        // Create a new booking
        const booking = await Booking.create({
            user: userId,
            show: showId,
            number: Date.now(),
            amount: showData.showPrice * selectedSeats.length,
            bookedSeats: selectedSeats
        })

        selectedSeats.map((seat) => {
            showData.occupiedSeats[seat] = userId;
        })

        showData.markModified('occupiedSeats');

        await showData.save();


        // Cashfree Gateway
const orderId = `order_${Date.now()}`;

booking.orderId = orderId;

const cashfreeResponse = await axios.post(
    "https://sandbox.cashfree.com/pg/orders",
    {
        order_id: orderId,
        order_amount: booking.amount,
        order_currency: "INR",

        customer_details: {
            customer_id: userId,
            customer_phone: "9999999999"
        },

        order_meta: {
            return_url: `${origin}/my-bookings?order_id=${orderId}`
        }
    },
    {
        headers: {
            "x-client-id": process.env.CASHFREE_APP_ID,
            "x-client-secret": process.env.CASHFREE_SECRET_KEY,
            "x-api-version": "2023-08-01",
            "Content-Type": "application/json"
        }
    }
);

const paymentSessionId =
    cashfreeResponse.data.payment_session_id;

booking.paymentLink = paymentSessionId;

await booking.save();

res.json({
    success: true,
    payment_session_id: paymentSessionId
});

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message});
    }
}

export const getOccupiedSeats = async (req, res) =>{
    try {
        const {showId} = req.params;
        const showData = await Show.findById(showId);
        const occupiedSeats = Object.keys(showData.occupiedSeats);

        res.json({success: true, occupiedSeats});

        
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message});
    }
}