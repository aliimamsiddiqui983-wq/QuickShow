# 🎬 QuickShow - Movie Ticket Booking Platform

QuickShow is a full-stack movie ticket booking web application where users can explore movies, view movie details, select seats, make online payments, and manage their bookings.

The application also includes an Admin Dashboard for managing movies, shows, bookings, and show schedules.

---

## 🚀 Live Demo

Link = https://quick-show-chi-puce.vercel.app/

---

## 📌 Features

### 👤 User Features

- User authentication and authorization
- Browse available movies
- Search and explore movies
- View detailed movie information
- View movie show timings
- Select preferred date and showtime
- Interactive seat selection
- View selected seats and total amount
- Book movie tickets
- Online payment integration using Cashfree
- View booking history
- View booking details
- Add/remove movies from favourites
- Responsive UI
- Dark/Light theme support

### 🛠️ Admin Features

- Admin authentication and authorization
- Admin dashboard
- View dashboard statistics
- Add movie shows
- Select movie, date and showtime
- Manage existing shows
- View all shows
- View all bookings
- Monitor booking information
- Manage movie show schedules


## 🧰 Tech Stack

### Frontend

- React.js
- JavaScript (ES6+)
- Tailwind CSS
- React Router
- Axios
- React Hot Toast
- Lucide React
- Vite

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- REST API

### Authentication

- Clerk

### Payment

- Cashfree Payment Gateway
- Cashfree Webhooks

### Other Technologies

- Git
- GitHub
- Vercel
- TMDB API
- Inngest
- JWT / Authorization headers
- Environment Variables

---

## 🏗️ Project Architecture

```text
QuickShow
│
├── client
│   ├── public
│   └── src
│       ├── assets
│       ├── components
│       ├── context
│       ├── Libraries
│       ├── pages
│       │   ├── Admin
│       │   ├── Home
│       │   ├── MovieDetails
│       │   ├── MyBookings
│       │   └── Favourite
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
│
├── server
│   ├── configs
│   ├── controllers
│   ├── models
│   ├── routes
│   ├── middleware
│   ├── inngest
│   └── server.js
│
├── .gitignore
└── README.md
