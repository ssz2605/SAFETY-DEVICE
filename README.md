

# 🛡️ Personal Safety Device: IoT-Based Wearable Emergency System

### *A Cyber-Physical Production System (CPPS) Project*

## 📌 Project Overview

This project is an advanced **Cyber-Physical System (CPS)** designed to solve critical gaps in emergency response. It combines a wearable hardware unit (ESP32-based) with a central Web Dashboard (MERN stack) to monitor physiological vitals and physical impact in real-time.

The system intelligently classifies distress into four levels, ensuring that caregivers are notified immediately via SMS and the web interface when intervention is required.

### 🔑 Key Features

* **Real-time Monitoring:** Continuous tracking of body temperature and heart rate.
* **Fall & Impact Detection:** 3-axis accelerometer detects falls (impacts > 2.5g).
* **Multi-Level Alert Logic:** Classifies status from Level 0 (Normal) to Level 3 (Emergency).
* **Instant SOS:** Automated SMS alerts via Twilio API.
* **Live Dashboard:** A central hub to visualize sensor history and current alert status.

---

## 📊 Emergency Logic & Alert Levels

The system follows a strict classification protocol to prioritize response:

| Level | Status | Trigger Criteria | Action |
| --- | --- | --- | --- |
| **0** | **Normal** | All data within stable ranges. | Continuous logging. |
| **1** | **Mild Alert** | Temp $\ge$ 38°C or Pulse >120 / <100 BPM | Web dashboard notification. |
| **2** | **Critical** | Sudden fall/impact > 2.5g ($24.5 m/s^2$) | Immediate visual alert. |
| **3** | **Emergency** | Multiple distress signs or sustained Level 2 | **Urgent SMS SOS Alert.** |

---

## ⚙️ How to Run the Project

### 1. Hardware Configuration

1. Connect **DHT11**, **MAX30102**, and **MPU-6050** sensors to your **ESP32**.
2. Flash the ESP32 firmware with your WiFi credentials and the Backend API URL (`http://<your-computer-ip>:5000/api/data`).

### 2. Setup Backend

From the project root (`SAFETY-DEVICE`):

1. **Navigate & Install:**
```bash
cd backend
npm install

```


2. **Environment Variables:** Create a `.env` file in the `backend/` folder:
```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
TWILIO_SID=your_sid
TWILIO_AUTH_TOKEN=your_token

```


3. **Run Server:**
```bash
npm start
# or if using nodemon
npm run dev

```


*Backend runs on: `http://localhost:5000*`

### 3. Setup Frontend

1. **Navigate & Install:**
```bash
cd ../frontend
npm install

```


2. **Run Dashboard:**
```bash
npm start

```


*Frontend runs on: `http://localhost:3000*`

---

## 🖥️ How to Open the Dashboard

1. Ensure both the **Backend** and **Frontend** terminals are running.
2. Open your browser and navigate to `http://localhost:3000`.
3. **Real-Time View:** The dashboard will display the live incoming data from the ESP32 via the Backend.
4. **Testing Simulation:** To simulate an emergency without an actual fall, you can temporarily lower the threshold values in the hardware code (e.g., change `2.5g` to `1.1g`) and shake the device to see the Level 3 alert trigger on the dashboard.

---

## 🛠️ Troubleshooting & Common Errors

* **Port already in use:** If port 5000 is busy, kill the process or change the `PORT` variable in the `.env` file.
* **Module Not Found:** Ensure you have run `npm install` inside **both** the `frontend` and `backend` directories.
* **CORS Issues:** If the frontend cannot reach the backend, ensure the following is in your `backend/server.js`:
```javascript
const cors = require("cors");
app.use(cors());

```


* **MongoDB Connection:** Ensure your IP address is whitelisted in MongoDB Atlas if you are not using a local database.

---

## 👥 Tech Stack

* **Hardware:** ESP32, DHT11, MAX30102, MPU-6050.
* **Frontend:** React.js, Tailwind CSS (or CSS-in-JS).
* **Backend:** Node.js, Express.js.
* **Database:** MongoDB.
* **Cloud:** Twilio API for SMS.

---

*Developed as part of the Cyber Physical Production System Project - Group 17.*
