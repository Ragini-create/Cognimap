# 🗺️ Cognimap — Intelligent Environment-Aware Navigation

> Navigate smarter. Not just faster.

Cognimap is a full-stack intelligent navigation system that scores and recommends routes based on **air quality, weather risk, road safety reports, and distance** — not just travel time. Built entirely on free, open-source APIs.

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| 🗺️ Map Interface | Leaflet.js map with dark/light themes |
| 🔍 Smart Geocoding | Nominatim-powered place search with autocomplete |
| 🛣️ Route Generation | OpenRouteService multi-route with alternates |
| 🧠 Cognimap Score | Composite score: time + distance + AQI + weather + safety |
| 🌿 AQI Tracking | OpenWeather air pollution API along route |
| 🌦️ Weather Risk | Real-time weather conditions with risk scoring |
| 📍 Road Reporting | Community pothole/hazard markers stored in MongoDB |
| 🎨 Route Coloring | Green=safe, Yellow=moderate, Red=risky |
| 🌙 Dark Mode | Toggle between dark and light map tiles |

---

## 🏗️ Project Structure

```
cognimap/
├── backend/
│   ├── models/
│   │   └── Report.js          # MongoDB road report schema
│   ├── routes/
│   │   ├── route.js           # /api/route — ORS routing + scoring
│   │   ├── geocode.js         # /api/geocode — Nominatim search
│   │   ├── aqi.js             # /api/aqi — OpenWeather AQI+weather
│   │   └── reports.js         # /api/reports — CRUD road issues
│   ├── server.js              # Express app entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js      # App header with branding
│   │   │   ├── SearchPanel.js # Origin/destination search
│   │   │   ├── RouteCard.js   # Route display with score ring
│   │   │   ├── EnvPanel.js    # AQI + weather + score breakdown
│   │   │   ├── MapView.js     # Leaflet map with all overlays
│   │   │   └── ReportModal.js # Road issue submission form
│   │   ├── hooks/
│   │   │   └── useDebounce.js
│   │   ├── utils/
│   │   │   └── api.js         # Centralized axios API calls
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
│
└── README.md
```

---

## ⚡ Quick Start

### 1. Get Free API Keys

| Service | URL | Free Tier |
|---|---|---|
| OpenRouteService | https://openrouteservice.org/dev/#/signup | 2000 req/day |
| OpenWeather | https://openweathermap.org/api | 1000 req/day |
| Nominatim | Built-in (OSM) | Rate-limited, no key needed |

### 2. Clone & Configure Backend

```bash
cd cognimap/backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cognimap
ORS_API_KEY=your_openrouteservice_key_here
OPENWEATHER_API_KEY=your_openweather_key_here
FRONTEND_URL=http://localhost:3000
```

### 3. Install & Run Backend

```bash
cd cognimap/backend
npm install
npm run dev        # or: npm start
```

Backend will start on **http://localhost:5000**  
Check: http://localhost:5000/api/health

### 4. Install & Run Frontend

```bash
cd cognimap/frontend
npm install
npm start
```

Frontend will open on **http://localhost:3000**

### 5. MongoDB (Optional but recommended)

Road reporting requires MongoDB. Install locally or use free MongoDB Atlas:

**Local:**
```bash
# macOS
brew install mongodb-community && brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name cognimap-mongo mongo:7
```

**MongoDB Atlas (free):**
1. Create account at https://cloud.mongodb.com
2. Create free M0 cluster
3. Get connection string → add to `MONGODB_URI` in `.env`

---

## 🧠 Cognimap Score Formula

The score rates each route from 0–100 (higher = better/safer):

```
Raw Score = (w1 × time_norm) + (w2 × dist_norm) + (w3 × aqi_norm) 
          + (w4 × weather_risk) + (w5 × safety_reports)

Cognimap Score = 100 − Raw Score
```

**Weights:**
| Factor | Weight | Normalized To |
|---|---|---|
| Travel Time | 30% | 1hr = 100 |
| Distance | 20% | 50km = 100 |
| AQI | 20% | Scale 1–5 |
| Weather Risk | 15% | Risk 0–10 |
| Road Safety | 15% | Reports near route |

**Score Grades:**
- 80–100: 🟢 Excellent
- 60–79: 🟡 Good  
- 40–59: 🟠 Fair
- 0–39: 🔴 Poor

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/route` | GET | Get routes with Cognimap scores |
| `/api/geocode` | GET | Search places via Nominatim |
| `/api/geocode/reverse` | GET | Coordinates → address |
| `/api/aqi` | GET | AQI + weather for coordinates |
| `/api/reports` | GET | Fetch road issue reports |
| `/api/reports` | POST | Submit new road report |
| `/api/reports/:id/upvote` | PATCH | Upvote a report |
| `/api/health` | GET | Server status check |

### GET /api/route
```
?startLat=28.6139&startLng=77.2090&endLat=19.0760&endLng=72.8777
```

### POST /api/reports
```json
{
  "type": "pothole",
  "severity": "high",
  "description": "Large pothole near junction",
  "lat": 28.6139,
  "lng": 77.2090
}
```

---

## 📊 MongoDB Schema

```javascript
// Report Schema
{
  type:        String  // pothole | flooding | construction | accident | debris | other
  severity:    String  // low | medium | high
  description: String  // max 500 chars
  location: {
    type:        "Point",
    coordinates: [longitude, latitude]  // GeoJSON
  }
  address:     String
  upvotes:     Number
  active:      Boolean
  createdAt:   Date    // auto-expires after 7 days
  updatedAt:   Date
}
```

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Leaflet.js, React-Leaflet |
| **Styling** | Pure CSS with CSS Variables (no Tailwind dependency issue) |
| **Backend** | Node.js 18+, Express 4 |
| **Database** | MongoDB with Mongoose ODM |
| **Routing** | OpenRouteService (ORS) |
| **Geocoding** | Nominatim (OSM) |
| **Environment** | OpenWeather API (AQI + Weather) |
| **Map Tiles** | CartoDB (dark) / OSM (light) |
| **Caching** | node-cache (in-memory, 5–15 min TTL) |

---

## 🚀 Deployment

### Backend (Railway / Render / Fly.io)
```bash
# Set environment variables in your platform dashboard
# Then deploy with:
git push railway main
```

### Frontend (Vercel / Netlify)
```bash
cd frontend
npm run build
# Upload build/ folder to your static host
# Set REACT_APP_API_URL to your deployed backend URL
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*Built with ❤️ using 100% free & open-source APIs*
