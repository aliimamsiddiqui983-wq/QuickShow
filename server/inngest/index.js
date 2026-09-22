import { Inngest } from "inngest";
import User from '../models/User.js'
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest function to create user
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: {
      event: "clerk/user.created",
    },
  },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };

    await User.create(userData);
  }
);

// Inngest function to delete user from database
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: {
      event: "clerk/user.deleted",
    },
  },
  async ({ event }) => {
    const { id } = event.data;

    await User.findByIdAndDelete(id);
  }
);

// Inngest function to update user data in database
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: {
      event: "clerk/user.updated",
    },
  },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };

    await User.findByIdAndUpdate(id, userData);
  }
);

// Inngest Function to cancel booking and release seats of show after 10 minutes
// of booking created if payment is not made

// Inngest Function to cancel booking and release seats
// after 10 minutes if payment is not made

// const releaseSeatsAndDeleteBooking = inngest.createFunction(
//     {
//         id: 'release-seats-delete-booking',
//         triggers: {
//             event: 'app/checkpayment'
//         }
//     },
//     async ({ event, step }) => {

//         const tenMinutesLater = new Date(
//             Date.now() + 10 * 60 * 1000
//         );

//         await step.sleepUntil(
//             'wait-for-10-minutes',
//             tenMinutesLater
//         );

//         await step.run('check-payment-status', async ()=> {
//           const bookingId = event.data.bookingId;
//           const booking = await Booking.findById(bookingId)

//           // If payment is not made , release seats and delete booking
//           if(!booking.isPaid){
//             const show = await Show.findById(booking.show)
//             booking.bookedSeats.forEach((seat) => {
//               delete show.occupiedSeats[seat]
//             });
//             show.markModified('occupiedSeats')
//             await show.save()
//             await Booking.findByIdAndDelete(booking._id)
//           }
//         })

        
//     }
// );

const releaseSeatsAndDeleteBooking = inngest.createFunction(
  {
    id: "release-seats-delete-booking",
    triggers: {
      event: "app/checkpayment",
    },
  },

  async ({ event, step }) => {

    const tenMinutesLater = new Date(
      Date.now() + 2 * 60 * 1000
    );

    console.log("Timer started for booking:", event.data.bookingId);

    await step.sleepUntil(
      "wait-for-10-minutes",
      tenMinutesLater
    );

    await step.run("check-payment-status", async () => {

      const bookingId = event.data.bookingId;

      console.log("Checking booking:", bookingId);

      const booking = await Booking.findById(bookingId);

      if (!booking) {
        console.log("Booking already deleted:", bookingId);
        return;
      }

      console.log("Booking found:", booking._id);
      console.log("Payment status:", booking.isPaid);

      // Payment already completed
      if (booking.isPaid) {
        console.log("Payment already completed. Nothing to delete.");
        return;
      }

      const show = await Show.findById(booking.show);

      if (!show) {
        console.log("Show not found:", booking.show);
        await Booking.findByIdAndDelete(booking._id);
        return;
      }

      // Release seats
      booking.bookedSeats.forEach((seat) => {
        delete show.occupiedSeats[seat];
      });

      show.markModified("occupiedSeats");

      await show.save();

      // Delete booking
      await Booking.findByIdAndDelete(booking._id);

      console.log(
        "Booking deleted and seats released:",
        bookingId
      );
    });
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
];