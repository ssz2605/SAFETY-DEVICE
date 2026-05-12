require('dotenv').config();
const connectDB = require('./config/database');
const Device = require('./models/Device');

const test = async () => {
  await connectDB();

  const device = new Device({
    deviceId: "TEST-001",
    deviceName: "Safety Band",
    patientName: "Shrey",

    emergencyContacts: [
      { name: "Mom", phone: "9999999999", priority: 1 },
      { name: "Dad", phone: "8888888888", priority: 2 }
    ]
  });

  await device.save();

  console.log("✅ Device saved:", device);

  process.exit();
};

test();