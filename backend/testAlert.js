require('dotenv').config();

const connectDB = require('./config/database');
const Alert = require('./models/Alert');

const test = async () => {
  await connectDB();

  const alert = new Alert({
  deviceId: "TEST-001",
  level: 3,
  levelLabel: "EMERGENCY",  

  sensorData: {
    temperature: 39.5,
    heartRate: 130,
    acceleration: 30,
    fallDetected: true
  },

  triggers: {
    highTemperature: true,
    abnormalHeartRate: true,
    fallDetected: true,
    sustainedCondition: false
  }
});
  await alert.save();

  console.log("✅ Alert saved:", alert);

  process.exit();
};

test();