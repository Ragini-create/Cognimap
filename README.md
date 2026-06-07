# 🗺️ Cognimap — Intelligent Environment-Aware Navigation

**Navigate smarter, not just faster.**

Cognimap is a full-stack intelligent navigation platform that combines route planning, air quality, weather conditions, community-reported road issues, and AI-powered route assistance to recommend safer and smarter travel routes.

---

## ✨ Features

* 🗺️ Interactive Leaflet.js map with dark/light mode
* 🔍 Smart place search with autocomplete using OpenStreetMap Nominatim
* 🛣️ Multi-route generation using OpenRouteService
* 🚗 Multiple travel modes (Drive, Cycle, Walk, Transit)
* 🧠 Cognimap Score based on:

  * Travel Time
  * Distance
  * Air Quality
  * Weather Risk
  * Road Safety Reports
* 🌿 Real-time Air Quality Index (AQI)
* 🌦️ Weather-aware route analysis
* 📍 Community road issue reporting
* 🤖 CogniAssist (Gemini-powered route assistant)
* 🎨 Route safety visualization and recommendations
* 📊 Environmental insights panel
* ⭐ Saved locations and recent searches

---

## 🤖 CogniAssist

CogniAssist is an AI-powered route assistant built using Gemini.

You can ask questions such as:

* Is this route safe?
* How is the weather?
* What is the air quality?
* Are there any reported road issues?
* When should I leave?

**Note:** Toll pricing information is currently not available. Route recommendations are based on travel time, air quality, weather conditions, and reported road issues.

---

## 🏗️ Project Structure

```text
cognimap/
│
├── backend/
│   ├── models/
│   │   └── Report.js
│   │
│   ├── routes/
│   │   ├── route.js
│   │   ├── geocode.js
│   │   ├── aqi.js
│   │   ├── reports.js
│   │   └── chat.js
│   │
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   ├── SearchPanel.js
│   │   │   ├── RouteCard.js
│   │   │   ├── EnvPanel.js
│   │   │   ├── MapView.js
│   │   │   ├── ReportModal.js
│   │   │   └── CogniAssist.js
│   │   │
│   │   ├── hooks/
│   │   │   └── useDebounce.js
│   │   │
│   │   ├── utils/
│   │   │   └── api.js
│   │   │
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   │
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Ragini-create/Cognimap.git
cd Cognimap
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env`

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
ORS_API_KEY=your_openrouteservice_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:3000
```

Run backend:

```bash
npm start
```

Server:

```text
http://localhost:5000
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend:

```text
http://localhost:3000
```

---

## 🔌 APIs Used

| Service                 | Purpose                         |
| ----------------------- | ------------------------------- |
| OpenRouteService        | Route generation                |
| OpenWeather API         | AQI and weather data            |
| OpenStreetMap Nominatim | Geocoding and reverse geocoding |
| Gemini API              | AI route assistant              |
| MongoDB Atlas           | Road issue storage              |

---

## 🧠 Cognimap Score Formula

Routes are scored from **0–100**.

Higher score = Better Route

```text
Score =
Travel Time +
Distance +
AQI +
Weather Risk +
Road Safety
```

### Weight Distribution

| Factor       | Weight |
| ------------ | ------ |
| Travel Time  | 30%    |
| Distance     | 20%    |
| AQI          | 20%    |
| Weather Risk | 15%    |
| Road Safety  | 15%    |

### Route Grades

| Score  | Grade        |
| ------ | ------------ |
| 80–100 | 🟢 Excellent |
| 60–79  | 🟡 Good      |
| 40–59  | 🟠 Fair      |
| 0–39   | 🔴 Poor      |

---

## 📍 Road Reporting

Users can report:

* Potholes
* Flooding
* Construction
* Accidents
* Debris
* Other road hazards

Reports are stored in MongoDB and used while calculating route safety.

---

## 🚀 Future Enhancements

* Toll estimation support
* Live traffic integration
* Voice navigation
* Route sharing improvements
* Mobile application
* Predictive route recommendations

---

## 🛠️ Tech Stack

### Frontend

* React.js
* React Leaflet
* Leaflet.js
* Axios
* CSS3

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose

### External Services

* OpenRouteService
* OpenWeather
* Nominatim
* Gemini AI

---

## 👩‍💻 Author

**Sai Ragini Nagelly**

GitHub: https://github.com/Ragini-create

---

## 📄 License

MIT License

Free to use, modify and distribute.
