
# Kavach

Kavach is a website that shows how safe each area of Bengaluru feels, for the **morning**, **afternoon** and **night**.

It has 5 pages (the same as the DWSI design): **Home, Navigate, Charts, Community, Profile**, plus a Login / Sign up page.
It works on phones (menu at the bottom) and on laptops (menu at the top).

## The rules (the same everywhere)

| Rule | Value |
|---|---|
| Safe (green) | score 65 to 100 |
| Medium (yellow) | score 45 to 64 |
| Risky (red) | score 0 to 44 |
| Morning | 5 AM to 12 PM |
| Afternoon | 12 PM to 6 PM |
| Night | 6 PM to 5 AM |

The time of day is picked from the device's clock. The user can tap another one.
The rules live in two files: `client/src/utils/score.js` (website) and `server/scoring.js` (server).

## How to run it

You need **Node.js 18 or newer** (download from nodejs.org).

```bash
npm run setup    # installs everything (only the first time)
npm run dev      # starts the server and the website together
```

Then open **http://localhost:5173** in your browser.

## Put it online (one website, one link)

```bash
npm run setup
npm run build    # makes the website files
npm start        # the server now also shows the website, on http://localhost:3001
```

On a host like Render, use `npm run setup && npm run build` as the build command and `npm start` as the start command.
Set an environment variable `KAVACH_SECRET` to any long random text (it signs the login tokens).

## What is inside

```
kavach/
├── server/                      Student 4
│   ├── index.js                 all the APIs
│   ├── scoring.js               score rules + how reports change a score
│   ├── auth.js                  passwords, login tokens
│   ├── store.js                 loads the dataset, saves users and reports
│   └── data/                    the 4 dataset files
│       ├── locations.json       63 areas with scores
│       ├── reports.json         194 community reports
│       ├── bus_stops.json       353 bus stops (lighting, night safety)
│       └── police_stations.json 136 police stations
└── client/src/                  the website
    ├── styles/theme.css         colours, fonts, card style  (Student 1)
    ├── components/              menu, score circle, badges, search box, chart  (Student 1)
    ├── context/                 shared info: login, chosen area, time of day  (Student 1)
    ├── pages/Home.jsx           Student 1
    ├── pages/Profile.jsx        Student 1
    ├── pages/Login.jsx          Student 1
    ├── pages/Navigate.jsx       Student 2  (the map)
    ├── pages/Charts.jsx         Student 3
    └── pages/Community.jsx      Student 4
```

## The server's APIs

| Address | What it gives |
|---|---|
| `GET /api/locations` | all 63 areas with Morning, Afternoon, Night scores, breakdown and trend |
| `GET /api/reports?location=Cubbon Park&slot=morning` | community reports, newest first |
| `POST /api/reports` | save a new report (needs login) |
| `GET /api/bus-stops` | bus stops with lighting and night safety |
| `GET /api/police-stations` | police stations |
| `POST /api/auth/signup`, `POST /api/auth/login` | create an account, log in |
| `GET /api/auth/me`, `PATCH /api/auth/me` | read or change your profile (needs login) |

## How a new report changes a score

The dataset scores already include the old reports. A report sent from the website changes the score of that area and time of day for **7 days**:

| Report | Low | Medium | High |
|---|---|---|---|
| Felt safe | +2 | +2 | +2 |
| Poor lighting | -2 | -3 | -4 |
| Felt unsafe | -3 | -4 | -5 |
| Harassment | -4 | -6 | -8 |

The total change for one area and time of day can never be more than 10 points up or down.
You can change these numbers at the top of `server/scoring.js`.

## Things to know about the data

- **Trend chart:** only Cubbon Park and Koramangala have all 6 months. For the other 61 areas only this month is known, so the chart shows one dot and a message.
- **Streetlights** on the map come from the "lighting" column of the bus stop audit, so they show lighting at bus stops (not every street light).
- **Police:** 9 areas have no police station in the data. The route panel then shows no station.
- **Home page "community reports" count** is the real number of reports for that area (the design's "women active now" needs live data we do not have).
- **Safe route:** the map draws a straight line from you to the area, lists the areas it passes near with their scores, gives an average, and opens walking directions in Google Maps. It does not calculate a street-by-street route.
- Users and new reports are saved in `server/data/users.json` and `server/data/user_reports.json` (created automatically). Delete these two files to start fresh.

## Good to know

- The map uses free OpenStreetMap tiles and the weather uses the free open-meteo.com. Both need internet.
- `npm audit` shows 4 warnings in `client`. They only affect the developer preview (`npm run dev`), not the finished website. Fixing them needs Node 20 or newer.

# kavachh
A full-stack web application for safety and navigation.
