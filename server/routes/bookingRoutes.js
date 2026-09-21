import express from 'express';
import { createBooking, getOccupiedSeats } from '../controllers/bookingController.js';

const bookingRoutes = express.Router();

bookingRoutes.post('/create', createBooking);


bookingRoutes.get('/seats/:showId', getOccupiedSeats);

export default bookingRoutes;