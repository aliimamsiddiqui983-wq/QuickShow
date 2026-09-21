import express from "express";
import crypto from "crypto";
import Booking from "../models/Booking.js";

const router = express.Router();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      console.log("Cashfree webhook received");

      // Raw body - signature verification ke liye
      const rawBody = req.body.toString();

      const signature = req.headers["x-webhook-signature"];
      const timestamp = req.headers["x-webhook-timestamp"];

      console.log("Webhook timestamp:", timestamp);
      console.log("Webhook signature:", signature);

      if (!signature || !timestamp) {
        return res.status(400).json({
          success: false,
          message: "Missing webhook signature or timestamp",
        });
      }

      // Create signature
      const signedPayload = timestamp + rawBody;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
        .update(signedPayload)
        .digest("base64");

      // Verify signature
      if (signature !== expectedSignature) {
        console.log("Invalid Cashfree webhook signature");

        return res.status(401).json({
          success: false,
          message: "Invalid webhook signature",
        });
      }

      console.log("Cashfree webhook signature verified");

      // Parse body only AFTER signature verification
      const body = JSON.parse(rawBody);

      console.log("Webhook body:", body);

      const orderId = body.data?.order?.order_id;

      console.log("Order ID:", orderId);

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID not found",
        });
      }

      // Find booking
      const booking = await Booking.findOne({ orderId });

      if (!booking) {
        console.log("Booking not found:", orderId);

        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      // Prevent unnecessary duplicate update
      if (booking.isPaid) {
        console.log("Booking already marked as paid:", orderId);

        return res.status(200).json({
          success: true,
          message: "Booking already paid",
        });
      }

      // Mark booking as paid
      booking.isPaid = true;

      await booking.save();

      console.log("Booking marked as paid:", orderId);

      return res.status(200).json({
        success: true,
        received: true,
      });

    } catch (error) {
      console.log("Cashfree webhook error:", error.message);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;